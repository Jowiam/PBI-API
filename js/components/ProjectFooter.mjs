const h = React.createElement;

export function ProjectFooter() {
    const link = (href, label) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label);
    return h('footer', { className: 'project-footer', 'aria-label': 'Kontakt og prosjektets opphav' },
        h('div', { className: 'project-footer-inner' },
            h('p', null, 'Kontakt og tilbakemelding: ', link('https://github.com/Jowiam', 'Jowiam')),
            h('p', null, 'Basert på ',
                link('https://github.com/janhli/FHI-API-Query-Builder', 'FHI API Query Builder'),
                ' av Jan Hiroshi Lintvedt / Akershus fylkeskommune.'),
            h('p', null, 'Emneoppsett og søk er inspirert av ',
                link('https://github.com/avocodetoast/statistikkportalen', 'Statistikkportalen'),
                ' av Hallvard Mørck.')));
}
