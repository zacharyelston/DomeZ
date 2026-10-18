import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ from './load.mjs';

const { esc, mmText, inchText, fmtM, fmtLen, degText, rangeText, csvText } = DomeZ.format;

test('inches to the nearest sixteenth, reduced', () => {
  assert.equal(inchText(0.0254), '1"');
  assert.equal(inchText(0.03175), '1 1/4"');
  assert.equal(inchText(1.2382), '48 3/4"');
  assert.equal(inchText(0.0016), '0 1/16"');
  assert.equal(inchText(0.0127), '0 1/2"');
});

test('lengths and angles', () => {
  assert.equal(mmText(1.2384), '1238');
  assert.equal(fmtM(2.2), '2.200 m');
  assert.equal(fmtM(12.345), '12.35 m');
  assert.equal(fmtLen(0.4123), '412.3 mm');
  assert.equal(fmtLen(1.23456), '1.2346 m');
  assert.equal(degText(28.44), '28.4°');
  assert.equal(rangeText([14.8, 28.7]), '14.8–28.7°');
  assert.equal(rangeText([36.21, 36.24]), '36.2°');
});

test('HTML escaping', () => {
  assert.equal(esc('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  assert.equal(esc(42), '42');
});

test('CSV: a byte-order mark, quoting only where needed', () => {
  assert.equal(csvText([['a', 1], ['b,c', 'say "hi"'], ['two\nlines']]), '﻿a,1\n"b,c","say ""hi"""\n"two\nlines"\n');
  assert.equal(csvText([[]]), '﻿\n');
});
