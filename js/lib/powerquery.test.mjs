import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePowerQueryCode } from './powerquery.mjs';

test('returnerer tom streng uten finalQuery', () => {
    assert.equal(generatePowerQueryCode(null, 'https://api', 'src', 'tbl'), '');
});

test('genererer gyldig Power Query M-kode med riktig URL', () => {
    const code = generatePowerQueryCode({ dimensions: [] }, 'https://api', 'src1', 'tbl1');
    assert.match(code, /url="https:\/\/api\/src1\/Table\/tbl1\/data"/);
    assert.match(code, /WebCall = Web\.Contents\(url,/);
});
