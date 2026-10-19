import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, near } from './load.mjs';

const { revolutionProfile, traceLath, lathPath, buildGridshell, surfaceOf, traceGeodesic, crossingsOf, spliceRuns, lathPoints } = DomeZ.gridshell;
const { dot, sub, len, cross, norm, add, mul } = DomeZ.vec;

const EGG = { frame: 'gridshell', shape: 'egg', method: 'chords', partial: '3/4' };
const LONG = { frame: 'gridshell', shape: 'ellipsoid', rx: 3, ry: 6, rz: 3, method: 'flat', partial: '1/2' };

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

test('a base is needed; other plans go over the top, round ones may', () => {
  assert.equal(revolutionProfile(design({ shape: 'ellipsoid', rx: 3, ry: 2 })), null);
  assert.equal(buildGridshell(design({ frame: 'gridshell', partial: '1/1' })).ok, false);
  assert.equal(buildGridshell(design({ ...LONG, partial: '1/1' })).ok, false);
  const long = buildGridshell(design({ ...LONG, lathLayout: 'crown' }));
  assert.ok(long.ok && long.layout === 'over' && !long.round, 'a long plan always goes over the top');
  assert.equal(buildGridshell(design({ frame: 'gridshell', shape: 'ellipsoid', rx: 3, ry: 3 })).layout, 'crown');
  assert.equal(buildGridshell(design({ frame: 'gridshell', lathLayout: 'over' })).layout, 'over');
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
  assert.match(html, /<h3>Joints<\/h3>/);
  const rows = DomeZ.sheets.cutSheetRows(M, s, 'https://example.test/');
  const head = rows.findIndex((r) => r[0] === 'Crossing');
  assert.deepEqual(rows[head + 1].slice(0, 2), ['base', 0]);
  assert.equal(rows.filter((r, k) => k > head && r.length === 5).length, G.nodes.length);
  assert.equal(rows.filter((r) => /^Ply \d$/.test(r[0])).length, G.bend.plies);
  const bad = design({ ...EGG, partial: '1/1' });
  assert.match(DomeZ.sheets.cutSheetHTML(DomeZ.model.buildModel(bad), bad, ''), /needs a base/);
});

/* ---- any shape: the general tracer and the over-the-top layout ---- */

test('the surface tracer reproduces the round-shape lath', () => {
  for (const p of [design(EGG), design({ frame: 'gridshell', shape: 'ellipsoid', rx: 3, ry: 3, rz: 4.5 })]) {
    const G = buildGridshell(p), Q = G.lath.samples, A = lathPath(G, 'A', 0), prof = G.prof, q0 = Q[0];
    const r1 = (prof.rho(q0.t + 1e-6) - prof.rho(q0.t - 1e-6)) / 2e-6;
    const t = traceGeodesic(surfaceOf(p), A[0].p, [r1 * q0.tp, q0.rho * q0.thp, q0.tp], 0.01, G.length).samples;
    for (let k = 0; k < Q.length - 1; k += 7) {
      assert.ok(len(sub(t[k].p, A[k].p)) < 1e-6, `same point at ${t[k].s.toFixed(2)} m`);
      assert.ok(near(t[k].kn, Q[k].kn, 1e-6) && near(t[k].tg, Q[k].tg, 1e-6), 'same bend and twist');
    }
  }
});

test('on any ellipsoid a traced lath stays on the skin and bends only out of it', () => {
  const p = design({ shape: 'ellipsoid', rx: 3, ry: 6, rz: 4 }), S = surfaceOf(p);
  const P = traceGeodesic(S, [3, 0, 0], norm([0, 1, 1]), 0.01, 12).samples;
  for (let k = 1; k < P.length - 1; k += 37) {
    const x = P[k].p;
    assert.ok(Math.abs((x[0] / 3) ** 2 + (x[1] / 6) ** 2 + (x[2] / 4) ** 2 - 1) < 1e-9, 'on the ellipsoid');
    const acc = mul(add(sub(P[k + 1].p, mul(x, 2)), P[k - 1].p), 1e4);
    assert.ok(Math.abs(dot(acc, P[k].w)) < 1e-3 * len(acc) + 1e-6, `no sideways curvature at ${k}`);
    assert.ok(near(Math.abs(dot(acc, P[k].n)), Math.abs(P[k].kn), 1e-3), 'curvature along the normal is kn');
  }
});

