import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, near } from './load.mjs';

const { LATHJIG, buildLathJigs, crossingsOf, quadricBend, quadricTwist, slabFaces, slabPoints, jigPlanSVG, jigSectionSVG, lathJigSCAD } = DomeZ.lathjig;
const { buildGridshell } = DomeZ.gridshell;
const { buildModel } = DomeZ.model;
const { dot, cross, sub, len } = DomeZ.vec;

const SPHERE = { frame: 'gridshell', r: 2.2, method: 'flat', partial: '1/2', lathAngle: 30 };
const EGG = { frame: 'gridshell', shape: 'egg', method: 'chords', partial: '3/4' };
const LONG = { frame: 'gridshell', shape: 'ellipsoid', rx: 3, ry: 6, rz: 3, method: 'flat', partial: '1/2' };
const jigsOf = (p) => { const s = design(p), G = buildGridshell(s); return { s, G, J: buildLathJigs(G, s) }; };

test('on a sphere every jig is a cap of the sphere: one per ring, no twist, the laths at the ring’s angle', () => {
  const { G, J } = jigsOf(SPHERE), r = 2.2;
  assert.equal(J.jigs.length, G.nodes.length - 1);
  assert.equal(J.crossings, G.crossings);
  J.jigs.forEach((j, k) => {
    assert.deepEqual(j.rings, [k + 1]);
    assert.equal(j.count, G.N);
    assert.ok(near(j.L, 1 / r, 1e-3) && near(j.N, 1 / r, 1e-3) && Math.abs(j.M) < 1e-5, `${j.name} quadric ${j.L} ${j.M} ${j.N}`);
    assert.ok(near(j.RA, r, 1e-6) && near(j.RB, r, 1e-6));
    assert.ok(Math.abs(j.twistA) < 1e-6 && Math.abs(j.twistB) < 1e-6);
    assert.ok(j.worst < 5e-5, `${j.name} fits the sphere to a twentieth of a millimetre (${j.worst})`);
    const angle = G.nodes[k + 1].angle;                                  // the gridshell sheet's angle between the laths
    assert.ok(near(j.theta, Math.min(angle, 180 - angle), 5e-3), `${j.name} turn ${j.theta} vs ${angle}`);
    assert.ok(near(j.sagA, j.along * j.along / (2 * r), 1e-9) && near(j.sagA, j.sagB, 1e-12));
  });
  // the turn changes sense once, where the laths pass 90° to each other
  const signs = J.jigs.map((j) => Math.sign(j.phi));
  assert.equal(signs.filter((x, k) => k && x !== signs[k - 1]).length, 1);
  assert.ok(J.jigs.every((j) => j.reach >= LATHJIG.minReach && j.reach <= LATHJIG.maxReach));
  assert.ok(J.jigs[J.jigs.length - 1].reach > J.jigs[0].reach, 'the most oblique crossing needs the biggest block');
});

test('the jig frame: z the skin’s normal, x the bisector, lath A at +φ/2 and lath B at −φ/2, |φ| ≤ 90°', () => {
  for (const p of [EGG, LONG]) {
    const G = buildGridshell(design(p));
    for (const c of crossingsOf(G)) {
      assert.ok(near(dot(c.X, c.Y), 0, 1e-12) && near(dot(c.X, c.Z), 0, 1e-12) && near(dot(cross(c.X, c.Y), c.Z), 1, 1e-12));
      const al = c.phi / 2;
      assert.ok(near(dot(c.Ta, c.X), Math.cos(al), 1e-9) && near(dot(c.Ta, c.Y), Math.sin(al), 1e-9));
      assert.ok(near(dot(c.Tb, c.X), Math.cos(al), 1e-9) && near(dot(c.Tb, c.Y), -Math.sin(al), 1e-9));
      assert.ok(Math.abs(c.phi) <= Math.PI / 2 + 1e-12);
      assert.ok(len(sub(c.P, c.a.p)) < 1e-4 && len(sub(c.P, c.b.p)) < 1e-4, 'the origin is at the crossing');
      assert.ok(Math.abs(dot(c.Z, c.a.n) - 1) < 1e-6, 'z is the skin’s normal');
    }
  }
});

