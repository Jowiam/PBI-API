import { calendarDate, addDays, osloMidnight } from './vegvesen.mjs';

export const POLITIET_API = 'https://api.politiloggen.politiet.no';
export const POLITIET_COLUMNS = ['id', 'threadId', 'category', 'district', 'municipality', 'area', 'isActive', 'text', 'createdOn', 'updatedOn', 'imageUrl', 'previouslyIncludedImage', 'isEdited'];

export function validatePolitietOptions(options) {
    if (!['rolling', 'fixed'].includes(options.period)) throw new Error('Velg periode.');
    if (options.period === 'rolling') {
        if (!Number.isInteger(Number(options.days)) || options.days < 1 || options.days > 365) throw new Error('Velg mellom 1 og 365 døgn.');
    } else {
        calendarDate(options.startDate); calendarDate(options.endDate);
        if (options.startDate > options.endDate) throw new Error('Til-dato må være samme dag som eller etter fra-dato.');
    }
    if (!['', 'true', 'false'].includes(options.active)) throw new Error('Velg gyldig status.');
    for (const key of ['districts', 'municipalities', 'categories']) {
        if (!Array.isArray(options[key]) || options[key].some(v => typeof v !== 'string' || !v.trim())) throw new Error('Ugyldig filter: ' + key);
    }
}

export function politietParameters(options, now = new Date()) {
    validatePolitietOptions(options);
    const parameters = new URLSearchParams();
    for (const [key, name] of [['districts', 'Districts'], ['municipalities', 'Municipalities'], ['categories', 'Categories']]) {
        for (const value of new Set(options[key])) parameters.append(name, value);
    }
    if (options.active !== '') parameters.set('IsActive', options.active);
    if (options.period === 'rolling') {
        parameters.set('DateFrom', new Date(now.getTime() - Number(options.days) * 86400000).toISOString());
        parameters.set('DateTo', now.toISOString());
    } else {
        parameters.set('DateFrom', osloMidnight(options.startDate));
        // Include the entire final Norwegian calendar day, including DST transitions.
        parameters.set('DateTo', new Date(new Date(osloMidnight(addDays(options.endDate, 1))).getTime() - 1).toISOString());
    }
    parameters.set('SortBy', 'Date'); parameters.set('SortOrder', 'Ascending');
    parameters.set('Take', '50'); parameters.set('Skip', '0');
    return parameters;
}

const mString = value => '"' + String(value).replace(/#/g, '#(#)').replace(/"/g, '""').replace(/\r/g, '#(cr)').replace(/\n/g, '#(lf)').replace(/\t/g, '#(tab)') + '"';

export function politietPowerQuery(options) {
    const parameters = politietParameters(options);
    // Keep repeated query keys: URLSearchParams follows OpenAPI's form/explode array encoding.
    for (const key of ['DateFrom', 'DateTo', 'Take', 'Skip']) parameters.delete(key);
    const dates = options.period === 'rolling'
        ? '    To = DateTimeZone.FixedUtcNow(),\n    From = To - #duration(' + Number(options.days) + ', 0, 0, 0),'
        : '    From = DateTimeZone.FromText(' + mString(politietParameters(options).get('DateFrom')) + '),\n    To = DateTimeZone.FromText(' + mString(politietParameters(options).get('DateTo')) + '),';
    return `let
    // Kilde: Politiet, Politiloggen (NLOD 2.0). Velg Anonym som autentisering.
    // Én rad per melding. Flere meldinger kan tilhøre samme threadId.
${dates}
    DateText = (Value as datetimezone) as text => DateTimeZone.ToText(Value, [Format = "yyyy-MM-dd'T'HH:mm:ss.fffzzz", Culture = "en-US"]),
    Filters = ${mString(parameters.toString())},
    ReadPage = (Skip as number) as record =>
        let
            Response = Json.Document(Web.Contents(${mString(POLITIET_API)}, [
                RelativePath = "messages?" & Filters & "&" & Uri.BuildQueryString([DateFrom = DateText(From), DateTo = DateText(To), Take = "50", Skip = Text.From(Skip, "en-US")]),
                Headers = [Accept = "application/json"],
                Timeout = #duration(0, 0, 5, 0)
            ])),
            Checked = if not Record.HasFields(Response, {"messages", "hasMoreResults"}) then error "Uventet respons fra Politiloggen."
                else if not Value.Is(Response[messages], type list) or not Value.Is(Response[hasMoreResults], type logical) then error "Ugyldig side fra Politiloggen."
                else if Response[hasMoreResults] and List.IsEmpty(Response[messages]) then error "Tom side med flere treff. Uttrekket er avbrutt."
                else Response
        in Checked,
    Pages = List.Generate(
        () => [Skip = 0, Page = ReadPage(0)],
        each [Page] <> null,
        each if [Page][hasMoreResults] then [Skip = [Skip] + List.Count([Page][messages]), Page = ReadPage([Skip] + List.Count([Page][messages]))] else [Skip = [Skip], Page = null],
        each [Page][messages]
    ),
    Rows = List.Combine(Pages),
    Data = Table.FromRecords(Rows, {${POLITIET_COLUMNS.map(mString).join(', ')}}, MissingField.UseNull),
    Unique = Table.Distinct(Data, {"id"}),
    Result = Table.TransformColumnTypes(Unique, {${POLITIET_COLUMNS.map(key => '{' + mString(key) + ', ' + (['createdOn', 'updatedOn'].includes(key) ? 'type datetimezone' : ['isActive', 'isEdited', 'previouslyIncludedImage'].includes(key) ? 'type logical' : 'type text') + '}').join(', ')}})
in
    Result`;
}

export async function readPolitietMetadata(options = {}) {
    const response = await fetch('./data/politiet/metadata.json', options);
    if (!response.ok) throw new Error('Kunne ikke laste Politiets filteroversikt. Ta med data/politiet ved publisering.');
    const data = await response.json();
    if (data.version !== 1 || !Array.isArray(data.districts) || !Array.isArray(data.categories)) throw new Error('Ugyldig filteroversikt fra Politiet.');
    return data;
}
