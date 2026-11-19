import { BRREG_TOPICS, brregTopic, brregRCode } from '../lib/brreg.mjs';
import { downloadRScript } from '../lib/rCode.mjs';
import { splitCodes, joinCodes, fieldCodebook, isCodeField, isCompanyField, multipleCodeField } from '../lib/brregAssist.mjs';
import { CompanySearch, CodePicker, ReportYears } from './BrregAssist.mjs';

const { createElement: h, useState, useEffect } = React;
const button = (text, onClick, disabled = false, primary = false) => h('button', { type: 'button', className: 'btn ' + (primary ? 'btn-primary' : 'btn-outline'), onClick, disabled }, text);
const labels = {
    navn: 'Navn på virksomhet', organisasjonsnummer: 'Organisasjonsnummer (kommaseparert)',
    overordnetEnhet: 'Overordnet virksomhet (organisasjonsnummer)',
    'forretningsadresse.kommunenummer': 'Kommune (forretningsadresse)',
    'beliggenhetsadresse.kommunenummer': 'Kommune (arbeidssted)',
    organisasjonsform: 'Organisasjonsform (f.eks. AS)', naeringskode: 'Næringskode (f.eks. 62)',
    fraAntallAnsatte: 'Minste antall ansatte', tilAntallAnsatte: 'Største antall ansatte'
};
const primary = new Set(Object.keys(labels));

