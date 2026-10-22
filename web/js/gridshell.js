/* DomeZ · gridshell: a timber gridshell of laths laid flat on the skin along geodesic lines (prototype).

   A lath lies tangent to the surface, its wide face on the skin. Along a geodesic it bends only about
   its weak axis (by the surface's normal curvature) and twists by the geodesic torsion; it is never
   bent edgewise. On a surface of revolution (a sphere, a round ellipsoid, an egg) every geodesic keeps
   Clairaut's constant c = ρ·sin ψ, where ρ is the distance from the axis and ψ the angle to the
   meridian. So every lath that leaves the base ring at the same angle has the same shape: it climbs,
   turning around the axis, until ρ = c, where it runs level along the crown ring of radius c.

   Family A turns one way and family B, its mirror image, the other. Laths start at N evenly spaced
   points on the base ring. Lath A0 (from azimuth 0) and lath Bj (from 2πj/N) reach the same height
   after the same length, so they cross exactly where A0 has turned through πj/N: along every lath the
   crossings sit where it has turned through a multiple of π/N, at the same distances on A and B.
   That is the crown layout.

   Any shape, long ellipsoids included, can take the over-the-top layout instead: laths traced on the
   surface itself cross the ridge (the line over the top along the long axis) at even spacing and run
   down both sides to the base. Every lath differs a little, so crossings are found by intersecting
   the laths, and laths with the same marks are grouped into types. Either way, each lath is then
   spliced from stock lengths. */