test('over the top on a long ellipsoid: laths land on the base or on their own family, and never cross it', () => {
  const G = buildGridshell(design(LONG));
  assert.ok(G.ok && G.layout === 'over');
  assert.equal(G.laths.length, 2 * G.N);
  const byName = (f, i) => G.laths.find((l) => l.family === f && l.i === i);
  for (const l of G.laths) {
    const ends = [[l.startOn, l.samples[0].p], [l.endOn, l.samples[l.samples.length - 1].p]];
    for (const [on, q] of ends) {
      if (!on) { assert.ok(Math.abs(q[2] - G.tBase) < 1e-6, `${l.family}${l.i + 1} lands on the base`); continue; }
      assert.equal(on.family, l.family);
      const o = byName(on.family, on.i), at = o.samples.reduce((a, b) => (Math.abs(b.s - on.s) < Math.abs(a.s - on.s) ? b : a));
      assert.ok(len(sub(at.p, q)) < G.h, `${l.family}${l.i + 1} stops on ${on.family}${on.i + 1}`);
    }
    const r = l.samples.reduce((a, b) => (Math.abs(b.s - l.ridgeS) < Math.abs(a.s - l.ridgeS) ? b : a));
    assert.ok(Math.abs(r.p[0]) < 1e-6, 'crosses the ridge in the plane x = 0');
  }
  for (const f of ['A', 'B']) {
    const F = G.laths.filter((l) => l.family === f), atEnd = (l, s) => s < 3 * G.h || s > l.length - 3 * G.h;
    assert.equal(crossingsOf(F, F, G.h, true).filter((c) => !atEnd(F[c.a], c.sa) && !atEnd(F[c.b], c.sb)).length, 0, `no ${f} crosses another ${f}`);
  }
  assert.ok(G.trimmed > 0, 'the laths near the ends converge');
});

test('over the top: each crossing lies on both laths, and B laths mirror A laths', () => {
  const G = buildGridshell(design(LONG));
  const pathOf = (l) => l.samples.map((q) => q.p);
  const nearest = (pts, q) => Math.min(...pts.map((p) => len(sub(p, q))));
  let total = 0;
  for (const l of G.laths.filter((x) => x.family === 'A')) for (const c of l.crossings) {
    assert.equal(c.with.family, 'B');
    assert.ok(nearest(pathOf(l), c.p) < G.h && nearest(pathOf(c.with), c.p) < G.h);
    assert.ok(c.with.crossings.some((x) => x.with === l && len(sub(x.p, c.p)) < 1e-12));
    total++;
  }
  assert.equal(total, G.crossings);
  for (let i = 0; i < G.N; i++) {
    const a = G.laths[i], b = G.laths[G.N + i];
    assert.ok(near(a.length, b.length, 1e-6));
    const m = b.samples[b.samples.length - 1 - 10].p;
    assert.ok(nearest(pathOf(a), [-m[0], m[1], m[2]]) < G.h, `B${i + 1} is A${i + 1} mirrored`);
  }
});

test('lath types: every member matches its template from one end or the other', () => {
  const G = buildGridshell(design(LONG));
  assert.equal(G.types.length, G.N / 2, 'A, its 180° turn and their two mirror images share one type');
  for (const t of G.types) for (const l of t.members) {
    const marks = l.crossings.map((c) => (l.reversed ? l.length - c.s : c.s)).sort((x, y) => x - y);
    assert.ok(near(l.length, t.length, 0.001) && marks.length === t.marks.length);
    marks.forEach((x, k) => assert.ok(near(x, t.marks[k], 0.001), `${l.family}${l.i + 1} mark ${k + 1}`));
  }
});

