import { TRAFFIC_API, TRAFFIC_MODES, addDays, validateTrafficOptions, trafficRequest, trafficPowerQuery, readTrafficStations } from '../lib/vegvesen.mjs';
import { normalizeSearch } from '../lib/searchSynonyms.mjs';

const { createElement: h, useState, useEffect, useMemo, useRef } = React;
const button = (label, onClick, disabled = false, primary = false) => h('button', { type: 'button', className: 'btn ' + (primary ? 'btn-primary' : 'btn-outline'), onClick, disabled }, label);
const date = value => value ? new Date(value).toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo' }) : 'Ikke oppgitt';
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function VegvesenBuilder() {
    const [catalog, setCatalog] = useState(null);
    const [search, setSearch] = useState('');
    const [county, setCounty] = useState('');
    const [municipality, setMunicipality] = useState('');
    const [trafficType, setTrafficType] = useState('VEHICLE');
    const [operationalOnly, setOperationalOnly] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedLimit, setSelectedLimit] = useState(12);
    const [limit, setLimit] = useState(50);
    const [step, setStep] = useState(1);
    const [options, setOptions] = useState(() => ({ mode: 'day', startDate: addDays(today(), -7), endDate: addDays(today(), -1), startYear: Number(today().slice(0, 4)) - 3, endYear: Number(today().slice(0, 4)) - 1 }));
    const [output, setOutput] = useState('m');
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [attempt, setAttempt] = useState(0);
    const heading = useRef(null);
    useEffect(() => {
        const controller = new AbortController();
        setBusy(true); setError('');
        readTrafficStations({ signal: controller.signal }).then(data => { if (!controller.signal.aborted) setCatalog(data); })
            .catch(err => { if (!controller.signal.aborted) setError(err.message); })
            .finally(() => { if (!controller.signal.aborted) setBusy(false); });
        return () => controller.abort();
    }, [attempt]);
    useEffect(() => { heading.current?.focus(); setNotice(''); setSelectedLimit(12); }, [step]);
    useEffect(() => { setNotice(''); }, [search, county, municipality, trafficType, operationalOnly]);

    const stations = catalog?.stations || [];
    const pointMap = useMemo(() => new Map(stations.map(point => [point.id, point])), [catalog]);
    const selected = useMemo(() => selectedIds.map(id => pointMap.get(id)).filter(Boolean), [selectedIds, pointMap]);
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const counties = useMemo(() => [...new Map(stations.filter(point => point.county).map(point => [point.county.number, point.county])).values()]
        .sort((a, b) => a.name.localeCompare(b.name, 'nb')), [catalog]);
    const municipalities = useMemo(() => [...new Map(stations.filter(point => point.municipality && (!county || String(point.county?.number) === county))
        .map(point => [point.municipality.number, { ...point.municipality, countyName: point.county?.name || '' }])).values()]
        .sort((a, b) => a.name.localeCompare(b.name, 'nb')), [catalog, county]);
    const filtered = useMemo(() => {
        const words = normalizeSearch(search).trim().split(/\s+/).filter(Boolean);
        return stations.filter(point => (!county || String(point.county?.number) === county) &&
            (!municipality || String(point.municipality?.number) === municipality) &&
            (!trafficType || point.trafficType === trafficType) && (!operationalOnly || point.status === 'OPERATIONAL') &&
            words.every(word => normalizeSearch([point.id, point.name, point.road, point.road.replace(/([EFR])V(\d+)/g, '$1$2'), point.county?.name, point.municipality?.name].join(' ')).includes(word)));
    }, [catalog, search, county, municipality, trafficType, operationalOnly]);
    const filteredIds = useMemo(() => new Set(filtered.map(point => point.id)), [filtered]);
    const selectedMatches = filtered.reduce((total, point) => total + Number(selectedSet.has(point.id)), 0);
    let validation = '';
    let code = '';
    let request = null;
    try {
        validateTrafficOptions(selected, options);
        if (step === 3) {
            code = trafficPowerQuery(selected, options);
            request = trafficRequest(selected[0], options);
        }
    } catch (err) { validation = err.message; }
    const intervalMode = options.mode === 'hour' || options.mode === 'day';
    function toggle(point) {
        setNotice('');
        setSelectedIds(prev => prev.includes(point.id) ? prev.filter(id => id !== point.id) : [...prev, point.id]);
    }
    function selectMatches() {
        setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
        setSelectedLimit(12);
        setNotice('Alle ' + filtered.length.toLocaleString('nb-NO') + ' treff er valgt. Tidligere valg utenfor søket er beholdt.');
    }
    function deselectMatches() {
        setSelectedIds(prev => prev.filter(id => !filteredIds.has(id)));
        setNotice('Valgte stasjoner i gjeldende søk er fjernet. Andre valg er beholdt.');
    }
    function update(key, value) { setOptions(prev => ({ ...prev, [key]: value })); }
    async function copy() {
        try { await navigator.clipboard.writeText(output === 'm' ? code : JSON.stringify(request, null, 2)); setNotice('Kopiert til utklippstavlen.'); }
        catch { setNotice('Marker teksten i kodefeltet og kopier manuelt.'); }
    }
    function download() {
        const address = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = address; anchor.download = 'vegvesen-trafikkdata.pq';
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(address), 1000);
    }

    const chosen = h('div', { className: 'traffic-selected', 'aria-label': 'Valgte målestasjoner' },
        h('strong', null, selected.length.toLocaleString('nb-NO') + ' stasjoner valgt'),
        selected.slice(0, selectedLimit).map(point => h('button', { key: point.id, type: 'button', onClick: () => toggle(point), 'aria-label': 'Fjern ' + point.name }, point.name + ' ×')),
        selected.length > selectedLimit && button('Vis flere valgte (' + (selected.length - selectedLimit).toLocaleString('nb-NO') + ' gjenstår)', () => setSelectedLimit(prev => prev + 50)),
        selectedLimit > 12 && button('Vis færre valgte', () => setSelectedLimit(12)));

    return h('div', { className: 'bg-gradient ssb-app traffic-app' },
        h('main', { className: 'container' },
            h('header', { className: 'ssb-header' },
                h('p', { className: 'ssb-eyebrow' }, 'STATENS VEGVESEN'),
                h('h1', null, 'Trafikkdata · Spørringer til Power BI'),
                h('p', { className: 'text-gray-600' }, 'Finn målestasjoner og hent trafikkmengde, dekningsgrad og årsdøgntrafikk.')),
            h('nav', { className: 'ssb-steps', 'aria-label': 'Trinn i Vegvesen-spørring' },
                ['Velg målestasjoner', 'Velg data og periode', 'Kopier til Power BI'].map((label, index) => h('button', {
                    key: label, type: 'button', className: step === index + 1 ? 'active' : '', 'aria-current': step === index + 1 ? 'step' : undefined,
                    disabled: busy || (index > 0 && !selected.length) || (index === 2 && Boolean(validation)), onClick: () => setStep(index + 1)
                }, h('span', null, index + 1), label))),
            catalog && h('p', { className: 'udir-intro' }, 'Data hentes direkte fra Vegvesenet i Power BI. Stasjonsoversikten ble hentet ' + date(catalog.fetchedAt) + '.'),
            busy && h('p', { role: 'status', className: 'ssb-message' }, 'Laster målestasjoner …'),
            error && h('div', { role: 'alert', className: 'ssb-message ssb-error' }, error, button('Prøv igjen', () => setAttempt(prev => prev + 1))),
            notice && h('p', { role: 'status', className: 'ssb-message' }, notice),
            step === 1 && h('section', { className: 'card' },
                h('h2', { tabIndex: -1, ref: heading }, 'Finn målestasjoner'),
                h('p', { className: 'text-gray-600 mb-4' }, 'Søk etter navn, ID, vegnummer som E6, kommune eller fylke. Velg én eller flere stasjoner.'),
                h('label', { htmlFor: 'traffic-search' }, 'Søk etter målestasjon'),
                h('input', { id: 'traffic-search', className: 'input', type: 'search', value: search, placeholder: 'For eksempel Tromsø, E6 eller Breivika', onChange: event => { setSearch(event.target.value); setLimit(50); } }),
                h('div', { className: 'traffic-filters' },
                    h('label', null, 'Fylke', h('select', { className: 'input', 'aria-label': 'Vegvesen fylke', value: county, onChange: event => { setCounty(event.target.value); setMunicipality(''); setLimit(50); } },
                        h('option', { value: '' }, 'Alle fylker'), counties.map(item => h('option', { key: item.number, value: String(item.number) }, item.name)))),
                    h('label', null, 'Kommune', h('select', { className: 'input', 'aria-label': 'Vegvesen kommune', value: municipality, onChange: event => { setMunicipality(event.target.value); setLimit(50); } },
                        h('option', { value: '' }, 'Alle kommuner'), municipalities.map(item => h('option', { key: item.number, value: String(item.number) }, item.name + (!county && item.countyName ? ' · ' + item.countyName : ''))))),
                    h('label', null, 'Trafikktype', h('select', { className: 'input', 'aria-label': 'Trafikktype', value: trafficType, onChange: event => { setTrafficType(event.target.value); setLimit(50); } },
                        h('option', { value: '' }, 'Alle typer'), h('option', { value: 'VEHICLE' }, 'Motorkjøretøy'), h('option', { value: 'BICYCLE' }, 'Sykkel'))),
                    h('label', { className: 'ssb-checkbox' }, h('input', { type: 'checkbox', checked: operationalOnly, onChange: event => { setOperationalOnly(event.target.checked); setLimit(50); } }), 'Bare stasjoner i drift')),
                chosen,
                h('div', { className: 'ssb-actions traffic-selection-actions' },
                    button('Velg alle treff (' + filtered.length.toLocaleString('nb-NO') + ')', selectMatches, busy || !filtered.length || selectedMatches === filtered.length),
                    button('Fjern valgte treff', deselectMatches, !selectedMatches),
                    button('Tøm alle valg', () => { setSelectedIds([]); setNotice('Alle stasjonsvalg er fjernet.'); }, !selected.length)),
                h('p', { className: 'text-sm text-gray-600 mt-2' }, 'Velg alle gjelder hele trefflisten, også treff som ikke er vist ennå. Valg utenfor søket beholdes.'),
                h('p', { className: 'text-sm text-gray-600 mt-4', role: 'status' }, filtered.length.toLocaleString('nb-NO') + ' treff · ' + stations.length.toLocaleString('nb-NO') + ' stasjoner i oversikten'),
                h('div', { className: 'traffic-results' }, filtered.slice(0, limit).map(point => h('button', {
                    key: point.id, type: 'button', className: 'ssb-table-result', 'aria-pressed': selectedSet.has(point.id), onClick: () => toggle(point)
                }, h('span', { className: 'traffic-pick', 'aria-hidden': true }, selectedSet.has(point.id) ? '✓' : '+'),
                h('span', null, h('strong', null, point.name),
                    h('span', { className: 'ssb-table-meta' }, [point.road, point.municipality?.name, point.county?.name].filter(Boolean).join(' · ')),
                    h('span', { className: 'ssb-table-meta' }, point.id + ' · ' + (point.trafficType === 'BICYCLE' ? 'Sykkel' : 'Motorkjøretøy') + ' · ' + (point.frequency === 'CONTINUOUS' ? 'Kontinuerlig måling' : 'Periodiske målinger')),
                    h('span', { className: 'ssb-table-meta' }, 'Første data: ' + date(point.firstData) + ' · Siste timedata: ' + date(point.latestHour))),
                h('span', { className: 'ssb-table-id' }, selectedSet.has(point.id) ? 'Valgt' : 'Velg')))),
                !busy && !filtered.length && h('p', { className: 'mt-4' }, 'Ingen treff. Prøv et annet søk, fylke eller fjern avgrensningen til stasjoner i drift.'),
                h('div', { className: 'ssb-actions mt-4' },
                    filtered.length > limit && button('Vis flere målestasjoner', () => setLimit(prev => prev + 50)),
                    button('Velg data og periode →', () => setStep(2), !selected.length, true))),
            step === 2 && h('section', { className: 'card' },
                h('h2', { tabIndex: -1, ref: heading }, 'Velg data og periode'),
                chosen,
                h('div', { className: 'traffic-period' },
                    h('label', null, 'Datatype', h('select', { className: 'input', 'aria-label': 'Vegvesen datatype', value: options.mode, onChange: event => update('mode', event.target.value) },
                        Object.entries(TRAFFIC_MODES).map(([value, label]) => h('option', { key: value, value }, label)))),
                    intervalMode ? h('div', { className: 'traffic-date-row' },
                        h('label', null, 'Fra og med', h('input', { className: 'input', type: 'date', value: options.startDate, onChange: event => update('startDate', event.target.value) })),
                        h('label', null, 'Til og med', h('input', { className: 'input', type: 'date', value: options.endDate, onChange: event => update('endDate', event.target.value) })))
                        : h('div', { className: 'traffic-date-row' },
                            h('label', null, 'Fra år', h('input', { className: 'input', type: 'number', min: 1900, max: 2100, value: options.startYear, onChange: event => update('startYear', event.target.value) })),
                            h('label', null, 'Til år', h('input', { className: 'input', type: 'number', min: 1900, max: 2100, value: options.endYear, onChange: event => update('endYear', event.target.value) })))),
                h('div', { className: 'ssb-summary' },
                    h('p', null, intervalMode ? 'Datoene gjelder hele norske kalenderdager, inkludert til-datoen. Sommer- og vintertid håndteres automatisk.' : 'Gjennomsnittlig døgntrafikk er passeringer per døgn, ikke summen av trafikken i måneden eller året.'),
                    h('p', { className: 'text-sm' }, 'Dekningsgrad følger med i resultatet. Manglende målinger beholdes som null; de erstattes ikke med 0. Stasjoner kan ha avbrudd eller mangle data i valgt periode.'),
                    selected.length > 20 && h('p', { className: 'text-sm' }, 'Mange valgte stasjoner gir flere API-kall og kan bruke lengre tid i Power BI.'),
                    validation && h('p', { className: 'ssb-validation', role: 'status' }, validation)),
                h('div', { className: 'ssb-actions' }, button('Endre målestasjoner', () => setStep(1)), button('Lag Power Query-kode →', () => setStep(3), Boolean(validation), true))),
            step === 3 && code && h('section', { className: 'card' },
                h('h2', { tabIndex: -1, ref: heading }, 'Spørringen er klar for Power BI'),
                h('p', { className: 'text-gray-600' }, selected.length + ' målestasjoner · ' + TRAFFIC_MODES[options.mode]),
                h('ol', { className: 'udir-instructions' }, h('li', null, 'I Power BI: Transformer data → Ny kilde → Tom spørring.'),
                    h('li', null, 'Lim koden inn i Avansert redigering.'), h('li', null, 'Velg Anonym som autentisering til ' + TRAFFIC_API)),
                h('div', { className: 'ssb-output-tabs', role: 'group', 'aria-label': 'Vegvesen-kodeformat' },
                    [['m', 'Power Query (komplett uttrekk)'], ['json', 'GraphQL / JSON']].map(([key, label]) => h('button', { key, type: 'button', className: output === key ? 'active' : '', 'aria-pressed': output === key, onClick: () => setOutput(key) }, label))),
                output === 'json' && h('p', { className: 'text-sm text-gray-600' }, 'POST ' + TRAFFIC_API + ' · Eksempel for første stasjon og første side/år. Power Query-koden henter hele utvalget.'),
                h('textarea', { className: 'ssb-code', value: output === 'm' ? code : JSON.stringify(request, null, 2), readOnly: true, rows: 18, spellCheck: false,
                    'aria-label': 'Generert Vegvesen-spørring', onFocus: event => event.target.select() }),
                h('div', { className: 'ssb-actions' }, button(output === 'm' ? 'Kopier Power Query-kode' : 'Kopier GraphQL / JSON', copy, false, true),
                    button('Last ned M-kode', download), button('Endre periode', () => setStep(2)), button('Endre stasjoner', () => setStep(1))),
                h('p', { className: 'text-sm text-gray-600 mt-4' }, 'Power Query henter alle valgte stasjoner og følger alle sidepekere for time- og døgndata. Dekningsgrad og eventuelle konfidensintervaller følger med. Forhåndsvis data i Power BI.')),
            h('footer', { className: 'ssb-footer text-sm text-gray-600' }, h('p', null, 'Inneholder data distribuert av Statens vegvesen under Norsk lisens for offentlige data (NLOD). Ta hensyn til dekningsgrad ved bruk av tallene.'),
                h('a', { href: 'https://trafikkdata.atlas.vegvesen.no/om-api', target: '_blank', rel: 'noopener noreferrer' }, 'Om Trafikkdata-API-et ↗')))
    );
}
