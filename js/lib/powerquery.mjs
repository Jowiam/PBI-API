export function generatePowerQueryCode(finalQuery, apiBase, sourceId, tableId) {
    if (!finalQuery || !sourceId || !tableId) return '';

    const url = apiBase + '/' + sourceId + '/Table/' + tableId + '/data';
    const query = { ...finalQuery, response: {
        ...finalQuery.response,
        format: finalQuery.response?.format === 'csv3' ? 'csv3' : 'csv2'
    } };
    const jsonFormatted = JSON.stringify(query, null, 4);
    const jsonEscaped = jsonFormatted.replace(/#/g, '#(#)').replace(/"/g, '""');

    const powerQueryCode = 'let\n' +
        '    url="' + url + '",\n' +
        '    jsonBody= "' + jsonEscaped + '",\n' +
        '    \n' +
        '    WebCall = Web.Contents(url, [Headers=[#"Content-Type"="application/json"], Content=Text.ToBinary(jsonBody, TextEncoding.Utf8)]),\n' +
        '    \n' +
        '    ConvertToTable = Csv.Document(WebCall, [Delimiter=";", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),\n' +
        '    #"Promoted Headers" = Table.PromoteHeaders(ConvertToTable, [PromoteAllScalars=true])\n' +
        'in\n' +
        '    #"Promoted Headers"';

    return powerQueryCode;
}
