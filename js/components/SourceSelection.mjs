const h = React.createElement;

export function renderSourceSelection(
    sources, tables, globalSearch, loading, error,
    selectSource, selectSourceAndTable, setGlobalSearch,
    getSourceIcon, getTableLabel, Icons
) {
    const filteredTables = globalSearch.trim() !== ''
        ? tables.filter(function(table) {
            const searchLower = globalSearch.toLowerCase();
            return (table.title && table.title.toLowerCase().includes(searchLower)) ||
                   (table.name && table.name.toLowerCase().includes(searchLower)) ||
                   (table.tableId && table.tableId.toString().includes(searchLower));
        })
        : [];

    return h('div', { className: 'card' },
        h('div', { className: 'mb-4' },
            h('h2', { className: 'flex items-center gap-2 mb-2' },
                h(Icons.Database),
                'Velg datakilde'
            ),
            h('p', { className: 'text-gray-600' }, 'Velg en kilde nedenfor, eller søk direkte etter en tabell')
        ),
        h('div', { className: 'mb-4' },
            h('input', {
                type: 'text',
                className: 'input',
                placeholder: 'Søk etter tabell på tvers av alle kilder...',
                'aria-label': 'Søk etter tabell på tvers av alle kilder',
                value: globalSearch,
                onChange: function(e) { setGlobalSearch(e.target.value); }
            })
        ),
        globalSearch.trim() !== '' ? h('div', { className: 'mb-2' },
            h('h3', { className: 'font-semibold mb-1 text-sm' },
                'Søkeresultater (' + filteredTables.length + ' tabeller)'
            ),
            filteredTables.length === 0
                ? h('p', { className: 'text-gray-500 text-sm' }, 'Ingen tabeller funnet')
                : h('div', { className: 'space-y-1 max-h-96 overflow-y-auto' },
                    filteredTables.slice(0, 50).map(function(table) {
                        return h('div', {
                            key: table.sourceId + '-' + table.tableId,
                            className: 'bg-white border border-gray-200 rounded px-2 py-1 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors text-sm',
                            onClick: function() {
                                const source = sources.find(function(s) { return s.id === table.sourceId; });
                                if (source) selectSourceAndTable(source, table);
                            }
                        },
                            h('div', { className: 'font-semibold text-sm' }, getTableLabel(table) + ' (' + table.tableId + ')'),
                            h('p', { className: 'text-xs text-gray-500' }, 'Kilde: ' + table.sourceId),
                            table.modifiedAt && h('p', { className: 'text-xs text-gray-500' },
                                'Oppdatert: ' + new Date(table.modifiedAt).toISOString().split('T')[0] + '  [tableId: ' + table.tableId + ']'
                            )
                        );
                    }),
                    filteredTables.length > 50 && h('p', { className: 'text-xs text-gray-500 text-center mt-1' },
                        'Viser 50 av ' + filteredTables.length + ' resultater. Presiser søket for å se flere.'
                    )
                )
        ) : null,
        globalSearch.trim() === '' ? (
            h('div', null,
                loading && h('p', { className: 'text-gray-500', role: 'status', 'aria-live': 'polite' }, 'Laster kilder...'),
                error && h('div', { className: 'alert mb-4', role: 'alert', 'aria-live': 'assertive' }, error),
                h('div', { className: 'grid-cols-3' },
                    sources.map(function(source) {
                        return h('div', {
                            key: source.id,
                            className: 'card card-hover',
                            onClick: function() { selectSource(source); }
                        },
                            h('div', { className: 'flex items-start gap-0' },
                                getSourceIcon(source),
                                h('div', { style: { flex: 1 } },
                                    h('h3', null, source.title || source.name),
                                    source.description && h('p', { className: 'text-sm text-gray-600 mt-1' }, source.description),
                                    source.publishedBy && h('p', { className: 'text-xs text-gray-500 mt-2' }, 'Utgiver: ' + source.publishedBy),
                                    source.aboutUrl && h('a', {
                                        href: source.aboutUrl,
                                        className: 'text-xs text-blue-600 mt-1 inline-block',
                                        target: '_blank',
                                        rel: 'noopener noreferrer',
                                        onClick: function(e) { e.stopPropagation(); }
                                    }, 'Les mer →')
                                )
                            )
                        );
                    })
                )
            )
        ) : null
    );
}
