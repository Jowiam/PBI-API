# Brønnøysundregistrene – R

Integrasjonen bruker åpne GET-endepunkter direkte på `https://data.brreg.no`.
Den krever ingen API-nøkkel og støtter foreløpig bare generering av R-kode.
Nettsiden lagrer bare søkemetadata; registerdata hentes når skriptet kjøres i R.
Katalogen har 79 temaer og nedlastingsvalg. Flere valg gjelder samme register
i ulike formater; dette er ikke 79 separate registre.

Temaområder:

- Virksomheter og arbeidssteder, med alle dokumenterte søkefiltre utenom teknisk sideinndeling/sortering.
- Konsernstruktur, roller, virksomheters juridiske roller, signatur og prokura.
- Åpne regnskapstall, tilgjengelige årsregnskapsår og oversikt over mellombalanser.
- Frivillige organisasjoner, kategorier og informasjonstyper.
- Endringslogger for virksomheter, arbeidssteder og roller.
- Kommuner, organisasjonsformer, rolletyper, rollegrupper og representanttyper.
- Hele virksomhets-, underenhets- og frivillighetsbestander som CSV; roller som komprimert JSON-fil.
- Kommunale rapporteringsplikter, rapporteringsområder og ansvarlige etater.
- Offentlige skjema, skjemaeiere og kodeverk fra Oppgaveregisteret.
- Offentlige støttetildelinger og støtteordninger, med alle søkefeltene fra dagens API.
- Støtteregisterets kodeverk: støttegivere, regioner, næringer (SN2007/SN2025), formål,
  grunnlag, tiltakstyper, status, instrumenter, roller og sammenhenger mellom kodene.
- Partiregisteret med vernede partinavn og adresser.
- Struktur i statlig sektor, med alle ark i Excel-filen.
- Historiske koronakompensasjoner til næringslivet, tilbakebetalingskrav og innreisekarantene.
- Direkte virksomhets-, underenhets-, regnskaps- og matrikkelenhetsoppslag.
- Konsernstruktur og regnskap som CSV, virksomhets-/arbeidsstedsbestander som Excel
  eller komprimert JSON og regnskaps-/mellombalansekopier som PDF.

## R-resultatet

Pakkene `httr2` og `jsonlite` forutsettes installert. Skriptet henter data uten
installasjonssjekker, ekstra feilhåndteringsfunksjoner eller automatiske retries.
Den eneste generelle hjelpefunksjonen flater ut JSON-objekter. Roller og
konsernstruktur omformes til én rad per rolle/node. Andre lister beholdes som
JSON-tekst i cellene, slik at innhold ikke går tapt ved utflating.

`data` er en data.frame. Oppslag for flere organisasjonsnumre får kolonnen
`spurt_organisasjonsnummer`. Manglende verdier beholdes som `NA`.
CSV leses som tekst for å beholde ledende nuller i koder og organisasjonsnumre.
Hele rollebestanden lastes kun ned som fil fordi den er stor; `data` viser filbanen.
Filer lagres i R sin arbeidsmappe og erstatter en tidligere fil med samme navn.
Excel krever også `readxl`. Alle ark leses som tekst og samles i `data`, med
`kilde_ark` som viser hvilket ark raden kom fra. Nivå og innrykk fra statlig
struktur beholdes; skriptet utleder ikke nye organisasjonsrelasjoner.
PDF-er lastes ned til filer; `data` viser filbaner og organisasjonsnumre.
PDF-innholdet tolkes ikke til numeriske regnskapsposter.

Partiregisterets CSV mangler overskriftsrad. Generatoren setter 13 kolonnenavn
etter dagens filformat, inkludert forretningsadressens poststed som kommer
mellom postnummer og kommunenummer. API-dokumentasjonens feltoversikt utelater
denne ene kolonnen. Første parti beholdes som en datarad.
Kompensasjons-, konsern- og regnskaps-CSV bruker semikolon og har en UTF-8 BOM
som hoppes over. Desimalkomma og øvrige originalverdier beholdes som tekst.

