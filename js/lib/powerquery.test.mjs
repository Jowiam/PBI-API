import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePowerQueryCode } from './powerquery.mjs';

test('returnerer tom streng uten finalQuery', () => {
    assert.equal(generatePowerQueryCode(null, 'https://api', 'src', 'tbl'), '');
});

test('genererer gyldig Power Query M-kode med riktig URL', () => {
    const code = generatePowerQueryCode({ dimensions: [] }, 'https://api', 'src1', 'tbl1');
    assert.match(code, /url="https:\/\/api\/src1\/Table\/tbl1\/data"/);
    assert.match(code, /WebCall = Web\.Contents\(url,/);
});

const bodyFromCode = code => JSON.parse(code.match(/jsonBody= "((?:[^"]|"")*)",\n/)[1].replace(/""/g, '"').replace(/#\(#\)/g, '#'));

test('Power Query requests CSV even when the UI query requests JSON, keeping selections and limits', () => {
    const query = { dimensions: [{ code: 'GEO', filter: 'item', values: ['03', '0301'] }], response: { format: 'json-stat2', maxRowCount: 50000 } };
    const original = structuredClone(query);
    const code = generatePowerQueryCode(query, 'https://api', 'nokkel', 787);
    assert.deepEqual(bodyFromCode(code), { ...query, response: { format: 'csv2', maxRowCount: 50000 } });
    assert.deepEqual(query, original);
    assert.match(code, /Csv.Document\(WebCall, \[Delimiter=";", Encoding=65001, QuoteStyle=QuoteStyle.Csv\]\)/);
    assert.doesNotMatch(code, /Lines.FromBinary|Splitter.SplitTextByDelimiter/);
    assert.match(code, /Text.ToBinary\(jsonBody, TextEncoding.Utf8\)/);
});

test('Power Query preserves CSV3 and safely embeds quotes and M escape sequences in filter values', () => {
    const query = { dimensions: [{ code: 'X', filter: 'item', values: ['a"b', '#(lf)', 'æøå'] }], response: { format: 'csv3' } };
    const code = generatePowerQueryCode(query, 'https://api', 'src', 1);
    assert.deepEqual(bodyFromCode(code), query);
    assert.match(code, /#\(#\)\(lf\)/);
    assert.equal(bodyFromCode(generatePowerQueryCode({ dimensions: [] }, 'https://api', 'src', 1)).response.format, 'csv2');
});
