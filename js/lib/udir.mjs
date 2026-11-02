export const UDIR_BASE = 'https://api.statistikkbanken.udir.no';
const endpoint = id => {
    if (!/^\d+$/.test(String(id))) throw new Error('Ugyldig Udir-tabellnummer.');
    return 'api/rest/v2/Eksport/' + id + '/';
};

export function defaultIds(code, expression = '') {
    // Parse only the documented literal list. Never evaluate metadata as JavaScript.
    const match = expression.match(/^\{\s*([A-Za-z][A-Za-z0-9]*)\s*:\s*\[\s*(-?\d+(?:\s*,\s*-?\d+)*)\s*\]\s*\}$/);
    return match?.[1] === code ? match[2].split(',').map(value => value.trim()) : [];
}

export function udirDimensions(metadata) {
    if (metadata.version !== 1 || !metadata.filterSpec || !metadata.filterValues) throw new Error('Ugyldige Udir-filtermetadata.');
    return Object.entries(metadata.filterSpec).map(([code, spec]) => {
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(code)) throw new Error('Ukjent Udir-filterkode.');
        const raw = metadata.filterValues[code];
        if (!Array.isArray(raw) || !raw.length) throw new Error('Filterverdier mangler for ' + code + '.');
        const byIndex = new Map(raw.map(value => [value.indeks, value]));
        const values = raw.map(value => {
            const parents = [];
            const seen = new Set([value.indeks]);
            let parent = byIndex.get(value.forelder);
            while (parent && !seen.has(parent.indeks)) {
                seen.add(parent.indeks);
                if (!parent.skjult) parents.unshift(parent.navn);
                parent = byIndex.get(parent.forelder);
            }
            return {
                id: String(value.id), code: String(value.kode ?? ''), label: value.navn,
                level: value.nivaa, hidden: Boolean(value.skjult), parents,
                restricted: Boolean(value.erBegrenset)
            };
        });
        const defaults = defaultIds(code, spec.defaultFilterUttrykk).filter(id => values.some(value => value.id === id));
        return {
            code, label: spec.navn || code, required: Boolean(spec.erObligatorisk),
            multiple: Boolean(spec.flervalg), geo: code === 'EnhetID',
            levelNames: spec.visningsNavn || [], values, defaults
        };
    });
}

export function udirInitialConfig(dimensions) {
    return Object.fromEntries(dimensions.map(dim => [dim.code, {
        mode: dim.defaults.length || dim.required ? 'item' : 'omit',
        values: dim.defaults.length ? dim.defaults : dim.required ? [dim.values.find(value => !value.hidden)?.id || dim.values[0].id] : []
    }]));
}

export function buildUdirFilter(dimensions, config) {
    const parts = [];
    for (const dim of dimensions) {
        const selected = config[dim.code];
        if (selected?.mode === 'omit' && !dim.required) continue;
        const allowed = new Set(dim.values.map(value => value.id));
        const ids = [...new Set(selected?.values || [])];
        if (!ids.length) throw new Error('Velg minst én verdi for ' + dim.label + '.');
        if (!dim.multiple && ids.length > 1) throw new Error('Velg én verdi for ' + dim.label + '.');
        if (ids.some(id => !allowed.has(id) || !/^-?\d+$/.test(id))) throw new Error('Ugyldig verdi for ' + dim.label + '.');
        parts.push(dim.code + '(' + ids.join('_') + ')');
    }
    if (!parts.length) throw new Error('Velg minst ett filter.');
    return parts.join('_');
}

export function udirDataURL(id, filter, format = 0) {
    return UDIR_BASE + '/' + endpoint(id) + 'data?' + new URLSearchParams({ filter, format: String(format), sideNummer: '1' });
}

export function udirPowerQuery(id, filter, numericColumns = true) {
    const path = endpoint(id);
    const literal = value => '"' + String(value).replace(/#/g, '#(#)').replace(/"/g, '""') + '"';
    const lines = [
        'let',
        '    // Velg Anonym som autentisering. Alle sider hentes fra Udir.',
        '    Base = ' + literal(UDIR_BASE) + ',',
        '    Filter = ' + literal(filter) + ',',
        '    ReadJSON = (Resource as text, Parameters as record) as any =>',
        '        Json.Document(Web.Contents(Base, [',
        '            RelativePath = ' + literal(path) + ' & Resource,',
        '            Query = Parameters,',
        '            Headers = [Accept = "application/json"],',
        '            Timeout = #duration(0, 0, 5, 0)',
        '        ])),',
        '    Size = ReadJSON("sideData", [filter = Filter, format = "0"]),',
        '    PageCountRaw = try Number.From(Size{0}[JSONSider]) otherwise error "Udir returnerte ikke antall sider.",',
        '    ExpectedRows = try Number.From(Size{0}[Antall]) otherwise error "Udir returnerte ikke antall rader.",',
        '    PageCount = if PageCountRaw >= 0 and Number.RoundDown(PageCountRaw) = PageCountRaw then PageCountRaw else error "Ugyldig sidetall fra Udir.",',
        '    ReadPage = (Page as number) as list =>',
        '        let Response = ReadJSON("data", [filter = Filter, format = "0", sideNummer = Text.From(Page, "en-US")])',
        '        in if Value.Is(Response, type list) then Response else error "Uventet dataformat fra Udir.",',
        '    Pages = if PageCount = 0 then {} else List.Transform(List.Numbers(1, PageCount), each ReadPage(_)),',
        '    Rows = List.Combine(Pages),',
        '    CheckedRows = if List.Count(Rows) = ExpectedRows then Rows else',
        '        error Error.Record("Ufullstendig uttrekk", "Udir returnerte et annet radantall enn forventet. Oppdater spørringen og prøv igjen.", [Forventet = ExpectedRows, Hentet = List.Count(Rows)]),',
        '    RawTable = Table.FromRecords(CheckedRows, null, MissingField.UseNull),',
        '    Data = Table.RemoveColumns(RawTable, {"Sidenummer", "RaderSide", "RaderTotalt"}, MissingField.Ignore)' + (numericColumns ? ',' : '')
    ];
    if (numericColumns) lines.push(
        '    // Originalverdier beholdes, inkludert prikkede verdier (*).',
        '    ToNumber = (Cell as any) as nullable number =>',
        '        if Cell = null then null else if Value.Is(Cell, type number) then Cell else',
        '        try Number.FromText(Text.Replace(Text.Replace(Text.Trim(Text.From(Cell)), Character.FromNumber(160), ""), " ", ""), "nb-NO") otherwise null,',
        '    ValueColumns = List.Select(Table.ColumnNames(Data), each',
        '        List.Contains({"Score", "Standardavvik"}, _) or Text.StartsWith(_, "Antall") or Text.StartsWith(_, "Andel")),',
        '    Result = List.Accumulate(ValueColumns, Data, (State, Column) =>',
        '        Table.AddColumn(State, Column & "_tall", each ToNumber(Record.Field(_, Column)), type nullable number))'
    );
    lines.push('in', numericColumns ? '    Result' : '    Data');
    return lines.join('\n');
}

export async function readUdirMetadata(path, options = {}) {
    const response = await fetch('./data/udir/' + path, options);
    if (!response.ok) throw new Error('Kunne ikke laste Udirs filteroversikt. Kontroller at data/udir er publisert sammen med appen.');
    return response.json();
}
