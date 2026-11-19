import { BRREG_API } from './brreg.mjs';

export const splitCodes = value => [...new Set(String(value || '').split(/[\s,;]+/).filter(Boolean))];
export const joinCodes = (value, code, multiple = true) => multiple ? [...new Set([...splitCodes(value), code])].join(',') : code;

export function companySearchURL({ query, municipality = '', form = '', kind = 'enheter' }) {
    if (!['enheter', 'underenheter'].includes(kind)) throw new Error('Velg virksomheter eller arbeidssteder.');
    const text = query.trim();
    if (text.length < 2) throw new Error('Skriv minst to tegn i navnet eller et organisasjonsnummer.');
    const url = new URL(BRREG_API + '/enhetsregisteret/api/' + kind);
    if (/^\d{9}$/.test(text.replaceAll(' ', ''))) url.searchParams.set('organisasjonsnummer', text.replaceAll(' ', ''));
    else url.searchParams.set('navn', text);
    if (municipality) {
        if (!/^\d{4}$/.test(municipality)) throw new Error('Velg en kommune med firesifret kode.');
        url.searchParams.set((kind === 'enheter' ? 'forretningsadresse' : 'beliggenhetsadresse') + '.kommunenummer', municipality);
    }
    if (form) url.searchParams.set('organisasjonsform', form);
    url.searchParams.set('size', '20');
    return url.toString();
}

export async function readAssistJSON(url, signal) {
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(response.status === 404 ? 'Ingen registeropplysninger funnet for dette oppslaget.' : 'Kunne ikke hente registeropplysninger (HTTP ' + response.status + ').');
    return response.json();
}

export function fieldCodebook(name, metadata, codebooks, standard = 'SN2007') {
    if (name === 'kommunenummer' || name.endsWith('.kommunenummer')) return (metadata?.municipalities || []).map(value => ({ code: value.code, label: value.name }));
    if (name === 'organisasjonsform') return codebooks?.organisationForms;
    if (name === 'naeringskode') return codebooks?.industries;
    const key = { REGION: 'region', NAERING: 'naering' + standard, STOETTEGIVER_ORGNR: 'stoettegiver',
        STATSSTOETTEKATEGORI: 'statsstoettekategori', PRIMAERRETTSLIG_GRUNNLAG: 'eosprimaerrettsliggrunnlag',
        STOETTEINSTRUMENT: 'stoetteinstrumenttype', ARTIKKEL: 'artikkeltype', RETNINGSLINJE_ESA: 'retningslinjeesa' }[name];
    return key ? codebooks?.stotte?.[key] : undefined;
}

export const isCodeField = name => name === 'kommunenummer' || name.endsWith('.kommunenummer') ||
    ['organisasjonsform', 'naeringskode', 'REGION', 'NAERING', 'STOETTEGIVER_ORGNR', 'STATSSTOETTEKATEGORI', 'PRIMAERRETTSLIG_GRUNNLAG', 'STOETTEINSTRUMENT', 'ARTIKKEL', 'RETNINGSLINJE_ESA'].includes(name);
export const isCompanyField = name => ['organisasjonsnummer', 'overordnetEnhet', 'STOETTEMOTTAKER_ORGNR', 'STOETTEGIVER_ORGNR'].includes(name);
export const multipleCodeField = name => ['organisasjonsform', 'naeringskode', 'kommunenummer', 'REGION', 'NAERING', 'organisasjonsnummer'].includes(name) || name.endsWith('.kommunenummer');

export function commonReportYears(lists, numeric = false, now = new Date()) {
    const currentYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Oslo', year: 'numeric' }).format(now));
    const common = lists.length ? lists[0].filter(year => lists.every(list => list.includes(year))) : [];
    return [...new Set(common)].filter(year => /^\d{4}$/.test(year) && (!numeric || Number(year) >= currentYear - 3))
        .sort((a, b) => Number(b) - Number(a));
}

export async function loadReportYears(orgs, signal) {
    if (!orgs.length || orgs.some(org => !/^\d{9}$/.test(org))) throw new Error('Velg eller skriv gyldige organisasjonsnumre først.');
    if (orgs.length > 20) throw new Error('Årsoversikten støtter inntil 20 virksomheter om gangen. Du kan fortsatt skrive årstallet manuelt.');
    const result = [];
    for (let start = 0; start < orgs.length; start += 4) {
        result.push(...await Promise.all(orgs.slice(start, start + 4).map(org =>
            readAssistJSON(BRREG_API + '/regnskapsregisteret/regnskap/aarsregnskap/kopi/' + org + '/aar', signal)
                .then(years => { if (!Array.isArray(years)) throw new Error('Uventet format på årsoversikten.'); return years.map(String); }))));
    }
    return result;
}
