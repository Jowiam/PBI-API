export const STOTTE_API = 'https://stottetiltak-registerinfo-api.app.brreg.no';
export const STOTTE_FILTERS = [
    ['STOETTEMOTTAKER_ORGNR', 'Støttemottaker (organisasjonsnummer)', 'EXACT_MATCH'],
    ['STOETTEGIVER_ORGNR', 'Støttegiver (organisasjonsnummer)', 'EXACT_MATCH'],
    ['STOETTEGIVER_NAVN', 'Navn på støttegiver', 'CONTAINS_WORDS'],
    ['STOETTEORDNING_NAVN', 'Navn på støtteordning', 'CONTAINS_WORDS'],
    ['REGION', 'Region / fylkesnummer (kommaseparert)', 'ONE_OF'],
    ['NAERING', 'Næringskoder (kommaseparert)', 'ONE_OF'],
    ['fraTildelingsdato', 'Tildelt fra og med', 'DATE_GREATER_THAN_OR_EQUAL', 'TILDELINGSDATO', 'date'],
    ['tilTildelingsdato', 'Tildelt til og med', 'DATE_LESS_THAN_OR_EQUAL', 'TILDELINGSDATO', 'date'],
    ['STOETTETILTAKSNUMMER', 'Støttetiltaksnummer', 'EXACT_MATCH'],
    ['TILKNYTTET_STOETTEORDNING', 'Tilknyttet støtteordning (nummer)', 'EXACT_MATCH'],
    ['STATSSTOETTEKATEGORI', 'Statsstøttekategori (identifikator fra kodeverk)', 'EXACT_MATCH'],
    ['PRIMAERRETTSLIG_GRUNNLAG', 'Primærrettslig grunnlag (identifikator)', 'EXACT_MATCH'],
    ['STOETTEINSTRUMENT', 'Støtteinstrument (identifikator)', 'EXACT_MATCH'],
    ['ARTIKKEL', 'Artikkel (identifikator)', 'EXACT_MATCH'],
    ['RETNINGSLINJE_ESA', 'ESA-retningslinje (identifikator)', 'EXACT_MATCH'],
    ['ESA_ID', 'ESA-ID', 'EXACT_MATCH'],
    ['GRUPPEUNNTAKSID', 'Gruppeunntaks-ID', 'EXACT_MATCH']
];
export function stotteSearchBody(parameters) {
    return STOTTE_FILTERS.filter(([key]) => parameters[key]).map(([key, , matchType, field = key]) => ({
        field, value: matchType === 'ONE_OF' ? parameters[key].split(',').map(value => value.trim()).filter(Boolean) : parameters[key], matchType
    }));
}

