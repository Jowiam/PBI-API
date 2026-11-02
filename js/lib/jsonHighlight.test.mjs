import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeJson } from './jsonHighlight.mjs';

test('tokenizes a simple object into key/string/punctuation tokens', () => {
    const tokens = tokenizeJson('{"code": "AAR"}');
    assert.deepEqual(tokens.map((t) => t.type), ['punctuation', 'key', 'punctuation', 'string', 'punctuation']);
    assert.equal(tokens.map((t) => t.text).join(''), '{"code": "AAR"}');
});

test('recognizes numbers, booleans and null', () => {
    const tokens = tokenizeJson('{"n": 42, "b": true, "x": null}');
    const typed = tokens.filter((t) => ['number', 'boolean', 'null'].includes(t.type));
    assert.deepEqual(typed.map((t) => t.type), ['number', 'boolean', 'null']);
    assert.deepEqual(typed.map((t) => t.text), ['42', 'true', 'null']);
});

test('round-trips: concatenated token text reproduces the input exactly', () => {
    const input = JSON.stringify({ dimensions: [{ code: 'AAR', filter: 'all', values: ['*'] }], response: { format: 'json-stat2' } }, null, 2);
    const tokens = tokenizeJson(input);
    assert.equal(tokens.map((t) => t.text).join(''), input);
});
