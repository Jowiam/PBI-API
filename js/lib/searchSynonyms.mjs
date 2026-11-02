// Adapted from avocodetoast/statistikkportalen/js/synonyms.js.
// Copyright 2026 Hallvard Mørck. MIT; see THIRD-PARTY-NOTICES.md.
export const SEARCH_SYNONYMS = [
    ['aku', 'arbeidskraftundersokelsen', 'arbeidskraftmaling'],
    ['bnp', 'bruttonasjonalprodukt', 'bruttoprodukt'],
    ['kpi', 'konsumprisindeks', 'prisvekst', 'inflasjon'],
    ['knr', 'nasjonalregnskap'],
    ['fob', 'folke og boligtellingen', 'folke boligtellingen'],
    ['ssb', 'statistisk sentralbyra'],
    ['nav', 'arbeids og velferdsetaten'],
    ['nho', 'naeringslivets hovedorganisasjon'],
    ['sfo', 'skolefritidsordning'],
    ['vgs', 'videregaende skole', 'videregaende opplaering'],
    ['gsi', 'grunnskolens informasjonssystem'],
    ['kostra', 'kommune stat rapportering'],
    ['fhi', 'folkehelseinstituttet'],
    ['mva', 'merverdiavgift', 'merverdi'],
    ['helse', 'helseforetak', 'sykehus'],
    ['bolig', 'eiendom', 'boliger'],
    ['sysselsetting', 'sysselsatte', 'arbeidsforhold'],
    ['arbeidsledig', 'arbeidsledighet', 'ledige', 'ledighetsprosent']
];

export function normalizeSearch(value) {
    return String(value ?? '').toLocaleLowerCase('nb-NO').replace(/æ/g, 'ae').replace(/ø/g, 'o')
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

export function searchTerms(query, smart = false) {
    const tokens = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
    return tokens.map(token => {
        if (!smart) return [token];
        const synonyms = SEARCH_SYNONYMS.filter(group => group.includes(token)).flat();
        return [...new Set([token, ...synonyms])];
    });
}
