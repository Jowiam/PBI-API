import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuery, findMetricDimension } from './query.mjs';

test('filter "item" bruker selectedCategories som values', () => {
    const query = buildQuery(
        [{ code: 'AAR' }],
        { AAR: { filter: 'item', selectedCategories: ['2024'] } },
        'json-stat2',
        ''
    );
    assert.deepEqual(query.dimensions, [{ code: 'AAR', filter: 'item', values: ['2024'] }]);
    assert.deepEqual(query.response, { format: 'json-stat2' });
});

test('filter "top" faller tilbake til topCount = "5"', () => {
    const query = buildQuery([{ code: 'AAR' }], { AAR: { filter: 'top' } }, 'json-stat2', '');
    assert.deepEqual(query.dimensions[0], { code: 'AAR', filter: 'top', values: ['5'] });
});

test('filter "all" uten values gir wildcard', () => {
    const query = buildQuery([{ code: 'GEO' }], { GEO: { filter: 'all', values: [] } }, 'json-stat2', '');
    assert.deepEqual(query.dimensions[0], { code: 'GEO', filter: 'all', values: ['*'] });
});

test('tomt maxRowCount utelates response.maxRowCount', () => {
    const query = buildQuery([], {}, 'json-stat2', '');
    assert.equal('maxRowCount' in query.response, false);
});

test('satt maxRowCount parses til tall', () => {
    const query = buildQuery([], {}, 'json-stat2', '100');
    assert.equal(query.response.maxRowCount, 100);
});

test('findMetricDimension finner ContentsCode når role mangler', () => {
    const previewData = {
        id: ['ContentsCode', 'GEO'],
        dimension: { ContentsCode: {}, GEO: {} }
    };
    assert.equal(findMetricDimension(previewData), 'ContentsCode');
});

test('findMetricDimension bruker role="metric" først', () => {
    const previewData = {
        id: ['GEO', 'MEASURE'],
        dimension: { GEO: {}, MEASURE: { role: 'metric' } }
    };
    assert.equal(findMetricDimension(previewData), 'MEASURE');
});
