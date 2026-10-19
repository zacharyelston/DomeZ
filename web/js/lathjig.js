/* DomeZ · lathjig: a cradle for each kind of lath crossing, to strap or bolt two bent laths together in
   the pose they take in the shell (the jig sheet's geometry for a gridshell).

   Where an A lath (outer layer) crosses a B lath (inner layer), both lie flat on the skin, each bent
   along its own line by the skin's normal curvature and twisted by its geodesic torsion. The cradle is
   a block whose top is a copy of the skin around the crossing: lath B lies in a groove sunk one lath
   deep into it, and lath A lies over B between two fences. The pair then sits exactly as in the shell
   while it is drilled through along the skin's normal, bolted, or bound with a strap round both.

   Jig frame: z along the skin's outward normal at the crossing, x along the bisector of the two laths,
   so lath A runs at +φ/2 from x and lath B at −φ/2, where φ (signed, |φ| ≤ 90°) is the turn from the
   B line to the A line, anticlockwise seen from outside. Around the crossing the skin is taken as the
   quadric z = −(L x² + 2 M x y + N y²)/2, fitted to the surface itself; over a jig's reach that is
   within a fraction of a millimetre, and it carries each lath's bend and twist. Crossings with the
   same turn and the same curvatures, to the steps below, share a jig. */
