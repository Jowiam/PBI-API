# FHI, SSB, Udir og Vegvesenet – spørringer til Power BI og R

Dette prosjektet tar utgangspunkt i https://github.com/janhli/FHI-API-Query-Builder,
lastet ned fra `main` 2. november 2026. Originalens kode, dokumentasjon og
MIT-lisens er beholdt. Se `README.md` og `LICENSE`.
Den lokale løsningen har i tillegg egne deler for SSB, Udir og Statens vegvesen.

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

Velg **FHI · Folkehelse**, **SSB · Statistikkbanken**, **Udir · Utdanning**
eller **Vegvesenet · Veg og trafikk** i toppmenyen.
Utvalget i hver del beholdes når du bytter mellom dem.

### Hent data til R – alle fire kilder

Velg tabell eller målestasjoner og ønskede filtre. Bruk **Lag R-kode →**
eller velg **R-skript** i resultatvisningen.
Du kan kopiere koden eller laste ned en ferdig `.R`-fil.

Installer pakkene én gang i R/RStudio ved behov:

```r
install.packages(c("httr2", "jsonlite"))
```

Kjør hele skriptet. Resultatet ligger i `data`, en vanlig `data.frame`.
Skriptet bruker de valgte filtrene og henter ferske data fra API-et.
Udir henter alle sider og kontrollerer radantallet. Vegvesenet henter alle
valgte stasjoner og sider/år, og beholder norske tidspunkter som `POSIXct`.
SSB bruker bare `httr2` og leser CSV-kolonnene som tekst til `data`, uten
ekstra behandling. FHI beholder koder og originale verdier som tekst og legger til
en numerisk `_tall`-kolonne for verdifeltet. Udirs valg av numeriske
kolonner gjelder også R. Manglende/prikkede verdier blir `NA` i tallkolonnene.
R-koden velger CSV-format automatisk hos FHI.

### FHI

1. Velg datakilde og tabell.
2. Velg dimensjoner som geografi, år og måltall.
3. Bygg spørringen og hent forhåndsvisning eller last ned CSV.
4. For Power BI: kopier koden i Power Query-fanen til avansert redigering i
   en tom spørring i Power Query.

Power Query velger automatisk CSV2 med navn, eller CSV3 med koder hvis dette
er valgt. Du trenger ikke endre JSON-valget for å bruke Power Query-fanen.

### SSB

1. Åpne SSB-fanen. Bla i de seks emnegruppene og deres underemner, søk etter
   tabelltittel, variabelnavn eller emne, eller skriv et femsifret tabellnummer.
   Søkeresultatene viser periode, oppdateringsdato, emne og variabler.
   Bruk brødsmulene for å gå tilbake i emnehierarkiet, eller velg et annet
   emne i sidemenyen. På mobil åpnes sidemenyen med **Emner og underemner**.
   Sorter etter relevans, oppdateringsdato eller tittel, og avgrens til nylig
   oppdaterte tabeller. Bruk neste/forrige side for flere treff.
2. Velg tabell og tilpass variablene. Søk etter navn eller kode i hver
   verdiliste, velg enkeltverdier eller alle verdier. Tidsvariabelen kan
   bruke et dynamisk utvalg av siste perioder, slik at nye publiseringer
   automatisk blir med ved neste kjøring av den genererte spørringen.
3. Velg **Bygg spørring**. Kopier Power Query-koden, JSON-spørringen
   (POST-body) eller API-lenken (GET). JSON-fanen viser også POST-adressen.
4. Velg **Hent forhåndsvisning** og deretter **Last ned CSV**. Hele utvalget
   hentes; maksimalt 100 rader vises i nettleseren. CSV inneholder alle rader
   samt måleenhet og eventuelle statuskoder fra SSB.

