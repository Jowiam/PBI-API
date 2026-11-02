const h = React.createElement;

export function renderTableSelection(
    tables, selectedSource, tableSearch, expandedCategories, loading, error, step,
    selectTable, setTableSearch, setExpandedCategories, setStep,
    getTableLabel, getTableCategory
) {
    const filteredTables = tableSearch.trim() !== ''
        ? tables.filter(function(table) {
            const searchLower = tableSearch.toLowerCase();
            const label = getTableLabel(table).toLowerCase();
            const tableId = (table.tableId || '').toString().toLowerCase();
            return label.includes(searchLower) || tableId.includes(searchLower);
        })
        : tables;

    // Gruppér tabeller etter category
    const groupedByCategory = {};
    filteredTables.forEach(function(table) {
        const category = getTableCategory(table) || 'Andre';
        if (!groupedByCategory[category]) {
            groupedByCategory[category] = [];
        }
        groupedByCategory[category].push(table);
    });

    // Sorter kategorier alfabetisk
    const sortedCategories = Object.keys(groupedByCategory).sort();

    // Toggle category expand/collapse
    const toggleCategory = function(category) {
        setExpandedCategories(function(prev) {
            return Object.assign({}, prev, {
                [category]: !prev[category]
            });
        });
    };

    return h('div', { className: 'card' },
        h('div', { className: 'mb-2' },
            h('h2', { className: 'flex items-center gap-2 mb-2' }, 'Velg tabell fra ' + (selectedSource ? selectedSource.title || selectedSource.name : '')),
            h('p', { className: 'text-gray-600 text-sm' }, 'Velg hvilken tabell du vil bygge en spørring for')
        ),
        h('input', {
            type: 'text',
            className: 'input mb-2',
            placeholder: 'Søk i tabeller...',
            'aria-label': 'Søk i tilgjengelige tabeller',
            value: tableSearch,
            onChange: function(e) { setTableSearch(e.target.value); }
        }),
        loading && h('p', { className: 'text-gray-500 text-sm mb-2', role: 'status', 'aria-live': 'polite' }, 'Laster tabeller...'),
        error && h('div', { className: 'alert mb-2 text-sm', role: 'alert', 'aria-live': 'assertive' }, error),

        // Moderne meny
        h('div', { style: {
            overflowY: 'auto',
            marginBottom: '0.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            backgroundColor: '#ffffff'
        }},
            h('div', null,
                sortedCategories.map(function(category, idx) {
                    const tablesInCategory = groupedByCategory[category];
                    const isExpanded = expandedCategories[category] !== false;

                    return h('div', { key: category },
                        // KATEGORI-HEADER (lik geo-county)
                        h('div', { className: 'geo-county' },
                            h('button', {
                                onClick: function() { toggleCategory(category); },
                                className: 'geo-county-header',
                                style: { width: '100%', justifyContent: 'flex-start' }
                            },
                                h('svg', {
                                    className: 'geo-chevron' + (isExpanded ? ' expanded' : ''),
                                    viewBox: '0 0 24 24',
                                    onClick: function(e) {
                                        e.stopPropagation();
                                        toggleCategory(category);
                                    }
                                },
                                    h('polyline', { points: '9 18 15 12 9 6', fill: 'none', stroke: 'currentColor', strokeWidth: '2' })
                                ),
                                h('span', null, category)
                            )
                        ),

                        // TABELLER (lik geo-municipality-list)
                        isExpanded && h('div', { className: 'geo-municipality-list' },
                            tablesInCategory.map(function(table) {
                                return h('div', { key: table.tableId, className: 'geo-municipality' },
                                    h('div', { className: 'geo-municipality-header', onClick: function() { selectTable(table); }, style: { cursor: 'pointer' } },
                                        h('span', { className: 'flex-1' }, getTableLabel(table)),
                                        table.modifiedAt && h('span', { className: 'text-xs', style: { color: '#9ca3af', marginLeft: '0.5rem' } }, 'Oppdatert: ' + table.modifiedAt.split('T')[0] + '  [tableId: ' + table.tableId + ']')
                                    )
                                );
                            })
                        )
                    );
                })
            )
        ),

        filteredTables.length === 0 && tableSearch.trim() !== '' && h('p', { className: 'text-gray-500 text-sm text-center mb-2' },
            'Ingen tabeller funnet'
        ),
        h('button', {
            className: 'btn btn-outline text-sm',
            onClick: function() { setTableSearch(''); setStep(1); }
        }, 'Tilbake til kilder')
    );
}