(function (DomeZ) {
'use strict';
const { add, sub, mul, dot, cross, len, norm, solve3, R2D } = DomeZ.vec;
const { lathPath } = DomeZ.gridshell;

const LATHJIG = {
  angleStep: 1,                      // ° — crossings whose turn differs by less than this share a jig
  sagStep: 0.0005,                   // m — and whose sag over the block differs by less
  margin: 0.04,                      // m from the laths' overlap to the block's edge
  minReach: 0.1, maxReach: 0.18,     // m — the block's half-size
  clearance: 0.001, fence: 0.012, fenceUp: 0.004, base: 0.02, bolt: 0.008, strap: 0.019,
  grid: 24, fenceGrid: 8,            // facets across a block, and along a fence
};

/** A function putting a point near the skin onto it. Round shapes go radially onto the profile; other
    shapes follow the gradient of the implicit surface, as the lath tracer does. */
function skinProjector(G) {
  if (G.prof) {
    const prof = G.prof;
    return (x) => {
      const t = Math.min(prof.top - 1e-9, Math.max(prof.bottom + 1e-9, x[2])), r = prof.rho(t), a = Math.atan2(x[1], x[0]);
      return [r * Math.cos(a), r * Math.sin(a), t];
    };
  }
  const S = G.surf;
  const F = (x) => x[0] * x[0] / (S.sx * S.sx) + x[1] * x[1] / (S.sy * S.sy) - S.g(x[2]);
  const grad = (x) => [2 * x[0] / (S.sx * S.sx), 2 * x[1] / (S.sy * S.sy), -S.g1(x[2])];
  return (x) => { for (let k = 0; k < 4; k++) { const g = grad(x); x = sub(x, mul(g, F(x) / dot(g, g))); } return x; };
}

/** The skin's height over the jig frame F at (x, y) in its tangent plane: the point is put onto the
    skin and the drift in the plane corrected until it sits over (x, y). */
function skinHeight(proj, F, x, y) {
  let u = add(F.P, add(mul(F.X, x), mul(F.Y, y))), q = u;
  for (let k = 0; k < 6; k++) {
    q = proj(u);
    const d = sub(q, F.P), ex = dot(d, F.X) - x, ey = dot(d, F.Y) - y;
    if (Math.abs(ex) + Math.abs(ey) < 1e-10) break;
    u = sub(u, add(mul(F.X, ex), mul(F.Y, ey)));
  }
  return dot(sub(q, F.P), F.Z);
}

/** The lath at distance s along lath k of G (either layout): point, outward normal, direction, bend
    (normal curvature, negative inward) and twist (geodesic torsion), interpolated between samples. */
function lathSampleAt(G, k, s) {
  const l = G.laths[k];
  const S = G.layout === 'crown' ? G.lath.samples : l.samples;
  const pts = G.layout === 'crown' ? lathPath(G, l.family, l.i) : S;
  let j = 1;
  while (j < S.length - 1 && S[j].s < s) j++;
  const a = S[j - 1], b = S[j], f = Math.min(1, Math.max(0, (s - a.s) / ((b.s - a.s) || 1)));
  const mix = (u, v) => u + f * (v - u), pa = pts[j - 1], pb = pts[j];
  const n = norm(add(mul(pa.n, 1 - f), mul(pb.n, f))), w = norm(add(mul(pa.w, 1 - f), mul(pb.w, f)));
  // the crown layout's B laths are mirror images of the traced lath: the same bend, the opposite twist
  const mirror = G.layout === 'crown' && l.family === 'B' ? -1 : 1;
  return { p: add(mul(pa.p, 1 - f), mul(pb.p, f)), n, T: norm(cross(w, n)), kn: mix(a.kn, b.kn), tg: mirror * mix(a.tg, b.tg), s };
}

/** The jig frame at a crossing of lath A (sample a) over lath B (sample b): the point P, the frame
    X, Y, Z, the two lath lines and the turn phi (radians) from the B line to the A line. */
function crossingFrame(a, b) {
  const P = mul(add(a.p, b.p), 0.5), Z = norm(add(a.n, b.n));
  const flat = (T) => norm(sub(T, mul(Z, dot(T, Z))));
  let Ta = flat(a.T);
  const Tb = flat(b.T);
  if (dot(Ta, Tb) < 0) Ta = mul(Ta, -1);                       // the lines meet at their acute angle
  const phi = Math.atan2(dot(cross(Tb, Ta), Z), dot(Ta, Tb));
  const X = norm(add(Ta, Tb)), Y = cross(Z, X);
  return { P, X, Y, Z, Ta, Tb, phi, theta: Math.abs(phi) };
}

/** The quadric z = −(L x² + 2 M x y + N y²)/2 fitted to the skin's height over the frame, by least
    squares on two rings of points within the reach, with the worst misfit over the block. */
function fitQuadric(height, reach) {
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], rhs = [0, 0, 0];
  for (const r of [reach / 2, reach]) for (let k = 0; k < 8; k++) {
    const x = r * Math.cos(k * Math.PI / 4), y = r * Math.sin(k * Math.PI / 4), z = height(x, y);
    const f = [-x * x / 2, -x * y, -y * y / 2];
    for (let i = 0; i < 3; i++) { rhs[i] += f[i] * z; for (let j = 0; j < 3; j++) A[i][j] += f[i] * f[j]; }
  }
  const [L, M, N] = solve3(A[0], rhs[0], A[1], rhs[1], A[2], rhs[2]);
  const q = (x, y) => -(L * x * x + 2 * M * x * y + N * y * y) / 2;
  let worst = 0;
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
    const x = reach * i / 4, y = reach * j / 4;
    worst = Math.max(worst, Math.abs(height(x, y) - q(x, y)));
  }
  return { L, M, N, q, worst };
}

/** The quadric's normal curvature and geodesic torsion along a direction at angle `al` from x. */
const quadricBend = (Q, al) => Q.L * Math.cos(al) ** 2 + 2 * Q.M * Math.sin(al) * Math.cos(al) + Q.N * Math.sin(al) ** 2;
const quadricTwist = (Q, al) => (Q.N - Q.L) * Math.sin(al) * Math.cos(al) + Q.M * Math.cos(2 * al);

/** Every A–B crossing of the gridshell with its jig frame, its two lath samples and its count. On the
    crown layout each ring of crossings is one entry, as every crossing on it is the same. The frame's
    origin is put onto the skin itself (the samples sit on chords a few microns inside it). */
