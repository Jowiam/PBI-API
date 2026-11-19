import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BRREG_TOPICS, brregRCode, brregRString, validateBrregOptions } from './brreg.mjs';
import { stotteSearchBody } from './brregExtra.mjs';

const metadata = JSON.parse(fs.readFileSync(new URL('../../data/brreg/metadata.json', import.meta.url), 'utf8'));

test('Brreg topics only expose public sources, with unique IDs and valid generated R', () => {
    assert.equal(new Set(BRREG_TOPICS.map(item => item.id)).size, BRREG_TOPICS.length);
    assert.ok(BRREG_TOPICS.length >= 70);
    for (const item of BRREG_TOPICS) {
        assert.doesNotMatch(item.path, /autorisert|kontroll|by-ip|\/log/);
        const parameters = item.id.startsWith('endringer-') ? { [item.events ? 'afterTime' : 'dato']: '2026-11-18T00:00' } : {};
        for (const key of item.required || []) parameters[key] = key === 'aar' ? '2025' : '123';
        if (item.requireAny) parameters[item.requireAny[0]] = '1234';
        const code = brregRCode(item.id, { org: '982463718', parameters }, metadata);
        assert.doesNotMatch(code, /requireNamespace|install\.packages|req_retry|perform_request|print\(/);
        for (const line of code.split('\n')) assert.ok(Buffer.byteLength(line) < 4094);
    }
    assert.ok(metadata.municipalities.some(value => value.code === '0301'));
    assert.ok(metadata.filters.enheter.some(value => value.name === 'forretningsadresse.kommunenummer'));
});

test('Support searches preserve filter types, dates and a single multi-value selection', () => {
    const parameters = { STOETTEMOTTAKER_ORGNR: '012345678', REGION: '03', NAERING: '62.1, 63.1', fraTildelingsdato: '2025-01-01', tilTildelingsdato: '2025-12-31' };
    const body = stotteSearchBody(validateBrregOptions('stotte-stoettetildeling', { parameters }).parameters);
    assert.deepEqual(body.find(value => value.field === 'REGION').value, ['03']);
    assert.deepEqual(body.find(value => value.field === 'NAERING').value, ['62.1', '63.1']);
    assert.equal(body.find(value => value.field === 'STOETTEMOTTAKER_ORGNR').value, '012345678');
    assert.equal(body.filter(value => value.field === 'TILDELINGSDATO').length, 2);
    assert.throws(() => brregRCode('regnskap-pdf', { org: '982463718' }), /Regnskapsår/);
    assert.throws(() => brregRCode('matrikkelenhet'), /matrikkel/);
    assert.throws(() => brregRCode('regnskap-oppslag', { org: '982463718', parameters: { id: '../secret' } }), /gyldig/);
    assert.throws(() => brregRCode('stotte-kode-naering', { parameters: { standard: 'FEIL' } }), /gyldig/);
    assert.throws(() => brregRCode('stotte-stoettetildeling', { parameters: { fraTildelingsdato: '2025-02-30' } }), /gyldig/);
    assert.match(brregRCode('regnskap-pdf', { org: '982463718', parameters: { aar: '2025' } }), /982463718/);
});

test('Brreg rejects missing organisations, invalid periods and unsupported filters', () => {
    assert.throws(() => brregRCode('roller', { org: '123' }), /ni siffer/);
    assert.throws(() => brregRCode('endringer-roller'), /tidspunkt/);
    assert.throws(() => brregRCode('enheter', { parameters: { secret: 'x' } }, metadata), /støttes ikke/);
    assert.throws(() => brregRCode('regnskap', { org: '982463718', parameters: { regnskapstype: 'FEIL' } }), /SELSKAP/);
    assert.throws(() => brregRCode('endringer-enheter', { parameters: { dato: '2026-11-18T00:00', updatedBefore: '2026-11-17T00:00' } }), /etter/);
    const result = validateBrregOptions('endringer-roller', { parameters: { afterTime: '2026-11-18T00:00' } });
    assert.equal(result.parameters.afterTime, '2026-11-18T00:00:00.000Z');
    assert.deepEqual(validateBrregOptions('roller', { org: '982463718, 923609016\n982463718' }).orgs, ['982463718', '923609016']);
});

test('Long selections produce console-safe UTF-8 R lines', () => {
    const code = brregRCode('enheter', { parameters: { navn: 'Æøå "\\\n'.repeat(1000) } }, metadata);
    assert.match(code, /paste0\(/);
    assert.ok(code.split('\n').every(line => Buffer.byteLength(line) < 4094));
    assert.equal(brregRString('a"b\nc'), '"a\\"b\\nc"');
    const supportCode = brregRCode('stotte-stoettetildeling', { parameters: { REGION: Array.from({ length: 1000 }, (_, index) => String(index)).join(',') } });
    assert.ok(supportCode.split('\n').every(line => Buffer.byteLength(line) < 4094));
});

const rCandidates = [process.env.RSCRIPT, 'Rscript', ...(process.env.LOCALAPPDATA ? [path.join(process.env.LOCALAPPDATA, 'Programs/R/R-4.5.3/bin/Rscript.exe')] : [])].filter(Boolean);
const rscript = rCandidates.find(candidate => spawnSync(candidate, ['--vanilla', '-e', 'quit(status=if(requireNamespace("jsonlite",quietly=TRUE) && requireNamespace("httr2",quietly=TRUE)) 0 else 1)'], { encoding: 'utf8' }).status === 0);

test('Generated R handles full pagination, missing values, roles, trees, cursor events and bulk CSV', { skip: !rscript && 'R with httr2/jsonlite is not installed' }, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brreg-r-'));
    try {
        const cases = [];
        function run(id, options, responses, checks) {
            const code = brregRCode(id, options, metadata);
            cases.push(`local({
  responses <- jsonlite::fromJSON(${brregRString(JSON.stringify(responses))}, simplifyVector = FALSE)
  calls <- list()
  request <- function(url) list(url = url)
  req_url_query <- function(req, ...) { req$parameters <- list(...); req }
  req_body_json <- function(req, data, ...) { req$body <- data; req }
  req_perform <- function(req) { calls[[length(calls) + 1L]] <<- req; responses[[length(calls)]] }
  resp_body_json <- function(response, ...) response
${code}
${checks}
})`);
        }
        for (const item of BRREG_TOPICS) {
            const parameters = item.id.startsWith('endringer-') ? { [item.events ? 'afterTime' : 'dato']: '2026-11-18T00:00' } : {};
            for (const key of item.required || []) parameters[key] = key === 'aar' ? '2025' : '123';
            if (item.requireAny) parameters[item.requireAny[0]] = '1234';
            cases.push('invisible(parse(text = ' + brregRString(brregRCode(item.id, { org: '982463718', parameters }, metadata)) + '))');
        }
        run('enheter', {}, [
            { _embedded: { enheter: [{ organisasjonsnummer: '012345678', antallAnsatte: 0, adresse: { kommune: '0301' }, koder: ['a', 'b'] }] }, _links: { next: { href: 'https://data.brreg.no/next?page=1' } }, page: { totalElements: 2 } },
            { _embedded: { enheter: [{ organisasjonsnummer: '982463718', navn: 'Æ Ø Å' }] }, page: { totalElements: 2 } }
        ], 'stopifnot(nrow(data) == 2L, length(calls) == 2L, calls[[2]]$url == "https://data.brreg.no/next?page=1", data$antallAnsatte[1] == 0, is.na(data$antallAnsatte[2]), data$adresse.kommune[1] == "0301", data$organisasjonsnummer[1] == "012345678", data$koder[1] == \'["a","b"]\')');
        run('enheter', {}, [{ page: { totalElements: 0 }, _embedded: { enheter: [] } }], 'stopifnot(nrow(data) == 0L)');
        run('stotte-stoettetildeling', { parameters: { REGION: '03', STOETTEMOTTAKER_ORGNR: '012345678' } }, [
            { stoettetildeling: Array.from({ length: 1000 }, (_, i) => ({ stoettetiltaksnummer: String(i), tildeltBeloep: { beloep: 0, valuta: 'NOK' } })) },
            { stoettetildeling: [{ stoettetiltaksnummer: '1000', region: '03' }] }
        ], 'stopifnot(nrow(data) == 1001L, calls[[2]]$parameters$page == 2L, calls[[1]]$parameters$sortDirection == "ASC", identical(calls[[1]]$body, calls[[2]]$body), identical(calls[[1]]$body[[2]]$value, list("03")), data$tildeltBeloep.beloep[1] == 0, is.na(data$tildeltBeloep.beloep[1001]))');
        run('stotte-relasjon-artikkeltype', {}, [{ 'artikkeltype.14': { formaalstype: ['formaalstype.a', 'formaalstype.b'] }, 'artikkeltype.15': { formaalstype: [] } }], 'stopifnot(nrow(data) == 2L, data$identifikator[1] == "artikkeltype.14", data$formaalstype[1] == \'["formaalstype.a","formaalstype.b"]\')');
        run('matrikkelenhet', { parameters: { matrikkelenhetid: '1234' } }, [[{ orgnr: '012345678', kommnr: '0301' }]], 'stopifnot(nrow(data) == 1L, data$orgnr == "012345678")');
        run('roller', { org: '982463718\n923609016' }, [
            { rollegrupper: [{ type: { kode: 'STYR' }, roller: [{ type: { kode: 'LEDE' }, person: { navn: { fornavn: 'Ægir' } } }] }] },
            { rollegrupper: [{ type: { kode: 'DAGL' }, roller: [{ type: { kode: 'DAGL' } }] }] }
        ], 'stopifnot(nrow(data) == 2L, data$person.navn.fornavn[1] == "Ægir", data$rollegruppe.kode[1] == "STYR", data$spurt_organisasjonsnummer[2] == "923609016")');
        run('konsern', { org: '982463718' }, [{ organisasjonsnummer: '982463718', children: [{ organisasjonsnummer: '123456789', parentOrganisasjonsnummer: '982463718', children: [{ organisasjonsnummer: '234567891', parentOrganisasjonsnummer: '123456789', children: [] }] }] }], 'stopifnot(nrow(data) == 3L, data$parentOrganisasjonsnummer[3] == "123456789")');
        run('endringer-roller', { parameters: { afterTime: '2026-11-18T00:00' } }, [Array.from({ length: 1000 }, (_, i) => ({ id: String(i + 1), data: { organisasjonsnummer: '982463718' } })), [{ id: '1001', data: { organisasjonsnummer: '923609016' } }]], 'stopifnot(nrow(data) == 1001L, calls[[2]]$parameters$afterId == "1000", is.null(calls[[2]]$parameters$afterTime))');
        const limitCode = brregRCode('enheter', {}, metadata);
        cases.push(`local({
request <- function(url) list(url = url)
req_url_query <- function(req, ...) req
req_perform <- function(req) list(page = list(totalElements = 10001))
resp_body_json <- function(response, ...) response
error <- tryCatch({ ${limitCode}\n NULL }, error = identity)
stopifnot(inherits(error, "error"), grepl("10 000", conditionMessage(error)))
})`);
        const supportLimitCode = brregRCode('stotte-stoettetildeling');
        cases.push(`local({
request <- function(url) list(url = url)
req_url_query <- function(req, ...) req
req_body_json <- function(req, ...) req
req_perform <- function(req) list(stoettetildeling = rep(list(list(id = "1")), 1000L))
resp_body_json <- function(response, ...) response
error <- tryCatch({ ${supportLimitCode}\n NULL }, error = identity)
stopifnot(inherits(error, "error"), grepl("100 000", conditionMessage(error)), page == 100L)
})`);
        const partyCode = brregRCode('partier');
        const bomCode = brregRCode('regnskap-csv', { org: '012345678\n982463718', parameters: { aar: '2025' } });
        cases.push(`local({
request <- function(url) url
req_headers <- function(req, ...) req
req_perform <- function(req, path) {
  writeBin(charToRaw(enc2utf8('"012345678";"Første parti";"FLI";"Gate 1";"0010";"OSLO";"0301";"OSLO";"Norge";"";"";"";""\\n')), path)
}
${partyCode}
stopifnot(nrow(data) == 1L, data$organisasjonsnummer[1] == "012345678", data$forretningsadresse.poststed[1] == "OSLO", data$forretningsadresse.kommunenummer[1] == "0301")
})
local({
request <- function(url) list(url = url)
req_headers <- function(req, ...) req
req_url_query <- function(req, ...) { stopifnot(list(...)$aar == "2025"); req }
req_perform <- function(req, path) {
  writeBin(c(as.raw(c(239,187,191)), charToRaw(enc2utf8('"id";"navn";"belop"\\n"1";"Ægir";"1,50"\\n'))), path)
}
${bomCode}
stopifnot(nrow(data) == 2L, data$id[1] == "1", data$navn[1] == "Ægir", data$belop[1] == "1,50", data$spurt_organisasjonsnummer[1] == "012345678", data$spurt_organisasjonsnummer[2] == "982463718")
})`);
        const pdfCode = brregRCode('regnskap-pdf', { org: '012345678\n982463718', parameters: { aar: '2025' } });
        cases.push(`local({
request <- function(url) url
req_headers <- function(req, ...) req
req_perform <- function(req, path) { writeBin(charToRaw("%PDF"), path) }
${pdfCode}
stopifnot(nrow(data) == 2L, length(unique(data$fil)) == 2L, all(file.exists(data$fil)), all(data$format == "PDF"), data$spurt_organisasjonsnummer[1] == "012345678")
})`);
        const csvCode = brregRCode('fil-enheter');
        cases.push(`local({
request <- function(url) url
req_headers <- function(req, ...) req
req_perform <- function(req, path) {
  con <- gzfile(path, "wb")
  writeBin(charToRaw(enc2utf8('"organisasjonsnummer","navn","landkode"\n"012345678","Ægir","NA"\n')), con)
  close(con)
  invisible(NULL)
}
${csvCode}
stopifnot(data$organisasjonsnummer == "012345678", data$navn == "Ægir", data$landkode == "NA")
})`);
        const script = path.join(directory, 'verify.R');
        // ASCII fixture source also runs with a minimal Windows C locale.
        const source = (cases.join('\n') + '\ncat("Brreg R fixtures OK\\n")\n').replace(/[^\x00-\x7f]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
        fs.writeFileSync(script, source);
        const result = spawnSync(rscript, ['--vanilla', script], { cwd: directory, encoding: 'utf8', timeout: 60000, maxBuffer: 4e6 });
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /Brreg R fixtures OK/);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
