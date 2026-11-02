import { SSB_BASE, fetchSSB } from './ssb.mjs';

// Broad subject groups follow the grouping used by SSB and Statistikkportalen.
export const SUBJECT_GROUPS = [
    { title: 'Arbeid, lønn og utdanning', codes: ['al', 'if', 'ud'], icon: 'work' },
    { title: 'Befolkning og bolig', codes: ['be', 'bb', 'in'], icon: 'people' },
    { title: 'Helse og samfunn', codes: ['he', 'kf', 'sk', 'sv', 'va'], icon: 'health' },
    { title: 'Miljø og transport', codes: ['nm', 'tr'], icon: 'nature' },
    { title: 'Næringsliv og teknologi', codes: ['ei', 'js', 'ti', 'vt', 'vf'], icon: 'industry' },
    { title: 'Økonomi', codes: ['bf', 'nk', 'os', 'pp', 'ut'], icon: 'economy' }
];

const normalize = value => String(value ?? '').toLocaleLowerCase('nb-NO').normalize('NFKC');
let catalogPromise;

export function prepareCatalog(tables) {
    return tables.map(table => ({
        ...table,
        searchText: normalize([table.id, table.label, ...(table.variableNames || []),
            ...(table.paths || []).flatMap(path => path.map(node => node.label))].join(' '))
    }));
}

export function loadSSBCatalog() {
    if (!catalogPromise) {
        catalogPromise = (async () => {
            const params = new URLSearchParams({ lang: 'no', includeDiscontinued: 'true', pageSize: '10000', pageNumber: '1' });
            const first = await fetchSSB(SSB_BASE + '/tables?' + params, { signal: AbortSignal.timeout(60000) });
            let tables = first.tables;
            // Honor pagination if SSB changes its page-size limit or the catalogue grows.
            for (let page = 2; page <= first.page.totalPages; page++) {
                params.set('pageNumber', String(page));
                const next = await fetchSSB(SSB_BASE + '/tables?' + params, { signal: AbortSignal.timeout(60000) });
                tables = tables.concat(next.tables);
            }
            return prepareCatalog(tables);
        })().catch(error => { catalogPromise = null; throw error; });
    }
    return catalogPromise;
}

export function matchesPath(table, selection) {
    return !selection.length || (table.paths || []).some(path =>
        selection.every((node, index) => path[index]?.id === node.id));
}

export function filterCatalog(tables, { term = '', path = [], includeDiscontinued = false, since = '' } = {}) {
    const words = normalize(term).trim().split(/\s+/).filter(Boolean);
    return tables.filter(table =>
        (includeDiscontinued || !table.discontinued) && matchesPath(table, path) &&
        (!since || osloDate(table.updated) >= since) &&
        words.every(word => table.searchText.includes(word)));
}

export function topicChildren(tables, parent = []) {
    const nodes = new Map();
    for (const table of tables) {
        const counted = new Set();
        for (const path of table.paths || []) {
            if (!parent.every((node, index) => path[index]?.id === node.id)) continue;
            const child = path[parent.length];
            if (!child || counted.has(child.id)) continue;
            counted.add(child.id);
            const node = nodes.get(child.id) || { ...child, count: 0 };
            node.count++;
            nodes.set(child.id, node);
        }
    }
    return [...nodes.values()].sort((a, b) => (a.sortCode || '').localeCompare(b.sortCode || '') || a.label.localeCompare(b.label, 'nb'));
}

export function sortCatalog(tables, sort, term = '') {
    const needle = normalize(term).trim();
    const rank = table => table.id === needle ? 3 : normalize(table.label).includes(needle) ? 2 : 1;
    return [...tables].sort((a, b) => {
        if (sort === 'title') return a.label.localeCompare(b.label, 'nb', { numeric: true });
        if (sort === 'relevance' && needle) {
            const difference = rank(b) - rank(a);
            if (difference) return difference;
        }
        return (b.updated || '').localeCompare(a.updated || '') || a.id.localeCompare(b.id);
    });
}

export function osloDate(value) {
    if (!value || Number.isNaN(new Date(value).getTime())) return '';
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

export function recentTableGroups(tables) {
    const days = new Map();
    for (const table of sortCatalog(tables, 'updated')) {
        const date = osloDate(table.updated);
        if (!date) continue;
        if (!days.has(date)) {
            if (days.size === 3) break;
            days.set(date, []);
        }
        days.get(date).push(table);
    }
    return [...days].map(([date, rows]) => {
        const topics = new Map();
        for (const table of rows) {
            const path = table.paths?.[0] || [];
            const node = path[Math.max(0, path.length - 2)];
            const key = node?.id || 'other';
            if (!topics.has(key)) topics.set(key, { label: node?.label || 'Andre tabeller', tables: [] });
            topics.get(key).tables.push(table);
        }
        return { date, count: rows.length, topics: [...topics.values()] };
    });
}
