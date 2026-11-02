import { ssbDataURL } from './ssb.mjs';
import { UDIR_BASE } from './udir.mjs';
import { TRAFFIC_API, TRAFFIC_MODES, validateTrafficOptions, trafficRequest } from './vegvesen.mjs';

const rString = value => JSON.stringify(String(value));
const rJSON = value => 'jsonlite::fromJSON(' + rString(JSON.stringify(value)) + ', simplifyVector = FALSE)';
const prelude = source => `# Hent data fra ${source} til R. Resultatet ligger i data (data.frame).
# Installer pakkene én gang ved behov:
# install.packages(c("httr2", "jsonlite"))
for (package in c("httr2", "jsonlite")) {
  if (!requireNamespace(package, quietly = TRUE)) {
    stop(paste("Installer pakken", package, "med install.packages()."), call. = FALSE)
  }
}

`;

const requestHelpers = String.raw`perform_request <- function(req) {
  req <- httr2::req_timeout(req, 300)
  req <- httr2::req_retry(req, max_tries = 3)
  httr2::req_perform(req)
}

get_json <- function(url, parameters = list()) {
  req <- do.call(httr2::req_url_query, c(list(httr2::request(url)), parameters))
  httr2::resp_body_json(perform_request(req), simplifyVector = FALSE)
}

parse_number <- function(value) {
  text <- gsub("[[:space:]\u00a0]", "", as.character(value))
  suppressWarnings(as.numeric(gsub(",", ".", text, fixed = TRUE)))
}

rows_to_df <- function(rows, columns = character()) {
  if (length(rows) == 0L) {
    return(as.data.frame(setNames(rep(list(logical()), length(columns)), columns),
                         check.names = FALSE))
  }
  result <- jsonlite::fromJSON(
    jsonlite::toJSON(unname(rows), auto_unbox = TRUE, null = "null", na = "null", digits = NA),
    flatten = TRUE
  )
  if (!is.data.frame(result)) stop("Uventet tabellformat fra API-et.")
  result
}

`;

const finish = String.raw`
print(utils::head(data))
message(nrow(data), " rader hentet til data.")
# Valgfri lagring: write.csv(data, "data.csv", row.names = FALSE, fileEncoding = "UTF-8")
`;

function csvScript(source, url, body) {
    return prelude(source) + requestHelpers +
        'url <- ' + rString(url) + '\n' +
        '# JSON-teksten sendes uendret, slik at også lister med én verdi beholdes.\n' +
        'body <- ' + rString(JSON.stringify(body)) + '\n' +
        String.raw`req <- httr2::request(url)
req <- httr2::req_body_raw(req, charToRaw(enc2utf8(body)), type = "application/json")
response <- perform_request(req)
# resp_body_string bruker tegnsettet i svaret, også ISO-8859-1 fra SSB.
text <- httr2::resp_body_string(response)
data <- utils::read.csv(text = text, sep = ";", quote = "\"", dec = ".",
                        colClasses = "character", na.strings = "", comment.char = "",
                        check.names = FALSE, stringsAsFactors = FALSE)
# Behold koder og originale måltall som tekst. Legg til en numerisk verdikolonne.
if (ncol(data) > 0L) {
  value_column <- names(data)[ncol(data)]
  data[[paste0(value_column, "_tall")]] <- parse_number(data[[value_column]])
}
` + finish;
}

export function fhiRCode(query, apiBase, sourceId, tableId) {
    if (!query || !sourceId || !tableId) return '';
    const body = { ...query, response: { ...query.response, format: query.response?.format === 'csv3' ? 'csv3' : 'csv2' } };
    return csvScript('FHI', apiBase + '/' + encodeURIComponent(sourceId) + '/Table/' + encodeURIComponent(tableId) + '/data', body);
}

