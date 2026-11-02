// SSB PxWebApi v2. All requests work directly from a static website.
export const SSB_BASE = 'https://data.ssb.no/api/pxwebapi/v2';
export const SSB_MAX_CELLS = 800000;

export function categoryCodes(category) {
    const index = category?.index;
    return Array.isArray(index) ? [...index] : Object.keys(index || {}).sort((a, b) => index[a] - index[b]);
}

export function readDimensions(metadata) {
    if (!Array.isArray(metadata.id) || !metadata.dimension) throw new Error('SSB returnerte et ukjent metadataformat.');
    return metadata.id.map(code => {
        const dim = metadata.dimension[code];
        const codes = categoryCodes(dim.category);
        if (!codes.length) throw new Error('Variabelen ' + code + ' mangler verdier.');
        return {
            code, label: dim.label || code, codes,
            labels: dim.category.label || {}, units: dim.category.unit || {},
            time: (metadata.role?.time || []).includes(code),
            geo: (metadata.role?.geo || []).includes(code)
        };
    });
}

export function initialSelections(dimensions) {
    return Object.fromEntries(dimensions.map(dim => [dim.code, dim.time
        ? { mode: 'latest', count: Math.min(3, dim.codes.length), values: [] }
        : { mode: 'item', values: [dim.codes[0]] }]));
}

export function buildSSBSelection(dimensions, config) {
    return { selection: dimensions.map(dim => {
        const value = config[dim.code];
        if (!value) throw new Error('Velg verdier for ' + dim.label + '.');
        let valueCodes;
        if (value.mode === 'all') valueCodes = ['*'];
        else if (value.mode === 'latest') {
            if (!dim.time || !Number.isInteger(Number(value.count)) || Number(value.count) < 1 || Number(value.count) > dim.codes.length) {
                throw new Error('Velg mellom 1 og ' + dim.codes.length + ' perioder for ' + dim.label + '.');
            }
            valueCodes = ['top(' + Number(value.count) + ')'];
        } else {
            const selected = new Set(value.values);
            valueCodes = dim.codes.filter(code => selected.has(code));
            if (!valueCodes.length) throw new Error('Velg minst én verdi for ' + dim.label + '.');
        }
        return { variableCode: dim.code, valueCodes };
    }) };
}

export function estimateCells(dimensions, config) {
    return dimensions.reduce((total, dim) => {
        const value = config[dim.code];
        const selected = new Set(value?.values || []);
        const count = value?.mode === 'all' ? dim.codes.length
            : value?.mode === 'latest' ? Math.min(dim.codes.length, Math.max(0, Number(value.count) || 0))
            : dim.codes.filter(code => selected.has(code)).length;
        return total * count;
    }, 1);
}

export function ssbDataURL(tableId, format = 'json-stat2', dimensions = [], codes = false) {
    if (!/^\d{5}$/.test(tableId)) throw new Error('Tabellnummer må ha fem siffer.');
    const params = new URLSearchParams({ lang: 'no', outputFormat: format });
    if (format === 'csv') {
        params.set('outputFormatParams', 'SeparatorSemicolon,' + (codes ? 'UseCodesAndTexts' : 'UseTexts'));
        params.set('stub', dimensions.map(dim => dim.code).join(','));
        params.set('heading', '');
    }
    return SSB_BASE + '/tables/' + tableId + '/data?' + params;
}

export function ssbGetURL(tableId, query) {
    const url = new URL(ssbDataURL(tableId));
    query.selection.forEach(item => url.searchParams.set('valueCodes[' + item.variableCode + ']', item.valueCodes.join(',')));
    return url.href;
}

export function ssbPowerQuery(tableId, query, dimensions, codes = false) {
    const params = new URL(ssbDataURL(tableId, 'csv', dimensions, codes)).searchParams;
    // POST uses placement in its body; stub/heading URL parameters apply to GET only.
    const csvQuery = { ...query, placement: { stub: dimensions.map(dim => dim.code), heading: [] } };
    const mString = value => '"' + String(value).replace(/"/g, '""') + '"';
    return 'let\n' +
        '    // Bruk anonym tilkobling til data.ssb.no.\n' +
        '    Body = ' + mString(JSON.stringify(csvQuery)) + ',\n' +
        '    Source = Web.Contents(' + mString(SSB_BASE) + ', [\n' +
        '        RelativePath = ' + mString('tables/' + tableId + '/data') + ',\n' +
        '        Query = [' + [...params].map(([key, value]) => '#"' + key + '" = ' + mString(value)).join(', ') + '],\n' +
        '        Headers = [#"Content-Type" = "application/json"],\n' +
        '        Content = Text.ToBinary(Body, TextEncoding.Utf8)\n' +
        '    ]),\n' +
        '    CSV = Csv.Document(Source, [Delimiter = ";", Encoding = 28591, QuoteStyle = QuoteStyle.Csv]),\n' +
        '    Result = Table.PromoteHeaders(CSV, [PromoteAllScalars = true])\n' +
        'in\n    Result';
}

export function datasetView(data) {
    if (!Array.isArray(data.id) || !Array.isArray(data.size) || data.value == null) {
        throw new Error('SSB returnerte et ukjent dataformat.');
    }
    const axes = data.id.map(code => {
        const dim = data.dimension[code];
        return { code, label: dim.label || code, codes: categoryCodes(dim.category), category: dim.category };
    });
    const length = data.size.reduce((a, b) => a * b, 1);
    const metricIndex = data.id.findIndex(code => data.role?.metric?.includes(code));
    return {
        headers: axes.map(axis => axis.label).concat(['Enhet', 'Verdi', 'Status']),
        length,
        row(index, withCodes = false) {
            let position = index;
            const codes = new Array(axes.length);
            for (let i = axes.length - 1; i >= 0; i--) {
                codes[i] = axes[i].codes[position % data.size[i]];
                position = Math.floor(position / data.size[i]);
            }
            const labels = axes.map((axis, i) => {
                const label = axis.category.label?.[codes[i]] ?? codes[i];
                return withCodes ? codes[i] + ' – ' + label : label;
            });
            const unit = metricIndex < 0 ? '' : axes[metricIndex].category.unit?.[codes[metricIndex]]?.base || '';
            const status = typeof data.status === 'string' ? data.status : data.status?.[index] ?? '';
            return labels.concat([unit, data.value[index] ?? null, status]);
        }
    };
}

export function datasetCSV(data, withCodes = false) {
    const view = datasetView(data);
    // Keep text cells from being interpreted as Excel formulas; numeric values stay numeric.
    const quote = value => {
        let text = value == null ? '' : String(value);
        if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    };
    const lines = [view.headers.map(quote).join(';')];
    for (let i = 0; i < view.length; i++) lines.push(view.row(i, withCodes).map(quote).join(';'));
    return '\uFEFF' + lines.join('\r\n');
}

export async function fetchSSB(url, options = {}) {
    let response;
    try { response = await fetch(url, options); }
    catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('Kunne ikke nå SSB. Sjekk nettilkoblingen og prøv igjen.');
    }
    if (!response.ok) {
        const messages = {
            400: 'SSB kunne ikke utføre uttrekket. Kontroller verdiene eller velg et mindre utvalg.',
            404: 'Fant ikke tabellen hos SSB. Kontroller tabellnummeret.',
            429: 'SSBs grense for antall forespørsler er nådd. Vent ett minutt og prøv igjen.',
            503: 'SSB er midlertidig utilgjengelig. Prøv igjen senere.'
        };
        throw new Error(messages[response.status] || 'Feil fra SSB (HTTP ' + response.status + '). Prøv igjen.');
    }
    return response.json();
}