(function (DomeZ) {
'use strict';
const { add, sub, mul, dot, cross, len, norm, R2D } = DomeZ.vec;
const { parsePartial, effectivePartial } = DomeZ.cut;

/** The shape as a surface of revolution about z: ρ(t) for heights t in [bottom, top], or null. */
function revolutionProfile(p) {
  if (p.shape === 'ellipsoid') {
    if (Math.abs(p.rx - p.ry) > 1e-9) return null;
    const a = p.rx, c = p.rz;
    return { rho: (t) => a * Math.sqrt(Math.max(0, 1 - (t / c) * (t / c))), top: c, bottom: -c, scale: Math.max(a, c) };
  }
  if (p.shape === 'egg') {
    // the Hügelschäffer egg of shape.js: r(t) = (B/2)·sqrt((L² − 4t²) / (L² + 8wt + 4w²))
    const L = p.eggL, B = p.eggB, w = p.eggW * L * (p.eggTip === 'up' ? 1 : -1);
    return { rho: (t) => (B / 2) * Math.sqrt(Math.max(0, (L * L - 4 * t * t) / (L * L + 8 * w * t + 4 * w * w))),
             top: L / 2, bottom: -L / 2, scale: Math.max(L, B) };
  }
  const r = p.r;
  return { rho: (t) => Math.sqrt(Math.max(0, r * r - t * t)), top: r, bottom: -r, scale: r };
}

/** ρ and its first two derivatives at height t (central differences). */
function profileAt(prof, t) {
  const h1 = 1e-6 * prof.scale, h2 = 1e-4 * prof.scale, f = prof.rho;
  const r = f(t);
  return { r, r1: (f(t + h1) - f(t - h1)) / (2 * h1), r2: (f(t + h2) - 2 * r + f(t - h2)) / (h2 * h2) };
}

/** One lath from height tBase, leaving the meridian at angle psi, up to the crown: samples every
    `step` metres of length with its height t, azimuth θ, normal curvature kn and geodesic torsion tg.
    The geodesic equations on X(t, θ) = (ρ cos θ, ρ sin θ, t), with unit speed: θ' = c / ρ² (Clairaut)
    and t'' = (ρ ρ' θ'² − ρ' ρ'' t'²) / (1 + ρ'²), integrated by RK4 in arc length. */
function traceLath(prof, tBase, psi, step = 0.01) {
  const c = prof.rho(tBase) * Math.sin(psi);
  const thetaRate = (t) => { const r = prof.rho(t); return c / (r * r); };
  const accel = (t, tp) => {
    const g = profileAt(prof, t), thp = c / (g.r * g.r);
    return (g.r * g.r1 * thp * thp - g.r1 * g.r2 * tp * tp) / (1 + g.r1 * g.r1);
  };
  const sample = (s, t, tp, th) => {
    const g = profileAt(prof, t), W2 = 1 + g.r1 * g.r1, W = Math.sqrt(W2), thp = c / (g.r * g.r);
    return { s, t, th, rho: g.r, tp, thp,
             kn: (g.r2 * tp * tp - g.r * thp * thp) / W,                // normal curvature (signed; negative bends inward)
             tg: -(W2 + g.r * g.r2) / W2 * tp * thp };                 // geodesic torsion: the lath's twist per metre
  };
  let t = tBase, tp = Math.cos(psi) / Math.sqrt(1 + profileAt(prof, tBase).r1 ** 2), th = 0, s = 0;
  const out = [sample(0, t, tp, 0)];
  const limit = 4 * Math.PI * prof.scale;
  while (s < limit) {
    const k1 = [tp, accel(t, tp), thetaRate(t)];
    const k2 = [tp + step / 2 * k1[1], accel(t + step / 2 * k1[0], tp + step / 2 * k1[1]), thetaRate(t + step / 2 * k1[0])];
    const k3 = [tp + step / 2 * k2[1], accel(t + step / 2 * k2[0], tp + step / 2 * k2[1]), thetaRate(t + step / 2 * k2[0])];
    const k4 = [tp + step * k3[1], accel(t + step * k3[0], tp + step * k3[1]), thetaRate(t + step * k3[0])];
    const tn = t + step / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    const tpn = tp + step / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    const thn = th + step / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    if (tpn <= 0) {
      // the crown: the lath runs level where ρ = c. Find that height within the step, and finish there.
      let lo = t, hi = Math.max(t, tn) + step;
      for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (prof.rho(mid) > c) lo = mid; else hi = mid; }
      const f = Math.min(1, Math.max(0, tp / (tp - tpn)));
      out.push(sample(s + f * step, lo, 0, th + f * (thn - th)));
      return { c, samples: out };
    }
    s += step; t = tn; tp = tpn; th = thn;
    out.push(sample(s, t, tp, th));
  }
  return { c, samples: out };
}

/** Linear interpolation of a sample field at azimuth th (samples have increasing θ). */
function atAzimuth(samples, th) {
  let k = 1;
  while (k < samples.length - 1 && samples[k].th < th) k++;
  const a = samples[k - 1], b = samples[k], f = (th - a.th) / ((b.th - a.th) || 1);
  const mix = (key) => a[key] + f * (b[key] - a[key]);
  return { s: mix('s'), t: mix('t'), rho: mix('rho'), kn: mix('kn'), th };
}

/** A point on the surface at height t and azimuth th, pushed off it along the outward normal by `off`. */
function surfacePoint(prof, t, th, off = 0) {
  const g = profileAt(prof, t), W = Math.sqrt(1 + g.r1 * g.r1);
  const n = [Math.cos(th) / W, Math.sin(th) / W, -g.r1 / W];
  return [g.r * Math.cos(th) + off * n[0], g.r * Math.sin(th) + off * n[1], t + off * n[2]];
}

/** Lath `i` of family 'A' or 'B' as 3D samples { p, n, w }: point, outward normal and the width
    direction (in the skin, square to the lath). Family B is family A mirrored. */
function lathPath(G, family, i, off = 0) {
  const phi = 2 * Math.PI * i / G.N, sgn = family === 'A' ? 1 : -1;
  return G.lath.samples.map((q) => {
    const th = phi + sgn * q.th, g = profileAt(G.prof, q.t), W = Math.sqrt(1 + g.r1 * g.r1);
    const n = [Math.cos(th) / W, Math.sin(th) / W, -g.r1 / W];
    const T = [g.r1 * q.tp * Math.cos(th) - g.r * Math.sin(th) * sgn * q.thp,
               g.r1 * q.tp * Math.sin(th) + g.r * Math.cos(th) * sgn * q.thp, q.tp];
    return { p: surfacePoint(G.prof, q.t, th, off), n, w: norm(cross(n, T)) };
  });
}

/* ---- Any shape: laths traced on the surface itself ----------------------------------------------- */

/** The shape as an implicit surface x²/sx² + y²/sy² = g(z), where g is the squared horizontal radius
    profile: r² − z² for a sphere, 1 − z²/c² for an ellipsoid with X and Y radii sx and sy, and the
    Hügelschäffer egg's (B/2)²·(L² − 4z²)/(L² + 8wz + 4w²). F = x²/sx² + y²/sy² − g(z) is negative inside. */
function surfaceOf(p) {
  if (p.shape === 'ellipsoid') {
    const c = p.rz;
    return { sx: p.rx, sy: p.ry, top: c, scale: Math.max(p.rx, p.ry, c),
             g: (z) => 1 - z * z / (c * c), g1: (z) => -2 * z / (c * c), g2: () => -2 / (c * c) };
  }
  if (p.shape === 'egg') {
    const L = p.eggL, k = (p.eggB / 2) ** 2, w = p.eggW * L * (p.eggTip === 'up' ? 1 : -1);
    const N = (z) => L * L - 4 * z * z, D = (z) => L * L + 8 * w * z + 4 * w * w;
    const N1D = (z) => -8 * z * D(z) - 8 * w * N(z);                    // N′D − ND′
    return { sx: 1, sy: 1, top: L / 2, scale: Math.max(L, p.eggB),
             g: (z) => k * N(z) / D(z), g1: (z) => k * N1D(z) / D(z) ** 2,
             g2: (z) => k * (-8 / D(z) - 16 * w * N1D(z) / D(z) ** 3) };
  }
  const r = p.r;
  return { sx: 1, sy: 1, top: r, scale: r, g: (z) => r * r - z * z, g1: (z) => -2 * z, g2: () => -2 };
}

const surfF = (S, x) => x[0] * x[0] / (S.sx * S.sx) + x[1] * x[1] / (S.sy * S.sy) - S.g(x[2]);
const gradF = (S, x) => [2 * x[0] / (S.sx * S.sx), 2 * x[1] / (S.sy * S.sy), -S.g1(x[2])];
const hessF = (S, x, v) => [2 * v[0] / (S.sx * S.sx), 2 * v[1] / (S.sy * S.sy), -S.g2(x[2]) * v[2]];

/** Back onto the surface (Newton along the gradient), and a direction into its tangent plane at unit length. */
function onSurface(S, x) {
  for (let k = 0; k < 3; k++) { const gr = gradF(S, x); x = sub(x, mul(gr, surfF(S, x) / dot(gr, gr))); }
  return x;
}
const inTangent = (S, x, v) => { const n = norm(gradF(S, x)); return norm(sub(v, mul(n, dot(v, n)))); };

/** A sample of a geodesic at x heading v: outward normal n, width direction w (in the skin, square to
    the lath), normal curvature kn (negative bends inward) and geodesic torsion tg (twist per metre). */
function geoSample(S, s, x, v) {
  const gr = gradF(S, x), G = len(gr), n = mul(gr, 1 / G), Hv = hessF(S, x, v);
  const dn = mul(sub(Hv, mul(n, dot(Hv, n))), 1 / G);                     // how the normal turns along the lath
  const w = norm(cross(n, v));
  return { s, p: x, n, T: v, w, kn: -dot(v, Hv) / G, tg: dot(dn, w) };
}

/** A geodesic from x0 heading d0, by RK4 in arc length with steps of h, held on the surface. It stops
    where it comes down to the height `floor` (landing on it exactly) or after maxLen. A geodesic's
    acceleration is all along the normal: x″ = −(x′ᵀ∇²F x′ / |∇F|²) ∇F. */
function traceGeodesic(S, x0, d0, h, maxLen, floor = -Infinity) {
  const acc = (x, v) => { const gr = gradF(S, x); return mul(gr, -dot(v, hessF(S, x, v)) / dot(gr, gr)); };
  const step = (x, v, dt) => {
    const a1 = acc(x, v);
    const x2 = add(x, mul(v, dt / 2)), v2 = add(v, mul(a1, dt / 2)), a2 = acc(x2, v2);
    const x3 = add(x, mul(v2, dt / 2)), v3 = add(v, mul(a2, dt / 2)), a3 = acc(x3, v3);
    const x4 = add(x, mul(v3, dt)), v4 = add(v, mul(a3, dt)), a4 = acc(x4, v4);
    const xn = add(x, mul(add(add(v, mul(v2, 2)), add(mul(v3, 2), v4)), dt / 6));
    const vn = add(v, mul(add(add(a1, mul(a2, 2)), add(mul(a3, 2), a4)), dt / 6));
    const xs = onSurface(S, xn);
    return [xs, inTangent(S, xs, vn)];
  };
  let x = onSurface(S, x0), v = inTangent(S, x, d0), s = 0;
  const samples = [geoSample(S, 0, x, v)];
  while (s < maxLen) {
    let [xn, vn] = step(x, v, h);
    if (xn[2] <= floor) {
      const f = (x[2] - floor) / (x[2] - xn[2]);
      [xn, vn] = step(x, v, f * h);
      samples.push(geoSample(S, s + f * h, xn, vn));
      return { samples, landed: true };
    }
    s += h; x = xn; v = vn;
    samples.push(geoSample(S, s, x, v));
  }
  return { samples, landed: false };
}

/** The surface's sample at arc length s along a polyline of samples (interpolated, then put back on it). */
function sampleAt(S, samples, s) {
  let k = 1;
  while (k < samples.length - 1 && samples[k].s < s) k++;
  const a = samples[k - 1], b = samples[k], f = (s - a.s) / ((b.s - a.s) || 1);
  const x = onSurface(S, add(a.p, mul(sub(b.p, a.p), f)));
  return geoSample(S, s, x, inTangent(S, x, add(a.T, mul(sub(b.T, a.T), f))));
}

/** The ridge: the line over the top along the plan's long axis, from base to base. It is a geodesic
    (it lies in a plane of symmetry), traced both ways from the top. */
function ridgeOf(S, tBase, h, maxLen) {
  const along = S.sy >= S.sx ? [0, 1, 0] : [1, 0, 0], top = [0, 0, S.top];
  const fore = traceGeodesic(S, top, along, h, maxLen, tBase), back = traceGeodesic(S, top, mul(along, -1), h, maxLen, tBase);
  const Lb = back.samples[back.samples.length - 1].s;
  const samples = [
    ...back.samples.slice().reverse().map((q) => ({ ...q, s: Lb - q.s, T: mul(q.T, -1), w: mul(q.w, -1) })),
    ...fore.samples.slice(1).map((q) => ({ ...q, s: Lb + q.s })),
  ];
  return { along, samples, length: samples[samples.length - 1].s };
}

/** An over-the-top lath crossing the ridge at arc length sigma, at angle beta from the fall line there:
    traced down both sides to the base. It runs from its start end (on the side the ridge's across
    direction points away from) over the ridge to its far end. Family A turns anticlockwise going up,
    seen from above, as on the crown layout; B is its mirror image. */
function overLath(S, ridge, sigma, beta, family, tBase, h, maxLen) {
  const q = sampleAt(S, ridge.samples, sigma);
  const across = norm(cross(q.T, q.n)), sgn = family === 'A' ? -1 : 1;
  const d = add(mul(across, Math.cos(beta)), mul(q.T, sgn * Math.sin(beta)));
  const fore = traceGeodesic(S, q.p, d, h, maxLen, tBase), back = traceGeodesic(S, q.p, mul(d, -1), h, maxLen, tBase);
  if (!fore.landed || !back.landed) return null;
  const Lb = back.samples[back.samples.length - 1].s;
  const samples = [
    ...back.samples.slice().reverse().map((x) => ({ ...x, s: Lb - x.s, T: mul(x.T, -1), w: mul(x.w, -1) })),
    ...fore.samples.slice(1).map((x) => ({ ...x, s: Lb + x.s })),
  ];
  return { family, sigma, ridgeS: Lb, samples, length: samples[samples.length - 1].s };
}

/** Every point where a lath of set P crosses a lath of set Q (or, with same = true, two laths of one
    set cross each other). The laths are polylines on the skin: each pair of nearby segments is
    intersected in the tangent plane there. Returns { a, b, sa, sb, p, angle } with the laths' indices,
    the distances along each, the point and the angle between them (both run start to end). */
function crossingsOf(P, Q, h, same = false) {
  // a grid of cells 2h across; each segment of Q is filed in every cell its bounding box touches
  const cell = 2 * h, pad = 1e-4, ix = (v) => Math.floor(v / cell);
  const cellsOf = (a, b, f) => {
    const lo = [0, 1, 2].map((d) => ix(Math.min(a[d], b[d]) - pad)), hi = [0, 1, 2].map((d) => ix(Math.max(a[d], b[d]) + pad));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) f(((x + 4096) * 8192 + y + 4096) * 8192 + z + 4096);
  };
  const grid = new Map(), segLath = [], segK = [];
  Q.forEach((l, j) => {
    for (let k = 0; k + 1 < l.samples.length; k++) {
      const g = segLath.length;
      segLath.push(j); segK.push(k);
      cellsOf(l.samples[k].p, l.samples[k + 1].p, (id) => { const list = grid.get(id); if (list) list.push(g); else grid.set(id, [g]); });
    }
  });
  const stamp = new Int32Array(segLath.length).fill(-1), out = [], eps = 1e-9;
  let tick = 0;
  P.forEach((l, i) => {
    const mine = [];
    for (let k = 0; k + 1 < l.samples.length; k++, tick++) {
      const a0 = l.samples[k], a1 = l.samples[k + 1];
      let e1 = sub(a1.p, a0.p);
      const La = len(e1); e1 = mul(e1, 1 / La);
      const e2 = norm(cross(add(a0.n, a1.n), e1));
      cellsOf(a0.p, a1.p, (id) => {
        const list = grid.get(id);
        if (!list) return;
        for (const g of list) {
          if (stamp[g] === tick) continue;
          stamp[g] = tick;
          const j = segLath[g];
          if (same && j <= i) continue;
          const b0 = Q[j].samples[segK[g]], b1 = Q[j].samples[segK[g] + 1];
          const r0 = sub(b0.p, a0.p), r1 = sub(b1.p, a0.p);
          const y0 = dot(r0, e2), y1 = dot(r1, e2);
          if ((y0 > 0 && y1 > 0) || (y0 < 0 && y1 < 0) || y0 === y1) continue;
          const v = y0 / (y0 - y1), u = (dot(r0, e1) + v * (dot(r1, e1) - dot(r0, e1))) / La;
          if (u < -eps || u > 1 + eps || v < -eps || v > 1 + eps) continue;
          const pa = add(a0.p, mul(sub(a1.p, a0.p), u)), pb = add(b0.p, mul(sub(b1.p, b0.p), v));
          if (len(sub(pa, pb)) > h) continue;
          const sa = a0.s + u * (a1.s - a0.s), sb = b0.s + v * (b1.s - b0.s);
          if (mine.some((x) => x.b === j && Math.abs(x.sa - sa) < 2 * h)) continue;
          const Ta = norm(add(a0.T, mul(sub(a1.T, a0.T), u))), Tb = norm(add(b0.T, mul(sub(b1.T, b0.T), v)));
          mine.push({ a: i, b: j, sa, sb, p: mul(add(pa, pb), 0.5),
                      angle: Math.acos(Math.max(-1, Math.min(1, dot(Ta, Tb)))) * R2D });
        }
      });
    }
    out.push(...mine);
  });
  return out;
}

