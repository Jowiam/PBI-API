import {
    SSB_BASE, SSB_MAX_CELLS, fetchSSB, readDimensions, initialSelections,
    buildSSBSelection, estimateCells, ssbDataURL, ssbGetURL, ssbPowerQuery,
    datasetView, datasetCSV
} from '../lib/ssb.mjs';
import { SSBTableExplorer } from './SSBTableExplorer.mjs';
import { ssbRCode, downloadRScript } from '../lib/rCode.mjs';

const { createElement: h, useState, useEffect, useRef } = React;
const number = value => value.toLocaleString('nb-NO');
const button = (label, onClick, disabled = false, primary = false) => h('button', {
    type: 'button', className: 'btn ' + (primary ? 'btn-primary' : 'btn-outline'), onClick, disabled
}, label);

function DimensionPicker({ dim, config, onChange, disabled }) {
    const [search, setSearch] = useState('');
    const [visible, setVisible] = useState(100);
    const needle = search.trim().toLocaleLowerCase('nb-NO');
    const filtered = dim.codes.filter(code => (code + ' ' + (dim.labels[code] || '')).toLocaleLowerCase('nb-NO').includes(needle));
    const selected = new Set(config.values);
    function toggle(code) {
        const values = new Set(config.values);
        if (values.has(code)) values.delete(code); else values.add(code);
        onChange({ ...config, mode: 'item', values: [...values] });
    }
    return h('fieldset', { className: 'ssb-dimension', disabled },
        h('legend', null, dim.label),
        h('div', { className: 'ssb-dimension-top' },
            h('label', null, 'Utvalg', h('select', {
                className: 'input', value: config.mode,
                onChange: event => onChange({ ...config, mode: event.target.value, count: config.count || Math.min(3, dim.codes.length) })
            },
            h('option', { value: 'item' }, 'Velg verdier'),
            h('option', { value: 'all' }, 'Alle verdier (' + number(dim.codes.length) + ')'),
            dim.time && h('option', { value: 'latest' }, 'Siste perioder (oppdateres automatisk)'))),
            h('span', { className: 'text-sm text-gray-600' }, config.mode === 'all' ? 'Alle verdier valgt'
                : config.mode === 'latest' ? 'Følger nye publiseringer fra SSB' : number(selected.size) + ' av ' + number(dim.codes.length) + ' valgt')
        ),
        config.mode === 'latest' && h('label', { className: 'ssb-periods' },
            'Antall siste perioder', h('input', {
                type: 'number', min: 1, max: dim.codes.length, className: 'input', value: config.count,
                onChange: event => onChange({ ...config, count: event.target.value })
            }), h('span', { className: 'text-sm text-gray-600' }, 'Periodene kan være år, kvartaler, måneder eller uker, avhengig av tabellen.')),
        config.mode === 'item' && h(React.Fragment, null,
            h('input', {
                className: 'input', type: 'search', placeholder: 'Søk etter navn eller kode …',
                'aria-label': 'Søk i ' + dim.label, value: search,
                onChange: event => { setSearch(event.target.value); setVisible(100); }
            }),
            h('div', { className: 'ssb-actions ssb-selection-actions' },
                button('Velg alle treff (' + number(filtered.length) + ')', () => onChange({ ...config, values: [...new Set([...config.values, ...filtered])] }), !filtered.length),
                button('Tøm utvalg', () => onChange({ ...config, values: [] }), !selected.size)),
            h('div', { className: 'ssb-values' }, filtered.length === 0 ? h('p', null, 'Ingen verdier passer til søket.')
                : filtered.slice(0, visible).map(code => h('label', { key: code, className: 'ssb-value' },
                    h('input', { type: 'checkbox', 'aria-label': (dim.labels[code] || code) + ' (' + code + ')', checked: selected.has(code), onChange: () => toggle(code) }),
                    h('span', null, dim.labels[code] || code,
                        h('small', null, code + (dim.units[code]?.base ? ' · ' + dim.units[code].base : '')))))),
            filtered.length > visible && button('Vis flere verdier (' + number(filtered.length - visible) + ' gjenstår)', () => setVisible(visible + 100)),
            selected.size > 0 && h('p', { className: 'text-sm text-gray-600 ssb-selection-summary' },
                'Valgt: ' + config.values.slice(0, 5).map(code => dim.labels[code] || code).join(', ') + (selected.size > 5 ? ' …' : ''))
        )
    );
}