function crossingsOf(G, proj = skinProjector(G)) {
  const out = [], entry = (a, b, more) => { const F = crossingFrame(a, b); F.P = proj(F.P); return { a, b, ...more, ...F }; };
  if (G.layout === 'crown') {
    for (let k = 1; k < G.nodes.length; k++) {
      const n = G.nodes[k], a = lathSampleAt(G, 0, n.s), b = lathSampleAt(G, G.N + (k % G.N), n.s);
      out.push(entry(a, b, { count: G.N, rise: n.rise, ring: k }));
    }
    return out;
  }
  const index = new Map(G.laths.map((l, k) => [l, k]));
  G.laths.forEach((l, k) => {
    if (l.family !== 'A') return;
    l.crossings.forEach((c, i) => {
      const other = c.with, j = other.crossings.findIndex((x) => x.with === l && len(sub(x.p, c.p)) < 1e-9);
      const a = lathSampleAt(G, k, c.s), b = lathSampleAt(G, index.get(other), other.crossings[j].s);
      out.push(entry(a, b, { count: 1, rise: c.rise, lathA: k, iA: i, lathB: index.get(other), iB: j }));
    });
  });
  return out;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** The jigs for a gridshell: one per kind of crossing, with the skin's quadric at a representative
    crossing, each lath's bend and twist there, the block's size and what each jig serves. */
function buildLathJigs(G, p) {
  const C = LATHJIG, w = p.lathW / 1000, stack = p.lathPlies * p.lathT / 1000, proj = skinProjector(G);
  const all = crossingsOf(G, proj);
  for (const c of all) {
    const half = Math.sin(Math.max(c.theta, 0.5 / R2D) / 2);
    c.overlap = { long: Math.min(w / half, 10), short: w / Math.cos(c.theta / 2) };
    c.reach = clamp(c.overlap.long / 2 + C.margin, C.minReach, C.maxReach);
    c.kA = -c.a.kn; c.kB = -c.b.kn;                             // the skin bends away from its normal
    const sag = (k) => Math.round(k * c.reach * c.reach / 2 / C.sagStep);
    c.key = `${Math.round(c.phi * R2D / C.angleStep)}|${sag(c.kA)}|${sag(c.kB)}`;
  }
  const groups = new Map();
  for (const c of all) { if (!groups.has(c.key)) groups.set(c.key, []); groups.get(c.key).push(c); }
  const jigs = [...groups.values()].map((members) => {
    const mean = (f) => members.reduce((s, c) => s + f(c) * c.count, 0) / members.reduce((s, c) => s + c.count, 0);
    const mPhi = mean((c) => c.phi), mA = mean((c) => c.kA), mB = mean((c) => c.kB);
    const off = (c) => Math.abs(c.phi - mPhi) * 10 + Math.abs(c.kA - mA) + Math.abs(c.kB - mB);
    const rep = members.reduce((best, c) => (off(c) < off(best) ? c : best));
    const reach = Math.max(...members.map((c) => c.reach));
    const Q = fitQuadric((x, y) => skinHeight(proj, rep, x, y), reach);
    const along = reach / Math.cos(rep.phi / 2);                // the block's half-length along either lath line
    const kA = rep.kA, kB = rep.kB;                             // the laths' bends, from the spec itself
    const low = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([i, j]) => Q.q(i * reach, j * reach)));
    const rises = members.map((c) => c.rise);
    return {
      phi: rep.phi * R2D, theta: rep.theta * R2D, L: Q.L, M: Q.M, N: Q.N, worst: Q.worst,
      kA, kB, RA: Math.abs(kA) > 1e-9 ? 1 / Math.abs(kA) : Infinity, RB: Math.abs(kB) > 1e-9 ? 1 / Math.abs(kB) : Infinity,
      sagA: kA * along ** 2 / 2, sagB: kB * along ** 2 / 2, along,
      tgA: rep.a.tg, tgB: rep.b.tg,
      twistA: rep.a.tg * along * R2D, twistB: rep.b.tg * along * R2D,
      reach, low, depth: C.base + stack - low, overlap: rep.overlap, w, stack,
      strapRound: 2 * rep.overlap.short + 4 * stack,
      count: members.reduce((s, c) => s + c.count, 0), rise: [Math.min(...rises), Math.max(...rises)],
      rings: members.map((c) => c.ring).filter((k) => k !== undefined), members, rep,
    };
  });
  jigs.sort((a, b) => (a.rise[0] + a.rise[1]) - (b.rise[0] + b.rise[1]) || b.theta - a.theta);
  jigs.forEach((j, k) => { j.name = 'J' + (k + 1); for (const c of j.members) c.jig = j; });
  // which jig each lath meets at each of its crossings, in order from its start
  const byLath = G.laths.map(() => []);
  if (G.layout === 'crown') {
    const names = all.map((c) => c.jig.name);
    byLath.forEach((list) => list.push(...names));
  } else {
    for (const c of all) { byLath[c.lathA][c.iA] = c.jig.name; byLath[c.lathB][c.iB] = c.jig.name; }
  }
  const range = (f) => [Math.min(...jigs.map(f)), Math.max(...jigs.map(f))];
  const finite = jigs.flatMap((j) => [j.RA, j.RB]).filter(Number.isFinite);
  return {
    jigs, byLath, w, stack, crossings: jigs.reduce((s, j) => s + j.count, 0),
    turn: jigs.length ? range((j) => j.theta) : [0, 0], reach: jigs.length ? range((j) => j.reach) : [0, 0],
    radius: finite.length ? [Math.min(...finite), Math.max(...finite)] : [Infinity, Infinity],
    strap: jigs.length ? range((j) => j.strapRound) : [0, 0], strapTotal: jigs.reduce((s, j) => s + j.strapRound * j.count, 0),
    worst: jigs.length ? Math.max(...jigs.map((j) => j.worst)) : 0,
  };
}

