/* DomeZ · types: Strut, hub and panel types for the hub-to-hub (struts only) frame. */
(function (DomeZ) {
'use strict';
const { len } = DomeZ.vec;

const typeLabel = (k) => { let s = ''; k++; while (k > 0) { k--; s = String.fromCharCode(65 + (k % 26)) + s; k = Math.floor(k / 26); } return s; };

/** Group strut lengths: a new type starts when a length exceeds its group's shortest by more than tol. */
function groupStruts(lengths, tolM) {
  const order = lengths.map((l, i) => i).sort((a, b) => lengths[a] - lengths[b]);
  const eps = Math.max(tolM, 1e-9);
  const groups = [];
  const groupOf = new Int32Array(lengths.length);
  let cur = null;
  for (const i of order) {
    const l = lengths[i];
    if (!cur || l - cur.min > eps) { cur = { min: l, max: l, sum: 0, count: 0 }; groups.push(cur); }
    cur.max = l; cur.sum += l; cur.count++;
    groupOf[i] = groups.length - 1;
  }
  groups.forEach((g, k) => { g.mean = g.sum / g.count; g.label = typeLabel(k); });
  return { groups, groupOf };
}

/** Number groups of items by count (most first), then by key. Returns [{ no, key, items }]. */
function numberByCount(keyOf, n) {
  const groups = new Map();
  for (let i = 0; i < n; i++) { const k = keyOf(i); if (k === undefined) continue; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, items], i) => ({ no: i + 1, key, items }));
}

/** Hub and panel types for the cut sheet.
    A hub's type is the sequence of strut types around it, read anticlockwise from outside (an open
    fan for hubs on the cut edge). A panel's type is the strut types of its three sides; mirror-image
    panels count as one type because a flat panel can be turned over. */
function typeHubsAndPanels(pts, tris, edges, groupOf, groups) {
  const n = pts.length;
  const edgeIndex = new Map();
  edges.forEach(([a, b], k) => edgeIndex.set(a * n + b, k));
  const edgeOf = (a, b) => edgeIndex.get(a < b ? a * n + b : b * n + a);
  const next = Array.from({ length: n }, () => new Map());   // around hub P: next[P].get(A) = B for outward triangle P, A, B
  for (const [a, b, c] of tris) { next[a].set(b, c); next[b].set(c, a); next[c].set(a, b); }

  const hubKey = new Array(n), hubInfo = new Array(n);
  for (let p = 0; p < n; p++) {
    const around = next[p];
    if (!around.size) continue;
    const ends = new Set(around.values());
    let start = [...around.keys()].find((q) => !ends.has(q));
    const open = start !== undefined;
    if (!open) start = around.keys().next().value;
    const order = [start];
    for (let q = around.get(start); q !== undefined && q !== start; q = around.get(q)) order.push(q);
    const letters = order.map((q) => groups[groupOf[edgeOf(p, q)]].label);
    let seq = letters;
    if (!open) {
      let best = null;
      for (let r = 0; r < letters.length; r++) {
        const rot = letters.slice(r).concat(letters.slice(0, r));
        if (best === null || rot.join('-') < best.join('-')) best = rot;
      }
      seq = best;
    }
    hubKey[p] = (open ? 'edge:' : 'ring:') + seq.join('-');
    hubInfo[p] = { seq, open };
  }
  const hubTypes = numberByCount((p) => hubKey[p], n).map((t) => ({ ...t, ...hubInfo[t.items[0]], count: t.items.length }));
  const hubNo = new Int32Array(n);
  for (const t of hubTypes) for (const p of t.items) hubNo[p] = t.no;

  // which hub types each strut type joins
  const ends = groups.map(() => new Map());
  edges.forEach(([a, b], k) => {
    const pair = [hubNo[a], hubNo[b]].sort((x, y) => x - y).join('–');
    const m = ends[groupOf[k]];
    m.set(pair, (m.get(pair) || 0) + 1);
  });
  const strutEnds = ends.map((m) => [...m.entries()].sort((a, b) => b[1] - a[1]));

  const panelSides = tris.map(([a, b, c]) => [[a, b], [b, c], [c, a]].map(([u, v]) => groupOf[edgeOf(u, v)]).sort((x, y) => x - y));
  const panelTypes = numberByCount((i) => panelSides[i].map((g) => groups[g].label).join('-'), tris.length).map((t) => {
    const sides = panelSides[t.items[0]].map((g) => ({ label: groups[g].label, len: groups[g].mean }));
    const [x, y, z] = sides.map((sd) => sd.len);
    const angle = (opp, u, v) => Math.acos(Math.max(-1, Math.min(1, (u * u + v * v - opp * opp) / (2 * u * v)))) * 180 / Math.PI;
    const sp = (x + y + z) / 2;
    return { ...t, count: t.items.length, sides, angles: [angle(x, y, z), angle(y, z, x), angle(z, x, y)],
             area: Math.sqrt(Math.max(0, sp * (sp - x) * (sp - y) * (sp - z))) };
  });
  return { hubTypes, hubNo, strutEnds, panelTypes };
}

DomeZ.types = {
  typeLabel, groupStruts, numberByCount, typeHubsAndPanels,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
