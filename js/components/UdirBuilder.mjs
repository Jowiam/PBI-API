import { udirDimensions, udirInitialConfig, buildUdirFilter, udirDataURL, udirPowerQuery, readUdirMetadata } from '../lib/udir.mjs';
import { udirRCode, downloadRScript } from '../lib/rCode.mjs';

const { createElement: h, useState, useEffect, useRef } = React;
const count = value => value.toLocaleString('nb-NO');
const date = value => new Date(value).toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo' });
const button = (text, onClick, disabled = false, primary = false) => h('button', {
    type: 'button', className: 'btn ' + (primary ? 'btn-primary' : 'btn-outline'), onClick, disabled
}, text);

function UdirFilter({ dim, config, onChange }) {
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState('');
    const [limit, setLimit] = useState(80);
    const needle = search.trim().toLocaleLowerCase('nb-NO');
    const visible = dim.values.filter(value => (!value.hidden || config.values.includes(value.id)) &&
        (!level || String(value.level) === level) &&
        [value.label, value.code, value.id, ...value.parents].join(' ').toLocaleLowerCase('nb-NO').includes(needle));
    const selected = new Set(config.values);
    function toggle(id) {
        const values = new Set(config.values);
        if (values.has(id)) values.delete(id); else { if (!dim.multiple) values.clear(); values.add(id); }
        onChange({ mode: 'item', values: [...values] });
    }
    const levelLabel = label => ({ Nasjonalt: 'Hele landet', Fylke: 'Fylker', Kommune: 'Kommuner', EnhetNavn: 'Skoler' })[label] || label;
    return h('fieldset', { className: 'ssb-dimension' },
        h('legend', null, dim.label),
        h('div', { className: 'ssb-dimension-top' },
            h('label', null, 'Utvalg', h('select', { className: 'input', value: config.mode,
                onChange: event => onChange({ ...config, mode: event.target.value }) },
                h('option', { value: 'item' }, 'Velg verdier'),
                !dim.required && h('option', { value: 'omit' }, 'Uten dette filteret'))),
            h('span', { className: 'text-sm text-gray-600' }, config.mode === 'omit' ? 'Filteret sendes ikke til Udir.' : count(selected.size) + ' valgt' + (dim.required ? ' · påkrevd' : ''))),
        config.mode === 'item' && h(React.Fragment, null,
            dim.geo && h('label', { className: 'udir-level' }, 'Vis enheter', h('select', {
                className: 'input', 'aria-label': 'Vis enheter', value: level,
                onChange: event => { setLevel(event.target.value); setLimit(80); }
            }, h('option', { value: '' }, 'Alle nivåer'), dim.levelNames.map((name, index) => h('option', { key: index, value: String(index + 1) }, levelLabel(name))))),
            h('input', { className: 'input', type: 'search', value: search, placeholder: 'Søk etter navn eller kode …', 'aria-label': 'Søk i Udir-filter ' + dim.label,
                onChange: event => { setSearch(event.target.value); setLimit(80); } }),
            h('div', { className: 'ssb-actions ssb-selection-actions' },
                dim.multiple && button('Velg alle treff (' + count(visible.length) + ')', () => onChange({ mode: 'item', values: [...new Set([...config.values, ...visible.map(value => value.id)])] }), !visible.length),
                button('Tøm utvalg', () => onChange({ mode: 'item', values: [] }), !selected.size)),
            h('div', { className: 'ssb-values' }, !visible.length ? h('p', null, 'Ingen treff i filteret.') : visible.slice(0, limit).map(value =>
                h('label', { key: value.id, className: 'ssb-value' },
                    h('input', { type: 'checkbox', checked: selected.has(value.id), 'aria-label': value.label + ' (' + value.id + ')', onChange: () => toggle(value.id) }),
                    h('span', null, value.label,
                        h('small', null, [value.code, ...value.parents].filter(Boolean).join(' · ')),
                        value.restricted && h('small', null, 'Ikke tilgjengelig for alle filterkombinasjoner'))))),
            visible.length > limit && button('Vis flere (' + count(visible.length - limit) + ' gjenstår)', () => setLimit(limit + 80)),
            selected.size > 0 && h('p', { className: 'text-sm text-gray-600 ssb-selection-summary' },
                'Valgt: ' + dim.values.filter(value => selected.has(value.id)).slice(0, 4).map(value => value.label).join(', ') + (selected.size > 4 ? ' …' : '')))
    );
}

