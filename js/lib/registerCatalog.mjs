// Kildebeskrivelser for R-byggeren. Spørringer og tilgangsvalg ligger i registerR.mjs.
export const REGISTER_REVIEWED = '2026-11-20';
const roaring = id => 'https://developer.roaring.io/docs/apis/' + id;
const aksjer = 'https://www.skatteetaten.no/deling/aksjonarregisteret/';
const roller = 'https://www.brreg.no/bruke-data-fra-bronnoysundregistrene/abonnement/abonnement-pa-roller-i-virksomheter/';
export const REGISTER_CATALOG = [
    {
        id: 'aksjonaerer', title: 'Aksjonærer og eierandeler', coverage: 'missing', source: 'Skatteetaten · Aksjonærregisteret',
        roaringName: 'Owner Structure', roaringUrl: roaring('no-company-owner-structure-1.0'),
        description: 'Aksjeeiere, aksjeklasser og antall aksjer ved årsslutt.',
        origin: 'Aksjonærregisteret er en dokumentert norsk originalkilde for aksjeopplysninger. Roarings konkrete leverandør er ikke bekreftet i dokumentasjonen vi har undersøkt.',
        access: 'CSV-uttrekk bestilles hos Skatteetaten. Dette er en filutlevering, ikke et tilkoblet åpent oppslags-API.',
        limitation: 'CSV-import gir årsdata per 31. desember. Roaring-alternativet henter eierstrukturen gjennom API.',
        links: [['Originalkilde og bestilling av CSV', aksjer]]
    },
    {
        id: 'rettighetshavere-register', title: 'Registrerte reelle rettighetshavere', coverage: 'missing', source: 'Brønnøysundregistrene · Register over reelle rettighetshavere',
        roaringName: 'Beneficial Owners (2.0)', roaringUrl: roaring('no-company-beneficial-owners-2.0'),
        description: 'Virksomheters innrapporterte reelle rettighetshavere og kontrollgrunnlag.',
        origin: 'Roaring bekrefter at versjon 2.0 bruker det offisielle norske registeret.',
        access: 'Tilgangsstyrt API hos Brønnøysundregistrene. Krever godkjent tilgang og Maskinporten-token med relevant scope.',
        limitation: 'Hvilke opplysninger og oppslag som er tilgjengelige, avhenger av tildelt tilgang.',
        links: [['Originalkilde og API-dokumentasjon', 'https://rrh.brreg.no/api/oppslag/swagger-ui/index.html']]
    },
    {
        id: 'rettighetshavere-beregnet', title: 'Beregnede reelle rettighetshavere', coverage: 'missing', source: 'Roaring · beregning fra eierskap',
        roaringName: 'Beneficial Owner (1.0)', roaringUrl: roaring('no-company-beneficial-owners-1.0'),
        description: 'Beregnet kontroll gjennom direkte og indirekte eierskap.',
        origin: 'Roaring beskriver versjon 1.0 som en beregning fra eierskap. Aksjonærregisteret er en mulig grunnlagskilde for en egen løsning; leverandørkjeden er ikke bekreftet.',
        access: 'Roaring-tjenesten krever egen API-tilgang. En egen beregning krever innhentede eierdata og en definert metode.',
        limitation: 'R-spørringen bruker Roarings beregnede produkt; dette er et annet datagrunnlag enn det offisielle registeret.',
        links: [['Mulig grunnlagskilde: Aksjonærregisteret', aksjer]]
    },
    {
        id: 'alternative-rettighetshavere', title: 'Alternative rettighetshavere', coverage: 'missing', source: 'Roaring · sammenstilling av eierskap og roller',
        roaringName: 'Alternative Beneficial Owner', roaringUrl: roaring('no-company-alt-beneficial-owners-1.0'),
        description: 'Alternative personer identifisert fra eierandeler og sentrale leder- eller styreroller.',
        origin: 'Et sammenstilt produkt fra Roaring. Norske eier- og rolledata finnes hos Skatteetaten og Brønnøysundregistrene; Roarings konkrete leverandørkjede er ikke bekreftet.',
        access: 'Egen API-tilgang hos Roaring, eller separat innhenting og bearbeiding av grunnlagsdata.',
        limitation: 'Ikke et selvstendig offentlig register. Rollene må ikke uten videre tolkes som registrert reelt eierskap.',
        links: [['Mulig eiergrunnlag', aksjer], ['Relevant rollegrunnlag', roller]]
    },
    {
        id: 'personroller', title: 'En persons verv og roller i virksomheter', coverage: 'missing', source: 'Brønnøysundregistrene · Enhetsregisteret og Foretaksregisteret',
        roaringName: 'Company Engagements', roaringUrl: roaring('no-company-engagement-1.0'),
        description: 'Virksomheter der en bestemt person er registrert med verv eller roller.',
        origin: 'Brønnøysundregistrene er originalkilde for registrerte roller. Roarings tjeneste tilbyr personoppslag; direkte tilsvarende offentlig API er ikke bekreftet her.',
        access: 'Brønnøysund tilbyr rollebestander gjennom abonnement. Personidentifikatorer og tilgang må avklares for valgt tjeneste.',
        limitation: 'R-spørringen henter personens verv fra Roaring. Åpne roller per virksomhet finnes også i Brønnøysund-kategorien.',
        links: [['Originalkilde: abonnement på rolleopplysninger', roller]]
    },
    {
        id: 'folkeregister', title: 'Folkeregisteropplysninger', coverage: 'missing', source: 'Skatteetaten · Folkeregisteret',
        roaringName: 'Population Register', roaringUrl: roaring('no-person-2.0'),
        description: 'Registrerte personopplysninger, for eksempel navn, adresse og sivilstand, avhengig av rettighetspakke.',
        origin: 'Folkeregisteret forvaltes av Skatteetaten. Tilgang kan gis direkte eller gjennom en leverandør.',
        access: 'Virksomheten må søke om tilgang. Opplysningene kan hentes gjennom delingstjenestene eller oppslagstjenesten etter innvilgelse.',
        limitation: 'Direkte R-oppslag støtter offentlig-med-hjemmel. Roaring kan velges som alternativ med nødvendig tilgang. Felter bestemmes av rettighetspakken.',
        links: [['Originalkilde og søknad om tilgang', 'https://www.skatteetaten.no/deling/folkeregisteret/intro/be-om-tilgang/'], ['Distribusjon og tilkobling', 'https://www.skatteetaten.no/nn/deling/folkeregisteret/distribusjonsmodell/']]
    },
    {
        id: 'risiko', title: 'Risikoindikatorer for virksomheter', coverage: 'missing', source: 'Roaring · beregnede risikoindikatorer',
        roaringName: 'Risk indicators', roaringUrl: roaring('no-company-risk-1.0'),
        description: 'Regelbaserte indikatorer fra virksomhetsopplysninger, endringer og økonomiske data.',
        origin: 'Roarings egen sammenstilling med regler og terskler. Dokumentasjonen identifiserer ikke en fullstendig originalkildeliste.',
        access: 'Krever API-tilgang og en risikomal hos Roaring. Grunnlagsdata alene gir ikke samme produkt.',
        limitation: 'R-spørringen henter Roarings indikatorer med din risikomal; prosjektet foretar ingen egen risikoberegning.',
        links: [['Produktets metode og datatyper', roaring('no-company-risk-1.0')]]
    },
    {
        id: 'pep', title: 'Politisk eksponerte personer i Norden (PEP)', coverage: 'missing', source: 'Roaring · nordiske PEP- og relasjonsdata',
        roaringName: 'Nordic Politically Exposed Person (PEP)', roaringUrl: roaring('nordic-pep-1.1'),
        description: 'Oppslag på politisk eksponerte personer og relaterte personer i Norden, inkludert Norge.',
        origin: 'Roaring oppgir nordiske registerkilder, men navngir ikke et komplett kildegrunnlag på produktsiden. Originalleverandør er derfor uavklart.',
        access: 'Krever egen tjenestetilgang hos Roaring. Ingen komplett åpen norsk erstatning er verifisert i denne kartleggingen.',
        limitation: 'En liste over politikere eller offentlige verv er ikke tilstrekkelig til å gjenskape PEP- og relasjonsdekningen.',
        links: [['Dokumentert produkt og dekning', roaring('nordic-pep-1.1')]]
    },
    {
        id: 'regnskap-utvidet', title: 'Utvidet regnskapshistorikk og nøkkeltall', coverage: 'partial', source: 'Brønnøysundregistrene · Regnskapsregisteret / Roaring',
        roaringName: 'Financial Information', roaringUrl: roaring('no-company-financial-information-1.0'),
        description: 'Lengre regnskapshistorikk og bearbeidede økonomiske nøkkeltall.',
        origin: 'Regnskapsregisteret er norsk originalkilde for innsendte årsregnskap. Roaring beskriver en utvidet tjeneste med fem års regnskap og nøkkeltall.',
        access: 'Prosjektets R-generator har åpne regnskapstall for siste tre regnskapsår og nedlasting av tilgjengelige PDF-kopier.',
        limitation: 'R-spørringen henter inntil fem års tall fra Roaring, avhengig av abonnement og tilgjengelige regnskap. Brønnøysund-kategorien har åpne tall og PDF-kopier.',
        links: [['Originalkilde: Regnskapsregisterets API', 'https://data.brreg.no/regnskapsregisteret/regnskap/v3/api-docs']]
    },
    {
        id: 'aktivitet-utvidet', title: 'Utvidet virksomhetsaktivitet og historikk', coverage: 'partial', source: 'Brønnøysundregistrene · Enhetsregisteret / SSB Klass',
        roaringName: 'Company Activity', roaringUrl: roaring('no-company-activity-1.0'),
        description: 'Næringer, sektor og virksomhetens formål og aktivitet, med eventuell historikk.',
        origin: 'Enhetsregisteret inneholder virksomhetsopplysninger; SSB vedlikeholder næringsstandarden. Roarings konkrete dataleveranser er ikke bekreftet felt for felt.',
        access: 'Virksomhetsoppslag og næringskodeverk finnes allerede i prosjektet gjennom åpne tjenester.',
        limitation: 'R-spørringen henter gjeldende aktivitet fra Roaring. Historiske aktivitetsoppslag inngår ikke i dette utvalget.',
        links: [['Originalkilde: Enhetsregisteret', 'https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html'], ['Næringsstandard: SSB Klass', 'https://www.ssb.no/klass/klassifikasjoner/6']]
    }
];

export function filterRegisterCatalog(search = '', coverage = '') {
    const query = search.trim().toLocaleLowerCase('nb');
    return REGISTER_CATALOG.filter(item => (!coverage || item.coverage === coverage) &&
        [item.title, item.source, item.roaringName, item.description, item.origin, item.access].join(' ').toLocaleLowerCase('nb').includes(query));
}
