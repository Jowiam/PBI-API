import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nvdbParameters, nvdbURL, flattenNvdbObject, nvdbPowerQuery, nvdbRCode, previewNvdb } from './nvdb.mjs';

const options = { county: '55', municipality: '5501', roadCategory: 'E', roadNumber: '8', geometry: false };

test('NVDB filters preserve municipality codes and produce valid V4 requests', () => {
    const url = new URL(nvdbURL(105, options));
    assert.equal(url.pathname, '/vegobjekter/api/v4/vegobjekter/105');
    assert.equal(url.searchParams.get('kommune'), '5501');
    assert.equal(url.searchParams.get('fylke'), '55');
    assert.equal(url.searchParams.get('vegsystemreferanse'), 'EV8');
    assert.equal(url.searchParams.get('antall'), '1000');
    assert.equal(nvdbParameters(105, { county: '03', municipality: '0301' }).kommune, '0301');
    assert.equal(nvdbParameters(105, { roadCategory: 'F' }).vegsystemreferanse, 'FV');
    assert.match(nvdbParameters(105, { geometry: true }).inkluder, /,geometri$/);
    assert.throws(() => nvdbParameters(105, { ...options, county: '03' }), /Kommunen/);
    assert.throws(() => nvdbParameters(105, { roadNumber: '8' }), /vegkategori/);
    assert.throws(() => nvdbParameters('../105', {}), /vegobjekttype/);
    assert.throws(() => nvdbParameters(105, { roadCategory: 'Z' }), /vegkategori/);
    assert.throws(() => nvdbParameters(105, { ...options, roadNumber: '8&start=bad' }), /vegnummer/);
});

test('NVDB flattening keeps one row per object, zeroes, nulls, booleans, codes and complex properties', () => {
    const object = {
        id: 123, metadata: { type: { id: 105, navn: 'Fartsgrense' }, versjon: 1 },
        lokasjon: { fylker: [3], kommuner: [301, 5501], lengde: 0, vegsystemreferanser: [{ kortform: 'EV8 S1D1 m1-2' }, { kortform: 'FV862' }] },
        egenskaper: [{ id: 1, navn: 'Verdi', verdi: 0 }, { id: 2, navn: 'Verdi', verdi: false }, { id: 3, navn: 'Mangler', verdi: null }, { id: 4, navn: 'Liste', verdi: [1, 2] }, { id: 5, navn: 'Geometri', wkt: 'POINT (0 0)' }],
        geometri: { wkt: 'POINT (0 0)', srid: 4326 },
    };
    const row = flattenNvdbObject(object, true);
    assert.equal(row.ObjektId, 123);
    assert.equal(row.Fylkesnummer, '03');
    assert.equal(row.Kommunenummer, '0301, 5501');
    assert.equal(row.Lengde_m, 0);
    assert.equal(row.E1_Verdi, 0);
    assert.equal(row.E2_Verdi, false);
    assert.equal(row.E3_Mangler, null);
    assert.deepEqual(JSON.parse(row.E4_Liste), [1, 2]);
    assert.equal(JSON.parse(row.E5_Geometri).wkt, 'POINT (0 0)');
    assert.equal(row.Geometri_SRID, 4326);
    assert.equal(row.Vegreferanse, 'EV8 S1D1 m1-2, FV862');
    assert.equal(flattenNvdbObject({ id: 1 }).Lengde_m, null);
    assert.equal(Object.hasOwn(flattenNvdbObject(object), 'Geometri_WKT'), false);
});

test('NVDB exports keep filters on every page, use the required client header and include dynamic properties', () => {
    const m = nvdbPowerQuery(105, options);
    assert.match(m, /RelativePath = "vegobjekter\/api\/v4\/vegobjekter\/105"/);
    assert.match(m, /Query = Record.Combine\(\{Filters, if Start = null then \[\] else \[start = Start\]\}\)/);
    assert.match(m, /\[metadata\]\[neste\]\[start\]/);
    assert.match(m, /#"X-Client" = "PBI-API-query-builder"/);
    assert.match(m, /MissingField.UseNull/);
    assert.match(m, /Record.Combine\(\{Base\} & Properties\)/);
    assert.doesNotMatch(m, /Geometri_WKT/);
    assert.match(nvdbPowerQuery(105, { geometry: true }), /Geometri_WKT/);
    const r = nvdbRCode(105, options);
    assert.match(r, /query\$start <- start/);
    assert.match(r, /start <- page\$metadata\$neste\$start/);
    assert.match(r, /"X-Client" = "PBI-API-query-builder"/);
    assert.match(r, /kommune = "5501"/);
    assert.match(r, /data <- as.data.frame/);
    assert.doesNotMatch(r, /requireNamespace|install.packages|req_retry|print\(|message\(/);
    assert.match(nvdbRCode(105, { geometry: true }), /Geometri_WKT/);
});

test('NVDB preview is bounded to 20 objects and sends client headers and cancellation signal', async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();
    let request;
    globalThis.fetch = async (url, init) => { request = { url: new URL(url), init }; return { ok: true, json: async () => ({ objekter: [{ id: 123 }] }) }; };
    try {
        const rows = await previewNvdb(105, options, controller.signal);
        assert.equal(request.url.searchParams.get('antall'), '20');
        assert.equal(request.url.searchParams.get('vegsystemreferanse'), 'EV8');
        assert.equal(request.init.headers['X-Client'], 'PBI-API-query-builder');
        assert.equal(request.init.signal, controller.signal);
        assert.equal(rows[0].ObjektId, 123);
    } finally { globalThis.fetch = originalFetch; }
});

test('published NVDB metadata contains public types and correct county/municipality codes', () => {
    const catalog = JSON.parse(readFileSync(new URL('../../data/vegvesen/nvdb.json', import.meta.url), 'utf8'));
    assert.equal(catalog.version, 1);
    assert.ok(catalog.types.length > 300);
    assert.equal(new Set(catalog.types.map(t => t.id)).size, catalog.types.length);
    assert.ok(catalog.types.some(t => t.id === 105 && t.name === 'Fartsgrense'));
    assert.ok(!catalog.types.some(t => [562, 871, 890, 892, 894, 895, 901, 903, 905].includes(t.id)));
    assert.ok(catalog.counties.some(c => c.number === '55' && c.name === 'Troms'));
    assert.ok(catalog.municipalities.some(m => m.number === '5501' && m.county === '55' && m.name === 'Tromsø'));
    assert.ok(catalog.municipalities.some(m => m.number === '0301' && m.county === '03'));
});
