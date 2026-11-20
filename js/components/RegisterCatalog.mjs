import { REGISTER_CATALOG, REGISTER_REVIEWED, filterRegisterCatalog } from '../lib/registerCatalog.mjs';

const { createElement: h, useState } = React;
const link = (label, href) => h('a', { key: label, href, target: '_blank', rel: 'noopener noreferrer' }, label);

export function RegisterCatalog() {
    const [search, setSearch] = useState('');
    const [coverage, setCoverage] = useState('');
    const matches = filterRegisterCatalog(search, coverage);
    return h('div', { className: 'bg-gradient ssb-app register-catalog' }, h('div', { className: 'container' },
        h('div', { className: 'text-center mb-8' }, h('h1', null, 'Eierskap, personer og risiko'),
            h('p', null, 'Finn originalkilder og tilgang til registerdata vi mangler eller bare dekker delvis.')),
        h('section', { className: 'card' }, h('h2', null, 'Kilder og tilgang'),
            h('p', null, `${REGISTER_CATALOG.length} oppføringer fra Roarings Norge-liste, inkludert nordisk PEP. Dette er en kildeoversikt. Tjenestene er ikke koblet til for datahenting eller kodeeksport her.`),
            h('p', null, 'Hver oppføring skiller mellom offentlig register, bearbeidet leverandørprodukt og uavklart originalkilde.'),
            h('div', { className: 'brreg-fields' },
                h('label', null, 'Søk i navn og kilder', h('input', { type: 'search', className: 'input', value: search, placeholder: 'F.eks. aksjonærer, Folkeregisteret eller PEP', onChange: event => setSearch(event.target.value) })),
                h('label', null, 'Dekning i prosjektet', h('select', { className: 'input', value: coverage, onChange: event => setCoverage(event.target.value) },
                    h('option', { value: '' }, 'Alle oppføringer'), h('option', { value: 'missing' }, 'Mangler'), h('option', { value: 'partial' }, 'Delvis dekket')))),
            h('p', { role: 'status' }, `${matches.length} av ${REGISTER_CATALOG.length} oppføringer`)),
        h('div', { className: 'register-grid' }, matches.map(item => h('article', { className: 'card register-card', key: item.id },
            h('span', { className: 'register-status' }, item.coverage === 'partial' ? 'Delvis dekket' : 'Mangler integrasjon'),
            h('h2', null, item.title), h('p', null, item.description),
            h('p', null, h('strong', null, 'Kilde: '), item.source),
            h('details', null, h('summary', null, 'Datagrunnlag og tilgang'),
                h('p', null, item.origin), h('p', null, h('strong', null, 'Tilgang: '), item.access),
                h('p', null, h('strong', null, 'Dekning: '), item.limitation)),
            h('ul', { className: 'register-links' }, item.links.map(([label, href]) => h('li', { key: label }, link(label, href))),
                h('li', null, link('Roaring: ' + item.roaringName, item.roaringUrl)))))),
        !matches.length && h('p', { className: 'card' }, 'Ingen treff. Prøv et annet søkeord eller velg alle oppføringer.'),
        h('p', { className: 'ssb-footer' }, 'Kildekartlegging kontrollert ' + REGISTER_REVIEWED + '. Tilgangsvilkår og leverandørdekning kan endres.')));
}