/** Bend check: unglued plies slide on each other, so each bends on its own thickness. */
function bendCheck(p, maxKn, maxTwist) {
  const E = p.lathE, fb = p.lathFb, tPly = p.lathT;
  const maxStress = E * maxKn * tPly / 2;                                 // MPa, with E in GPa, κ in 1/m, t in mm
  return { minRadius: 1 / maxKn, maxStress, allowable: fb, ratio: maxStress / fb, maxPly: 2 * fb / (E * maxKn), maxTwist,
           plies: p.lathPlies, ply: tPly, width: p.lathW, E };
}

const circle = (radius, z) => Array.from({ length: 128 }, (_, k) => {
  const a = k / 128 * 2 * Math.PI; return [radius * Math.cos(a), radius * Math.sin(a), z];
});

/** The crown layout, on round plans: every lath alike, from the base ring up to the crown ring. */
function buildCrown(p, prof, f) {
  const tBase = (1 - 2 * f) * prof.top;
  const rhoBase = prof.rho(tBase);
  if (!(rhoBase > 0.05 * prof.scale)) return { ok: false, reason: 'A gridshell needs a base ring: choose a cut smaller than the full shape.' };
  const N = Math.max(3, Math.round(p.lathN)), psi = Math.min(80, Math.max(2, p.lathAngle)) / R2D;
  const lath = traceLath(prof, tBase, psi);
  const S = lath.samples, apex = S[S.length - 1];
  // crossings: where the lath has turned through a multiple of π/N (k = 0 is the shared start on the base ring)
  const nodes = [];
  for (let k = 0; k * Math.PI / N <= apex.th + 1e-12; k++) {
    const q = atAzimuth(S, k * Math.PI / N), sinPsi = lath.c / q.rho;
    nodes.push({ k, s: q.s, t: q.t, rise: q.t - tBase, angle: 2 * Math.asin(Math.min(1, sinPsi)) * R2D,
                 radius: Math.abs(q.kn) > 1e-12 ? 1 / Math.abs(q.kn) : Infinity });
  }
  const maxKn = Math.max(...S.map((q) => Math.abs(q.kn))), maxTwist = Math.max(...S.map((q) => Math.abs(q.tg))) * R2D;
  const G = {
    ok: true, layout: 'crown', prof, N, psi, c: lath.c, tBase, rhoBase, tCrown: apex.t, crownTurn: apex.th,
    lath, length: apex.s, nodes, bend: bendCheck(p, maxKn, maxTwist),
  };
  G.crossings = N * (nodes.length - 1);                                  // A–B crossings above the base ring
  const marks = nodes.slice(1).map((n) => ({ s: n.s }));
  G.laths = ['A', 'B'].flatMap((family, g) => Array.from({ length: N }, (_, i) => ({ family, i, type: g, length: G.length, crossings: marks })));
  G.types = ['A · outer', 'B · inner'].map((label, g) => ({ label, rep: G.laths[g * N], members: G.laths.filter((l) => l.type === g),
                                                           length: G.length, marks: marks.map((m) => m.s), crossings: marks.length }));
  G.joints = [];
  for (let i = 0; i < N; i++) for (const n of nodes) G.joints.push(surfacePoint(prof, n.t, 2 * Math.PI * i / N + n.k * Math.PI / N));
  G.outlines = [circle(rhoBase, tBase), circle(lath.c, apex.t)];
  return G;
}