/* ---- Drawings --------------------------------------------------------------------------------- */

const f1 = (v) => v.toFixed(1);
const rot = (u, v, al) => [u * Math.cos(al) - v * Math.sin(al), u * Math.sin(al) + v * Math.cos(al)];

/** The jig seen from outside: the block with lath B in its groove, lath A over it between the fences,
    the laths' overlap, the bolt and the strap line, and the turn from B to A. */
function jigPlanSVG(j) {
  const C = LATHJIG, W = 400, H = 366, s = 260 / (2 * j.reach), cx = W / 2, cy = 176;
  const al = j.phi / R2D / 2, r = j.reach, hw = j.w / 2, far = 1.6 * r;
  const P = ([x, y]) => [cx + x * s, cy - y * s];
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map((q) => P(q).map(f1).join(',')).join(' ')}"/>`;
  const strip = (half, hwid, ang, cv = 0) => [rot(-half, cv - hwid, ang), rot(half, cv - hwid, ang), rot(half, cv + hwid, ang), rot(-half, cv + hwid, ang)];
  const tx = (q, str, cls, anchor = 'start', dy = 0, dx = 0) => { const [x, y] = P(q); return `<text class="${cls}" x="${f1(x + dx)}" y="${f1(y + dy)}" text-anchor="${anchor}">${str}</text>`; };
  const block = [[-r, -r], [r, -r], [r, r], [-r, r]];
  // the fences along lath A, interrupted where lath B passes under them (and where the strap goes down)
  const vf = hw + C.clearance + C.fence / 2, gw = vf + C.strap / 2 + 0.002, fences = [];
  const fenceAt = (lo, hi, sg) => [rot(lo, sg * vf - C.fence / 2, al), rot(hi, sg * vf - C.fence / 2, al), rot(hi, sg * vf + C.fence / 2, al), rot(lo, sg * vf + C.fence / 2, al)];
  for (const sg of [-1, 1]) {
    const sn = Math.sin(2 * al) || 1e-9, u1 = (-gw - sg * vf * Math.cos(2 * al)) / sn, u2 = (gw - sg * vf * Math.cos(2 * al)) / sn;
    const lo = Math.min(u1, u2), hi = Math.max(u1, u2);
    if (lo > -far) fences.push(fenceAt(-far, lo, sg));
    if (hi < far) fences.push(fenceAt(hi, far, sg));
  }
  const Lx = j.overlap.long / 2, Ly = j.overlap.short / 2;
  const overlap = [[-Math.min(Lx, far), 0], [0, -Ly], [Math.min(Lx, far), 0], [0, Ly]];
  const slot = [[-C.strap / 2, -Ly - 0.006], [C.strap / 2, -Ly - 0.006], [C.strap / 2, Ly + 0.006], [-C.strap / 2, Ly + 0.006]];
  // the turn from the B line to the A line, drawn at the right of the crossing
  const ra = 0.42 * r, [ax0, ay0] = P(rot(ra, 0, -al)), [ax1, ay1] = P(rot(ra, 0, al));
  const arc = `<path class="arc" d="M${f1(ax0)} ${f1(ay0)} A${f1(ra * s)} ${f1(ra * s)} 0 0 ${j.phi > 0 ? 0 : 1} ${f1(ax1)} ${f1(ay1)}"/>`;
  const lblA = rot((r + 0.012) / Math.cos(al), 0, al), lblB = rot(-(r + 0.012) / Math.cos(al), 0, -al);
  const id = `clip-${j.name}`;
  const mm = (m) => Math.round(m * 1000);
  return `<svg class="lathjig plan" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Jig ${j.name} seen from outside">
    <defs><clipPath id="${id}"><rect x="${f1(cx - r * s)}" y="${f1(cy - r * s)}" width="${f1(2 * r * s)}" height="${f1(2 * r * s)}"/></clipPath></defs>
    ${poly(block, 'block')}
    <g clip-path="url(#${id})">
      ${poly(strip(far, hw + C.clearance, -al), 'groove')}
      ${poly(strip(far, hw, -al), 'lathB')}
      ${fences.map((f) => poly(f, 'fence')).join('')}
      ${poly(strip(far, hw, al), 'lathA')}
      ${poly(overlap, 'overlap')}
    </g>
    <line class="strap" x1="${f1(cx)}" y1="${f1(cy - r * s)}" x2="${f1(cx)}" y2="${f1(cy + r * s)}"/>
    ${poly(slot, 'slot')}
    <circle class="bolt" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(Math.max(3, C.bolt / 2 * s))}"/>
    ${arc}
    ${tx(rot(ra + 0.012, 0, 0), `${f1(j.theta)}°`, 'ang', 'start', 5)}
    ${tx(lblA, 'A · outer', 'small', 'start', 4)}
    ${tx(lblB, 'B · inner', 'small', 'end', 4)}
    <text class="small" x="8" y="15">seen from outside</text>
    <text class="small" x="${W - 8}" y="15" text-anchor="end">A turned ${f1(j.theta)}° ${j.phi >= 0 ? 'anticlockwise' : 'clockwise'} from B</text>
    <text class="dim" x="8" y="${H - 22}">block ${mm(2 * r)} × ${mm(2 * r)} mm · laths ${mm(j.w)} wide · B in the groove, A on top</text>
    <text class="dim" x="8" y="${H - 8}">bolt at the crossing · strap on the dashed line, under B over A</text>
  </svg>`;
}

