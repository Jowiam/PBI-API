import test from 'node:test';
import assert from 'node:assert/strict';
import { politietParameters, politietPowerQuery, politietEarliestDate, validatePolitietOptions } from './politiet.mjs';
import { politietRCode } from './rCode.mjs';
import { readFile } from 'node:fs/promises';

const base = { districts: [], municipalities: [], categories: [], active: '', period: 'rolling', days: 7 };

test('Politiloggen: lagret filteroversikt har distriktskoder, kommuner og kategorier', async () => {
    const metadata = JSON.parse(await readFile(new URL('../../data/politiet/metadata.json', import.meta.url), 'utf8'));
    assert.equal(metadata.version, 1);
    assert.equal(metadata.districts.length, 12);
    assert.equal(new Set(metadata.districts.map(d => d.code)).size, 12);
    assert.ok(metadata.districts.every(d => typeof d.code === 'string' && Array.isArray(d.municipalities) && d.municipalities.every(m => typeof m.name === 'string')));
    assert.ok(Array.isArray(metadata.categories) && metadata.categories.length > 0);
    assert.ok(metadata.categories.every(c => typeof c.name === 'string'));
});

test('Politiloggen: gjentatte query-parametre og norske tegn følger OpenAPI', () => {
    const params = politietParameters({ ...base, districts: ['Øst', 'SørØst'], categories: ['Ro og orden', 'Vær'], active: 'false' }, new Date('2026-11-09T12:00:00Z'));
    assert.deepEqual(params.getAll('Districts'), ['Øst', 'SørØst']);
    assert.deepEqual(params.getAll('Categories'), ['Ro og orden', 'Vær']);
    assert.equal(params.get('IsActive'), 'false');
    assert.equal(params.get('DateFrom'), '2026-11-02T12:00:00.000Z');
    assert.equal(params.get('Take'), '50');
    assert.equal(params.has('Municipalities'), false);
});

test('Politiloggen: faste kalenderdager håndterer begge sommertidsoverganger', () => {
    for (const [date, hours] of [['2026-03-29', 23], ['2026-10-25', 25]]) {
        const params = politietParameters({ ...base, period: 'fixed', startDate: date, endDate: date }, new Date('2026-11-09T12:00:00Z'));
        assert.equal(new Date(params.get('DateTo')) - new Date(params.get('DateFrom')) + 1, hours * 3600000);
    }
});

test('Politiloggen: avviser eldre fra-dato og beskytter lagrede skript ved senere kjøring', () => {
    const now = new Date('2026-11-09T12:00:00Z');
    const fixed = { ...base, period: 'fixed', startDate: '2019-01-02', endDate: '2026-11-09' };
    assert.throws(() => validatePolitietOptions(fixed, now), /ett år tilbake/);
    assert.equal(politietEarliestDate(now), '2025-11-10');
    assert.throws(() => validatePolitietOptions({ ...fixed, startDate: '2025-11-09' }, now), /ett år tilbake/);
    assert.doesNotThrow(() => validatePolitietOptions({ ...fixed, startDate: '2025-11-10' }, now));
    assert.match(politietPowerQuery(base), /CheckedFrom = if From < Date.AddYears/);
    assert.match(politietRCode(base), /from_time < earliest/);
});

test('Politiloggen: ugyldige datoer og perioder blir avvist', () => {
    for (const days of ['', 0, 1.5, 366]) assert.throws(() => validatePolitietOptions({ ...base, days }));
    assert.throws(() => validatePolitietOptions({ ...base, period: 'fixed', startDate: '2026-02-30', endDate: '2026-03-01' }));
    assert.throws(() => validatePolitietOptions({ ...base, period: 'fixed', startDate: '2026-11-09', endDate: '2026-11-08' }));
});

test('Politiloggen: M og R har dynamisk periode, alle sider og tomt tabellskjema', () => {
    const m = politietPowerQuery({ ...base, categories: ['Trafikk', 'Vær'] });
    const r = politietRCode(base);
    assert.match(m, /DateTimeZone.FixedUtcNow/);
    assert.match(m, /Categories=Trafikk&Categories=V%C3%A6r/);
    assert.match(m, /\[Page\]\[hasMoreResults\]/);
    assert.match(m, /ReadPage\(\[Skip\] \+ List.Count/);
    assert.match(m, /MissingField.UseNull/);
    assert.match(m, /"threadId"/);
    assert.match(r, /to <- Sys.time\(\)/);
    assert.match(r, /skip <- skip \+ length\(batch\)/);
    assert.match(r, /rows_to_df\(rows, columns\)/);
});
