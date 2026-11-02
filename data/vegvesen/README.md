# Vegvesenets målestasjoner

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

Kilde: Statens vegvesen, https://trafikkdata-api.atlas.vegvesen.no/.
Metadata og målinger er distribuert under Norsk lisens for offentlige data
(NLOD). Ta hensyn til dekningsgrad og andre kvalitetsmål ved bruk av målingene.
