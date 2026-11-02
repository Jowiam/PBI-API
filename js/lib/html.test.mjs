import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHtmlToTree, parseHTML } from './html.mjs';

test('parser nøstet HTML til et treeobjekt', () => {
    const tree = parseHtmlToTree('<p>Hei <strong>verden</strong></p>');
    assert.equal(tree.length, 1);
    assert.equal(tree[0].tag, 'p');
    assert.equal(tree[0].children[0], 'Hei ');
    assert.equal(tree[0].children[1].tag, 'strong');
    assert.equal(tree[0].children[1].children[0], 'verden');
});

test('rå tekst uten tagger gir én tekst-node', () => {
    assert.deepEqual(parseHtmlToTree('bare tekst'), ['bare tekst']);
});

test('parseHTML bruker injisert h-funksjon (ingen React nødvendig)', () => {
    const calls = [];
    const stubH = (tag, props, children) => {
        calls.push(tag);
        return { tag, props, children };
    };
    const result = parseHTML('<p><strong>Bold</strong></p>', stubH);
    assert.deepEqual(calls, ['strong', 'p']);
    assert.equal(result[0].tag, 'p');
});
