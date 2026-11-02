import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calendarDate, addDays, osloMidnight, validateTrafficOptions, trafficRequest, trafficPowerQuery } from './vegvesen.mjs';

const point = { id: '55092V1125799', name: 'Breivika', road: 'EV8', county: { name: 'Troms' }, municipality: { name: 'Tromsø' }, trafficType: 'VEHICLE' };
const options = { mode: 'hour', startDate: '2025-01-01', endDate: '2025-01-07', startYear: 2024, endYear: 2025 };

test('Norwegian date bounds include the final day and handle 23/25 hour DST days', () => {
    assert.equal(osloMidnight('2026-03-29'), '2026-03-29T00:00:00+01:00');
    assert.equal(osloMidnight('2026-03-30'), '2026-03-30T00:00:00+02:00');
    const spring = trafficRequest(point, { ...options, startDate: '2026-03-29', endDate: '2026-03-29' }).variables;
    assert.equal((Date.parse(spring.to) - Date.parse(spring.from)) / 3600000, 23);
    const fall = trafficRequest(point, { ...options, startDate: '2026-10-25', endDate: '2026-10-25' }).variables;
    assert.equal((Date.parse(fall.to) - Date.parse(fall.from)) / 3600000, 25);
    assert.equal(addDays('2024-02-28', 1), '2024-02-29');
    assert.throws(() => calendarDate('2025-02-29'), /gyldig dato/);
});

test('traffic queries use typed GraphQL variables and pageInfo for complete interval retrieval', () => {
    const request = trafficRequest(point, options);
    assert.equal(request.variables.pointId, point.id);
    assert.equal(request.variables.to, '2025-01-08T00:00:00+01:00');
    assert.equal(request.variables.after, null);
    assert.match(request.query, /intervals: byHour/);
    assert.match(request.query, /first: 100, after: \$after/);
    assert.match(request.query, /hasNextPage endCursor/);
    assert.match(trafficRequest(point, { ...options, mode: 'day' }).query, /intervals: byDay/);
    const monthly = trafficRequest(point, { ...options, mode: 'monthly' });
    assert.equal(monthly.variables.year, 2024);
    assert.match(monthly.query, /rows: byMonth/);
    assert.match(trafficRequest(point, { ...options, mode: 'adt' }).query, /rows: byYear/);
});

test('traffic selection rejects invalid dates, years, duplicate points and unknown resolutions', () => {
    assert.throws(() => validateTrafficOptions([], options), /målestasjoner/);
    assert.throws(() => validateTrafficOptions([point, point], options), /flere ganger/);
    assert.throws(() => validateTrafficOptions([point], { ...options, startDate: '2025-01-10' }), /Til-dato/);
    assert.throws(() => validateTrafficOptions([point], { ...options, mode: 'nope' }), /datatype/);
    assert.throws(() => validateTrafficOptions([point], { ...options, mode: 'adt', startYear: 2026, endYear: 2025 }), /årsintervall/);
});

test('traffic M code follows all cursors, rejects GraphQL errors and preserves quality metrics and nulls', () => {
    const code = trafficPowerQuery([point], options);
    assert.match(code, /List.Generate/);
    assert.match(code, /ReadPage\(\[Page\]\[pageInfo\]\[endCursor\]\)/);
    assert.match(code, /Info\[endCursor\] = Cursor/);
    assert.match(code, /Record.FieldOrDefault\(Response, "errors"/);
    assert.match(code, /Dekningsgrad_prosent = try Node\[total\]\[coverage\]\[percentage\] otherwise null/);
    assert.match(code, /type datetimezone/);
    const annual = trafficPowerQuery([point], { ...options, mode: 'adt' });
    assert.match(annual, /_\[year\] >= 2024 and _\[year\] <= 2025/);
    assert.match(annual, /confidenceInterval/);
    const monthly = trafficPowerQuery([point], { ...options, mode: 'monthly' });
    assert.match(monthly, /Years = List.Numbers\(2024, 2\)/);
    assert.match(monthly, /year = Year/);
});

test('station text is safely escaped in generated M code', () => {
    const code = trafficPowerQuery([{ ...point, name: 'A "quote" #(lf)\nB' }], options);
    assert.match(code, /A ""quote"" #\(#\)\(lf\)#\(lf\)B/);
});

test('traffic station snapshot contains unique searchable points and current county metadata', () => {
    const catalog = JSON.parse(readFileSync(new URL('../../data/vegvesen/stations.json', import.meta.url), 'utf8'));
    assert.equal(catalog.version, 1);
    assert.ok(catalog.stations.length > 1000);
    assert.equal(new Set(catalog.stations.map(station => station.id)).size, catalog.stations.length);
    assert.ok(catalog.stations.some(station => station.county?.number === 55 && station.trafficType === 'VEHICLE'));
    assert.ok(catalog.stations.some(station => station.trafficType === 'BICYCLE'));
});
