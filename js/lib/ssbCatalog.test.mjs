import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareCatalog, filterCatalog, topicChildren, sortCatalog, recentTableGroups, osloDate } from './ssbCatalog.mjs';

const be = { id: 'be', label: 'Befolkning', sortCode: '2' };
const he = { id: 'he', label: 'Helse', sortCode: '1' };
const count = { id: 'count', label: 'Folketall' };
const health = { id: 'health', label: 'Helsetilstand' };
const tables = prepareCatalog([
    { id: '07459', label: '07459: Befolkning etter alder', updated: '2026-10-31T23:30:00Z', variableNames: ['region', 'alder'], paths: [[be, count], [be, { id: 'other', label: 'Barn' }], [he, health]] },
    { id: '01000', label: '01000: Folketall i kommuner', updated: '2026-10-30T08:00:00Z', variableNames: ['kjønn'], paths: [[be, count]], discontinued: true },
    { id: '02000', label: '02000: Helse i kommuner', updated: '2026-10-31T23:30:00Z', variableNames: ['region'], paths: [[he, health]] },
    { id: '03000', label: '03000: Helsepersonell', updated: '2026-10-29T08:00:00Z', variableNames: ['år'], paths: [[he, { id: 'staff', label: 'Personell' }]] },
    { id: '04000', label: '04000: Arkiv', updated: '2026-10-28T08:00:00Z', paths: [] },
    { id: '05000', label: '05000: Arkiv', updated: '2026-10-27T08:00:00Z', paths: [] }
]);

test('catalog search finds IDs, titles, variables and subjects with multiple words', () => {
    assert.deepEqual(filterCatalog(tables, { term: '07459' }).map(row => row.id), ['07459']);
    assert.deepEqual(filterCatalog(tables, { term: 'BEFOLKNING region' }).map(row => row.id), ['07459']);
    assert.deepEqual(filterCatalog(tables, { term: 'helsetilstand region' }).map(row => row.id), ['07459', '02000']);
    assert.equal(filterCatalog(tables, { term: 'not-found' }).length, 0);
    assert.equal(filterCatalog(tables, { includeDiscontinued: true }).length, 6);
    assert.equal(filterCatalog(tables).length, 5);
});

test('topic counts deduplicate tables with multiple paths in the same subject', () => {
    assert.deepEqual(topicChildren(tables).map(node => [node.id, node.count]), [['he', 3], ['be', 2]]);
    const children = topicChildren(tables, [be]);
    assert.equal(children.find(node => node.id === 'count').count, 2);
    assert.equal(children.find(node => node.id === 'other').count, 1);
    assert.equal(filterCatalog(tables, { path: [be, count] }).length, 1);
    assert.equal(filterCatalog(tables, { path: [he, count], includeDiscontinued: true }).length, 0);
});

test('catalog date filtering uses Norwegian calendar dates and sort does not mutate input', () => {
    assert.equal(osloDate('2026-10-31T23:30:00Z'), '2026-11-01');
    assert.equal(osloDate('invalid'), '');
    assert.deepEqual(filterCatalog(tables, { since: '2026-11-01' }).map(row => row.id), ['07459', '02000']);
    const original = tables.map(row => row.id);
    assert.equal(sortCatalog(tables, 'relevance', '01000')[0].id, '01000');
    assert.equal(sortCatalog(tables, 'updated')[0].updated, '2026-10-31T23:30:00Z');
    assert.deepEqual(tables.map(row => row.id), original);
});

test('recent publications show three latest dates with one entry per table', () => {
    const groups = recentTableGroups(tables);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].date, '2026-11-01');
    assert.equal(groups[0].count, 2);
    assert.equal(groups[0].topics.flatMap(topic => topic.tables).length, 2);
    assert.equal(groups.at(-1).date, '2026-10-29');
});

test('smart search expands abbreviations without broadening normal search', () => {
    const data = prepareCatalog([
        { id: '10000', label: 'Bruttonasjonalprodukt etter næring', variableNames: ['år'], paths: [], timeUnit: 'Annual' },
        { id: '10001', label: 'Konsumprisindeks', variableNames: ['måned'], paths: [], timeUnit: 'Monthly' },
        { id: '10002', label: 'Videregående opplæring i Tromsø', variableNames: ['skole'], paths: [], timeUnit: 'Annual' }
    ]);
    assert.equal(filterCatalog(data, { term: 'BNP' }).length, 0);
    assert.equal(filterCatalog(data, { term: 'BNP', smart: true })[0].id, '10000');
    assert.equal(filterCatalog(data, { term: 'KPI', smart: true })[0].id, '10001');
    assert.equal(filterCatalog(data, { term: 'VGS tromso', smart: true })[0].id, '10002');
    assert.equal(filterCatalog(data, { term: 'vgs ukjent', smart: true }).length, 0);
    assert.equal(filterCatalog(data, { frequency: 'Monthly' })[0].id, '10001');
    assert.equal(filterCatalog(data, { term: 'BNP', smart: true, frequency: 'Monthly' }).length, 0);
});
