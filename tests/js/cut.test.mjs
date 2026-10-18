import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, near } from './load.mjs';

const { parsePartial, fracText, acidomePartials, nearestAcidomePartial, effectivePartial, flattenBase } = DomeZ.cut;
const { buildModel, buildUnitFull } = DomeZ.model;
const { len } = DomeZ.vec;

test('parsePartial reads fractions and decimals', () => {
  assert.deepEqual(parsePartial('6/8'), { value: 0.75, p: 3, q: 4 });
  assert.deepEqual(parsePartial(' 7 / 12 '), { value: 7 / 12, p: 7, q: 12 });
  assert.equal(parsePartial('0.6').value, 0.6);
  assert.equal(parsePartial('3/2').value, 1);                   // capped at a full sphere
  assert.equal(parsePartial('0').value, 0.01);                  // and floored
  assert.equal(parsePartial('nonsense').value, 0.5);
  assert.equal(fracText('6/8'), '3/4');
  assert.equal(fracText('1'), '1/1');
  assert.equal(fracText('0.6000'), '0.6');
});

test('the fractions Acidome offers', () => {
  assert.deepEqual(acidomePartials('icosahedron', 1), ['1/4', '3/4', '1/1']);
  assert.deepEqual(acidomePartials('icosahedron', 3), ['1/4', '5/12', '7/12', '3/4', '1/1']);
  assert.deepEqual(acidomePartials('icosahedron', 4), ['1/4', '3/8', '1/2', '5/8', '3/4', '1/1']);
  assert.deepEqual(acidomePartials('octahedron', 2), ['1/8', '1/2', '7/8', '1/1']);
  assert.deepEqual(acidomePartials('octahedron', 3), ['1/18', '2/9', '1/2', '7/9', '17/18', '1/1']);
});

test('Acidome methods snap to its fractions; the flat grid takes any', () => {
  assert.equal(nearestAcidomePartial('icosahedron', 3, 0.6), '7/12');
  assert.equal(effectivePartial({ partial: '0.6', method: 'chords', base: 'icosahedron', freq: 3 }), '7/12');
  assert.equal(effectivePartial({ partial: '0.6', method: 'flat', base: 'icosahedron', freq: 3 }), '0.6');
  assert.equal(effectivePartial({ partial: '1', method: 'flat', base: 'icosahedron', freq: 3 }), '1/1');
});

test('cuts keep the faces Acidome keeps', () => {
  const faces = (patch) => buildModel(design({ method: 'chords', freq: 3, frame: 'struts', ...patch })).tris.length;
  assert.equal(faces({ partial: '3/4' }), 135);                 // Pentad: whole rows from the top (acidome.com: 135)
  assert.equal(faces({ partial: '1/1' }), 180);
  assert.equal(faces({ partial: '3/4', sym: 'cross' }), 140);   // Cross: faces whose centre is above the cut
  assert.equal(faces({ freq: 1, partial: '1/4' }), 5);
});

test('the flat grid keeps faces whose hubs are all above the cut height', () => {
  const m = buildUnitFull(design({ method: 'flat', freq: 4, partial: '0.6' }));
  const h = 1 - 2 * 0.6;
  m.tris.forEach((t, f) => assert.equal(m.keep[f], t.every((i) => m.pts[i][2] >= h - 1e-9)));
});

test('a flat base puts every rim hub on one level, still on the sphere', () => {
  for (const method of ['chords', 'flat']) {
    const M = buildModel(design({ method, freq: 4, partial: method === 'flat' ? '0.55' : '5/8', flat: true, r: 1, frame: 'struts' }));
    const rim = new Set();
    for (const [a, b] of M.edges) {
      const shared = M.tris.filter((t) => t.includes(a) && t.includes(b)).length;
      if (shared === 1) { rim.add(a); rim.add(b); }
    }
    const zs = [...rim].map((i) => M.pts[i][2]);
    assert.ok(Math.max(...zs) - Math.min(...zs) < 1e-9, method);
    for (const i of rim) assert.ok(near(len(M.pts[i]), 1, 1e-9));
  }
  // flattenBase leaves a full sphere alone
  const mesh = { pts: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], tris: [[0, 1, 2]] };
  flattenBase(mesh, [true], 2);
  assert.deepEqual(mesh.pts, [[0, 0, 1], [1, 0, 0], [0, 1, 0]]);
});
