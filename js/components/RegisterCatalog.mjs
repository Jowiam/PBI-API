import { REGISTER_CATALOG, REGISTER_REVIEWED, filterRegisterCatalog } from '../lib/registerCatalog.mjs';
import { REGISTER_QUERIES, registerQuery, registerDefaults, registerRCode } from '../lib/registerR.mjs';
import { downloadRScript } from '../lib/rCode.mjs';

const { createElement: h, useState } = React;
const link = (label, href) => h('a', { key: label, href, target: '_blank', rel: 'noopener noreferrer' }, label);

export function RegisterCatalog() {
    const [search, setSearch] = useState('');
    const [coverage, setCoverage] = useState('');
    const [selected, setSelected] = useState('');
    const [route, setRoute] = useState('');
    const [values, setValues] = useState({});
    const [showCode, setShowCode] = useState(false);
    const [notice, setNotice] = useState('');
    const matches = filterRegisterCatalog(search, coverage);
    const item = REGISTER_CATALOG.find(value => value.id === selected);
    const query = item ? registerQuery(item.id, route) : null;
    let code = '', validation = '';
    if (item) {
        try { code = registerRCode(item.id, route, values); } catch (error) { validation = error.message; }
    }
    function choose(id, source = Object.keys(REGISTER_QUERIES[id])[0]) {
        setSelected(id); setRoute(source); setValues(registerDefaults(id, source)); setShowCode(false); setNotice('');
    }
    function field([key, label, type, required = true]) {
        const properties = { className: 'input', 'aria-label': label, value: values[key] || '', onChange: event => { setValues(previous => ({ ...previous, [key]: event.target.value })); setShowCode(false); setNotice(''); } };
        const options = type === 'boolean' ? [['', 'Ikke angitt'], ['true', 'Ja'], ['false', 'Nei']] : type === 'separator' ? [[';', 'Semikolon'], [',', 'Komma'], ['\\t', 'Tabulator']] : type === 'encoding' ? [['UTF-8', 'UTF-8'], ['latin1', 'Latin-1']] : null;
        return h('label', { key, className: 'brreg-field' }, label,
            options ? h('select', properties, options.map(([value, name]) => h('option', { key: value, value }, name))) :
                h('input', { ...properties, type: type === 'date' ? 'date' : 'text', required, autoComplete: 'off', spellCheck: false }));
    }
    return h('div', { className: 'bg-gradient ssb-app register-catalog' }, h('div', { className: 'container' },
        h('div', { className: 'text-center mb-8' }, h('h1', null, 'Eierskap, personer og risiko'),
            h('p', null, 'Velg datasett og utvalg, og lag et ferdig R-skript som henter data.')),
        item ? h('section', { className: 'card' },
            h('button', { type: 'button', className: 'btn btn-outline', onClick: () => { setSelected(''); setShowCode(false); } }, 'Alle datasett'),
            h('h2', null, item.title), h('p', null, item.description),
            h('label', { className: 'brreg-field' }, 'Hent data fra', h('select', { className: 'input', 'aria-label': 'Hent data fra', value: route, onChange: event => choose(item.id, event.target.value) },
                Object.entries(REGISTER_QUERIES[item.id]).map(([key, value]) => h('option', { key, value: key }, value.source)))),
            h('p', { className: 'ssb-summary' }, query.auth === 'file' ? 'Bestill aksjonæruttrekket hos Skatteetaten. R-skriptet åpner en filvelger og leser den nedlastede CSV-filen.' : query.auth === 'roaring' ? 'Krever Roaring-konto med tilgang til dette produktet. Sett ROARING_CLIENT_ID og ROARING_CLIENT_SECRET i R-miljøet. Nøkler skal ikke fylles inn på nettsiden.' : query.auth === 'rrh' ? 'Krever godkjent registertilgang. Sett et gyldig Maskinporten-token i BRREG_RRH_TOKEN i R-miljøet.' : 'Krever rettighetspakken «Offentlig og privat virksomhet med hjemmel». Sett et gyldig Maskinporten-token i FREG_TOKEN i R-miljøet. Andre rettighetspakker kan bruke Roaring-alternativet med nødvendig tilgang.'),
            h('div', { className: 'brreg-fields' }, query.fields.map(field)),
            query.auth !== 'file' && h('p', { className: 'text-gray-600' }, 'Skriptet henter det valgte oppslaget. Hele API-svaret beholdes i resultat; tabellen ligger i data. Lister beholdes som JSON i tabellcellene.'),
            validation && h('p', { className: 'ssb-validation', role: 'status' }, validation),
            h('button', { type: 'button', className: 'btn btn-primary', disabled: !!validation, onClick: () => setShowCode(true) }, 'Lag R-kode'),
            showCode && !validation && h('div', { className: 'mt-6' },
                h('h2', null, 'Hent data i R'),
                h('p', null, query.auth === 'file' ? 'Kjør skriptet i R/RStudio og velg CSV-filen. Alle kolonner leses som tekst.' : 'Kjør i R/RStudio med httr2 og jsonlite installert. Tilgangsnøkler og token settes lokalt i R før kjøring.'),
                h('textarea', { className: 'ssb-code', rows: 20, readOnly: true, spellCheck: false, value: code, 'aria-label': 'Generert R-kode for registerdata' }),
                h('div', { className: 'ssb-actions' },
                    h('button', { type: 'button', className: 'btn btn-primary', onClick: async () => { try { await navigator.clipboard.writeText(code); setNotice('R-koden er kopiert.'); } catch { setNotice('Marker og kopier koden i feltet.'); } } }, 'Kopier R-kode'),
                    h('button', { type: 'button', className: 'btn btn-outline', onClick: () => downloadRScript(code, 'register-' + item.id) }, 'Last ned R-skript')),
                h('p', { role: 'status' }, notice)),
            h('details', { className: 'mt-6' }, h('summary', null, 'Originalkilde og dokumentasjon'), h('p', null, item.origin),
                h('ul', { className: 'register-links' }, item.links.map(([label, href]) => h('li', { key: label }, link(label, href))), h('li', null, link('Roaring: ' + item.roaringName, item.roaringUrl))))) : h(React.Fragment, null,
        h('section', { className: 'card' }, h('h2', null, 'Kilder og tilgang'),
            h('p', null, `${REGISTER_CATALOG.length} datasett med R-eksport. Originalkildene brukes der dokumenterte oppslag eller filer er tilgjengelige. Roarings bearbeidede produkter krever egen API-tilgang.`),
            h('div', { className: 'brreg-fields' },
                h('label', null, 'Søk i navn og kilder', h('input', { type: 'search', className: 'input', value: search, placeholder: 'F.eks. aksjonærer, Folkeregisteret eller PEP', onChange: event => setSearch(event.target.value) })),
                h('label', null, 'Type datasett', h('select', { className: 'input', value: coverage, onChange: event => setCoverage(event.target.value) },
                    h('option', { value: '' }, 'Alle datasett'), h('option', { value: 'missing' }, 'Nye datatyper'), h('option', { value: 'partial' }, 'Utvidelser av eksisterende data')))),
            h('p', { role: 'status' }, `${matches.length} av ${REGISTER_CATALOG.length} oppføringer`)),
        h('div', { className: 'register-grid' }, matches.map(item => h('article', { className: 'card register-card', key: item.id },
            h('span', { className: 'register-status' }, 'R · ' + Object.values(REGISTER_QUERIES[item.id])[0].source),
            h('h2', null, item.title), h('p', null, item.description),
            h('button', { type: 'button', className: 'btn btn-primary', onClick: () => choose(item.id) }, 'Velg datasett'),
            h('details', null, h('summary', null, 'Datagrunnlag og tilgang'),
                h('p', null, item.origin), h('p', null, h('strong', null, 'Tilgang: '), item.access),
                h('p', null, h('strong', null, 'Dekning: '), item.limitation)),
            h('ul', { className: 'register-links' }, item.links.map(([label, href]) => h('li', { key: label }, link(label, href))),
                h('li', null, link('Roaring: ' + item.roaringName, item.roaringUrl)))))),
        !matches.length && h('p', { className: 'card' }, 'Ingen treff. Prøv et annet søkeord eller velg alle oppføringer.')),
        h('p', { className: 'ssb-footer' }, 'Kildekartlegging kontrollert ' + REGISTER_REVIEWED + '. Tilgangsvilkår og leverandørdekning kan endres.')));
}