/** A section through the jig along one lath's centre line (fam 'A' or 'B'): the skin's curve over the
    block with its sag, the lath on it (A over the skin, B in the groove) and the other lath's section. */
function jigSectionSVG(j, fam) {
  const C = LATHJIG, W = 400, H = 170, al = j.phi / R2D / 2, Lu = j.reach / Math.cos(al);
  const s = 270 / (2 * Lu), cx = W / 2, cy = 64, k = fam === 'A' ? j.kA : j.kB;
  const z = (u) => -k * u * u / 2;
  const P = ([u, zz]) => [cx + u * s, cy - zz * s];
  const n = 24, us = Array.from({ length: n + 1 }, (_, i) => -Lu + 2 * Lu * i / n);
  const skin = us.map((u) => [u, z(u)]);
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map((q) => P(q).map(f1).join(',')).join(' ')}"/>`;
  const line = (pts, cls) => `<polyline class="${cls}" fill="none" points="${pts.map((q) => P(q).map(f1).join(',')).join(' ')}"/>`;
  const bottom = j.low - j.stack - C.base;
  const notch = (j.w + 2 * C.clearance) / Math.sin(Math.max(j.theta, 0.5) / R2D) / 2;   // half-width of the groove, along A
  const other = j.w / Math.sin(Math.max(j.theta, 0.5) / R2D) / 2;                     // half-width of the other lath's section
  let block, lath, otherLath;
  if (fam === 'A') {
    // the block's top is the skin, notched by the groove where lath B passes under
    const top = us.filter((u) => Math.abs(u) > notch).map((u) => [u, z(u)]);
    const left = top.filter((q) => q[0] < 0), right = top.filter((q) => q[0] > 0);
    const nL = Math.min(notch, Lu), zN = (u) => z(u) - j.stack;
    block = [[-Lu, bottom], ...left, [-nL, z(-nL)], [-nL, zN(-nL)], ...us.filter((u) => Math.abs(u) < nL).map((u) => [u, zN(u)]), [nL, zN(nL)], [nL, z(nL)], ...right, [Lu, bottom]];
    lath = [...skin, ...skin.slice().reverse().map(([u, zz]) => [u, zz + j.stack])];
    const o = Math.min(other, Lu);
    otherLath = [[-o, z(-o) - j.stack], [o, z(o) - j.stack], [o, z(o)], [-o, z(-o)]];
  } else {
    // along B the block is cut along the groove: its top is the groove's bed, one lath below the skin
    const bed = us.map((u) => [u, z(u) - j.stack]);
    block = [[-Lu, bottom], ...bed, [Lu, bottom]];
    lath = [...bed, ...skin.slice().reverse()];
    const o = Math.min(other, Lu);
    otherLath = [[-o, z(-o)], [o, z(o)], [o, z(o) + j.stack], [-o, z(-o) + j.stack]];
  }
  const sag = k * Lu * Lu / 2, mm1 = (m) => (m * 1000).toFixed(1);
  const [ex, ey0] = P([Lu, 0]), [, ey1] = P([Lu, z(Lu)]);
  const R = fam === 'A' ? j.RA : j.RB, twist = fam === 'A' ? j.twistA : j.twistB;
  return `<svg class="lathjig section" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Jig ${j.name} along lath ${fam}">
    ${poly(block, 'block')}
    ${poly(otherLath, fam === 'A' ? 'lathB' : 'lathA')}
    ${poly(lath, fam === 'A' ? 'lathA' : 'lathB')}
    ${line(skin, 'skin')}
    <line class="level" x1="${f1(cx - Lu * s)}" y1="${f1(cy)}" x2="${f1(cx + Lu * s)}" y2="${f1(cy)}"/>
    <line class="dimline" x1="${f1(ex + 6)}" y1="${f1(ey0)}" x2="${f1(ex + 6)}" y2="${f1(ey1)}"/>
    <text class="dim" x="${f1(ex + 9)}" y="${f1((ey0 + ey1) / 2 + 4)}">${mm1(sag)} sag</text>
    <text class="small" x="8" y="15">along lath ${fam} · ${fam === 'A' ? 'outer, over the skin' : 'inner, in the groove'}</text>
    <text class="small" x="${W - 8}" y="15" text-anchor="end">R ${Number.isFinite(R) ? R.toFixed(2) + ' m' : 'flat'} · twist ${f1(Math.abs(twist))}°</text>
    <text class="dim" x="8" y="${H - 21}">${Math.round(2 * Lu * 1000)} mm along the lath · lath ${Math.round(j.stack * 1000)} thick · block ${Math.round(j.depth * 1000)} tall</text>
    <text class="dim" x="8" y="${H - 7}">${fam === 'A' ? 'A on the skin bridges the groove; B’s section below it' : 'B in the groove, one lath below the skin; A crosses over'}</text>
  </svg>`;
}

