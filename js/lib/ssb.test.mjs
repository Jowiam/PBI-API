import test from 'node:test';
import assert from 'node:assert/strict';
import {
    categoryCodes, readDimensions, initialSelections, buildSSBSelection,
    estimateCells, ssbDataURL, ssbGetURL, ssbPowerQuery, datasetView, datasetCSV, fetchSSB
} from './ssb.mjs';

const metadata = {
    id: ['Region', 'ContentsCode', 'Tid'], role: { geo: ['Region'], time: ['Tid'], metric: ['ContentsCode'] },
    dimension: {
        Region: { label: 'region', category: { index: { '55': 1, '0': 0 }, label: { '0': 'Hele landet', '55': 'Troms' } } },
        ContentsCode: { label: 'måltall', category: { index: ['Personer'], label: { Personer: 'Personer' }, unit: { Personer: { base: 'antall' } } } },
        Tid: { label: 'år', category: { index: { '2024': 0, '2025': 1, '2026': 2 }, label: { '2024': '2024', '2025': '2025', '2026': '2026' } } }
    }
};

test('SSB metadata preserves category positions instead of JS numeric-key order', () => {
    assert.deepEqual(categoryCodes({ index: { '55': 0, '0': 1, '03': 2 } }), ['55', '0', '03']);
    const dims = readDimensions(metadata);
    assert.equal(dims[0].geo, true);
    assert.equal(dims[2].time, true);
    const config = initialSelections(dims);
    assert.deepEqual(config.Region.values, ['0']);
    assert.equal(config.Tid.mode, 'latest');
    assert.equal(estimateCells(dims, config), 3);
});

test('SSB selection supports specific values, all values and rolling latest periods', () => {
    const dims = readDimensions(metadata);
    const config = initialSelections(dims);
    config.Region = { mode: 'all' };
    config.Tid.count = '2';
    assert.deepEqual(buildSSBSelection(dims, config), { selection: [
        { variableCode: 'Region', valueCodes: ['*'] },
        { variableCode: 'ContentsCode', valueCodes: ['Personer'] },
        { variableCode: 'Tid', valueCodes: ['top(2)'] }
    ] });
    assert.equal(estimateCells(dims, config), 4);
    config.Region = { mode: 'item', values: ['55', '55', 'invalid', '0'] };
    assert.deepEqual(buildSSBSelection(dims, config).selection[0].valueCodes, ['0', '55']);
    assert.equal(estimateCells(dims, config), 4);
});

test('SSB blocks empty selections, invalid periods and latest filter on other dimensions', () => {
    const dims = readDimensions(metadata);
    const config = initialSelections(dims);
    for (const count of [0, -1, 1.5, '', 'bad', 4]) {
        config.Tid.count = count;
        assert.throws(() => buildSSBSelection(dims, config), /perioder/);
    }
    config.Tid.count = 1;
    config.Region.values = [];
    assert.throws(() => buildSSBSelection(dims, config), /minst én/);
    config.Region = { mode: 'latest', count: 1 };
    assert.throws(() => buildSSBSelection(dims, config), /perioder/);
});

test('SSB URL and Power Query use v2 POST, flat CSV, Latin-1 and escaped JSON', () => {
    const dims = readDimensions(metadata);
    const query = buildSSBSelection(dims, initialSelections(dims));
    const url = new URL(ssbDataURL('07459', 'csv', dims, true));
    assert.equal(url.searchParams.get('stub'), 'Region,ContentsCode,Tid');
    assert.equal(url.searchParams.get('outputFormatParams'), 'SeparatorSemicolon,UseCodesAndTexts');
    assert.equal(new URL(ssbGetURL('07459', query)).searchParams.get('valueCodes[Tid]'), 'top(3)');
    assert.throws(() => ssbDataURL('../bad'), /fem siffer/);
    const m = ssbPowerQuery('07459', query, dims);
    assert.match(m, /RelativePath = "tables\/07459\/data"/);
    assert.match(m, /Content = Text.ToBinary\(Body, TextEncoding.Utf8\)/);
    assert.match(m, /Encoding = 28591/);
    const body = m.match(/Body = "(.*)",/)[1].replace(/""/g, '"');
    assert.deepEqual(JSON.parse(body), {
        ...query, placement: { stub: ['Region', 'ContentsCode', 'Tid'], heading: [] }
    });
});

const dataset = {
    ...metadata, size: [2, 1, 3], value: { 0: 0, 1: 12, 3: -5, 5: 99 }, status: { 2: ':' }
};

test('SSB JSON-stat flattening preserves dimension order, zero, null, status and units', () => {
    const view = datasetView(dataset);
    assert.equal(view.length, 6);
    assert.deepEqual(view.row(0), ['Hele landet', 'Personer', '2024', 'antall', 0, '']);
    assert.deepEqual(view.row(2), ['Hele landet', 'Personer', '2026', 'antall', null, ':']);
    assert.deepEqual(view.row(3), ['Troms', 'Personer', '2024', 'antall', -5, '']);
    assert.equal(view.row(5, true)[0], '55 – Troms');
    assert.equal(datasetView({ ...dataset, value: [0, 12, null, -5, null, 99], status: ':' }).row(1).at(-1), ':');
    assert.throws(() => datasetView({}), /dataformat/);
});

test('SSB CSV exports all rows with UTF-8 BOM, semicolons and correct escaping', () => {
    const csv = datasetCSV(dataset, true);
    assert.equal(csv.charCodeAt(0), 0xFEFF);
    assert.equal(csv.split('\r\n').length, 7);
    assert.match(csv, /"55 – Troms"/);
    assert.match(csv, /"antall";"-5";""/);
    const unsafe = structuredClone(dataset);
    unsafe.dimension.Region.category.label['0'] = '=SUM(1;2) "test"';
    assert.match(datasetCSV(unsafe), /"'=SUM\(1;2\) ""test"""/);
});

test('SSB HTTP errors provide actionable messages and cancelled requests stay cancelled', async () => {
    const original = globalThis.fetch;
    try {
        for (const [status, message] of [[404, /tabellen/], [429, /ett minutt/], [503, /utilgjengelig/]]) {
            globalThis.fetch = async () => ({ ok: false, status });
            await assert.rejects(fetchSSB('https://example.test'), message);
        }
        globalThis.fetch = async () => { throw new Error('network'); };
        await assert.rejects(fetchSSB('https://example.test'), /nettilkoblingen/);
        globalThis.fetch = async () => { throw new DOMException('cancel', 'AbortError'); };
        await assert.rejects(fetchSSB('https://example.test'), { name: 'AbortError' });
    } finally { globalThis.fetch = original; }
});
