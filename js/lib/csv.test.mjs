import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTableLabelsCSV } from './csv.mjs';

test('parser rader til { label, category } pr tableId', () => {
    const csv = 'source_id,tableId,title,label,category\n' +
        'FHI,12345,Tittel,"Regneferdighet, 5. trinn",Skole\n';
    const result = parseTableLabelsCSV(csv);
    assert.deepEqual(result['12345'], { label: 'Regneferdighet, 5. trinn', category: 'Skole' });
});

test('hopper over rader uten tableId eller label', () => {
    const csv = 'source_id,tableId,title,label,category\n,,,,\n';
    assert.deepEqual(parseTableLabelsCSV(csv), {});
});

test('returnerer tomt objekt for CSV uten data-linjer', () => {
    assert.deepEqual(parseTableLabelsCSV('header-only-linje'), {});
});
