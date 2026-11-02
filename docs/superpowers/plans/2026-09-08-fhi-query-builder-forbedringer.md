# FHI API Query Builder – Forbedringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rette de konkrete driftsrisikoene og strukturelle svakhetene som ble avdekket i kodegjennomgangen av `index.html` (2717 linjer, ett gigantisk React-komponent), uten å endre appens funksjonalitet eller innføre et build-steg.

**Architecture:** Fase 1 retter tre reelle bugs/driftsrisikoer direkte i `index.html` (rask, lav risiko, kan skippes uavhengig av resten). Fase 2 splitter `FHIQueryBuilder`-komponenten i native ES-moduler (`<script type="module">`, ingen bundler/transpiler) og legger til automatiserte tester med Node sin innebygde testrunner (`node --test`, null npm-avhengigheter). Nøkkelteknikk for komponent-splitting: hver `render*`-funksjon flyttes **verbatim** til sin egen fil og pakkes inn i `export function render*(<samme navn som de opprinnelige lukkings-variablene>) { ... uendret kropp ... }` — siden parameternavnene er identiske med de opprinnelige lukkingsvariablene, trengs ingen endringer inne i funksjonskroppen. Fase 3 er polish (a11y, dokumentasjon).

**Tech Stack:** React 18 (UMD via unpkg CDN, ingen endring), rene ES-moduler i nettleseren, Node sin innebygde `node:test`/`node:assert/strict` for enhetstester (krever ikke `npm install`), GitHub Actions for CI, GitHub Pages for deploy (uendret).

**Spec:** Ingen separat spec-fil. Planen bygger direkte på kodegjennomgangen gjort i denne samtalen (commit `a05a9b01a2b471c2c68e22a74510b92aa7dcc5b5` på `main`, lokalt klonet til prosjektmappen) og brukerens avklaringer: behold zero-build, gjennomfør full plan (opprydding + dekomponering + tester + polish).

## Global Constraints

- Ingen build-steg og ingen npm-avhengigheter (bekreftet av bruker). Ingen `package.json`, ingen bundler, ingen transpiler.
- Appen skal fortsatt fungere som et rent statisk nettsted som kan deployes uendret via `.github/workflows/static.yml` (som publiserer hele repoet).
- Samme FHI API-kontrakt og samme spørringsformat som i dag — ingen endring i hva som sendes til `https://statistikk-data.fhi.no/api/open/v1`.
- Ren flytting av eksisterende kode skal ikke endre atferd. De eneste tiltenkte atferdsendringene er de eksplisitt beskrevne bugfiksene i Fase 1.
- Tester kjøres med `node --test` (Node 18+, ingen `npm install` nødvendig). CI bruker Node 20.
- Alle nye/flyttede JS-filer er ES-moduler (`.mjs`), lastet med `<script type="module">` — fungerer direkte i nettleseren uten server-side prosessering (må serveres over http(s), ikke åpnes via `file://`).

---

## Fase 1 — Korrekthet og driftssikkerhet (lav risiko, kan shippes først/uavhengig)

### Task 1: Fjern avhengighet til GitHub Contents API for tabell-labels

**Problem:** `fetchTableLabels()` (index.html:424-445) henter `fhi_table_label_mapping.csv` via `https://api.github.com/repos/janhli/FHI-API-Query-Builder/contents/...` — et **uautentisert** GitHub API-kall med IP-basert rate limit på 60 forespørsler/time, delt mellom *alle* apper/brukere bak samme NAT/kontor-IP. Kallet skjer på hver eneste sideinnlasting (useEffect, index.html:350-353). Filen ligger allerede i repo-roten og publiseres til GitHub Pages sammen med `index.html` — den kan hentes same-origin i stedet, uten rate limit, uten base64-dekoding.

**Files:**
- Modify: `index.html:424-445` (`fetchTableLabels`)

**Interfaces:**
- Produces: `fetchTableLabels()` kaller fortsatt `setTableLabels(labelMap)` med samme format som før — ingen endring for kallere (index.html:352).

- [ ] **Step 1: Erstatt funksjonskroppen**

Bytt ut hele funksjonen (index.html:424-445) med:

```js
async function fetchTableLabels() {
    try {
        const response = await fetch('./fhi_table_label_mapping.csv');
        if (!response.ok) throw new Error('Kunne ikke hente tabell-labels (status: ' + response.status + ')');
        const csvText = await response.text();
        const labelMap = parseTableLabelsCSV(csvText);
        setTableLabels(labelMap);
    } catch (err) {
        console.error('Kunne ikke hente tabell-labels:', err.message);
    }
}
```

- [ ] **Step 2: Verifiser manuelt**

Start en lokal statisk server fra repo-roten (f.eks. `python -m http.server 8000` eller `npx serve`), åpne `http://localhost:8000`, og bekreft i DevTools → Network at `fhi_table_label_mapping.csv` hentes fra samme origin (ikke `api.github.com`) og at tabell-labels vises som før i steg 2 (velg en kilde og se at tabellnavnene er lesbare, ikke rå tableId-er).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: hent tabell-labels same-origin i stedet for GitHub API (unngå rate limit)"
```

---

### Task 2: Fiks frosset Geo-Mapping CSV-URL

**Problem:** `geoMappingUrl` (index.html:348) er hardkodet til en URL pekt på en **spesifikk gammel commit** (`b1305dec721c7bc669c4fa7560ffdbbf25cceb2a`). Denne URL-en vises til sluttbrukere i UI (index.html:1922-1939, "Geo-Mapping CSV URL" med kopier-knapp) som en lenke de kan bruke i egne verktøy (f.eks. Power Query). Fordi den peker på en frossen commit, vil `geo_mapping.csv` **aldri** oppdateres for brukere som har kopiert denne lenken, selv om filen oppdateres på `main`.

**Files:**
- Modify: `index.html:348`

**Interfaces:**
- Produces: `geoMappingUrl`-verdien som brukes uendret av UI-koden i index.html:1930/1935.

- [ ] **Step 1: Pek til `main` i stedet for en frossen commit**

Erstatt linje 348:

```js
const [geoMappingUrl, setGeoMappingUrl] = useState('https://github.com/janhli/FHI-API-Query-Builder/raw/b1305dec721c7bc669c4fa7560ffdbbf25cceb2a/geo_mapping.csv');
```

med:

```js
const [geoMappingUrl, setGeoMappingUrl] = useState('https://raw.githubusercontent.com/janhli/FHI-API-Query-Builder/main/geo_mapping.csv');
```

(`setGeoMappingUrl` brukes ikke andre steder — verdien er reelt sett en konstant. Det er greit å la den stå som `useState` for å unngå unødvendige diff-endringer andre steder i filen.)

- [ ] **Step 2: Verifiser manuelt**

Naviger til steg 4 (spørringsresultat) med en tabell som har en GEO-dimensjon, klikk kopier-knappen ved siden av "Geo-Mapping CSV URL", og lim inn i nettleseren — bekreft at CSV-en lastes og at URL-en ikke lenger inneholder en commit-hash.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: pek Geo-Mapping CSV-URL til main i stedet for en frossen commit"
```

---

### Task 3: Fjern debug-logging

**Problem:** 31 `console.log`/`console.error`-kall er igjen i produksjonskoden, inkludert flere eksplisitt merket `'DEBUG:'` (index.html:2018-2127) som dumper intern state (dimensjonsnavn, geo-koder, CSV-rader) til konsollen på hver interaksjon i steg 4.

**Files:**
- Modify: `index.html` (alle linjer under; nøyaktige linjenumre kan ha forskjøvet seg noe etter Task 1/2 — søk på strengene under for å finne dem)

**Interfaces:** Ingen — ren fjerning av sideeffekter, ingen signaturer endres.

- [ ] **Step 1: Fjern alle `'DEBUG:'`-logger**

Fjern samtlige linjer som matcher `console.log('DEBUG:`. Disse ligger i `renderQueryResult` sin CSV-genereringslogikk, ca. index.html:2018-2127 (11 forekomster: `dimNames`, `geoDimId`, `hasGeoDim`, GEO-dimensjon-sjekk, `metricDimId`, `contentsCodeIndex`, CSV-header, geo-lagring, CSV-rad-output).

