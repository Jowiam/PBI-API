import { splitCodes, joinCodes, companySearchURL, readAssistJSON, commonReportYears, loadReportYears } from '../lib/brregAssist.mjs';
const { createElement: h, useState, useEffect, useRef } = React;
const button = (label, onClick, disabled = false) => h('button', { type: 'button', className: 'btn btn-outline', onClick, disabled }, label);

export function CompanySearch({ metadata, codebooks, selected, multiple, initialKind = 'enheter', onChoose, onClose }) {
    const [query, setQuery] = useState('');
    const [municipality, setMunicipality] = useState('');
    const [form, setForm] = useState('');
    const [kind, setKind] = useState(initialKind);
    const [rows, setRows] = useState([]);
    const [next, setNext] = useState('');
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const controller = useRef(null);
    const chosen = splitCodes(selected);
    async function load(url, append, signal) {
        setLoading(true); setError('');
        try {
            const response = await readAssistJSON(url, signal);
            if (signal.aborted) return;
            const batch = response._embedded?.[kind] || [];
            setRows(previous => append ? [...previous, ...batch] : batch);
            setNext(response._links?.next?.href || '');
            setTotal(response.page?.totalElements || batch.length);
        } catch (error) { if (!signal.aborted) setError(error.message); }
        finally { if (!signal.aborted) setLoading(false); }
    }
    useEffect(() => {
        controller.current?.abort();
        const request = new AbortController(); controller.current = request;
        setRows([]); setNext(''); setTotal(0); setError(''); setLoading(false);
        if (query.trim().length < 2) return () => request.abort();
        let url;
        try { url = companySearchURL({ query, municipality, form, kind }); }
        catch (error) { setError(error.message); return () => request.abort(); }
        setLoading(true);
        const timer = setTimeout(() => load(url, false, request.signal), 350);
        return () => { clearTimeout(timer); request.abort(); };
    }, [query, municipality, form, kind, attempt]);
    return h('section', { className: 'brreg-assist', 'aria-label': 'Finn virksomhet og organisasjonsnummer' },
        h('div', { className: 'ssb-actions' }, h('h3', null, 'Finn virksomhet'), button('Lukk virksomhetssøk', onClose)),
        h('p', null, multiple ? 'Velg én eller flere virksomheter. Numrene legges til i utvalget.' : 'Velg en virksomhet for å fylle ut feltet.'),
        h('div', { className: 'brreg-fields' },
            h('label', null, 'Navn eller organisasjonsnummer', h('input', { type: 'search', className: 'input', autoFocus: true, value: query, 'aria-label': 'Søk virksomhet etter navn eller nummer', placeholder: 'F.eks. Telenor eller 982 463 718', onChange: event => setQuery(event.target.value) })),
            h('label', null, 'Kommune', h('input', { className: 'input', value: municipality, 'aria-label': 'Kommune i virksomhetssøket', list: 'brreg-kommuner', placeholder: 'Søk kommunenavn eller kode', onChange: event => setMunicipality(event.target.value) })),
            h('label', null, 'Type enhet', h('select', { className: 'input', 'aria-label': 'Type enhet i virksomhetssøket', value: kind, onChange: event => { setKind(event.target.value); setForm(''); } }, h('option', { value: 'enheter' }, 'Virksomhet / hovedenhet'), h('option', { value: 'underenheter' }, 'Arbeidssted / underenhet'))),
            h('label', null, 'Organisasjonsform', h('select', { className: 'input', 'aria-label': 'Organisasjonsform i virksomhetssøket', value: form, onChange: event => setForm(event.target.value) }, h('option', { value: '' }, 'Alle'), (codebooks?.organisationForms || []).map(row => h('option', { key: row.code, value: row.code }, row.code + ' · ' + row.label))))),
        query.trim().length < 2 && h('p', null, 'Skriv minst to tegn for å søke.'),
        loading && h('p', { role: 'status' }, 'Søker i Enhetsregisteret …'),
        error && h('div', { role: 'alert', className: 'ssb-error' }, error, button('Prøv søket igjen', () => setAttempt(attempt + 1))),
        !loading && !error && query.trim().length >= 2 && h('p', { role: 'status' }, total ? 'Viser ' + rows.length + ' av ' + total.toLocaleString('nb-NO') + ' treff.' : 'Ingen treff. Prøv et annet navn eller fjern filtre.'),
        h('div', { className: 'brreg-company-results' }, rows.map(row => {
            const address = row.forretningsadresse || row.beliggenhetsadresse || {};
            const status = row.slettedato ? 'Slettet' : row.konkurs ? 'Konkurs' : row.underAvvikling ? 'Under avvikling' : 'Registrert';
            const isChosen = chosen.includes(row.organisasjonsnummer);
            return h('article', { key: row.organisasjonsnummer, className: 'brreg-company-result' },
                h('strong', null, row.navn), h('span', null, row.organisasjonsnummer + ' · ' + (row.organisasjonsform?.kode || '') + ' · ' + (kind === 'underenheter' ? 'Arbeidssted' : 'Hovedenhet')),
                h('span', null, [...(address.adresse || []), address.postnummer, address.poststed, address.kommune].filter(Boolean).join(' · ')),
                h('small', null, status + (row.overordnetEnhet ? ' · Hovedenhet: ' + row.overordnetEnhet : '')),
                button(isChosen ? 'Valgt: ' + row.navn : 'Bruk ' + row.navn, () => onChoose(row), isChosen));
        })),
        next && rows.length < 500 && button('Vis flere virksomheter', () => load(next, true, controller.current.signal), loading),
        rows.length >= 500 && h('p', null, 'Avgrens søket for å finne flere treff.'),
        h('p', { className: 'text-sm text-gray-600' }, 'Hovedenheter og arbeidssteder har ulike organisasjonsnumre. Velg enheten spørringen skal gjelde.'));
}