export function ssbRCode(tableId, query, dimensions, withCodes = false) {
    const body = { ...query, placement: { stub: dimensions.map(dim => dim.code), heading: [] } };
    return 'library(httr2)\n\n' +
        'url <- ' + rString(ssbDataURL(tableId, 'csv', dimensions, withCodes)) + '\n' +
        'body <- ' + rString(JSON.stringify(body)) + '\n\n' +
        String.raw`response <- request(url) |>
  req_body_raw(charToRaw(enc2utf8(body)), type = "application/json") |>
  req_perform()

data <- read.csv(text = resp_body_string(response), sep = ";",
                 colClasses = "character", na.strings = "", comment.char = "",
                 check.names = FALSE)
`;
}

export function udirRCode(tableId, filter, numericColumns = true) {
    if (!/^\d+$/.test(String(tableId))) throw new Error('Ugyldig Udir-tabellnummer.');
    let script = prelude('Udir') + requestHelpers +
        'base_url <- ' + rString(UDIR_BASE + '/api/rest/v2/Eksport/' + tableId + '/') + '\n' +
        'filter <- ' + rString(filter) + '\n' +
        String.raw`size <- get_json(paste0(base_url, "sideData"), list(filter = filter, format = "0"))
if (length(size) == 0L) stop("Udir returnerte ingen sidemetadata.")
page_count <- as.numeric(size[[1]][["JSONSider"]])
expected_rows <- as.numeric(size[[1]][["Antall"]])
if (length(page_count) != 1L || !is.finite(page_count) || page_count < 0 || page_count != floor(page_count)) {
  stop("Udir returnerte ugyldig antall sider.")
}
if (length(expected_rows) != 1L || !is.finite(expected_rows) || expected_rows < 0 || expected_rows != floor(expected_rows)) {
  stop("Udir returnerte ugyldig antall rader.")
}
pages <- lapply(seq_len(page_count), function(page) {
  get_json(paste0(base_url, "data"), list(filter = filter, format = "0", sideNummer = as.character(page)))
})
rows <- if (length(pages)) do.call(c, pages) else list()
if (length(rows) != expected_rows) stop("Ufullstendig Udir-uttrekk: radantallet stemmer ikke. Prøv igjen.")
data <- rows_to_df(rows)
data <- data[, setdiff(names(data), c("Sidenummer", "RaderSide", "RaderTotalt")), drop = FALSE]
`;
    if (numericColumns) script += String.raw`
# Originalfeltene beholdes, inkludert prikkede verdier (*).
# Ekstra tallkolonner får NA ved manglende/prikkede verdier, ikke 0.
value_columns <- grep("^(Score|Standardavvik)$|^(Antall|Andel)", names(data), value = TRUE)
for (column in value_columns) data[[paste0(column, "_tall")]] <- parse_number(data[[column]])
`;
    return script + finish;
}