export function BrregBuilder() {
    const [search, setSearch] = useState('');
    const [group, setGroup] = useState('');
    const [id, setId] = useState('');
    const [options, setOptions] = useState({ org: '', parameters: {} });
    const [metadata, setMetadata] = useState(null);
    const [metadataError, setMetadataError] = useState('');
    const [codebooks, setCodebooks] = useState(null);
    const [codebookError, setCodebookError] = useState('');
    const [companyTarget, setCompanyTarget] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const [showCode, setShowCode] = useState(false);
    const [notice, setNotice] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        setMetadataError('');
        setCodebookError('');
        fetch('./data/brreg/metadata.json', { signal: controller.signal })
            .then(response => { if (!response.ok) throw new Error('Kunne ikke laste filteroversikten.'); return response.json(); })
            .then(value => { if (!controller.signal.aborted) setMetadata(value); })
            .catch(error => { if (!controller.signal.aborted) setMetadataError(error.message); });
        fetch('./data/brreg/codebooks.json', { signal: controller.signal })
            .then(response => { if (!response.ok) throw new Error('Kunne ikke laste kodeoversikten.'); return response.json(); })
            .then(value => { if (!controller.signal.aborted) setCodebooks(value); })
            .catch(error => { if (!controller.signal.aborted) setCodebookError(error.message); });
        return () => controller.abort();
    }, [attempt]);
    const item = id ? brregTopic(id) : null;
    let code = '', validation = '';
    if (item) {
        try { code = brregRCode(id, options, metadata); } catch (error) { validation = error.message; }
    }
    function select(value) {
        setId(value.id); setOptions(previous => ({ org: value.org ? previous.org : '', parameters: { ...value.defaults } })); setShowCode(false); setNotice(''); setCompanyTarget(null);
    }
    function updateOrg(value) {
        setOptions(previous => {
            const parameters = { ...previous.parameters };
            if (splitCodes(previous.org).sort().join(',') !== splitCodes(value).sort().join(',')) { delete parameters.aar; delete parameters['år']; }
            return { ...previous, org: value, parameters };
        });
        setShowCode(false); setNotice('');
    }
    function findCompany(target) { setCompanyTarget(previous => previous === target ? null : target); }
    function parameter(key, value) {
        setOptions(previous => ({ ...previous, parameters: { ...previous.parameters, [key]: value } }));
        setShowCode(false); setNotice('');
    }
    function field({ name, description, type, format, example, label }) {
        const title = label || labels[name] || name;
        const properties = { id: 'brreg-field-' + name, className: 'input', 'aria-label': title, value: options.parameters[name] || '', onChange: event => parameter(name, event.target.value) };
        return h('div', { key: name, className: 'brreg-field' }, h('label', { htmlFor: properties.id }, title),
            item.choices?.[name] ? h('select', properties, item.choices[name].map(value => h('option', { key: value, value }, value || 'Alle'))) :
                type === 'boolean' ? h('select', properties, h('option', { value: '' }, 'Alle'), h('option', { value: 'true' }, 'Ja'), h('option', { value: 'false' }, 'Nei')) :
                h('input', { ...properties, type: ['datetime-local', 'date'].includes(type) ? type : format === 'date' || /^(fra|til).*dato/i.test(name) ? 'date' : 'text',
                    list: name.endsWith('.kommunenummer') || name === 'kommunenummer' ? 'brreg-kommuner' : undefined,
                    placeholder: example ? String(example) : '' }),
            description && h('small', { className: 'text-gray-600' }, description),
            isCompanyField(name) && button('Finn virksomhet: ' + title, () => findCompany(name)),
            isCodeField(name) && h(CodePicker, { key: item.id + '-' + name, label: title, rows: name === 'NAERING' ? standard => fieldCodebook(name, metadata, codebooks, standard) : fieldCodebook(name, metadata, codebooks),
                industryStandards: name === 'NAERING', value: options.parameters[name] || '', multiple: multipleCodeField(name), loading: name === 'kommunenummer' || name.endsWith('.kommunenummer') ? !metadata : !codebooks && !codebookError, onChange: value => parameter(name, value) }),
            name === 'naeringskode' && codebooks && h('small', null, codebooks.industryStandard + ' · SSB Klass'),
            ['regnskap', 'regnskap-csv', 'regnskap-pdf'].includes(item.id) && ['aar', 'år'].includes(name) && h(ReportYears, { key: item.id + '-years', org: options.org, numeric: item.id !== 'regnskap-pdf', value: options.parameters[name] || '', onChange: value => parameter(name, value) }));
    }
    const fields = item?.filters ? metadata?.filters[item.filters] || [] : (item?.fields || []).map(([name, label, type]) => ({ name, label, type }));
    const matches = BRREG_TOPICS.filter(value => (!group || value.group === group) && `${value.title} ${value.description} ${value.group}`.toLocaleLowerCase('nb').includes(search.toLocaleLowerCase('nb')));
    return h('div', { className: 'bg-gradient ssb-app brreg-app' }, h('div', { className: 'container' },
        h('div', { className: 'text-center mb-8' }, h('h1', null, 'Brønnøysund · Registerdata til R'),
            h('p', null, 'Finn et tema, velg utvalg og kopier et ferdig R-skript. Ingen API-nøkkel nødvendig.')),
        h('p', { className: 'udir-intro' }, `${BRREG_TOPICS.length} temaer og nedlastinger fra åpne tjenester: virksomheter, regnskap, roller, frivillighet, offentlig støtte, partier, statlig struktur og rapporteringsplikter. Denne kilden har foreløpig bare R-eksport.`),
        !item ? h('section', { className: 'card' }, h('h2', null, '1 · Finn tema'),
            h('div', { className: 'traffic-period' }, h('label', null, 'Søk etter tema', h('input', { type: 'search', className: 'input', value: search, placeholder: 'F.eks. ansatte, regnskap eller kommune', onChange: event => setSearch(event.target.value) })),
                h('label', null, 'Temaområde', h('select', { className: 'input', 'aria-label': 'Temaområde', value: group, onChange: event => setGroup(event.target.value) }, h('option', { value: '' }, 'Alle temaområder'), [...new Set(BRREG_TOPICS.map(value => value.group))].map(value => h('option', { key: value, value }, value))))),
            h('p', { role: 'status' }, matches.length + ' temaer'),
            h('div', { className: 'brreg-topics' }, matches.map(value => h('button', { type: 'button', key: value.id, className: 'brreg-topic', onClick: () => select(value) },
                h('small', null, value.group), h('strong', null, value.title), h('span', null, value.description)))),
            !matches.length && h('p', null, 'Ingen treff. Prøv et annet søkeord eller temaområde.')) :
            h('section', { className: 'card' }, button('← Alle temaer', () => { setId(''); setShowCode(false); }),
                h('h2', null, '2 · ' + item.title), h('p', null, item.description),
                item.org && h('div', { className: 'brreg-field' }, h('label', { htmlFor: 'brreg-org' }, 'Organisasjonsnummer'), h('textarea', { id: 'brreg-org', className: 'input', 'aria-label': 'Organisasjonsnummer', rows: 3, placeholder: '982463718\n923609016', value: options.org, onChange: event => updateOrg(event.target.value) }), h('small', null, 'Ett eller flere nummer med ni siffer. Skill med linjeskift eller komma.'), button('Finn virksomhet og fyll inn nummer', () => findCompany('org'))),
                companyTarget && h(CompanySearch, { key: item.id + '-' + companyTarget, metadata, codebooks, selected: companyTarget === 'org' ? options.org : options.parameters[companyTarget] || '', multiple: companyTarget === 'org' || multipleCodeField(companyTarget), initialKind: companyTarget === 'org' && item.id.startsWith('underenhet') || companyTarget === 'organisasjonsnummer' && item.id === 'underenheter' ? 'underenheter' : 'enheter',
                    onClose: () => setCompanyTarget(null), onChoose: row => {
                        if (companyTarget === 'org') updateOrg(joinCodes(options.org, row.organisasjonsnummer, true));
                        else parameter(companyTarget, joinCodes(options.parameters[companyTarget], row.organisasjonsnummer, multipleCodeField(companyTarget)));
                    } }),
                item.filters && !metadata && h('p', { role: 'status' }, 'Laster søkefiltre …'),
                item.filters && metadataError && h('div', { role: 'alert', className: 'ssb-error' }, metadataError, button('Prøv igjen', () => setAttempt(attempt + 1))),
                codebookError && h('div', { role: 'status', className: 'ssb-error' }, codebookError, ' Du kan fortsatt skrive koder manuelt.', button('Last kodeoversikt igjen', () => setAttempt(attempt + 1))),
                h('datalist', { id: 'brreg-kommuner' }, (metadata?.municipalities || []).map(value => h('option', { key: value.code, value: value.code }, value.name))),
                h('div', { className: 'brreg-fields' }, fields.filter(value => !item.filters || primary.has(value.name)).map(field)),
                item.filters && h('details', null, h('summary', null, 'Flere søkefiltre'), h('div', { className: 'brreg-fields' }, fields.filter(value => !primary.has(value.name)).map(field))),
                item.filters && h('p', { className: 'ssb-summary' }, 'Tomme felt betyr ingen avgrensning. Søket kan hente opptil 10 000 treff. For større utvalg: velg «Hele registerbestander». Manglende antall ansatte betyr ikke null ansatte.'),
                item.id.startsWith('endringer-') && h('p', null, 'Tidspunktene tolkes som UTC. Endringsloggen henter alle tilgjengelige sider fra valgt tidspunkt.'),
                item.stotteSearch && h('p', { className: 'ssb-summary' }, 'Tomme filtre gir hele søket. Skriptet henter sider med opptil 1 000 treff, og stopper med beskjed hvis søkevinduet på 100 000 nås. Finn identifikatorer under «Støtteregisterets kodeverk». Uttrekket omfatter støtte som er registrert i Støtteregisteret.'),
                item.file && h('p', { className: 'ssb-summary' }, 'Filen lagres i arbeidsmappen til R. ' + (item.group === 'Hele registerbestander' ? 'Hele registerbestander kan kreve mye tid, diskplass og minne. ' : '') + (item.file === 'download' || item.file === 'pdf' ? 'data inneholder filbanen. ' : 'Innholdet leses inn i data. ') + 'En tidligere fil med samme navn blir erstattet.'),
                validation && h('p', { className: 'ssb-validation', role: 'alert' }, validation),
                h('div', { className: 'ssb-actions' }, button('Lag R-kode →', () => { setShowCode(true); setNotice(''); }, !!validation || !!item.filters && !metadata, true)),
                showCode && !validation && h('div', { className: 'mt-6' }, h('h2', null, '3 · Hent data i R'),
                    h('p', null, ['download', 'pdf'].includes(item.file) ? 'Kjør i R/RStudio med httr2 installert. data inneholder banen til den nedlastede filen.' : 'Kjør i R/RStudio med ' + (item.file === 'xlsx' ? 'httr2 og readxl' : item.file === 'csv' ? 'httr2' : 'httr2 og jsonlite') + ' installert. Resultatet ligger i data (data.frame).'),
                    !item.file && h('p', { className: 'text-sm text-gray-600' }, 'Nøstede felter får kolonnenavn med punktum. Lister beholdes som JSON i cellene. Skriptet følger neste side automatisk der tjenesten har sideinndeling.'),
                    h('textarea', { className: 'ssb-code', rows: 20, readOnly: true, spellCheck: false, value: code, 'aria-label': 'Generert Brønnøysund R-kode' }),
                    h('div', { className: 'ssb-actions' }, button('Kopier R-kode', async () => { try { await navigator.clipboard.writeText(code); setNotice('R-koden er kopiert.'); } catch { setNotice('Marker og kopier koden i feltet.'); } }, false, true), button('Last ned R-skript', () => downloadRScript(code, 'brreg-' + id))),
                    h('p', { role: 'status' }, notice))),
        h('details', { className: 'card mt-6' }, h('summary', null, 'Hva er inkludert – og hva krever egen tilgang?'),
            h('p', null, 'Temavelgeren dekker åpne registeroppslag, kodeverk og filnedlastinger som er koblet til denne R-generatoren. Flere valg kan gjelde samme register i ulike formater.'),
            h('p', null, 'Tjenester som krever API-nøkkel, avtale, betaling, sertifikat eller Maskinporten er ikke koblet til: blant annet autoriserte rolleopplysninger med fødselsnummer, reelle rettighetshavere og enkelte tjenester for Løsøreregisteret, Ektepaktregisteret og nordiske virksomheter.')),
        h('footer', { className: 'ssb-footer text-sm text-gray-600' }, h('p', null, 'Kilde: Brønnøysundregistrene. Bare åpne tjenester er inkludert. Oppslag i roller kan inneholde personopplysninger.'),
            h('p', null, 'Næringskoder: ', h('a', { href: 'https://www.ssb.no/klass/klassifikasjoner/6', target: '_blank', rel: 'noopener noreferrer' }, 'SSB Klass'), ' · CC BY 4.0. Kodeoversikten er forkortet til koder og navn.'),
            h('a', { href: 'https://www.brreg.no/bruke-data-fra-bronnoysundregistrene/datasett-og-api/', target: '_blank', rel: 'noopener noreferrer' }, 'Datasett og API hos Brønnøysundregistrene ↗'))));
}
