import { brregExtraTopics, stotteSearchBody } from './brregExtra.mjs';
export const BRREG_API = 'https://data.brreg.no';
const enhets = '/enhetsregisteret/api';
const frivillig = '/frivillighetsregisteret/api';
const topic = (id, group, title, description, path, extra = {}) => ({ id, group, title, description, path, ...extra });
export const BRREG_TOPICS = [
    topic('enheter', 'Virksomheter', 'Virksomheter og foretak', 'Finn virksomheter etter navn, kommune, organisasjonsform, næringskode og antall ansatte.', `${enhets}/enheter`, { collection: 'enheter', filters: 'enheter', searchLimit: true }),
    topic('underenheter', 'Virksomheter', 'Arbeidssteder og underenheter', 'Finn lokale arbeidssteder, eller underenheter til et bestemt foretak.', `${enhets}/underenheter`, { collection: 'underenheter', filters: 'underenheter', searchLimit: true }),
    topic('roller', 'Roller og fullmakter', 'Roller i en virksomhet', 'Styremedlemmer, daglig leder og andre registrerte roller. Én rad per rolle.', `${enhets}/enheter/{org}/roller`, { org: true, transform: 'roles' }),
    topic('juridiskeroller', 'Roller og fullmakter', 'Virksomhetens roller i andre enheter', 'Enheter der virksomheten selv er registrert som rolleinnehaver. Tilgjengelig for virksomheter med slike roller.', `${enhets}/roller/enheter/{org}/juridiskeroller`, { org: true, collection: 'enheter', directCollection: true }),
    topic('signatur', 'Roller og fullmakter', 'Signaturrett', 'Registrerte opplysninger, grunnlag og kombinasjoner for signaturrett.', '/fullmakt/enheter/{org}/signatur', { org: true }),
    topic('prokura', 'Roller og fullmakter', 'Prokura', 'Registrerte opplysninger, grunnlag og kombinasjoner for prokura.', '/fullmakt/enheter/{org}/prokura', { org: true }),
    topic('konsern', 'Virksomheter', 'Konsernstruktur', 'Registrerte konsernforbindelser. Én rad per node, med overordnet organisasjonsnummer.', `${enhets}/konsernstruktur/{org}`, { org: true, transform: 'tree' }),
    topic('regnskap', 'Regnskap', 'Årsregnskap – nøkkeltall og poster', 'Åpne regnskapstall for de siste tre regnskapsårene. Selskaps- og konsernregnskap kan skilles med filter.', '/regnskapsregisteret/regnskap/{org}', { org: true, array: true, fields: [['år', 'Regnskapsår (valgfritt)'], ['regnskapstype', 'Regnskapstype: SELSKAP eller KONSERN (valgfritt)']] }),
    topic('regnskapsaar', 'Regnskap', 'Tilgjengelige årsregnskap', 'År som finnes i tjenesten for årsregnskapskopier.', '/regnskapsregisteret/regnskap/aarsregnskap/kopi/{org}/aar', { org: true, array: true }),
    topic('mellombalanser', 'Regnskap', 'Oversikt over mellombalanser', 'Registrerte mellombalanser med identifikator og periode.', '/regnskapsregisteret/regnskap/aarsregnskap/mellombalanse/{org}/aar', { org: true, array: true }),
    topic('frivillige', 'Frivillighet', 'Alle frivillige organisasjoner', 'Hent hele den åpne listen over frivillige organisasjoner, med kategorier og registeropplysninger.', `${frivillig}/frivillige-organisasjoner`, { collection: 'frivilligeOrganisasjoner' }),
    topic('frivillig', 'Frivillighet', 'Frivillig organisasjon – oppslag', 'Hent registeropplysninger for én eller flere bestemte organisasjoner.', `${frivillig}/frivillige-organisasjoner/{org}`, { org: true }),
    ...[['enheter', 'Virksomhetsendringer', 'oppdaterteEnheter'], ['underenheter', 'Endringer i arbeidssteder', 'oppdaterteUnderenheter'], ['roller', 'Rolleendringer', null]].map(([id, title, collection]) => topic('endringer-' + id, 'Endringer', title, 'Endringsmeldinger fra valgt tidspunkt. Dette er en endringslogg, ikke et historisk registeruttrekk.', `${enhets}/oppdateringer/${id}`, { collection, array: !collection, events: id === 'roller', fields: [[id === 'roller' ? 'afterTime' : 'dato', 'Fra tidspunkt (UTC)', 'datetime-local'], ...(id === 'roller' ? [] : [['updatedBefore', 'Til tidspunkt (UTC, valgfritt)', 'datetime-local']]), ['organisasjonsnummer', 'Organisasjonsnummer (valgfritt, kommaseparert)']] })),
    ...[
        ['kommuner', 'Kommuner', 'kommuner'],
        ['organisasjonsformer', 'Organisasjonsformer', 'organisasjonsformer'],
        ['organisasjonsformer/enheter', 'Organisasjonsformer for virksomheter', 'organisasjonsformer'],
        ['organisasjonsformer/underenheter', 'Organisasjonsformer for arbeidssteder', 'organisasjonsformer'],
        ['roller/rolletyper', 'Rolletyper', 'rolletyper'],
        ['roller/rollegruppetyper', 'Rollegrupper', 'rollegruppetyper'],
        ['roller/representanter', 'Representanttyper', 'representanter']
    ].map(([path, title, collection]) => topic('kode-' + path.replaceAll('/', '-'), 'Kodeverk', title, 'Koder og beskrivelser fra Enhetsregisteret.', `${enhets}/${path}`, { collection })),
    ...[['icnpo-kategorier', 'Frivillighetskategorier (ICNPO)', 'icnpoKategorier'], ['informasjonstyper', 'Informasjonstyper for frivillighet', 'informasjonstyper']].map(([path, title, collection]) => topic('kode-' + path, 'Kodeverk', title, 'Koder og norske beskrivelser fra Frivillighetsregisteret.', `${frivillig}/${path}`, { collection })),
    topic('fil-enheter', 'Hele registerbestander', 'Alle virksomheter – CSV', 'Hele virksomhetsbestanden. Stor gzip-fil som lastes ned og leses inn i R.', `${enhets}/enheter/lastned/csv`, { file: 'csv', gzip: true }),
    topic('fil-underenheter', 'Hele registerbestander', 'Alle arbeidssteder – CSV', 'Hele underenhetsbestanden. Stor gzip-fil som lastes ned og leses inn i R.', `${enhets}/underenheter/lastned/csv`, { file: 'csv', gzip: true }),
    topic('fil-frivillige', 'Hele registerbestander', 'Alle frivillige organisasjoner – CSV', 'Komplett CSV-fil fra Frivillighetsregisteret.', `${frivillig}/frivillige-organisasjoner/totalbestand/csv`, { file: 'csv' }),
    topic('fil-roller', 'Hele registerbestander', 'Alle roller – last ned registerfil', 'Stor gzip-komprimert JSON-fil. Skriptet lagrer filen lokalt; den leses ikke inn i minnet.', `${enhets}/roller/totalbestand`, { file: 'download', gzip: true }),
    ...[['rapporteringsplikter', 'Kommunale rapporteringsplikter'], ['rapporteringsomraader', 'Kommunale rapporteringsområder'], ['virksomheter', 'Ansvarlige etater – kommunal rapportering']].map(([path, title]) => topic('kor-' + path, 'Kommunal rapportering', title, 'Åpne opplysninger fra Kommunalt rapporteringsregister.', '/kommunalt-rapporteringsregister/api/' + path, { collection: path })),
    topic('oppgaver', 'Offentlige skjema og plikter', 'Alle offentlige skjema i Oppgaveregisteret', 'Skjema og rapporteringsplikter registrert i Oppgaveregisteret. Hele listen hentes i ett kall.', '/oppgaveregisteret/api/skjema/alle.json', { array: true }),
    ...[['organisasjonsform', 'Oppgaveregisterets organisasjonsformer'], ['naeringskode', 'Oppgaveregisterets næringskoder'], ['skjemaeiere', 'Skjemaeiere og etater']].map(([path, title]) => topic('oppgave-' + path, 'Offentlige skjema og plikter', title, path === 'naeringskode' ? 'Registerets egne næringskoder, som ikke nødvendigvis følger siste versjon av SSBs næringsstandard.' : 'Opplysninger og beskrivelser fra Oppgaveregisteret.', '/oppgaveregisteret/api/' + path + '.json', { array: true })),
    ...[['bruksomraade', 'Bruksområder'], ['skjemaformaal', 'Skjemaformål'], ['vedleggskrav', 'Vedleggskrav'], ['eoesTilpasset', 'EØS-tilpasning'], ['rapporteringsform', 'Rapporteringsformer']].map(([path, title]) => topic('oppgave-' + path, 'Offentlige skjema og plikter', title, 'Kodeverk for skjema i Oppgaveregisteret.', '/oppgaveregisteret/api/parameter/' + path + '.json', { array: true })),
    ...brregExtraTopics(topic)
];

