import { SSB_BASE, fetchSSB } from './ssb.mjs';
import { normalizeSearch as normalize, searchTerms } from './searchSynonyms.mjs';
import { CATALOG_CACHE_TTL, validCachedCatalog, freshCachedCatalog, readCatalogCache, writeCatalogCache } from './catalogCache.mjs';

// Broad subject groups follow the grouping used by SSB and Statistikkportalen.
export const SUBJECT_GROUPS = [
    { title: 'Arbeid, lønn og utdanning', codes: ['al', 'if', 'ud'], icon: 'work' },
    { title: 'Befolkning og bolig', codes: ['be', 'bb', 'in'], icon: 'people' },
    { title: 'Helse og samfunn', codes: ['he', 'kf', 'sk', 'sv', 'va'], icon: 'health' },
    { title: 'Miljø og transport', codes: ['nm', 'tr'], icon: 'nature' },
    { title: 'Næringsliv og teknologi', codes: ['ei', 'js', 'ti', 'vt', 'vf'], icon: 'industry' },
    { title: 'Økonomi', codes: ['bf', 'nk', 'os', 'pp', 'ut'], icon: 'economy' }
];

let catalogPromise;
let loadedAt = 0;
export const FREQUENCIES = { Annual: 'Årlig', Quarterly: 'Kvartalsvis', Monthly: 'Månedlig', Weekly: 'Ukentlig', Other: 'Andre perioder' };

export function prepareCatalog(tables) {
    return tables.map(table => ({
        ...table,
        searchText: normalize([table.id, table.label, ...(table.variableNames || []),
            ...(table.paths || []).flatMap(path => path.map(node => node.label))].join(' '))
    }));
}

export function loadSSBCatalog({ refresh = false } = {}) {
    if (refresh || (loadedAt && Date.now() - loadedAt >= CATALOG_CACHE_TTL)) { catalogPromise = null; loadedAt = 0; }
    if (!catalogPromise) {
        const pending = (async () => {
            const cached = await readCatalogCache();
            if (!refresh && freshCachedCatalog(cached)) {
                loadedAt = cached.savedAt;
                return { tables: prepareCatalog(cached.tables), savedAt: cached.savedAt, stale: false };
            }
            try {
            const params = new URLSearchParams({ lang: 'no', includeDiscontinued: 'true', pageSize: '10000', pageNumber: '1' });
            const first = await fetchSSB(SSB_BASE + '/tables?' + params, { signal: AbortSignal.timeout(60000) });
            let tables = first.tables;
            // Honor pagination if SSB changes its page-size limit or the catalogue grows.
            for (let page = 2; page <= first.page.totalPages; page++) {
                params.set('pageNumber', String(page));
                const next = await fetchSSB(SSB_BASE + '/tables?' + params, { signal: AbortSignal.timeout(60000) });
                tables = tables.concat(next.tables);
            }
            const compact = tables.map(({ id, label, updated, firstPeriod, lastPeriod, variableNames, paths, timeUnit, discontinued, sortCode }) =>
                ({ id, label: label || id, updated, firstPeriod, lastPeriod, variableNames, paths: paths || [], timeUnit, discontinued, sortCode }));
            if (!compact.length) throw new Error('SSB returnerte en tom tabelloversikt.');
            const record = { version: 1, savedAt: Date.now(), tables: compact };
            await writeCatalogCache(record);
            loadedAt = record.savedAt;
            return { tables: prepareCatalog(compact), savedAt: record.savedAt, stale: false };
            } catch (error) {
                if (!validCachedCatalog(cached)) throw error;
                // A saved catalogue can still be browsed while SSB is unavailable.
                loadedAt = 0;
                if (catalogPromise === pending) catalogPromise = null;
                return { tables: prepareCatalog(cached.tables), savedAt: cached.savedAt, stale: true };
            }
        })().catch(error => { if (catalogPromise === pending) catalogPromise = null; throw error; });
        catalogPromise = pending;
    }
    return catalogPromise;
}

export function matchesPath(table, selection) {
    return !selection.length || (table.paths || []).some(path =>
        selection.every((node, index) => path[index]?.id === node.id));
}

export function filterCatalog(tables, { term = '', path = [], includeDiscontinued = false, since = '', frequency = '', smart = false } = {}) {
    const words = searchTerms(term, smart);
    return tables.filter(table =>
        (includeDiscontinued || !table.discontinued) && matchesPath(table, path) &&
        (!since || osloDate(table.updated) >= since) &&
        (!frequency || table.timeUnit === frequency) &&
        words.every(variants => variants.some(word => table.searchText.includes(word))));
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