- [ ] **Step 2: Fjern resten av de rene debug-loggene**

Fjern (ikke bare kommenter ut) følgende, som alle er utviklings-logging uten verdi for sluttbruker eller feilsøking i produksjon:
- index.html:380 — `console.log('✓ Første setning satt:', sentence);`
- index.html:460, 489, 539, 545 — header/rad-logging i `parseTableLabelsCSV` (dekkes uansett av Task 7 når funksjonen flyttes og skrives om)
- index.html:670, 673 — `'✓ Metadata hentet'` / `'✗ Kunne ikke hente metadata'`
- index.html:957 — `'Preview query:'`
- index.html:971 — `'API error response:'`
- index.html:981 — `'Parse error:'`

- [ ] **Step 3: Behold reell feilhåndtering**

`console.error('Uventet data format:', data);` (index.html:621, i `fetchDimensions`) og `console.error('CSV-filen er tom...')` skal **beholdes** — dette er reelle feilsituasjoner verdt å se i konsollen ved feilsøking, ikke debug-støy. Behold også alle `setError(...)`-kall uendret.

- [ ] **Step 4: Verifiser**

Åpne appen i nettleser med DevTools-konsollen åpen, gå gjennom hele flyten (velg kilde → tabell → dimensjoner → generer spørring → forhåndsvis data), og bekreft at konsollen er stille bortsett fra ekte feilsituasjoner du selv fremprovoserer.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "chore: fjern debug-logging fra produksjonskode"
```

---

### Task 4: Migrer fra `ReactDOM.render` til `createRoot`

**Problem:** `ReactDOM.render` (index.html:2709, 2712) er en deprecated API i React 18 og skriver en advarsel til konsollen ved oppstart.

**Files:**
- Modify: `index.html:2706-2713`

**Interfaces:** Ingen endring i oppførsel — kun monteringsmekanismen endres.

- [ ] **Step 1: Bytt til `createRoot`**

Erstatt (index.html:2706-2713):

```js
// Render when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        ReactDOM.render(h(FHIQueryBuilder), document.getElementById('root'));
    });
} else {
    ReactDOM.render(h(FHIQueryBuilder), document.getElementById('root'));
}
```

med:

```js
// Render when DOM is ready
function mount() {
    ReactDOM.createRoot(document.getElementById('root')).render(h(FHIQueryBuilder));
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
} else {
    mount();
}
```

- [ ] **Step 2: Verifiser**

Åpne appen, bekreft at ingen `ReactDOM.render is no longer supported`-advarsel vises i konsollen, og at appen fungerer som før.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "chore: migrer til ReactDOM.createRoot (fjerner React 18-deprecation-advarsel)"
```

---

### Task 5: Dedupliser state-reset og metadata-henting

**Problem A — duplisert reset-logikk:** Når en bruker klikker på et resultat i det globale tabellsøket (`renderSourceSelection`, index.html:1143-1156), gjentas manuelt de samme seks `set*`-kallene og `fetchDimensions`-kallet som `selectTable` (index.html:800-811) allerede gjør — men uten `setTableSearch('')` og `setShowMetadataModal(false)`. Skulle noen senere legge til et nytt felt som må resettes ved tabellbytte, er det lett å glemme å oppdatere begge stedene, og de to stiene vil kunne gi forskjellig state.

**Problem B — nesten-duplisert metadata-henting:** `fetchMetadata` (index.html:653-663) og `fetchMetadataOnly` (index.html:665-675) gjør identisk fetch-logikk; forskjellen er kun om modalen åpnes (`setShowMetadataModal(true)`) og om feil vises til bruker (`setError`) eller svelges stille. To nesten-identiske funksjoner å holde synkronisert er unødvendig risiko.

**Files:**
- Modify: `index.html:653-675` (slå sammen `fetchMetadata`/`fetchMetadataOnly` til én funksjon)
- Modify: `index.html:800-811` (`selectTable`) og `index.html:787-798` (`selectSource`) — innfør delt `selectSourceAndTable`
- Modify: `index.html:1143-1156` (global søk-klikk i `renderSourceSelection`) — bruk samme delte funksjon
- Modify: `index.html:1328` (kall til `fetchMetadata`)

**Interfaces:**
- Produces: `fetchMetadata(sourceId, tableId, options)` der `options.openModal` (default `false`) styrer om modalen åpnes og om feil settes i `error`-state.
- Produces: `selectSourceAndTable(source, table)` — eneste sted som nullstiller state ved tabellbytte.

- [ ] **Step 1: Slå sammen `fetchMetadata`/`fetchMetadataOnly`**

Erstatt begge funksjonene (index.html:653-675) med:

```js
async function fetchMetadata(sourceId, tableId, options) {
    const openModal = Boolean(options && options.openModal);
    try {
        const response = await fetch(API_BASE + '/' + sourceId + '/Table/' + tableId + '/metadata');
        if (!response.ok) throw new Error('Kunne ikke hente metadata');
        const data = await response.json();
        setTableMetadata(data);
        if (openModal) setShowMetadataModal(true);
    } catch (err) {
        if (openModal) setError(err.message);
    }
}
```

- [ ] **Step 2: Oppdater kallere**

- index.html:1328 (knappen "Informasjon om tabellen"): behold `fetchMetadata(selectedSource.id, selectedTable.tableId, { openModal: true });`
- index.html:809 (i `selectTable`, flyttes til `selectSourceAndTable` i neste steg): bytt `fetchMetadataOnly(selectedSource.id, table.tableId);` til `fetchMetadata(selectedSource.id, table.tableId);`

- [ ] **Step 3: Innfør delt `selectSourceAndTable`**

Erstatt `selectTable` (index.html:800-811) med to funksjoner:

```js
function selectSourceAndTable(source, table) {
    setSelectedSource(source);
    setSelectedTable(table);
    setDimensions([]);
    setQueryConfig({});
    setFinalQuery(null);
    setPreviewData(null);
    setTableSearch('');
    setGlobalSearch('');
    setShowMetadataModal(false);
    fetchDimensions(source.id, table.tableId);
    fetchMetadata(source.id, table.tableId);
    setStep(3);
}

function selectTable(table) {
    selectSourceAndTable(selectedSource, table);
}
```

- [ ] **Step 4: Bruk `selectSourceAndTable` i det globale søket**

I `renderSourceSelection` (index.html:1143-1156), erstatt hele `onClick`-funksjonen med:

```js
onClick: function() {
    const source = sources.find(function(s) { return s.id === table.sourceId; });
    if (source) selectSourceAndTable(source, table);
}
```

- [ ] **Step 5: Verifiser manuelt**

Test begge stiene til steg 3: (a) vanlig navigasjon kilde → tabell, og (b) klikk på et treff i det globale søkefeltet på steg 1. Bekreft at begge nullstiller tidligere valgt tabellsøk og lukker en eventuelt åpen metadata-modal, og at "Informasjon om tabellen"-knappen fortsatt åpner modalen med korrekt innhold.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "refactor: dedupliser metadata-henting og state-reset ved tabellvalg"
```

---

## Fase 2 — Modularisering (fortsatt zero-build, native ES-moduler)

> Fra og med denne fasen antas Fase 1 fullført — kodeutdragene under viser den *rensede* koden (uten debug-logging, med `fetchMetadata`/`selectSourceAndTable`).

### Task 6: Sett opp mappestruktur og testrunner

**Files:**
- Create: `js/lib/` (tom mappe)
- Create: `js/components/` (tom mappe)
- Create: `js/lib/_smoke.test.mjs`

**Interfaces:** Ingen ennå — ren scaffolding.

- [ ] **Step 1: Opprett mappestruktur og en smoke test**

```bash
mkdir -p js/lib js/components
```

Opprett `js/lib/_smoke.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