test('splicing: pieces fit the stock, joints are staggered and clear of the bolts', () => {
  const marks = [0.5, 1.2, 2.43, 2.45, 3.0, 4.9, 6.1];
  for (const plies of [1, 2, 3]) {
    const runs = spliceRuns(8.5, marks, 2.438, plies, 0.1, 0.6);
    assert.equal(runs.length, plies);
    for (const r of runs) {
      assert.ok(near(r.pieces.reduce((a, b) => a + b, 0), 8.5, 1e-9));
      assert.ok(r.pieces.every((x) => x <= 2.438 + 1e-9 && x >= 0.6 - 1e-9));
      for (const j of r.joints) assert.ok(marks.every((m) => Math.abs(m - j) >= 0.1 - 1e-9), `joint ${j} clear of the bolts`);
    }
    if (plies > 1) for (const a of runs[0].joints) for (const b of runs[1].joints) assert.ok(Math.abs(a - b) > 0.5);
  }
  const G = buildGridshell(design({ ...LONG, lathW: 38, lathT: 6.35, lathPlies: 3 })), st = G.stock;
  assert.ok(st.lengths * st.stock >= st.timber && st.waste >= 0);
  assert.equal(st.joins, G.types.reduce((n, t) => n + t.joins * t.members.length, 0));
  assert.equal(st.pieces, st.joins + G.laths.length * 3);
  assert.ok(near(st.cost, st.lengths * 2.5, 1e-9));
  const one = buildGridshell(design({ ...EGG, lathStock: 100000 }));
  assert.equal(one.stock.joins, 0, 'no joints when the stock is longer than the laths');
});

test('the 3D view has a path for every lath, with distances along it', () => {
  for (const G of [buildGridshell(design(EGG)), buildGridshell(design(LONG))]) {
    G.laths.forEach((l, k) => {
      const pts = lathPoints(G, k);
      assert.ok(near(pts[pts.length - 1].s, l.length, 1e-9) && pts[0].s === 0);
    });
    assert.equal(G.joints.length, G.layout === 'crown' ? G.N * G.nodes.length : G.crossings);
  }
});

test('the over-the-top sheet lists every type and every lath, and the CSV matches', () => {
  const s = design(LONG), M = DomeZ.model.buildModel(s), G = M.gridshell;
  const html = DomeZ.sheets.cutSheetHTML(M, s, 'https://example.test/');
  for (const t of G.types) assert.ok(html.includes(`<h3>${t.label} · ${Math.round(t.length * 1000)} mm`));
  for (const l of G.laths) assert.ok(html.includes(`<td>${l.family}${l.i + 1}</td>`));
  assert.ok(html.includes('stop on a lath of their own family'));
  const rows = DomeZ.sheets.cutSheetRows(M, s, 'https://example.test/');
  assert.equal(rows.filter((r) => /^Type L\d+$/.test(r[0])).length, G.types.length);
  const head = rows.findIndex((r) => r[0] === 'Lath' && r[1] === 'Type');
  assert.equal(rows.length - head - 1, G.laths.length);
});

test('layout and stock settings parse and clamp', () => {
  const { parseState, stateQuery } = DomeZ.state;
  assert.equal(parseState('lathLayout=sideways').lathLayout, 'crown');
  assert.equal(parseState('lathLayout=over').lathLayout, 'over');
  assert.equal(parseState('lathStock=10').lathStock, 2438);
  assert.equal(parseState('lathPrice=-1').lathPrice, 2.5);
  assert.equal(parseState('lathPlies=0.2').lathPlies, 1);
  assert.equal(stateQuery(parseState('lathLayout=over&lathStock=1829')), 'lathLayout=over&lathStock=1829');
});
