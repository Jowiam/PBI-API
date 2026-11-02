import test from 'node:test';
import assert from 'node:assert/strict';

test('node --test kjører moduler under js/', () => {
    assert.equal(1 + 1, 2);
});
