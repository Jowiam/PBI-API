# Brønnøysundregistrene – R

Integrasjonen bruker åpne GET-endepunkter direkte på `https://data.brreg.no`.
Den krever ingen API-nøkkel og støtter foreløpig bare generering av R-kode.
Nettsiden lagrer bare søkemetadata; registerdata hentes når skriptet kjøres i R.

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

Virksomhetssøk har maksimalt 10 000 treff. Skriptet stopper med beskjed dersom
utvalget er større; det gir ikke et umerket deluttrekk. Bruk filtre eller CSV-bestand.
Andre lister følger API-ets neste-lenke. Rolleendringer bruker `afterId` som markør.
Endringstidspunkter tolkes som UTC. Uttrekk som krever flere kall er ikke en
transaksjonell kopi: data kan endres mens skriptet kjører.

Regnskapstjenesten gir åpne tall for de siste tre regnskapsårene, ikke et komplett
historisk regnskapsarkiv. Årsoversikten angir hvilke PDF-kopier som finnes, men
integrasjonen laster ikke ned PDF-er. Juridiske roller kan gi HTTP 404 når et
oppslag ikke finnes. API-feil vises direkte av httr2.

Oppgaveregisterets næringskoder er registerets egne koder og skal ikke tolkes
som en garanti for siste versjon av SSBs næringsstandard. Registeropplysninger
og offentlige skjema er ikke statistiske tabeller. Temaoversikten dekker et bredt
utvalg åpne tjenester, men hevder ikke å dekke alle Brønnøysunds produkter.
Autorisert Enhetsregister-API, reelle rettighetshavere og signaturkontroll som
krever sertifikat inngår ikke.

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