function DataPreview({ view, metadata, withCodes }) {
    const rows = Array.from({ length: Math.min(100, view.length) }, (_, row) =>
        h('tr', { key: row }, view.row(row, withCodes).map((value, col) =>
            h('td', { key: col }, value == null ? '–' : String(value)))));
    return h('div', { className: 'ssb-preview' },
        h('h3', null, 'Forhåndsvisning · ' + number(view.length) + ' rader hentet'),
        h('p', { className: 'text-sm text-gray-600' }, 'Viser ' + number(Math.min(100, view.length)) + ' rader. Manglende verdier vises som «–». Statuskoder fra SSB følger med.'),
        h('div', { className: 'ssb-table-scroll', tabIndex: 0, role: 'region', 'aria-label': 'Forhåndsvisning av SSB-data' },
            h('table', null,
                h('caption', { className: 'ssb-sr-only' }, metadata.label),
                h('thead', null, h('tr', null, view.headers.map((label, i) => h('th', { key: i, scope: 'col' }, label)))),
                h('tbody', null, rows))));
}

export function SSBBuilder() {
    const [step, setStep] = useState(1);
    const [metadata, setMetadata] = useState(null);
    const [tableId, setTableId] = useState('');
    const [dimensions, setDimensions] = useState([]);
    const [config, setConfig] = useState({});
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [output, setOutput] = useState('powerquery');
    const [withCodes, setWithCodes] = useState(false);
    const controller = useRef(null);
    const headingRef = useRef(null);
    useEffect(() => () => controller.current?.abort(), []);
    useEffect(() => { headingRef.current?.focus(); }, [step]);

    async function request(label, action) {
        controller.current?.abort();
        const current = new AbortController();
        controller.current = current;
        const timer = setTimeout(() => current.abort('timeout'), 60000);
        setBusy(label); setError(''); setNotice('');
        try { await action(current.signal); }
        catch (err) {
            if (controller.current === current) {
                if (current.signal.reason === 'timeout') setError('SSB brukte for lang tid. Prøv igjen med et mindre utvalg.');
                else if (!current.signal.aborted) setError(err.message);
            }
        } finally {
            clearTimeout(timer);
            if (controller.current === current) setBusy('');
        }
    }

    function navigate(next) {
        controller.current?.abort(); controller.current = null;
        setBusy(''); setError(''); setNotice(''); setStep(next);
    }

    function openTable(id) {
        request('Henter tabell og variabler …', async signal => {
            const data = await fetchSSB(SSB_BASE + '/tables/' + id + '/metadata?lang=no', { signal });
            if (signal.aborted) return;
            const dims = readDimensions(data);
            setMetadata(data); setTableId(id); setDimensions(dims);
            setConfig(initialSelections(dims)); setPreview(null); setStep(2);
        });
    }

    let query = null;
    let validation = '';
    if (dimensions.length) {
        try { query = buildSSBSelection(dimensions, config); }
        catch (err) { validation = err.message; }
    }
    const cells = dimensions.length ? estimateCells(dimensions, config) : 0;
    const tooLarge = cells > SSB_MAX_CELLS;
    const valid = Boolean(query) && !tooLarge;

    function fetchPreview() {
        if (!valid) return;
        request('Henter utvalget fra SSB …', async signal => {
            const data = await fetchSSB(ssbDataURL(tableId), {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query), signal
            });
            if (signal.aborted) return;
            datasetView(data); // Check response before showing download controls.
            setPreview(data);
        });
    }

    async function copy(text) {
        try { await navigator.clipboard.writeText(text); setNotice('Kopiert til utklippstavlen.'); }
        catch { setNotice('Kunne ikke kopiere automatisk. Marker teksten i kodefeltet og kopier manuelt.'); }
    }

    function download() {
        const blob = new Blob([datasetCSV(preview, withCodes)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'ssb-' + tableId + '.csv';
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice('CSV-nedlasting startet.');
    }

    const getURL = query ? ssbGetURL(tableId, query) : '';
    const codeText = !query ? '' : output === 'powerquery' ? ssbPowerQuery(tableId, query, dimensions, withCodes)
        : output === 'r' ? ssbRCode(tableId, query, dimensions, withCodes) : output === 'url' ? getURL : JSON.stringify(query, null, 2);
    const view = preview ? datasetView(preview) : null;

    return h('div', { className: 'bg-gradient ssb-app' },
        h('a', { className: 'skip-link', href: '#ssb-content' }, 'Gå til SSB-innhold'),
        h('main', { className: 'container', id: 'ssb-content' },
            h('header', { className: 'ssb-header' },
                h('p', { className: 'ssb-eyebrow' }, 'STATISTISK SENTRALBYRÅ'),
                h('h1', null, 'Statistikkbanken · SSB'),
                h('p', { className: 'text-gray-600' }, 'Finn tabeller, velg data og bygg spørringer til Power BI, Excel eller R.')),
            h('nav', { className: 'ssb-steps', 'aria-label': 'Trinn i SSB-spørring' },
                ['Finn tabell', 'Velg data', 'Hent og eksporter'].map((label, index) => h('button', {
                    key: label, className: step === index + 1 ? 'active' : '',
                    'aria-current': step === index + 1 ? 'step' : undefined,
                    disabled: Boolean(busy) || (index > 0 && !metadata) || (index === 2 && !valid),
                    onClick: () => navigate(index + 1)
                }, h('span', null, index + 1), label))),
            busy && h('p', { className: 'ssb-message', role: 'status' }, busy),
            error && h('div', { className: 'ssb-message ssb-error', role: 'alert' }, error,
                button('Lukk melding', () => setError(''))),
            notice && h('p', { className: 'ssb-message', role: 'status' }, notice),
            h('div', { hidden: step !== 1 }, h(SSBTableExplorer, { onOpen: openTable, disabled: Boolean(busy), headingRef: step === 1 ? headingRef : undefined })),
            step > 1 && metadata && h('section', { className: 'card ssb-table-heading' },
                h('p', { className: 'ssb-eyebrow' }, 'SSB · TABELL ' + tableId),
                h('h2', { tabIndex: -1, ref: headingRef }, metadata.label),
                h('div', { className: 'ssb-actions' },
                    h('span', { className: 'text-sm text-gray-600' }, 'Oppdatert ' + new Date(metadata.updated).toLocaleDateString('nb-NO')),
                    h('a', { href: 'https://www.ssb.no/statbank/table/' + tableId, target: '_blank', rel: 'noopener noreferrer' }, 'Åpne tabellen hos SSB ↗')),
                metadata.note?.length > 0 && h('details', { className: 'ssb-notes' }, h('summary', null, 'Merknader til tabellen'),
                    metadata.note.map((note, i) => h('p', { key: i }, note)))
            ),
            step === 2 && h('section', { className: 'card' },
                h('h2', null, 'Velg variabler og verdier'),
                h('p', { className: 'text-gray-600 mb-6' }, 'Vi har valgt første verdi i hver variabel og de siste tre periodene der det finnes. Tilpass utvalget nedenfor. Du kan søke etter både navn og koder.'),
                h('div', { className: 'ssb-dimensions' }, dimensions.map(dim => h(DimensionPicker, {
                    key: tableId + dim.code, dim, config: config[dim.code], disabled: Boolean(busy),
                    onChange: value => { setConfig(prev => ({ ...prev, [dim.code]: value })); setPreview(null); setError(''); }
                }))),
                h('div', { className: 'ssb-summary' },
                    h('strong', null, number(cells) + ' dataceller i utvalget'),
                    h('p', { className: 'text-sm' }, 'Maksimalt ' + number(SSB_MAX_CELLS) + ' dataceller per uttrekk.'),
                    validation && h('p', { className: 'ssb-validation', role: 'status' }, validation),
                    tooLarge && h('p', { className: 'ssb-validation', role: 'status' }, 'Utvalget er for stort. Velg færre regioner, perioder eller andre verdier.')),
                h('div', { className: 'ssb-actions' },
                    button('Tilbake til tabellsøk', () => navigate(1)),
                    button('Bygg spørring →', () => navigate(3), !valid, true),
                    button('Lag R-kode →', () => { setOutput('r'); navigate(3); }, !valid))
            ),
            step === 3 && query && h('section', { className: 'card' },
                h('div', { className: 'ssb-actions ssb-result-toolbar' },
                    h('h2', null, 'Spørringen er klar'),
                    h('span', { className: 'ssb-count' }, number(cells) + ' dataceller'),
                    button('Endre utvalg', () => navigate(2), Boolean(busy))),
                h('label', { className: 'ssb-checkbox' },
                    h('input', { type: 'checkbox', checked: withCodes, onChange: event => setWithCodes(event.target.checked) }),
                    'Ta med både koder og navn i CSV, Power Query og R'),
                h('div', { className: 'ssb-output-tabs', role: 'group', 'aria-label': 'Kodeformat' },
                    [['powerquery', 'Power Query (Power BI / Excel)'], ['r', 'R-skript'], ['json', 'JSON-spørring'], ['url', 'API-lenke']].map(([key, label]) => h('button', {
                        key, type: 'button', className: output === key ? 'active' : '', 'aria-pressed': output === key, onClick: () => setOutput(key)
                    }, label))),
                output === 'powerquery' && h('p', { className: 'text-sm text-gray-600' }, 'Opprett en tom spørring i Power Query og lim inn koden i Avansert redigering. Velg Anonym som tilkobling. Koden henter en flat CSV-tabell; angi ønskede datatyper i Power Query.'),
                output === 'r' && h('p', { className: 'text-sm text-gray-600' }, 'Lim koden inn i R eller RStudio. Installer httr2 og jsonlite én gang, som vist øverst i skriptet. Resultatet blir en data.frame kalt data, med originale verdier og en ekstra numerisk verdikolonne.'),
                output === 'json' && h('p', { className: 'ssb-endpoint text-sm' }, 'POST ' + ssbDataURL(tableId)),
                output === 'url' && getURL.length > 2000 && h('p', { className: 'ssb-validation' }, 'Lenken er lang. Bruk JSON med POST eller Power Query for dette utvalget.'),
                h('textarea', { className: 'ssb-code', readOnly: true, value: codeText, rows: 14, spellCheck: false, 'aria-label': 'Generert ' + output + '-kode', onFocus: event => event.target.select() }),
                h('div', { className: 'ssb-actions' },
                    button(output === 'r' ? 'Kopier R-kode' : 'Kopier ' + (output === 'url' ? 'lenke' : 'kode'), () => copy(codeText)),
                    output === 'r' && button('Last ned R-skript', () => downloadRScript(codeText, 'ssb-' + tableId)),
                    button(preview ? 'Oppdater forhåndsvisning' : 'Hent forhåndsvisning', fetchPreview, Boolean(busy), true),
                    preview && button('Last ned CSV', download, Boolean(busy))),
                !preview && h('p', { className: 'text-sm text-gray-600 mt-4' }, 'Forhåndsvisning henter hele utvalget. De første 100 radene vises her, og CSV-nedlasting inneholder alle radene.'),
                view && h(DataPreview, { view, metadata, withCodes })
            ),
            h('footer', { className: 'ssb-footer text-sm text-gray-600' },
                h('p', null, 'Kilde: Statistisk sentralbyrå (SSB). Data under CC BY 4.0. Uttrekk kjøres direkte mot SSB.'),
                h('a', { href: 'https://www.ssb.no/api/pxwebapiv2', target: '_blank', rel: 'noopener noreferrer' }, 'SSBs API-veiledning ↗'))
        )
    );
}
