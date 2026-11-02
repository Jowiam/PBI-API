# FHI API Query Builder – lokal kopi

Dette prosjektet tar utgangspunkt i https://github.com/janhli/FHI-API-Query-Builder,
lastet ned fra `main` 2. november 2026. Originalens kode, dokumentasjon og
MIT-lisens er beholdt. Se `README.md` og `LICENSE`.

## Start

Kjør fra denne mappen:

```powershell
python .\API-powerbi.py
```

Åpne http://localhost:8000 i Edge eller Chrome. Stopp med Ctrl+C.
Hvis porten er opptatt, bruk `python .\API-powerbi.py --port 8001` og åpne
http://localhost:8001. Startfilen kan også kjøres fra en annen arbeidsmappe.
Ingen ekstra Python-pakker er nødvendige.

## Bruk

1. Velg datakilde og tabell.
2. Velg dimensjoner som geografi, år og måltall.
3. Bygg spørringen og hent forhåndsvisning eller last ned CSV.
4. For Power BI: kopier koden i Power Query-fanen til avansert redigering i
   en tom spørring i Power Query.

Appen kjører i nettleseren. Python serverer appfilene lokalt.
Internett kreves for React fra unpkg.com og data fra FHI. Appen har også
en lenke til originalens geografifil på GitHub i resultatvisningen.

## Lokale tilpasninger

- `API-powerbi.py` starter en lokal server, bundet til 127.0.0.1, med riktige
  innholdstyper for JavaScript-moduler.
- Originalens GoatCounter-besøksmåling er fjernet fra `index.html`.

Originalens automatiske tester kjøres med `node --test js` og krever Node.js
18 eller nyere. Node.js er ikke nødvendig for å bruke appen.