/** A lath cut down to the part between distances `from` and `to` along it, measured again from its new start. */
function cutLath(S, l, from, to) {
  if (from <= 0 && to >= l.length) return l;
  const inside = l.samples.filter((q) => q.s > from && q.s < to);
  const samples = [sampleAt(S, l.samples, from), ...inside, sampleAt(S, l.samples, to)].map((q) => ({ ...q, s: q.s - from }));
  return { ...l, samples, length: to - from, ridgeS: l.ridgeS - from };
}

/** Group laths that need the same drilling template: the same length and the same crossing marks, to the
    millimetre, read from either end. B laths, mirror images, share their A lath's template turned over. */
function groupLaths(laths) {
  const types = [], tol = 0.001;
  const fits = (a, b) => a.length === b.length && a.every((x, k) => Math.abs(x - b[k]) <= tol);
  for (const l of laths) {
    const fwd = l.crossings.map((c) => c.s), rev = fwd.map((s) => l.length - s).reverse();
    const ty = types.find((t) => Math.abs(t.length - l.length) <= tol && (fits(t.marks, fwd) || fits(t.marks, rev)));
    if (ty) { l.reversed = !fits(ty.marks, fwd); ty.members.push(l); continue; }
    l.reversed = false;
    types.push({ rep: l, length: l.length, marks: fwd, crossings: fwd.length, members: [l] });
  }
  types.sort((a, b) => b.members.length - a.members.length || b.length - a.length);
  types.forEach((t, g) => { t.label = 'L' + (g + 1); for (const l of t.members) l.type = g; });
  return types;
}

