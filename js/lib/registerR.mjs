import { brregRString as q } from './brreg.mjs';

const org = ['org', 'Organisasjonsnummer', 'org'];
const person = ['person', 'Fødselsnummer eller D-nummer', 'person'];
const year = ['asOfYear', 'År (valgfritt)', 'year', false];
const api = (path, fields, rows) => ({ source: 'Roaring', auth: 'roaring', path: 'https://api.roaring.io' + path, fields, rows });
export const REGISTER_QUERIES = {
    aksjonaerer: {
        csv: { source: 'Skatteetaten · bestilt aksjonæruttrekk', auth: 'file', fields: [['separator', 'Skilletegn i CSV-filen', 'separator'], ['encoding', 'Tegnsett i CSV-filen', 'encoding']] },
        roaring: api('/no/company/owner-structure/1.0/{org}', [org, year, ['depth', 'Dybde i eierkjeden (0 = alle nivåer)', 'integer', false], ['includeShareQuotas', 'Ta med aksjedetaljer', 'boolean', false]], 'ownerNodes')
    },
    'rettighetshavere-register': {
        brreg: { source: 'Brønnøysundregistrene · reelle rettighetshavere', auth: 'rrh', path: 'https://rrh.brreg.no/api/oppslag/v1/virksomheter/{org}', fields: [org] },
        roaring: api('/no/company/beneficial-owners/2.0/latest/{org}', [org])
    },
    'rettighetshavere-beregnet': { roaring: api('/no/company/beneficial-owners/1.0/{org}', [org, year, ['includeShareQuotas', 'Ta med aksjedetaljer', 'boolean', false]], 'beneficialOwners') },
    'alternative-rettighetshavere': { roaring: api('/no/company/alt-beneficial-owners/1.0/{org}', [org, year], 'altBeneficialOwners') },
    personroller: { roaring: api('/no/company/engagement/1.0/{person}', [person, ['asOfDate', 'Dato for oppslag (valgfritt)', 'date', false]], 'engagements') },
    folkeregister: {
        skatteetaten: { source: 'Skatteetaten · Folkeregisteret, entydig søk', auth: 'freg', path: 'https://folkeregisteret.api.skatteetaten.no/folkeregisteret/offentlig-med-hjemmel/api/v1/personer/entydigsoek', fields: [['navn', 'Fullt navn (minst fornavn og etternavn)', 'name'], ['identifikasjonsnummer', 'Fødselsnummer eller D-nummer', 'person']] },
        roaring: api('/no/person/2.0/findone', [['name', 'Fullt navn (minst fornavn og etternavn)', 'name'], ['personId', 'Fødselsnummer eller D-nummer', 'person']], 'records')
    },
    risiko: { roaring: api('/no/company/risk/1.0/{templateId}/{org}', [org, ['templateId', 'ID for risikomal i Roaring', 'uuid']]) },
    pep: { roaring: api('/nordic/pep/1.1/search', [['firstName', 'Fornavn', 'text'], ['lastName', 'Etternavn', 'text'], ['birthDate', 'Fødselsdato (valgfritt)', 'date', false]]) },
    'regnskap-utvidet': { roaring: api('/no/company/financial-information/1.0/{org}', [org, ['years', 'Antall regnskapsår (1–5)', 'years']], 'records') },
    'aktivitet-utvidet': { roaring: api('/no/company/activity/1.0/{org}', [org], 'records') }
};

export function registerQuery(id, route) {
    const routes = REGISTER_QUERIES[id];
    const query = routes?.[route || Object.keys(routes || {})[0]];
    if (!query) throw new Error('Velg en gyldig datakilde.');
    return query;
}

export function registerDefaults(id, route) {
    const query = registerQuery(id, route);
    return Object.fromEntries(query.fields.map(([key, , type]) => [key, type === 'separator' ? ';' : type === 'encoding' ? 'UTF-8' : type === 'years' ? '5' : '']));
}

export function registerRequest(id, route, values = {}) {
    const query = registerQuery(id, route);
    let url = query.path;
    const parameters = {};
    for (const [key, label, type, required = true] of query.fields) {
        const value = String(values[key] ?? '').trim();
        if (!value && !required) continue;
        if (!value) throw new Error('Fyll inn ' + label.toLocaleLowerCase('nb') + '.');
        if (type === 'org' && !/^\d{9}$/.test(value)) throw new Error('Organisasjonsnummer må ha ni siffer.');
        if (type === 'person' && !/^\d{11}$/.test(value)) throw new Error('Fødselsnummer eller D-nummer må ha elleve siffer.');
        if (type === 'year' && !/^\d{4}$/.test(value)) throw new Error('År må ha fire siffer.');
        if (type === 'integer' && (!/^\d{1,6}$/.test(value))) throw new Error('Dybde må være et heltall fra 0 til 999999.');
        if (type === 'years' && !/^[1-5]$/.test(value)) throw new Error('Velg fra ett til fem regnskapsår.');
        if (type === 'uuid' && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)) throw new Error('Oppgi en gyldig UUID for risikomalen.');
        if (type === 'name' && value.split(/\s+/).length < 2) throw new Error('Oppgi både fornavn og etternavn.');
        if (type === 'boolean' && !['true', 'false'].includes(value)) throw new Error('Velg ja eller nei.');
        if (type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error('Oppgi en gyldig dato.');
        if (type === 'separator' && ![';', ',', '\\t'].includes(value)) throw new Error('Velg et gyldig skilletegn.');
        if (type === 'encoding' && !['UTF-8', 'latin1'].includes(value)) throw new Error('Velg et gyldig tegnsett.');
        if (url?.includes('{' + key + '}')) url = url.replace('{' + key + '}', encodeURIComponent(value));
        else parameters[key] = value;
    }
    if (id === 'pep') parameters.countryCode = 'NO';
    return { ...query, url, parameters };
}