/* ---- OpenSCAD --------------------------------------------------------------------------------- */

/** The faces of a slab: a grid of (n+1)² top points then (n+1)² bottom points, as triangles listed
    clockwise seen from outside (the way OpenSCAD's polyhedron wants them). */
function slabFaces(n) {
  const T = (i, j) => j * (n + 1) + i, B = (i, j) => (n + 1) * (n + 1) + j * (n + 1) + i, f = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    f.push([T(i, j), T(i, j + 1), T(i + 1, j + 1)], [T(i, j), T(i + 1, j + 1), T(i + 1, j)]);
    f.push([B(i, j), B(i + 1, j), B(i + 1, j + 1)], [B(i, j), B(i + 1, j + 1), B(i, j + 1)]);
  }
  for (let i = 0; i < n; i++) {
    f.push([B(i, 0), T(i + 1, 0), B(i + 1, 0)], [B(i, 0), T(i, 0), T(i + 1, 0)]);
    f.push([B(i, n), B(i + 1, n), T(i + 1, n)], [B(i, n), T(i + 1, n), T(i, n)]);
  }
  for (let j = 0; j < n; j++) {
    f.push([B(0, j), B(0, j + 1), T(0, j + 1)], [B(0, j), T(0, j + 1), T(0, j)]);
    f.push([B(n, j), T(n, j + 1), B(n, j + 1)], [B(n, j), T(n, j), T(n, j + 1)]);
  }
  return f;
}