/** The over-the-top layout, on any shape: laths cross the ridge at even spacing, at the lath angle from
    the fall line there, and run down both sides to the base. Where two laths of one family converge
    and would cross (they do near the ends, where the shell is most curved), the one that has run
    further from the ridge stops on the other. */
function buildOver(p, f) {
  const S = surfaceOf(p), tBase = (1 - 2 * f) * S.top, g0 = S.g(tBase);
  const base = [S.sx * Math.sqrt(Math.max(0, g0)), S.sy * Math.sqrt(Math.max(0, g0))];
  if (!(Math.min(...base) > 0.05 * S.scale)) return { ok: false, reason: 'A gridshell needs a base: choose a cut smaller than the full shape.' };
  const N = Math.max(3, Math.round(p.lathN)), psi = Math.min(80, Math.max(2, p.lathAngle)) / R2D;
  const h = Math.min(0.02, S.scale / 200), maxLen = 4 * Math.PI * S.scale;
  const ridge = ridgeOf(S, tBase, h, maxLen), spacing = ridge.length / N;
  let laths = [];
  for (const family of ['A', 'B']) for (let i = 0; i < N; i++) {
    const l = overLath(S, ridge, (i + 0.5) * spacing, psi, family, tBase, h, maxLen);
    if (!l) return { ok: false, reason: 'Some laths wind round the shape without coming back down to the base. Lower the lath angle.' };
    laths.push({ ...l, i, from: 0, to: l.length, startOn: null, endOn: null });
  }
  // converging laths of one family: the one further from the ridge stops on the other
  let trimmed = 0;
  for (const family of ['A', 'B']) {
    const fam = laths.filter((l) => l.family === family);
    const meets = crossingsOf(fam, fam, h, true).map((c) => {
      const da = Math.abs(c.sa - fam[c.a].ridgeS), db = Math.abs(c.sb - fam[c.b].ridgeS);
      return da > db || (da === db && c.a > c.b) ? { l: fam[c.a], s: c.sa, d: da, on: fam[c.b], onS: c.sb }
                                                  : { l: fam[c.b], s: c.sb, d: db, on: fam[c.a], onS: c.sa };
    }).sort((a, b) => a.d - b.d);
    const kept = (l, s) => s >= l.from - 1e-9 && s <= l.to + 1e-9;
    for (const m of meets) {
      if (!kept(m.l, m.s) || !kept(m.on, m.onS)) continue;
      const at = { family, i: m.on.i, s: m.onS };
      if (m.s < m.l.ridgeS) { m.l.from = m.s; m.l.startOn = at; } else { m.l.to = m.s; m.l.endOn = at; }
      trimmed++;
    }
  }
  laths = laths.map((l) => {
    const c = cutLath(S, l, l.from, l.to);
    if (c.startOn) c.startOn = { ...c.startOn };
    if (c.endOn) c.endOn = { ...c.endOn };
    return { ...c, crossings: [] };
  });
  // the trimmed laths' "stops on" points, measured along the laths as cut
  const byName = (family, i) => laths.find((l) => l.family === family && l.i === i);
  for (const l of laths) for (const end of [l.startOn, l.endOn]) if (end) end.s -= byName(end.family, end.i).from || 0;
  const A = laths.filter((l) => l.family === 'A'), B = laths.filter((l) => l.family === 'B');
  const joints = [];
  for (const c of crossingsOf(A, B, h)) {
    const a = A[c.a], b = B[c.b], rise = c.p[2] - tBase;
    const kn = (l, s) => { const q = l.samples.reduce((x, y) => (Math.abs(y.s - s) < Math.abs(x.s - s) ? y : x)); return Math.abs(q.kn); };
    a.crossings.push({ s: c.sa, with: b, angle: c.angle, rise, radius: 1 / kn(a, c.sa), p: c.p });
    b.crossings.push({ s: c.sb, with: a, angle: c.angle, rise, radius: 1 / kn(b, c.sb), p: c.p });
    joints.push(c.p);
  }
  for (const l of laths) l.crossings.sort((x, y) => x.s - y.s);
  let maxKn = 0, maxTwist = 0;
  for (const l of laths) for (const q of l.samples) { maxKn = Math.max(maxKn, Math.abs(q.kn)); maxTwist = Math.max(maxTwist, Math.abs(q.tg)); }
  const lengths = laths.map((l) => l.length);
  const G = {
    ok: true, layout: 'over', surf: S, N, psi, tBase, base, h,
    ridge: { length: ridge.length, spacing, along: ridge.along, points: ridge.samples.map((q) => q.p) },
    laths, joints, crossings: joints.length, trimmed,
    length: Math.max(...lengths), shortest: Math.min(...lengths),
    bend: bendCheck(p, maxKn, maxTwist * R2D),
    outlines: [Array.from({ length: 160 }, (_, k) => { const a = k / 160 * 2 * Math.PI; return [base[0] * Math.cos(a), base[1] * Math.sin(a), tBase]; })],
  };
  G.types = groupLaths(laths);
  return G;
}

