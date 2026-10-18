import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, REFERENCE, near } from './load.mjs';

const { buildModel } = DomeZ.model;
const { unitsOnTwoPlanes, largestChain, acidomeNumbering, boardQuads } = DomeZ.lumber;
const { dot, sub, len, add, mul, cross } = DomeZ.vec;

const ref = buildModel(design(REFERENCE));
const L = ref.lumber;

test('the reference dome types its boards, hubs and faces as acidome.com does', () => {
  assert.deepEqual(L.boardTypes.map((bt) => [bt.label, bt.members.length]), [['A', 90], ['B', 50], ['C', 45], ['D', 25]]);
  assert.equal(L.boards.length, ref.edges.length);              // one board per strut: 210
  assert.equal(L.boards.length, 210);
  assert.equal(L.hubTypes.reduce((s, h) => s + h.hubs.length, 0), ref.pts.length);
  assert.equal(L.faceTypes.reduce((s, f) => s + f.faces.length, 0), ref.tris.length);
});

test('struts only builds no lumber', () => {
  assert.equal(buildModel(design({ ...REFERENCE, frame: 'struts' })).lumber, null);
});

test('each board\'s mid-plane passes through the centre, its hubs T/2 to either side', () => {
  for (const bd of L.boards) {
    const A = L.P[bd.a], B = L.P[bd.b];
    assert.ok(near(len(bd.n), 1, 1e-12));
    assert.ok(near(dot(bd.n, A), L.sigma * L.t / 2, 1e-12) && near(dot(bd.n, B), -L.sigma * L.t / 2, 1e-12));
  }
});

test('board ends: outer corners on the sphere through the hub, cut on the next board\'s side', () => {
  for (const bd of L.boards) for (const tl of bd.tails) {
    assert.ok(near(len(tl.outer), len(L.P[tl.hub]), 1e-9));
    assert.ok(near(dot(tl.nW, tl.outer), L.t / 2, 1e-9) || near(dot(tl.nW, tl.outer), -L.t / 2, 1e-9));
    assert.ok(near(dot(bd.n, tl.walker), L.t / 2, 1e-12));
    // the inner corner sits one board width in from the outer one, measured square to the outer face
    assert.ok(len(sub(tl.inner, tl.outer)) >= L.w - 1e-9);
  }
});

test('boards run from their lower-numbered hub point, as Acidome draws them', () => {
  for (const bd of L.boards) assert.ok(bd.a < bd.b);
});

test('a type is drawn from an inner board when it has one', () => {
  const egg = buildModel(design({ shape: 'egg', freq: 4, method: 'chords', partial: '3/4' })).lumber;
  for (const bt of egg.boardTypes) if (bt.members.some((bd) => !bd.selvage)) assert.equal(bt.rep.selvage, false, bt.label);
});

test('anticlockwise Joint mirrors the lengths', () => {
  const ccw = buildModel(design({ ...REFERENCE, frame: 'joint-ccw' })).lumber;
  assert.deepEqual(ccw.boardTypes.map((bt) => [bt.members.length, Math.round(bt.rep.maxL * 1000)]),
                   L.boardTypes.map((bt) => [bt.members.length, Math.round(bt.rep.maxL * 1000)]));
});

test('a board solid has eight corners and six outward faces', () => {
  for (const bd of L.boards.slice(0, 20)) {
    const quads = boardQuads(bd);
    assert.equal(quads.length, 6);
    const corners = new Set(quads.flatMap(([q]) => q.map((p) => p.map((c) => c.toFixed(9)).join())));
    assert.equal(corners.size, 8);
    const centre = mul(quads.flatMap(([q]) => q).reduce((s, p) => add(s, p), [0, 0, 0]), 1 / 24);
    for (const [q] of quads) {
      const n = cross(sub(q[1], q[0]), sub(q[2], q[0]));
      assert.ok(dot(n, sub(q[0], centre)) > 0);
    }
  }
});

test('helpers: two planes on the unit sphere, Acidome\'s chain and numbering', () => {
  const [x1, x2] = unitsOnTwoPlanes([1, 0, 0], 0.5, [0, 1, 0], 0.5);
  for (const x of [x1, x2]) { assert.ok(near(len(x), 1, 1e-12)); assert.ok(near(x[0], 0.5) && near(x[1], 0.5)); }
  // values within the tolerance count as equal, so the next value decides
  assert.deepEqual(largestChain([[['R', 1], ['A', 2]], [['R', 1], ['A', 3]], [['R', 1 - 1e-9], ['A', 9]]], 1e-6), [['R', 1 - 1e-9], ['A', 9]]);
  assert.deepEqual(largestChain([[['R', 1], ['A', 2]], [['R', 0.9], ['A', 9]]], 1e-6), [['R', 1], ['A', 2]]);
  const order = acidomeNumbering(new Map([['k1', [1, 2]], ['k2', [3, 4, 5]], ['k3', [6, 7]]]), (x) => x).map(([k]) => k);
  assert.deepEqual(order, ['k2', 'k3', 'k1']);                    // most first, then longer first
});
