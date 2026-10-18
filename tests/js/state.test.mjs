import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design } from './load.mjs';

const { DEFAULTS, FRAMES, parseState, stateQuery } = DomeZ.state;

test('an empty query is the defaults', () => {
  assert.deepEqual(parseState(''), DEFAULTS);
  assert.equal(stateQuery(DEFAULTS), '');
});

test('values are read with their types', () => {
  const s = parseState('r=3&flat=1&objLines=0&partial=3%2F4&shape=egg&eggW=0.12');
  assert.equal(s.r, 3);
  assert.equal(s.flat, true);
  assert.equal(s.objLines, false);
  assert.equal(s.partial, '3/4');
  assert.equal(s.shape, 'egg');
  assert.equal(s.eggW, 0.12);
});

test('bad values fall back to the defaults or are clamped', () => {
  const s = parseState('freq=99&method=nope&base=dodecahedron&sym=x&frame=x&beamW=-1&beamT=0&gap=-3&r=abc&unknown=1');
  assert.equal(s.freq, 12);
  assert.equal(parseState('freq=0').freq, 1);
  assert.equal(parseState('freq=3.6').freq, 4);
  assert.equal(s.method, DEFAULTS.method);
  assert.equal(s.base, 'icosahedron');
  assert.equal(s.sym, DEFAULTS.sym);
  assert.equal(s.frame, DEFAULTS.frame);
  assert.equal(s.beamW, DEFAULTS.beamW);
  assert.equal(s.beamT, DEFAULTS.beamT);
  assert.equal(s.gap, 0);
  assert.equal(s.r, DEFAULTS.r);
  assert.ok(!('unknown' in s));
});

test('the query keeps only changed values, in a fixed order, and round-trips', () => {
  const s = design({ r: 3, flat: true, partial: '3/4', shape: 'ellipsoid', frame: 'joint-ccw' });
  assert.equal(stateQuery(s), 'shape=ellipsoid&r=3&partial=3%2F4&flat=1&frame=joint-ccw');
  assert.deepEqual(parseState(stateQuery(s)), s);
  assert.ok(Object.keys(FRAMES).includes(DEFAULTS.frame));
});