export function trafficRCode(points, options) {
    validateTrafficOptions(points, options);
    const request = trafficRequest(points[0], options);
    const interval = options.mode === 'hour' || options.mode === 'day';
    const selected = points.map(point => ({ id: point.id, name: point.name, road: point.road, county: point.county?.name || '', municipality: point.municipality?.name || '', trafficType: point.trafficType }));
    let script = prelude('Statens vegvesen (NLOD)') + requestHelpers +
        'url <- ' + rString(TRAFFIC_API) + '\n' +
        'points <- ' + rJSON(selected) + '\n' +
        'query_text <- ' + rString(request.query) + '\n' +
        String.raw`
post_graphql <- function(variables) {
  req <- httr2::request(url)
  req <- httr2::req_body_json(req, list(query = query_text, variables = variables),
                             auto_unbox = TRUE, null = "null")
  response <- httr2::resp_body_json(perform_request(req), simplifyVector = FALSE)
  if (length(response$errors)) {
    stop(paste(vapply(response$errors, function(error) error$message, character(1)), collapse = "; "))
  }
  if (is.null(response$data)) stop("Vegvesenet returnerte ingen datarespons.")
  response$data
}

`;
    if (interval) script +=
        'from <- ' + rString(request.variables.from) + '\n' +
        'to <- ' + rString(request.variables.to) + '\n' +
        String.raw`read_point <- function(point) {
  rows <- list()
  cursor <- NULL
  seen_cursors <- character()
  repeat {
    response <- post_graphql(list(pointId = point$id, from = from, to = to, after = cursor))
    page <- response$trafficData$volume$intervals
    if (is.null(page) || is.null(page$edges) || !is.logical(page$pageInfo$hasNextPage) || length(page$pageInfo$hasNextPage) != 1L) {
      stop("Uventet sideformat fra Vegvesenet.")
    }
    rows <- c(rows, lapply(page$edges, function(edge) edge$node))
    if (!isTRUE(page$pageInfo$hasNextPage)) break
    next_cursor <- page$pageInfo$endCursor
    if (is.null(next_cursor) || !nzchar(next_cursor) || next_cursor %in% seen_cursors || length(page$edges) == 0L) {
      stop("Sidepekeren fra Vegvesenet mangler eller går ikke videre. Uttrekket er avbrutt.")
    }
    seen_cursors <- c(seen_cursors, next_cursor)
    cursor <- next_cursor
  }
  rows
}
`;
    else if (options.mode === 'adt') script +=
        String.raw`read_point <- function(point) {
  response <- post_graphql(list(pointId = point$id))
  rows <- response$trafficData$volume$average$daily$rows
  Filter(function(row) row$year >= ` + Number(options.startYear) + ' && row$year <= ' + Number(options.endYear) + String.raw`, rows)
}
`;
    else script +=
        'years <- seq.int(' + Number(options.startYear) + ', ' + Number(options.endYear) + ')\n' +
        String.raw`read_point <- function(point) {
  pages <- lapply(years, function(year) {
    response <- post_graphql(list(pointId = point$id, year = as.integer(year)))
    response$trafficData$volume$average$daily$rows
  })
  do.call(c, pages)
}
`;
    script += String.raw`
or_na <- function(value) if (is.null(value) || length(value) == 0L) NA else value
to_row <- function(node, point) {
  list(StasjonId = point$id, Stasjon = point$name, Veg = point$road,
       Fylke = point$county, Kommune = point$municipality, Trafikktype = point$trafficType,
       Datatype = ` + rString(TRAFFIC_MODES[options.mode]) + String.raw`,
       Fra = or_na(node$from), Til = or_na(node$to), Aar = or_na(node$year), Maaned = or_na(node$month),
       Passeringer = or_na(node$total$volumeNumbers$volume),
       Gjennomsnitt_per_doegn = or_na(node$total$volume$average),
       Dekningsgrad_prosent = or_na(node$total$coverage$percentage),
       KI_nedre = or_na(node$total$volume$confidenceInterval$lowerBound),
       KI_oevre = or_na(node$total$volume$confidenceInterval$upperBound))
}
point_rows <- lapply(points, function(point) lapply(read_point(point), function(node) to_row(node, point)))
rows <- do.call(c, point_rows)
columns <- c("StasjonId", "Stasjon", "Veg", "Fylke", "Kommune", "Trafikktype", "Datatype", "Fra", "Til", "Aar", "Maaned", "Passeringer", "Gjennomsnitt_per_doegn", "Dekningsgrad_prosent", "KI_nedre", "KI_oevre")
data <- rows_to_df(rows, columns)
# Tolk ISO-tid med offset og vis tidspunktene i norsk tid, også ved skifte til/fra sommertid.
parse_time <- function(value) {
  text <- sub("Z$", "+0000", as.character(value))
  text <- sub("([+-][0-9]{2}):([0-9]{2})$", "\\1\\2", text)
  as.POSIXct(text, format = "%Y-%m-%dT%H:%M:%OS%z", tz = "Europe/Oslo")
}
for (column in c("Fra", "Til")) data[[column]] <- parse_time(data[[column]])
`;
    return script + finish;
}

export function downloadRScript(code, name) {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name + '.R';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
