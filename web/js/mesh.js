/* DomeZ · mesh: Triangle-mesh bookkeeping: edges, face neighbours, compaction and Acidome's line order. */
(function (DomeZ) {
'use strict';

/** Each edge once, in the order the mesh builder creates it, as Acidome stores its lines. Its first
    line of each board type is the one Acidome draws. */
function lineOrderOf(tris, style) {
  const seen = new Set(), order = [];
  for (const [a, b, c] of tris) {
    const pairs = style === 'bca' ? [[b, c], [c, a], [a, b]] : [[a, b], [b, c], [c, a]];
    for (const [u, v] of pairs) {
      const k = u < v ? u + ',' + v : v + ',' + u;
      if (!seen.has(k)) { seen.add(k); order.push([u, v]); }
    }
  }
  return order;
}

/** Drop vertices no face uses, keeping the original order. */
function compact(mesh) {
  const used = new Uint8Array(mesh.pts.length);
  for (const t of mesh.tris) for (const i of t) used[i] = 1;
  const remap = new Int32Array(mesh.pts.length).fill(-1);
  const pts = [];
  mesh.pts.forEach((q, i) => { if (used[i]) { remap[i] = pts.length; pts.push(q); } });
  return { pts, tris: mesh.tris.map((t) => t.map((i) => remap[i])) };
}

function edgesOf(tris, n) {
  const seen = new Map();
  const edges = [];
  const faceCount = [];
  for (const t of tris) {
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3];
      const key = a < b ? a * n + b : b * n + a;
      const e = seen.get(key);
      if (e === undefined) { seen.set(key, edges.length); edges.push(a < b ? [a, b] : [b, a]); faceCount.push(1); }
      else faceCount[e]++;
    }
  }
  return { edges, faceCount };
}

/** Faces sharing each edge, for the wave cut. */
function faceNeighbours(tris, n) {
  const byEdge = new Map();
  tris.forEach((t, f) => {
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3];
      const key = a < b ? a * n + b : b * n + a;
      if (!byEdge.has(key)) byEdge.set(key, []);
      byEdge.get(key).push(f);
    }
  });
  const nb = tris.map(() => []);
  for (const fs of byEdge.values()) for (const f of fs) for (const g of fs) if (f !== g) nb[f].push(g);
  return nb;
}

DomeZ.mesh = {
  lineOrderOf, compact, edgesOf, faceNeighbours,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