export function CodePicker({ label, rows = [], value, multiple, onChange, industryStandards = false, loading = false }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(60);
    const [standard, setStandard] = useState('SN2007');
    const selected = splitCodes(value);
    const values = typeof rows === 'function' ? rows(standard) : rows;
    const words = search.toLocaleLowerCase('nb').trim().split(/\s+/).filter(Boolean);
    const matches = (values || []).filter(row => words.every(word => (row.code + ' ' + row.label).toLocaleLowerCase('nb').includes(word)));
    return h('div', { className: 'brreg-code-picker' },
        h('button', { type: 'button', className: 'btn btn-outline', 'aria-expanded': open, onClick: () => setOpen(!open) }, (open ? 'Lukk kodevalg: ' : 'Finn kode: ') + label),
        open && h('div', { className: 'brreg-assist', role: 'group', 'aria-label': 'Kodevalg: ' + label },
            h('input', { type: 'search', className: 'input', 'aria-label': 'Søk i koder: ' + label, placeholder: 'Søk på navn eller kode', value: search, onChange: event => { setSearch(event.target.value); setLimit(60); } }),
            industryStandards && h('label', null, 'Næringsstandard i kodevalget', h('select', { className: 'input', 'aria-label': 'Næringsstandard i kodevalget', value: standard, onChange: event => { setStandard(event.target.value); setLimit(60); } }, h('option', { value: 'SN2007' }, 'SN2007'), h('option', { value: 'SN2025' }, 'SN2025'))),
            loading ? h('p', { role: 'status' }, 'Laster kodeoversikt …') : h('p', { role: 'status' }, matches.length + ' koder. ' + selected.length + ' valgt.'),
            h('div', { className: 'brreg-code-values' }, matches.slice(0, limit).map(row => h('label', { key: row.code, className: 'ssb-value' },
                h('input', { type: 'checkbox', checked: selected.includes(row.code), onChange: () => onChange(selected.includes(row.code) ? selected.filter(code => code !== row.code).join(',') : joinCodes(value, row.code, multiple)) }),
                h('span', null, row.code + ' · ' + row.label)))),
            matches.length > limit && button('Vis flere koder', () => setLimit(limit + 60)),
            !loading && !matches.length && h('p', null, 'Ingen koder funnet.'),
            button('Tøm kodefeltet', () => onChange(''), !value),
            h('p', { className: 'text-sm text-gray-600' }, multiple ? 'Valgte koder legges kommaseparert i feltet. Du kan også skrive koder manuelt.' : 'Velg én kode. Du kan også skrive koden manuelt.')));
}

export function ReportYears({ org, numeric, value, onChange }) {
    const orgKey = splitCodes(org).sort().join(',');
    const requestKey = orgKey + '|' + numeric;
    const [result, setResult] = useState({ key: '', years: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setResult({ key: requestKey, years: [] }); setError(''); setLoading(true);
        loadReportYears(splitCodes(orgKey), controller.signal).then(lists => {
            if (!controller.signal.aborted) setResult({ key: requestKey, years: commonReportYears(lists, numeric) });
        }).catch(error => { if (!controller.signal.aborted) setError(error.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [orgKey, numeric, attempt]);
    const years = result.key === requestKey ? result.years : [];
    const busy = loading || result.key !== requestKey;
    return h('div', { className: 'brreg-assist brreg-year-picker' },
        h('label', null, 'Velg fra registerets regnskapsår', h('select', { className: 'input', 'aria-label': 'Tilgjengelige regnskapsår', value: years.includes(value) ? value : '', disabled: busy || !years.length, onChange: event => onChange(event.target.value) }, h('option', { value: '' }, 'Velg år …'), years.map(year => h('option', { key: year, value: year }, year)))),
        busy && h('p', { role: 'status' }, 'Henter regnskapsår …'),
        !busy && error && h('p', { role: 'status' }, error, orgKey && button('Hent regnskapsår igjen', () => setAttempt(attempt + 1))),
        !busy && !error && !years.length && h('p', null, 'Ingen felles regnskapsår funnet for utvalget' + (numeric ? ' innenfor historikken til tall-API-et.' : '.')),
        h('small', null, (splitCodes(orgKey).length > 1 ? 'Bare år som finnes for alle valgte virksomheter vises. ' : '') + (numeric ? 'Årslisten bygger på tilgjengelige regnskapsdokumenter, avgrenset til de siste regnskapsårene. Tall-API-et kan ha færre regnskap enn dokumentoversikten. ' : 'Årslisten viser tilgjengelige regnskapsdokumenter. ') + 'Du kan fortsatt skrive årstallet manuelt.'));
}
