import { POLITIET_API, politietParameters, politietPowerQuery, politietEarliestDate, readPolitietMetadata, validatePolitietOptions } from '../lib/politiet.mjs';
import { politietRCode, downloadRScript } from '../lib/rCode.mjs';
import { addDays } from '../lib/vegvesen.mjs';

const { createElement: h, useState, useEffect, useRef } = React;
const button = (label, onClick, disabled = false, primary = false) => h('button', { type: 'button', className: 'btn ' + (primary ? 'btn-primary' : 'btn-outline'), onClick, disabled }, label);
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function Filter({ label, values, selected, onChange }) {
    const [search, setSearch] = useState('');
    const matches = values.filter(value => value.label.toLocaleLowerCase('nb-NO').includes(search.toLocaleLowerCase('nb-NO')));
    return h('fieldset', { className: 'ssb-dimension' },
        h('legend', null, label),
        h('p', { className: 'text-sm text-gray-600' }, selected.length ? selected.length + ' valgt' : 'Alle (ingen avgrensning)'),
        h('input', { className: 'input', type: 'search', value: search, 'aria-label': 'Søk i ' + label, placeholder: 'Søk …', onChange: event => setSearch(event.target.value) }),
        h('div', { className: 'ssb-actions' }, button('Fjern filter', () => onChange([]), !selected.length)),
        h('div', { className: 'ssb-values' }, matches.map(value => h('label', { key: value.code, className: 'ssb-value' },
            h('input', { type: 'checkbox', checked: selected.includes(value.code), onChange: () => onChange(selected.includes(value.code) ? selected.filter(code => code !== value.code) : [...selected, value.code]) }),
            h('span', null, value.label))), !matches.length && h('p', null, 'Ingen treff.')));
}

