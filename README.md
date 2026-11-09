# PBI-API – offentlige data til Power BI og R

Et nettbasert verktøy som gjør det enklere å finne offentlige data og lage
spørringer til **Power BI og R**. Velg datakilde, tabell eller målestasjon og
ønsket utvalg, og kopier ferdig **Power Query-kode (M)** eller et **R-skript**. Du trenger ikke
skrive API-kallene selv.

**[Åpne verktøyet](https://jowiam.github.io/PBI-API/)** ·
[Detaljert bruksanvisning](./LES-MEG-LOKALT.md) ·
[Kontakt](https://github.com/Jowiam)

## Datakilder

| Kilde | Tilgjengelig i verktøyet | Funksjoner |
| --- | --- | --- |
| **FHI** | Tabeller fra FHIs åpne statistikk-API | Velg kilde, tabell, variabler, geografi og periode. Lag Power Query-/JSON-spørringer, forhåndsvis data og last ned CSV. |
| **SSB** | Tabeller fra Statistikkbanken via PxWebApi v2 | Søk eller bla i emner og underemner. Filtrer på frekvens og oppdateringsdato, velg variabelverdier og lag Power Query-, JSON- eller GET-spørringer. Forhåndsvisning og CSV støttes. |
| **Udir** | Elevundersøkelsen: indikatorer, tema, mobbing og deltakelse for grunnskole og videregående | Velg tabell og filtre som skoleår, enhet og trinn. Lag Power Query-kode som henter alle sidene og kontrollerer radantallet. |
| **Statens vegvesen** | Trafikkdata fra målestasjoner: trafikkmengde per time/døgn, månedlig døgnsnitt og årsdøgntrafikk (ÅDT) | Søk etter stasjoner, filtrer på fylke, kommune og trafikktype, og lag Power Query-kode for valgte stasjoner og perioder. Sideinndeling og kvalitetsmål håndteres i koden. |
| **Politiet** | Operative meldinger fra Politiloggen | Filtrer på distrikt, kommune, kategori, status og periode. Lag Power Query-kode eller R-skript som henter alle tilgjengelige sider. |

Udir-delen dekker de åtte tabellene fra Elevundersøkelsen som er tilgjengelige
i denne integrasjonen. Vegvesenet-delen bruker Trafikkdata-API-et. Verktøyet
omfatter ikke alle datatjenestene fra Udir eller Statens vegvesen.

## Kom i gang med Power BI

1. Åpne [nettsiden](https://jowiam.github.io/PBI-API/) og velg datakilde i toppmenyen.
2. Finn tabellen eller målestasjonene du ønsker data fra.
3. Tilpass filtre, variabler og tidsperiode.
4. Velg Power Query og kopier den genererte koden.
5. I Power BI: åpne **Transformer data → Ny kilde → Tom spørring → Avansert redigering**.
6. Erstatt innholdet med koden og velg **Anonym** som autentisering når Power BI ber om tilkobling til datakilden.

For **FHI** velger Power Query-koden automatisk **CSV2 med navn**, eller
**CSV3 med koder** dersom du har valgt dette. JSON-valget gjelder JSON-spørringen;
Power Query-koden henter alltid CSV. De øvrige kildene velger også format gjennom kodegeneratoren.

Power Query-koden kan også brukes i Excel der Power Query er tilgjengelig.
Udir, Vegvesenet og Politiet har en knapp for å laste ned M-koden som en `.pq`-fil.

## Hent data til R

Alle fem datakildene kan generere et komplett R-skript med det samme utvalget
som du har valgt på nettsiden.

1. Velg tabell eller stasjoner og tilpass filtrene.
2. Velg **Lag R-kode →**, eller **R-skript** i resultatvisningen.
3. Velg **Kopier R-kode** eller **Last ned R-skript** for å få en `.R`-fil.
4. Lim koden inn i et R-skript i R/RStudio og kjør den. Installer pakkene
   én gang ved behov:

```r
install.packages(c("httr2", "jsonlite"))
```

Resultatet ligger i en **data.frame kalt `data`**. Skriptet henter data direkte
fra API-et når du kjører det. R trengs bare på maskinen som kjører skriptet;
nettsiden fungerer fortsatt på GitHub Pages.

Udir henter alle sider og kontrollerer radantallet. Vegvesenet henter alle
valgte stasjoner og sider/år. SSB gir et enkelt skript som bruker `httr2`
til å hente CSV og lese kolonnene som tekst til `data`, uten ekstra behandling.
FHI leser CSV med koder og originale verdier som tekst og legger til en
numerisk `_tall`-kolonne for verdifeltet.
FHI velger CSV-format automatisk for R. Udir kan også legge til numeriske
`_tall`-kolonner. Manglende eller prikkede verdier blir `NA` i tallkolonnene;
originalfeltene beholdes. Vegvesenets tidspunkter leses som `POSIXct` med
tidssonen `Europe/Oslo`.

## Finne og velge data

### FHI

Velg statistikkilde og tabell, og tilpass dimensjoner som år, geografi og
måltall. Du kan velge enkeltverdier, alle verdier eller siste perioder der
tabellen støtter det. Forhåndsvisningen og CSV-nedlastingen kan brukes til
å undersøke utvalget før du tar spørringen videre til Power BI.

### SSB

Utforsk seks emnegrupper med underemner og brødsmuler, eller søk etter
tabellnummer, tittel, variabelnavn eller emne. **Smart søk** utvider søket
med forkortelser og synonymer som BNP, KPI og VGS.

Søkeresultatene kan sorteres og filtreres på frekvens og oppdateringsdato.
I variabelvalget kan du søke etter navn eller kode og bruke et dynamisk
utvalg av siste perioder. Forhåndsvisningen viser opptil 100 rader;
CSV-nedlastingen inneholder hele det hentede utvalget.

### Udir

Tabellene er gruppert i grunnskole og videregående. Filtrene starter med
Udirs standardvalg og kan tilpasses før du kopierer spørringen.

Power Query-koden henter alle sider og kontrollerer at antall rader stemmer
med det Udir oppgir. Du kan få ekstra numeriske `_tall`-kolonner, samtidig
som originalfeltene beholdes med eventuelle prikkede verdier.

### Vegvesenet

Søk etter stasjonsnavn, ID, vegnummer, kommune eller fylke. Kombiner søket
med egne filtre for **fylke**, **kommune**, **motorkjøretøy/sykkel** og
stasjoner i drift.

- **Velg alle treff** velger hele trefflisten, også stasjoner som ikke er vist ennå.
- **Fjern valgte treff** fjerner bare stasjonene i gjeldende søkeresultat.
- **Tøm alle valg** fjerner alle valgte stasjoner.

Valg utenfor gjeldende søk beholdes. Den tidligere grensen på 20 stasjoner
er fjernet. Store utvalg kan gi mange API-kall og lengre oppdateringstid i Power BI.

Datoperioder omfatter hele norske kalenderdager, inkludert til-datoen,
med håndtering av sommer- og vintertid. Time- og døgndata hentes med alle
sidepekere, månedsdata hentes for hvert valgt år, og ÅDT filtreres til
ønsket årsintervall. Uttrekket gjelder totalen ved hver stasjon.

### Politiet · Politiloggen

Velg distrikt, kommune, kategori, status og dynamisk eller fast periode i den
nye fanen. Ingen filtervalg betyr alle verdier. Standardperioden er siste sju
døgn, beregnet på nytt ved hver oppdatering i Power BI eller R. Faste datoer
følger hele norske kalenderdager. Kopier koden eller last ned `.pq`/`.R`.

Uttrekket har én rad per melding og beholder `threadId` for å knytte sammen
oppdateringer om samme hendelse. Politiloggen er ikke kriminalstatistikk.
Historikk avhenger av hva API-et gjør tilgjengelig; meldinger kan endres eller
fjernes. Koden henter alle tilgjengelige sider med `Skip`/`Take` og
`hasMoreResults`, men et uttrekk mens meldinger endres er ikke et garantert
øyeblikksbilde. Se [detaljer om Politiloggen](data/politiet/README.md).

## Hvordan hentes dataene?

Nettsiden kjører som en statisk applikasjon på GitHub Pages. Det er ingen
egen backend å starte eller drifte for denne løsningen.

| Kilde | Tabell- og filteroversikt | Forhåndsvisning |
| --- | --- | --- |
| FHI | Hentes fra FHI, med lokale navne- og geografifiler | På nettsiden og i Power BI |
| SSB | Hentes fra SSB og mellomlagres i nettleseren i opptil seks timer. Kan oppdateres manuelt. | På nettsiden og i Power BI |
| Udir | Lagrede metadata i prosjektet, oppdatert med et Python-skript | I Power BI |
| Vegvesenet | Lagret stasjonsoversikt i prosjektet, oppdatert med et Python-skript | I Power BI |
| Politiet | Lagret oversikt over distrikter, kommuner og kategorier, oppdatert med et Python-skript | I Power BI eller R |

Selve datauttrekket i Power Query hentes direkte fra den valgte datakilden.
De lokale metadatafilene er oversikter over tabeller, filtre og stasjoner,
ikke lagrede statistikkresultater.

Udir tillater ikke direkte API-henting fra GitHub Pages i nettleseren med
dagens CORS-oppsett. Den lagrede filteroversikten gjør det likevel mulig
å bygge spørringen på nettsiden og hente dataene direkte i Power BI.

## Datakvalitet og tidsvalg

Tilgjengelige perioder og gyldige filterkombinasjoner bestemmes av kildene.
Noen utvalg kan være tomme eller inneholde skjulte eller manglende verdier.

Prikkede verdier hos Udir må ikke tolkes som 0. Originalfeltene beholdes
selv om du velger ekstra numeriske kolonner. Bruk Udirs ferdige aggregater
fremfor å summere overlappende fylkes-, kommune- og skoletall.

Vegvesen-spørringene beholder dekningsgrad og eventuelle konfidensintervaller.
Manglende verdier erstattes ikke med 0. ÅDT og månedlig døgnsnitt er
gjennomsnitt per døgn, ikke summer for hele året eller måneden.

Tidsvalg som er faste datoer eller år, forblir faste i den kopierte koden.
SSBs valg av siste perioder er dynamisk. Kontroller utvalget før du bruker
spørringen i en rapport som skal oppdateres over tid.

## Kjøre lokalt

Du trenger Python, en moderne nettleser og internett for API-kallene og
React-filene som lastes fra CDN. Ingen ekstra Python-pakker er nødvendige.

Kjør fra prosjektmappen:

```powershell
python .\API-powerbi.py
```

Åpne **http://localhost:8000**. Stopp serveren med **Ctrl+C**.
Hvis porten er opptatt, bruk `python .\API-powerbi.py --port 8001`.
Appen må serveres over HTTP; ikke åpne `index.html` direkte som en lokal fil.

## Oppdatere metadata

Kjør disse kommandoene fra prosjektmappen når Udir får nye skoleår eller
filtre, eller når Vegvesenets stasjonsoversikt skal oppdateres:

```powershell
python scripts/update_udir_metadata.py
python scripts/update_vegvesen_metadata.py
python scripts/update_politiet_metadata.py
```

Skriptene henter offentlige metadata og oppdaterer `data/udir/` og
`data/vegvesen/` og `data/politiet/`. De utfører ingen commit, push eller publisering.
Tidspunktet for innhenting vises i de aktuelle fanene.

Ta med de oppdaterte metadatafilene når du selv committer og pusher.
FHI- og SSB-oversiktene hentes direkte av appen og trenger ikke disse skriptene.

## Publisere på GitHub Pages

Prosjektet har en ferdig arbeidsflyt i
[`.github/workflows/static.yml`](./.github/workflows/static.yml).

1. Push prosjektfilene til `main`, inkludert `js/`, `styles/`, `data/` og `.github/`.
2. Velg **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Publiseringen starter ved push til `main`. Den kan også startes med **Actions → Deploy static content to Pages → Run workflow → main**.

Bruk nyeste commit ved ny publisering. En ny kjøring av en gammel jobb kan
publisere en eldre versjon av siden. Hvis en fane mangler etter en vellykket
publisering, kontroller adressen, commit-en og prøv **Ctrl+F5**.

Lokale verktøy og testfiler i `.tools/` og `.tmp/` er ignorert i Git og skal
ikke publiseres.

## Tester og prosjektstruktur

Testene bruker Nodes innebygde testrunner. Ingen `npm install` er nødvendig.
Med Node.js 20 eller nyere:

```powershell
node --test
```

Testene dekker blant annet filterbygging, Power Query-generering,
datokonvertering, geografi, CSV og håndtering av metadata. Automatisk
testing av kodegeneratoren erstatter ikke kontroll av den ferdige
spørringen i Power BI.

| Fil eller mappe | Innhold |
| --- | --- |
| `index.html` | Appens startside |
| `js/app.js` | Toppmeny og sammensetning av datakildene |
| `js/components/` | Grensesnitt for datakildene og felles kontaktfelt |
| `js/lib/` | Spørringsbygging, eksport, søk, datologikk og automatiske tester |
| `styles/` | Utseende og mobiltilpasning |
| `data/udir/` | Udirs tabell- og filtermetadata |
| `data/vegvesen/` | Vegvesenets stasjonsoversikt |
| `data/politiet/` | Politiets distrikter, kommuner og kategorier |
| `scripts/` | Oppdatering av lokale metadata |
| `API-powerbi.py` | Lokal HTTP-server |
| `.github/workflows/` | Tester og publisering på GitHub Pages |

Se [LES-MEG-LOKALT.md](./LES-MEG-LOKALT.md) for flere detaljer og feilsøking.

## Kontakt, opphav og lisens

Kontakt for dette prosjektet: **[Jowiam på GitHub](https://github.com/Jowiam)**.
Forslag og feil kan meldes i [prosjektets Issues](https://github.com/Jowiam/PBI-API/issues).

Prosjektet er videreutviklet fra
[FHI API Query Builder](https://github.com/janhli/FHI-API-Query-Builder)
av **Jan Hiroshi Lintvedt / Akershus fylkeskommune**.
Emneoppsettet og søket er inspirert av
[Statistikkportalen](https://github.com/avocodetoast/statistikkportalen)
av **Hallvard Mørck**, med gjenbruk av synonymgrupper.

Koden deles under [MIT-lisensen](./LICENSE). Original opphavsrett og
tredjepartslisenser er bevart i [LICENSE](./LICENSE) og
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
Datakildenes egne vilkår og krav til kildehenvisning gjelder for dataene.

## Dokumentasjon fra datakildene

- [FHI – åpne API-er og statistikk](https://www.fhi.no/ta/statistikkalender_og_statistikk/apen-api-og-statistikk/)
- [SSB – brukerveiledning for PxWebApi v2](https://www.ssb.no/api/pxwebapiv2)
- [Udir – API-konsoll og dokumentasjon](https://apikonsoll.statistikkbanken.udir.no/)
- [Statens vegvesen – om Trafikkdata-API-et](https://trafikkdata.atlas.vegvesen.no/om-api)
- [Politiet – Politiloggen API](https://api.politiloggen.politiet.no/index.html)
