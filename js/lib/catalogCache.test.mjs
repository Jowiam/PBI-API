import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG_CACHE_TTL, validCachedCatalog, freshCachedCatalog, readCatalogCache, writeCatalogCache } from './catalogCache.mjs';

test('saved catalogue expires after six hours and invalid or future records are rejected', () => {
    const record = { version: 1, savedAt: 100000, tables: [{ id: '07459', label: 'Befolkning', paths: [] }] };
    assert.equal(validCachedCatalog(record), true);
    assert.equal(freshCachedCatalog(record, record.savedAt + CATALOG_CACHE_TTL - 1), true);
    assert.equal(freshCachedCatalog(record, record.savedAt + CATALOG_CACHE_TTL), false);
    assert.equal(freshCachedCatalog(record, record.savedAt - 1), false);
    for (const bad of [null, {}, { ...record, version: 2 }, { ...record, savedAt: 'bad' }, { ...record, tables: [] }, { ...record, tables: [{}] }]) {
        assert.equal(validCachedCatalog(bad), false);
        assert.equal(freshCachedCatalog(bad), false);
    }
});

test('catalogue caching safely falls back when browser storage is unavailable', async () => {
    assert.equal(await readCatalogCache(), null);
    assert.equal(await writeCatalogCache({}), null);
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, get() { throw new Error('Storage denied'); } });
    try { assert.equal(await readCatalogCache(), null); }
    finally { delete globalThis.indexedDB; }
});
