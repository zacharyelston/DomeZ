/* DomeZ · cut: Partial domes: the fractions Acidome offers, its two cut rules, the flat grid's cut and the flat base. */
(function (DomeZ) {
'use strict';
const { len } = DomeZ.vec;
const { faceNeighbours } = DomeZ.mesh;

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** "7/12", "0.583" or "1" -> { value, p, q } (p and q only for fractions). */
function parsePartial(s) {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(s));
  if (m && +m[2] > 0) {
    const p = +m[1], q = +m[2], g = gcd(p, q) || 1;
    return { value: Math.min(1, p / q), p: p / g, q: q / g };
  }
  const v = parseFloat(s);
  return { value: Number.isFinite(v) ? Math.min(1, Math.max(0.01, v)) : 0.5 };
}

const fracText = (s) => { const f = parsePartial(s); return f.value >= 1 ? '1/1' : f.q ? `${f.p}/${f.q}` : String(+f.value.toFixed(3)); };

/** The fractions Acidome offers for a base and frequency: they land on complete rows of faces. */
function acidomePartials(base, V) {
  const list = [];
  if (base === 'octahedron') {
    const V2 = V * V;
    for (let p = 1; p <= V; p++) list.push([p * p, 2 * V2]);
    for (let p2 = 0, p = V; p >= 1; p--) { p2 += 2 * p - 1; list.push([V2 + p2, 2 * V2]); }
  } else {
    for (let p = V, q = V * 4; p <= V * 4; p += p !== V * 3 ? 2 : V) list.push([p, q]);
  }
  return list.map(([p, q]) => { const g = gcd(p, q); return `${p / g}/${q / g}`; });
}

/** Acidome snaps any other fraction to the nearest one it offers. */
function nearestAcidomePartial(base, V, value) {
  let best = '1/1', gap = Infinity;
  for (const c of acidomePartials(base, V)) {
    const d = Math.abs(parsePartial(c).value - value);
    if (d < gap - 1e-12) { gap = d; best = c; }
  }
  return best;
}

/** The fraction actually built: Acidome methods use Acidome's row fractions; the Python grid takes any value. */
function effectivePartial(p) {
  const f = parsePartial(p.partial);
  if (f.value >= 1) return '1/1';
  return p.method === 'flat' ? p.partial : nearestAcidomePartial(p.base, p.freq, f.value);
}

/** GeodesicDome.cut_to_partial: keep faces whose vertices are all at or above z = 1 - 2f. */
function pythonCut(mesh, frac) {
  if (frac >= 1) return mesh.tris.map(() => true);
  const h = 1 - 2 * frac;
  return mesh.tris.map((t) => t.every((i) => mesh.pts[i][2] >= h - 1e-9));
}

/** Acidome sliceByFraction: from the top hub, keep whole waves of edge-adjacent faces until the fraction is reached. */
function acSliceByFraction(mesh, frac) {
  const total = mesh.tris.length;
  let top = 0;
  mesh.pts.forEach((p, i) => { if (p[1] >= mesh.pts[top][1]) top = i; });
  const nb = faceNeighbours(mesh.tris, mesh.pts.length);
  const live = new Array(total).fill(false);
  let wave = mesh.tris.map((t, f) => (t.includes(top) ? f : -1)).filter((f) => f >= 0);
  let count = 0;
  while (count < frac.value * total - 1e-9 && wave.length) {
    const ready = new Set();
    for (const f of wave) { live[f] = true; count++; }
    for (const f of wave) for (const g of nb[f]) if (!live[g]) ready.add(g);
    wave = [...ready].sort((a, b) => a - b);
  }
  return live;
}

/** Acidome sliceByAxis: keep faces whose centroid is above y = 1 - 2f (plus faces whose vertices all belong to kept faces). */
function acSliceByAxis(mesh, frac) {
  const t = 1 - 2 * frac.value;
  const flagged = new Uint8Array(mesh.pts.length);
  for (const tri of mesh.tris) {
    const c = (mesh.pts[tri[0]][1] + mesh.pts[tri[1]][1] + mesh.pts[tri[2]][1]) / 3;
    if (Math.abs(c - t) > 1e-6 && c > t) for (const i of tri) flagged[i] = 1;
  }
  return mesh.tris.map((tri) => tri.every((i) => flagged[i]));
}

/** Acidome groundSliced: move boundary hubs along their meridians to the boundary height closest to the equator. */
function flattenBase(mesh, keep, axis) {
  const inKept = new Uint8Array(mesh.pts.length), inCut = new Uint8Array(mesh.pts.length);
  mesh.tris.forEach((t, f) => { for (const i of t) (keep[f] ? inKept : inCut)[i] = 1; });
  const boundary = [];
  for (let i = 0; i < mesh.pts.length; i++) if (inKept[i] && inCut[i]) boundary.push(i);
  if (!boundary.length) return;
  let aval = false;
  for (const i of boundary) {
    const y = mesh.pts[i][axis];
    aval = aval && Math.abs(aval) < Math.abs(y) ? aval : y;
  }
  for (const i of boundary) {
    const p = mesh.pts[i].slice();
    if (Math.abs(p[axis] - aval) <= 1e-6) continue;
    p[axis] = aval;
    const l = len(p);
    const q = Math.sqrt((1 - aval * aval) / (l * l - aval * aval));
    for (let k = 0; k < 3; k++) if (k !== axis) p[k] *= q;
    mesh.pts[i] = p;
  }
}

DomeZ.cut = {
  parsePartial, fracText, acidomePartials, nearestAcidomePartial, effectivePartial, pythonCut, acSliceByFraction, acSliceByAxis,
  flattenBase,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
