export function generatePowerQueryCode(finalQuery, apiBase, sourceId, tableId) {
    if (!finalQuery || !sourceId || !tableId) return '';

    const url = apiBase + '/' + sourceId + '/Table/' + tableId + '/data';
    const jsonFormatted = JSON.stringify(finalQuery, null, 12).split('\n').join('\n        ');
    const jsonEscaped = jsonFormatted.replace(/"/g, '""');

    const powerQueryCode = 'let\n' +
        '    url="' + url + '",\n' +
        '    jsonBody= "' + jsonEscaped + '",\n' +
        '    \n' +
        '    WebCall = Web.Contents(url, [Headers=[#"Content-Type"="application/json"], Content=Text.ToBinary(jsonBody)]),\n' +
        '    \n' +
        '    LinesFromBinary = Lines.FromBinary(WebCall),\n' +
        '    ConvertToTable = Table.FromList(LinesFromBinary, Splitter.SplitTextByDelimiter(";"), null, null, ExtraValues.Error),\n' +
        '    #"Promoted Headers" = Table.PromoteHeaders(ConvertToTable, [PromoteAllScalars=true])\n' +
        'in\n' +
        '    #"Promoted Headers"';

    return powerQueryCode;
}
