export const NVDB_API = 'https://nvdbapiles.atlas.vegvesen.no';
export const NVDB_CLIENT = 'PBI-API-query-builder';
export const NVDB_COLUMNS = ['ObjektId', 'ObjekttypeId', 'Objekttype', 'Versjon', 'Startdato', 'Sist_endret', 'Fylkesnummer', 'Kommunenummer', 'Vegreferanse', 'Lengde_m'];
export const NVDB_ROADS = { E: 'Europaveg', R: 'Riksveg', F: 'Fylkesveg', K: 'Kommunal veg', P: 'Privat veg', S: 'Skogsbilveg' };

export function nvdbParameters(typeId, options = {}, pageSize = 1000) {
    if (!/^\d+$/.test(String(typeId)) || Number(typeId) < 1) throw new Error('Velg en vegobjekttype.');
    const { county = '', municipality = '', roadCategory = '', roadNumber = '' } = options;
    if (county && !/^\d{2}$/.test(county)) throw new Error('Velg et gyldig fylke.');
    if (municipality && (!/^\d{4}$/.test(municipality) || county && !municipality.startsWith(county))) throw new Error('Kommunen må tilhøre valgt fylke.');
    if (roadCategory && !Object.hasOwn(NVDB_ROADS, roadCategory)) throw new Error('Velg en gyldig vegkategori.');
    if (roadNumber && (!roadCategory || !/^\d{1,5}$/.test(roadNumber) || Number(roadNumber) < 1)) throw new Error('Velg vegkategori og et gyldig vegnummer.');
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error('Ugyldig sidestørrelse.');
    const parameters = { antall: String(pageSize), inkluder: 'metadata,egenskaper,lokasjon' + (options.geometry ? ',geometri' : '') };
    if (county) parameters.fylke = county;
    if (municipality) parameters.kommune = municipality;
    if (roadCategory) parameters.vegsystemreferanse = roadCategory + 'V' + (roadNumber ? Number(roadNumber) : '');
    return parameters;
}

export function nvdbURL(typeId, options = {}, pageSize = 1000) {
    return NVDB_API + '/vegobjekter/api/v4/vegobjekter/' + typeId + '?' + new URLSearchParams(nvdbParameters(typeId, options, pageSize));
}

export function flattenNvdbObject(object, geometry = false) {
    const metadata = object.metadata || {}, location = object.lokasjon || {};
    const row = {
        ObjektId: object.id, ObjekttypeId: metadata.type?.id ?? null, Objekttype: metadata.type?.navn ?? null,
        Versjon: metadata.versjon ?? null, Startdato: metadata.startdato ?? null, Sist_endret: metadata.sist_modifisert ?? null,
        Fylkesnummer: (location.fylker || []).map(n => String(n).padStart(2, '0')).join(', '),
        Kommunenummer: (location.kommuner || []).map(n => String(n).padStart(4, '0')).join(', '),
        Vegreferanse: (location.vegsystemreferanser || []).map(v => v.kortform).filter(Boolean).join(', '),
        Lengde_m: location.lengde ?? null,
    };
    if (geometry) Object.assign(row, { Geometri_WKT: object.geometri?.wkt ?? null, Geometri_SRID: object.geometri?.srid ?? null });
    for (const property of object.egenskaper || []) {
        const value = Object.hasOwn(property, 'verdi') ? property.verdi : property;
        row['E' + property.id + '_' + property.navn] = value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
    }
    return row;
}

export async function readNvdbCatalog(options = {}) {
    const response = await fetch('./data/vegvesen/nvdb.json', options);
    if (!response.ok) throw new Error('Kunne ikke laste NVDB-oversikten. Ta med data/vegvesen/nvdb.json ved publisering.');
    const data = await response.json();
    if (data.version !== 1 || !Array.isArray(data.types) || !Array.isArray(data.counties) || !Array.isArray(data.municipalities)) throw new Error('Ugyldig NVDB-oversikt.');
    return data;
}

export async function previewNvdb(typeId, options, signal) {
    const response = await fetch(nvdbURL(typeId, options, 20), { signal, headers: { 'X-Client': NVDB_CLIENT, Accept: 'application/json' } });
    if (!response.ok) throw new Error('NVDB svarte med HTTP ' + response.status + '. Prøv igjen eller velg et annet utvalg.');
    const data = await response.json();
    if (!Array.isArray(data.objekter)) throw new Error('NVDB returnerte et uventet dataformat.');
    return data.objekter.map(object => flattenNvdbObject(object, options.geometry));
}

