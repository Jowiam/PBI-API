![GitHub release (latest by date)](https://img.shields.io/github/v/release/janhli/FHI-API-Query-Builder?style=for-the-badge&color=007db9)
![License](https://img.shields.io/github/license/janhli/FHI-API-Query-Builder?style=for-the-badge&color=007db9)


# FHI API Query Builder

En interaktiv web-applikasjon som gjør det enkelt å bygge og kjøre spørringer mot FHIs åpne statistikk-API.

[Publisert versjon](https://janhli.github.io/FHI-API-Query-Builder/)

## Hva er det?

FHI API Query Builder er et visuelt verktøy som lar deg utforske og hente data fra [Folkehelseinstituttets statistikk-API](https://www.fhi.no/ta/statistikkalender_og_statistikk/apen-api-og-statistikk/) uten å måtte skrive API-kall manuelt. Appen har et brukervennlig grensesnitt hvor du velger data interaktivt, og får tilbake den JSON-spørringen du kan bruke i dine egne applikasjoner.

## Brukstilfeller

- **Dataanalytikere og forskere** som ønsker å hente norsk folkehelsedata for analyser
- **Utviklere** som skal integrere FHI-data i sine applikasjoner
- **Organisasjoner** som skal lage egne dashboards og rapporter basert på folkehelsesdata
- **Lærere og studenter** som skal lære om norsk folkehelsestatistikk

## Hvordan bruker jeg den?

### Trinn-for-trinn guide

1. **Åpne applikasjonen** i en moderne nettleser

2. **Velg datakilde** - I første skjerm velger du hvilken statistikkkilde du ønsker data fra
   - Se kort beskrivelse av hver kilde
   - Kildene inneholder ulike typer folkehelseinformasjon

3. **Velg tabell** - Når du har valgt en kilde, velger du hvilken tabell du ønsker
   - Du kan søke i tabellene for å finne det du trenger

4. **Konfigurer dimensjoner** - Her velger du hvilke variabler og verdier du vil ha med
   - **Filtertype**: Velg spesifikke verdier, alle verdier, eller for tidsvariabler - siste X år
   - **Geografi**: For geografiske data kan du velge alle kommuner, enkelt fylke, eller spesifikke kommune/bydel
   - **Tidsperiode**: For år-dimensjonen kan du velge enkeltår, eller siste X år
   - **Response format**: Velg JSON-stat2, CSV2 med labels eller CSV3 med koder
   - Klikk på "Informasjon om tabellen" for detaljer om hva tabellen inneholder

5. **Kopier eller last ned** - I siste skjerm:
   - Kopier JSON-spørringen, eller bytt til Power Query-fanen for innbyggingskode til Power BI/Excel
   - Hent forhåndsvisning av data
   - Last ned forhåndsvisningen som CSV-fil

### Eksempel

Hvis du vil hente dødsfall av demens (inkl. Alzheimers sykdom) fordelt på alder:

1. Velg "Dødsårsaksregisteret (DÅR)" som kilde
2. Velg tabellen "Dødsfall av demens (inkl. Alzheimers sykdom) etter alder" under kategorien "Demens"
3. Konfigurer dimensjonene (Dødsår, Alder, Dødsårsak, Måltall) - la stå på "Alle" for å ta med alt
4. Kopier JSON-spørringen eller hent forhåndsvisning og last ned som CSV

## Om FHI Statistikk API

Denne appen bygger på [FHI Statistikk sin åpne API](https://statistikk-data.fhi.no) ([om API-et](https://www.fhi.no/ta/statistikkalender_og_statistikk/apen-api-og-statistikk/)), som tilbyr fritt tilgjengelig norsk folkehelsestatistikk.

### Ressurser

- **API-dokumentasjon**: [https://github.com/folkehelseinstituttet/Fhi.Statistikk.OpenAPI](https://github.com/folkehelseinstituttet/Fhi.Statistikk.OpenAPI)
- **Datatyper**: Statistikken inneholder data om blant annet nasjonale prøver, helsedata, skoledata og mer
- **Oppdateringsfrekvens**: Varierer etter datakilde, typisk årlig eller oftere
- **Dekningsområde**: Hele Norge, med detaljer på fylke, kommune og bydel-nivå

### API-endepunkter som brukes

Appen bruker disse FHI API-endepunktene:

- `/Common/source` - Henter liste over tilgjengelige kilder
- `/{sourceId}/Table` - Henter tabeller for en gitt kilde
- `/{sourceId}/Table/{tableId}/dimension` - Henter dimensjoner (variabler) for en tabell
- `/{sourceId}/Table/{tableId}/metadata` - Henter detaljert informasjon om en tabell
- `/{sourceId}/Table/{tableId}/data` - Henter faktiske data basert på spørring

**Merk:** Tabell-labels og geo-mapping-data hentes og lenkes same-origin fra repoet i stedet for via GitHub API, noe som gir bedre pålitelighet og ytelse.

## Teknisk informasjon

### Arkitektur

Appen er en single-page application (SPA) bygget med:

- **React** - For UI-komponentene
- **Vanilla JavaScript** - For logikk
- **HTML/CSS** - For grunnleggende struktur og styling

Alt kjører i nettleseren din - ingen backend-server er nødvendig.

### Filstruktur

- `index.html` — HTML-skall, laster `js/app.js` som ES-modul
- `js/app.js` — hovedkomponent: state, effekter og sammensetning av skjermbildene
- `js/lib/` — ren logikk (CSV-parsing, tabell-label-oppslag, geografi-gruppering, spørringsbygging, Power Query-kodegenerering, sikker HTML-rendering, JSON-syntax-highlighting) — hver fil har en tilhørende `*.test.mjs`
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

### Hvilke formater støttes?

- **JSON-stat2** (anbefalt) - Strukturert JSON-format egnet for statistikk
- **CSV2** - CSV med labels (menneskelesbare navn)
- **CSV3** - CSV med koder (kort kodeversjoner)

### Data-struktur

Spørringer følger FHI APIets struktur:

```json
{
  "dimensions": [
    { "code": "AAR", "filter": "item", "values": ["2024"] },
    { "code": "GEO", "filter": "item", "values": ["03", "0301"] },
    { "code": "MEASURE_TYPE", "filter": "all", "values": ["*"] }
  ],
  "response": {
    "format": "json-stat2"
  }
}
```

### Geo-gruppering

For geografiske data (GEO-dimensjon) håndteres følgende nivåer:

- **2 sifre** - Fylker
- **4 sifre** - Kommuner
- **6 sifre** - Bydeler (Oslo)

Appen lar deg enkelt velge "alle kommuner i fylke X" eller "alle bydeler i Oslo".

### Tidsserier

For år-dimensjonen (AAR) kan du velge:

- `filter: "item"` - Spesifikke år
- `filter: "all"` - Alle år (wildcard)
- `filter: "top"` - Siste X år

### Maksimale antall rader

Du kan sette `maxRowCount` for å begrense antall rader i responsen. La feltet stå tomt for ubegrenset.

### Feilhåndtering

Hvis noe går galt:

- Sjekk at du har valgt alle påkrevde dimensjoner
- Noen kombinasjoner av data kan være skjult av personvernhensyn (færre enn 10 enheter)
- Se konsollen (F12) for detaljer

## Kompatibilitet

- Chrome/Edge (versjon 90+)
- Firefox (versjon 88+)
- Safari (versjon 14+)
- Fungerer på mobiltelefoner og nettbrett

## Kontakt og tilbakemelding

Utviklet av Akershus analyse, en del av Akershus fylkeskommune.

- **Kontakt**: janli@afk.no
- **Om Akershus analyse**: https://akershusanalyse.no/
- **Om Akershus fylkeskommune**: https://afk.no/

## Lisens
Denne programvaren er utviklet av Jan Hiroshi Lintvedt / Akershus fylkeskommune og deles som åpen kildekode
under [MIT-lisensen](./LICENSE). Dette innebærer at alle står fritt til å bruke, kopiere, endre og
distribuere programvaren, så lenge opphavsretten og lisensvilkårene beholdes.

Dataene fra FHI er tilgjengelig under [Norsk lisensfor offentlige data](https://data.norge.no/nlod/no/1.0).

## Versjon

Gjeldende versjon vises i badgen øverst i denne filen og på [GitHub Releases](https://github.com/janhli/FHI-API-Query-Builder/releases). Appen er under aktiv utvikling - tilbakemeldinger og forbedringer er velkommen!
