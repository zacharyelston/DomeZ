import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ from './load.mjs';

const { lineOrderOf, compact, edgesOf, faceNeighbours } = DomeZ.mesh;

// a square pyramid without its base: four triangles around an apex
const pyramid = { pts: [[0, 0, 1], [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0], [9, 9, 9]], tris: [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1]] };

test('edgesOf lists each edge once and counts its faces', () => {
  const { edges, faceCount } = edgesOf(pyramid.tris, pyramid.pts.length);
  assert.equal(edges.length, 8);
  for (const [a, b] of edges) assert.ok(a < b);
  const spokes = edges.map((e, k) => [e, faceCount[k]]).filter(([e]) => e[0] === 0);
  assert.equal(spokes.length, 4);
  for (const [, c] of spokes) assert.equal(c, 2);                 // each spoke borders two faces
  assert.equal(faceCount.filter((c) => c === 1).length, 4);       // the open rim
});

test('compact drops unused points and keeps the order', () => {
  const m = compact(pyramid);
  assert.equal(m.pts.length, 5);
  assert.deepEqual(m.tris, pyramid.tris);
  const gappy = compact({ pts: [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3]], tris: [[3, 1, 0]] });
  assert.deepEqual(gappy.pts, [[0, 0, 0], [1, 1, 1], [3, 3, 3]]);
  assert.deepEqual(gappy.tris, [[2, 1, 0]]);
});

test('lineOrderOf follows the faces, in Acidome\'s two edge orders', () => {
  assert.deepEqual(lineOrderOf([[0, 1, 2], [0, 2, 3]], 'abc'), [[0, 1], [1, 2], [2, 0], [2, 3], [3, 0]]);
  assert.deepEqual(lineOrderOf([[0, 1, 2], [0, 2, 3]], 'bca'), [[1, 2], [2, 0], [0, 1], [2, 3], [3, 0]]);
});

test('faceNeighbours links faces sharing an edge', () => {
  const nb = faceNeighbours(pyramid.tris, pyramid.pts.length);
  assert.deepEqual(nb.map((n) => n.slice().sort()), [[1, 3], [0, 2], [1, 3], [0, 2]]);
});
