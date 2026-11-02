const h = React.createElement;

export function renderDimensionConfiguration(
    dimensions, queryConfig, selectedSource, selectedTable, step,
    responseFormat, maxRowCount, loading, error, firstSentence,
    geoSearch, expandedCounties, expandedMunicipalities,
    updateDimensionConfig, buildFinalQuery, getGeographyGroups, getTableLabel, fetchMetadata,
    setGeoSearch, setExpandedCounties, setExpandedMunicipalities,
    setResponseFormat, setMaxRowCount, setStep, Icons
) {
    return h('div', { className: 'space-y-4' },
        selectedTable && h('div', { className: 'mb-6 pb-4 border-b border-gray-200' },
            h('h2', { className: 'flex items-center gap-2 mb-2' }, getTableLabel(selectedTable)),
            firstSentence && h('p', { style: { color: '#4b5563', lineHeight: 1.6 }, className: 'text-lg' }, firstSentence)
        ),
        h('div', { className: 'card' },
            h('div', { className: 'mb-4' },
                h('h2', { className: 'flex items-center gap-2 mb-2' },
                    h(Icons.Filter),
                    'Konfigurer dimensjoner',
                    h('button', {
                        className: 'btn btn-icon',
                        onClick: function() { fetchMetadata(selectedSource.id, selectedTable.tableId, { openModal: true }); },
                        title: 'Se tabell informasjon',
                        'aria-label': 'Se tabell informasjon',
                        style: { marginLeft: 'auto', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'auto', minWidth: 'auto' }
                    },
                        h('svg', { viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
                            h('circle', { cx: '12', cy: '12', r: '10' }),
                            h('text', { x: '12', y: '16', textAnchor: 'middle', fontSize: '12', fill: 'currentColor' }, 'i')
                        ),
                        h('span', { style: { color: '#374151' }, className: 'table-cell' }, 'Informasjon om tabellen')
                    )
                ),
                h('p', { className: 'text-gray-600' }, 'Velg verdier for hver dimensjon i tabellen')
            ),
            loading && h('p', { className: 'text-gray-500 mb-4', role: 'status', 'aria-live': 'polite' }, 'Laster dimensjoner...'),
            error && h('div', { className: 'alert mb-4', role: 'alert', 'aria-live': 'assertive' }, error),
            h('div', { className: 'flex gap-6 mb-4 items-start' },
                h('div', { style: { flex: 1 } },
                    h('label', { className: 'label' }, 'Response format'),
                    h('div', { className: 'flex gap-4 mt-2' },
                        h('label', { className: 'flex items-center gap-2' },
                            h('input', {
                                type: 'radio',
                                className: 'radio',
                                checked: responseFormat === 'json-stat2',
                                onChange: function() { setResponseFormat('json-stat2'); },
                                'aria-label': 'Response format: JSON-stat2'
                            }),
                            h('span', { className: 'text-sm' }, 'JSON-stat2')
                        ),
                        h('label', { className: 'flex items-center gap-2' },
                            h('input', {
                                type: 'radio',
                                className: 'radio',
                                checked: responseFormat === 'csv2',
                                onChange: function() { setResponseFormat('csv2'); },
                                'aria-label': 'Response format: CSV2 med labels'
                            }),
                            h('span', { className: 'text-sm' }, 'CSV2 med labels')
                        ),
                        h('label', { className: 'flex items-center gap-2' },
                            h('input', {
                                type: 'radio',
                                className: 'radio',
                                checked: responseFormat === 'csv3',
                                onChange: function() { setResponseFormat('csv3'); },
                                'aria-label': 'Response format: CSV3 med koder'
                            }),
                            h('span', { className: 'text-sm' }, 'CSV3 med koder')
                        )
                    )
                ),
                h('div', { style: { width: '200px' } },
                    h('label', { className: 'label', htmlFor: 'max-row-count' }, 'Max antall rader'),
                    h('input', {
                        id: 'max-row-count',
                        type: 'number',
                        className: 'input',
                        value: maxRowCount,
                        onChange: function(e) { setMaxRowCount(e.target.value); },
                        placeholder: 'Ubegrenset',
                        'aria-label': 'Maksimum antall rader som skal vises'
                    })
                )
            )
        ),
        (!loading && dimensions && Array.isArray(dimensions)) && h('div', { className: 'dimensions-grid' },
            dimensions.map(function(dimension) {
            const config = queryConfig[dimension.code] || { filter: 'all', values: ['*'], selectedCategories: [] };
            const isTimeVariable = dimension.code === 'AAR' || (dimension.label && dimension.label.toLowerCase().includes('år'));

            // Sjekk at dimension har category og index
            if (!dimension.category || !dimension.category.index) {
                console.error('Dimension mangler category eller index:', dimension);
                return h('div', { key: dimension.code, className: 'dimension-card' },
                    h('div', { className: 'alert' },
                        'Dimensjon ' + (dimension.label || dimension.code) + ' har ikke riktig struktur'
                    )
                );
            }

            return h('div', { key: dimension.code, className: 'dimension-card' },
                h('div', { className: 'flex items-center justify-between gap-2 mb-2' },
                    h('h3', { className: 'font-bold' }, dimension.label || dimension.code),
                    h('p', { className: 'text-xs text-gray-600' },
                        'Dimensjon: ' + dimension.code + ' (' + dimension.category.index.length + ' kategorier)'
                    )
                ),
                h('div', { className: 'space-y-4' },
                    h('div', null,
                        h('label', { className: 'label' }, 'Filtertype'),
                        h('div', { className: 'space-y-2 mt-2' },
                            h('label', { className: 'flex items-center gap-2' },
                                h('input', {
                                    type: 'radio',
                                    className: 'radio',
                                    checked: config.filter === 'item',
                                    onChange: function() { updateDimensionConfig(dimension.code, { filter: 'item' }); }
                                }),
                                h('span', { className: 'text-xs' }, 'Velg spesifikke verdier')
                            ),
                            isTimeVariable && h('label', { className: 'flex items-center gap-2' },
                                h('input', {
                                    type: 'radio',
                                    className: 'radio',
                                    checked: config.filter === 'top',
                                    onChange: function() { updateDimensionConfig(dimension.code, { filter: 'top' }); }
                                }),
                                h('span', { className: 'text-xs' }, 'Siste X år')
                            ),
                            h('label', { className: 'flex items-center gap-2' },
                                h('input', {
                                    type: 'radio',
                                    className: 'radio',
                                    checked: config.filter === 'all',
                                    onChange: function() { updateDimensionConfig(dimension.code, { filter: 'all', values: ['*'] }); }
                                }),
                                h('span', { className: 'text-xs' }, 'Alle (med wildcard)')
                            )
                        )
                    ),
                    config.filter === 'item' && h('div', { className: 'space-y-2' },
                        h('label', { className: 'label' }, 'Velg verdier'),
                        dimension.code === 'GEO' && h('input', {
                            type: 'text',
                            className: 'input mb-2',
                            placeholder: 'Søk etter fylke, kommune eller bydel...',
                            'aria-label': 'Søk etter geografisk område (fylke, kommune eller bydel)',
                            value: geoSearch,
                            onChange: function(e) { setGeoSearch(e.target.value); }
                        }),
                        h('div', { className: 'max-h-60 overflow-y-auto border rounded p-2 space-y-1' },
                            (function() {
                                const geoGroups = getGeographyGroups(dimension);

                                if (dimension.code === 'GEO' && geoGroups && geoGroups.hierarchy) {
                                    const hierarchy = geoGroups.hierarchy;

                                    // Filter counties based on search
                                    const filteredCounties = geoGroups.counties.filter(function(county) {
                                        if (geoSearch.trim() === '') return true;
                                        const searchLower = geoSearch.toLowerCase();

                                        // Check if county matches
                                        if (county.label.toLowerCase().includes(searchLower) ||
                                            county.code.toLowerCase().includes(searchLower)) {
                                            return true;
                                        }

                                        // Check if any municipality in county matches
                                        const countyMunicipalities = hierarchy[county.code] ? hierarchy[county.code].municipalities : [];
                                        return countyMunicipalities.some(function(mun) {
                                            return mun.label.toLowerCase().includes(searchLower) ||
                                                   mun.code.toLowerCase().includes(searchLower);
                                        });
                                    });

                                    return h('div', {
                                        className: 'geo-hierarchy space-y-1',
                                        role: 'tree',
                                        'aria-label': 'Geografisk hierarki - velg fylker, kommuner eller bydeler'
                                    },
                                        geoGroups.others.length > 0 && geoGroups.others.map(function(other, otherIdx) {
                                            return h('div', {
                                                key: other.code,
                                                role: 'treeitem',
                                                'aria-level': '1',
                                                'aria-posinset': otherIdx + 1,
                                                'aria-setsize': geoGroups.others.length + filteredCounties.length,
                                                className: 'flex items-center gap-2'
                                            },
                                                h('label', { className: 'flex items-center gap-2' },
                                                    h('input', {
                                                        type: 'checkbox',
                                                        className: 'checkbox',
                                                        checked: config.selectedCategories.includes(other.code),
                                                        onChange: function(e) {
                                                            const updated = e.target.checked
                                                                ? config.selectedCategories.concat([other.code])
                                                                : config.selectedCategories.filter(function(c) { return c !== other.code; });
                                                            updateDimensionConfig(dimension.code, { selectedCategories: updated });
                                                        }
                                                    }),
                                                    h('span', { className: 'text-sm' }, other.label + ' (' + other.code + ')')
                                                )
                                            );
                                        })
                                        ,
                                        filteredCounties.map(function(county) {
                                            const isExpanded = expandedCounties[county.code];
                                            const countyMunicipalities = hierarchy[county.code] ? hierarchy[county.code].municipalities : [];
                                            const countyDistricts = hierarchy[county.code] ? hierarchy[county.code].districts : {};

                                            const allMunicipalitiesAndDistricts = countyMunicipalities.map(function(m) { return m.code; }).concat(
                                                geoGroups.districts.filter(function(d) { return d.code.startsWith(county.code); }).map(function(d) { return d.code; })
                                            );

                                            const countySelected = config.selectedCategories.includes(county.code);
                                            const allMunsAndDistsSelected = allMunicipalitiesAndDistricts.length > 0 &&
                                                allMunicipalitiesAndDistricts.every(function(code) { return config.selectedCategories.includes(code); });

                                            return h('div', {
                                                key: county.code,
                                                className: 'geo-county',
                                                role: 'treeitem',
                                                'aria-level': '1',
                                                'aria-posinset': geoGroups.others.length + filteredCounties.indexOf(county) + 1,
                                                'aria-setsize': geoGroups.others.length + filteredCounties.length,
                                                'aria-expanded': isExpanded
                                            },
                                                h('div', { className: 'geo-county-header' },
                                                    h('svg', {
                                                        className: 'geo-chevron' + (isExpanded ? ' expanded' : ''),
                                                        viewBox: '0 0 24 24',
                                                        role: 'button',
                                                        tabIndex: 0,
                                                        'aria-label': 'Utvid/skjul ' + county.label,
                                                        'aria-expanded': isExpanded,
                                                        onClick: function() {
                                                            const newExpanded = {};
                                                            for (var key in expandedCounties) {
                                                                newExpanded[key] = expandedCounties[key];
                                                            }
                                                            newExpanded[county.code] = !isExpanded;
                                                            setExpandedCounties(newExpanded);
                                                        },
                                                        onKeyDown: function(e) {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                const newExpanded = {};
                                                                for (var key in expandedCounties) {
                                                                    newExpanded[key] = expandedCounties[key];
                                                                }
                                                                newExpanded[county.code] = !isExpanded;
                                                                setExpandedCounties(newExpanded);
                                                            }
                                                        }
                                                    },
                                                        h('polyline', { points: '9 18 15 12 9 6', fill: 'none', stroke: 'currentColor', strokeWidth: '2' })
                                                    ),
                                                    h('input', {
                                                        type: 'checkbox',
                                                        className: 'checkbox geo-county-checkbox',
                                                        checked: countySelected,
                                                        'aria-label': 'Velg fylke: ' + county.label,
                                                        onChange: function(e) {
                                                            const updated = e.target.checked
                                                                ? config.selectedCategories.concat([county.code])
                                                                : config.selectedCategories.filter(function(c) { return c !== county.code; });
                                                            updateDimensionConfig(dimension.code, { selectedCategories: updated });
                                                        }
                                                    }),
                                                    h('span', { className: 'flex-1', style: { cursor: 'pointer' }, onClick: function() {
                                                        const newExpanded = {};
                                                        for (var key in expandedCounties) {
                                                            newExpanded[key] = expandedCounties[key];
                                                        }
                                                        newExpanded[county.code] = !isExpanded;
                                                        setExpandedCounties(newExpanded);
                                                    } }, county.label + ' (' + county.code + ')'),
                                                    countyMunicipalities.length > 0 && h('button', {
                                                        className: 'geo-select-btn',
                                                        onClick: function(e) {
                                                            e.stopPropagation();
                                                            const updated = allMunsAndDistsSelected
                                                                ? config.selectedCategories.filter(function(c) {
                                                                    return !allMunicipalitiesAndDistricts.includes(c);
                                                                })
                                                                : config.selectedCategories.filter(function(c) {
                                                                    return !allMunicipalitiesAndDistricts.includes(c);
                                                                }).concat(allMunicipalitiesAndDistricts);
                                                            updateDimensionConfig(dimension.code, { selectedCategories: updated });
                                                        }
                                                    }, allMunsAndDistsSelected ? 'Fjern alle kommuner' : 'Velg alle kommuner')
                                                ),
                                                isExpanded && countyMunicipalities.length > 0 && h('div', { className: 'geo-municipality-list' },
                                                    countyMunicipalities.map(function(mun) {
                                                        const munExpanded = expandedMunicipalities[mun.code];
                                                        const munDistricts = countyDistricts[mun.code] || [];
                                                        const munSelected = config.selectedCategories.includes(mun.code);
                                                        const allDistsSelected = munDistricts.length > 0 && munDistricts.every(function(d) {
                                                            return config.selectedCategories.includes(d.code);
                                                        });

                                                        return h('div', {
                                            key: mun.code,
                                            className: 'geo-municipality',
                                            role: 'treeitem',
                                            'aria-level': '2',
                                            'aria-posinset': countyMunicipalities.indexOf(mun) + 1,
                                            'aria-setsize': countyMunicipalities.length,
                                            'aria-expanded': munDistricts.length > 0 ? munExpanded : undefined
                                        },
                                                            h('div', { className: 'geo-municipality-header' },
                                                                h('input', {
                                                                    type: 'checkbox',
                                                                    className: 'checkbox',
                                                                    checked: munSelected,
                                                                    onChange: function(e) {
                                                                        const updated = e.target.checked
                                                                            ? config.selectedCategories.concat([mun.code])
                                                                            : config.selectedCategories.filter(function(c) { return c !== mun.code; });
                                                                        updateDimensionConfig(dimension.code, { selectedCategories: updated });
                                                                    }
                                                                }),
                                                                munDistricts.length > 0 && h('svg', {
                                                                    className: 'geo-chevron' + (munExpanded ? ' expanded' : ''),
                                                                    viewBox: '0 0 24 24',
                                                                    role: 'button',
                                                                    tabIndex: 0,
                                                                    'aria-label': 'Utvid/skjul bydeler for ' + mun.label,
                                                                    'aria-expanded': munExpanded,
                                                                    onClick: function() {
                                                                        const newExpanded = {};
                                                                        for (var key in expandedMunicipalities) {
                                                                            newExpanded[key] = expandedMunicipalities[key];
                                                                        }
                                                                        newExpanded[mun.code] = !munExpanded;
                                                                        setExpandedMunicipalities(newExpanded);
                                                                    },
                                                                    onKeyDown: function(e) {
                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                            e.preventDefault();
                                                                            const newExpanded = {};
                                                                            for (var key in expandedMunicipalities) {
                                                                                newExpanded[key] = expandedMunicipalities[key];
                                                                            }
                                                                            newExpanded[mun.code] = !munExpanded;
                                                                            setExpandedMunicipalities(newExpanded);
                                                                        }
                                                                    }
                                                                },
                                                                    h('polyline', { points: '9 18 15 12 9 6', fill: 'none', stroke: 'currentColor', strokeWidth: '2' })
                                                                ),
                                                                h('span', {
                                                                    className: 'flex-1',
                                                                    style: { cursor: munDistricts.length > 0 ? 'pointer' : 'default' },
                                                                    onClick: munDistricts.length > 0 ? function() {
                                                                        const newExpanded = {};
                                                                        for (var key in expandedMunicipalities) {
                                                                            newExpanded[key] = expandedMunicipalities[key];
                                                                        }
                                                                        newExpanded[mun.code] = !munExpanded;
                                                                        setExpandedMunicipalities(newExpanded);
                                                                    } : null
                                                                }, mun.label + ' (' + mun.code + ')'),
                                                                munDistricts.length > 0 && h('button', {
                                                                    className: 'geo-select-btn',
                                                                    onClick: function(e) {
                                                                        e.stopPropagation();
                                                                        const districtCodes = munDistricts.map(function(d) { return d.code; });
                                                                        const updated = allDistsSelected
                                                                            ? config.selectedCategories.filter(function(c) {
                                                                                return !districtCodes.includes(c);
                                                                            })
                                                                            : config.selectedCategories.filter(function(c) {
                                                                                return !districtCodes.includes(c);
                                                                            }).concat(districtCodes);
                                                                        updateDimensionConfig(dimension.code, { selectedCategories: updated });
                                                                    }
                                                                }, allDistsSelected ? 'Fjern alle bydeler' : 'Velg alle bydeler')
                                                            ),
                                                            munExpanded && munDistricts.length > 0 && h('div', { className: 'geo-district-list' },
                                                                munDistricts.map(function(dist) {
                                                                    return h('label', {
                                                        key: dist.code,
                                                        className: 'flex items-center gap-2 geo-district',
                                                        role: 'treeitem',
                                                        'aria-level': '3',
                                                        'aria-posinset': munDistricts.indexOf(dist) + 1,
                                                        'aria-setsize': munDistricts.length
                                                    },
                                                                        h('input', {
                                                                            type: 'checkbox',
                                                                            className: 'checkbox',
                                                                            checked: config.selectedCategories.includes(dist.code),
                                                                            onChange: function(e) {
                                                                                const updated = e.target.checked
                                                                                    ? config.selectedCategories.concat([dist.code])
                                                                                    : config.selectedCategories.filter(function(c) { return c !== dist.code; });
                                                                                updateDimensionConfig(dimension.code, { selectedCategories: updated });
                                                                            }
                                                                        }),
                                                                        h('span', { className: 'text-sm' }, dist.label + ' (' + dist.code + ')')
                                                                    );
                                                                })
                                                            )
                                                        );
                                                    })
                                                )
                                            );
                                        })
                                    );
                                }

                                // Fallback for non-GEO dimensions or when no hierarchy
                                return dimension.category.index.filter(function(cat) {
                                    if (dimension.code !== 'GEO' || geoSearch.trim() === '') return true;
                                    const searchLower = geoSearch.toLowerCase();
                                    const label = dimension.category.label[cat] || '';
                                    return label.toLowerCase().includes(searchLower) || cat.toLowerCase().includes(searchLower);
                                }).map(function(cat) {
                                    return h('label', { key: cat, className: 'flex items-center gap-2' },
                                        h('input', {
                                            type: 'checkbox',
                                            className: 'checkbox',
                                            checked: config.selectedCategories.includes(cat),
                                            onChange: function(e) {
                                                const updated = e.target.checked
                                                    ? config.selectedCategories.concat([cat])
                                                    : config.selectedCategories.filter(function(c) { return c !== cat; });
                                                updateDimensionConfig(dimension.code, { selectedCategories: updated });
                                            }
                                        }),
                                        h('span', { className: 'text-sm' },
                                            dimension.category.label[cat] + ' (' + cat + ')'
                                        )
                                    );
                                });
                            })()
                        ),
                        h('button', {
                            className: 'btn btn-outline btn-sm',
                            onClick: function() {
                                const allCats = dimension.category.index;
                                updateDimensionConfig(dimension.code, {
                                    selectedCategories: config.selectedCategories.length === allCats.length ? [] : allCats
                                });
                            }
                        }, config.selectedCategories.length === dimension.category.index.length ? 'Fjern alle' : 'Velg alle')
                    ),
                    config.filter === 'top' && h('div', null,
                        h('label', { className: 'label' }, 'Antall'),
                        h('input', {
                            type: 'number',
                            min: '1',
                            className: 'input',
                            value: config.topCount || '5',
                            onChange: function(e) { updateDimensionConfig(dimension.code, { topCount: e.target.value }); }
                        })
                    ),
                    config.filter === 'all' && h('div', null,
                        h('label', { className: 'label' }, 'Wildcard-verdier (kommaseparert)'),
                        h('input', {
                            className: 'input',
                            value: config.values.join(', '),
                            onChange: function(e) {
                                const values = e.target.value.split(',').map(function(v) { return v.trim(); }).filter(function(v) { return v; });
                                updateDimensionConfig(dimension.code, { values: values.length > 0 ? values : ['*'] });
                            },
                            placeholder: '*, 03*, 30*'
                        }),
                        h('p', { className: 'text-xs text-gray-500 mt-1' },
                            'Bruk * for å matche alle, eller f.eks. "03*" for å matche alle som starter med 03'
                        )
                    ),
                    h('div', { className: 'flex items-center gap-2 text-sm text-gray-600' },
                        h('span', { className: 'badge' },
                            config.selectedCategories.length > 0
                                ? config.selectedCategories.length + ' valgt'
                                : config.filter === 'all'
                                    ? 'Alle (' + dimension.category.index.length + ')'
                                    : config.filter === 'top'
                                        ? 'Topp ' + (config.topCount || 5)
                                        : 'Ingen valgt'
                        )
                    )
                )
            );
        }),
        ),
        h('div', { className: 'flex gap-2' },
            h('button', {
                className: 'btn btn-outline',
                onClick: function() { setStep(2); }
            }, 'Tilbake til tabeller'),
            h('button', {
                className: 'btn btn-primary flex-1',
                onClick: buildFinalQuery
            }, 'Generer spørring')
        )
    );
}