/** The slab's points for a grid of n, as OpenSCAD's module builds them: top then bottom, row by row
    (for checking the faces; z is a function of x and y in metres). */
function slabPoints(n, hx, hy, zTop, zBot) {
  const pts = [];
  for (const z of [zTop, zBot]) for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const x = -hx + 2 * hx * i / n, y = -hy + 2 * hy * j / n;
    pts.push([x, y, z(x, y)]);
  }
  return pts;
}

/** OpenSCAD source for every jig: a table of the jigs and the modules that build one from it. */
function lathJigSCAD(J, s, title, href) {
  const C = LATHJIG, mm = (m) => Math.round(m * 1000), f4 = (v) => v.toFixed(4);
  const faces = (n) => slabFaces(n).map((t) => `[${t.join(',')}]`).join(',');
  const set = (name, value, note) => `${`${name} = ${value};`.padEnd(20)}// ${note}`;
  const rows = J.jigs.map((j) => `  ["${j.name}", ${f4(j.phi)}, ${f4(j.L)}, ${f4(j.M)}, ${f4(j.N)}, ${mm(j.reach)}, ${j.count}]`).join(',\n');
  return `// DomeZ lath crossing jigs · ${title}
// ${href}
//
// One cradle for each kind of crossing of an A lath (outer layer) over a B lath (inner layer). Units are
// mm. In a jig's frame z is the skin's outward normal at the crossing and x the bisector of the two
// laths: lath A runs at +phi/2 from x and lath B at -phi/2, phi being the turn from the B line to the
// A line, anticlockwise seen from outside. The block's top is the skin round the crossing, the quadric
// z = -(L x^2 + 2 M x y + N y^2)/2, which carries each lath's bend and twist. Lath B lies in a groove
// one lath deep along its line; lath A lies over it between two fences. A pilot hole marks the bolt on
// the skin's normal; set \`strap\` for a slot across the crossing instead, to pass a strap round both
// laths. Render one jig with \`which\`, or every jig in a row with \`show_all\`. Print or mill top up.

${set('which', 0, `0 = ${J.jigs[0] ? J.jigs[0].name : 'J1'}, 1 = ${J.jigs[1] ? J.jigs[1].name : 'J2'}, ...`)}
${set('show_all', 'false', 'every jig in a row instead')}
${set('lath_w', mm(J.w), 'lath width')}
${set('stack', mm(J.stack), `lath thickness (${s.lathPlies} × ${s.lathT} mm)`)}
${set('clearance', mm(C.clearance), 'each side of a lath')}
${set('fence', mm(C.fence), 'fence thickness')}
${set('fence_up', mm(C.fenceUp), 'fence above lath A')}
${set('base', mm(C.base), 'block under the lowest point of the groove')}
${set('bolt', mm(C.bolt), 'pilot hole for the bolt (0 for none)')}
${set('strap', 0, `strap width for a slot across the crossing (${mm(C.strap)} for 3/4 in banding), 0 for none`)}
$fn = 48;

// [name, phi (deg), L, M, N (1/m), reach (mm, the block's half-size), crossings served]
jigs = [
${rows}
];

function skin(J, x, y) = -(J[2]*x*x + 2*J[3]*x*y + J[4]*y*y) / 2000;

// Faces of a slab with a grid of n, as DomeZ generates them (clockwise seen from outside).
faces${C.grid} = [${faces(C.grid)}];
faces${C.fenceGrid} = [${faces(C.fenceGrid)}];

// A slab over a rectangle with half-sizes hx, hy centred at (cx, cy) in a frame turned by ang about z,
// from the skin + ztop down to zbot: a height below the skin when follow is true, else a fixed level.
module slab(J, hx, hy, ang, cx, cy, ztop, zbot, follow, n, faces) {
  top = [for (j = [0:n]) for (i = [0:n]) let (u = cx - hx + 2*hx*i/n, v = cy - hy + 2*hy*j/n,
           x = u*cos(ang) - v*sin(ang), y = u*sin(ang) + v*cos(ang)) [x, y, skin(J, x, y) + ztop]];
  bot = [for (j = [0:n]) for (i = [0:n]) let (u = cx - hx + 2*hx*i/n, v = cy - hy + 2*hy*j/n,
           x = u*cos(ang) - v*sin(ang), y = u*sin(ang) + v*cos(ang)) [x, y, follow ? skin(J, x, y) + zbot : zbot]];
  polyhedron(points = concat(top, bot), faces = faces, convexity = 6);
}

module jig(k) {
  J = jigs[k]; phi = J[1]; reach = J[5];
  low = min([for (c = [[-1, -1], [1, -1], [-1, 1], [1, 1]]) skin(J, c[0]*reach, c[1]*reach)]);
  bottom = low - stack - base;
  vf = lath_w/2 + clearance + fence/2;      // the fences' offset from lath A's centre line
  gw = vf + max(strap, ${mm(C.strap)})/2 + 2;         // half-width of the gap in each fence, across lath B, clearing the strap too
  far = 1.6*reach;
  difference() {
    union() {
      slab(J, reach, reach, 0, 0, 0, 0, bottom, false, ${C.grid}, faces${C.grid});        // the block, its top the skin
      intersection() {                                                   // the fences along lath A
        for (sg = [-1, 1]) {
          // lath B passes under the fence line where |u sin(phi) + sg vf cos(phi)| <= gw, u along A
          sn = abs(sin(phi)) < 1e-6 ? 1e-6 : sin(phi);
          u1 = (-gw - sg*vf*cos(phi)) / sn; u2 = (gw - sg*vf*cos(phi)) / sn;
          lo = min(u1, u2); hi = max(u1, u2);
          if (lo > -far) slab(J, (lo + far)/2, fence/2, phi/2, (lo - far)/2, sg*vf, stack + fence_up, -2, true, ${C.fenceGrid}, faces${C.fenceGrid});
          if (hi < far) slab(J, (far - hi)/2, fence/2, phi/2, (far + hi)/2, sg*vf, stack + fence_up, -2, true, ${C.fenceGrid}, faces${C.fenceGrid});
        }
        translate([-reach, -reach, bottom]) cube([2*reach, 2*reach, 600]);
      }
    }
    slab(J, far, lath_w/2 + clearance, -phi/2, 0, 0, 60, -stack, true, ${C.grid}, faces${C.grid});  // the groove for lath B
    if (bolt > 0) cylinder(d = bolt, h = 600, center = true);
    if (strap > 0) rotate([0, 0, 90]) cube([lath_w/cos(phi/2) + 12, strap + 1, 600], center = true);
  }
}

function offset(k) = k == 0 ? 0 : offset(k - 1) + 2*jigs[k - 1][5] + 30;

if (show_all) { for (k = [0:len(jigs) - 1]) translate([offset(k), 0, 0]) jig(k); }
else jig(which);
`;
}

DomeZ.lathjig = {
  LATHJIG, skinProjector, skinHeight, lathSampleAt, crossingFrame, fitQuadric, quadricBend, quadricTwist,
  crossingsOf, buildLathJigs, jigPlanSVG, jigSectionSVG, slabFaces, slabPoints, lathJigSCAD,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
