/* DomeZ · geodesic: Geodesic spheres (pure functions on a unit sphere).

   Two pipelines produce the same kind of mesh:
   - "flat": the flat-grid subdivision of domez/dome.py (z-up), so its meshes match the Python
     tools face for face.
   - Chords, Arcs, Mexican, Kruschke: ported from the Acidome calculator (acidome.ru/lab/calc,
     by popitch), with its base solids and orientations. Acidome works y-up; model.js turns the
     result z-up.
 */
(function (DomeZ) {
'use strict';
const { PHI, add, sub, mul, dot, cross, len, norm, rotX, rotY, rotZ } = DomeZ.vec;
const { edgesOf } = DomeZ.mesh;

const SYMMETRY_OPTIONS = [
  { v: 'pentad', label: 'Pentad · vertex up' },
  { v: 'cross', label: 'Cross · edge up' },
  { v: 'triad', label: 'Triad · face up' },
];

// Same vertex and face lists as domez/dome.py.
const PY_ICOSA = {
  verts: [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI],
          [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]],
  faces: [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
          [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]],
};

const PY_OCTA = {
  verts: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  faces: [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]],
};

// The Python icosahedron has an edge up (Cross); its octahedron has a vertex up (Pentad).
const PY_ORIENT = {
  icosahedron: { pentad: (p) => rotX(p, Math.atan2(1, PHI)), cross: (p) => p, triad: (p) => rotY(p, -Math.atan2(PHI, 2 * PHI + 1)) },
  octahedron: { pentad: (p) => p, cross: (p) => rotX(p, Math.PI / 4), triad: (p) => rotY(rotZ(p, -Math.PI / 4), -Math.atan2(Math.SQRT2, 1)) },
};

const PY_NATIVE_SYM = { icosahedron: 'cross', octahedron: 'pentad' };

function pythonGeodesic(base, sym, f) {
  const src = base === 'octahedron' ? PY_OCTA : PY_ICOSA;
  const o = PY_ORIENT[base][sym] || ((p) => p);
  const verts = src.verts.map((v) => o(norm(v)));
  const keyIndex = new Map();
  const pts = [];
  const tris = [];
  const idx = (q) => {
    const k = Math.round(q[0] * 1e6) + ',' + Math.round(q[1] * 1e6) + ',' + Math.round(q[2] * 1e6);
    let i = keyIndex.get(k);
    if (i === undefined) { i = pts.length; keyIndex.set(k, i); pts.push(q); }
    return i;
  };
  for (const [a, b, c] of src.faces) {
    const A = verts[a], B = verts[b], C = verts[c];
    const g = [];
    for (let i = 0; i <= f; i++) {
      g[i] = [];
      for (let j = 0; j <= f - i; j++) g[i][j] = norm(add(add(mul(A, (f - i - j) / f), mul(B, i / f)), mul(C, j / f)));
    }
    for (let i = 0; i < f; i++) {
      for (let j = 0; j < f - i; j++) {
        tris.push([idx(g[i][j]), idx(g[i + 1][j]), idx(g[i][j + 1])]);
        if (j < f - i - 1) tris.push([idx(g[i + 1][j]), idx(g[i + 1][j + 1]), idx(g[i][j + 1])]);
      }
    }
  }
  return { pts, tris };
}

const AC_A = 4 / Math.sqrt(2 * (5 + Math.sqrt(5))) / 2;

const AC_B = Math.sqrt(1 - AC_A * AC_A);

const AC_ICOSA = {
  verts: [[-AC_A, 0, AC_B], [AC_A, 0, AC_B], [-AC_A, 0, -AC_B], [AC_A, 0, -AC_B], [0, AC_B, AC_A], [0, AC_B, -AC_A],
          [0, -AC_B, AC_A], [0, -AC_B, -AC_A], [AC_B, AC_A, 0], [-AC_B, AC_A, 0], [AC_B, -AC_A, 0], [-AC_B, -AC_A, 0]],
  faces: [[0, 4, 1], [0, 9, 4], [9, 5, 4], [4, 5, 8], [4, 8, 1], [8, 10, 1], [8, 3, 10], [5, 3, 8], [5, 2, 3], [2, 7, 3],
          [7, 10, 3], [7, 6, 10], [7, 11, 6], [11, 0, 6], [0, 1, 6], [6, 1, 10], [9, 0, 11], [9, 11, 2], [9, 2, 5], [7, 2, 11]],
};

const AC_OCTA = {
  verts: [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]],
  faces: [[3, 5, 0], [4, 3, 0], [2, 4, 0], [5, 2, 0], [5, 3, 1], [3, 4, 1], [4, 2, 1], [2, 5, 1]],
};

// Acidome's Vector.rotate (note its sign convention).
function acRotate(p, t, axis) {
  const c = Math.cos(t), s = Math.sin(t);
  if (axis === 'x') return [p[0], p[1] * c + p[2] * s, p[2] * c - p[1] * s];
  if (axis === 'y') return [p[0] * c + p[2] * s, p[1], p[2] * c - p[0] * s];
  return [p[0] * c + p[1] * s, p[1] * c - p[0] * s, p[2]];
}