const flatten = String.raw`
# Ett objekt per rad. Nøstede objekter flates ut; lister beholdes som JSON.
flatten_object <- function(x, prefix = "") {
  out <- list()
  if (!is.list(x) || is.null(names(x))) return(list(value = jsonlite::toJSON(x, auto_unbox = TRUE, null = "null")))
  for (key in names(x)) {
    name <- if (nzchar(prefix)) paste(prefix, key, sep = ".") else key
    value <- x[[key]]
    if (is.null(value)) out[name] <- list(NA_character_)
    else if (is.list(value) && !is.null(names(value)) && length(value)) out <- c(out, flatten_object(value, name))
    else if (is.list(value) || length(value) != 1L) out[name] <- list(as.character(jsonlite::toJSON(value, auto_unbox = TRUE, null = "null")))
    else out[name] <- list(as.character(value))
  }
  out
}
rows_to_data <- function(rows) {
  if (!length(rows)) return(data.frame())
  rows <- lapply(rows, flatten_object)
  columns <- unique(unlist(lapply(rows, names), use.names = FALSE))
  result <- lapply(columns, function(key) vapply(rows, function(row) if (is.null(row[[key]])) NA_character_ else row[[key]], character(1)))
  names(result) <- columns
  as.data.frame(result, check.names = FALSE, stringsAsFactors = FALSE)
}
`;

export function registerRCode(id, route, values) {
    const query = registerRequest(id, route, values);
    let code = '# Hent data fra ' + query.source + '. Resultatet ligger i data.\n';
    if (query.auth === 'file') return code + `# Bestill CSV hos https://www.skatteetaten.no/deling/aksjonarregisteret/\n# Velg den nedlastede og eventuelt utpakkede CSV-filen.\nfil <- file.choose()\ndata <- utils::read.table(fil, header = TRUE, sep = ${q(query.parameters.separator === '\\t' ? '\t' : query.parameters.separator)},\n  encoding = ${q(query.parameters.encoding)}, colClasses = "character",\n  quote = "\\\"", comment.char = "", check.names = FALSE,\n  stringsAsFactors = FALSE, na.strings = "", fill = FALSE)\n`;
    code += '# install.packages(c("httr2", "jsonlite")) # ved behov\n';
    if (query.auth === 'roaring') code += String.raw`
# Sett ROARING_CLIENT_ID og ROARING_CLIENT_SECRET i R-miljøet før kjøring.
# Tilgang til det valgte produktet må være aktivert hos Roaring.
client_id <- Sys.getenv("ROARING_CLIENT_ID")
client_secret <- Sys.getenv("ROARING_CLIENT_SECRET")
if (!nzchar(client_id) || !nzchar(client_secret)) stop("Sett ROARING_CLIENT_ID og ROARING_CLIENT_SECRET i R-miljøet.", call. = FALSE)
token_request <- httr2::request("https://api.roaring.io/token")
token_request <- httr2::req_auth_basic(token_request, client_id, client_secret)
token_request <- httr2::req_body_form(token_request, grant_type = "client_credentials")
token_response <- httr2::req_perform(token_request)
token <- httr2::resp_body_json(token_response)$access_token
if (is.null(token) || !nzchar(token)) stop("Roaring returnerte ikke et tilgangstoken.", call. = FALSE)
`;
    else code += `\n# Sett et gyldig Maskinporten-token med riktig tilgang i R-miljøet.\ntoken <- Sys.getenv(${q(query.auth === 'rrh' ? 'BRREG_RRH_TOKEN' : 'FREG_TOKEN')})\nif (!nzchar(token)) stop(${q('Sett ' + (query.auth === 'rrh' ? 'BRREG_RRH_TOKEN' : 'FREG_TOKEN') + ' i R-miljøet før kjøring.')}, call. = FALSE)\n`;
    if (query.auth === 'freg') code += '# Dette endepunktet gjelder rettighetspakken offentlig-med-hjemmel.\n';
    code += '\nreq <- httr2::request(' + q(query.url) + ')\n';
    if (Object.keys(query.parameters).length) code += 'req <- httr2::req_url_query(req,\n  ' + Object.entries(query.parameters).map(([key, value]) => key + ' = ' + q(value)).join(',\n  ') + '\n)\n';
    code += String.raw`req <- httr2::req_auth_bearer_token(req, token)
req <- httr2::req_headers(req, Accept = "application/json")
req <- httr2::req_timeout(req, 120)
response <- httr2::req_perform(req)
resultat <- httr2::resp_body_json(response, simplifyVector = FALSE)
# Behold hele API-svaret i resultat, inkludert metadata og eventuelle underlister.
# Ikke presenter en paginert respons som et komplett uttrekk.
if (!is.null(resultat$pagination)) stop("API-et returnerte sideinformasjon. Bruk et smalere oppslag; hele svaret ligger i resultat.", call. = FALSE)
` + flatten;
    if (query.rows) code += '\nrows <- resultat[[' + q(query.rows) + ']]\nif (is.null(rows)) stop("Forventet resultatfelt mangler; se resultat for API-status og respons.", call. = FALSE)\n';
    else code += '\nrows <- list(resultat)\n';
    return code + 'data <- rows_to_data(rows)\n';
}