const mString = value => '"' + String(value).replace(/#/g, '#(#)').replace(/"/g, '""').replace(/\r/g, '#(cr)').replace(/\n/g, '#(lf)') + '"';
const rString = value => JSON.stringify(String(value));

export function nvdbPowerQuery(typeId, options = {}) {
    const parameters = nvdbParameters(typeId, options);
    const columns = [...NVDB_COLUMNS, ...(options.geometry ? ['Geometri_WKT', 'Geometri_SRID'] : [])];
    return `let
    Filters = [${Object.entries(parameters).map(([k, v]) => k + ' = ' + mString(v)).join(', ')}],
    ReadPage = (Start as nullable text) as record => Json.Document(Web.Contents(${mString(NVDB_API)}, [
        RelativePath = ${mString('vegobjekter/api/v4/vegobjekter/' + typeId)},
        Query = Record.Combine({Filters, if Start = null then [] else [start = Start]}),
        Headers = [#"X-Client" = ${mString(NVDB_CLIENT)}, Accept = "application/json"]
    ])),
    Pages = List.Generate(
        () => [Page = ReadPage(null)],
        each [Page] <> null and not List.IsEmpty([Page][objekter]),
        each let Next = try [Page][metadata][neste][start] otherwise null
             in [Page = if Next = null then null else ReadPage(Next)],
        each [Page][objekter]
    ),
    Objects = List.Combine(Pages),
    ToRow = (Object as record) as record =>
        let
            M = Record.FieldOrDefault(Object, "metadata", []),
            L = Record.FieldOrDefault(Object, "lokasjon", []),
            Base = [
                ObjektId = Object[id], ObjekttypeId = try M[type][id] otherwise null,
                Objekttype = try M[type][navn] otherwise null, Versjon = Record.FieldOrDefault(M, "versjon", null),
                Startdato = Record.FieldOrDefault(M, "startdato", null), Sist_endret = Record.FieldOrDefault(M, "sist_modifisert", null),
                Fylkesnummer = Text.Combine(List.Transform(Record.FieldOrDefault(L, "fylker", {}), each Text.PadStart(Text.From(_), 2, "0")), ", "),
                Kommunenummer = Text.Combine(List.Transform(Record.FieldOrDefault(L, "kommuner", {}), each Text.PadStart(Text.From(_), 4, "0")), ", "),
                Vegreferanse = Text.Combine(List.RemoveNulls(List.Transform(Record.FieldOrDefault(L, "vegsystemreferanser", {}), each Record.FieldOrDefault(_, "kortform", null))), ", "),
                Lengde_m = Record.FieldOrDefault(L, "lengde", null)${options.geometry ? ',\n                Geometri_WKT = try Object[geometri][wkt] otherwise null, Geometri_SRID = try Object[geometri][srid] otherwise null' : ''}
            ],
            Properties = List.Transform(Record.FieldOrDefault(Object, "egenskaper", {}), (P) =>
                let V = if Record.HasFields(P, "verdi") then P[verdi] else P,
                    Value = if Value.Is(V, type record) or Value.Is(V, type list) then Text.FromBinary(Json.FromValue(V), TextEncoding.Utf8) else V
                in Record.AddField([], "E" & Text.From(P[id]) & "_" & P[navn], Value))
        in Record.Combine({Base} & Properties),
    Rows = List.Transform(Objects, ToRow),
    Columns = List.Union({{${columns.map(mString).join(', ')}}, List.Combine(List.Transform(Rows, each Record.FieldNames(_)))}),
    Data = Table.FromRecords(Rows, Columns, MissingField.UseNull),
    Result = Table.TransformColumnTypes(Data, {{"ObjektId", Int64.Type}, {"ObjekttypeId", Int64.Type}, {"Versjon", Int64.Type}, {"Startdato", type date}, {"Sist_endret", type datetimezone}, {"Fylkesnummer", type text}, {"Kommunenummer", type text}, {"Lengde_m", type number}})
in
    Result`;
}

export function nvdbRCode(typeId, options = {}) {
    const parameters = nvdbParameters(typeId, options);
    return `library(httr2)
library(jsonlite)

url <- ${rString(NVDB_API + '/vegobjekter/api/v4/vegobjekter/' + typeId)}
parameters <- list(
  ${Object.entries(parameters).map(([k, v]) => k + ' = ' + rString(v)).join(',\n  ')}
)
objects <- list()
start <- NULL
repeat {
  query <- parameters
  if (!is.null(start)) query$start <- start
  page <- do.call(req_url_query, c(list(request(url)), query)) |>
    req_headers("X-Client" = ${rString(NVDB_CLIENT)}, Accept = "application/json") |>
    req_perform() |>
    resp_body_json(simplifyVector = FALSE)
  if (!length(page$objekter)) break
  objects <- c(objects, page$objekter)
  start <- page$metadata$neste$start
  if (is.null(start)) break
}

rows <- lapply(objects, function(object) {
  m <- object$metadata
  loc <- object$lokasjon
  row <- list(
    ObjektId = object$id, ObjekttypeId = m$type$id, Objekttype = m$type$navn,
    Versjon = m$versjon, Startdato = m$startdato, Sist_endret = m$sist_modifisert,
    Fylkesnummer = paste(sprintf("%02d", as.integer(unlist(loc$fylker))), collapse = ", "),
    Kommunenummer = paste(sprintf("%04d", as.integer(unlist(loc$kommuner))), collapse = ", "),
    Vegreferanse = paste(unlist(lapply(loc$vegsystemreferanser, function(v) v$kortform)), collapse = ", "),
    Lengde_m = loc$lengde${options.geometry ? ',\n    Geometri_WKT = object$geometri$wkt, Geometri_SRID = object$geometri$srid' : ''}
  )
  row <- lapply(row, function(value) if (is.null(value)) NA else value)
  for (p in object$egenskaper) {
    value <- if ("verdi" %in% names(p)) p$verdi else p
    row[[paste0("E", p$id, "_", p$navn)]] <- if (is.null(value)) NA else if (is.list(value)) {
      as.character(toJSON(value, auto_unbox = TRUE, null = "null", digits = NA))
    } else value
  }
  row
})
data <- as.data.frame(fromJSON(toJSON(rows, auto_unbox = TRUE, null = "null", na = "null", digits = NA)),
                      check.names = FALSE)
`;
}
