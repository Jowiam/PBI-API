import { tokenizeJson } from '../lib/jsonHighlight.mjs';

const h = React.createElement;

function renderHighlightedJson(jsonString) {
    return tokenizeJson(jsonString).map(function(token, idx) {
        if (token.type === 'punctuation') return token.text;
        return h('span', { key: idx, className: 'json-' + token.type }, token.text);
    });
}

export function renderQueryResult(
    finalQuery, selectedSource, selectedTable, dimensions,
    previewData, outputFormat, loading, error, firstSentence, geoMappingUrl,
    fetchPreview, copyToClipboard, generatePowerQueryCode, findMetricDimension, getTableLabel,
    setOutputFormat, setStep,
    setSelectedSource, setSelectedTable, setDimensions, setQueryConfig, setFinalQuery, setPreviewData,
    API_BASE, Icons
) {
    const queryString = JSON.stringify(finalQuery, null, 2);
    const powerQueryCode = generatePowerQueryCode();
    const displayCode = outputFormat === 'powerquery' ? powerQueryCode : queryString;

    return h('div', { className: 'space-y-4' },
        selectedTable && h('div', { className: 'mb-6 pb-4 border-b border-gray-200' },
            h('h2', { className: 'flex items-center gap-2 mb-2' }, getTableLabel(selectedTable)),
            firstSentence && h('p', { style: { color: '#4b5563', lineHeight: 1.6 }, className: 'text-lg' }, firstSentence)
        ),
        h('div', { className: 'card' },
            h('div', { className: 'mb-4' },
                h('h2', { className: 'flex items-center gap-2 mb-2' },
                    h(Icons.Eye),
                    'Din ferdige spørring'
                ),
                h('p', { className: 'text-gray-600' }, 'Denne spørringen kan brukes mot FHI API')
            ),
            h('div', { className: 'mb-4' },
                h('div', { className: 'flex gap-2 mb-4' },
                    h('button', {
                        className: 'btn btn-outline flex items-center gap-2',
                        onClick: function() { copyToClipboard(displayCode); },
                        'aria-label': outputFormat === 'powerquery' ? 'Kopier Power Query' : 'Kopier spørring'
                    },
                        h(Icons.Copy),
                        outputFormat === 'powerquery' ? 'Kopier Power Query' : 'Kopier spørring'
                    ),
                    h('button', {
                        className: 'btn btn-primary flex items-center gap-2',
                        onClick: fetchPreview,
                        disabled: loading,
                        'aria-label': 'Hent forhåndsvisning av data'
                    },
                        loading ? h('span', { className: 'animate-spin' }, h(Icons.RefreshCw)) : h(Icons.Download),
                        'Hent forhåndsvisning av data'
                    )
                )
            ),
            h('div', { className: 'mb-4' },
                h('label', { className: 'label mb-2' }, 'Velg format:'),
                h('div', { className: 'flex gap-4' },
                    h('label', { className: 'flex items-center gap-2' },
                        h('input', {
                            type: 'radio',
                            className: 'radio',
                            checked: outputFormat === 'json',
                            onChange: function() { setOutputFormat('json'); }
                        }),
                        h('span', { className: 'text-sm' }, 'JSON (for API)')
                    ),
                    h('label', { className: 'flex items-center gap-2' },
                        h('input', {
                            type: 'radio',
                            className: 'radio',
                            checked: outputFormat === 'powerquery',
                            onChange: function() { setOutputFormat('powerquery'); }
                        }),
                        h('span', { className: 'text-sm' }, 'Power Query (for Power BI/Excel)')
                    )
                )
            ),
            h('div', { className: 'code-block mb-4' },
                outputFormat === 'json' ? renderHighlightedJson(displayCode) : displayCode
            ),
            h('div', { className: 'text-sm text-gray-600 p-4 bg-blue-50 rounded border border-blue-200' },
                h('p', { className: 'font-semibold mb-4' }, '🔗 API & Mapping URLs:'),

                // API endpoint
                h('div', { className: 'mb-4' },
                    h('p', { className: 'text-xs font-semibold text-gray-700 block mb-1' }, 'API endpoint:'),
                    h('div', { className: 'flex gap-2' },
                        h('code', {
                            className: 'text-xs bg-white p-2 rounded flex-1 overflow-auto',
                            style: { whiteSpace: 'nowrap' }
                        },
                            'POST ' + API_BASE + '/' + (selectedSource ? selectedSource.id : '') + '/Table/' + (selectedTable ? selectedTable.tableId : '') + '/data'
                        ),
                        h('button', {
                            className: 'btn btn-outline p-2',
                            style: { minWidth: 'auto' },
                            onClick: function() { copyToClipboard('POST ' + API_BASE + '/' + (selectedSource ? selectedSource.id : '') + '/Table/' + (selectedTable ? selectedTable.tableId : '') + '/data'); },
                            title: 'Kopier API endpoint',
                            'aria-label': 'Kopier API endpoint'
                        },
                            h(Icons.Copy)
                        )
                    )
                ),

                // Dimension API URL (dynamisk basert på valgt tabell)
                h('div', { className: 'mb-4' },
                    h('p', { className: 'text-xs font-semibold text-gray-700 block mb-1' }, 'Dimension API URL:'),
                    h('div', { className: 'flex gap-2' },
                        h('code', {
                            className: 'text-xs bg-white p-2 rounded flex-1 overflow-auto',
                            style: { whiteSpace: 'nowrap' }
                        },
                            API_BASE + '/' + (selectedSource ? selectedSource.id : '{source}') + '/Table/' + (selectedTable ? selectedTable.tableId : '{tableId}') + '/dimension'
                        ),
                        h('button', {
                            className: 'btn btn-outline p-2',
                            style: { minWidth: 'auto' },
                            onClick: function() { copyToClipboard(API_BASE + '/' + (selectedSource ? selectedSource.id : '') + '/Table/' + (selectedTable ? selectedTable.tableId : '') + '/dimension'); },
                            title: 'Kopier Dimension API URL',
                            'aria-label': 'Kopier Dimension API URL',
                            disabled: !selectedSource || !selectedTable
                        },
                            h(Icons.Copy)
                        )
                    )
                ),

                // Geo-Mapping CSV URL
                h('div', null,
                    h('p', { className: 'text-xs font-semibold text-gray-700 block mb-1' }, 'Geo-Mapping CSV URL:'),
                    h('div', { className: 'flex gap-2' },
                        h('code', {
                            className: 'text-xs bg-white p-2 rounded flex-1 overflow-auto',
                            style: { whiteSpace: 'nowrap' }
                        },
                            geoMappingUrl
                        ),
                        h('button', {
                            className: 'btn btn-outline p-2',
                            style: { minWidth: 'auto' },
                            onClick: function() { copyToClipboard(geoMappingUrl); },
                            title: 'Kopier Geo-Mapping CSV URL',
                            'aria-label': 'Kopier Geo-Mapping CSV URL'
                        },
                            h(Icons.Copy)
                        )
                    )
                )
            ),
            outputFormat === 'powerquery' && h('div', { className: 'text-sm text-gray-600 p-4 bg-green-50 rounded border border-green-200 mt-4' },
                h('p', { className: 'font-semibold mb-2 text-xs' }, '💡 Bruk i Power BI/Excel:'),
                h('ol', { className: 'text-xs', style: { paddingLeft: '1.25rem', listStyleType: 'decimal' } },
                    h('li', null, 'Åpne Power Query Editor'),
                    h('li', null, 'Velg "Blank Query" eller "Tom spørring"'),
                    h('li', null, 'Gå til Advanced Editor'),
                    h('li', null, 'Lim inn koden'),
                    h('li', null, 'Klikk Done/Ferdig')
                ),
                h('p', { className: 'text-xs mt-2', style: { fontStyle: 'italic' } },
                    'Merk: Power Query fungerer kun med CSV-format (csv2 eller csv3).'
                )
            )
        ),
        error && h('div', { className: 'alert', role: 'alert' }, error),
        previewData && h('div', { className: 'card' },
            h('h3', { className: 'font-bold mb-2' }, 'Forhåndsvisning av data'),
            h('p', { className: 'text-gray-600 mb-4' },
                previewData.dimension && previewData.value
                    ? (previewData.value ? previewData.value.length : 0) + ' verdier returnert'
                    : 'Data hentet'
            ),
            previewData.dimension && previewData.value && (function() {
                const metricDimId = findMetricDimension(previewData);
                if (metricDimId) {
                    const dimNames = previewData.id;
                    const otherDimNames = dimNames.filter(function(id) { return id !== metricDimId; });
                    const contentsCategories = previewData.dimension[metricDimId].category.index;

                    // Beregn forventet antall rader
                    let expectedRows = 1;
                    otherDimNames.forEach(function(id) {
                        expectedRows *= previewData.dimension[id].category.index.length;
                    });

                    return h('div', { className: 'text-sm mb-2' },
                        h('p', { className: 'text-green-600' },
                            '✓ Måltall (' + metricDimId + ') pivotert: ' + contentsCategories.length + ' måltall vises som kolonner'
                        ),
                        h('p', { className: 'text-gray-600' },
                            'Forventet antall rader: ' + expectedRows + ' (' +
                            otherDimNames.map(function(id) {
                                return previewData.dimension[id].label + '=' + previewData.dimension[id].category.index.length;
                            }).join(' × ') + ')'
                        )
                    );
                } else {
                    return h('p', { className: 'text-sm text-amber-600 mb-2' },
                        'ℹ️ Ingen måltall-dimensjon funnet - alle dimensjoner vises som rader'
                    );
                }
            })(),
            previewData && previewData.csvText && h('div', { className: 'text-sm mb-2' },
                h('p', { className: 'text-gray-600' },
                    'CSV-data (første 10 linjer vises nedenfor)'
                )
            ),
            h('button', {
                className: 'btn btn-outline mb-4',
                'aria-label': 'Last ned data som CSV-fil',
                onClick: function() {
                    // Konverter data til CSV
                    let csvContent = '';

                    if (previewData && previewData.dimension && previewData.value) {
                        const dimNames = previewData.id;

                        // Finn måltall-dimensjon dynamisk
                        const metricDimId = findMetricDimension(previewData);
                        const contentsCodeIndex = metricDimId ? dimNames.indexOf(metricDimId) : -1;

                        // Finn GEO-dimensjonen - den er direkte 'GEO' i dimNames
                        const geoDimId = 'GEO';
                        const hasGeoDim = dimNames.includes(geoDimId) && previewData.dimension[geoDimId] !== undefined;

                        if (contentsCodeIndex !== -1) {
                            // Pivot måltall til kolonner
                            const contentsDim = previewData.dimension[metricDimId];
                            const contentsCategories = contentsDim.category.index;

                            // Andre dimensjoner (uten måltall-dimensjonen)
                            const otherDimNames = dimNames.filter(function(id) { return id !== metricDimId; });

                            // Header: GeoCode først (hvis GEO exists) + andre dimensjoner + måltall som kolonner
                            csvContent = (hasGeoDim ? ['GeoCode'] : []).concat(otherDimNames.map(function(id) {
                                return previewData.dimension[id].label;
                            })).concat(contentsCategories.map(function(code) {
                                return contentsDim.category.label[code];
                            })).join(',') + '\n';

                            // Beregn størrelse for hver dimensjon
                            const sizes = dimNames.map(function(id) {
                                return previewData.dimension[id].category.index.length;
                            });

                            // Grupper data etter andre dimensjoner
                            const dataMap = {};

                            for (let i = 0; i < previewData.value.length; i++) {
                                // Beregn multi-dimensjonale indekser (siste dimensjon varierer raskest)
                                const indices = [];
                                let tempI = i;
                                for (let j = dimNames.length - 1; j >= 0; j--) {
                                    indices[j] = tempI % sizes[j];
                                    tempI = Math.floor(tempI / sizes[j]);
                                }

                                // Bygg nøkkel uten måltall-dimensjonen
                                const keyParts = [];
                                otherDimNames.forEach(function(id) {
                                    const dimIndex = dimNames.indexOf(id);
                                    const catIndex = previewData.dimension[id].category.index[indices[dimIndex]];
                                    keyParts.push(catIndex);
                                });
                                const key = keyParts.join('|');

                                // Hent måltall verdi
                                const contentsIndex = indices[contentsCodeIndex];
                                const contentsCode = contentsCategories[contentsIndex];

                                if (!dataMap[key]) {
                                    dataMap[key] = { dims: keyParts, values: {}, geoCode: null };
                                }
                                dataMap[key].values[contentsCode] = previewData.value[i];

                                // Lagre geo-code hvis GEO dimensjon finnes
                                if (hasGeoDim) {
                                    const geoIdx = dimNames.indexOf(geoDimId);
                                    const geoCatIndex = previewData.dimension[geoDimId].category.index[indices[geoIdx]];
                                    dataMap[key].geoCode = geoCatIndex;
                                }
                            }

                            // Skriv rader
                            let rowsWithGeo = 0;
                            let rowCount = 0;
                            Object.keys(dataMap).forEach(function(key) {
                                const row = dataMap[key];
                                const cells = [];

                                // Legg til GeoCode først hvis det finnes
                                if (hasGeoDim && row.geoCode !== null) {
                                    cells.push(row.geoCode);
                                    rowsWithGeo++;
                                }

                                // Legg til resten av dimensjonene
                                row.dims.forEach(function(catCode, idx) {
                                    const dimId = otherDimNames[idx];
                                    const label = previewData.dimension[dimId].category.label[catCode];
                                    cells.push('"' + label + '"');
                                });

                                // Legg til verdier for hvert måltall
                                contentsCategories.forEach(function(code) {
                                    cells.push(row.values[code] !== undefined ? row.values[code] : '');
                                });

                                csvContent += cells.join(',') + '\n';
                                rowCount++;
                            });
                        } else {
                            // Ingen ContentsCode - bruk original logikk
                            const dimensions = dimNames.map(function(id) {
                                return {
                                    id: id,
                                    label: previewData.dimension[id].label,
                                    categories: previewData.dimension[id].category.label
                                };
                            });

                            csvContent = dimNames.map(function(id) {
                                return previewData.dimension[id].label;
                            }).join(',') + ',Verdi\n';

                            const sizes = dimNames.map(function(id) {
                                return previewData.dimension[id].category.index.length;
                            });

                            for (let i = 0; i < previewData.value.length; i++) {
                                // Beregn multi-dimensjonale indekser (siste dimensjon varierer raskest)
                                const indices = [];
                                let tempI = i;
                                for (let j = dimNames.length - 1; j >= 0; j--) {
                                    indices[j] = tempI % sizes[j];
                                    tempI = Math.floor(tempI / sizes[j]);
                                }

                                const row = dimNames.map(function(id, idx) {
                                    const catIndex = previewData.dimension[id].category.index[indices[idx]];
                                    const label = previewData.dimension[id].category.label[catIndex];
                                    return '"' + label + '"';
                                }).join(',') + ',' + previewData.value[i];

                                csvContent += row + '\n';
                            }
                        }
                    } else {
                        csvContent = JSON.stringify(previewData, null, 2);
                    }

                    // Last ned CSV
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);

                    // Generer dynamisk filnavn: fhi_{source}_{tableId}_{YYYY-MM-DD}.csv
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const dateStr = year + '-' + month + '-' + day;
                    const sourceId = selectedSource ? selectedSource.id : 'unknown';
                    const tableId = selectedTable ? selectedTable.tableId : 'unknown';
                    const filename = 'fhi_' + sourceId + '_' + tableId + '_' + dateStr + '.csv';
                    link.setAttribute('download', filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            },
                h(Icons.Download),
                ' Last ned som CSV'
            ),
            h('div', { className: 'overflow-x-auto max-h-96 overflow-y-auto border rounded' },
                (function() {
                    // Først sjekk hvis CSV-format
                    if (previewData && previewData.csvText) {
                        const lines = previewData.csvText.split('\n').filter(function(line) { return line.trim(); });
                        const maxRows = 100;
                        const rowsToShow = Math.min(lines.length - 1, maxRows);

                        // Parse header
                        const headerLine = lines[0];
                        const headers = headerLine.split(';').map(function(h) {
                            return h.trim().replace(/^"|"$/g, '');
                        });

                        // Parse data rows
                        const dataRows = [];
                        for (let i = 1; i <= rowsToShow; i++) {
                            const cells = lines[i].split(';').map(function(c) {
                                return c.trim().replace(/^"|"$/g, '');
                            });
                            dataRows.push(cells);
                        }

                        return h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                            h('thead', { style: { background: '#f3f4f6' } },
                                h('tr', null,
                                    headers.map(function(header, idx) {
                                        return h('th', {
                                            key: idx,
                                            scope: 'col',
                                            style: {
                                                padding: '0.5rem',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #d1d5db'
                                            }
                                        }, header);
                                    })
                                )
                            ),
                            h('tbody', null,
                                (function() {
                                    const rows = [];
                                    for (let i = 0; i < dataRows.length; i++) {
                                        rows.push(
                                            h('tr', {
                                                key: i,
                                                style: { background: i % 2 === 0 ? 'white' : '#f9fafb' }
                                            },
                                                dataRows[i].map(function(cell, idx) {
                                                    return h('td', {
                                                        key: idx,
                                                        style: {
                                                            padding: '0.5rem',
                                                            borderBottom: '1px solid #e5e7eb',
                                                            fontSize: '0.875rem'
                                                        }
                                                    }, cell);
                                                })
                                            )
                                        );
                                    }
                                    if (lines.length - 1 > maxRows) {
                                        rows.push(
                                            h('tr', null,
                                                h('td', {
                                                    colSpan: headers.length,
                                                    style: {
                                                        padding: '1rem',
                                                        textAlign: 'center',
                                                        fontStyle: 'italic',
                                                        color: '#6b7280',
                                                        fontSize: '0.875rem'
                                                    }
                                                }, '... viser første ' + maxRows + ' av ' + (lines.length - 1) + ' rader. Last ned CSV for alle data.')
                                            )
                                        );
                                    }
                                    return rows;
                                })()
                            )
                        );
                    }

                    if (previewData.dimension && previewData.value) {
                        const dimNames = previewData.id;

                        // Finn måltall-dimensjon dynamisk
                        const metricDimId = findMetricDimension(previewData);
                        const contentsCodeIndex = metricDimId ? dimNames.indexOf(metricDimId) : -1;

                        if (contentsCodeIndex !== -1) {
                            // Pivot måltall til kolonner
                            const contentsDim = previewData.dimension[metricDimId];
                            const contentsCategories = contentsDim.category.index;

                            // Andre dimensjoner (uten måltall-dimensjonen)
                            const otherDimNames = dimNames.filter(function(id) { return id !== metricDimId; });
                            const otherDimensions = otherDimNames.map(function(id) {
                                return {
                                    id: id,
                                    label: previewData.dimension[id].label,
                                    categories: previewData.dimension[id].category.label
                                };
                            });

                            // Beregn størrelse for hver dimensjon
                            const sizes = dimNames.map(function(id) {
                                return previewData.dimension[id].category.index.length;
                            });

                            // Grupper data etter andre dimensjoner
                            const dataMap = {};

                            for (let i = 0; i < previewData.value.length; i++) {
                                // Beregn multi-dimensjonale indekser (siste dimensjon varierer raskest)
                                const indices = [];
                                let tempI = i;
                                for (let j = dimNames.length - 1; j >= 0; j--) {
                                    indices[j] = tempI % sizes[j];
                                    tempI = Math.floor(tempI / sizes[j]);
                                }

                                // Bygg nøkkel uten måltall-dimensjonen
                                const keyParts = [];
                                otherDimNames.forEach(function(id) {
                                    const dimIndex = dimNames.indexOf(id);
                                    const catIndex = previewData.dimension[id].category.index[indices[dimIndex]];
                                    keyParts.push(catIndex);
                                });
                                const key = keyParts.join('|');

                                // Hent måltall verdi
                                const contentsIndex = indices[contentsCodeIndex];
                                const contentsCode = contentsCategories[contentsIndex];

                                if (!dataMap[key]) {
                                    dataMap[key] = { dims: keyParts, values: {} };
                                }
                                dataMap[key].values[contentsCode] = previewData.value[i];
                            }

                            // Bruk Object.keys for å få alle unike rader
                            const rowKeys = Object.keys(dataMap);

                            const maxRows = 100;
                            const rowsToShow = Math.min(rowKeys.length, maxRows);

                            return h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                                h('thead', { style: { background: '#f3f4f6' } },
                                    h('tr', null,
                                        [h('th', {
                                            scope: 'col',
                                            style: {
                                                padding: '0.5rem',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #d1d5db',
                                                fontWeight: '600',
                                                minWidth: '80px'
                                            }
                                        }, 'GEO-kode')
                                        ].concat(
                                            otherDimensions.map(function(dim) {
                                                return h('th', {
                                                    key: dim.id,
                                                    scope: 'col',
                                                    style: {
                                                        padding: '0.5rem',
                                                        textAlign: 'left',
                                                        borderBottom: '2px solid #d1d5db'
                                                    }
                                                }, dim.label);
                                            })
                                        ).concat(
                                            contentsCategories.map(function(code) {
                                                return h('th', {
                                                    key: code,
                                                    scope: 'col',
                                                    style: {
                                                        padding: '0.5rem',
                                                        textAlign: 'right',
                                                        borderBottom: '2px solid #d1d5db'
                                                    }
                                                }, contentsDim.category.label[code]);
                                            })
                                        )
                                    )
                                ),
                                h('tbody', null,
                                    (function() {
                                        const rows = [];
                                        for (let i = 0; i < rowsToShow; i++) {
                                            const key = rowKeys[i];
                                            const rowData = dataMap[key];

                                            rows.push(
                                                h('tr', {
                                                    key: i,
                                                    style: { background: i % 2 === 0 ? 'white' : '#f9fafb' }
                                                },
                                                    [h('td', {
                                                        style: {
                                                            padding: '0.5rem',
                                                            borderBottom: '1px solid #e5e7eb',
                                                            fontSize: '0.875rem',
                                                            fontWeight: '600',
                                                            minWidth: '80px'
                                                        }
                                                    }, (function() {
                                                        const geoIdx = otherDimNames.indexOf('GEO');
                                                        if (geoIdx >= 0 && rowData.dims[geoIdx]) {
                                                            return String(rowData.dims[geoIdx]);
                                                        }
                                                        return '-';
                                                    })())
                                                    ].concat(
                                                        rowData.dims.map(function(catCode, idx) {
                                                            const dimId = otherDimNames[idx];
                                                            const label = previewData.dimension[dimId].category.label[catCode];
                                                            return h('td', {
                                                                key: dimId,
                                                                style: {
                                                                    padding: '0.5rem',
                                                                    borderBottom: '1px solid #e5e7eb',
                                                                    fontSize: '0.875rem'
                                                            }
                                                        }, label);
                                                        })
                                                    ).concat(
                                                        contentsCategories.map(function(code) {
                                                            return h('td', {
                                                                key: code,
                                                                style: {
                                                                    padding: '0.5rem',
                                                                    textAlign: 'right',
                                                                    borderBottom: '1px solid #e5e7eb',
                                                                    fontSize: '0.875rem',
                                                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
                                                                    fontWeight: '500'
                                                                }
                                                            }, rowData.values[code] !== undefined ? rowData.values[code] : '-');
                                                        })
                                                    )
                                                    )
                                            );
                                        }
                                        if (rowKeys.length > maxRows) {
                                            rows.push(
                                                h('tr', null,
                                                    h('td', {
                                                        colSpan: otherDimensions.length + contentsCategories.length + 1,
                                                        style: {
                                                            padding: '1rem',
                                                            textAlign: 'center',
                                                            fontStyle: 'italic',
                                                            color: '#6b7280',
                                                            fontSize: '0.875rem'
                                                        }
                                                    }, '... viser første ' + maxRows + ' av ' + rowKeys.length + ' rader. Last ned CSV for alle data.')
                                                )
                                            );
                                        } else if (rowKeys.length > 0) {
                                            rows.push(
                                                h('tr', null,
                                                    h('td', {
                                                        colSpan: otherDimensions.length + contentsCategories.length,
                                                        style: {
                                                            padding: '0.5rem',
                                                            textAlign: 'center',
                                                            fontStyle: 'italic',
                                                            color: '#9ca3af',
                                                            className: 'text-xs',
                                                            borderBottom: '1px solid #e5e7eb'
                                                        }
                                                    }, 'Viser ' + rowKeys.length + ' rad' + (rowKeys.length !== 1 ? 'er' : '') + ' totalt (' + previewData.value.length + ' verdier, ' + contentsCategories.length + ' måltall)')
                                                )
                                            );
                                        }
                                        return rows;
                                    })()
                                )
                            );
                        } else {
                            // Ingen ContentsCode - bruk original logikk
                            const dimensions = dimNames.map(function(id) {
                                return {
                                    id: id,
                                    label: previewData.dimension[id].label,
                                    categories: previewData.dimension[id].category.label
                                };
                            });

                            const sizes = dimNames.map(function(id) {
                                return previewData.dimension[id].category.index.length;
                            });

                            const maxRows = 100;
                            const rowsToShow = Math.min(previewData.value.length, maxRows);

                            return h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                                h('thead', { style: { background: '#f3f4f6' } },
                                    h('tr', null,
                                        [h('th', {
                                            scope: 'col',
                                            style: {
                                                padding: '0.5rem',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #d1d5db',
                                                fontWeight: '600',
                                                minWidth: '80px'
                                            }
                                        }, 'GEO-kode')
                                        ].concat(
                                            dimensions.map(function(dim) {
                                                return h('th', {
                                                    scope: 'col',
                                                    style: {
                                                        padding: '0.5rem',
                                                        textAlign: 'left',
                                                        borderBottom: '2px solid #d1d5db'
                                                    }
                                                }, dim.label);
                                            })
                                        ).concat([
                                            h('th', {
                                                scope: 'col',
                                                style: {
                                                    padding: '0.5rem',
                                                    textAlign: 'right',
                                                    borderBottom: '2px solid #d1d5db'
                                                }
                                            }, 'Verdi')
                                        ])
                                    )
                                ),
                                h('tbody', null,
                                    (function() {
                                        const rows = [];
                                        for (let i = 0; i < rowsToShow; i++) {
                                            // Beregn multi-dimensjonale indekser (siste dimensjon varierer raskest)
                                            const indices = [];
                                            let tempI = i;
                                            for (let j = dimNames.length - 1; j >= 0; j--) {
                                                indices[j] = tempI % sizes[j];
                                                tempI = Math.floor(tempI / sizes[j]);
                                            }

                                            rows.push(
                                                h('tr', {
                                                    key: i,
                                                    style: { background: i % 2 === 0 ? 'white' : '#f9fafb' }
                                                },
                                                    [h('td', {
                                                        style: {
                                                            padding: '0.5rem',
                                                            borderBottom: '1px solid #e5e7eb',
                                                            fontSize: '0.875rem',
                                                            fontWeight: '600',
                                                            minWidth: '80px'
                                                        }
                                                    }, (function() {
                                                        // Finn GEO-dimensjonen og hent dens geocode
                                                        const geoIdx = dimNames.indexOf('GEO');
                                                        if (geoIdx >= 0 && previewData.dimension.GEO) {
                                                            const rowIndexInGEO = indices[geoIdx];
                                                            const geoIndex = previewData.dimension.GEO.category.index;

                                                            // geoIndex could be array or object
                                                            if (Array.isArray(geoIndex)) {
                                                                // If array, the value at this position is the code
                                                                return String(geoIndex[rowIndexInGEO] || '-');
                                                            } else if (typeof geoIndex === 'object') {
                                                                // If object, find the key that maps to this index
                                                                for (let code in geoIndex) {
                                                                    if (geoIndex[code] === rowIndexInGEO) {
                                                                        return code;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        return '-';
                                                    })())
                                                    ].concat(
                                                        dimNames.map(function(id, idx) {
                                                            const catIndex = previewData.dimension[id].category.index[indices[idx]];
                                                            const label = previewData.dimension[id].category.label[catIndex];
                                                            return h('td', {
                                                                style: {
                                                                    padding: '0.5rem',
                                                                    borderBottom: '1px solid #e5e7eb',
                                                                    fontSize: '0.875rem'
                                                                }
                                                            }, label);
                                                        })
                                                    ).concat([
                                                        h('td', {
                                                            style: {
                                                                padding: '0.5rem',
                                                                textAlign: 'right',
                                                                borderBottom: '1px solid #e5e7eb',
                                                                fontSize: '0.875rem',
                                                                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
                                                                fontWeight: '500'
                                                            }
                                                        }, previewData.value[i])
                                                    ])
                                                )
                                            );
                                        }
                                        if (previewData.value.length > maxRows) {
                                            rows.push(
                                                h('tr', null,
                                                    h('td', {
                                                        colSpan: dimensions.length + 2,
                                                        style: {
                                                            padding: '1rem',
                                                            textAlign: 'center',
                                                            fontStyle: 'italic',
                                                            color: '#6b7280',
                                                            fontSize: '0.875rem'
                                                        }
                                                    }, '... viser første ' + maxRows + ' av ' + previewData.value.length + ' rader. Last ned CSV for alle data.')
                                                )
                                            );
                                        }
                                        return rows;
                                    })()
                                )
                            );
                        }
                    } else {
                        return h('div', { className: 'p-4 text-sm text-gray-600' },
                            'Kan ikke vise tabell for dette dataformatet. Last ned som CSV.'
                        );
                    }
                })()
            )
        ),
        h('div', { className: 'flex gap-2' },
            h('button', {
                className: 'btn btn-outline',
                onClick: function() { setStep(3); }
            }, 'Tilbake til konfigurasjon'),
            h('button', {
                className: 'btn btn-outline',
                onClick: function() {
                    setStep(1);
                    setSelectedSource(null);
                    setSelectedTable(null);
                    setDimensions([]);
                    setQueryConfig({});
                    setFinalQuery(null);
                    setPreviewData(null);
                }
            }, 'Start på nytt')
        )
    );
}