test('node --test kjører moduler under js/', () => {
    assert.equal(1 + 1, 2);
});
```

- [ ] **Step 2: Kjør testrunneren**

Run: `node --test js`
Expected: 1 test passerer (`node --test js/lib/_smoke.test.mjs`), 0 feiler.

- [ ] **Step 3: Commit**

```bash
git add js
git commit -m "chore: sett opp js/lib og js/components med Node sin innebygde testrunner"
```

---

### Task 7: Skill ut ren spørrings- og geografi-logikk til `js/lib/`

**Files:**
- Create: `js/lib/geo.mjs`
- Create: `js/lib/geo.test.mjs`
- Create: `js/lib/query.mjs`
- Create: `js/lib/query.test.mjs`
- Create: `js/lib/powerquery.mjs`
- Create: `js/lib/powerquery.test.mjs`
- Modify: `index.html` (fjern de flyttede funksjonene, importer fra modulene — kobles sammen fullt ut i Task 10)

**Interfaces:**
- Produces: `getGeographyGroups(dimension)` fra `js/lib/geo.mjs`
- Produces: `findMetricDimension(previewData)` og `buildQuery(dimensions, queryConfig, responseFormat, maxRowCount)` fra `js/lib/query.mjs`
- Produces: `generatePowerQueryCode(finalQuery, apiBase, sourceId, tableId)` fra `js/lib/powerquery.mjs`

- [ ] **Step 1: Flytt `getGeographyGroups` verbatim**

Flytt kroppen av `getGeographyGroups` (index.html:824-873, den rensede versjonen fra Fase 1) til `js/lib/geo.mjs`, pakket inn slik (kroppen mellom `{` og siste `}` er **uendret** — parameternavnet `dimension` er identisk med originalen):

```js
export function getGeographyGroups(dimension) {
    // ... uendret kropp fra index.html:824-873 ...
}
```

- [ ] **Step 2: Skriv test for `getGeographyGroups`**

`js/lib/geo.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getGeographyGroups } from './geo.mjs';

function makeGeoDimension() {
    return {
        code: 'GEO',
        category: {
            index: ['03', '0301', '030101'],
            label: { '03': 'Viken', '0301': 'Oslo', '030101': 'Gamle Oslo' }
        }
    };
}

test('returnerer null for ikke-GEO-dimensjoner', () => {
    assert.equal(getGeographyGroups({ code: 'AAR' }), null);
});

test('grupperer koder etter lengde (fylke/kommune/bydel)', () => {
    const result = getGeographyGroups(makeGeoDimension());
    assert.deepEqual(result.counties.map((c) => c.code), ['03']);
    assert.deepEqual(result.municipalities.map((m) => m.code), ['0301']);
    assert.deepEqual(result.districts.map((d) => d.code), ['030101']);
});

test('bygger hierarki fylke -> kommune -> bydel', () => {
    const result = getGeographyGroups(makeGeoDimension());
    assert.deepEqual(result.hierarchy['03'].municipalities.map((m) => m.code), ['0301']);
    assert.deepEqual(result.hierarchy['03'].districts['0301'].map((d) => d.code), ['030101']);
});
```

- [ ] **Step 3: Kjør testen, bekreft at den feiler før flytting er koblet til**

Run: `node --test js/lib/geo.test.mjs`
Expected: FAIL (`Cannot find module './geo.mjs'`) inntil Step 1 er utført — utfør Step 1 og 2 sammen, kjør deretter på nytt.

Run: `node --test js/lib/geo.test.mjs`
Expected: PASS, 3 tester grønne.

- [ ] **Step 4: Flytt `findMetricDimension` og lag `buildQuery` (renset for sideeffekter)**

Flytt kroppen av `findMetricDimension` (index.html:875-907) verbatim til `js/lib/query.mjs`:

```js
export function findMetricDimension(previewData) {
    // ... uendret kropp fra index.html:875-907 ...
}
```

`buildFinalQuery` (index.html:909-945) blander ren beregning med sideeffekter (`setFinalQuery`, `setStep`). Skill ut den rene delen som `buildQuery`, med de samme fire verdiene som funksjonen i dag leser fra komponent-state, som eksplisitte parametere:

```js
export function buildQuery(dimensions, queryConfig, responseFormat, maxRowCount) {
    const query = {
        dimensions: dimensions.map(function(dim) {
            const config = queryConfig[dim.code];

            if (config.filter === 'item') {
                return {
                    code: dim.code,
                    filter: 'item',
                    values: config.selectedCategories
                };
            } else if (config.filter === 'top') {
                return {
                    code: dim.code,
                    filter: 'top',
                    values: [config.topCount || '5']
                };
            } else {
                return {
                    code: dim.code,
                    filter: 'all',
                    values: config.values && config.values.length > 0 ? config.values : ['*']
                };
            }
        }),
        response: {
            format: responseFormat
        }
    };

    if (maxRowCount && maxRowCount !== '') {
        query.response.maxRowCount = parseInt(maxRowCount);
    }

    return query;
}
```

(Den tilhørende `setFinalQuery(query); setStep(4);`-logikken flyttes til `app.js` i Task 10, som en tynn wrapper: `function buildFinalQuery() { setFinalQuery(buildQuery(dimensions, queryConfig, responseFormat, maxRowCount)); setStep(4); }`.)

- [ ] **Step 5: Skriv tester for `buildQuery` og `findMetricDimension`**

`js/lib/query.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuery, findMetricDimension } from './query.mjs';

test('filter "item" bruker selectedCategories som values', () => {
    const query = buildQuery(
        [{ code: 'AAR' }],
        { AAR: { filter: 'item', selectedCategories: ['2024'] } },
        'json-stat2',
        ''
    );
    assert.deepEqual(query.dimensions, [{ code: 'AAR', filter: 'item', values: ['2024'] }]);
    assert.deepEqual(query.response, { format: 'json-stat2' });
});

test('filter "top" faller tilbake til topCount = "5"', () => {
    const query = buildQuery([{ code: 'AAR' }], { AAR: { filter: 'top' } }, 'json-stat2', '');
    assert.deepEqual(query.dimensions[0], { code: 'AAR', filter: 'top', values: ['5'] });
});

test('filter "all" uten values gir wildcard', () => {
    const query = buildQuery([{ code: 'GEO' }], { GEO: { filter: 'all', values: [] } }, 'json-stat2', '');
    assert.deepEqual(query.dimensions[0], { code: 'GEO', filter: 'all', values: ['*'] });
});

test('tomt maxRowCount utelates response.maxRowCount', () => {
    const query = buildQuery([], {}, 'json-stat2', '');
    assert.equal('maxRowCount' in query.response, false);
});

test('satt maxRowCount parses til tall', () => {
    const query = buildQuery([], {}, 'json-stat2', '100');
    assert.equal(query.response.maxRowCount, 100);
});

test('findMetricDimension finner ContentsCode når role mangler', () => {
    const previewData = {
        id: ['ContentsCode', 'GEO'],
        dimension: { ContentsCode: {}, GEO: {} }
    };
    assert.equal(findMetricDimension(previewData), 'ContentsCode');
});

