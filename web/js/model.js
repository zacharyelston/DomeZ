/* DomeZ · model: A design (the viewer's state) to its mesh, its strut, hub and panel types, and its lumber or gridshell. */
(function (DomeZ) {
'use strict';
const { sub, dot, cross, len } = DomeZ.vec;
const { lineOrderOf, compact, edgesOf } = DomeZ.mesh;
const { pythonGeodesic, acidomeBase, METHODS, effectiveMethod } = DomeZ.geodesic;
const { parsePartial, effectivePartial, pythonCut, acSliceByFraction, acSliceByAxis, flattenBase } = DomeZ.cut;
const { shapeTransform } = DomeZ.shape;
const { groupStruts, typeHubsAndPanels } = DomeZ.types;
const { buildJointLumber } = DomeZ.lumber;
const { buildGridshell } = DomeZ.gridshell;

/** The whole unit-sphere mesh (z-up, outward winding) before the cut, with the cut's keep flags and
    Acidome's line order. Acidome builds boards on the whole mesh and only then drops cut faces. */
function buildUnitFull(p) {
  const frac = parsePartial(effectivePartial(p));
  const f = Math.max(1, p.freq | 0);
  let mesh, keep, lineOrder;
  if (p.method === 'flat') {
    mesh = pythonGeodesic(p.base, p.sym, f);
    keep = pythonCut(mesh, frac.value);
    if (p.flat && frac.value < 1) flattenBase(mesh, keep, 2);
    lineOrder = lineOrderOf(mesh.tris, 'abc');
  } else {
    const method = effectiveMethod(p);
    mesh = METHODS[method].build(acidomeBase(p.base, p.sym), f);
    lineOrder = lineOrderOf(mesh.tris, method === 'arcs' || method === 'mexican' ? 'bca' : 'abc');
    if (frac.value >= 1) keep = mesh.tris.map(() => true);
    else keep = p.sym === 'pentad' ? acSliceByFraction(mesh, frac) : acSliceByAxis(mesh, frac);
    if (p.flat && frac.value < 1) flattenBase(mesh, keep, 1);
    // y-up -> z-up, and flip Acidome's inward winding so faces point out.
    mesh = { pts: mesh.pts.map((q) => [q[0], -q[2], q[1]]), tris: mesh.tris.map((t) => [t[0], t[2], t[1]]) };
  }
  return { pts: mesh.pts, tris: mesh.tris, keep, lineOrder };
}

/** Unit-sphere mesh after subdivision, cut and optional base flattening, z-up. */
function buildUnitGeodesic(p) {
  const full = buildUnitFull(p);
  return compact({ pts: full.pts, tris: full.tris.filter((t, i) => full.keep[i]) });
}

function buildModel(p) {
  const full = buildUnitFull(p);
  const T = shapeTransform(p);
  full.unit = full.pts;
  full.pts = full.unit.map(T);
  const mesh = compact({ pts: full.pts, tris: full.tris.filter((t, i) => full.keep[i]) });
  const pts = mesh.pts;
  const tris = mesh.tris;
  const { edges } = edgesOf(tris, pts.length);
  const lengths = edges.map(([a, b]) => len(sub(pts[a], pts[b])));
  const { groups, groupOf } = groupStruts(lengths, p.tol / 1000);

  const degree = new Int32Array(pts.length);
  for (const [a, b] of edges) { degree[a]++; degree[b]++; }
  const hubs = {};
  for (const d of degree) hubs[d] = (hubs[d] || 0) + 1;

  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const q of pts) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], q[k]); max[k] = Math.max(max[k], q[k]); }
  const origin = [0, 0, min[2]];
  let area = 0, vol = 0;
  for (const [a, b, c] of tris) {
    const A = pts[a], B = pts[b], C = pts[c];
    area += len(cross(sub(B, A), sub(C, A))) / 2;
    vol += dot(sub(A, origin), cross(sub(B, origin), sub(C, origin))) / 6;
  }
  return { pts, tris, edges, lengths, groups, groupOf, hubs, min, max, area, volume: Math.abs(vol),
           totalLength: lengths.reduce((s, l) => s + l, 0), ...typeHubsAndPanels(pts, tris, edges, groupOf, groups),
           full, lumber: p.frame === 'joint' || p.frame === 'joint-ccw' ? buildJointLumber(full, p) : null,
           gridshell: p.frame === 'gridshell' ? buildGridshell(p) : null };
}

DomeZ.model = {
  buildUnitFull, buildUnitGeodesic, buildModel,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