Virksomhetssøk har maksimalt 10 000 treff. Skriptet stopper med beskjed dersom
utvalget er større; det gir ikke et umerket deluttrekk. Bruk filtre eller CSV-bestand.
Andre lister følger API-ets neste-lenke. Rolleendringer bruker `afterId` som markør.
Endringstidspunkter tolkes som UTC. Uttrekk som krever flere kall er ikke en
transaksjonell kopi: data kan endres mens skriptet kjører.

Støtteregisteret bruker et offentlig POST-søk med JSON-filtre. Skriptet følger
sidenummer fra 1 og henter opptil 1 000 treff per side i stigende tiltaksnummer.
API-et har søkevindu på 100 000; ved 100 fulle sider stopper skriptet med beskjed
om å avgrense søket. Også nøyaktig 100 000 treff gir denne konservative stoppen,
siden API-et ikke oppgir totalantallet og ikke tillater å sjekke neste side.
Filteret region bruker fylkesnummeret fra regionkodeverket, og flerverdifiltre
sendes som JSON-lister også ved én verdi. Alle vanlige kodeverk og komplette
underkodelisteoversikter hentes, uten å følge hver enkelt redundante koblingslenke.
Støtteregisterets API ligger på `https://stottetiltak-registerinfo-api.app.brreg.no`.

Regnskapstjenesten gir åpne tall for de siste tre regnskapsårene, ikke et komplett
historisk regnskapsarkiv. Årsoversikten angir hvilke PDF-kopier som finnes.
Juridiske roller og matrikkeloppslag kan gi HTTP 404 når et
oppslag ikke finnes. API-feil vises direkte av httr2.

Oppgaveregisterets næringskoder er registerets egne koder og skal ikke tolkes
som en garanti for siste versjon av SSBs næringsstandard. Registeropplysninger
og offentlige skjema er ikke statistiske tabeller. Temaoversikten dekker et bredt
utvalg åpne tjenester, men hevder ikke å dekke alle Brønnøysunds produkter.
Autorisert Enhetsregister-API, reelle rettighetshavere og signaturkontroll som
krever sertifikat inngår ikke.
Det samme gjelder avtale-/tilgangsbegrensede tjenester for Løsøreregisteret,
Ektepaktregisteret og nordiske virksomheter. Intern driftsstatistikk, API-logger
og endepunkter for innsending/endring av registre er ikke datakilder i byggeren.

## Oppdatere søkemetadata

Kjør fra prosjektmappen:

```powershell
python scripts/update_brreg_metadata.py
```

Skriptet henter dagens OpenAPI fra Enhetsregisterets dokumentasjon og kommuneoversikten.
Det lagrer søkefelt og kommuner i `metadata.json`, uten virksomhetsdata.
Temakatalogen og kodegeneratoren ligger i `js/lib/brreg.mjs`.

## Kildedokumentasjon

- [Datasett og API](https://www.brreg.no/bruke-data-fra-bronnoysundregistrene/datasett-og-api/)
- [Enhetsregisteret og Frivillighetsregisteret](https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html)
- [Regnskapsregisterets OpenAPI](https://data.brreg.no/regnskapsregisteret/regnskap/v3/api-docs)
- [Signatur og prokura](https://data.brreg.no/fullmakt/docs/index.html)
- [Oppgaveregisteret](https://data.brreg.no/oppgaveregisteret/api/docs/index.html)
- [Kommunalt rapporteringsregister](https://data.brreg.no/kommunalt-rapporteringsregister/api/docs/index.html)
- [Støtteregisterets OpenAPI](https://stottetiltak-registerinfo-api.app.brreg.no/v3/api-docs)
- [Registerfiler, Partiregisteret og statlig struktur](https://www.brreg.no/bruke-data-fra-bronnoysundregistrene/datasett-og-api/data-om-virksomheter/)
- [Kompensasjon til næringslivet og tilbakebetalingskrav](https://data.brreg.no/kompensasjonsordning/innsyn/)
- [Kompensasjon for innreisekarantene](https://data.brreg.no/kompensasjonsordning/innreise/innsyn/)
