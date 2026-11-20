import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REGISTER_CATALOG } from './registerCatalog.mjs';
import { brregRString as q } from './brreg.mjs';
import { REGISTER_QUERIES, registerDefaults, registerRequest, registerRCode } from './registerR.mjs';

function options(id, route) {
    const types = { org: '012345678', person: '01010112345', name: 'Ægir Øst', text: 'Øst', uuid: '01234567-89ab-cdef-0123-456789abcdef' };
    return { ...registerDefaults(id, route), ...Object.fromEntries(REGISTER_QUERIES[id][route].fields.filter(([, , , required = true]) => required).filter(([, , type]) => types[type]).map(([key, , type]) => [key, types[type]])) };
}

test('Every register dataset has a runnable R route with the selected source and no browser credentials', () => {
    for (const item of REGISTER_CATALOG) {
        assert.ok(REGISTER_QUERIES[item.id]);
        for (const route of Object.keys(REGISTER_QUERIES[item.id])) {
            const code = registerRCode(item.id, route, options(item.id, route));
            assert.match(code, /data <-/);
            assert.doesNotMatch(code, /\{org\}|\{person\}|\{templateId\}|INSERT|TODO/);
            if (route === 'roaring') {
                assert.match(code, /req_auth_basic\(token_request, client_id, client_secret\)/);
                assert.match(code, /req_body_form\(token_request, grant_type = "client_credentials"\)/);
                assert.match(code, /Sys.getenv\("ROARING_CLIENT_SECRET"\)/);
            }
        }
    }
    assert.equal(registerRequest('rettighetshavere-register', 'brreg', { org: '012345678' }).url, 'https://rrh.brreg.no/api/oppslag/v1/virksomheter/012345678');
    assert.equal(registerRequest('pep', 'roaring', { firstName: 'Ægir', lastName: 'Øst' }).parameters.countryCode, 'NO');
    assert.match(registerRequest('folkeregister', 'skatteetaten', options('folkeregister', 'skatteetaten')).url, /offentlig-med-hjemmel\/api\/v1\/personer\/entydigsoek$/);
});

test('Register queries reject missing identifiers, path injection, impossible dates and invalid options', () => {
    for (const id of ['aksjonaerer', 'rettighetshavere-beregnet', 'personroller', 'folkeregister', 'risiko', 'pep']) {
        const route = Object.keys(REGISTER_QUERIES[id]).at(-1);
        assert.throws(() => registerRCode(id, route, {}));
    }
    assert.throws(() => registerRequest('aksjonaerer', 'roaring', { org: '../secret' }), /ni siffer/);
    assert.throws(() => registerRequest('personroller', 'roaring', { person: '123' }), /elleve/);
    assert.throws(() => registerRequest('folkeregister', 'skatteetaten', { navn: 'Navn', identifikasjonsnummer: '01010112345' }), /fornavn/);
    assert.throws(() => registerRequest('pep', 'roaring', { firstName: 'A', lastName: 'B', birthDate: '2026-02-30' }), /dato/);
    assert.throws(() => registerRequest('regnskap-utvidet', 'roaring', { org: '012345678', years: '6' }), /fem/);
    assert.throws(() => registerRequest('risiko', 'roaring', { org: '012345678', templateId: '../x' }), /UUID/);
    assert.throws(() => registerRequest('aksjonaerer', 'csv', { separator: '|', encoding: 'UTF-8' }), /skilletegn/);
    assert.throws(() => registerRequest('ukjent'), /datakilde/);
    assert.throws(() => registerRequest('pep', 'ukjent'), /datakilde/);
});

const candidates = [process.env.RSCRIPT, 'Rscript', ...(process.env.LOCALAPPDATA ? [path.join(process.env.LOCALAPPDATA, 'Programs/R/R-4.5.3/bin/Rscript.exe')] : [])].filter(Boolean);
const rscript = candidates.find(candidate => spawnSync(candidate, ['--vanilla', '-e', 'quit(status=if(requireNamespace("jsonlite",quietly=TRUE)) 0 else 1)'], { encoding: 'utf8' }).status === 0);

