import { NVDB_API, NVDB_CLIENT, NVDB_ROADS, nvdbParameters, nvdbURL, nvdbPowerQuery, nvdbRCode, readNvdbCatalog, previewNvdb } from '../lib/nvdb.mjs';
import { downloadRScript } from '../lib/rCode.mjs';
import { normalizeSearch } from '../lib/searchSynonyms.mjs';

const { createElement: h, useState, useEffect, useMemo, useRef } = React;
const button = (label, onClick, disabled = false, primary = false) => h('button', { type: 'button', className: 'btn ' + (primary ? 'btn-primary' : 'btn-outline'), onClick, disabled }, label);

export function NVDBBuilder() {
    const [catalog, setCatalog] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(50);
    const [selected, setSelected] = useState(null);
    const [step, setStep] = useState(1);
    const [options, setOptions] = useState({ county: '', municipality: '', roadCategory: '', roadNumber: '', geometry: false });
    const [output, setOutput] = useState('m');
    const [notice, setNotice] = useState('');
    const [preview, setPreview] = useState(null);
    const [previewError, setPreviewError] = useState('');
    const [previewBusy, setPreviewBusy] = useState(false);
    const previewRequest = useRef(null);
    const heading = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        setError('');
        readNvdbCatalog({ signal: controller.signal }).then(data => { if (!controller.signal.aborted) setCatalog(data); })
            .catch(err => { if (!controller.signal.aborted) setError(err.message); });
        return () => controller.abort();
    }, [attempt]);
    useEffect(() => { heading.current?.focus(); setNotice(''); }, [step]);
    useEffect(() => {
        previewRequest.current?.abort(); setPreview(null); setPreviewError(''); setPreviewBusy(false); setNotice('');
    }, [selected, options]);
    useEffect(() => () => previewRequest.current?.abort(), []);

    const types = useMemo(() => {
        const words = normalizeSearch(search).trim().split(/\s+/).filter(Boolean);
        return (catalog?.types || []).filter(t => words.every(word => normalizeSearch([t.id, t.name, t.description, ...t.categories].join(' ')).includes(word)));
    }, [catalog, search]);
    const municipalities = (catalog?.municipalities || []).filter(m => !options.county || m.county === options.county);
    let validation = '';
    try { nvdbParameters(selected?.id, options); } catch (err) { validation = err.message; }
    const code = step !== 3 || validation ? '' : output === 'r' ? nvdbRCode(selected.id, options) : output === 'm' ? nvdbPowerQuery(selected.id, options)
        : 'GET ' + nvdbURL(selected.id, options) + '\nX-Client: ' + NVDB_CLIENT + '\nAccept: application/json';
    const previewColumns = preview ? [...new Set(preview.flatMap(row => Object.keys(row)))] : [];

    function choose(type) { setSelected(type); setStep(2); }
    function update(key, value) { setOptions(prev => ({ ...prev, [key]: value })); }
    async function loadPreview() {
        previewRequest.current?.abort();
        const controller = new AbortController();
        previewRequest.current = controller;
        setPreviewBusy(true); setPreviewError('');
        try {
            const rows = await previewNvdb(selected.id, options, controller.signal);
            if (!controller.signal.aborted) setPreview(rows);
        } catch (err) { if (!controller.signal.aborted) setPreviewError(err.message); }
        finally { if (!controller.signal.aborted) setPreviewBusy(false); }
    }
    async function copy() {
        try { await navigator.clipboard.writeText(code); setNotice('Kopiert til utklippstavlen.'); }
        catch { setNotice('Marker koden i feltet og kopier manuelt.'); }
    }
    function download() {
        if (output === 'r') return downloadRScript(code, 'vegvesen-nvdb-' + selected.id);
        const address = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
        const anchor = document.createElement('a'); anchor.href = address; anchor.download = 'vegvesen-nvdb-' + selected.id + '.pq';
        document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(address), 1000);
    }

    return h('div', { className: 'bg-gradient ssb-app nvdb-app' }, h('main', { className: 'container' },
        h('header', { className: 'ssb-header' }, h('p', { className: 'ssb-eyebrow' }, 'STATENS VEGVESEN · NASJONAL VEGDATABANK'),
            h('h1', null, 'NVDB · Vegobjekter til Power BI og R'),
            h('p', { className: 'text-gray-600' }, 'Finn blant annet fartsgrenser, bruer, tunneler og skilt. Velg område og hent registrerte vegobjekter med egenskaper.')),
        h('nav', { className: 'ssb-steps', 'aria-label': 'Trinn i NVDB-spørring' }, ['Finn vegobjekttype', 'Velg utvalg', 'Hent kode'].map((label, index) => h('button', {
            key: label, type: 'button', className: step === index + 1 ? 'active' : '', 'aria-current': step === index + 1 ? 'step' : undefined,
            disabled: index > 0 && (!selected || index === 2 && Boolean(validation)), onClick: () => setStep(index + 1)
        }, h('span', null, index + 1), label))),
        catalog && h('p', { className: 'udir-intro' }, catalog.types.length + ' åpne vegobjekttyper. Oversikten ble hentet ' + new Date(catalog.fetchedAt).toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo' }) + '. Datauttrekk hentes direkte fra NVDB API Les V4.'),
        error && h('div', { className: 'ssb-message ssb-error', role: 'alert' }, error, button('Prøv igjen', () => setAttempt(prev => prev + 1))),
        !catalog && !error && h('p', { role: 'status' }, 'Laster NVDB-oversikt …'),
        notice && h('p', { className: 'ssb-message', role: 'status' }, notice),
        catalog && step === 1 && h('section', { className: 'card' },
            h('h2', { ref: heading, tabIndex: -1 }, 'Finn vegobjekttype'),
            h('label', { htmlFor: 'nvdb-search' }, 'Søk etter vegobjekttype'),
            h('input', { id: 'nvdb-search', className: 'input', type: 'search', value: search, placeholder: 'For eksempel fartsgrense, bru, tunnel eller 105', onChange: event => { setSearch(event.target.value); setLimit(50); } }),
            h('div', { className: 'ssb-actions' }, [105, 60, 581, 96].map(id => catalog.types.find(t => t.id === id)).filter(Boolean).map(t => h('button', { key: t.id, type: 'button', className: 'btn btn-outline', onClick: () => choose(t) }, t.name))),
            h('p', { className: 'text-sm text-gray-600', role: 'status' }, types.length + ' treff'),
            h('div', { className: 'nvdb-types' }, types.slice(0, limit).map(type => h('button', { key: type.id, type: 'button', className: 'ssb-table-result', onClick: () => choose(type) },
                h('span', null, h('strong', null, type.name), h('span', { className: 'ssb-table-meta' }, type.description)), h('span', { className: 'ssb-table-id' }, String(type.id))))),
            !types.length && h('p', null, 'Ingen treff. Prøv et annet navn eller nummer.'),
            types.length > limit && button('Vis flere vegobjekttyper', () => setLimit(prev => prev + 50))),
        selected && step > 1 && h('section', { className: 'card ssb-table-heading' },
            h('p', { className: 'ssb-eyebrow' }, 'VEGOBJEKTTYPE ' + selected.id), h('h2', null, selected.name), h('p', { className: 'text-gray-600' }, selected.description)),
        selected && step === 2 && h('section', { className: 'card' },
            h('h2', { ref: heading, tabIndex: -1 }, 'Velg NVDB-utvalg'),
            h('div', { className: 'traffic-filters' },
                h('label', null, 'Fylke', h('select', { className: 'input', 'aria-label': 'NVDB fylke', value: options.county, onChange: event => setOptions(prev => ({ ...prev, county: event.target.value, municipality: '' })) },
                    h('option', { value: '' }, 'Alle fylker'), catalog.counties.map(c => h('option', { key: c.number, value: c.number }, c.name)))),
                h('label', null, 'Kommune', h('select', { className: 'input', 'aria-label': 'NVDB kommune', value: options.municipality, onChange: event => update('municipality', event.target.value) },
                    h('option', { value: '' }, 'Alle kommuner'), municipalities.map(m => h('option', { key: m.number, value: m.number }, m.name + ' (' + m.number + ')')))),
                h('label', null, 'Vegkategori', h('select', { className: 'input', 'aria-label': 'NVDB vegkategori', value: options.roadCategory, onChange: event => setOptions(prev => ({ ...prev, roadCategory: event.target.value, roadNumber: '' })) },
                    h('option', { value: '' }, 'Alle vegkategorier'), Object.entries(NVDB_ROADS).map(([key, name]) => h('option', { key, value: key }, name)))),
                h('label', null, 'Vegnummer (valgfritt)', h('input', { className: 'input', 'aria-label': 'NVDB vegnummer', type: 'text', inputMode: 'numeric', placeholder: options.roadCategory ? 'For eksempel 6 eller 862' : 'Velg vegkategori først', value: options.roadNumber, disabled: !options.roadCategory, onChange: event => update('roadNumber', event.target.value) }))),
            h('label', { className: 'ssb-checkbox' }, h('input', { type: 'checkbox', checked: options.geometry, onChange: event => update('geometry', event.target.checked) }), 'Ta med geometri (WKT og koordinatsystem)'),
            h('p', { className: 'text-sm text-gray-600 mt-4' }, 'Uttrekket viser gjeldende registrerte vegobjekter. Uten geografiske filtre hentes hele landet. Store utvalg kan ta tid.'),
            validation && h('p', { className: 'ssb-validation', role: 'alert' }, validation),
            h('div', { className: 'ssb-actions' }, button('Bytt vegobjekttype', () => setStep(1)),
                button('Lag Power Query-kode →', () => { setOutput('m'); setStep(3); }, Boolean(validation), true),
                button('Lag R-kode →', () => { setOutput('r'); setStep(3); }, Boolean(validation)))),
        selected && step === 3 && code && h('section', { className: 'card' },
            h('h2', { ref: heading, tabIndex: -1 }, output === 'r' ? 'NVDB-koden er klar for R' : output === 'm' ? 'NVDB-koden er klar for Power BI' : 'API-kall for første side'),
            h('div', { className: 'ssb-output-tabs', role: 'group', 'aria-label': 'NVDB-kodeformat' }, [['m', 'Power Query'], ['r', 'R-skript'], ['url', 'API-kall (side 1)']].map(([key, label]) => h('button', { key, type: 'button', className: output === key ? 'active' : '', 'aria-pressed': output === key, onClick: () => setOutput(key) }, label))),
            output === 'm' && h('p', { className: 'text-sm text-gray-600' }, 'Opprett en tom spørring i Power BI og lim koden inn i Avansert redigering. Velg Anonym som autentisering.'),
            output === 'r' && h('p', { className: 'text-sm text-gray-600' }, 'Kjør koden i R eller RStudio med httr2 og jsonlite installert. Resultatet ligger i data (data.frame).'),
            h('textarea', { className: 'ssb-code', 'aria-label': 'Generert NVDB-spørring', value: code, readOnly: true, rows: 18, spellCheck: false, onFocus: event => event.target.select() }),
            h('div', { className: 'ssb-actions' }, button(output === 'r' ? 'Kopier R-kode' : output === 'm' ? 'Kopier Power Query-kode' : 'Kopier API-kall', copy, false, true),
                output !== 'url' && button(output === 'r' ? 'Last ned R-skript' : 'Last ned M-kode', download), button('Endre NVDB-utvalg', () => setStep(2))),
            h('p', { className: 'text-sm text-gray-600 mt-4' }, 'Power Query og R henter alle sider. Én rad per vegobjekt. Egenskapskolonner starter med E, egenskaps-ID og navn. Sammensatte egenskaper beholdes som JSON-tekst. Fylkes- og kommunenummer beholdes som tekst.')),
        selected && step > 1 && h('section', { className: 'card' },
            h('h2', null, 'Forhåndsvisning'), button(previewBusy ? 'Henter forhåndsvisning …' : 'Hent forhåndsvisning', loadPreview, Boolean(validation) || previewBusy),
            h('p', { className: 'text-sm text-gray-600 mt-4' }, 'Viser opptil 20 vegobjekter fra første API-side. Den genererte koden henter hele utvalget.'),
            previewError && h('p', { className: 'ssb-error', role: 'alert' }, previewError),
            preview && !preview.length && h('p', { role: 'status' }, 'Ingen vegobjekter i dette utvalget.'),
            preview?.length > 0 && h('div', { className: 'nvdb-preview', tabIndex: 0, role: 'region', 'aria-label': 'NVDB-forhåndsvisning' }, h('table', null,
                h('thead', null, h('tr', null, previewColumns.map(name => h('th', { key: name, scope: 'col' }, name)))),
                h('tbody', null, preview.map((row, i) => h('tr', { key: i }, previewColumns.map(name => h('td', { key: name }, row[name] === null || row[name] === undefined ? '' : String(row[name]))))))))),
        h('footer', { className: 'ssb-footer text-sm text-gray-600' }, h('p', null, 'Inneholder data under Norsk lisens for offentlige data (NLOD), tilgjengeliggjort av Statens vegvesen.'),
            h('a', { href: NVDB_API, target: '_blank', rel: 'noopener noreferrer' }, 'Om NVDB API Les V4 ↗'))
    ));
}