/** Where one lath's plies are joined, laid from stock lengths. Each ply runs end to end from stock; ply k
    starts with a piece k/plies of a length short, so the joints in neighbouring plies are staggered and
    each joint is bridged by the other plies. A joint that would fall within `clear` of a crossing (a
    bolt) moves back toward the start until it is clear, and a short last piece pulls the last joint back.
    Returns the joint positions and the piece lengths of each ply, in metres. */
function spliceRuns(L, marks, stock, plies, clear, minPiece) {
  const runs = [];
  for (let k = 0; k < plies; k++) {
    const joints = [];
    const clearOf = (at, lo) => {
      for (let guard = 0; guard < 100; guard++) {
        const m = marks.find((x) => Math.abs(x - at) < clear - 1e-9);
        if (m === undefined) return at;
        at = m - clear;
        if (at < lo) return null;
      }
      return null;
    };
    let prev = 0, target = stock * (1 - k / plies);
    while (target < L - 1e-9) {
      const at = clearOf(target, prev + minPiece);
      joints.push(at === null ? target : at);
      prev = joints[joints.length - 1]; target = prev + stock;
    }
    if (joints.length && L - joints[joints.length - 1] < minPiece) {
      const lo = (joints.length > 1 ? joints[joints.length - 2] : 0) + minPiece, at = clearOf(L - minPiece, lo);
      if (at !== null && at >= lo) joints[joints.length - 1] = at;
    }
    const ends = [0, ...joints, L];
    runs.push({ joints, pieces: ends.slice(1).map((x, j) => x - ends[j]) });
  }
  return runs;
}