function acidomeBase(base, sym) {
  const src = base === 'octahedron' ? AC_OCTA : AC_ICOSA;
  let v = src.verts.map((p) => p.slice());
  if (base === 'octahedron') {
    if (sym === 'cross') v = v.map((p) => acRotate(p, Math.PI / 4, 'x'));
    if (sym === 'triad') { const beta = Math.acos(1 / Math.sqrt(3)); v = v.map((p) => acRotate(acRotate(p, Math.PI / 4, 'y'), -beta, 'x')); }
  } else {
    if (sym === 'pentad') v = v.map((p) => acRotate(p, Math.atan(AC_A / AC_B), 'x'));
    if (sym === 'triad') v = v.map((p) => acRotate(p, Math.asin(2 / (Math.sqrt(3) + Math.sqrt(15))), 'z'));
  }
  return { verts: v, faces: src.faces };
}

/** Acidome splitFaces: rows grow from each face's lowest-numbered corner; points are normalised chord midpoints. */
function acChords(base, N) {
  const pts = base.verts.map((p) => p.slice());
  const cache = new Map();
  const mid = (key, ai, bi, q) => {
    let v = cache.get(key);
    if (v !== undefined) return v;
    if (q === 0) v = ai;
    else if (q === 1) v = bi;
    else { pts.push(norm(add(mul(pts[ai], 1 - q), mul(pts[bi], q)))); v = pts.length - 1; }
    cache.set(key, v);
    return v;
  };
  const tris = [];
  for (const face of base.faces) {
    const f = face.slice();
    const mini = Math.min(...f);
    while (f[0] !== mini) f.push(f.shift());
    const [A, B, C] = f;
    let up = [A];
    for (let n = 1; n <= N; n++) {
      const li = mid(`${A}-${B}-${n}`, A, B, n / N);
      const ri = mid(`${A}-${C}-${n}`, A, C, n / N);
      const down = [];
      for (let i = 0; i <= n; i++) down.push(mid(li < ri ? `${li}-${ri}-${i}` : `${ri}-${li}-${n - i}`, li, ri, i / n));
      tris.push([up[0], down[0], down[1]]);
      for (let i = 1; i < up.length; i++) {
        tris.push([up[i], up[i - 1], down[i]]);
        tris.push([up[i], down[i], down[i + 1]]);
      }
      up = down;
    }
  }
  return { pts, tris };
}

/** Acidome Kruschke: Chords, then pull each spoke around the 12 base hubs to Kruschke's length (3V and 4V only). */
function acKruschke(base, N) {
  const mesh = acChords(base, N);
  const mr = N === 3 ? 0.9442890204731844 : 0.22219 / 0.253185 * 0.9983958444733023;
  const nBase = base.verts.length;
  for (const [a, b] of edgesOf(mesh.tris, mesh.pts.length).edges) {
    if ((a < nBase) === (b < nBase)) continue;
    const E = a < nBase ? a : b, S = a < nBase ? b : a;
    mesh.pts[S] = norm(add(mul(mesh.pts[E], 1 - mr), mul(mesh.pts[S], mr)));
  }
  return mesh;
}

/** Acidome splitFaces_EA: equal-arc edge points; each inner point is the spherical incentre of three great circles. */
function acArcs(base, N) {
  const pts = base.verts.map((p) => p.slice());
  const cache = new Map();
  const tris = [];
  const lines = new Map();
  const edgePoint = (a, b, i, key) => {
    key = key || (a < b ? `${a},${b},${i}` : `${b},${a},${N - i}`);
    if (i * 2 > N) return edgePoint(b, a, N - i, key);
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const A = pts[a], B = pts[b];
    let cos = dot(A, B) / (len(A) * len(B));
    if (Math.abs(cos - 1) < 1e-9) cos = 1; else if (Math.abs(cos + 1) < 1e-9) cos = -1;
    const Y = norm(sub(B, mul(A, cos)));
    const ang = Math.acos(cos) * i / N;
    pts.push(add(mul(Y, Math.sin(ang)), mul(A, Math.cos(ang))));
    cache.set(key, pts.length - 1);
    return pts.length - 1;
  };
  const addFace = (A, B, C, side) => {
    tris.push([A, B, C]);
    [[B, C], [C, A], [A, B]].forEach(([u, v], k) => {
      const key = u < v ? u * 1e7 + v : v * 1e7 + u;
      if (!lines.has(key)) lines.set(key, { a: u, b: v, side: side[k] });
    });
  };
  const circle = (u, v) => norm(cross(pts[u], pts[v]));
  for (const [A, B, C] of base.faces) {
    const seg = (a, b) => { const s = [a]; for (let i = 1; i < N; i++) s.push(edgePoint(a, b, i)); s.push(b); return s; };
    const AB = seg(A, B), BC = seg(B, C), CA = seg(C, A);
    let up = [A];
    for (let n = 1; n <= N; n++) {
      const down = [CA[N - n]];
      for (let i = 1; i < n; i++) {
        if (n === N) { down.push(BC[N - i]); continue; }
        const n1 = circle(AB[n], CA[N - n]), n2 = circle(BC[N - i], AB[i]), n3 = circle(CA[N - n + i], BC[n - i]);
        let x = norm(cross(sub(n1, n2), sub(n3, n2)));
        if (dot(x, pts[A]) < 0) x = mul(x, -1);
        pts.push(x);
        down.push(pts.length - 1);
      }
      down.push(AB[n]);
      for (let i = 0; i < n; i++) {
        addFace(up[i], down[i + 1], down[i], [n, N - i, N - n + i + 1]);
        if (i > 0) addFace(down[i], up[i - 1], up[i], [n - 1, N - i, N - n + i]);
      }
      up = down;
    }
  }
  return { pts, tris, lines: [...lines.values()] };
}

