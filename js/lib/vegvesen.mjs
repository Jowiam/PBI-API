export const TRAFFIC_API = 'https://trafikkdata-api.atlas.vegvesen.no/';
export const MAX_TRAFFIC_POINTS = 20;
export const TRAFFIC_MODES = {
    hour: 'Trafikkmengde per time', day: 'Trafikkmengde per døgn',
    monthly: 'Gjennomsnittlig døgntrafikk per måned', adt: 'Årsdøgntrafikk (ÅDT)'
};

export function calendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error('Velg en gyldig dato.');
    const parsed = new Date(value + 'T00:00:00Z');
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Velg en gyldig dato.');
    return parsed;
}

export function addDays(value, days) {
    const date = calendarDate(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

export function osloMidnight(value) {
    const date = calendarDate(value);
    // Norwegian DST changes happen after midnight, so the offset at 00 UTC
    // is also the offset at local midnight on that calendar date.
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Oslo', timeZoneName: 'longOffset' })
        .formatToParts(date).find(part => part.type === 'timeZoneName').value.replace('GMT', '');
    return value + 'T00:00:00' + offset;
}

export function validateTrafficOptions(points, options) {
    if (!points.length || points.length > MAX_TRAFFIC_POINTS) throw new Error('Velg mellom 1 og ' + MAX_TRAFFIC_POINTS + ' målestasjoner.');
    if (new Set(points.map(point => point.id)).size !== points.length) throw new Error('Samme målestasjon er valgt flere ganger.');
    if (points.some(point => !/^[A-Za-z0-9_-]{1,80}$/.test(point.id))) throw new Error('Ugyldig stasjons-ID.');
    if (!Object.hasOwn(TRAFFIC_MODES, options.mode)) throw new Error('Velg en datatype.');
    if (options.mode === 'hour' || options.mode === 'day') {
        calendarDate(options.startDate); calendarDate(options.endDate);
        if (options.startDate > options.endDate) throw new Error('Til-dato må være samme dag som eller etter fra-dato.');
    } else {
        const start = Number(options.startYear), end = Number(options.endYear);
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1900 || end > 2100 || start > end) throw new Error('Velg et gyldig årsintervall mellom 1900 og 2100.');
    }
}

export function trafficRequest(point, options) {
    validateTrafficOptions([point], options);
    const common = 'year from to total { volume { average confidenceInterval { lowerBound upperBound } } coverage { percentage } }';
    if (options.mode === 'adt') return {
        query: 'query Traffic($pointId: String!) { trafficData(trafficRegistrationPointId: $pointId) { volume { average { daily { rows: byYear(dayType: ALL) { ' + common + ' } } } } } }',
        variables: { pointId: point.id }
    };
    if (options.mode === 'monthly') return {
        query: 'query Traffic($pointId: String!, $year: Year!) { trafficData(trafficRegistrationPointId: $pointId) { volume { average { daily { rows: byMonth(year: $year, dayType: ALL) { month ' + common + ' } } } } } }',
        variables: { pointId: point.id, year: Number(options.startYear) }
    };
    const resolution = options.mode === 'hour' ? 'byHour' : 'byDay';
    return {
        query: 'query Traffic($pointId: String!, $from: ZonedDateTime!, $to: ZonedDateTime!, $after: String) { trafficData(trafficRegistrationPointId: $pointId) { volume { intervals: ' + resolution + '(from: $from, to: $to, first: 100, after: $after) { pageInfo { hasNextPage endCursor } edges { cursor node { from to total { volumeNumbers { volume } coverage { percentage } } } } } } } }',
        variables: { pointId: point.id, from: osloMidnight(options.startDate), to: osloMidnight(addDays(options.endDate, 1)), after: null }
    };
}

function mString(value) {
    return '"' + String(value ?? '').replace(/#/g, '#(#)').replace(/"/g, '""').replace(/\r/g, '#(cr)').replace(/\n/g, '#(lf)') + '"';
}

export function trafficPowerQuery(points, options) {
    validateTrafficOptions(points, options);
    const request = trafficRequest(points[0], options);
    const intervals = options.mode === 'hour' || options.mode === 'day';
    const pointRecords = points.map(point => '[id = ' + mString(point.id) + ', name = ' + mString(point.name) + ', road = ' + mString(point.road) +
        ', county = ' + mString(point.county?.name) + ', municipality = ' + mString(point.municipality?.name) + ', trafficType = ' + mString(point.trafficType) + ']');
    const lines = [
        'let',
        '    // Kilde: Statens vegvesen (NLOD). Velg Anonym som autentisering.',
        '    Points = {' + pointRecords.join(',\n        ') + '},',
        '    QueryText = ' + mString(request.query) + ',',
        '    Post = (Variables as record) as record =>',
        '        let',
        '            Response = Json.Document(Web.Contents(' + mString(TRAFFIC_API) + ', [',
        '                Headers = [#"Content-Type" = "application/json", Accept = "application/json"],',
        '                Content = Json.FromValue([query = QueryText, variables = Variables]),',
        '                Timeout = #duration(0, 0, 5, 0)',
        '            ])),',
        '            Errors = Record.FieldOrDefault(Response, "errors", {}),',
        '            Checked = if Errors <> null and List.Count(Errors) > 0 then',
        '                error Error.Record("Vegvesenet API", Text.Combine(List.Transform(Errors, each _[message]), "; "), Errors)',
        '                else Record.FieldOrDefault(Response, "data", null)',
        '        in if Checked = null then error "Vegvesenet returnerte ingen datarespons." else Checked,'
    ];
    if (intervals) lines.push(
        '    From = ' + mString(request.variables.from) + ',',
        '    To = ' + mString(request.variables.to) + ',',
        '    ReadPoint = (Point as record) as list =>',
        '        let',
        '            ReadPage = (Cursor as nullable text) as record =>',
        '                let',
        '                    Data = Post([pointId = Point[id], from = From, to = To, after = Cursor]),',
        '                    Page = Data[trafficData][volume][intervals],',
        '                    Info = Page[pageInfo],',
        '                    Checked = if Info[hasNextPage] and (Info[endCursor] = null or Info[endCursor] = "" or Info[endCursor] = Cursor or List.IsEmpty(Page[edges])) then',
        '                        error "Sidepekeren fra Vegvesenet mangler eller flytter seg ikke. Uttrekket er avbrutt for å unngå ufullstendige data." else Page',
        '                in Checked,',
        '            Pages = List.Generate(',
        '                () => [Page = ReadPage(null)],',
        '                each [Page] <> null,',
        '                each if [Page][pageInfo][hasNextPage] then [Page = ReadPage([Page][pageInfo][endCursor])] else [Page = null],',
        '                each List.Transform([Page][edges], each _[node])',
        '            )',
        '        in List.Combine(Pages),'
    );
    else if (options.mode === 'adt') lines.push(
        '    ReadPoint = (Point as record) as list =>',
        '        let Data = Post([pointId = Point[id]]), Rows = Data[trafficData][volume][average][daily][rows]',
        '        in List.Select(Rows, each _[year] >= ' + Number(options.startYear) + ' and _[year] <= ' + Number(options.endYear) + '),'
    );
    else lines.push(
        '    Years = List.Numbers(' + Number(options.startYear) + ', ' + (Number(options.endYear) - Number(options.startYear) + 1) + '),',
        '    ReadPoint = (Point as record) as list =>',
        '        List.Combine(List.Transform(Years, (Year) =>',
        '            let Data = Post([pointId = Point[id], year = Year])',
        '            in Data[trafficData][volume][average][daily][rows])),'
    );
    lines.push(
        '    ToRow = (Node as record, Point as record) as record => [',
        '        StasjonId = Point[id], Stasjon = Point[name], Veg = Point[road],',
        '        Fylke = Point[county], Kommune = Point[municipality], Trafikktype = Point[trafficType],',
        '        Datatype = ' + mString(TRAFFIC_MODES[options.mode]) + ',',
        '        Fra = Record.FieldOrDefault(Node, "from", null), Til = Record.FieldOrDefault(Node, "to", null),',
        '        Aar = Record.FieldOrDefault(Node, "year", null), Maaned = Record.FieldOrDefault(Node, "month", null),',
        '        Passeringer = try Node[total][volumeNumbers][volume] otherwise null,',
        '        Gjennomsnitt_per_doegn = try Node[total][volume][average] otherwise null,',
        '        Dekningsgrad_prosent = try Node[total][coverage][percentage] otherwise null,',
        '        KI_nedre = try Node[total][volume][confidenceInterval][lowerBound] otherwise null,',
        '        KI_oevre = try Node[total][volume][confidenceInterval][upperBound] otherwise null',
        '    ],',
        '    Rows = List.Combine(List.Transform(Points, (Point) => List.Transform(ReadPoint(Point), (Node) => ToRow(Node, Point)))),',
        '    Columns = {"StasjonId", "Stasjon", "Veg", "Fylke", "Kommune", "Trafikktype", "Datatype", "Fra", "Til", "Aar", "Maaned", "Passeringer", "Gjennomsnitt_per_doegn", "Dekningsgrad_prosent", "KI_nedre", "KI_oevre"},',
        '    Data = Table.FromRecords(Rows, Columns, MissingField.UseNull),',
        '    Result = Table.TransformColumnTypes(Data, {',
        '        {"StasjonId", type text}, {"Stasjon", type text}, {"Veg", type text}, {"Fylke", type text}, {"Kommune", type text}, {"Trafikktype", type text}, {"Datatype", type text},',
        '        {"Fra", type datetimezone}, {"Til", type datetimezone}, {"Aar", Int64.Type}, {"Maaned", Int64.Type},',
        '        {"Passeringer", Int64.Type}, {"Gjennomsnitt_per_doegn", type number}, {"Dekningsgrad_prosent", type number}, {"KI_nedre", type number}, {"KI_oevre", type number}',
        '    })',
        'in',
        '    Result'
    );
    return lines.join('\n');
}

export async function readTrafficStations(options = {}) {
    const response = await fetch('./data/vegvesen/stations.json', options);
    if (!response.ok) throw new Error('Kunne ikke laste målestasjonene. Ta med data/vegvesen ved publisering.');
    const data = await response.json();
    if (data.version !== 1 || !Array.isArray(data.stations)) throw new Error('Ugyldig stasjonsoversikt.');
    return data;
}
