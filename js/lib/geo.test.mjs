import test from 'node:test';
import assert from 'node:assert/strict';
import { getGeographyGroups } from './geo.mjs';

function makeGeoDimension() {
    return {
        code: 'GEO',
        category: {
            index: ['03', '0301', '030101'],
            label: { '03': 'Viken', '0301': 'Oslo', '030101': 'Gamle Oslo' }
        }
    };
}

test('returnerer null for ikke-GEO-dimensjoner', () => {
    assert.equal(getGeographyGroups({ code: 'AAR' }), null);
});

test('grupperer koder etter lengde (fylke/kommune/bydel)', () => {
    const result = getGeographyGroups(makeGeoDimension());
    assert.deepEqual(result.counties.map((c) => c.code), ['03']);
    assert.deepEqual(result.municipalities.map((m) => m.code), ['0301']);
    assert.deepEqual(result.districts.map((d) => d.code), ['030101']);
});

test('bygger hierarki fylke -> kommune -> bydel', () => {
    const result = getGeographyGroups(makeGeoDimension());
    assert.deepEqual(result.hierarchy['03'].municipalities.map((m) => m.code), ['0301']);
    assert.deepEqual(result.hierarchy['03'].districts['0301'].map((d) => d.code), ['030101']);
});