test('findMetricDimension bruker role="metric" først', () => {
    const previewData = {
        id: ['GEO', 'MEASURE'],
        dimension: { GEO: {}, MEASURE: { role: 'metric' } }
    };
    assert.equal(findMetricDimension(previewData), 'MEASURE');
});
```

- [ ] **Step 6: Kjør testene**

Run: `node --test js/lib/query.test.mjs`
Expected: PASS, 7 tester grønne.

- [ ] **Step 7: Flytt `generatePowerQueryCode`**

Flytt kroppen (index.html:1012-1032) til `js/lib/powerquery.mjs`, med `API_BASE`, `selectedSource.id` og `selectedTable.tableId` som eksplisitte parametere i stedet for lukkingsvariabler:

```js
export function generatePowerQueryCode(finalQuery, apiBase, sourceId, tableId) {
    if (!finalQuery || !sourceId || !tableId) return '';

    const url = apiBase + '/' + sourceId + '/Table/' + tableId + '/data';
    const jsonFormatted = JSON.stringify(finalQuery, null, 12).split('\n').join('\n        ');
    const jsonEscaped = jsonFormatted.replace(/"/g, '""');

    const powerQueryCode = 'let\n' +
        '    url="' + url + '",\n' +
        '    jsonBody= "' + jsonEscaped + '",\n' +
        '    \n' +
        '    WebCall = Web.Contents(url, [Headers=[#"Content-Type"="application/json"], Content=Text.ToBinary(jsonBody)]),\n' +
        '    \n' +
        '    LinesFromBinary = Lines.FromBinary(WebCall),\n' +
        '    ConvertToTable = Table.FromList(LinesFromBinary, Splitter.SplitTextByDelimiter(";"), null, null, ExtraValues.Error),\n' +
        '    #"Promoted Headers" = Table.PromoteHeaders(ConvertToTable, [PromoteAllScalars=true])\n' +
        'in\n' +
        '    #"Promoted Headers"';

    return powerQueryCode;
}
```

(Merk: originalen sjekket `!selectedSource || !selectedTable`; den nye versjonen sjekker `!sourceId || !tableId` — samme betingelse uttrykt via de allerede uthentede feltene som kalleren i `app.js` sender inn.)

- [ ] **Step 8: Skriv test for `generatePowerQueryCode`**

`js/lib/powerquery.test.mjs`:

```js
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
```

- [ ] **Step 9: Kjør alle testene i `js/lib/`**

Run: `node --test js/lib`
Expected: PASS, alle tester grønne (smoke + geo + query + powerquery).

- [ ] **Step 10: Commit**

```bash
git add js/lib
git commit -m "refactor: skill ut geo-/spørrings-/PowerQuery-logikk til js/lib med tester"
```

---

### Task 8: Skill ut CSV-parsing og tabell-labels til `js/lib/`

**Files:**
- Create: `js/lib/csv.mjs`
- Create: `js/lib/csv.test.mjs`
- Create: `js/lib/tableLabels.mjs`
- Create: `js/lib/tableLabels.test.mjs`

**Interfaces:**
- Produces: `parseTableLabelsCSV(text)` fra `js/lib/csv.mjs` → `{ [tableId]: { label, category } }`
- Produces: `getTableLabel(tableLabels, table)`, `getTableCategory(tableLabels, table)`, `flattenCategories(categories)` fra `js/lib/tableLabels.mjs`

- [ ] **Step 1: Flytt `parseTableLabelsCSV` (renset, jf. Task 3)**

```js
export function parseTableLabelsCSV(text) {
    const lines = text.split('\n');
    const result = {};

    if (lines.length < 2) {
        console.error('CSV-filen er tom eller har ingen data-linjer');
        return result;
    }

    const headerLine = lines[0].trim();
    const separator = ',';

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            const nextChar = line[j + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    j++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === separator && !inQuotes) {
                cells.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }

        if (current) {
            cells.push(current.trim().replace(/^"|"$/g, ''));
        }

        // Kolonner: 0=source_id, 1=tableId, 2=title, 3=label, 4=category
        if (cells.length > 3 && cells[1]) {
            const tableId = cells[1];
            const label = cells[3];
            const category = cells[4] || '';

            if (tableId && label) {
                result[tableId] = { label: label, category: category };
            }
        }
    }

    return result;
}
```

(`headerLine` parses ikke lenger til `headerCells` siden originalen aldri brukte `headerCells` til noe annet enn debug-logging, fjernet i Fase 1 Task 3.)

- [ ] **Step 2: Skriv test**

`js/lib/csv.test.mjs`:

```js
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
```

- [ ] **Step 3: Kjør testen**

Run: `node --test js/lib/csv.test.mjs`
Expected: PASS, 3 tester grønne.

- [ ] **Step 4: Flytt `getTableLabel`/`getTableCategory`/`flattenCategories`**

`js/lib/tableLabels.mjs` — merk at de to første nå tar `tableLabels` som eksplisitt første parameter i stedet for å lese det fra lukking:

```js
export function getTableLabel(tableLabels, table) {
    if (tableLabels && tableLabels[table.tableId]) {
        const labelData = tableLabels[table.tableId];
        return typeof labelData === 'object' ? labelData.label : labelData;
    }
    return table.label || table.title || table.name;
}

export function getTableCategory(tableLabels, table) {
    if (tableLabels && tableLabels[table.tableId]) {
        const labelData = tableLabels[table.tableId];
        return typeof labelData === 'object' ? labelData.category : '';
    }
    return '';
}

export function flattenCategories(categories) {
    const result = { index: [], label: {} };

    function traverse(items) {
        if (!items || !Array.isArray(items)) return;
        items.forEach(function(item) {
            if (item.categories) {
                traverse(item.categories);
            } else if (item.index !== undefined) {
                result.index.push(item.index);
                result.label[item.index] = item.label || item.index;
            }
        });
    }

    traverse(categories);
    return result;
}
```

> **Viktig:** Verifiser `flattenCategories`-kroppen mot den faktiske originalen på index.html:582-601 før du limer inn — traverseringslogikken over er rekonstruert fra funksjonssignaturen og bruksmønsteret (kalles fra `fetchDimensions` på hierarkiske `dim.categories`) og kan avvike i detaljer fra originalen. Diff mot originalfilen og korriger om nødvendig før du går videre.

- [ ] **Step 5: Skriv tester**

`js/lib/tableLabels.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getTableLabel, getTableCategory, flattenCategories } from './tableLabels.mjs';

test('getTableLabel bruker tableLabels-oppslag når tilgjengelig', () => {
    const tableLabels = { '123': { label: 'Fint navn', category: 'Skole' } };
    assert.equal(getTableLabel(tableLabels, { tableId: '123', title: 'Raw' }), 'Fint navn');
});

test('getTableLabel faller tilbake til table.title uten oppslag', () => {
    assert.equal(getTableLabel({}, { tableId: '999', title: 'Raw tittel' }), 'Raw tittel');
});

test('getTableCategory returnerer tom streng uten oppslag', () => {
    assert.equal(getTableCategory({}, { tableId: '999' }), '');
});

