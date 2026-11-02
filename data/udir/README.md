# Udir-filtermetadata

Disse JSON-filene inneholder offentlig tabelloversikt og filterverdier fra
Udirs API. De inneholder ingen statistikkresultater eller individdata.

De serveres sammen med appen på GitHub Pages. Selve datauttrekket kjøres
direkte fra Power Query til Udir. Dette gjør at kodebyggeren virker uten
at nettleseren må gjøre CORS-begrensede kall til Udirs API.

Oppdater alle filene fra prosjektroten med:

```powershell
python scripts/update_udir_metadata.py
```

Alle tabeller leses og valideres før filene erstattes. Skriptet utfører
ingen commit, push eller publisering. Ta med hele `data/udir/` ved commit.
Tidspunkt for innhenting finnes i `fetchedAt` og vises i Udir-fanen.
