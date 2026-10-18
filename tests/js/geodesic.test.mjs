import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, near } from './load.mjs';

const { METHODS, effectiveMethod, acidomeBase, acChords, pythonGeodesic, SYMMETRY_OPTIONS } = DomeZ.geodesic;
const { buildUnitFull, buildModel } = DomeZ.model;
const { edgesOf } = DomeZ.mesh;
const { len } = DomeZ.vec;

const full = (patch) => buildUnitFull(design({ partial: '1', ...patch }));

test('every method makes a closed geodesic sphere of the right size', () => {
  for (const method of Object.keys(METHODS)) for (const base of ['icosahedron', 'octahedron']) for (const freq of [1, 2, 3, 4]) {
    const m = full({ method, base, freq });
    const k = base === 'icosahedron' ? 10 : 4;
    assert.equal(m.pts.length, k * freq * freq + 2, `${method} ${base} ${freq}V hubs`);
    assert.equal(m.tris.length, 2 * k * freq * freq, `${method} ${base} ${freq}V faces`);
    const { edges, faceCount } = edgesOf(m.tris, m.pts.length);
    assert.equal(edges.length, 3 * k * freq * freq);
    assert.ok(faceCount.every((c) => c === 2), 'closed: every edge has two faces');
  }
});

test('hubs lie on the unit sphere (Mexican drifts slightly, as in Acidome)', () => {
  for (const method of ['flat', 'chords', 'arcs', 'kruschke']) {
    for (const p of full({ method, freq: 4 }).pts) assert.ok(near(len(p), 1, 1e-12), method);
  }
  for (const p of full({ method: 'mexican', freq: 4 }).pts) assert.ok(near(len(p), 1, 1e-3));
});

test('faces wind outward', () => {
  for (const method of ['flat', 'chords', 'arcs']) {
    const m = full({ method, freq: 3 });
    for (const [a, b, c] of m.tris) {
      const [A, B, C] = [m.pts[a], m.pts[b], m.pts[c]];
      const n = DomeZ.vec.cross(DomeZ.vec.sub(B, A), DomeZ.vec.sub(C, A));
      assert.ok(DomeZ.vec.dot(n, A) > 0, method);
    }
  }
});

test('flat grid 3V has the classic class I chord factors', () => {
  const M = buildModel(design({ method: 'flat', freq: 3, partial: '1', r: 1, frame: 'struts', tol: 0 }));
  assert.deepEqual(M.groups.map((g) => [+g.mean.toFixed(5), g.count]), [[0.34862, 60], [0.40355, 90], [0.41241, 120]]);
});

test('Kruschke pulls the pentagon spokes in, for 3V and 4V icosahedra only', () => {
  const K = buildModel(design({ method: 'kruschke', freq: 3, partial: '1', r: 1, frame: 'struts', tol: 0 }));
  assert.deepEqual(K.groups.map((g) => [+g.mean.toFixed(5), g.count]), [[0.32971, 60], [0.38229, 60], [0.42149, 120], [0.44106, 30]]);
  assert.equal(effectiveMethod({ method: 'kruschke', base: 'icosahedron', freq: 4 }), 'kruschke');
  assert.equal(effectiveMethod({ method: 'kruschke', base: 'icosahedron', freq: 5 }), 'chords');
  assert.equal(effectiveMethod({ method: 'kruschke', base: 'octahedron', freq: 3 }), 'chords');
  assert.equal(effectiveMethod({ method: 'arcs', base: 'octahedron', freq: 3 }), 'arcs');
});

test('Mexican evens out lengths on each grid line, leaving fewer strut types than Arcs', () => {
  const types = (method) => buildModel(design({ method, freq: 4, partial: '1', r: 1, frame: 'struts', tol: 0.001 })).groups.length;
  assert.ok(types('mexican') < types('arcs'));
});

test('orientations: Pentad puts a 5-way hub on top, Triad a face', () => {
  const top = (sym, freq) => {
    const m = full({ method: 'chords', sym, freq });
    const zMax = Math.max(...m.pts.map((p) => p[2]));
    return { m, top: m.pts.map((p, i) => i).filter((i) => near(m.pts[i][2], zMax, 1e-9)), zMax };
  };
  const p = top('pentad', 3);
  assert.equal(p.top.length, 1);
  assert.ok(near(p.zMax, 1));
  assert.equal(edgesOf(p.m.tris, p.m.pts.length).edges.filter(([a, b]) => a === p.top[0] || b === p.top[0]).length, 5);
  assert.equal(top('triad', 2).top.length, 3);
  assert.deepEqual(SYMMETRY_OPTIONS.map((o) => o.v), ['pentad', 'cross', 'triad']);
});

test('Acidome\'s base solids are unit, and the splits give the right hub counts', () => {
  const base = acidomeBase('icosahedron', 'pentad');
  for (const v of base.verts) assert.ok(near(len(v), 1, 1e-12));
  assert.equal(acChords(base, 2).pts.length, 42);
  assert.equal(pythonGeodesic('octahedron', 'pentad', 2).pts.length, 18);
});

test('acidome.com vectors on a unit sphere (the same ones tests/test_geodesics.py checks)', () => {
  const stats = (patch) => {
    const M = buildModel(design({ r: 1, frame: 'struts', tol: 0.001, ...patch }));    // types within 1e-6 m, as the Python test groups
    return { counts: [M.pts.length, M.edges.length, M.tris.length], types: M.groups.map((g) => [+g.mean.toFixed(6), g.count]), minZ: M.min[2] };
  };
  const chords3 = stats({ method: 'chords', freq: 3, partial: '1' });
  assert.deepEqual(chords3.counts, [92, 270, 180]);
  assert.deepEqual(chords3.types, [[0.348615, 60], [0.403548, 90], [0.412411, 120]]);
  const kruschke = stats({ method: 'kruschke', freq: 3, partial: '7/12' });
  assert.deepEqual(kruschke.counts, [61, 165, 105]);
  assert.deepEqual(kruschke.types, [[0.329706, 30], [0.38229, 35], [0.421489, 80], [0.441056, 20]]);
  const mexican = stats({ method: 'mexican', freq: 4, partial: '1' });
  assert.deepEqual(mexican.counts, [162, 480, 320]);
  assert.deepEqual(mexican.types, [[0.27591, 120], [0.298308, 180], [0.313232, 120], [0.321251, 60]]);
  const chords4 = stats({ method: 'chords', freq: 4, partial: '5/8', flat: true });
  assert.deepEqual(chords4.counts, [111, 310, 200]);
  assert.equal(chords4.types.length, 10);
  assert.ok(near(chords4.minZ, -0.251148, 5e-7));
  assert.deepEqual(stats({ method: 'chords', freq: 4, partial: '1/2', base: 'octahedron' }).counts, [41, 104, 64]);
  const arcs = stats({ method: 'arcs', freq: 5, partial: '3/4', flat: true });
  assert.deepEqual(arcs.counts, [201, 575, 375]);
  assert.equal(arcs.types.length, 14);
  assert.ok(near(arcs.minZ, -0.447214, 5e-7));
});
