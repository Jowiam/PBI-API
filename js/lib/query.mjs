export function findMetricDimension(previewData) {
    // Finn måltall-dimensjon mer fleksibelt
    const dimNames = previewData.id;
    let metricDimId = null;

    // Metode 1: Sjekk role = 'metric'
    for (let i = 0; i < dimNames.length; i++) {
        const dimId = dimNames[i];
        if (previewData.dimension[dimId].role === 'metric') {
            metricDimId = dimId;
            break;
        }
    }

    // Metode 2: Sjekk for ContentsCode
    if (!metricDimId && dimNames.indexOf('ContentsCode') !== -1) {
        metricDimId = 'ContentsCode';
    }

    // Metode 3: Sjekk label (måltall, contents, variabel)
    if (!metricDimId) {
        for (let i = 0; i < dimNames.length; i++) {
            const dimId = dimNames[i];
            const label = (previewData.dimension[dimId].label || '').toLowerCase();
            if (label.includes('måltall') || label.includes('contents') || label.includes('variabel')) {
                metricDimId = dimId;
                break;
            }
        }
    }

    return metricDimId;
}

export function buildQuery(dimensions, queryConfig, responseFormat, maxRowCount) {
    const query = {
        dimensions: dimensions.map(function(dim) {
            const config = queryConfig[dim.code];

            if (config.filter === 'item') {
                return {
                    code: dim.code,
                    filter: 'item',
                    values: config.selectedCategories
                };
            } else if (config.filter === 'top') {
                return {
                    code: dim.code,
                    filter: 'top',
                    values: [config.topCount || '5']
                };
            } else {
                return {
                    code: dim.code,
                    filter: 'all',
                    values: config.values && config.values.length > 0 ? config.values : ['*']
                };
            }
        }),
        response: {
            format: responseFormat
        }
    };

    if (maxRowCount && maxRowCount !== '') {
        query.response.maxRowCount = parseInt(maxRowCount);
    }

    return query;
}