/** Acidome Mexican: Arcs, then equalise strut lengths within each grid-line family (300 passes max). */
function acMexican(base, N) {
  const mesh = acArcs(base, N);
  const pts = mesh.pts;
  const groups = new Map();
  for (const l of mesh.lines) { if (!groups.has(l.side)) groups.set(l.side, []); groups.get(l.side).push(l); }
  const ordered = [...groups.keys()].sort((a, b) => a - b).map((k) => groups.get(k));
  // Acidome means to push every hub back onto the sphere after each pass, but it collects the hubs with
  // underscore 1.8's flatten() on an object, which returns [], so nothing is renormalised and hubs drift
  // slightly outward (about 0.003% at 4V). We skip it too so lengths match what Acidome really outputs.
  let step = 0, delta;
  do {
    delta = 0;
    for (const l of mesh.lines) { l.d = sub(pts[l.a], pts[l.b]); l.len = len(l.d); }
    for (const g of ordered) {
      let mn = Infinity, mx = -Infinity, sum = 0;
      for (const l of g) { mn = Math.min(mn, l.len); mx = Math.max(mx, l.len); sum += l.len; }
      const diff = mx - mn;
      if (diff < 1e-12) continue;
      delta = Math.max(delta, diff);
      const avg = sum / g.length;
      for (const l of g) {
        const q = (avg - l.len) / l.len / 4;
        pts[l.a] = add(pts[l.a], mul(l.d, q));
        pts[l.b] = add(pts[l.b], mul(l.d, -q));
      }
    }
  } while (delta && ++step < 300);
  return mesh;
}

const ACIDOME_CREDIT = 'Subdivision ported from the Acidome calculator (acidome.ru/lab/calc, by popitch)';

const METHODS = {
  chords: {
    label: 'Chords (Acidome)', acidome: 'Chords', credit: ACIDOME_CREDIT,
    hint: 'Acidome’s “Equal Chords”: each row point is the normalised midpoint of two points already on the sphere, built out from one corner of each base triangle.',
    build: acChords,
  },
  arcs: {
    label: 'Arcs (Acidome)', acidome: 'Arcs', credit: ACIDOME_CREDIT,
    hint: 'Acidome’s “Equal Arcs”: base edges split into equal arcs; each inner hub is the spherical incentre of the three great circles through it.',
    build: acArcs,
  },
  mexican: {
    label: 'Mexican (Acidome)', acidome: 'Mexican', credit: ACIDOME_CREDIT,
    hint: 'Arcs, then struts on the same grid line are nudged to equal length (up to 300 passes, as in Acidome). Fewer strut types than Arcs.',
    build: acMexican,
  },
  kruschke: {
    label: 'Kruschke (Acidome)', acidome: 'Kruschke', credit: ACIDOME_CREDIT,
    hint: 'Chords, then the spokes around each pentagon hub are pulled to Kruschke’s length. Defined for 3V and 4V icosahedra only.',
    build: acKruschke,
  },
  flat: {
    label: 'Flat grid (DomeZ classic)', acidome: 'Chords',
    hint: 'Equal divisions of the flat base triangle pushed out to the sphere, keeping faces whose hubs are all above the cut. The original DomeZ generator; its native orientation is Cross for the icosahedron and Pentad for the octahedron.',
  },
};

/** Methods Acidome accepts for this base and frequency (its form falls back to Chords otherwise). */
function effectiveMethod(p) {
  if (p.method === 'kruschke' && !(p.base === 'icosahedron' && (p.freq === 3 || p.freq === 4))) return 'chords';
  return p.method;
}

DomeZ.geodesic = {
  SYMMETRY_OPTIONS, PY_NATIVE_SYM, pythonGeodesic, acidomeBase, acChords, acKruschke, acArcs, acMexican,
  ACIDOME_CREDIT, METHODS, effectiveMethod,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
