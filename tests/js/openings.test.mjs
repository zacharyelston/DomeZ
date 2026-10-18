import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, REFERENCE } from './load.mjs';

const { faceOpening } = DomeZ.openings;
const { buildModel } = DomeZ.model;

const L = buildModel(design(REFERENCE)).lumber;

test('the opening between the boards is smaller than the triangle, and smaller again at the inner face', () => {
  for (const ft of L.faceTypes) {
    const o = faceOpening(ft.rep, L, 0);
    assert.equal(o.panel, null);
    assert.equal(o.letters.length, 3);
    for (let k = 0; k < 3; k++) {
      assert.ok(o.outer[k] < o.real[k]);
      assert.ok(o.inner[k] < o.outer[k]);
    }
    assert.ok(Math.abs(o.outerAngles.reduce((s, a) => s + a, 0) - 180) < 1e-9);
    assert.ok(Math.abs(o.realAngles.reduce((s, a) => s + a, 0) - 180) < 1e-9);
  }
});

test('a panel gap shrinks every side, and the opening scales with board thickness', () => {
  const o = faceOpening(L.faceTypes[0].rep, L, 0.01);
  for (let k = 0; k < 3; k++) assert.ok(o.panel[k] < o.outer[k] - 0.01);
  const thick = buildModel(design({ ...REFERENCE, beamT: 60 })).lumber;
  assert.ok(faceOpening(thick.faceTypes[0].rep, thick, 0).outer[0] < faceOpening(L.faceTypes[0].rep, L, 0).outer[0]);
});

test('the sides are labelled with the board types along them', () => {
  const labels = new Set(L.boardTypes.map((bt) => bt.label));
  for (const ft of L.faceTypes) for (const l of faceOpening(ft.rep, L, 0).letters) assert.ok(labels.has(l));
});
