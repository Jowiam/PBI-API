const h = React.createElement;

export const Icons = {
    ChevronRight: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('polyline', { points: '9 18 15 12 9 6' })
    ),
    CheckCircle: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
        h('polyline', { points: '22 4 12 14.01 9 11.01' })
    ),
    Copy: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }),
        h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })
    ),
    Download: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
        h('polyline', { points: '7 10 12 15 17 10' }),
        h('line', { x1: '12', y1: '15', x2: '12', y2: '3' })
    ),
    RefreshCw: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('polyline', { points: '23 4 23 10 17 10' }),
        h('polyline', { points: '1 20 1 14 7 14' }),
        h('path', { d: 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' })
    ),
    Database: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('ellipse', { cx: '12', cy: '5', rx: '9', ry: '3' }),
        h('path', { d: 'M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' }),
        h('path', { d: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' })
    ),
    Filter: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('polygon', { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' })
    ),
    Eye: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
        h('circle', { cx: '12', cy: '12', r: '3' })
    ),
    ChevronRight: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('polyline', { points: '9 18 15 12 9 6' })
    ),
    // Source icons
    BarChart: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('line', { x1: '12', y1: '2', x2: '12', y2: '22' }),
        h('line', { x1: '2', y1: '22', x2: '22', y2: '22' }),
        h('rect', { x: '2', y: '16', width: '3', height: '6' }),
        h('rect', { x: '10', y: '10', width: '3', height: '12' }),
        h('rect', { x: '18', y: '6', width: '3', height: '16' })
    ),
    Building: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('rect', { x: '3', y: '2', width: '18', height: '20', rx: '2' }),
        h('line', { x1: '9', y1: '2', x2: '9', y2: '22' }),
        h('line', { x1: '15', y1: '2', x2: '15', y2: '22' }),
        h('line', { x1: '3', y1: '8', x2: '21', y2: '8' }),
        h('line', { x1: '3', y1: '14', x2: '21', y2: '14' }),
        h('rect', { x: '5', y: '4', width: '2', height: '2' }),
        h('rect', { x: '11', y: '4', width: '2', height: '2' }),
        h('rect', { x: '17', y: '4', width: '2', height: '2' })
    ),
    Heart: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' })
    ),
    TrendingUp: () => h('svg', { className: 'icon', viewBox: '0 0 24 24' },
        h('polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 18' }),
        h('polyline', { points: '17 6 23 6 23 12' })
    )
};

