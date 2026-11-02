import {
    SUBJECT_GROUPS, loadSSBCatalog, filterCatalog, topicChildren,
    sortCatalog, recentTableGroups, osloDate, FREQUENCIES
} from '../lib/ssbCatalog.mjs';

const { createElement: h, useState, useEffect, useMemo } = React;
const number = value => value.toLocaleString('nb-NO');
const title = table => table.label.replace(new RegExp('^' + table.id + ':\\s*'), '');
const dateLabel = date => new Date(date + 'T12:00:00Z').toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Oslo' });

function SubjectIcon({ name }) {
    const shapes = {
        work: ['M4 7h16v13H4z', 'M8 7V4h8v3', 'M4 12h16', 'M10 12v3h4v-3'],
        people: ['M15 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2', 'M17 4a4 4 0 0 1 0 8', 'M21 20v-2a4 4 0 0 0-3-3.87', 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
        health: ['M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 4 1 9 8 15 7-6 12-11 8-15', 'M7 11h3l2-3 2 6 2-3h3'],
        nature: ['M12 21v-9', 'M12 15C3 16 2 8 3 3c8 0 11 5 9 12', 'M12 17c7 1 10-4 9-9-6 0-9 4-9 9'],
        industry: ['M3 21V10l6 3V7l6 4V3h5v18z', 'M7 17v1', 'M12 17v1', 'M17 17v1'],
        economy: ['M3 10h18', 'M4 21h16', 'M5 10v11', 'M10 10v11', 'M15 10v11', 'M20 10v11', 'M2 7l10-5 10 5z']
    };
    return h('svg', { width: 25, height: 25, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        (shapes[name] || shapes.economy).map((d, i) => h('path', { key: i, d })));
}

function TableResult({ table, onOpen, disabled }) {
    return h('button', { type: 'button', className: 'ssb-table-result', disabled, onClick: () => onOpen(table.id) },
        h('span', { className: 'ssb-table-id' }, table.id),
        h('span', null,
            h('strong', null, title(table)),
            h('span', { className: 'ssb-table-meta' }, table.firstPeriod + '–' + table.lastPeriod + ' · Oppdatert ' + (osloDate(table.updated) ? dateLabel(osloDate(table.updated)) : 'ukjent')),
            h('span', { className: 'ssb-table-meta' }, (table.paths?.[0] || []).map(item => item.label).join(' / ')),
            h('span', { className: 'ssb-table-meta' }, (table.variableNames || []).join(' · ')),
            h('span', { className: 'ssb-table-badges' },
                h('span', null, FREQUENCIES[table.timeUnit] || 'Ukjent frekvens'),
                h('span', null, (table.variableNames?.length || 0) + ' variabler')),
            table.discontinued && h('span', { className: 'ssb-closed-tag' }, 'Avsluttet tabell')),
        h('span', { 'aria-hidden': true }, '→'));
}

export function SSBTableExplorer({ onOpen, disabled, headingRef }) {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [catalogInfo, setCatalogInfo] = useState(null);
    const [search, setSearch] = useState('');
    const [path, setPath] = useState([]);
    const [all, setAll] = useState(false);
    const [includeDiscontinued, setIncludeDiscontinued] = useState(false);
    const [sort, setSort] = useState('relevance');
    const [since, setSince] = useState('');
    const [frequency, setFrequency] = useState('');
    const [smart, setSmart] = useState(false);
    const [page, setPage] = useState(1);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const pageSize = 20;

    useEffect(() => {
        let disposed = false;
        setLoading(true); setLoadError('');
        loadSSBCatalog({ refresh: attempt > 0 }).then(data => {
            if (!disposed) { setCatalog(data.tables); setCatalogInfo(data); }
        }).catch(() => {
            if (!disposed) setLoadError('Kunne ikke hente tabelloversikten fra SSB. Prøv igjen, eller åpne en tabell direkte med et femsifret tabellnummer.');
        }).finally(() => { if (!disposed) setLoading(false); });
        return () => { disposed = true; };
    }, [attempt]);

    const included = useMemo(() => filterCatalog(catalog, { includeDiscontinued }), [catalog, includeDiscontinued]);
    const searchMatches = useMemo(() => filterCatalog(catalog, { term: search, includeDiscontinued, since, smart }), [catalog, search, includeDiscontinued, since, smart]);
    const matched = useMemo(() => filterCatalog(searchMatches, { includeDiscontinued: true, frequency }), [searchMatches, frequency]);
    const frequencyCounts = useMemo(() => filterCatalog(searchMatches, { path, includeDiscontinued: true }).reduce((counts, table) => {
        counts[table.timeUnit] = (counts[table.timeUnit] || 0) + 1;
        return counts;
    }, {}), [searchMatches, path]);
    const roots = useMemo(() => topicChildren(included), [included]);
    const rootMap = useMemo(() => new Map(roots.map(node => [node.id, node])), [roots]);
    const children = useMemo(() => topicChildren(matched, path), [matched, path]);
    const filtered = useMemo(() => sortCatalog(filterCatalog(matched, { path, includeDiscontinued: true }), sort, search), [matched, path, sort, search]);
    const recent = useMemo(() => recentTableGroups(included), [included]);
    const showingResults = all || Boolean(search.trim()) || Boolean(path.length) || Boolean(since) || Boolean(frequency);
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);

    function choosePath(next) { setPath(next); setPage(1); setAll(true); }
    function reset() { setSearch(''); setPath([]); setAll(false); setSince(''); setFrequency(''); setPage(1); }
    function searchSubmit(event) {
        event.preventDefault();
        if (/^\d{5}$/.test(search.trim())) onOpen(search.trim());
        else { setAll(true); setPage(1); }
    }

    const browseButton = (node, parent = []) => h('button', {
        type: 'button', key: node.id, disabled, onClick: () => choosePath([...parent, node]),
        className: 'ssb-topic-link', 'aria-current': path.length === 1 && path[0].id === node.id ? 'page' : undefined
    }, h('span', null, node.label), h('span', { className: 'ssb-topic-count' }, number(node.count)));

    return h('section', { className: 'ssb-explorer' },
        h('div', { className: 'card ssb-discovery-search' },
            h('div', { className: 'ssb-discovery-heading' },
                h('div', null, h('h2', { tabIndex: -1, ref: headingRef }, 'Finn en tabell'),
                    h('p', { className: 'text-gray-600' }, 'Søk på tvers av emner, eller utforsk statistikken nedenfor.')),
                !loading && !loadError && h('span', { className: 'ssb-catalog-size' }, number(included.length) + ' SSB-tabeller')),
            h('form', { onSubmit: searchSubmit },
                h('label', { htmlFor: 'ssb-search' }, 'Tema, nøkkelord eller tabellnummer'),
                h('div', { className: 'ssb-search-row' },
                    h('input', { id: 'ssb-search', className: 'input', type: 'search', placeholder: 'Søk etter tabeller, emner og variabler …', value: search,
                        onChange: event => { setSearch(event.target.value); setPage(1); } }),
                    h('button', { type: 'submit', className: 'btn btn-primary', disabled }, 'Søk i SSB')),
                h('p', { className: 'ssb-search-help' }, 'Søk i tabelltitler, variabelnavn og emner. Et femsifret tabellnummer åpner tabellen direkte.')),
            h('div', { className: 'ssb-discovery-options' },
                h('label', { className: 'ssb-checkbox' }, h('input', { type: 'checkbox', checked: includeDiscontinued,
                    onChange: event => { setIncludeDiscontinued(event.target.checked); setPage(1); } }), 'Ta med avsluttede tabeller'),
                h('label', { className: 'ssb-checkbox', title: 'Utvid søket med synonymer, for eksempel BNP, KPI og VGS.' },
                    h('input', { type: 'checkbox', checked: smart, onChange: event => { setSmart(event.target.checked); setPage(1); } }), 'Smart søk · forkortelser og synonymer'),
                h('button', { className: 'ssb-text-button', type: 'button', disabled, onClick: () => { reset(); setAll(true); } }, 'Se alle tabeller →')),
            catalogInfo && h('div', { className: 'ssb-catalog-status' },
                h('span', null, 'Tabelloversikt fra ' + new Date(catalogInfo.savedAt).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', dateStyle: 'short', timeStyle: 'short' })),
                h('button', { className: 'ssb-text-button', type: 'button', disabled: disabled || loading, onClick: () => setAttempt(prev => prev + 1) }, 'Oppdater oversikt'))),
        loading && h('p', { className: 'ssb-message', role: 'status' }, 'Henter emner og tabelloversikt fra SSB …'),
        !loading && catalogInfo?.stale && h('p', { className: 'ssb-message', role: 'status' }, 'Kunne ikke oppdatere oversikten fra SSB. Viser sist lagrede oversikt. Prøv «Oppdater oversikt» senere.'),
        loadError && h('div', { className: 'ssb-message ssb-error', role: 'alert' }, loadError,
            h('button', { type: 'button', className: 'btn btn-outline', onClick: () => setAttempt(prev => prev + 1) }, 'Prøv igjen')),
        !showingResults && !loading && !loadError && h(React.Fragment, null,
            h('div', { className: 'ssb-section-heading' }, h('h2', null, 'Utforsk etter emne'),
                h('p', { className: 'text-sm text-gray-600' }, 'Velg et emne for å se underemner og tabeller.')),
            h('div', { className: 'ssb-subject-grid' }, SUBJECT_GROUPS.map(group => h('section', { key: group.title, className: 'ssb-subject-card' },
                h('div', { className: 'ssb-subject-card-heading' }, h(SubjectIcon, { name: group.icon }), h('h3', null, group.title)),
                group.codes.map(code => rootMap.has(code) ? browseButton(rootMap.get(code)) : null)))),
            roots.filter(root => !SUBJECT_GROUPS.some(group => group.codes.includes(root.id))).length > 0 &&
                h('div', { className: 'ssb-subtopics' }, roots.filter(root => !SUBJECT_GROUPS.some(group => group.codes.includes(root.id))).map(root => browseButton(root))),
            h('section', { className: 'ssb-updates' },
                h('div', { className: 'ssb-section-heading' }, h('h2', null, 'Nylig oppdaterte tabeller'),
                    h('p', { className: 'text-sm text-gray-600' }, 'Siste publiseringsdager i SSBs tabelloversikt.')),
                recent.map(day => h('div', { className: 'ssb-update-day', key: day.date },
                    h('div', { className: 'ssb-update-date' }, h('h3', null, day.date === osloDate(new Date()) ? 'Oppdatert i dag' : dateLabel(day.date)),
                        h('span', null, number(day.count) + ' tabeller')),
                    h('div', { className: 'ssb-update-topics' }, day.topics.map(topic => h('details', { key: topic.label, className: 'ssb-update-topic' },
                        h('summary', null, h('span', null, topic.label), h('span', { className: 'ssb-topic-count' }, number(topic.tables.length) + ' tabeller')),
                        topic.tables.map(table => h(TableResult, { key: table.id, table, onOpen, disabled }))))))))),
        showingResults && h('div', { className: 'ssb-discovery-layout' },
            h('aside', { className: 'ssb-subject-sidebar', 'aria-label': 'Filtrer tabeller etter emne' },
                h('button', { type: 'button', className: 'ssb-filter-toggle', 'aria-expanded': filtersOpen, 'aria-controls': 'ssb-topic-navigation', onClick: () => setFiltersOpen(prev => !prev) }, 'Emner og underemner'),
                h('div', { id: 'ssb-topic-navigation', className: filtersOpen ? 'ssb-topic-navigation expanded' : 'ssb-topic-navigation' },
                    h('h3', null, 'Bla i emner'),
                    h('button', { className: 'ssb-text-button', type: 'button', onClick: () => choosePath([]), disabled }, 'Alle emner'),
                    roots.map(root => h('div', { key: root.id, className: 'ssb-sidebar-topic' }, browseButton(root),
                        path[0]?.id === root.id && h('div', { className: 'ssb-sidebar-subtopics' },
                            topicChildren(included, [root]).map(node => h('button', {
                                type: 'button', key: node.id, className: 'ssb-topic-link', disabled,
                                'aria-current': path[1]?.id === node.id ? 'page' : undefined,
                                onClick: () => choosePath([root, node])
                            }, h('span', null, node.label), h('span', { className: 'ssb-topic-count' }, number(node.count))))))))),
            h('div', { className: 'ssb-discovery-main card' },
                h('nav', { className: 'ssb-breadcrumbs', 'aria-label': 'Valgt SSB-emne' },
                    h('button', { type: 'button', onClick: reset, disabled }, 'Emneoversikt'),
                    path.map((node, i) => h(React.Fragment, { key: node.id }, h('span', { 'aria-hidden': true }, '/'),
                        h('button', { type: 'button', onClick: () => choosePath(path.slice(0, i + 1)), disabled, 'aria-current': i === path.length - 1 ? 'page' : undefined }, node.label)))),
                h('div', { className: 'ssb-results-heading' },
                    h('h2', null, path.at(-1)?.label || (search.trim() ? 'Søkeresultater' : 'Alle tabeller')),
                    h('span', { className: 'ssb-count', role: 'status' }, number(filtered.length) + ' tabeller')),
                search.trim() && h('p', { className: 'text-sm text-gray-600' }, 'Treff for «' + search.trim() + '»' + (path.length ? ' innen valgt emne' : '')),
                path.length > 0 && children.length > 0 && h('section', { className: 'ssb-subtopic-section', 'aria-label': 'Underemner' },
                    h('h3', null, 'Underemner'), h('div', { className: 'ssb-subtopics' }, children.map(node => browseButton(node, path)))),
                h('div', { className: 'ssb-results-filters' },
                    h('label', null, 'Frekvens', h('select', { className: 'input', 'aria-label': 'Frekvens', value: frequency, onChange: event => { setFrequency(event.target.value); setPage(1); } },
                        h('option', { value: '' }, 'Alle frekvenser'),
                        Object.entries(FREQUENCIES).map(([key, label]) => h('option', { key, value: key }, label + ' (' + number(frequencyCounts[key] || 0) + ')')))),
                    h('label', null, 'Sorter etter', h('select', { className: 'input', value: sort, onChange: event => { setSort(event.target.value); setPage(1); } },
                        h('option', { value: 'relevance' }, 'Relevans'), h('option', { value: 'updated' }, 'Sist oppdatert'), h('option', { value: 'title' }, 'Tittel A–Å'))),
                    h('label', null, 'Oppdateringsdato', h('select', { className: 'input', value: since, onChange: event => { setSince(event.target.value); setPage(1); } },
                        h('option', { value: '' }, 'Alle datoer'),
                        [7, 30, 365].map(days => h('option', { key: days, value: osloDate(new Date(Date.now() - days * 86400000)) }, 'Siste ' + days + ' dager')))),
                    h('button', { type: 'button', className: 'ssb-text-button', onClick: reset, disabled }, 'Nullstill søk og emne')),
                !loading && !filtered.length && h('div', { className: 'ssb-empty-state' }, h('h3', null, 'Ingen tabeller passer til utvalget'),
                    h('p', null, 'Prøv færre søkeord, et annet emne eller ta med avsluttede tabeller.')),
                filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(table => h(TableResult, { key: table.id, table, onOpen, disabled })),
                pageCount > 1 && h('div', { className: 'ssb-pagination ssb-actions' },
                    h('button', { type: 'button', className: 'btn btn-outline', disabled: disabled || currentPage === 1, onClick: () => setPage(prev => prev - 1) }, 'Forrige side'),
                    h('span', null, 'Side ' + currentPage + ' av ' + pageCount),
                    h('button', { type: 'button', className: 'btn btn-outline', disabled: disabled || currentPage === pageCount, onClick: () => setPage(prev => prev + 1) }, 'Neste side'))))
    );
}
