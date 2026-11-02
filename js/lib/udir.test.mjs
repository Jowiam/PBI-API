import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { defaultIds, udirDimensions, udirInitialConfig, buildUdirFilter, udirDataURL, udirPowerQuery } from './udir.mjs';

const snapshot = id => JSON.parse(readFileSync(new URL('../../data/udir/tables/' + id + '.json', import.meta.url), 'utf8'));

test('Udir standard values parse negative IDs and whitespace without evaluating expressions', () => {
    assert.deepEqual(defaultIds('TrinnID', '{TrinnID:[6, 9]}'), ['6', '9']);
    assert.deepEqual(defaultIds('EnhetID', '{EnhetID:[-12]}'), ['-12']);
    assert.deepEqual(defaultIds('TidID', '{Wrong:[202512]}'), []);
    assert.deepEqual(defaultIds('TidID', '{TidID:[globalThis.evil()]}'), []);
});

test('every published Udir metadata snapshot produces valid default filters', () => {
    const files = readdirSync(new URL('../../data/udir/tables/', import.meta.url)).filter(name => name.endsWith('.json'));
    assert.ok(files.length >= 8);
    for (const file of files) {
        const data = snapshot(file.replace('.json', ''));
        const dimensions = udirDimensions(data);
        const config = udirInitialConfig(dimensions);
        const filter = buildUdirFilter(dimensions, config);
        assert.match(filter, /TidID\(\d+\)/);
        assert.match(filter, /EnhetID\(-12\)/);
        const trinn = dimensions.find(dim => dim.code === 'TrinnID');
        assert.deepEqual(config.TrinnID.values, trinn.defaults);
        assert.ok(trinn.defaults.length > 0);
    }
});

test('Udir geography keeps county IDs distinct from codes and includes parent names', () => {
    const dims = udirDimensions(snapshot('152'));
    const geo = dims.find(dim => dim.geo);
    const troms = geo.values.find(value => value.code === '55' && value.level === 2);
    assert.equal(troms.id, '-47');
    const school = geo.values.find(value => value.level === 3 && value.parents.some(name => name.includes('Troms')));
    assert.ok(school);
    const config = udirInitialConfig(dims);
    config.EnhetID.values = [troms.id, troms.id];
    const filter = buildUdirFilter(dims, config);
    assert.match(filter, /EnhetID\(-47\)/);
    assert.doesNotMatch(filter, /Fylkekode/);
    const url = new URL(udirDataURL('152', filter));
    assert.equal(url.searchParams.get('filter'), filter);
    assert.equal(url.searchParams.get('sideNummer'), '1');
});

test('Udir rejects empty mandatory filters and values outside the metadata', () => {
    const dims = udirDimensions(snapshot('152'));
    const config = udirInitialConfig(dims);
    config.TidID = { mode: 'omit', values: [] };
    assert.throws(() => buildUdirFilter(dims, config), /minst én/);
    config.TidID = { mode: 'item', values: ['not-an-id'] };
    assert.throws(() => buildUdirFilter(dims, config), /Ugyldig verdi/);
    assert.throws(() => udirDataURL('../secret', 'x'), /tabellnummer/);
});

test('Udir optional filters may be omitted and multiselection serializes with underscores', () => {
    const dims = udirDimensions(snapshot('148'));
    const config = udirInitialConfig(dims);
    assert.match(buildUdirFilter(dims, config), /TrinnID\(6_9\)/);
    config.EnhetID = { mode: 'omit', values: [] };
    assert.doesNotMatch(buildUdirFilter(dims, config), /EnhetID/);
});

test('Udir Power Query preserves filters, fetches every page and checks for truncation', () => {
    const filter = 'TidID(202512)_EnhetID(-47)';
    const code = udirPowerQuery('152', filter);
    assert.equal(code.match(/Filter = "([^"]+)"/)[1], filter);
    assert.match(code, /RelativePath = "api\/rest\/v2\/Eksport\/152\/"/);
    assert.match(code, /Size\{0\}\[JSONSider\]/);
    assert.match(code, /List.Numbers\(1, PageCount\)/);
    assert.match(code, /sideNummer = Text.From\(Page/);
    assert.match(code, /List.Count\(Rows\) = ExpectedRows/);
    assert.match(code, /Column & "_tall"/);
    assert.match(code, /"nb-NO"/);
    assert.doesNotMatch(udirPowerQuery('152', filter, false), /ToNumber|_tall/);
});