test('the fitted quadric carries each lath’s bend and twist from the spec, within a millimetre over the block', () => {
  for (const p of [EGG, { ...EGG, lathLayout: 'over' }, LONG]) {
    const { G, J } = jigsOf(p);
    assert.equal(J.crossings, G.crossings);
    for (const j of J.jigs) {
      const Q = { L: j.L, M: j.M, N: j.N }, al = j.phi / 180 * Math.PI / 2;
      assert.ok(near(quadricBend(Q, al), j.kA, 0.01 * j.kA + 1e-3), `${j.name} bend along A ${quadricBend(Q, al)} vs ${j.kA}`);
      assert.ok(near(quadricBend(Q, -al), j.kB, 0.01 * j.kB + 1e-3), `${j.name} bend along B ${quadricBend(Q, -al)} vs ${j.kB}`);
      assert.ok(near(quadricTwist(Q, al), j.tgA, 0.05 * Math.abs(j.tgA) + 2e-3), `${j.name} twist along A ${quadricTwist(Q, al)} vs ${j.tgA}`);
      assert.ok(near(quadricTwist(Q, -al), j.tgB, 0.05 * Math.abs(j.tgB) + 2e-3), `${j.name} twist along B ${quadricTwist(Q, -al)} vs ${j.tgB}`);
      assert.ok(j.worst < 1e-3, `${j.name} fits the skin within a millimetre (${j.worst})`);
      assert.ok(near(j.RA, 1 / j.kA, 1e-9) && near(j.sagA, j.kA * j.along * j.along / 2, 1e-12));
      assert.ok(near(j.strapRound, 2 * j.overlap.short + 4 * j.stack, 1e-12));
    }
    assert.ok(J.jigs.some((j) => Math.abs(j.twistA) > 0.2), 'off the sphere the laths twist');
  }
});

test('crossings sharing a jig agree within the grouping steps, and every crossing on every lath has one', () => {
  for (const p of [EGG, LONG]) {
    const { G, J } = jigsOf(p);
    let n = 0;
    for (const j of J.jigs) for (const c of j.members) {
      n += c.count;
      assert.ok(Math.abs(c.phi - j.rep.phi) * 180 / Math.PI <= LATHJIG.angleStep + 1e-9);
      assert.ok(Math.abs(c.kA - j.rep.kA) * c.reach * c.reach / 2 <= LATHJIG.sagStep + 1e-9);
      assert.ok(Math.abs(c.kB - j.rep.kB) * c.reach * c.reach / 2 <= LATHJIG.sagStep + 1e-9);
      assert.equal(c.jig, j);
    }
    assert.equal(n, G.crossings);
    G.laths.forEach((l, k) => assert.equal(J.byLath[k].length, l.crossings.length, `${l.family}${l.i + 1}`));
    for (const list of J.byLath) for (const name of list) assert.ok(J.jigs.some((j) => j.name === name));
    for (let k = 1; k < J.jigs.length; k++) assert.ok(J.jigs[k].rise[0] + J.jigs[k].rise[1] >= J.jigs[k - 1].rise[0] + J.jigs[k - 1].rise[1], 'jigs are listed from the base up');
  }
  // on the crown layout rings with the same turn and sag share a jig
  const egg = jigsOf(EGG);
  assert.ok(egg.J.jigs.length <= egg.G.nodes.length - 1 && egg.J.jigs.some((j) => j.rings.length > 1));
});

test('over the top, every jig has a mirror twin: the same turn with the laths’ bends and twists swapped', () => {
  const { J } = jigsOf(LONG);
  assert.ok(J.jigs.length > 12);
  for (const j of J.jigs) {
    // (within the grouping steps: a jig's values are those of one representative crossing)
    const twin = J.jigs.find((o) => near(o.phi, j.phi, LATHJIG.angleStep + 1e-9) && near(o.kA, j.kB, 0.1) && near(o.kB, j.kA, 0.1) && near(o.tgA, -j.tgB, 0.04) && near(o.tgB, -j.tgA, 0.04));
    assert.ok(twin, `${j.name} (${j.phi.toFixed(1)}°, R ${j.RA.toFixed(2)} / ${j.RB.toFixed(2)}) has a mirror image`);
  }
});

test('the OpenSCAD slab faces close a solid, wound clockwise seen from outside', () => {
  for (const n of [LATHJIG.grid, LATHJIG.fenceGrid, 1]) {
    const faces = slabFaces(n), pts = slabPoints(n, 0.1, 0.06, (x, y) => -(x * x + y * y) / 4, () => -0.05);
    assert.equal(faces.length, 4 * n * n + 8 * n);
    const edges = new Map();
    for (const f of faces) for (let k = 0; k < 3; k++) {
      const a = f[k], b = f[(k + 1) % 3], key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const e = edges.get(key) || { n: 0, dir: 0 };
      e.n++; e.dir += a < b ? 1 : -1;
      edges.set(key, e);
    }
    for (const [key, e] of edges) assert.ok(e.n === 2 && e.dir === 0, `edge ${key} is used once each way`);
    let vol = 0;
    for (const [a, b, c] of faces) vol += dot(pts[a], cross(pts[b], pts[c])) / 6;
    assert.ok(vol < 0, 'faces wind clockwise from outside, so the right-hand volume is negative');
    if (n === LATHJIG.grid) assert.ok(near(-vol, 0.2 * 0.12 * 0.05 - (2 * 0.1 ** 3 / 3 * 0.12 + 0.2 * 2 * 0.06 ** 3 / 3) / 4, 2e-6), `slab volume ${-vol}`);
  }
});

