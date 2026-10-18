import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, REFERENCE, near } from './load.mjs';

const { JIG, boardAxes, endSetup, buildJigs, endTopView, cradleSVG, endTopSVG } = DomeZ.jig;
const { buildModel } = DomeZ.model;
const { dot, cross, add, mul } = DomeZ.vec;

const DESIGNS = {
  sphere: REFERENCE,
  egg: { shape: 'egg', freq: 4, method: 'chords', partial: '3/4' },
  anticlockwise: { ...REFERENCE, frame: 'joint-ccw' },
  octahedron: { base: 'octahedron', method: 'chords', partial: '1/2', r: 3 },
};
const lumber = Object.fromEntries(Object.entries(DESIGNS).map(([k, v]) => [k, buildModel(design(v)).lumber]));
const ends = (L) => L.boardTypes.flatMap((bt) => [0, 1].map((i) => ({ bd: bt.rep, e: endSetup(bt.rep, i, L) })));
const cornersOf = (tl) => [-1, 1].flatMap((s) => [add(tl.outer, mul(tl.walker, s)), add(tl.inner, mul(tl.walker, s))]);

test('in the V-cradle the outer face sits on the seat and the named wide face on the back', () => {
  for (const [name, L] of Object.entries(lumber)) for (const { bd, e } of ends(L)) {
    const { Xb, Yb, Zb } = e.frame, { ey, ez } = boardAxes(bd), lean = e.lean / 180 * Math.PI;
    assert.ok(near(dot(cross(Xb, Yb), Zb), 1, 1e-12), `${name}: right-handed table frame`);
    const T = (v) => [dot(v, Xb), dot(v, Yb), dot(v, Zb)];
    const inward = T(ez), back = T(e.back === 'bottom' ? ey : mul(ey, -1));
    assert.ok(near(inward[0], 0, 1e-12) && near(inward[1], Math.sin(lean), 1e-12) && near(inward[2], Math.cos(lean), 1e-12));
    assert.ok(near(back[0], 0, 1e-12) && near(back[1], Math.cos(lean), 1e-12) && near(back[2], -Math.sin(lean), 1e-12));
    assert.ok(e.lean >= 0 && e.lean <= 90);
  }
});

test('every end cut stands vertical, on the stated side of the blade', () => {
  for (const [name, L] of Object.entries(lumber)) for (const { bd, e } of ends(L)) {
    const { Xb, Zb, n } = e.frame;
    assert.ok(near(dot(n, Zb), 0, 1e-12), `${name}: vertical cut`);
    const corners = cornersOf(bd.tails[e.end]).map((c) => dot(c, n));
    assert.ok(Math.max(...corners) - Math.min(...corners) < 1e-9, `${name}: the corners lie on the cut`);
    const x = (tl) => cornersOf(tl).map((c) => dot(c, Xb));
    const here = x(bd.tails[e.end]), there = x(bd.tails[1 - e.end]);
    assert.ok(e.side === 'right' ? Math.min(...here) > Math.max(...there) : Math.max(...here) < Math.min(...there), `${name}: side`);
  }
});

test('the saw never miters past 45°: a fence wedge covers the rest', () => {
  for (const L of Object.values(lumber)) for (const { e } of ends(L)) {
    assert.ok(e.miter <= JIG.maxMiter + 1e-9);
    assert.ok(near(e.miter + e.wedge, e.angle, 1e-9));
    assert.equal(e.wedge % JIG.wedgeStep, 0);
  }
  assert.ok(ends(lumber.egg).some(({ e }) => e.wedge > 0));
});

test('the reference dome: six fixed cradles, leans 14.8–28.7°, miters 20.6–36.4°', () => {
  const J = buildJigs(lumber.sphere);
  assert.equal(J.cradles.length, 6);
  assert.equal(J.adjustable, false);
  assert.deepEqual(J.lean.map((x) => +x.toFixed(1)), [14.8, 28.7]);
  assert.deepEqual(J.miter.map((x) => +x.toFixed(1)), [20.6, 36.4]);
  assert.deepEqual(J.flatMiter.map((x) => +x.toFixed(1)), [10.2, 12.1]);
  assert.deepEqual(J.flatBevel.map((x) => +x.toFixed(1)), [18, 34.6]);
  assert.equal(J.cradles.reduce((s, c) => s + c.ends, 0), lumber.sphere.boards.length * 2);
});

test('an egg gets one adjustable cradle, and both passes run in order of lean', () => {
  const J = buildJigs(lumber.egg);
  assert.ok(J.cradles.length > JIG.maxFixed);
  assert.equal(J.adjustable, true);
  for (const pass of J.passes) {
    assert.equal(pass.length, lumber.egg.boardTypes.length);
    for (let k = 1; k < pass.length; k++) assert.ok(pass[k].e.lean >= pass[k - 1].e.lean);
  }
});

test('the pass 2 stop is the outer face\'s length along the edge in the V', () => {
  const J = buildJigs(lumber.sphere);
  const A = J.plans.find((pl) => pl.bt.label === 'A');
  assert.equal(A.stopEdge, A.ends[1].back);
  assert.equal(A.stop, 1214);                                     // the top-edge outer marks run 0 → 1214
  assert.equal(A.overall, 1238);
});

test('from above, the blade sits at the listed miter through all four corners of the cut', () => {
  for (const L of Object.values(lumber)) {
    const J = buildJigs(L);
    for (const pl of J.plans) for (const e of pl.ends) {
      const tv = endTopView(pl.bt.rep, e, J, L), { Xb, Yb } = e.frame;
      const c = Math.cos(tv.turn), s = Math.sin(tv.turn);
      const pts = cornersOf(pl.bt.rep.tails[e.end]).map((q) => [dot(q, Xb), dot(q, Yb)]).map(([x, y]) => [x * c - y * s, x * s + y * c]);
      const far = pts.reduce((m, q) => (Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) > Math.hypot(m[0] - pts[0][0], m[1] - pts[0][1]) ? q : m));
      const angle = Math.atan(Math.abs((far[0] - pts[0][0]) / (far[1] - pts[0][1]))) * 180 / Math.PI;
      assert.ok(near(angle, e.miter, 1e-9));
      assert.ok(tv.yMin > 0 && tv.yMax > tv.yMin, 'the board clears the fence');
    }
  }
});

test('drawings render', () => {
  const J = buildJigs(lumber.sphere), pl = J.plans[0];
  assert.match(cradleSVG(J.cradles[0], J, lumber.sphere), /^<svg class="cradle"[\s\S]*<\/svg>$/);
  const top = endTopSVG(pl.bt.rep, pl.ends[0], J, lumber.sphere);
  assert.match(top, /class="blade"/);
  assert.match(top, />long point</);
  assert.ok(top.includes(`${pl.ends[0].miter.toFixed(1)}°`));
});