export function PolitietBuilder() {
    const [metadata, setMetadata] = useState(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [notice, setNotice] = useState('');
    const [step, setStep] = useState(1);
    const [output, setOutput] = useState('m');
    const [options, setOptions] = useState(() => ({ districts: [], municipalities: [], categories: [], active: '', period: 'rolling', days: 7, startDate: addDays(today(), -7), endDate: today() }));
    const heading = useRef(null);
    useEffect(() => {
        const controller = new AbortController();
        setError(''); setMetadata(null);
        readPolitietMetadata({ signal: controller.signal }).then(data => { if (!controller.signal.aborted) setMetadata(data); })
            .catch(err => { if (!controller.signal.aborted) setError(err.message); });
        return () => controller.abort();
    }, [attempt]);
    useEffect(() => { heading.current?.focus(); setNotice(''); }, [step, output]);
    function update(key, value) { setOptions(previous => ({ ...previous, [key]: value })); setNotice(''); }
    const districts = metadata?.districts || [];
    const municipalities = [...new Set(districts.filter(d => !options.districts.length || options.districts.includes(d.code)).flatMap(d => d.municipalities.map(m => m.name)))].sort((a, b) => a.localeCompare(b, 'nb'));
    let validation = '';
    try { validatePolitietOptions(options); } catch (err) { validation = err.message; }
    const code = validation ? '' : output === 'r' ? politietRCode(options) : output === 'url' ? POLITIET_API + '/messages?' + politietParameters(options).toString() : politietPowerQuery(options);
    async function copy() {
        try { await navigator.clipboard.writeText(code); setNotice('Koden er kopiert.'); }
        catch { setNotice('Kunne ikke kopiere automatisk. Marker og kopier koden i feltet.'); }
    }
    function download() {
        if (output === 'r') return downloadRScript(code, 'politiloggen');
        const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'politiloggen.pq';
        document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return h('div', { className: 'bg-gradient ssb-app udir-app' },
        h('div', { className: 'container' },
            h('div', { className: 'text-center mb-8' }, h('h1', null, 'Politiet · Politiloggen'), h('p', { className: 'text-gray-600' }, 'Velg meldinger og lag en spørring til Power BI eller R.')),
            h('p', { className: 'udir-intro' }, 'Politiloggen inneholder publiserte operative meldinger, ikke fullstendig kriminalstatistikk. Flere meldinger kan gjelde samme hendelse. Bare data som API-et fortsatt gjør tilgjengelig kan hentes.'),
            h('div', { className: 'ssb-steps', role: 'group', 'aria-label': 'Steg for Politiloggen' },
                button('1 · Velg filtre og periode', () => setStep(1)), button('2 · Hent kode', () => setStep(2), !metadata || !!validation)),
            error && h('div', { className: 'ssb-error', role: 'alert' }, error, button('Prøv igjen', () => setAttempt(attempt + 1))),
            !metadata && !error && h('p', { role: 'status' }, 'Laster filteroversikt …'),
            notice && h('p', { role: 'status', className: 'ssb-summary' }, notice),
            metadata && step === 1 && h('section', { className: 'card' },
                h('h2', { ref: heading, tabIndex: -1 }, 'Velg filtre og periode'),
                h('div', { className: 'ssb-dimensions' },
                    h(Filter, { label: 'Politidistrikt', values: districts.map(d => ({ code: d.code, label: d.name })), selected: options.districts, onChange: values => {
                        const allowed = new Set(districts.filter(d => !values.length || values.includes(d.code)).flatMap(d => d.municipalities.map(m => m.name)));
                        setOptions(previous => ({ ...previous, districts: values, municipalities: previous.municipalities.filter(m => allowed.has(m)) }));
                    } }),
                    h(Filter, { label: 'Kommune', values: municipalities.map(m => ({ code: m, label: m })), selected: options.municipalities, onChange: values => update('municipalities', values) }),
                    h(Filter, { label: 'Kategori', values: metadata.categories.map(c => ({ code: c.name, label: c.name })), selected: options.categories, onChange: values => update('categories', values) })),
                h('p', { className: 'text-sm text-gray-600' }, 'Ingen valgte verdier betyr alle. Kommuner sendes som navn, slik API-et krever. Velg også distrikt for å skille kommuner med samme navn.'),
                h('div', { className: 'traffic-period' },
                    h('label', null, 'Status', h('select', { className: 'input', value: options.active, onChange: event => update('active', event.target.value) },
                        h('option', { value: '' }, 'Alle'), h('option', { value: 'true' }, 'Aktive'), h('option', { value: 'false' }, 'Avsluttede'))),
                    h('label', null, 'Periode', h('select', { className: 'input', value: options.period, onChange: event => update('period', event.target.value) },
                        h('option', { value: 'rolling' }, 'Siste antall døgn (dynamisk)'), h('option', { value: 'fixed' }, 'Faste datoer'))),
                    options.period === 'rolling'
                        ? h('label', null, 'Antall døgn', h('input', { className: 'input', type: 'number', min: 1, max: 365, value: options.days, onChange: event => update('days', event.target.value) }))
                        : h('div', { className: 'traffic-date-row' }, ['startDate', 'endDate'].map((key, i) => h('label', { key }, i ? 'Til og med' : 'Fra og med', h('input', { className: 'input', type: 'date', min: politietEarliestDate(), value: options[key], onChange: event => update(key, event.target.value) }))))),
                h('p', { className: 'text-sm text-gray-600' }, 'Politiets API tillater fra-dato maksimalt ett år tilbake fra kjøringstidspunktet. For faste, hele kalenderdager: velg ' + politietEarliestDate() + ' eller senere. En lagret spørring med faste datoer kan derfor bli for gammel ved senere oppdatering.'),
                h('p', { className: 'ssb-summary' }, options.period === 'rolling' ? 'Perioden beregnes på nytt ved hver kjøring i Power BI eller R. Store perioder kan kreve mange API-kall og gir ikke tilgang til meldinger som ikke lenger finnes i API-et.' : 'Faste datoer omfatter hele norske kalenderdager, inkludert til-datoen. Datoene endres ikke ved oppdatering.'),
                validation && h('p', { role: 'alert', className: 'ssb-validation' }, validation),
                h('div', { className: 'ssb-actions' }, button('Lag Power Query-kode →', () => { setOutput('m'); setStep(2); }, !!validation, true), button('Lag R-kode →', () => { setOutput('r'); setStep(2); }, !!validation))),
            metadata && step === 2 && h('section', { className: 'card' },
                h('h2', { ref: heading, tabIndex: -1 }, 'Spørringen er klar'),
                h('div', { className: 'ssb-output-tabs', role: 'group', 'aria-label': 'Politiloggen kodeformat' }, [['m', 'Power Query'], ['r', 'R-skript'], ['url', 'GET / URL']].map(([value, label]) => h('button', { key: value, type: 'button', className: output === value ? 'active' : '', 'aria-pressed': output === value, onClick: () => setOutput(value) }, label))),
                output === 'm' && h('ol', { className: 'udir-instructions' }, h('li', null, 'I Power BI: Transformer data → Ny kilde → Tom spørring.'), h('li', null, 'Lim koden inn i Avansert redigering.'), h('li', null, 'Velg Anonym som autentisering til ' + POLITIET_API)),
                output === 'r' && h('p', null, 'Kjør i R/RStudio med httr2 og jsonlite installert. Resultatet ligger i data (data.frame).'),
                output === 'url' && h('p', null, 'Eksempel for første side (opptil 50 meldinger). URL-en har faste tidspunkter. Bruk Power Query eller R for å hente alle sidene.'),
                h('textarea', { className: 'ssb-code', rows: 18, value: code, readOnly: true, spellCheck: false, 'aria-label': 'Generert Politiloggen-spørring', onFocus: event => event.target.select() }),
                h('div', { className: 'ssb-actions' }, button('Kopier kode', copy, false, true), output !== 'url' && button(output === 'r' ? 'Last ned R-skript' : 'Last ned M-kode', download), button('Endre filtre', () => setStep(1))),
                h('p', { className: 'ssb-summary' }, 'Power Query og R følger hasMoreResults og henter alle tilgjengelige sider. Tidspunkter og meldings-/tråd-ID beholdes. API-et endres løpende, og meldinger kan redigeres eller fjernes mens uttrekket kjører. Uttrekket er ikke et historisk arkiv.')),
            metadata && h('p', { className: 'text-sm text-gray-600 mt-4' }, 'Filteroversikt hentet ' + new Date(metadata.fetchedAt).toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo' }) + '. Data hentes direkte i Power BI eller R.'),
            h('footer', { className: 'ssb-footer text-sm text-gray-600' }, h('p', null, 'Kilde: Politiet · Politiloggen. Norsk lisens for offentlige data (NLOD) 2.0.'),
                h('a', { href: POLITIET_API + '/index.html', target: '_blank', rel: 'noopener noreferrer' }, 'Politiets API-dokumentasjon ↗'))));
}
