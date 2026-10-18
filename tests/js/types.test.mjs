import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design } from './load.mjs';

const { typeLabel, groupStruts, numberByCount } = DomeZ.types;
const { buildModel } = DomeZ.model;

test('type letters run A–Z, then AA', () => {
  assert.deepEqual([0, 1, 25, 26, 27, 51, 52, 701, 702].map(typeLabel), ['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA']);
});

test('struts group by length within a tolerance from the group\'s shortest', () => {
  const { groups, groupOf } = groupStruts([1.0, 1.0004, 1.0009, 1.0011, 2], 0.001);
  assert.deepEqual(groups.map((g) => [g.label, g.count]), [['A', 3], ['B', 1], ['C', 1]]);
  assert.deepEqual([...groupOf], [0, 0, 0, 1, 2]);
  assert.equal(groupStruts([1, 1 + 1e-12], 0).groups.length, 1);   // a hair's difference is no new type
});

test('numberByCount: most numerous first, then by key', () => {
  const keys = ['b', 'a', 'b', 'c', 'a', 'b', undefined];
  assert.deepEqual(numberByCount((i) => keys[i], keys.length).map((t) => [t.no, t.key, t.items.length]), [[1, 'b', 3], [2, 'a', 2], [3, 'c', 1]]);
});

test('hub and panel types on a full 2V sphere', () => {
  const M = buildModel(design({ method: 'chords', freq: 2, partial: '1', frame: 'struts', tol: 0.1 }));
  assert.deepEqual(M.hubTypes.map((t) => [t.count, t.seq.length, t.open]), [[30, 6, false], [12, 5, false]]);
  assert.deepEqual(M.hubTypes[1].seq, ['A', 'A', 'A', 'A', 'A']);
  assert.equal(M.panelTypes.reduce((s, t) => s + t.count, 0), 80);
  for (const t of M.panelTypes) assert.ok(Math.abs(t.angles.reduce((s, a) => s + a, 0) - 180) < 1e-9);
  assert.deepEqual(Object.entries(M.hubs), [['5', 12], ['6', 30]]);
});

test('hubs on a cut edge are open fans', () => {
  const M = buildModel(design({ method: 'chords', freq: 3, partial: '3/4', frame: 'struts' }));
  assert.ok(M.hubTypes.some((t) => t.open));
  for (const t of M.hubTypes) if (t.open) assert.ok(t.seq.length < 6);
  assert.equal(M.hubTypes.reduce((s, t) => s + t.count, 0), M.pts.length);
});