/** Splice every lath type from stock lengths, and count the stock lengths a cutting list needs: whole
    lengths go in as they are, and the cut pieces are packed into lengths largest first (with a saw kerf). */
function spliceLaths(G, p) {
  const stock = p.lathStock / 1000, plies = Math.max(1, Math.round(p.lathPlies)), kerf = 0.003;
  const clear = Math.max(0.1, 2 * p.lathW / 1000), minPiece = Math.min(0.6, stock / 4);
  const cuts = [];
  let joins = 0, pieces = 0, whole = 0;
  for (const t of G.types) {
    t.splice = spliceRuns(t.length, t.marks, stock, plies, clear, minPiece);
    t.joins = t.splice.reduce((n, r) => n + r.joints.length, 0);
    const all = t.splice.flatMap((r) => r.joints), mine = t.splice.map((r) => r.joints);
    let stagger = Infinity;
    mine.forEach((js, k) => mine.forEach((other, j) => { if (j > k) for (const a of js) for (const b of other) stagger = Math.min(stagger, Math.abs(a - b)); }));
    t.stagger = all.length ? stagger : Infinity;
    for (const r of t.splice) for (const x of r.pieces) {
      pieces += t.members.length;
      if (x >= stock - 1e-6) whole += t.members.length;
      else for (let m = 0; m < t.members.length; m++) cuts.push(x);
    }
    joins += t.joins * t.members.length;
  }
  cuts.sort((a, b) => b - a);
  const bins = [];
  for (const x of cuts) {
    const b = bins.find((left) => left >= x + kerf - 1e-9);
    if (b !== undefined) bins[bins.indexOf(b)] -= x + kerf; else bins.push(stock - x - kerf);
  }
  const lengths = whole + bins.length, total = G.types.reduce((m, t) => m + t.length * t.members.length, 0) * plies;
  return { stock, plies, clear, minPiece, kerf, joins, pieces, lengths, whole, cutFrom: bins.length,
           waste: lengths * stock - total, price: p.lathPrice, cost: lengths * p.lathPrice, timber: total };
}

