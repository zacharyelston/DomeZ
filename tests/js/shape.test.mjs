import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, near } from './load.mjs';

const { shapeTransform } = DomeZ.shape;
const { buildModel } = DomeZ.model;

test('a sphere scales by its radius', () => {
  assert.deepEqual(shapeTransform(design({ r: 3 }))([0, 0.6, 0.8]), [0, 0.6 * 3, 0.8 * 3]);
});

test('an ellipsoid scales each axis', () => {
  assert.deepEqual(shapeTransform(design({ shape: 'ellipsoid', rx: 2, ry: 3, rz: 4 }))([1, 1, 1]), [2, 3, 4]);
});

test('the egg spans its length and breadth, widest toward the blunt end', () => {
  const p = design({ shape: 'egg', eggL: 6, eggB: 4, eggW: 0.1, eggTip: 'up' });
  const T = shapeTransform(p);
  assert.ok(near(T([0, 0, 1])[2], 3) && near(T([0, 0, -1])[2], -3));
  // widest point: scan the profile; with the tip up it sits below the middle
  let best = { z: 0, r: 0 };
  for (let z = -0.99; z < 0.99; z += 0.001) {
    const q = T([Math.sqrt(1 - z * z), 0, z]);
    if (q[0] > best.r) best = { z: q[2], r: q[0] };
  }
  assert.ok(best.z < 0, 'widest below the middle');
  assert.ok(near(best.r, 2, 0.05), 'about half the breadth');
  // tip down mirrors it
  const down = shapeTransform({ ...p, eggTip: 'down' });
  assert.ok(near(down([0.6, 0, 0.8])[0], T([0.6, 0, -0.8])[0]));
});

test('with no asymmetry the egg is an ellipsoid', () => {
  const egg = shapeTransform(design({ shape: 'egg', eggL: 6, eggB: 4, eggW: 0 }));
  const ell = shapeTransform(design({ shape: 'ellipsoid', rx: 2, ry: 2, rz: 3 }));
  for (const q of [[0.6, 0, 0.8], [0, 1, 0], [0.36, 0.48, -0.8]]) egg(q).forEach((v, k) => assert.ok(near(v, ell(q)[k], 1e-12)));
});

test('the model reports the shape\'s size', () => {
  const M = buildModel(design({ shape: 'ellipsoid', rx: 3, ry: 3, rz: 4.5, method: 'chords', partial: '1', frame: 'struts' }));
  assert.ok(near(M.max[2] - M.min[2], 9, 1e-9));
  assert.ok(M.volume > 0 && M.area > 0);
});