test('Generated R executes every route against mocked transport and imports a CSV with leading zeros', { skip: !rscript && 'R/jsonlite unavailable' }, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'register-r-'));
    try {
        const cases = ['Sys.setenv(ROARING_CLIENT_ID="test-id", ROARING_CLIENT_SECRET="test-secret", BRREG_RRH_TOKEN="rrh-test", FREG_TOKEN="freg-test")'];
        for (const [id, routes] of Object.entries(REGISTER_QUERIES)) {
            for (const [route, query] of Object.entries(routes)) {
                const code = registerRCode(id, route, options(id, route));
                cases.push('invisible(parse(text = ' + q(code) + '))');
                if (route === 'csv') continue;
                const record = { orgnr: '012345678', navn: 'Ægir Øst', zero: 0, missing: null, nested: { code: '03' }, items: ['x', 'y'] };
                const result = query.rows ? { [query.rows]: [record, { orgnr: '923609016' }] } : record;
                const request = registerRequest(id, route, options(id, route));
                const mocking = code.replaceAll('httr2::', '');
                cases.push(`local({
  calls <- list()
  request <- function(url) list(url = url)
  req_auth_basic <- function(req, username, password) { req$basic <- c(username, password); req }
  req_body_form <- function(req, ...) { req$form <- list(...); req }
  req_url_query <- function(req, ...) { req$query <- list(...); req }
  req_auth_bearer_token <- function(req, token) { req$token <- token; req }
  req_headers <- function(req, ...) req
  req_timeout <- function(req, ...) req
  req_perform <- function(req) {
    calls[[length(calls) + 1L]] <<- req
    if (req$url == "https://api.roaring.io/token") return(list(access_token = "roaring-test"))
    jsonlite::fromJSON(${q(JSON.stringify(result))}, simplifyVector = FALSE)
  }
  resp_body_json <- function(response, ...) response
${mocking}
  stopifnot(nrow(data) == ${query.rows ? 2 : 1}L, data$orgnr[1] == "012345678", data$navn[1] == "Ægir Øst", data$zero[1] == "0", is.na(data$missing[1]), data$nested.code[1] == "03", data$items[1] == '["x","y"]')
  last <- calls[[length(calls)]]
  stopifnot(last$url == ${q(request.url)}, last$token == ${q(query.auth === 'roaring' ? 'roaring-test' : query.auth === 'rrh' ? 'rrh-test' : 'freg-test')})
  expected <- jsonlite::fromJSON(${q(JSON.stringify(request.parameters))})
  for (key in names(expected)) stopifnot(identical(last$query[[key]], expected[[key]]))
  ${query.auth === 'roaring' ? 'stopifnot(identical(calls[[1]]$basic, c("test-id", "test-secret")), calls[[1]]$form$grant_type == "client_credentials")' : ''}
})`);
            }
        }
        const csv = path.join(directory, 'aksjer.csv');
        fs.writeFileSync(csv, 'Orgnr;Navn;Antall\n012345678;Ægir Øst;0\n');
        cases.push(`local({ file.choose <- function() ${q(csv)}
${registerRCode('aksjonaerer', 'csv', registerDefaults('aksjonaerer', 'csv'))}
stopifnot(nrow(data) == 1L, data$Orgnr == "012345678", data$Navn == "Ægir Øst", data$Antall == "0")
})`);
        const file = path.join(directory, 'check.R');
        fs.writeFileSync(file, cases.join('\n').replace(/[^\x00-\x7f]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')));
        const run = spawnSync(rscript, ['--vanilla', file], { encoding: 'utf8', timeout: 30000 });
        assert.equal(run.status, 0, run.stdout + run.stderr);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
