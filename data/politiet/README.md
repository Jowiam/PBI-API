# Politiloggen – filtermetadata

`metadata.json` inneholder distrikter, kommuner og kategorier fra Politiets API,
ikke meldinger. Distriktskoder hentes fra API-ets OpenAPI-spesifikasjon.
Kommuner og kategorier filtreres med navn, slik `/messages` krever.

Oppdater fra prosjektroten med `python scripts/update_politiet_metadata.py`.
Skriptet validerer alle svar før eksisterende fil erstattes.

Power Query og R henter `/messages` direkte med opptil 50 meldinger per side,
øker `Skip` med faktisk antall meldinger og følger `hasMoreResults`.
Én rad er én melding; `threadId` identifiserer tilhørende hendelsestråd.
Tomme uttrekk beholder kolonnene. Dynamiske perioder beregnes ved hver kjøring.
Faste datoer følger hele kalenderdager i Europe/Oslo.

Politiloggen er en operativ publiseringskanal. Tilgjengelig historikk bestemmes
av API-et. Meldinger kan redigeres eller fjernes, og sideinndelingen gir ikke
et garantert øyeblikksbilde mens data endres. Løsningen lagrer ikke et arkiv.
Kodegeneratoren fjerner duplikater på meldings-ID etter henting.

Kilde: [Politiets API-dokumentasjon](https://api.politiloggen.politiet.no/index.html).
Dataene distribueres under Norsk lisens for offentlige data (NLOD) 2.0.