export function UdirBuilder() {
    const [catalog, setCatalog] = useState(null);
    const [selected, setSelected] = useState(null);
    const [dimensions, setDimensions] = useState([]);
    const [config, setConfig] = useState({});
    const [search, setSearch] = useState('');
    const [step, setStep] = useState(1);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [numeric, setNumeric] = useState(true);
    const [output, setOutput] = useState('m');
    const [attempt, setAttempt] = useState(0);
    const active = useRef(null);
    const heading = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        setBusy(true); setError('');
        readUdirMetadata('catalog.json', { signal: controller.signal }).then(data => {
            if (data.version !== 1 || !Array.isArray(data.tables)) throw new Error('Ugyldig Udir-tabelloversikt.');
            if (!controller.signal.aborted) setCatalog(data);
        }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
            .finally(() => { if (!controller.signal.aborted) setBusy(false); });
        return () => controller.abort();
    }, [attempt]);
    useEffect(() => () => active.current?.abort(), []);
    useEffect(() => { heading.current?.focus(); setNotice(''); }, [step]);

    async function openTable(table) {
        active.current?.abort();
        const controller = new AbortController(); active.current = controller;
        setBusy(true); setError(''); setNotice('');
        try {
            const metadata = await readUdirMetadata('tables/' + table.id + '.json', { signal: controller.signal });
            const dims = udirDimensions(metadata);
            if (controller.signal.aborted) return;
            setSelected(table); setDimensions(dims); setConfig(udirInitialConfig(dims)); setStep(2);
        } catch (err) { if (!controller.signal.aborted) setError(err.message); }
        finally { if (!controller.signal.aborted) setBusy(false); }
    }

    let filter = '';
    let validation = '';
    if (dimensions.length) {
        try { filter = buildUdirFilter(dimensions, config); }
        catch (err) { validation = err.message; }
    }
    const url = selected && filter ? udirDataURL(selected.id, filter) : '';
    const code = selected && filter ? udirPowerQuery(selected.id, filter, numeric) : '';
    const rCode = selected && filter ? udirRCode(selected.id, filter, numeric) : '';
    const displayCode = output === 'r' ? rCode : output === 'm' ? code : url;
    // Keep GET selections reasonably short; Udir does not expose a POST equivalent.
    const tooLong = url.length > 7500;
    async function copy() {
        try { await navigator.clipboard.writeText(displayCode); setNotice('Kopiert til utklippstavlen.'); }
        catch { setNotice('Marker teksten i kodefeltet og kopier manuelt.'); }
    }
    function download() {
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const address = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = address; anchor.download = 'udir-' + selected.id + '.pq';
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(address), 1000);
    }
    const needle = search.trim().toLocaleLowerCase('nb-NO');
    const tables = (catalog?.tables || []).filter(table => [table.id, table.title, table.description, table.group].join(' ').toLocaleLowerCase('nb-NO').includes(needle));

    return h('div', { className: 'bg-gradient ssb-app udir-app' },
        h('main', { className: 'container' },
            h('header', { className: 'ssb-header' },
                h('p', { className: 'ssb-eyebrow' }, 'UTDANNINGSDIREKTORATET'),
                h('h1', null, 'Udir · Spørringer til Power BI og R'),
                h('p', { className: 'text-gray-600' }, 'Velg tabell fra Elevundersøkelsen og kopier ferdig Power Query-kode eller et R-skript.')),
            h('nav', { className: 'ssb-steps', 'aria-label': 'Trinn i Udir-spørring' },
                ['Velg tabell', 'Velg filtre', 'Hent kode'].map((label, index) => h('button', {
                    key: label, type: 'button', className: step === index + 1 ? 'active' : '', 'aria-current': step === index + 1 ? 'step' : undefined,
                    disabled: busy || (index > 0 && !selected) || (index === 2 && (!filter || tooLong)), onClick: () => setStep(index + 1)
                }, h('span', null, index + 1), label))),
            h('p', { className: 'udir-intro' }, 'Data hentes direkte i Power BI eller R. Filteroversikten er lagret sammen med nettsiden', catalog ? ' og ble hentet ' + date(catalog.fetchedAt) + '.' : '.'),
            busy && h('p', { className: 'ssb-message', role: 'status' }, 'Laster Udir-oversikten …'),
            error && h('div', { className: 'ssb-message ssb-error', role: 'alert' }, error,
                button('Prøv igjen', () => selected && step > 1 ? openTable(selected) : setAttempt(value => value + 1))),
            notice && h('p', { className: 'ssb-message', role: 'status' }, notice),
            step === 1 && h('section', { className: 'card' },
                h('h2', { tabIndex: -1, ref: heading }, 'Finn en Udir-tabell'),
                h('p', { className: 'text-gray-600 mb-4' }, 'Elevundersøkelsen: læringsmiljø, tema, mobbing og deltakelse.'),
                h('label', { htmlFor: 'udir-search' }, 'Søk etter tabell'),
                h('input', { id: 'udir-search', className: 'input', type: 'search', value: search, placeholder: 'For eksempel mobbing, videregående eller 152', onChange: event => setSearch(event.target.value) }),
                ['Grunnskole', 'Videregående'].map(group => h('section', { key: group, className: 'udir-group' },
                    h('h3', null, group), tables.filter(table => table.group === group).map(table => h('button', {
                        type: 'button', key: table.id, className: 'ssb-table-result', disabled: busy, onClick: () => openTable(table)
                    }, h('span', { className: 'ssb-table-id' }, table.id), h('span', null, h('strong', null, table.title),
                        h('span', { className: 'ssb-table-meta' }, table.description),
                        h('span', { className: 'ssb-table-meta' }, 'Publisert ' + date(table.published))), h('span', { 'aria-hidden': true }, '→'))))),
                catalog && !tables.length && h('p', { className: 'mt-4' }, 'Ingen tabeller passer til søket.')),
            step > 1 && selected && h('section', { className: 'card ssb-table-heading' },
                h('p', { className: 'ssb-eyebrow' }, selected.group + ' · TABELL ' + selected.id),
                h('h2', { tabIndex: -1, ref: heading }, selected.title), h('p', { className: 'text-gray-600' }, selected.description)),
            step === 2 && h('section', { className: 'card' },
                h('h2', null, 'Velg data til spørringen'),
                h('p', { className: 'text-gray-600 mb-6' }, 'Startutvalget følger Udirs standardvalg. Når du søker etter et fylke, finner du også skolene under fylket. Velg fylkesraden for fylkestall, og skoler for skoletall.'),
                h('div', { className: 'ssb-dimensions' }, dimensions.map(dim => h(UdirFilter, {
                    key: selected.id + dim.code, dim, config: config[dim.code],
                    onChange: value => setConfig(prev => ({ ...prev, [dim.code]: value }))
                }))),
                h('div', { className: 'ssb-summary' }, h('p', null, 'Uttrekket kan inneholde både aggregater og underliggende rader. Bruk Udirs ferdige aggregater i rapportene.'),
                    h('p', { className: 'text-sm' }, 'Gyldige kombinasjoner av skoleår, enheter og øvrige filtre kontrolleres av Udir når spørringen kjøres i Power BI.'),
                    validation && h('p', { role: 'status', className: 'ssb-validation' }, validation),
                    tooLong && h('p', { role: 'status', className: 'ssb-validation' }, 'Filteret gir en svært lang API-lenke. Velg færre verdier før du lager spørringen.')),
                h('div', { className: 'ssb-actions' }, button('Tilbake til tabeller', () => setStep(1)),
                    button('Tilbakestill til Udirs standardvalg', () => setConfig(udirInitialConfig(dimensions))),
                    button('Lag Power Query-kode →', () => { setOutput('m'); setStep(3); }, !filter || tooLong, true),
                    button('Lag R-kode →', () => { setOutput('r'); setStep(3); }, !filter || tooLong))),
            step === 3 && filter && h('section', { className: 'card' },
                h('h2', null, output === 'r' ? 'Spørringen er klar for R' : 'Spørringen er klar for Power BI'),
                output !== 'r' && h('ol', { className: 'udir-instructions' },
                    h('li', null, 'I Power BI: velg Transformer data → Ny kilde → Tom spørring.'),
                    h('li', null, 'Åpne Avansert redigering og erstatt innholdet med koden nedenfor.'),
                    h('li', null, 'Velg Anonym som autentisering til https://api.statistikkbanken.udir.no.')),
                output === 'r' && h('p', { className: 'text-sm text-gray-600 mt-4' }, 'Lim koden inn i R eller RStudio. Installer httr2 og jsonlite én gang, som vist øverst i skriptet. Alle sidene hentes, radantallet kontrolleres, og resultatet ligger i data (data.frame).'),
                h('label', { className: 'ssb-checkbox' }, h('input', { type: 'checkbox', checked: numeric, onChange: event => setNumeric(event.target.checked) }),
                    'Legg til numeriske verdikolonner (_tall). Originalverdier og prikking beholdes.'),
                h('div', { className: 'ssb-output-tabs', role: 'group', 'aria-label': 'Udir-kodeformat' },
                    [['m', 'Power Query (alle sider)'], ['r', 'R-skript (alle sider)'], ['url', 'API-lenke (side 1)']].map(([key, label]) => h('button', {
                        key, type: 'button', 'aria-pressed': output === key, className: output === key ? 'active' : '', onClick: () => setOutput(key)
                    }, label))),
                h('textarea', { className: 'ssb-code', value: displayCode, readOnly: true, rows: 18, spellCheck: false,
                    'aria-label': 'Generert Udir-spørring', onFocus: event => event.target.select() }),
                h('div', { className: 'ssb-actions' }, button(output === 'r' ? 'Kopier R-kode' : output === 'm' ? 'Kopier Power Query-kode' : 'Kopier API-lenke', copy, false, true),
                    output === 'r' ? button('Last ned R-skript', () => downloadRScript(rCode, 'udir-' + selected.id)) : button('Last ned M-kode', download), button('Endre filtre', () => setStep(2)),
                    h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Åpne JSON hos Udir (side 1) ↗'),
                    h('a', { href: udirDataURL(selected.id, filter, 4), target: '_blank', rel: 'noopener noreferrer' }, 'Åpne CSV hos Udir (side 1) ↗')),
                h('p', { className: 'text-sm text-gray-600 mt-4' }, 'Power Query- og R-koden henter alle sidene og kontrollerer radantallet. Direkte API-lenker åpner bare første side. Forhåndsvis data i Power BI eller R.')),
            h('footer', { className: 'ssb-footer text-sm text-gray-600' }, h('p', null, 'Kilde: Utdanningsdirektoratet. Prikkede verdier (*) skal ikke tolkes som null eller summeres.'),
                h('a', { href: 'https://apikonsoll.statistikkbanken.udir.no/', target: '_blank', rel: 'noopener noreferrer' }, 'Udirs API-konsoll og dokumentasjon ↗')))
    );
}
