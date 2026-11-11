# Vegvesenets målestasjoner og NVDB-oversikt

`stations.json` inneholder offentlig stasjonsmetadata hentet fra
Statens vegvesens Trafikkdata-API. Det er ingen trafikkmålinger i filen.
Filens `fetchedAt` angir innhentingstidspunktet. Selve trafikkmålingene
hentes direkte til Power BI med generert Power Query-kode.

Oppdater fra prosjektmappen med:

```powershell
python scripts/update_vegvesen_metadata.py
```

Skriptet sjekker API-feil, tomme resultater og duplikate stasjons-ID-er
før filen erstattes. Det utfører ingen commit, push eller publisering.
Ta med denne mappen i commit slik at stasjonssøket fungerer på GitHub Pages.

`nvdb.json` inneholder en kompakt oversikt over åpne vegobjekttyper og
gjeldende fylker/kommuner fra NVDB API Les V4. Skjermede og abstrakte
vegobjekttyper utelates. Filen inneholder ingen vegobjekter eller målinger.
Den brukes til søk og geografiske filtre under **Vegvesenet → NVDB**.
Forhåndsvisning og genererte spørringer henter data direkte fra API-et.

Oppdater NVDB-oversikten med:

```powershell
python scripts/update_nvdb_metadata.py
```

Skriptet krever bare standardbiblioteket i Python. Det skriver
`data/vegvesen/nvdb.json` og utfører ingen commit, push eller publisering.
API-dokumentasjon: https://nvdb-docs.atlas.vegvesen.no/category/nvdb-api-les-v4/.

Kilde: Statens vegvesen, https://trafikkdata-api.atlas.vegvesen.no/.
Metadata og målinger er distribuert under Norsk lisens for offentlige data
(NLOD). Ta hensyn til dekningsgrad og andre kvalitetsmål ved bruk av målingene.
