import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { near } from './load.mjs';

const { add, sub, mul, dot, cross, len, norm, unit, comp, angleBetween, rotX, rotY, rotZ, solve3, PHI, R2D } = DomeZ.vec;

test('basic arithmetic', () => {
  assert.deepEqual(add([1, 2, 3], [4, 5, 6]), [5, 7, 9]);
  assert.deepEqual(sub([4, 5, 6], [1, 2, 3]), [3, 3, 3]);
  assert.deepEqual(mul([1, -2, 3], 2), [2, -4, 6]);
  assert.equal(dot([1, 2, 3], [4, 5, 6]), 32);
  assert.deepEqual(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  assert.equal(len([3, 4, 12]), 13);
});

test('normalising', () => {
  assert.ok(near(len(norm([3, -4, 12])), 1));
  assert.deepEqual(norm([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(unit([0, 0, 5]), [0, 0, 1]);
  assert.ok(near(comp([3, 4, 0], [0, 10, 0]), 4));
});

test('angles clamp rounding past ±1', () => {
  assert.ok(near(angleBetween([1, 0, 0], [0, 2, 0]), Math.PI / 2));
  assert.equal(angleBetween([1, 1e-17, 0], [1, 0, 0]), 0);
  assert.ok(near(angleBetween([1, 0, 0], [-1, 0, 0]), Math.PI));
});

test('rotations are right-handed', () => {
  const q = Math.PI / 2;
  const close = (a, b) => a.every((x, i) => near(x, b[i], 1e-12));
  assert.ok(close(rotX([0, 1, 0], q), [0, 0, 1]));
  assert.ok(close(rotY([0, 0, 1], q), [1, 0, 0]));
  assert.ok(close(rotZ([1, 0, 0], q), [0, 1, 0]));
});

test('three planes meet at one point', () => {
  const p = solve3([1, 0, 0], 2, [0, 1, 0], -3, [1, 1, 1], 4);
  assert.ok(near(p[0], 2) && near(p[1], -3) && near(p[2], 5));
});

test('constants', () => {
  assert.ok(near(PHI * PHI, PHI + 1));
  assert.ok(near(R2D * Math.PI, 180));
});
