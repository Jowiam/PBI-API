export const CATALOG_CACHE_TTL = 6 * 60 * 60 * 1000;

export function validCachedCatalog(record) {
    return record?.version === 1 && Number.isFinite(record.savedAt) && Array.isArray(record.tables) &&
        record.tables.length > 0 && record.tables.every(table => typeof table.id === 'string' && typeof table.label === 'string' && Array.isArray(table.paths));
}

export function freshCachedCatalog(record, now = Date.now()) {
    return validCachedCatalog(record) && record.savedAt <= now && now - record.savedAt < CATALOG_CACHE_TTL;
}

// IndexedDB accommodates the catalogue without localStorage size limits.
// Failure or denied storage is harmless: the app still loads from SSB.
function cacheOperation(mode, operation) {
    try { if (!globalThis.indexedDB) return Promise.resolve(null); }
    catch { return Promise.resolve(null); }
    return new Promise(resolve => {
        let database;
        let settled = false;
        const finish = value => {
            if (settled) return;
            settled = true; clearTimeout(timer); database?.close(); resolve(value);
        };
        const timer = setTimeout(() => finish(null), 2000);
        try {
            const open = indexedDB.open('fhi-ssb-catalog', 1);
            open.onupgradeneeded = () => {
                if (!open.result.objectStoreNames.contains('catalogs')) open.result.createObjectStore('catalogs');
            };
            open.onerror = () => finish(null);
            open.onblocked = () => finish(null);
            open.onsuccess = () => {
                database = open.result;
                if (settled) { database.close(); return; }
                try {
                    const transaction = database.transaction('catalogs', mode);
                    const request = operation(transaction.objectStore('catalogs'));
                    let result = null;
                    request.onsuccess = () => { result = request.result; };
                    transaction.oncomplete = () => finish(result);
                    transaction.onerror = transaction.onabort = () => finish(null);
                } catch { finish(null); }
            };
        } catch { finish(null); }
    });
}

export const readCatalogCache = () => cacheOperation('readonly', store => store.get('ssb-no-v2'));
export const writeCatalogCache = record => cacheOperation('readwrite', store => store.put(record, 'ssb-no-v2'));
