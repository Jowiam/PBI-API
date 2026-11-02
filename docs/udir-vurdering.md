# Udir som tredje datakilde

Undersøkt 2. november 2026. Alternativ 1 nedenfor er nå implementert lokalt:
en Udir-fane med lagrede filtermetadata og Power Query-kode som henter alle
sider. Ingen endringer er publisert av assistenten. Bruksanvisning finnes i
`LES-MEG-LOKALT.md`.

## Konklusjon

Tabellsøk, filtervalg, API-lenker, CSV og Power Query kan lages for Udir.
Direkte forhåndsvisning fra GitHub Pages fungerer derimot ikke med API-ets
nåværende CORS-oppsett. Det krever enten at Udir tillater nettsidens origin,
eller en egen tjeneste som henter data på vegne av nettleseren.

## Verifisert tilgjengelig innhold

Det offentlige API-et returnerte åtte tabeller fra Elevundersøkelsen:

| Innhold | Grunnskole | Videregående |
| --- | --- | --- |
| Deltakelse | 151 | 243 |
| Indikator | 148 | 152 |
| Mobbing | 150 | 153 |
| Tema | 149 | 154 |

Dette dekker ikke automatisk alle statistikker hos Udir. Formater som ble
returnert av API-et var JSON (`format=0`) og CSV (`format=4`). De testede
kallene krevde ingen API-nøkkel.

Baseadressen som fungerte i testen:

```text
https://api.statistikkbanken.udir.no/api/rest/v2/Eksport/
```

Relevante endepunkter:

| Endepunkt | Bruk i applikasjonen |
| --- | --- |
| `/` | Tabelloversikt, navn og publiseringsdato |
| `/format` | Støttede eksportformater |
| `/{id}/filterSpec` | Filterdefinisjoner, obligatoriske valg og standardvalg |
| `/{id}/filterVerdier` | Verdier og hierarki for blant annet skoler og fylker |
| `/{id}/filterStatus` | Gyldige verdier gitt øvrige filtervalg |
| `/{id}/sideData` | Antall rader og sider for et uttrekk |
| `/{id}/data` | Selve uttrekket, med `filter`, `format` og `sideNummer` |

## Praktiske tester

- Tabelloversikt, formater, filterdefinisjoner og filterverdier returnerte
  HTTP 200 og gyldig JSON fra Python.
- Et lite uttrekk fra tabell 152 for Troms, skoleåret 2025–26 og Vg1 ga
  46 rader på én side. `filterStatus` og `sideData` svarte også med HTTP 200.
- En faktisk Edge-nettleser åpnet den publiserte siden på
  `https://jowiam.github.io/PBI-API/` og forsøkte å hente tabelloversikten
  og formatlisten. Begge fetch-kallene ble blokkert av CORS med melding om
  manglende `Access-Control-Allow-Origin`.
- API-konsollen på adressen brukeren oppga kunne åpnes og viste de åtte
  tabellene. Det beviser ikke at API-et tillater andre nettsiders origin.

## Integrasjonsvalg

### 1. Behold kun GitHub Pages

Et lokalt oppdateringsskript kan hente tabelloversikt og filtermetadata fra
Udir og lagre dem som JSON i prosjektet. Brukeren committer og pusher disse
filene selv. Siden kan da tilby:

- Udir-fane med grunnskole og videregående som grupper.
- Søk i de åtte tabellene og søkbare filterverdier.
- Generert API-lenke og CSV-lenke som åpnes direkte hos Udir.
- Power Query-kode som henter direkte fra Udir uten nettleserens CORS-begrensning.

Begrensninger: ingen direkte forhåndsvisning eller live kontroll av
avhengige filtervalg på nettsiden. Filtrene kan bli utdaterte til
metadatafilene oppdateres. At et filter er i metadata, betyr ikke at det
er gyldig for enhver kombinasjon av skoleår, skole og øvrige valg.

### 2. Full funksjonalitet med en liten mellomtjeneste

En avgrenset tjeneste på for eksempel Azure Functions kan hente fra Udir
og returnere svar til nettsiden. Den bør begrense kallene til Udirs faste
API og de nødvendige endepunktene. Da kan samme flyt som for FHI og SSB
tilbys: tabell → filtre → størrelseskontroll → forhåndsvisning → eksport.

GitHub Pages kan fortsatt servere selve nettsiden. Mellomtjenesten må
driftes separat. Ingen slik tjeneste er opprettet i denne vurderingen.

## Databehandling som må håndteres

- Filtrene bruker Udirs egen notasjon, eksempelvis
  `TidID(202512)_EnhetID(-47)`, og kan ikke bygges med SSBs JSON-format.
- `EnhetID(-47)` velger aggregatet for Troms i den undersøkte tabellen.
  `Fylkekode(55)` kan også hente underliggende enheter. ID og fylkeskode
  må derfor behandles som ulike filtervalg.
- Flere sider må hentes og samles. Én datarespons er ikke nødvendigvis et
  komplett uttrekk. Power Query bør bruke `sideData` og iterere over sidene.
- Tall kan komme som tekst med komma og mellomrom, eksempelvis `3,9` og
  `1 677`. Konvertering må ta hensyn til norsk tallformat.
- Prikkede verdier (`*`) og ferdige aggregater må bevares. Udir fraråder
  egen aggregering av dette datagrunnlaget.

## Anbefaling

For en løsning med samme direkte forhåndsvisning som FHI og SSB, velg
alternativ 2. Hvis målet først og fremst er å lage spørringer til Power BI
og beholde bare GitHub Pages, er alternativ 1 et mindre første steg.

## Kilder

- [Udirs API-konsoll og utviklerdokumentasjon](https://apikonsoll.statistikkbanken.udir.no/)
- [Udir: API – data fra Elevundersøkelsen](https://www.udir.no/om-udir/data/api-data-fra-elevundersokelsen/)
- [Udir: Data fra Utdanningsdirektoratet](https://www.udir.no/om-udir/data)