export function brregTopic(id) {
    const result = BRREG_TOPICS.find(item => item.id === id);
    if (!result) throw new Error('Velg et tema.');
    return result;
}

// Split literals so pasting into the R console never reaches its 4094-byte line limit.
const quote = value => JSON.stringify(String(value)).replace(/[^\x00-\x7f]/gu, char => {
    const point = char.codePointAt(0);
    return point <= 0xffff ? '\\u' + point.toString(16).padStart(4, '0') : '\\U' + point.toString(16).padStart(8, '0');
});
export function brregRString(value) {
    const chunks = Array.from(String(value)).reduce((all, char, index) => {
        if (index % 200 === 0) all.push('');
        all[all.length - 1] += char; return all;
    }, []);
    return chunks.length > 1 ? 'paste0(\n  ' + chunks.map(quote).join(',\n  ') + '\n)' : quote(value);
}

export function validateBrregOptions(id, options = {}, metadata) {
    const item = brregTopic(id);
    const orgs = [...new Set(String(options.org || '').split(/[\s,;]+/).filter(Boolean))];
    if (item.org && (!orgs.length || orgs.some(org => !/^\d{9}$/.test(org)))) throw new Error('Oppgi ett eller flere organisasjonsnummer med ni siffer.');
    const parameters = { ...item.defaults };
    const allowed = new Set([...(item.fields || []).map(([key]) => key), ...(metadata?.filters?.[item.filters] || []).map(field => field.name)]);
    for (const [key, raw] of Object.entries(options.parameters || {})) {
        const value = String(raw).trim();
        if (!value) continue;
        if (!allowed.has(key)) throw new Error('Filteret støttes ikke: ' + key);
        if (['dato', 'updatedBefore', 'afterTime'].includes(key)) {
            const date = new Date(value.endsWith('Z') ? value : value + 'Z');
            if (!Number.isFinite(date.getTime())) throw new Error('Velg et gyldig tidspunkt.');
            parameters[key] = date.toISOString();
        } else parameters[key] = value;
    }
    if (item.id.startsWith('endringer-') && !(parameters.dato || parameters.afterTime)) throw new Error('Velg tidspunktet endringsloggen skal starte fra.');
    if (parameters.updatedBefore && parameters.dato > parameters.updatedBefore) throw new Error('Til-tidspunkt må være etter fra-tidspunkt.');
    if (parameters['år'] && !/^\d{4}$/.test(parameters['år'])) throw new Error('Regnskapsår må ha fire siffer.');
    if (parameters.regnskapstype && !['SELSKAP', 'KONSERN'].includes(parameters.regnskapstype)) throw new Error('Velg SELSKAP eller KONSERN.');
    if (parameters.organisasjonsnummer && parameters.organisasjonsnummer.split(',').some(value => !/^\d{9}$/.test(value.trim()))) throw new Error('Organisasjonsnummer må ha ni siffer, adskilt med komma.');
    for (const key of item.required || []) if (!parameters[key]) throw new Error('Fyll ut ' + item.fields.find(([name]) => name === key)[1] + '.');
    if (item.requireAny && !item.requireAny.some(key => parameters[key])) throw new Error('Oppgi matrikkel-ID eller matrikkelnummer.');
    for (const [key, values] of Object.entries(item.choices || {})) if (!values.includes(parameters[key])) throw new Error('Velg en gyldig verdi for ' + key + '.');
    if (parameters.aar && !/^\d{4}$/.test(parameters.aar)) throw new Error('Regnskapsår må ha fire siffer.');
    if (parameters.id && !/^[a-zA-Z0-9_-]+$/.test(parameters.id)) throw new Error('Oppgi en gyldig dokument-/regnskaps-ID.');
    for (const key of ['STOETTEMOTTAKER_ORGNR', 'STOETTEGIVER_ORGNR']) if (parameters[key] && !/^\d{9}$/.test(parameters[key])) throw new Error('Organisasjonsnummer må ha ni siffer.');
    for (const key of ['fraTildelingsdato', 'tilTildelingsdato']) if (parameters[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(parameters[key]) || !Number.isFinite(new Date(parameters[key]).getTime()) || new Date(parameters[key]).toISOString().slice(0, 10) !== parameters[key])) throw new Error('Velg en gyldig tildelingsdato.');
    if (parameters.fraTildelingsdato && parameters.tilTildelingsdato && parameters.fraTildelingsdato > parameters.tilTildelingsdato) throw new Error('Til-dato må være etter fra-dato.');
    return { item, orgs, parameters };
}