test('flattenCategories flater ut ett nivå', () => {
    const result = flattenCategories([{ index: '03', label: 'Viken' }, { index: '11', label: 'Rogaland' }]);
    assert.deepEqual(result.index, ['03', '11']);
    assert.equal(result.label['03'], 'Viken');
});
```

- [ ] **Step 6: Kjør testene**

Run: `node --test js/lib/tableLabels.test.mjs`
Expected: PASS (juster testen for `flattenCategories` dersom Step 4 sin advarsel avdekket avvik fra originalen).

- [ ] **Step 7: Commit**

```bash
git add js/lib
git commit -m "refactor: skill ut CSV-parsing og tabell-label-oppslag til js/lib med tester"
```

---

### Task 9: Skill ut sikker HTML-rendering og ikoner

**Files:**
- Create: `js/lib/html.mjs`
- Create: `js/lib/html.test.mjs`
- Create: `js/components/icons.mjs`

**Interfaces:**
- Produces: `parseHtmlToTree(htmlString)` fra `js/lib/html.mjs` — ren, React-uavhengig parsing (testbar uten React i Node).
- Produces: `parseHTML(htmlString, h)` fra `js/lib/html.mjs` — samme oppførsel som originalen, men tar `h` (React.createElement) som parameter i stedet for lukking.
- Produces: `Icons`, `getSourceIcon(source)` fra `js/components/icons.mjs`.

**Hvorfor splitte `parseHTML` i to funksjoner:** Originalen (index.html:100-202) kaller `h = React.createElement` direkte fra en ytre lukking, noe som gjør den umulig å enhetsteste i Node uten å installere `react` som avhengighet (i strid med zero-build-kravet). Ved å dele parsingen (ren, ingen avhengigheter) fra render-steget (tar `h` som parameter) kan parse-logikken — den delen med reell risiko for bugs (tag-stack, sitering, selvlukkende tagger) — testes med en enkel stub-funksjon i stedet for ekte React.

- [ ] **Step 1: Opprett `js/lib/html.mjs`**

Flytt tre-bygging-delen av originalen (index.html:103-163) inn i en egen eksportert funksjon, og render-delen (index.html:166-199) inn i en funksjon som tar `h` som parameter:

```js
export function parseHtmlToTree(htmlString) {
    if (typeof htmlString !== 'string') return htmlString;

    const result = [];
    let lastIndex = 0;
    const tagRegex = /<\/?(\w+)((?:\s+[\w:]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
    let match;
    const stack = [];

    while ((match = tagRegex.exec(htmlString)) !== null) {
        if (match.index > lastIndex) {
            const text = htmlString.substring(lastIndex, match.index);
            if (stack.length === 0) {
                result.push(text);
            } else {
                stack[stack.length - 1].children.push(text);
            }
        }

        const tagName = match[1].toLowerCase();
        const isClosing = match[0].startsWith('</');

        if (isClosing) {
            if (stack.length > 0 && stack[stack.length - 1].tag === tagName) {
                const element = stack.pop();
                if (stack.length === 0) {
                    result.push(element);
                } else {
                    stack[stack.length - 1].children.push(element);
                }
            }
        } else {
            const element = {
                tag: tagName,
                children: [],
                self: match[0].endsWith('/')
            };

            if (element.self || ['br', 'hr'].includes(tagName)) {
                if (stack.length === 0) {
                    result.push(element);
                } else {
                    stack[stack.length - 1].children.push(element);
                }
            } else {
                stack.push(element);
            }
        }

        lastIndex = tagRegex.lastIndex;
    }

    if (lastIndex < htmlString.length) {
        const text = htmlString.substring(lastIndex);
        if (stack.length === 0) {
            result.push(text);
        } else {
            stack[stack.length - 1].children.push(text);
        }
    }

    return result;
}

export function parseHTML(htmlString, h) {
    const tree = parseHtmlToTree(htmlString);
    if (typeof tree !== 'object' || tree === null) return tree;

    function renderElement(el, idx) {
        if (typeof el === 'string') return el;
        if (!el.tag) return el;

        const children = el.children.map((child, i) => renderElement(child, i));

        switch (el.tag) {
            case 'strong':
            case 'b':
                return h('strong', { key: idx, className: 'font-bold' }, children);
            case 'em':
            case 'i':
                return h('em', { key: idx, style: { fontStyle: 'italic' } }, children);
            case 'p':
                return h('p', { key: idx, style: { marginBottom: '0.5rem' } }, children);
            case 'ul':
                return h('ul', { key: idx, style: { marginLeft: '1.5rem', marginBottom: '0.5rem', listStyleType: 'disc' } }, children);
            case 'ol':
                return h('ol', { key: idx, style: { marginLeft: '1.5rem', marginBottom: '0.5rem', listStyleType: 'decimal' } }, children);
            case 'li':
                return h('li', { key: idx, style: { marginBottom: '0.25rem' } }, children);
            case 'br':
                return h('br', { key: idx });
            case 'hr':
                return h('hr', { key: idx, style: { margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' } });
            default:
                return h('div', { key: idx }, children);
        }
    }

    return tree.map((el, idx) => renderElement(el, idx));
}
```

- [ ] **Step 2: Skriv tester for `parseHtmlToTree` (ingen React nødvendig)**

`js/lib/html.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHtmlToTree, parseHTML } from './html.mjs';

test('parser nøstet HTML til et treeobjekt', () => {
    const tree = parseHtmlToTree('<p>Hei <strong>verden</strong></p>');
    assert.equal(tree.length, 1);
    assert.equal(tree[0].tag, 'p');
    assert.equal(tree[0].children[0], 'Hei ');
    assert.equal(tree[0].children[1].tag, 'strong');
    assert.equal(tree[0].children[1].children[0], 'verden');
});

test('rå tekst uten tagger gir én tekst-node', () => {
    assert.deepEqual(parseHtmlToTree('bare tekst'), ['bare tekst']);
});

test('parseHTML bruker injisert h-funksjon (ingen React nødvendig)', () => {
    const calls = [];
    const stubH = (tag, props, children) => {
        calls.push(tag);
        return { tag, props, children };
    };
    const result = parseHTML('<p><strong>Bold</strong></p>', stubH);
    assert.deepEqual(calls, ['strong', 'p']);
    assert.equal(result[0].tag, 'p');
});
```

- [ ] **Step 3: Kjør testene**

Run: `node --test js/lib/html.test.mjs`
Expected: PASS, 3 tester grønne.

- [ ] **Step 4: Flytt `Icons` og `getSourceIcon`**

Flytt `Icons`-objektet (index.html:35-97) og `getSourceIcon` (index.html:203-320) verbatim til `js/components/icons.mjs`, med `h` importert fra React-global i toppen av filen:

```js
const h = React.createElement;

export const Icons = {
    // ... uendret innhold fra index.html:35-97 ...
};

export function getSourceIcon(source) {
    // ... uendret kropp fra index.html:203-320 ...
}
```

Ingen automatisert test her — ren SVG-presentasjonslogikk uten forgreninger verdt å låse med enhetstester. Verifiseres visuelt i Task 10 sin manuelle sjekk.

- [ ] **Step 5: Commit**

```bash
git add js/lib/html.mjs js/lib/html.test.mjs js/components/icons.mjs
git commit -m "refactor: skill ut sikker HTML-parsing (testbar) og ikoner til js/"
```

---

### Task 10: Skill ut skjermbilde-komponentene og skriv `js/app.js`

Dette er hovedoppgaven i dekomponeringen: hver `render*`-funksjon flyttes til sin egen fil, og en ny, mye slankere `js/app.js` erstatter hele det opprinnelige inline-scriptet i `index.html`.

**Files:**
- Create: `js/components/StepIndicator.mjs`
- Create: `js/components/SourceSelection.mjs`
- Create: `js/components/TableSelection.mjs`
- Create: `js/components/DimensionConfiguration.mjs`
- Create: `js/components/QueryResult.mjs`
- Create: `js/components/MetadataModal.mjs`
- Create: `js/app.js`
- Modify: `index.html` (fjern hele det gamle inline-scriptet, last `js/app.js` som modul)

**Interfaces:**
- Hver `render*`-funksjon eksporteres med **eksakt samme navn** og tar som parametere de identifikatorene som ble funnet ved gjennomgang av hver funksjons kropp (listet under per fil). Fordi parameternavnene er identiske med de opprinnelige lukkingsvariablene, er funksjonskroppene uendret ved flytting.

- [ ] **Step 1: `js/components/StepIndicator.mjs`**

Flytt kroppen av `renderStepIndicator` (index.html:1035-1104, etter Fase 1) verbatim:

```js
const h = React.createElement;

export function renderStepIndicator(step, selectedSource, selectedTable, finalQuery, setStep) {
    // ... uendret kropp fra index.html:1035-1104 ...
}
```

- [ ] **Step 2: `js/components/SourceSelection.mjs`**

Flytt kroppen av `renderSourceSelection` (index.html:1104-1205, etter Task 5 sin endring av global-søk-klikk til å bruke `selectSourceAndTable`) verbatim:

```js
const h = React.createElement;

export function renderSourceSelection(
    sources, tables, globalSearch, loading, error,
    selectSource, selectSourceAndTable, setGlobalSearch,
    getSourceIcon, getTableLabel
) {
    // ... uendret kropp fra index.html:1104-1205 ...
    // getTableLabel(table) i originalen blir getTableLabel(table) uendret HER,
    // fordi app.js (Step 7) sender inn en allerede tableLabels-bundet versjon —
    // se "Bundne hjelpefunksjoner" i Step 7.
}
```

- [ ] **Step 3: `js/components/TableSelection.mjs`**

Flytt kroppen av `renderTableSelection` (index.html:1205-1315) verbatim. Parametere identifisert ved gjennomgang av lukkingsreferanser i denne funksjonen: `error, expandedCategories, getTableCategory, getTableLabel, loading, selectTable, selectedSource, setExpandedCategories, setStep, setTableSearch, step, tableSearch, tables`.

```js
const h = React.createElement;

export function renderTableSelection(
    tables, selectedSource, tableSearch, expandedCategories, loading, error, step,
    selectTable, setTableSearch, setExpandedCategories, setStep,
    getTableLabel, getTableCategory
) {
    // ... uendret kropp fra index.html:1205-1315 ...
}
```

- [ ] **Step 4: `js/components/DimensionConfiguration.mjs`**

Flytt kroppen av `renderDimensionConfiguration` (index.html:1315-1813) verbatim. Identifiserte parametere: `buildFinalQuery, dimensions, error, expandedCounties, expandedMunicipalities, firstSentence, geoSearch, getGeographyGroups, getTableLabel, loading, maxRowCount, queryConfig, responseFormat, selectedSource, selectedTable, setExpandedCounties, setExpandedMunicipalities, setGeoSearch, setMaxRowCount, setResponseFormat, setStep, step, updateDimensionConfig`.

**Viktig tillegg, ikke fanget av identifikator-søket (as-is-kall, ikke `set*`/`get*`-navn):** "Informasjon om tabellen"-knappen (opprinnelig index.html:1328) kaller `fetchMetadata(selectedSource.id, selectedTable.tableId, { openModal: true })` direkte — jf. Task 5. Denne må også sendes inn som parameter.

```js
const h = React.createElement;

export function renderDimensionConfiguration(
    dimensions, queryConfig, selectedSource, selectedTable, step,
    responseFormat, maxRowCount, loading, error, firstSentence,
    geoSearch, expandedCounties, expandedMunicipalities,
    updateDimensionConfig, buildFinalQuery, getGeographyGroups, getTableLabel, fetchMetadata,
    setGeoSearch, setExpandedCounties, setExpandedMunicipalities,
    setResponseFormat, setMaxRowCount, setStep
) {
    // ... uendret kropp fra index.html:1315-1813 ...
}
```

> **Merk til den som utfører oppgaven:** Dette er den nest største funksjonen i appen (~500 linjer). Flytt kroppen mekanisk uendret. Hvis du under flyttingen støter på en lukkingsvariabel som *ikke* står i parameterlisten over, er identifikasjonen i denne planen ufullstendig — legg til parameteren i signaturen (samme navn som originalen brukte), oppdater kallet fra `app.js` (Step 8) tilsvarende, og noter avviket i commit-meldingen.

- [ ] **Step 5: `js/components/QueryResult.mjs`**

Flytt kroppen av `renderQueryResult` (index.html:1813-2649, etter Fase 1 sin fjerning av DEBUG-logger) verbatim. Identifiserte parametere: `API_BASE, copyToClipboard, dimensions, error, fetchPreview, finalQuery, findMetricDimension, firstSentence, generatePowerQueryCode, geoMappingUrl, getTableLabel, loading, outputFormat, previewData, selectedSource, selectedTable, setOutputFormat, setStep`. (`setDimensions/setFinalQuery/setPreviewData/setQueryConfig/setSelectedSource/setSelectedTable` dukket opp i identifikator-søket fordi "Start på nytt"-knappen nederst i denne funksjonen nullstiller hele skjemaet — behold disse i signaturen også.)

```js
const h = React.createElement;

export function renderQueryResult(
    finalQuery, selectedSource, selectedTable, dimensions,
    previewData, outputFormat, loading, error, firstSentence, geoMappingUrl,
    fetchPreview, copyToClipboard, generatePowerQueryCode, findMetricDimension, getTableLabel,
    setOutputFormat, setStep,
    setSelectedSource, setSelectedTable, setDimensions, setQueryConfig, setFinalQuery, setPreviewData,
    API_BASE
) {
    // ... uendret kropp fra index.html:1813-2649 ...
}
```

> Samme merknad som i Step 4 gjelder her — verifiser mot originalen og legg til eventuelle manglende parametere i både signatur og kall.

- [ ] **Step 6: `js/components/MetadataModal.mjs`**

Flytt kroppen av `renderMetadataModal` (inkludert den nøstede `parseRelatedMaterialLinks`, index.html:681-787) verbatim. Oppdater det ene kallet til `parseHTML(paragraph.content)` (index.html:774) til `parseHTML(paragraph.content, h)`, jf. Task 9 sin nye signatur.

```js
import { parseHTML } from '../lib/html.mjs';

const h = React.createElement;

export function closeMetadataModal(setShowMetadataModal) {
    setShowMetadataModal(false);
}

export function renderMetadataModal(showMetadataModal, tableMetadata, closeModalFn) {
    // ... uendret kropp fra index.html:681-787, med closeMetadataModal-kall
    // erstattet av closeModalFn(), og parseHTML(paragraph.content) erstattet
    // av parseHTML(paragraph.content, h) ...
}
```

- [ ] **Step 7: Skriv `js/app.js` — orchestrator**

```js
import { Icons, getSourceIcon } from './components/icons.mjs';
import { parseTableLabelsCSV } from './lib/csv.mjs';
import { getTableLabel, getTableCategory, flattenCategories } from './lib/tableLabels.mjs';
import { getGeographyGroups } from './lib/geo.mjs';
import { findMetricDimension, buildQuery } from './lib/query.mjs';
import { generatePowerQueryCode } from './lib/powerquery.mjs';
import { renderStepIndicator } from './components/StepIndicator.mjs';
import { renderSourceSelection } from './components/SourceSelection.mjs';
import { renderTableSelection } from './components/TableSelection.mjs';
import { renderDimensionConfiguration } from './components/DimensionConfiguration.mjs';
import { renderQueryResult } from './components/QueryResult.mjs';
import { renderMetadataModal, closeMetadataModal as closeMetadataModalImpl } from './components/MetadataModal.mjs';

const { useState, useEffect, createElement: h } = React;
const API_BASE = 'https://statistikk-data.fhi.no/api/open/v1';

function FHIQueryBuilder() {
    const [step, setStep] = useState(1);
    const [sources, setSources] = useState([]);
    const [selectedSource, setSelectedSource] = useState(null);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [dimensions, setDimensions] = useState([]);
    const [queryConfig, setQueryConfig] = useState({});
    const [finalQuery, setFinalQuery] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [responseFormat, setResponseFormat] = useState('json-stat2');
    const [maxRowCount, setMaxRowCount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [globalSearch, setGlobalSearch] = useState('');
    const [allTables, setAllTables] = useState([]);
    const [tableSearch, setTableSearch] = useState('');
    const [outputFormat, setOutputFormat] = useState('json');
    const [geoSearch, setGeoSearch] = useState('');
    const [expandedCounties, setExpandedCounties] = useState({});
    const [tableMetadata, setTableMetadata] = useState(null);
    const [firstSentence, setFirstSentence] = useState('');
    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const [expandedMunicipalities, setExpandedMunicipalities] = useState({});
    const [tableLabels, setTableLabels] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [geoMappingUrl] = useState('https://raw.githubusercontent.com/janhli/FHI-API-Query-Builder/main/geo_mapping.csv');

    useEffect(() => {
        fetchSources();
        fetchTableLabels();
    }, []);

    useEffect(() => {
        function handleEscKey(e) {
            if (e.key === 'Escape' && showMetadataModal) closeMetadataModal();
        }
        document.addEventListener('keydown', handleEscKey);
        return function() {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [showMetadataModal]);

    useEffect(() => {
        let sentence = '';
        if (tableMetadata && tableMetadata.paragraphs && Array.isArray(tableMetadata.paragraphs)) {
            for (let i = 0; i < tableMetadata.paragraphs.length; i++) {
                if (tableMetadata.paragraphs[i].header !== 'Geografi') {
                    let text = tableMetadata.paragraphs[i].content;
                    if (typeof text === 'string') {
                        const match = text.match(/^[^!?]*?\.(?=\s[A-Z]|$)|^[^!?]*?[!?]/);
                        if (match) {
                            sentence = match[0].trim().replace(/<[^>]*>/g, '');
                            break;
                        }
                    }
                }
            }
        }
        setFirstSentence(sentence);
    }, [tableMetadata]);

    async function fetchSources() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_BASE + '/Common/source');
            if (!response.ok) throw new Error('Kunne ikke hente kilder');
            const data = await response.json();
            setSources(data);

            const promises = data.map(async function(source) {
                try {
                    const resp = await fetch(API_BASE + '/' + source.id + '/Table');
                    if (resp.ok) {
                        const tables = await resp.json();
                        return tables.map(function(table) {
                            return Object.assign({}, table, { sourceId: source.id, sourceName: source.title || source.name });
                        });
                    }
                } catch (e) {
                    return [];
                }
                return [];
            });
            const results = await Promise.all(promises);
            const flatTables = results.reduce(function(acc, tables) { return acc.concat(tables); }, []);
            setAllTables(flatTables);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTableLabels() {
        try {
            const response = await fetch('./fhi_table_label_mapping.csv');
            if (!response.ok) throw new Error('Kunne ikke hente tabell-labels (status: ' + response.status + ')');
            const csvText = await response.text();
            setTableLabels(parseTableLabelsCSV(csvText));
        } catch (err) {
            console.error('Kunne ikke hente tabell-labels:', err.message);
        }
    }

    async function fetchTables(sourceId) {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_BASE + '/' + sourceId + '/Table');
            if (!response.ok) throw new Error('Kunne ikke hente tabeller');
            setTables(await response.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchDimensions(sourceId, tableId) {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_BASE + '/' + sourceId + '/Table/' + tableId + '/dimension');
            if (!response.ok) throw new Error('Kunne ikke hente dimensjoner');
            const data = await response.json();

            let dimensionsArray = data;
            if (data && typeof data === 'object' && !Array.isArray(data) && data.dimensions) {
                dimensionsArray = data.dimensions;
            }
            if (!Array.isArray(dimensionsArray)) {
                console.error('Uventet data format:', data);
                throw new Error('Kunne ikke finne dimensions i API-responsen');
            }

            dimensionsArray = dimensionsArray.map(function(dim) {
                if (dim.categories && !dim.category) {
                    dim.category = flattenCategories(dim.categories);
                }
                return dim;
            });

            setDimensions(dimensionsArray);

            const initialConfig = {};
            dimensionsArray.forEach(function(dim) {
                initialConfig[dim.code] = { filter: 'all', values: ['*'], selectedCategories: [] };
            });
            setQueryConfig(initialConfig);
        } catch (err) {
            setError(err.message);
            setDimensions([]);
        } finally {
            setLoading(false);
        }
    }

    async function fetchMetadata(sourceId, tableId, options) {
        const openModal = Boolean(options && options.openModal);
        try {
            const response = await fetch(API_BASE + '/' + sourceId + '/Table/' + tableId + '/metadata');
            if (!response.ok) throw new Error('Kunne ikke hente metadata');
            const data = await response.json();
            setTableMetadata(data);
            if (openModal) setShowMetadataModal(true);
        } catch (err) {
            if (openModal) setError(err.message);
        }
    }

    async function fetchPreview() {
        if (!finalQuery) return;
        setLoading(true);
        setError(null);
        try {
            const previewQuery = JSON.parse(JSON.stringify(finalQuery));
            previewQuery.response.format = 'json-stat2';

            const response = await fetch(
                API_BASE + '/' + selectedSource.id + '/Table/' + selectedTable.tableId + '/data',
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(previewQuery) }
            );

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    if (errorData.errors) {
                        const errorMessages = [];
                        for (const field in errorData.errors) {
                            errorMessages.push(field + ': ' + errorData.errors[field][0]);
                        }
                        throw new Error('Validationsfeil: ' + errorMessages.join(', '));
                    }
                    throw new Error(errorData.message || 'Kunne ikke hente data');
                } catch (parseError) {
                    throw new Error('Kunne ikke hente preview: ' + response.statusText + ' - ' + parseError.message);
                }
            }

            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/csv')) {
                data = { csvText: await response.text() };
            } else {
                data = await response.json();
            }
            setPreviewData(data);
        } catch (err) {
            setError(err.message || 'Feil ved henting av preview');
        } finally {
            setLoading(false);
        }
    }

    function selectSourceAndTable(source, table) {
        setSelectedSource(source);
        setSelectedTable(table);
        setDimensions([]);
        setQueryConfig({});
        setFinalQuery(null);
        setPreviewData(null);
        setTableSearch('');
        setGlobalSearch('');
        setShowMetadataModal(false);
        fetchDimensions(source.id, table.tableId);
        fetchMetadata(source.id, table.tableId);
        setStep(3);
    }

    function selectSource(source) {
        setSelectedSource(source);
        setSelectedTable(null);
        setDimensions([]);
        setQueryConfig({});
        setFinalQuery(null);
        setPreviewData(null);
        setTableSearch('');
        setExpandedCategories({});
        fetchTables(source.id);
        setStep(2);
    }

    function selectTable(table) {
        selectSourceAndTable(selectedSource, table);
    }

    function updateDimensionConfig(dimCode, updates) {
        setQueryConfig(function(prev) {
            const newConfig = Object.assign({}, prev);
            newConfig[dimCode] = Object.assign({}, prev[dimCode], updates);
            return newConfig;
        });
    }

    function buildFinalQuery() {
        setFinalQuery(buildQuery(dimensions, queryConfig, responseFormat, maxRowCount));
        setStep(4);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        alert('Kopiert til utklippstavle!');
    }

    function closeMetadataModal() {
        closeMetadataModalImpl(setShowMetadataModal);
    }

    const boundGetTableLabel = (table) => getTableLabel(tableLabels, table);
    const boundGetTableCategory = (table) => getTableCategory(tableLabels, table);
    const boundGeneratePowerQueryCode = () => generatePowerQueryCode(
        finalQuery, API_BASE, selectedSource && selectedSource.id, selectedTable && selectedTable.tableId
    );

    return h('div', { className: 'bg-gradient' },
        h('a', { href: '#main-content', className: 'skip-link' }, 'Gå til hovedinnhold'),
        renderMetadataModal(showMetadataModal, tableMetadata, closeMetadataModal),
        h('div', { className: 'container', id: 'main-content', tabIndex: -1 },
            h('div', { className: 'text-center mb-8' },
                h('h1', { className: 'mb-2' }, 'FHI API Query Builder'),
                h('p', { className: 'text-gray-600' }, 'Bygg spørringer mot FHIs åpne statistikk-API. '),
                h('p', { className: 'text-gray-600' }, 'Velg kilde, tabell og variabler. Kopier JSON-spørring, innbyggingskode for Power Query eller last ned som CSV-fil.')
            ),
            renderStepIndicator(step, selectedSource, selectedTable, finalQuery, setStep),
            h('div', { className: 'card' },
                step === 1 && renderSourceSelection(
                    sources, tables, globalSearch, loading, error,
                    selectSource, selectSourceAndTable, setGlobalSearch,
                    getSourceIcon, boundGetTableLabel
                ),
                step === 2 && renderTableSelection(
                    tables, selectedSource, tableSearch, expandedCategories, loading, error, step,
                    selectTable, setTableSearch, setExpandedCategories, setStep,
                    boundGetTableLabel, boundGetTableCategory
                ),
                step === 3 && renderDimensionConfiguration(
                    dimensions, queryConfig, selectedSource, selectedTable, step,
                    responseFormat, maxRowCount, loading, error, firstSentence,
                    geoSearch, expandedCounties, expandedMunicipalities,
                    updateDimensionConfig, buildFinalQuery, getGeographyGroups, boundGetTableLabel, fetchMetadata,
                    setGeoSearch, setExpandedCounties, setExpandedMunicipalities,
                    setResponseFormat, setMaxRowCount, setStep
                ),
                step === 4 && renderQueryResult(
                    finalQuery, selectedSource, selectedTable, dimensions,
                    previewData, outputFormat, loading, error, firstSentence, geoMappingUrl,
                    fetchPreview, copyToClipboard, boundGeneratePowerQueryCode, findMetricDimension, boundGetTableLabel,
                    setOutputFormat, setStep,
                    setSelectedSource, setSelectedTable, setDimensions, setQueryConfig, setFinalQuery, setPreviewData,
                    API_BASE
                )
            ),
            h('div', { className: 'mt-6 text-center text-sm text-gray-600' },
                h('p', null, 'kontakt: ', h('a', { href: 'mailto:janli@afk.no', className: 'text-blue-600' }, 'janli@afk.no'))
            )
        )
    );
}

function mount() {
    ReactDOM.createRoot(document.getElementById('root')).render(h(FHIQueryBuilder));
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
} else {
    mount();
}
```

> **Merk:** `renderQueryResult`s signatur i Step 5 forventet `generatePowerQueryCode` som en funksjon uten argumenter (kalt fra innsiden av den flyttede JSX-koden, akkurat som originalen kalte `generatePowerQueryCode()` uten argumenter). `boundGeneratePowerQueryCode` over dekker det. Kontroller mot den faktiske flyttede koden i `QueryResult.mjs` at kallstedet fortsatt heter `generatePowerQueryCode()` (uten parenteser rundt argumenter) og juster om nødvendig. Samme prinsipp gjelder alle andre `bound*`-funksjoner: de finnes for at de flyttede komponentfilene skal kunne beholde sine opprinnelige, uendrede kallesteder (`getTableLabel(table)`, ikke `getTableLabel(tableLabels, table)`).

- [ ] **Step 8: Oppdater `index.html`**

Erstatt hele det opprinnelige inline-scriptet (fra `<script>` rett under `<div id="root"></div>` til den avsluttende `</script>`, dvs. hele blokken som tidligere utgjorde index.html:27-2715) med:

```html
<script type="module" src="./js/app.js"></script>
```

Behold de to React UMD `<script>`-taggene i `<head>` uendret, og behold GoatCounter-scriptet og lisens-kommentaren.

- [ ] **Step 9: Manuell verifisering — full gjennomgang**

Start en lokal statisk server fra repo-roten (`python -m http.server 8000` eller tilsvarende) og gå gjennom **hele** brukerflyten i nettleseren:
1. Steg 1: søk globalt etter en tabell og klikk på et treff → skal havne på steg 3 med riktig kilde/tabell valgt.
2. Steg 1: velg en kilde direkte → steg 2 med tabelliste.
3. Steg 2: søk i tabeller, velg en tabell → steg 3.
4. Steg 3: konfigurer minst én dimensjon med hver filtertype (item/all/top), inkludert en GEO-dimensjon (velg fylke/kommune/bydel). Klikk "Informasjon om tabellen" → modal åpnes med formatert tekst (fet/kursiv/lister rendres korrekt, jf. Task 9).
5. Steg 4: bekreft at JSON-spørringen, Power Query-koden og Geo-Mapping-URL-en vises korrekt, hent forhåndsvisning, last ned CSV, og bekreft at "Start på nytt" nullstiller til steg 1.

Bekreft at DevTools-konsollen er fri for feil og React-advarsler gjennom hele flyten.

- [ ] **Step 10: Commit**

```bash
git add index.html js/app.js js/components
git commit -m "refactor: splitt FHIQueryBuilder i js/app.js + separate komponentmoduler"
```

---

### Task 11: Legg til CI som kjører testene

**Files:**
- Create: `.github/workflows/test.yml`

**Interfaces:** Ingen — kjører kun `node --test`.

- [ ] **Step 1: Opprett workflow**

`.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: ["main"]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node --test js
```

- [ ] **Step 2: Verifiser lokalt at kommandoen CI kjører faktisk passerer**

Run: `node --test js`
Expected: PASS, alle tester i `js/lib/*.test.mjs` grønne, 0 feil.

- [ ] **Step 3: Commit og push, bekreft i GitHub Actions-fanen at workflowen kjører grønt**

```bash
git add .github/workflows/test.yml
git commit -m "ci: kjør node --test på push og pull request"
```

---

## Fase 3 — Polish

### Task 12: Tilgjengelighet — aria-labels på ikon-only-knapper og fokus i modal

**Problem:** Flere knapper i appen inneholder kun et SVG-ikon uten synlig tekst (kopier-knappene i `QueryResult.mjs`, f.eks. index.html:1910-1918 og 1932-1939 i originalen) og har `title`-attributt men ikke `aria-label` — skjermlesere leser da ofte ingenting nyttig ut fra `title` alene på en knapp. Metadata-modalen (`MetadataModal.mjs`) har Esc-håndtering (bra), men flytter ikke fokus inn i modalen ved åpning eller tilbake til utløserknappen ved lukking.

**Files:**
- Modify: `js/components/QueryResult.mjs` (kopier-knapper)
- Modify: `js/components/MetadataModal.mjs` (fokushåndtering)

- [ ] **Step 1: Legg til `aria-label` på alle ikon-only-knapper i `QueryResult.mjs`**

For hver `h('button', { ..., title: 'Kopier X', ... }, h(Icons.Copy))`, legg til `'aria-label': 'Kopier X'` (samme tekst som `title`) i props-objektet, slik at skjermlesere alltid får en tilgjengelig navn på knappen uavhengig av `title`-støtte.

- [ ] **Step 2: Flytt fokus inn i modalen ved åpning**

I `js/components/MetadataModal.mjs`, importer `useEffect` og `useRef` fra React og legg til en effekt som setter fokus på modalens overskrift (eller lukk-knapp) når `showMetadataModal` blir `true`:

```js
const { useEffect, useRef } = React;
```

Inne i `renderMetadataModal`, legg til en `ref` på modalens ytre `<div>` eller på lukk-knappen, og:

```js
const closeButtonRef = useRef(null);

useEffect(() => {
    if (showMetadataModal && closeButtonRef.current) {
        closeButtonRef.current.focus();
    }
}, [showMetadataModal]);
```

Knytt `ref: closeButtonRef` til modalens lukk-knapp (`h('button', { ref: closeButtonRef, ... })`).

- [ ] **Step 3: Verifiser manuelt med tastatur**

Naviger til steg 3, klikk "Informasjon om tabellen" kun med tastatur (Tab + Enter), bekreft at fokus havner i modalen ved åpning, at Tab holder fokus innenfor modalen (eller i det minste ikke forsvinner usynlig bak den), og at Esc lukker modalen og fører fokus tilbake til knappen som åpnet den. Test også med en skjermleser (f.eks. innebygd Windows Narrator) at kopier-knappene annonseres med meningsfull tekst.

- [ ] **Step 4: Commit**

```bash
git add js/components/QueryResult.mjs js/components/MetadataModal.mjs
git commit -m "fix: aria-label på ikon-knapper og fokushåndtering i metadata-modal"
```

---

### Task 13: Oppdater README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Legg til et "Utviklerinformasjon"-avsnitt**

Legg til, etter "## Teknisk informasjon"-seksjonen, en kort beskrivelse av den nye filstrukturen og hvordan man kjører appen og testene lokalt:

```markdown
### Filstruktur

- `index.html` — HTML-skall, laster `js/app.js` som ES-modul
- `js/app.js` — hovedkomponent: state, effekter og sammensetning av skjermbildene
- `js/lib/` — ren logikk (CSV-parsing, geografi-gruppering, spørringsbygging, Power Query-kodegenerering, sikker HTML-rendering) — hver fil har en tilhørende `*.test.mjs`
- `js/components/` — ett skjermbilde/UI-element per fil

### Kjøre lokalt

Appen bruker native ES-moduler og må serveres over http(s), ikke åpnes direkte som `file://`:

```bash
python -m http.server 8000
# eller: npx serve
```

Åpne deretter `http://localhost:8000`.

### Kjøre tester

Ingen `npm install` nødvendig — testene bruker Node sin innebygde testrunner (krever Node 18+):

```bash
node --test js
```
```

- [ ] **Step 2: Fjern/oppdater "API-endepunkter som brukes"-seksjonen om nødvendig**

Bekreft at listen over API-endepunkter fortsatt stemmer (uendret av denne planen), og legg til en linje om at tabell-labels og geo-mapping nå hentes/lenkes same-origin fra repoet i stedet for via GitHub API.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: dokumenter ny filstruktur og hvordan kjøre appen/testene lokalt"
```

---

## Rekkefølge og uavhengighet

- **Fase 1 (Task 1-5)** kan shippes umiddelbart, uavhengig av resten — hver task er en egen commit med egen verifisering, og retter reelle driftsrisikoer (rate limit, frossen URL) og latent duplikasjon.
- **Fase 2 (Task 6-11)** bør gjøres i rekkefølge (6 → 7/8/9 kan gjøres i hvilken som helst innbyrdes rekkefølge siden de er uavhengige `js/lib`-filer → 10 avhenger av at 7-9 er ferdige → 11 avhenger av at 10 er ferdig, siden CI kjører `node --test js` mot hele treet).
- **Fase 3 (Task 12-13)** er uavhengig av Fase 2 i prinsippet, men Task 12 forutsetter at `QueryResult.mjs`/`MetadataModal.mjs` finnes (dvs. Task 10 må være gjort først) for at filstiene skal stemme.