/** Lath k of G.laths as 3D samples { p, n, w, s }: point, outward normal, width direction and distance
    along the lath, pushed off the skin along the normal by `off`. */
function lathPoints(G, k, off = 0) {
  const l = G.laths[k];
  if (G.layout === 'crown') return lathPath(G, l.family, l.i, off).map((x, j) => ({ ...x, s: G.lath.samples[j].s }));
  return l.samples.map((q) => ({ p: off ? add(q.p, mul(q.n, off)) : q.p, n: q.n, w: q.w, s: q.s }));
}

/** The gridshell for a design: its laths, their crossings and the bend check. Round plans take the
    crown layout unless the over-the-top one is chosen; other plans always go over the top. */
function buildGridshell(p) {
  const f = parsePartial(effectivePartial(p)).value;
  const prof = revolutionProfile(p);
  const G = p.lathLayout !== 'over' && prof ? buildCrown(p, prof, f) : buildOver(p, f);
  G.round = !!prof;
  if (G.ok) G.stock = spliceLaths(G, p);
  return G;
}

DomeZ.gridshell = {
  revolutionProfile, traceLath, surfacePoint, lathPath, buildGridshell,
  surfaceOf, traceGeodesic, ridgeOf, overLath, crossingsOf, lathPoints, spliceRuns,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
