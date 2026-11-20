# Eierskap, personer og risiko

Kontrollert 20. november 2026 mot [Roarings API-katalog](https://developer.roaring.io/docs/apis?countries=no)
og kildedokumentasjonen lenket fra hver oppføring. Katalogen ligger i
`js/lib/registerCatalog.mjs` og vises i en egen kategori i toppmenyen.

Kategorien er en R-spørringsbygger med ti datasett. Velg datasett, kilde og
utvalg, og bruk **Lag R-kode**, **Kopier R-kode** eller **Last ned R-skript**.
Koden ligger i `js/lib/registerR.mjs`. Data hentes når skriptet kjøres i R;
nettsiden sender ikke oppslag eller tilgangsnøkler til leverandøren.

## Kjøring i R

API-skriptene krever `httr2` og `jsonlite`. Installer ved behov med
`install.packages(c("httr2", "jsonlite"))`.

- **Registrerte reelle rettighetshavere:** direkte GET-oppslag på
  `https://rrh.brreg.no/api/oppslag/v1/virksomheter/{organisasjonsnummer}`.
  Sett et gyldig Maskinporten-token i miljøvariabelen `BRREG_RRH_TOKEN`.
  Roaring 2.0 er et eget alternativ i kildevelgeren.
- **Folkeregisteret:** direkte entydig søk med fullt navn og identifikasjonsnummer,
  for rettighetspakken `offentlig-med-hjemmel`. Sett et gyldig Maskinporten-token
  i `FREG_TOKEN`. Andre rettighetspakker støttes ikke av det direkte oppslaget
  her; Roaring har et alternativ som fortsatt krever riktig innvilget tilgang.
- **Aksjonærer:** velg Skatteetaten for å lese en allerede bestilt CSV-fil med
  R sin filvelger. Skilletegn og tegnsett velges i byggeren. Skriptet bestiller
  ikke filen. Roaring kan velges for et API-oppslag på eierstruktur.
- **Roaring:** sett `ROARING_CLIENT_ID` og `ROARING_CLIENT_SECRET` i R-miljøet.
  Skriptet henter OAuth-token fra `https://api.roaring.io/token` med
  `client_credentials` og Basic-autentisering, og bruker Bearer-token mot
  produktets dokumenterte endepunkt. Kontoen må ha tilgang til produktet.
  Risiko krever risikomal-ID; PEP-søk bruker Norge, fornavn og etternavn.

Skriptene setter resultatet i `data` (data.frame). Hele JSON-svaret beholdes
i `resultat`. Listebaserte produktresultater får én rad per element i produktets
resultatliste; øvrige oppslag får én rad med flate objektfelter. Nøstede lister
beholdes som JSON i cellene. Koder og originalverdier leses som tekst, og
manglende felter blir `NA`. CSV-kolonner leses også som tekst.

Dette er enkeltoppslag, ikke totale registeruttrekk. En respons med feltet
`pagination` stopper med beskjed, slik at den ikke blir presentert som komplett.
Ingen av skriptene gjør automatiske gjentatte kjøp/oppslag eller fornyer
Maskinporten-token. HTTP-feil vises av httr2. Produktets øvrige statusopplysninger
kan undersøkes i `resultat`. Faktiske tilgangsstyrte produksjonsoppslag kan ikke
verifiseres uten brukerens tilganger.

## Kartlegging

| Norsk navn | Roaring-produkt | Originalkilde eller produktansvarlig | Tilgang |
| --- | --- | --- | --- |
| Aksjonærer og eierandeler | Owner Structure | Skatteetatens Aksjonærregister er en relevant originalkilde; Roarings konkrete leverandør er ikke bekreftet | Bestilt CSV-uttrekk |
| Registrerte reelle rettighetshavere | Beneficial Owners 2.0 | Brønnøysundregistrenes offisielle register; bekreftet av Roaring | Tilgangsstyrt API og Maskinporten |
| Beregnede reelle rettighetshavere | Beneficial Owner 1.0 | Roarings beregning fra eierskap; underleverandør uavklart | Egen tjenestetilgang eller separat beregning |
| Alternative rettighetshavere | Alternative Beneficial Owner | Roarings sammenstilling av eier- og rolledata; underleverandører uavklart | Egen tjenestetilgang eller separat sammenstilling |
| En persons verv og roller i virksomheter | Company Engagements | Brønnøysundregistrene er originalkilde for registrerte roller | Rolleabonnement eller leverandørtjeneste; direkte tilsvarende offentlig person-API er ikke bekreftet |
| Folkeregisteropplysninger | Population Register | Skatteetaten, Folkeregisteret | Søknad og rettighetspakke |
| Risikoindikatorer for virksomheter | Risk indicators | Roarings regler og bearbeiding; full kildeliste uavklart | Egen API-tilgang og risikomal |
| Politisk eksponerte personer i Norden (PEP) | Nordic PEP | Roaring; konkrete originalregistre ikke navngitt i undersøkt dokumentasjon | Egen tjenestetilgang |
| Utvidet regnskapshistorikk og nøkkeltall | Financial Information | Regnskapsregisteret er norsk originalkilde; Roaring tilbyr utvidet bearbeiding | Delvis dekket i eksisterende Brønnøysund-generator |
| Utvidet virksomhetsaktivitet og historikk | Company Activity | Enhetsregisteret og SSBs næringsstandard er relevante originalkilder | Delvis dekket i eksisterende Brønnøysund-generator |

## Kilder og avgrensninger

- [Skatteetaten: Aksjonærregisteret](https://www.skatteetaten.no/deling/aksjonarregisteret/):
  årlige aksjonæropplysninger utleveres ved bestilling som CSV. Et offentlig
  innsynsuttrekk må ikke forveksles med et API for innrapportering.
- [Brønnøysund: API for reelle rettighetshavere](https://rrh.brreg.no/api/oppslag/swagger-ui/index.html):
  API-et krever Maskinporten og relevant tilgang. Godkjenning og opplysningsomfang
  må avklares med registeret før integrasjon.
- [Roaring: beregnede rettighetshavere 1.0](https://developer.roaring.io/docs/apis/no-company-beneficial-owners-1.0)
  og [offisielle registeropplysninger 2.0](https://developer.roaring.io/docs/apis/no-company-beneficial-owners-2.0)
  er ulike produkter og beholdes som separate oppføringer.
- [Roaring: alternative rettighetshavere](https://developer.roaring.io/docs/apis/no-company-alt-beneficial-owners-1.0)
  beskriver et produkt basert på eierskap og sentrale roller, ikke et eget offentlig register.
- [Brønnøysund: abonnement på roller](https://www.brreg.no/bruke-data-fra-bronnoysundregistrene/abonnement/abonnement-pa-roller-i-virksomheter/)
  dokumenterer rollebestander. Det er ikke bevis for et tilsvarende offentlig
  personoppslag som [Roarings Company Engagements](https://developer.roaring.io/docs/apis/no-company-engagement-1.0).
- [Folkeregisteret: søknad om tilgang](https://www.skatteetaten.no/deling/folkeregisteret/intro/be-om-tilgang/)
  og [distribusjonsmodell](https://www.skatteetaten.no/nn/deling/folkeregisteret/distribusjonsmodell/)
  beskriver tilgang direkte og via leverandører.
- [Roaring: risikoindikatorer](https://developer.roaring.io/docs/apis/no-company-risk-1.0)
  beskriver et regelbasert produkt. Ingen fullstendig originalkildeliste er bekreftet.
- [Roaring: Nordic PEP](https://developer.roaring.io/docs/apis/nordic-pep-1.1)
  omfatter Norge og relasjonsdata. Vanlige politikerlister gir ikke samme dekning.
- [Roaring: Financial Information](https://developer.roaring.io/docs/apis/no-company-financial-information-1.0)
  beskriver inntil fem års tall og nøkkeltall. Prosjektets eksisterende åpne
  regnskapsintegrasjon har siste tre regnskapsår; eldre PDF-kopier tolkes ikke til tall.
- [Roaring: Company Activity](https://developer.roaring.io/docs/apis/no-company-activity-1.0)
  har flere aktivitetsopplysninger og historikk. Full feltlikhet med prosjektets
  virksomhetsoppslag er ikke kontrollert.

Andre tjenester som allerede har tilsvarende oppslag i prosjektet, er ikke
duplisert i denne kategorien. Globale Roaring-produkter uten Norge som eget
landvalg er utenfor kartleggingen. Nordic PEP er inkludert fordi Norge inngår
eksplisitt i landdekningen. Kategoriseringen er ikke en garanti for feltlikhet
eller en bekreftelse på leverandørkjeder som Roaring ikke har dokumentert.
