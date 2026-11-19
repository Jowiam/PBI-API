import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { companySearchURL, splitCodes, joinCodes, fieldCodebook, commonReportYears, loadReportYears, readAssistJSON } from './brregAssist.mjs';

test('Company search distinguishes workplace addresses and keeps complete organisation numbers', () => {
    const search = new URL(companySearchURL({ query: 'Ægir & sønn', municipality: '0301', form: 'AS' }));
    assert.equal(search.searchParams.get('navn'), 'Ægir & sønn');
    assert.equal(search.searchParams.get('forretningsadresse.kommunenummer'), '0301');
    assert.equal(search.searchParams.get('size'), '20');
    const workplace = new URL(companySearchURL({ query: '982 476 089', kind: 'underenheter', municipality: '3201' }));
    assert.equal(workplace.searchParams.get('organisasjonsnummer'), '982476089');
    assert.equal(workplace.searchParams.get('beliggenhetsadresse.kommunenummer'), '3201');
    assert.throws(() => companySearchURL({ query: 'a' }), /to tegn/);
    assert.throws(() => companySearchURL({ query: 'test', municipality: 'Tromsø' }), /kommune/);
    assert.deepEqual(splitCodes('012345678\n982463718,012345678'), ['012345678', '982463718']);
    assert.equal(joinCodes('012345678', '982463718'), '012345678,982463718');
    assert.equal(joinCodes('012345678', '982463718', false), '982463718');
});

test('Code books preserve codes, correct geographic IDs and available industry standards', () => {
    const codebooks = JSON.parse(fs.readFileSync(new URL('../../data/brreg/codebooks.json', import.meta.url), 'utf8'));
    assert.ok(codebooks.industries.length > 1000);
    assert.ok(codebooks.industryStandard.includes('2025'));
    assert.ok(fieldCodebook('organisasjonsform', null, codebooks).some(row => row.code === 'AS'));
    assert.ok(fieldCodebook('REGION', null, codebooks).some(row => row.code === '03'));
    assert.ok(fieldCodebook('REGION', null, codebooks).every(row => /^(\d{2}|UL)$/.test(row.code)));
    assert.notDeepEqual(fieldCodebook('NAERING', null, codebooks, 'SN2007'), fieldCodebook('NAERING', null, codebooks, 'SN2025'));
    assert.ok(fieldCodebook('STOETTEGIVER_ORGNR', null, codebooks).every(row => /^\d{9}$/.test(row.code)));
    assert.deepEqual(fieldCodebook('forretningsadresse.kommunenummer', { municipalities: [{ code: '0301', name: 'OSLO' }] }), [{ code: '0301', label: 'OSLO' }]);
});

test('Report years use the intersection for multiple companies and distinguish document history', () => {
    const lists = [['2011', '2022', '2023', '2024', '2025'], ['2011', '2022', '2024', '2025']];
    assert.deepEqual(commonReportYears(lists), ['2025', '2024', '2022', '2011']);
    assert.deepEqual(commonReportYears(lists, true, new Date('2026-11-19T12:00:00Z')), ['2025', '2024']);
    assert.deepEqual(commonReportYears([['2025'], []]), []);
});

test('Year lookup rejects incomplete numbers, handles API errors and passes cancellation', async () => {
    const original = globalThis.fetch;
    const signal = new AbortController().signal;
    const requests = [];
    try {
        globalThis.fetch = async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ['2024', '2025'] }; };
        assert.deepEqual(await loadReportYears(['012345678', '982463718'], signal), [['2024', '2025'], ['2024', '2025']]);
        assert.ok(requests.every(request => request.options.signal === signal && request.url.endsWith('/aar')));
        await assert.rejects(loadReportYears(['123'], signal), /gyldige/);
        await assert.rejects(loadReportYears(Array(21).fill('982463718'), signal), /20/);
        globalThis.fetch = async () => ({ ok: false, status: 404 });
        await assert.rejects(readAssistJSON('https://data.brreg.no/test', signal), /Ingen registeropplysninger/);
    } finally { globalThis.fetch = original; }
});
