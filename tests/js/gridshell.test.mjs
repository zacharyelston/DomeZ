import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, near } from './load.mjs';

const { revolutionProfile, traceLath, lathPath, buildGridshell } = DomeZ.gridshell;
const { dot, sub, len, cross, norm, add, mul } = DomeZ.vec;

const EGG = { frame: 'gridshell', shape: 'egg', method: 'chords', partial: '3/4' };

test('on a sphere every lath is a great circle', () => {
  const r = 2.2, psi = 30 / 180 * Math.PI;
  const G = buildGridshell(design({ frame: 'gridshell', r, method: 'flat', partial: '0.5', lathAngle: 30 }));
  assert.ok(G.ok);
  assert.ok(near(G.tBase, 0, 1e-12));                                    // a hemisphere stands on the equator
  assert.ok(near(G.length, Math.PI * r / 2, 1e-4), 'a quarter of a great circle');
  assert.ok(near(G.tCrown, r * Math.cos(psi), 1e-4) && near(G.c, r * Math.sin(psi), 1e-9));
  assert.ok(near(G.crownTurn, Math.PI / 2, 1e-4), 'it turns 90° around the axis');
  for (const q of G.lath.samples) {
    assert.ok(near(Math.abs(q.kn), 1 / r, 1e-6), 'bends at the sphere’s radius');
    assert.ok(Math.abs(q.tg) < 1e-6, 'and never twists');
  }
  const path = lathPath(G, 'A', 3).map((x) => x.p);
  const plane = norm(cross(path[0], path[path.length - 1]));
  for (const p of path) {
    assert.ok(near(len(p), r, 1e-6), 'on the sphere');
    assert.ok(Math.abs(dot(p, plane)) < 1e-6, 'in a plane through the centre');
  }
});

test('on an egg the lath is a geodesic: no sideways curvature in the skin, unit speed', () => {
  const G = buildGridshell(design(EGG));
  const S = G.lath.samples, prof = G.prof;
  for (const q of S) {
    const dr = (prof.rho(q.t + 1e-6) - prof.rho(q.t - 1e-6)) / 2e-6;
    assert.ok(near((1 + dr * dr) * q.tp * q.tp + q.rho * q.rho * q.thp * q.thp, 1, 1e-6), 'unit speed');
  }
  // the curve's acceleration has no component in the tangent plane (zero geodesic curvature)
  const path = lathPath(G, 'A', 0);
  for (let k = 5; k < path.length - 5; k += 25) {
    const h = S[k + 1].s - S[k].s;
    const acc = mul(add(sub(path[k + 1].p, mul(path[k].p, 2)), path[k - 1].p), 1 / (h * h));
    const sideways = Math.abs(dot(acc, path[k].w));
    assert.ok(sideways < 1e-3 * len(acc) + 1e-6, `geodesic curvature at sample ${k}`);
  }
});

test('the crossings found from the azimuth rule lie on the mirror laths', () => {
  const G = buildGridshell(design(EGG));
  const A0 = lathPath(G, 'A', 0).map((x) => x.p);
  const nearest = (pts, q) => Math.min(...pts.map((p) => len(sub(p, q))));
  const S = G.lath.samples;
  for (const node of G.nodes) {
    const j = node.k % G.N, Bj = lathPath(G, 'B', j).map((x) => x.p);
    // the node on A0, by its length along the lath
    let m = 1; while (m < S.length - 1 && S[m].s < node.s) m++;
    const f = (node.s - S[m - 1].s) / (S[m].s - S[m - 1].s), onA = add(A0[m - 1], mul(sub(A0[m], A0[m - 1]), f));
    assert.ok(nearest(Bj, onA) < 0.006, `node ${node.k} is on B${j} (${nearest(Bj, onA)} m)`);
  }
  assert.equal(G.crossings, G.N * (G.nodes.length - 1));
  assert.equal(G.nodes[0].s, 0);
  for (let k = 1; k < G.nodes.length; k++) assert.ok(G.nodes[k].s > G.nodes[k - 1].s);
});

test('the bend check: stress grows with ply thickness, and the thickest safe ply sits at the limit', () => {
  const thin = buildGridshell(design({ ...EGG, lathT: 6 })), thick = buildGridshell(design({ ...EGG, lathT: 12 }));
  assert.ok(near(thick.bend.maxStress, 2 * thin.bend.maxStress, 1e-9));
  const atLimit = buildGridshell(design({ ...EGG, lathT: thick.bend.maxPly }));
  assert.ok(near(atLimit.bend.ratio, 1, 1e-9));
  assert.ok(near(thick.bend.minRadius, 1 / Math.max(...thick.lath.samples.map((q) => Math.abs(q.kn))), 1e-12));
});

test('laths lie flat: the width runs across the lath, in the skin', () => {
  const G = buildGridshell(design(EGG));
  for (const family of ['A', 'B']) for (const x of lathPath(G, family, 2).filter((_, k) => k % 40 === 0)) {
    assert.ok(near(len(x.w), 1, 1e-9) && Math.abs(dot(x.w, x.n)) < 1e-9);
  }
  const outer = lathPath(G, 'A', 0, 0.01)[0].p, onSkin = lathPath(G, 'A', 0)[0].p;
  assert.ok(near(len(sub(outer, onSkin)), 0.01, 1e-9));
});

test('round plans only, and a base ring is needed', () => {
  assert.equal(revolutionProfile(design({ shape: 'ellipsoid', rx: 3, ry: 2 })), null);
  assert.equal(buildGridshell(design({ frame: 'gridshell', shape: 'ellipsoid', rx: 3, ry: 2 })).ok, false);
  assert.equal(buildGridshell(design({ frame: 'gridshell', partial: '1/1' })).ok, false);
  assert.equal(buildGridshell(design({ frame: 'gridshell', shape: 'ellipsoid', rx: 3, ry: 3 })).ok, true);
  assert.ok(traceLath(revolutionProfile(design()), 0, 0.5).samples.length > 10);
});

test('the model carries the gridshell and no lumber', () => {
  const M = DomeZ.model.buildModel(design(EGG));
  assert.equal(M.lumber, null);
  assert.ok(M.gridshell.ok);
  assert.equal(DomeZ.model.buildModel(design({ ...EGG, frame: 'joint' })).gridshell, null);
});

test('the gridshell sheet lists every crossing, and the CSV matches', () => {
  const s = design(EGG), M = DomeZ.model.buildModel(s), G = M.gridshell;
  const html = DomeZ.sheets.cutSheetHTML(M, s, 'https://example.test/');
  assert.match(html, /<h1>Gridshell · /);
  assert.equal((html.match(/<tr>\s*<td class="big">/g) || []).length, G.nodes.length);
  assert.ok(html.includes(`${Math.round(G.length * 1000)} mm`));
  const rows = DomeZ.sheets.cutSheetRows(M, s, 'https://example.test/');
  const head = rows.findIndex((r) => r[0] === 'Crossing');
  assert.deepEqual(rows[head + 1].slice(0, 2), ['base', 0]);
  assert.equal(rows.filter((r, k) => k > head && r.length === 5).length, G.nodes.length);
  const bad = design({ ...EGG, shape: 'ellipsoid', rx: 3, ry: 2 });
  assert.match(DomeZ.sheets.cutSheetHTML(DomeZ.model.buildModel(bad), bad, ''), /round plan/);
});