test('drawings and the OpenSCAD file render for every jig', () => {
  const { s, J } = jigsOf(EGG);
  for (const j of J.jigs) {
    const plan = jigPlanSVG(j);
    assert.match(plan, /^<svg class="lathjig plan"[\s\S]*<\/svg>$/);
    assert.ok(plan.includes('A · outer') && plan.includes('B · inner') && plan.includes(`${j.theta.toFixed(1)}°`));
    assert.ok(!/NaN|Infinity|undefined/.test(plan));
    for (const fam of ['A', 'B']) {
      const sec = jigSectionSVG(j, fam);
      assert.match(sec, /sag</);
      assert.ok(sec.includes(`along lath ${fam}`) && !/NaN|Infinity|undefined/.test(sec));
    }
  }
  const scad = lathJigSCAD(J, s, 'egg', 'https://example.test/');
  for (const j of J.jigs) assert.ok(scad.includes(`["${j.name}", `));
  for (const [open, close] of [['[', ']'], ['{', '}'], ['(', ')']]) assert.equal(scad.split(open).length, scad.split(close).length, `${open}${close} balance`);
  assert.ok(!/NaN|Infinity|undefined/.test(scad));
  assert.match(scad, /module slab\(/);
  assert.match(scad, /module jig\(/);
  assert.match(scad, /lath_w = 50;/);
  assert.match(scad, /stack = 24;/);
  assert.ok(scad.includes(`faces${LATHJIG.grid} = [${slabFaces(LATHJIG.grid).slice(0, 2).map((t) => `[${t.join(',')}]`).join(',')},`));
});

test('for a gridshell the jig sheet is the lath jig sheet, with its CSV and OpenSCAD', () => {
  const s = design(EGG), M = buildModel(s), J = buildLathJigs(M.gridshell, s);
  const html = DomeZ.sheets.jigSheetHTML(M, s, 'https://example.test/');
  assert.match(html, /<h1>Lath jig sheet · /);
  for (const j of J.jigs) assert.ok(html.includes(`<span class="dot jig">${j.name}</span>`));
  assert.equal((html.match(/<svg class="lathjig plan"/g) || []).length, J.jigs.length);
  assert.equal((html.match(/<svg class="lathjig section"/g) || []).length, 2 * J.jigs.length);
  assert.match(html, /J1 at crossing 1/);
  const rows = DomeZ.sheets.jigCsvRows(M, s, 'https://example.test/');
  const head = rows.findIndex((r) => r[0] === 'Jig');
  assert.equal(rows.slice(head + 1).findIndex((r) => r.length === 0), J.jigs.length);
  assert.equal(rows.filter((r) => /^[AB]\d+$/.test(r[0])).length, M.gridshell.laths.length);
  assert.match(DomeZ.sheets.lathJigScadText(M, s, 'https://example.test/'), /^\/\/ DomeZ lath crossing jigs/);
  // over the top: which jig each lath meets at each crossing
  const sl = design(LONG), ML = buildModel(sl), over = DomeZ.sheets.jigSheetHTML(ML, sl, '');
  for (const l of ML.gridshell.laths) assert.ok(over.includes(`<td>${l.family}${l.i + 1}</td>`));
  assert.match(over, /different jigs/);
  // a Joint design keeps its jig sheet; a gridshell with no base explains itself
  assert.match(DomeZ.sheets.jigSheetHTML(buildModel(design()), design(), ''), /<h1>Jig sheet · /);
  const bad = design({ ...EGG, partial: '1/1' });
  assert.match(DomeZ.sheets.jigSheetHTML(buildModel(bad), bad, ''), /needs a base/);
  assert.match(DomeZ.sheets.jigCsvRows(buildModel(bad), bad, '')[1][1], /needs a base/);
  assert.match(DomeZ.sheets.lathJigScadText(buildModel(bad), bad, ''), /needs a base/);
});