export function getSourceIcon(source) {
    const sourceTitle = (source.title || source.name || '').toLowerCase();

    if (sourceTitle.includes('folkehelsestatistikk')) {
        // Bar chart for statistics
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('line', { x1: '12', y1: '2', x2: '12', y2: '22' }),
            h('line', { x1: '2', y1: '22', x2: '22', y2: '22' }),
            h('rect', { x: '2', y: '16', width: '3', height: '6' }),
            h('rect', { x: '10', y: '10', width: '3', height: '12' }),
            h('rect', { x: '18', y: '6', width: '3', height: '16' })
        );
    } else if (sourceTitle.includes('genomovervåk')) {
        // DNA helix for genomics
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('path', { d: 'M9 3c0 1.5 1 3 2 4.5', strokeLinecap: 'round' }),
            h('path', { d: 'M15 3c0 1.5-1 3-2 4.5', strokeLinecap: 'round' }),
            h('path', { d: 'M9 7.5c0 1.5 1 3 2 4.5', strokeLinecap: 'round' }),
            h('path', { d: 'M15 7.5c0 1.5-1 3-2 4.5', strokeLinecap: 'round' }),
            h('path', { d: 'M9 12c0 1.5 1 3 2 4.5', strokeLinecap: 'round' }),
            h('path', { d: 'M15 12c0 1.5-1 3-2 4.5', strokeLinecap: 'round' }),
            h('path', { d: 'M9 16.5c0 1.5 1 3 2 4.5', strokeLinecap: 'round' }),
            h('path', { d: 'M15 16.5c0 1.5-1 3-2 4.5', strokeLinecap: 'round' }),
            h('circle', { cx: '9', cy: '4', r: '1.5' }),
            h('circle', { cx: '15', cy: '4', r: '1.5' }),
            h('circle', { cx: '11', cy: '8', r: '1' }),
            h('circle', { cx: '13', cy: '8', r: '1' }),
            h('circle', { cx: '10', cy: '12', r: '1' }),
            h('circle', { cx: '14', cy: '12', r: '1' }),
            h('circle', { cx: '9', cy: '20', r: '1.5' }),
            h('circle', { cx: '15', cy: '20', r: '1.5' })
        );
    } else if (sourceTitle.includes('fødselsregister')) {
        // Baby icon for birth register
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('circle', { cx: '12', cy: '8', r: '3' }),
            h('path', { d: 'M12 11c3 0 7 1 7 5v3H5v-3c0-4 4-5 7-5z' }),
            h('path', { d: 'M5.5 17a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2H5.5v-2z' })
        );
    } else if (sourceTitle.includes('abortregisteret')) {
        // Pregnancy icon for abortion register
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('circle', { cx: '12', cy: '6', r: '4' }),
            h('path', { d: 'M12 10c-4 0-7 2-7 6v2h14v-2c0-4-3-6-7-6z' }),
            h('ellipse', { cx: '12', cy: '20', rx: '3', ry: '2' })
        );
    } else if (sourceTitle.includes('vaksin')) {
        // Syringe icon for vaccination
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('path', { d: 'M3 15c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4z' }),
            h('path', { d: 'M7 13l10-10' }),
            h('path', { d: 'M21 5l-8 8' }),
            h('rect', { x: '13', y: '3', width: '2', height: '8', transform: 'rotate(45 14 7)' })
        );
    } else if (sourceTitle.includes('dødsårsakregisteret')) {
        // Document icon for death causes register
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
            h('polyline', { points: '14 2 14 8 20 8' }),
            h('line', { x1: '12', y1: '13', x2: '12', y2: '17' }),
            h('line', { x1: '10', y1: '15', x2: '14', y2: '15' })
        );
    } else if (sourceTitle.includes('msis') || sourceTitle.includes('smittsomme')) {
        // Alert icon for infectious diseases
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('circle', { cx: '12', cy: '13', r: '8' }),
            h('line', { x1: '12', y1: '9', x2: '12', y2: '13' }),
            h('line', { x1: '12', y1: '17', x2: '12', y2: '17' }),
            h('path', { d: 'M5 13h14' })
        );
    } else if (sourceTitle.includes('legemiddel')) {
        // Pill/medicine icon
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('ellipse', { cx: '10', cy: '12', rx: '4', ry: '6' }),
            h('ellipse', { cx: '14', cy: '12', rx: '4', ry: '6' }),
            h('line', { x1: '10', y1: '6', x2: '10', y2: '18' }),
            h('line', { x1: '14', y1: '6', x2: '14', y2: '18' })
        );
    } else if (sourceTitle.includes('grossist')) {
        // Box/shipment icon
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('rect', { x: '3', y: '6', width: '18', height: '12', rx: '2' }),
            h('line', { x1: '3', y1: '10', x2: '21', y2: '10' }),
            h('line', { x1: '12', y1: '6', x2: '12', y2: '18' }),
            h('polyline', { points: '7 6 3 3 3 6' })
        );
    } else if (sourceTitle.includes('pasientregister')) {
        // Hospital/health icon
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('rect', { x: '3', y: '2', width: '18', height: '20', rx: '2' }),
            h('line', { x1: '9', y1: '2', x2: '9', y2: '22' }),
            h('line', { x1: '15', y1: '2', x2: '15', y2: '22' }),
            h('line', { x1: '3', y1: '8', x2: '21', y2: '8' }),
            h('line', { x1: '3', y1: '14', x2: '21', y2: '14' })
        );
    } else if (sourceTitle.includes('kommunalt')) {
        // People/community icon
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('circle', { cx: '9', cy: '6', r: '3' }),
            h('circle', { cx: '18', cy: '8', r: '3' }),
            h('path', { d: 'M9 9c-3 0-5 2-5 5v4h14v-4c0-3-2-5-5-5z' }),
            h('path', { d: 'M18 11c-2 0-3 1-3 3v3h8v-3c0-2-1-3-3-3z' })
        );
    } else if (sourceTitle.includes('hjerte') || sourceTitle.includes('kar')) {
        // Heart icon for cardiovascular
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' })
        );
    } else {
        // Default database icon
        return h('svg', { className: 'source-icon', viewBox: '0 0 24 24', width: '32', height: '32', style: { marginRight: '1rem' } },
            h('ellipse', { cx: '12', cy: '5', rx: '9', ry: '3' }),
            h('path', { d: 'M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' }),
            h('path', { d: 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' })
        );
    }
}