export function brregExtraTopics(topic) {
    const enhets = '/enhetsregisteret/api';
    const code = '/api/v1/kodeliste/';
    const common = { base: STOTTE_API };
    const fields = STOTTE_FILTERS.map(([key, label, , , type]) => [key, label, type]);
    return [
        ...[['stoettetildeling', 'Offentlige støttetildelinger'], ['stoetteordning', 'Offentlige støtteordninger']].map(([key, title]) => topic('stotte-' + key, 'Offentlig støtte', title, 'Søk i Støtteregisteret. Tomme filtre gir alle tilgjengelige treff innenfor søkevinduet på 100 000. Avgrens større utvalg med filtre.', '/api/v1/soek/' + key, { ...common, stotteSearch: key, fields })),
        ...[
            ['informasjonstype', 'Informasjonstyper'], ['rolletype', 'Rolletyper'], ['foretakskategori', 'Foretaksstørrelser'],
            ['formaalstype', 'Støtteformål'], ['retningslinjeesa', 'ESA-retningslinjer'], ['stoetteinstrumenttype', 'Støtteinstrumenter'],
            ['stoettetiltaksstatus', 'Tiltaksstatuser'], ['endringstype', 'Endringstyper'], ['artikkeltype', 'Artikler'],
            ['statsstoettekategori', 'Statsstøttekategorier'], ['eosprimaerrettsliggrunnlag', 'EØS-rettslige grunnlag'],
            ['stoettetiltakstype', 'Støttetiltakstyper'], ['stoettegiver', 'Støttegivere'], ['region', 'Regioner og fylker'], ['naering', 'Næringskoder']
        ].map(([key, title]) => topic('stotte-kode-' + key, 'Støtteregisterets kodeverk', title, 'Koder og beskrivelser fra Støtteregisteret. Bruk identifikatorene i søkefiltrene for offentlig støtte.', code + key, { ...common, array: true, ...(key === 'naering' ? { fields: [['standard', 'Næringsstandard']], defaults: { standard: 'SN2007' }, choices: { standard: ['SN2007', 'SN2025'] } } : {}) })),
        ...[['stoettetiltakstype', 'Sammenhenger mellom tiltakstyper og kodeverk'], ['statsstoettekategori', 'Sammenhenger mellom støttekategorier og grunnlag'], ['retningslinjeesa', 'Sammenhenger mellom ESA-retningslinjer og formål'], ['eosprimaerrettsliggrunnlag', 'Sammenhenger mellom EØS-grunnlag og kodeverk'], ['artikkeltype', 'Sammenhenger mellom artikler og støtteformål']].map(([key, title]) => topic('stotte-relasjon-' + key, 'Støtteregisterets kodeverk', title, 'Hele koblingsoversikten. Én rad per identifikator; tilknyttede koder beholdes i JSON-felt.', code + key + '/underkodelister', { ...common, transform: 'map' })),
        topic('partier', 'Politiske partier', 'Registrerte politiske partier', 'Hele Partiregisteret med vernede partinavn og adresser. CSV-filen har ikke overskriftsrad; skriptet setter kolonnenavn.', '/partiregisteret/api/lastned/csv', { file: 'csv', separator: ';', columns: ['organisasjonsnummer', 'partinavn', 'organisasjonsform', 'forretningsadresse', 'forretningsadresse.postnummer', 'forretningsadresse.poststed', 'forretningsadresse.kommunenummer', 'forretningsadresse.kommunenavn', 'forretningsadresse.land', 'postadresse', 'postadresse.postnummer', 'postadresse.poststed', 'postadresse.land'] }),
        topic('statlig-struktur', 'Offentlig sektor', 'Struktur i statlig sektor', 'Virksomheter og arbeidssteder i statlig sektor. Alle ark i Excel-filen samles i data, med arknavn og opprinnelig nivå.', '/struktur/statligsektor/lastned', { file: 'xlsx' }),
        ...[
            ['kompensasjon', 'Koronakompensasjon til næringslivet', '/kompensasjonsordning/api/tilskudd/csv'],
            ['kompensasjon-tilbakebetaling', 'Krav om tilbakebetaling av koronakompensasjon', '/kompensasjonsordning/api/tilbakebetalingskrav/csv'],
            ['innreisekarantene', 'Kompensasjon for innreisekarantene', '/kompensasjonsordning/innreise/api/tilskudd/csv']
        ].map(([id, title, path]) => topic(id, 'Historiske kompensasjonsordninger', title, 'Komplett datasett fra en avsluttet koronaordning. Alle kolonner beholdes som tekst, inkludert beløp med desimalkomma.', path, { file: 'csv', separator: ';', bom: true })),
        topic('enhet-oppslag', 'Virksomheter', 'Virksomhet – direkte oppslag', 'Registeropplysninger om ett eller flere bestemte organisasjonsnumre, inkludert slettede enheter der opplysninger fortsatt finnes.', `${enhets}/enheter/{org}`, { org: true }),
        topic('underenhet-oppslag', 'Virksomheter', 'Arbeidssted – direkte oppslag', 'Registeropplysninger om ett eller flere bestemte underenhetsnumre.', `${enhets}/underenheter/{org}`, { org: true }),
        topic('matrikkelenhet', 'Eiendom', 'Matrikkelenhet registrert i Enhetsregisteret', 'Oppslag på matrikkel-ID eller matrikkelnummer. Dette er registrerte matrikkelenheter i Enhetsregisteret, ikke et komplett eiendomsregister.', `${enhets}/matrikkelenhet`, { array: true, fields: [['matrikkelenhetid', 'Matrikkel-ID'], ['matrikkelnummer', 'Matrikkelnummer']], requireAny: ['matrikkelenhetid', 'matrikkelnummer'] }),
        ...[['enheter', 'virksomheter'], ['underenheter', 'arbeidssteder']].flatMap(([key, title]) => [
            topic('fil-' + key + '-json', 'Hele registerbestander', 'Alle ' + title + ' – JSON-fil', 'Hele bestanden som gzip-komprimert JSON. Skriptet laster ned filen uten å lese den inn i minnet.', `${enhets}/${key}/lastned`, { file: 'download', gzip: true }),
            topic('fil-' + key + '-xlsx', 'Hele registerbestander', 'Alle ' + title + ' – Excel', 'Hele bestanden som Excel. Alle ark leses som tekst og samles i data. Stor fil; CSV er ofte enklere for store uttrekk.', `${enhets}/${key}/lastned/regneark`, { file: 'xlsx' })
        ]),
        topic('konsern-csv', 'Virksomheter', 'Konsernstruktur – CSV', 'Konsernforbindelser direkte fra CSV-tjenesten. Oppgi ett eller flere organisasjonsnumre.', `${enhets}/konsernstruktur/{org}/csv`, { org: true, file: 'csv', separator: ';', bom: true }),
        topic('regnskap-csv', 'Regnskap', 'Årsregnskap – CSV', 'Åpne regnskapstall direkte som CSV. Alle kolonner beholdes som tekst.', '/regnskapsregisteret/regnskap/{org}/csv', { org: true, file: 'csv', separator: ';', bom: true, fields: [['aar', 'Regnskapsår (valgfritt)'], ['regnskapstype', 'Regnskapstype (valgfritt)']], choices: { regnskapstype: ['', 'SELSKAP', 'KONSERN'] }, defaults: { regnskapstype: '' } }),
        topic('regnskap-pdf', 'Regnskap', 'Årsregnskap – PDF-kopi', 'Last ned regnskapsdokumentet for et valgt år. data viser filbanene; PDF-innholdet gjøres ikke om til regnskapstall.', '/regnskapsregisteret/regnskap/aarsregnskap/kopi/{org}/{aar}', { org: true, file: 'pdf', fields: [['aar', 'Regnskapsår']], required: ['aar'] }),
        topic('mellombalanse-pdf', 'Regnskap', 'Mellombalanse – PDF-kopi', 'Last ned dokumentet med ID fra «Oversikt over mellombalanser». data viser filbanene.', '/regnskapsregisteret/regnskap/aarsregnskap/mellombalanse/{org}/{id}', { org: true, file: 'pdf', fields: [['id', 'Mellombalanse-ID']], required: ['id'] }),
        topic('regnskap-oppslag', 'Regnskap', 'Regnskap – direkte oppslag på ID', 'Hent ett regnskap med ID fra årsregnskapsoppslaget.', '/regnskapsregisteret/regnskap/{org}/{id}', { org: true, fields: [['id', 'Regnskaps-ID']], required: ['id'] })
    ];
}
