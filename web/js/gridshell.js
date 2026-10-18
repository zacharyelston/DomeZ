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
   crossings sit where it has turned through a multiple of π/N, at the same distances on A and B. */
(function (DomeZ) {
'use strict';
const { cross, norm, R2D } = DomeZ.vec;
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

/** The gridshell for a design: the lath shape, its crossings and the bend check. */
function buildGridshell(p) {
  const prof = revolutionProfile(p);
  if (!prof) return { ok: false, reason: 'A gridshell needs a round plan: set the ellipsoid’s X and Y radii equal.' };
  const f = parsePartial(effectivePartial(p)).value;
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
  // bend check: unglued plies slide on each other, so each bends on its own thickness
  const E = p.lathE, fb = p.lathFb, tPly = p.lathT;
  const maxStress = E * maxKn * tPly / 2;                                 // MPa, with E in GPa, κ in 1/m, t in mm
  const G = {
    ok: true, prof, N, psi, c: lath.c, tBase, rhoBase, tCrown: apex.t, crownTurn: apex.th,
    lath, length: apex.s, nodes,
    bend: { minRadius: 1 / maxKn, maxStress, allowable: fb, ratio: maxStress / fb, maxPly: 2 * fb / (E * maxKn), maxTwist,
            plies: p.lathPlies, ply: tPly, width: p.lathW, E },
  };
  G.crossings = N * (nodes.length - 1);                                  // A–B crossings above the base ring
  return G;
}

DomeZ.gridshell = {
  revolutionProfile, traceLath, surfacePoint, lathPath, buildGridshell,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