Første verdi i hver variabel og opptil tre siste perioder er forhåndsvalgt.
Dette er et lite startutvalg; kontroller at det svarer på spørsmålet ditt.
Søk for eksempel etter **Troms** i regionlisten i tabell **07459**.
Forsiden viser også nylig oppdaterte tabeller gruppert etter publiseringsdag
og statistikk. Åpne en gruppe for å velge en tabell direkte.
Tabelloversikten lagres i nettleseren og gjenbrukes i opptil seks timer.
**Oppdater oversikt** henter en fersk oversikt med én gang. Hvis lagring er
blokkert, hentes oversikten direkte fra SSB. Ved midlertidig API-feil kan
en eldre lagret oversikt fortsatt brukes; dette vises tydelig på siden.
Selve datauttrekket hentes alltid fra SSB når du velger forhåndsvisning.
Variabelverdier søker du i etter at en tabell er åpnet.

Søkeresultatene kan også filtreres etter frekvens: årlig, kvartalsvis,
månedlig, ukentlig eller andre perioder. **Smart søk** utvider søkeord med
forkortelser og synonymer, for eksempel BNP → bruttonasjonalprodukt,
KPI → konsumprisindeks og VGS → videregående opplæring.

Det kompakte emneoppsettet, publiseringsoversikten og søkeoppsettet er
tilpasset med utgangspunkt i
[Statistikkportalens kildekode](https://github.com/avocodetoast/statistikkportalen).
Synonymgruppene er gjenbrukt under MIT-lisensen; opphavsrett og lisens står
i `THIRD-PARTY-NOTICES.md`.
Grensen på 800 000 dataceller kontrolleres før uttrekk. Ved begrensning på
antall forespørsler fra SSB vises en melding om å vente før nytt forsøk.

Power Query-koden bruker SSBs CSV-format, riktig tegnsett (ISO-8859-1) og
alle variablene som radkolonner. Velg **Anonym** som autentisering til
`https://data.ssb.no`. Angi datatyper etter import i Power Query. CSV-filen
som lastes ned fra forhåndsvisningen er UTF-8 med BOM og semikolon.
SSB bruker punktum som desimalskilletegn; velg egnet nasjonal innstilling
ved konvertering av tall i Excel eller Power Query.

SSB-delen bruker [PxWebApi v2](https://www.ssb.no/api/pxwebapiv2).
Data fra SSB er under CC BY 4.0; oppgi Statistisk sentralbyrå som kilde ved
videre bruk. Valg av alternative kodelister eller aggregerte grupperinger
er foreløpig tilgjengelig via selve Statistikkbanken, ikke i denne appen.

Appen kjører i nettleseren. Python serverer appfilene lokalt.
Internett kreves for React fra unpkg.com og data fra FHI og SSB. Appen har også
en lenke til originalens geografifil på GitHub i resultatvisningen.

## Lokale tilpasninger

### Udir – hent direkte til Power BI

1. Velg **Udir · Utdanning** og en av de åtte tabellene fra Elevundersøkelsen.
2. Tilpass skoleår, enhet, trinn og øvrige filtre. Udirs standardvalg er
   forhåndsvalgt. Søk etter Troms for å finne fylket og skolene under fylket.
   Velg fylkesraden for fylkestall; hver valgt skole gir egne skoletall.
3. Velg **Lag Power Query-kode**, og kopier koden.
4. I Power BI: **Transformer data → Ny kilde → Tom spørring → Avansert
   redigering**. Erstatt innholdet med koden.
5. Velg **Anonym** som autentisering til `https://api.statistikkbanken.udir.no`.

Koden henter antall sider fra Udir, leser samtlige sider og kontrollerer at
radantallet stemmer. Det er ikke nødvendig å skrive API-kall selv. Knappen
**Last ned M-kode** lagrer samme spørring som en `.pq`-fil.

Valget **Legg til numeriske verdikolonner** lager ekstra `_tall`-kolonner
for måltall. Disse leser norsk komma og tusenskille. Originalfeltene
beholdes, inkludert prikkede verdier (`*`). I tallkolonnene gir manglende
eller prikkede verdier `null`, ikke nullverdien 0. Bruk originalkolonnen
for å skille mellom manglende og prikkede verdier. Ikke summer både
fylkestall, skoletall og andre overlappende aggregater.

Filteroversikten ligger lokalt i `data/udir/`, fordi Udirs API ikke tillater
nettleserkall fra GitHub Pages. Selve dataene hentes ferskt av Power Query.
Det er ingen forhåndsvisning på nettsiden. Direkte JSON-/CSV-lenker åpner
bare første side; bruk Power Query-koden for et komplett uttrekk.

Oppdater listen ved nye skoleår eller endringer hos Udir:

```powershell
python scripts/update_udir_metadata.py
```

Skriptet henter kun offentlige tabell- og filtermetadata. Du committer og
pusher de oppdaterte filene selv. Gyldighet av filterkombinasjoner avgjøres
av Udir når spørringen kjøres; filtre kan variere mellom skoleår og skoler.

### Vegvesenet – trafikkdata til Power BI

1. Velg **Vegvesenet · Veg og trafikk → Trafikkdata · Målestasjoner**. Søk etter målestasjon, ID, vegnummer,
   kommune eller fylke. Søk på `E6` finner også vegreferanser skrevet `EV6`.
2. Avgrens eventuelt til fylke, motorkjøretøy/sykkel og stasjoner i drift.
   Kommunelisten følger valgt fylke. **Velg alle treff** velger hele
   søkeresultatet, også treff som ikke er vist ennå. Andre valg beholdes.
   **Fjern valgte treff** fjerner bare treffene i gjeldende søk, mens
   **Tøm alle valg** fjerner alle stasjonsvalg. Den tidligere grensen på
   20 stasjoner er fjernet. Store utvalg kan ta lengre tid i Power BI.
   Stasjonsstatus og datatilgjengelighet er
   basert på den lagrede oversikten, ikke et live oppslag på nettsiden.
3. Velg datatype: trafikkmengde per time, per døgn, gjennomsnittlig
   døgntrafikk per måned, eller årsdøgntrafikk (ÅDT).
4. Velg periode og lag Power Query-kode. Kopier til en tom spørring i
   Power BI via **Avansert redigering**. Velg **Anonym** som autentisering
   til `https://trafikkdata-api.atlas.vegvesen.no/`.

Datoer er norske kalenderdager, inklusive til-datoen. Sommer-/vintertid
håndteres i datogrensene. Tidspunktene i resultatet beholdes som
`datetimezone`. Datointervallet er fast i den genererte koden; juster
perioden ved behov for et nytt uttrekk.

Time- og døgndata hentes med cursor-basert sideinndeling, maksimalt 100
intervaller per API-side. Koden fortsetter til siste side og avbryter ved
GraphQL-feil eller en sidepeker som ikke går videre. Ved månedsdata kjøres
et kall for hvert valgt år; ÅDT henter tilgjengelige år og filtrerer til
årsintervallet. Alle valgte stasjoner blir med.

Resultatet er en flat tabell med stasjon, ID, veg, fylke, kommune,
trafikktype og tidsperiode. `Passeringer` brukes for time-/døgntall og
`Gjennomsnitt_per_doegn` for måneds-/årsgjennomsnitt. ÅDT og månedlige
døgnsnitt er **ikke summer for året eller måneden**. Gjennomsnittene
omfatter alle dager (`dayType: ALL`). Uttrekket er totalen for stasjonen,
ikke oppdelt etter retning, kjørefelt eller kjøretøylengde.

`Dekningsgrad_prosent` og eventuelle konfidensintervaller (`KI_nedre`,
`KI_oevre`) følger med. Manglende målinger beholdes som `null`, ikke 0.
API-et kan mangle måneder, år eller deler av en periode. Koden fyller
ikke inn oppdiktede målinger for manglende perioder.

Feltet **GraphQL / JSON** viser et POST-eksempel for første stasjon og
første side/år. Bruk Power Query-koden for det komplette utvalget.
Forhåndsvisning skjer i Power BI. **Last ned M-kode** lagrer samme kode
som en `.pq`-fil.

Oppdater stasjonsoversikten lokalt ved behov:

```powershell
python scripts/update_vegvesen_metadata.py
```

Du committer og pusher selv hele `data/vegvesen/` sammen med kodeendringene.
Dataene distribueres av Statens vegvesen under NLOD. Se
[API-dokumentasjonen](https://trafikkdata.atlas.vegvesen.no/om-api).

### Vegvesenet – NVDB

1. Velg **Vegvesenet · Veg og trafikk → NVDB · Vegobjekter**.
2. Søk etter type, for eksempel fartsgrense, bru, tunnel eller type-ID 105.
3. Velg fylke, kommune og eventuelt vegkategori og vegnummer. For E8 i Tromsø:
   velg **Troms → Tromsø → Europaveg → 8**.
4. Bruk **Hent forhåndsvisning** for å se opptil 20 objekter fra første side.
5. Velg **Lag Power Query-kode →** eller **Lag R-kode →**. Kopier koden eller
   last ned `.pq`/`.R`. Koden henter alle sider, med én rad per vegobjekt.

Power BI bruker **Anonym** tilkobling. R forutsetter `httr2` og `jsonlite`
og legger resultatet i `data`. Egenskaper får kolonner som
`E2021_Fartsgrense`. Sammensatte egenskaper beholdes som JSON-tekst, og
fylkes-/kommunenumre beholdes som tekst med innledende nuller.
Valgfri geometri leveres som WKT med tilhørende SRID, ikke nødvendigvis
lengde- og breddegrader. Utvalget gjelder gjeldende registrerte vegobjekter.

Type- og områdeoversikten er lagret i `data/vegvesen/nvdb.json`.
Oppdater den med:

```powershell
python scripts/update_nvdb_metadata.py
```

Ta med JSON-filen ved egen commit/push. Selve dataene hentes direkte fra
NVDB API Les V4 når du kjører spørringen eller henter forhåndsvisning.

### Prosjektfiler

- `API-powerbi.py` starter en lokal server, bundet til 127.0.0.1, med riktige
  innholdstyper for JavaScript-moduler.
- Originalens GoatCounter-besøksmåling er fjernet fra `index.html`.
- Ny leverandørmeny og SSB-del i `js/components/SSBBuilder.mjs`,
  API- og eksportlogikk i `js/lib/ssb.mjs` og egne tester i `ssb.test.mjs`.
- Udir-del i `js/components/UdirBuilder.mjs` og `js/lib/udir.mjs`, med
  publiserbare filtermetadata i `data/udir/`.
- Vegvesenet-del i `js/components/VegvesenBuilder.mjs` og `js/lib/vegvesen.mjs`,
  med publiserbar stasjonsoversikt i `data/vegvesen/`.

## Publisere på GitHub Pages

Last opp prosjektfilene til `main`, inkludert `.github`-mappen. Under
**Settings → Pages → Source**, velg **GitHub Actions**. Arbeidsflyten
`Deploy static content to Pages` publiserer ved push til `main` og kan også
startes manuelt fra Actions. FHI og SSB bruker HTTPS og støtter direkte
API-kall fra nettleseren. Python og Node.js trengs ikke på den publiserte siden.
Lokale verktøy og testfiler i `.tools/` og `.tmp/` skal ikke lastes opp.

Den publiserte siden er https://jowiam.github.io/PBI-API/.
Hvis siden viser en eldre versjon, start **Actions → Deploy static content to
Pages → Run workflow** med grenen **main**. **Re-run jobs** på en gammel
kjøring publiserer koden fra den gamle commit-en og kan derfor erstatte
en nyere versjon av siden. Kontroller commit-en i publiseringsjobben hvis
SSB-fanen mangler etter publisering.

Ved **Failed to get ID Token** med **socket hang up**: kontroller at
arbeidsflyten har `pages: write` og `id-token: write` under `permissions`.
Begge er satt i dette prosjektet. Når de er satt, tyder `socket hang up`
på en brutt forbindelse under tokenhenting. Start en ny kjøring med
**Run workflow → main**, eller kjør den mislykkede jobben på nytt dersom
den gjelder nyeste commit. En `punycode`-advarsel er ikke årsaken til
denne tokenfeilen. Publiseringssteget bruker nå `actions/deploy-pages@v5`.

Testene kjøres med `node --test` fra prosjektmappen (Node.js 20 eller nyere).
En portabel Node.js ligger lokalt under `.tools/node-v22.14.0-win-x64/` og
kan brukes med `.\.tools\node-v22.14.0-win-x64\node.exe --test`.
Node.js er ikke nødvendig for å bruke appen.
