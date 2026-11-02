import test from 'node:test';
import assert from 'node:assert/strict';
import { fhiRCode, ssbRCode, udirRCode, trafficRCode } from './rCode.mjs';

// Generated JSON string literals are valid in both R and JSON. Decode the
// payload to verify the API contract, including singleton arrays and escaping.
const literal = (script, variable) => {
    const value = script.slice(script.indexOf(variable + ' <- ') + variable.length + 4);
    if (!value.startsWith('paste0(')) return JSON.parse(value.split('\n')[0]);
    return value.slice('paste0(\n'.length, value.indexOf('\n)')).split('\n').map(line => JSON.parse(line.trim().replace(/,$/, ''))).join('');
};
const point = { id: '55092V1125799', name: 'Bru "A" \\ Tromsø\nNord', road: 'EV8', county: { name: 'Troms' }, municipality: { name: 'Tromsø' }, trafficType: 'VEHICLE' };
const options = { mode: 'hour', startDate: '2026-03-29', endDate: '2026-03-29', startYear: 2024, endYear: 2025 };

test('FHI R uses CSV without changing the query, singleton filters or row limit', () => {
    const query = { dimensions: [{ code: 'År', filter: 'item', values: ['2025'] }], response: { format: 'json-stat2', maxRowCount: 500 } };
    const original = structuredClone(query);
    const script = fhiRCode(query, 'https://example.no/api', 'abr', 588);
    assert.deepEqual(JSON.parse(literal(script, 'body')), { ...query, response: { format: 'csv2', maxRowCount: 500 } });
    assert.deepEqual(query, original);
    assert.equal(literal(script, 'url'), 'https://example.no/api/abr/Table/588/data');
    assert.equal(JSON.parse(literal(fhiRCode({ ...query, response: { format: 'csv3' } }, 'https://example.no', 'abr', 588), 'body')).response.format, 'csv3');
});

test('SSB R keeps dynamic periods and puts all dimensions into rows, including POST placement', () => {
    const query = { selection: [{ variableCode: 'Tid', valueCodes: ['top(3)'] }, { variableCode: 'Region', valueCodes: ['0301'] }] };
    const original = structuredClone(query);
    const script = ssbRCode('07459', query, [{ code: 'Tid' }, { code: 'Region' }], true);
    const body = JSON.parse(literal(script, 'body'));
    assert.deepEqual(body.selection, query.selection);
    assert.deepEqual(body.placement, { stub: ['Tid', 'Region'], heading: [] });
    assert.deepEqual(query, original);
    const url = new URL(literal(script, 'url'));
    assert.equal(url.searchParams.get('outputFormat'), 'csv');
    assert.match(url.searchParams.get('outputFormatParams'), /UseCodesAndTexts/);
    assert.match(script, /colClasses = "character"/); // Preserve leading zeroes.
    assert.doesNotMatch(script, /function\s*\(|requireNamespace|req_retry|stop\(|message\(|print\(|_tall|jsonlite/);
});

test('Udir R keeps filters intact and implements complete retrieval with optional numeric fields', () => {
    const filter = 'TidID(202512)_EnhetID(-47)';
    const script = udirRCode(152, filter);
    assert.equal(literal(script, 'filter'), filter);
    assert.equal(literal(script, 'base_url'), 'https://api.statistikkbanken.udir.no/api/rest/v2/Eksport/152/');
    assert.match(script, /seq_len\(page_count\)/);
    assert.match(script, /length\(rows\) != expected_rows/);
    assert.match(script, /value_columns <- grep/);
    assert.doesNotMatch(udirRCode(152, filter, false), /value_columns <- grep/);
    assert.throws(() => udirRCode('../152', filter), /Ugyldig/);
});

test('Vegvesen R retains every station and safely escapes station names', () => {
    const points = Array.from({ length: 65 }, (_, index) => ({ ...point, id: 'station' + index }));
    const script = trafficRCode(points, options);
    const ids = [...script.matchAll(/^    id = (".*"),$/gm)].map(match => JSON.parse(match[1]));
    const names = [...script.matchAll(/^    name = (".*"),$/gm)].map(match => JSON.parse(match[1]));
    assert.equal(ids.length, 65);
    assert.equal(names[0], point.name);
    assert.equal(ids[64], 'station64');
    assert.ok(script.split('\n').every(line => Buffer.byteLength(line, 'utf8') < 4094));
    assert.equal(literal(script, 'from'), '2026-03-29T00:00:00+01:00');
    assert.equal(literal(script, 'to'), '2026-03-30T00:00:00+02:00');
    assert.match(script, /cursor <- page\$pageInfo\$endCursor/);
    assert.match(script, /response\$errors/);
    assert.match(script, /Europe\/Oslo/);
    assert.doesNotMatch(script, /requireNamespace|req_retry|perform_request|rows_to_df|get_json|parse_number|message\(|print\(/);
});

test('Vegvesen R uses the selected resolution and year interval and rejects invalid selections', () => {
    assert.match(literal(trafficRCode([point], { ...options, mode: 'day' }), 'query_text'), /byDay/);
    const monthly = trafficRCode([point], { ...options, mode: 'monthly' });
    assert.match(literal(monthly, 'query_text'), /byMonth/);
    assert.match(monthly, /years <- seq.int\(2024, 2025\)/);
    const annual = trafficRCode([point], { ...options, mode: 'adt' });
    assert.match(literal(annual, 'query_text'), /byYear/);
    assert.match(annual, /row\$year >= 2024 && row\$year <= 2025/);
    assert.throws(() => trafficRCode([], options), /målestasjon/);
    assert.throws(() => trafficRCode([point], { ...options, endDate: '2026-03-28' }), /Til-dato/);
});
