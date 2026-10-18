import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, REFERENCE, near } from './load.mjs';

const { buildUnitFull, buildUnitGeodesic, buildModel } = DomeZ.model;
const { len } = DomeZ.vec;

test('the full mesh carries the cut as keep flags, and the dome is its kept part', () => {
  const p = design(REFERENCE);
  const full = buildUnitFull(p), unitDome = buildUnitGeodesic(p);
  assert.equal(full.keep.length, full.tris.length);
  assert.equal(full.keep.filter(Boolean).length, unitDome.tris.length);
  assert.equal(full.lineOrder.length, full.tris.length * 3 / 2);    // every edge of the closed sphere once
  const M = buildModel(p);
  assert.equal(M.tris.length, unitDome.tris.length);
  M.pts.forEach((q, i) => assert.ok(near(len(q), 3 * len(unitDome.pts[i]), 1e-12)));
});

test('area and volume approach the sphere\'s as the frequency grows', () => {
  const sphere = (freq) => buildModel(design({ method: 'chords', freq, partial: '1', r: 1, frame: 'struts' }));
  const coarse = sphere(2), fine = sphere(8);
  assert.ok(fine.area > coarse.area && fine.area < 4 * Math.PI);
  assert.ok(near(fine.area / (4 * Math.PI), 1, 0.015));          // within 1.5% at 8V
  assert.ok(near(fine.volume / (4 / 3 * Math.PI), 1, 0.015));
  assert.ok(near(fine.totalLength, fine.lengths.reduce((s, l) => s + l, 0), 1e-9));
});

test('the model is z-up with its bounds', () => {
  const M = buildModel(design({ ...REFERENCE, partial: '1/1' }));
  assert.ok(near(M.max[2], 3, 1e-12) && near(M.min[2], -3, 1e-12));
});