const flattenCode = `# Nøstede objekter blir kolonner; lister beholdes som JSON i cellene.
flatten_record <- function(x, prefix = "") {
  result <- list()
  for (key in names(x)) {
    if (key == "_links") next
    name <- paste0(prefix, key)
    value <- x[[key]]
    if (is.list(value) && length(value) > 0L && !is.null(names(value))) {
      result <- c(result, flatten_record(value, paste0(name, ".")))
    } else {
      result[name] <- list(if (is.null(value)) NA_character_ else
        if (is.list(value) || length(value) != 1L) as.character(toJSON(value, auto_unbox = TRUE, null = "null")) else value)
    }
  }
  result
}
rows <- lapply(records, function(x) flatten_record(if (is.list(x)) x else list(verdi = x)))
columns <- unique(unlist(lapply(rows, names), use.names = FALSE))
data <- if (length(rows) && length(columns)) do.call(rbind, lapply(rows, function(row) {
  row[setdiff(columns, names(row))] <- NA
  as.data.frame(row[columns], check.names = FALSE, stringsAsFactors = FALSE)
})) else data.frame()
rownames(data) <- NULL`;

export function brregRCode(id, options = {}, metadata) {
    const { item, orgs, parameters } = validateBrregOptions(id, options, metadata);
    const lines = ['# Brønnøysundregistrene: ' + item.title, 'library(httr2)'];
    const base = item.base || BRREG_API;
    const resolvedPath = item.path.replace(/\{([^}]+)\}/g, (token, key) => key === 'org' ? token : encodeURIComponent(parameters[key]));
    const urlExpression = item.org ? 'paste0(' + quote(base + resolvedPath.split('{org}')[0]) + ', org, ' + quote(resolvedPath.split('{org}')[1]) + ')' : brregRString(base + resolvedPath);
    if (item.file) {
        const filename = id + (parameters.aar ? '-' + parameters.aar : '') + (parameters.id ? '-' + parameters.id : '');
        const suffix = '.' + (item.file === 'download' ? 'json' : item.file) + (item.gzip ? '.gz' : '');
        if (item.file === 'xlsx') lines.push('library(readxl)');
        if (item.org) lines.push('', 'tables <- list()', 'for (org in c(\n  ' + orgs.map(quote).join(',\n  ') + '\n)) {');
        const indent = item.org ? '  ' : '';
        const add = text => lines.push(...text.split('\n').map(line => indent + line));
        add('\nurl <- ' + urlExpression);
        add('fil <- ' + (item.org ? 'paste0(' + quote(filename + '-') + ', org, ' + quote(suffix) + ')' : quote(filename + suffix)));
        const query = Object.entries(parameters).filter(([key, value]) => value && !item.path.includes('{' + key + '}'));
        if (query.length) {
            add('parameters <- list(\n  ' + query.map(([key, value]) => quote(key) + ' = ' + brregRString(value)).join(',\n  ') + '\n)');
            add('do.call(req_url_query, c(list(request(url)), parameters)) |>\n  req_headers(Accept = "*/*") |> req_perform(path = fil)');
        } else add('request(url) |> req_headers(Accept = "*/*") |> req_perform(path = fil)');
        if (['download', 'pdf'].includes(item.file)) add('data <- data.frame(fil = normalizePath(fil), format = ' + quote(item.file === 'pdf' ? 'PDF' : 'JSON gzip') + ')');
        else if (item.file === 'xlsx') add('data <- do.call(rbind, lapply(excel_sheets(fil), function(ark) {\n  table <- as.data.frame(read_excel(fil, sheet = ark, col_types = "text", trim_ws = FALSE, .name_repair = "minimal"), check.names = FALSE)\n  table$kilde_ark <- ark\n  table\n}))\nrownames(data) <- NULL');
        else {
            if (item.bom) add('con <- file(fil, open = "rt")\ninvisible(seek(con, where = 3L, origin = "start")) # UTF-8 BOM');
            add('data <- read.csv(' + (item.gzip ? 'gzfile(fil)' : item.bom ? 'con' : 'fil') + ', sep = ' + quote(item.separator || ',') + ',' + (item.columns ? '\n  header = FALSE, col.names = c(\n    ' + item.columns.map(quote).join(',\n    ') + '\n  ),' : '') + '\n  colClasses = "character", check.names = FALSE, encoding = "UTF-8", na.strings = "")');
            if (item.bom) add('close(con)');
        }
        if (item.org) lines.push('  data$spurt_organisasjonsnummer <- rep(org, nrow(data))', '  tables <- c(tables, list(data))', '}', 'data <- do.call(rbind, tables)', 'rownames(data) <- NULL');
        return lines.join('\n') + '\n';
    }
    if (item.stotteSearch) {
        const body = stotteSearchBody(parameters);
        lines.push('library(jsonlite)', '', 'url <- ' + urlExpression, 'filters <- list(' + (body.length ? '\n  ' + body.map(filter => 'list(field = ' + quote(filter.field) + ', value = ' + (Array.isArray(filter.value) ? 'list(\n    ' + filter.value.map(brregRString).join(',\n    ') + '\n  )' : brregRString(filter.value)) + ', matchType = ' + quote(filter.matchType) + ')').join(',\n  ') + '\n' : '') + ')',
            'records <- list()', 'page <- 1L', 'repeat {',
            '  response <- request(url) |>',
            '    req_url_query(pageSize = 1000L, page = page, sortBy = "STOETTETILTAKSNUMMER", sortDirection = "ASC") |>',
            '    req_body_json(filters, auto_unbox = TRUE) |>',
            '    req_perform() |> resp_body_json(simplifyVector = FALSE)',
            '  batch <- response[[' + quote(item.stotteSearch) + ']]',
            '  records <- c(records, batch)', '  if (length(batch) < 1000L) break',
            '  if (page >= 100L) stop("Søkevinduet på 100 000 treff er nådd. Avgrens søket for et komplett uttrekk.")',
            '  page <- page + 1L', '}', '', flattenCode, '');
        return lines.join('\n');
    }
    lines.push('library(jsonlite)', '', 'records <- list()');
    if (item.org) lines.push('organisasjonsnumre <- c(\n  ' + orgs.map(quote).join(',\n  ') + '\n)', 'for (org in organisasjonsnumre) {');
    const indent = item.org ? '  ' : '';
    const add = code => lines.push(...code.split('\n').map(line => indent + line));
    add('url <- ' + urlExpression);
    const params = { ...parameters };
    for (const key of Object.keys(params)) if (item.path.includes('{' + key + '}')) delete params[key];
    if (item.collection) params.size = '1000';
    if (item.events) params.size = '1000';
    add('parameters <- list(' + (Object.keys(params).length ? '\n  ' + Object.entries(params).map(([key, value]) => quote(key) + ' = ' + brregRString(value)).join(',\n  ') + '\n' : '') + ')');
    add('req <- do.call(req_url_query, c(list(request(url)), parameters))');
    add('repeat {\n  response <- req |> req_perform() |> resp_body_json(simplifyVector = FALSE)');
    if (item.searchLimit) add('  if (response$page$totalElements > 10000L)\n    stop("Utvalget har over 10 000 treff. Avgrens filtrene eller velg hele registerbestanden.")');
    if (item.transform === 'roles') {
        add('  for (group in response$rollegrupper) {\n    for (role in group$roller) {\n      role$rollegruppe <- group$type\n      role$spurt_organisasjonsnummer <- org\n      records <- c(records, list(role))\n    }\n  }');
    } else if (item.transform === 'tree') {
        add('  collect_nodes <- function(node) {\n    children <- node$children\n    node$children <- NULL\n    node$spurt_organisasjonsnummer <- org\n    c(list(node), unlist(lapply(children, collect_nodes), recursive = FALSE))\n  }\n  records <- c(records, collect_nodes(response))');
    } else if (item.transform === 'map') {
        add('  batch <- lapply(names(response), function(key) {\n    row <- response[[key]]\n    row$identifikator <- key\n    row\n  })\n  records <- c(records, batch)');
    } else {
        add('  batch <- ' + (item.collection ? (item.directCollection ? 'response[[' : 'response[["_embedded"]][[') + quote(item.collection) + ']]' : item.array ? 'response' : 'list(response)'));
        if (item.org) add('  batch <- lapply(batch, function(row) {\n    if (!is.list(row)) row <- list(verdi = row)\n    row$spurt_organisasjonsnummer <- org\n    row\n  })');
        add('  records <- c(records, batch)');
    }
    if (item.events) {
        add('  if (length(batch) < 1000L) break\n  parameters$afterId <- batch[[length(batch)]]$id\n  parameters$afterTime <- NULL\n  req <- do.call(req_url_query, c(list(request(url)), parameters))');
    } else if (item.collection) {
        add('  next_url <- response[["_links"]][["next"]][["href"]]\n  if (is.null(next_url)) break\n  req <- request(next_url)');
    } else add('  break');
    add('}');
    if (item.org) lines.push('}');
    lines.push('', flattenCode, '');
    return lines.join('\n');
}
