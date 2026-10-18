/* DomeZ · lumber: Acidome's Joint connection, a hubless pinwheel of boards.

   Ported from the Acidome calculator (acidome.ru/lab/calc, by popitch). Every board is a straight
   W × T prism, W along the radius and T across. Its mid-plane passes through the dome's centre (the
   origin) and is turned about the strut so each hub sits T/2 to one side. Each end is cut flat
   against the facing side of the next board clockwise (anticlockwise for "joint-ccw") around that
   hub. Boards are built on the whole uncut mesh, as in Acidome, and then only boards of kept faces
   are listed. On a sphere this reproduces Acidome exactly. On ellipsoids and eggs every board still
   aims at the centre, and each end is found on the sphere through its own hub (the Acidome Height+
   fix), so stretched shapes match Acidome Height+.
 */
(function (DomeZ) {
'use strict';
const { add, sub, mul, dot, cross, len, unit, comp, angleBetween } = DomeZ.vec;
const { typeLabel } = DomeZ.types;

const ORIGIN = [0, 0, 0];

const au = (rad) => Math.round(rad * 180 / Math.PI / 0.1);          // tenths of a degree, as Acidome rounds

/** Unit vectors x with u·x = du and v·x = dv (Acidome's Solutions.twoPlanesAndSphere). */
function unitsOnTwoPlanes(u, du, v, dv) {
  const uu = dot(u, u), uv = dot(u, v), vv = dot(v, v), det = uu * vv - uv * uv;
  const a = (du * vv - dv * uv) / det, b = (dv * uu - du * uv) / det;
  const x0 = add(mul(u, a), mul(v, b)), c = cross(u, v);
  const lam = Math.sqrt(Math.max(0, 1 - dot(x0, x0)) / dot(c, c));
  return [sub(x0, mul(c, lam)), add(x0, mul(c, lam))];
}

/** Number groups Acidome's way: most members first, then (optionally) longer first, then key descending. */
function acidomeNumbering(groups, longer) {
  return [...groups.entries()].sort((A, B) =>
    (B[1].length - A[1].length) || (longer ? longer(B[1][0]) - longer(A[1][0]) : 0) || (A[0] < B[0] ? 1 : A[0] > B[0] ? -1 : 0));
}

/** Lexicographically largest of the candidate sequences (Acidome's selectChain), with a tolerance. */
function largestChain(cands, tol) {
  return cands.reduce((best, c) => {
    for (let i = 0; i < Math.min(best.length, c.length); i++) {
      const d = c[i][1] - best[i][1];
      if (Math.abs(d) > tol) return d > 0 ? c : best;
    }
    return best;
  });
}

function buildJointLumber(full, p) {
  const P = full.pts, n = P.length;
  const t = p.beamT / 1000, w = p.beamW / 1000;
  const sigma = p.frame === 'joint-ccw' ? -1 : 1;
  const key = (a, b) => (a < b ? a * n + b : b * n + a);

  // edges in Acidome's line order, with the third vertex of each face on them. Acidome takes a board's
  // two ends in the order of its hubs' points, so a board runs from its lower-numbered hub (drawn left).
  const edges = full.lineOrder.map(([a, b]) => ({ a: Math.min(a, b), b: Math.max(a, b), thirds: [], faces: [] }));
  const edgeAt = new Map(edges.map((e, i) => [key(e.a, e.b), i]));
  full.tris.forEach(([x, y, z], f) => {
    for (const [u, v, o] of [[x, y, z], [y, z, x], [z, x, y]]) { const e = edges[edgeAt.get(key(u, v))]; e.thirds.push(o); e.faces.push(f); }
  });

  // board mid-planes through the centre: n·P0 = σt/2, n·P1 = -σt/2, n·(P0×P1) > 0
  for (const e of edges) {
    const A = P[e.a], B = P[e.b], lineNormal = cross(A, B);
    const sols = unitsOnTwoPlanes(A, sigma * t / 2, B, -sigma * t / 2);
    e.n = dot(sols[0], lineNormal) > 0 ? sols[0] : sols[1];
    e.lineNormal = lineNormal;
  }

  const tailAt = (e, hub, other) => {
    const H = P[hub], Q = P[other], res = dot(e.n, H);
    // the wall: of the two struts that share a face with this one at the hub, the one across the mid-plane
    let wall = null;
    for (const T of e.thirds) if (dot(e.n, P[T]) * res < 0) wall = edges[edgeAt.get(key(hub, T))];
    let nW = wall.n;
    if (dot(nW, Q) < 0) nW = mul(nW, -1);
    // outer point: on the mid-plane and the wall's facing side (nW·X = t/2), on the sphere through the hub
    const r = len(H);
    const sols = unitsOnTwoPlanes(e.n, 0, nW, t / (2 * r)).map((u) => mul(u, r));
    const outer = len(sub(sols[0], H)) < len(sub(sols[1], H)) ? sols[0] : sols[1];
    return { hub, outer, nW, wallEdge: wall };
  };

  const boards = [];
  edges.forEach((e, idx) => {
    const live = e.faces.some((f) => full.keep[f]);
    if (!live) return;
    const tails = [tailAt(e, e.a, e.b), tailAt(e, e.b, e.a)];
    const A = P[e.a], B = P[e.b], uAB = unit(sub(B, A));
    const outerN = sub(A, mul(uAB, dot(A, uAB)));                 // outer plane: through the chord, normal to the mid-radius
    tails.forEach((tl, i) => {
      const d = sub(tails[1 - i].outer, tl.outer);
      let eIn = unit(cross(e.n, tl.nW));
      if (dot(sub(tl.outer, ORIGIN), eIn) > 0) eIn = mul(eIn, -1);
      const cs = dot(eIn, d) / len(d), sn = Math.sqrt(Math.max(0, 1 - cs * cs));
      tl.inner = add(tl.outer, mul(eIn, w / sn));
      const k = unit(cross(tl.nW, outerN));
      tl.walker = mul(k, (t / 2) / dot(e.n, k));                  // component along the mid-plane normal is +t/2
    });
    // Acidome's tail measurements and type key
    const strs = [];
    tails.forEach((tl, i) => {
      const d = unit(sub(tails[1 - i].outer, tl.outer));
      const hOI = mul(sub(tl.inner, tl.outer), 0.5);
      tl.middle = add(tl.outer, hOI);
      const walkers = [tl.walker, mul(tl.walker, -1)];
      const direct = dot(cross(walkers[0], hOI), d) > 0;
      let bs = [comp(walkers[direct ? 0 : 1], d), comp(walkers[direct ? 1 : 0], d)];
      bs = bs.map((x) => (Math.abs(x * 50) < t / 2 ? 0 : x));
      tl.bevelSides = bs;
      tl.bevelZero = !bs[0] && !bs[1];
      tl.bevelStraight = Math.abs(bs[0] + bs[1]) < 1e-9;
      tl.bevelInner = comp(hOI, d);
      const inner = Math.atan2(tl.bevelInner, w / 2), left = Math.atan2(bs[0], t / 2);
      let st = !Math.round(inner * 500) ? 'T' : (inner < Math.PI / 2 ? 'A' : 'B') + au(Math.PI / 2 - inner);
      if (tl.bevelZero) st += 'Piped';
      else if (tl.bevelStraight) st += 'Joint/GoodKarma/Semicone' + (left > 0 ? 'L' : 'R') + au(Math.abs(left));
      strs.push(st);
    });
    const mid = len(sub(tails[0].middle, tails[1].middle));
    const extra = tails.reduce((s, tl) => s + Math.abs(tl.bevelSides[0]) + Math.abs(tl.bevelInner), 0);
    boards.push({ edge: idx, a: e.a, b: e.b, tails, mid, maxL: mid + extra, minL: mid - extra, n: e.n, lineNormal: e.lineNormal,
                  faces: e.faces, thirds: e.thirds, selvage: e.faces.filter((f) => full.keep[f]).length === 1,
                  key: 'Length' + Math.round((mid + extra) * 1000) + ' ' + strs.slice().sort().join(' ') });
  });

  // board types: A = most numerous, then longer, then key descending
  // Acidome lists boards on the cut edge (one live face) last, so a type's first board, the one it
  // draws and compares lengths by, is an inner board whenever the type has one
  const byKey = new Map();
  for (const bd of [...boards].sort((p, q) => p.selvage - q.selvage)) { if (!byKey.has(bd.key)) byKey.set(bd.key, []); byKey.get(bd.key).push(bd); }
  const boardTypes = acidomeNumbering(byKey, (bd) => bd.maxL).map(([k, members], i) => ({ index: i, label: typeLabel(i), key: k, members, rep: members[0] }));
  for (const bt of boardTypes) for (const bd of bt.members) bd.type = bt;

  // real face corners: where the two boards' mid-planes at a corner meet the sphere through the hub
  const realCorner = (f, hub) => {
    const [x, y, z] = full.tris[f];
    const others = [x, y, z].filter((v) => v !== hub);
    const n1 = edges[edgeAt.get(key(hub, others[0]))].n, n2 = edges[edgeAt.get(key(hub, others[1]))].n;
    const u = unit(cross(n1, n2)), r = len(P[hub]);
    const c1 = mul(u, r), c2 = mul(u, -r);
    return len(sub(c1, P[hub])) < len(sub(c2, P[hub])) ? c1 : c2;
  };
  const reals = full.tris.map((tri, f) => tri.map((v) => realCorner(f, v)));

  // hub types (Acidome's Connector.unify): around each live hub, clockwise from outside on the whole mesh,
  // alternate the real face corner angle and the strut's angle to the centre; take the largest rotation
  const liveHub = new Uint8Array(n), liveValence = new Int32Array(n);
  full.tris.forEach((tri, f) => { if (full.keep[f]) for (const v of tri) liveHub[v] = 1; });
  for (const bd of boards) { liveValence[bd.a]++; liveValence[bd.b]++; }
  const byB = Array.from({ length: n }, () => new Map());          // our outward triangle (P, A, B): B -> [A, face]
  full.tris.forEach(([x, y, z], f) => { byB[x].set(z, [y, f]); byB[y].set(x, [z, f]); byB[z].set(y, [x, f]); });
  const hubKey = new Array(n);
  for (let h = 0; h < n; h++) {
    if (!liveHub[h]) continue;
    const chain = [];
    let [B0] = byB[h].keys(), Bk = B0;
    for (let guard = 0; guard < 32; guard++) {
      const [A, f] = byB[h].get(Bk);
      const tri = full.tris[f], i = tri.indexOf(h), re = reals[f];
      chain.push(['F', angleBetween(sub(re[(i + 2) % 3], re[i]), sub(re[(i + 1) % 3], re[i]))]);
      chain.push(['R', angleBetween(sub(P[A], P[h]), sub(ORIGIN, P[h]))]);
      Bk = A;
      if (Bk === B0) break;
    }
    const rots = chain.map((_, i) => chain.slice(i).concat(chain.slice(0, i)));
    hubKey[h] = 'Joint ' + largestChain(rots, 1e-6).map(([m, v]) => m + au(v)).join(' ');
  }
  const hubGroups = new Map();
  for (let h = 0; h < n; h++) if (hubKey[h] !== undefined) { if (!hubGroups.has(hubKey[h])) hubGroups.set(hubKey[h], []); hubGroups.get(hubKey[h]).push(h); }
  const hubTypes = acidomeNumbering(hubGroups).map(([k, hubs], i) => ({ no: i + 1, key: k, hubs, valence: liveValence[hubs[0]] }));
  const hubNo = new Int32Array(n);
  for (const ht of hubTypes) for (const h of ht.hubs) hubNo[h] = ht.no;

  // face types (Acidome's Polygon.Simple.unify on the real triangle; mirror images merge for Joint)
  const faceKey = reals.map((re) => {
    const c = mul(add(add(re[0], re[1]), re[2]), 1 / 3);
    const chain = [];
    let prev = re[2];
    for (const cur of re) {
      chain.push(['R', len(sub(prev, c))], ['A', angleBetween(sub(cur, c), sub(prev, c))], ['L', 0]);
      prev = cur;
    }
    const cands = [];
    for (let i = 0; i < chain.length; i++) {
      const sample = chain.slice(i).concat(chain.slice(0, i));
      for (const seq of [sample, sample.slice().reverse()]) if (seq[0][0] === 'R') cands.push(seq.filter((x) => x[0] !== 'L'));
    }
    return largestChain(cands, 1e-5).map(([m, v]) => m + Math.round(v / 0.001)).join('-');
  });
  const faceGroups = new Map();
  full.tris.forEach((tri, f) => { if (!full.keep[f]) return; if (!faceGroups.has(faceKey[f])) faceGroups.set(faceKey[f], []); faceGroups.get(faceKey[f]).push(f); });
  const faceTypes = acidomeNumbering(faceGroups).map(([k, faces], i) => ({ no: i + 1, key: k, faces, rep: faces[0] }));

  return { t, w, sigma, edges, boards, boardTypes, reals, hubTypes, hubNo, liveValence, faceTypes, P, tris: full.tris, keep: full.keep, edgeAt, key };
}

/** A board's six faces as outward-facing quads, with a shade for each (outer face 1). */
function boardQuads(bd) {
    const [t0, t1] = bd.tails;
    const c = (tl, inner, sgn) => add(inner ? tl.inner : tl.outer, mul(tl.walker, sgn));
    const O0p = c(t0, 0, 1), O0m = c(t0, 0, -1), I0p = c(t0, 1, 1), I0m = c(t0, 1, -1);
    const O1p = c(t1, 0, 1), O1m = c(t1, 0, -1), I1p = c(t1, 1, 1), I1m = c(t1, 1, -1);
    const all = [O0p, O0m, I0p, I0m, O1p, O1m, I1p, I1m];
    const centre = mul(all.reduce((a, b) => add(a, b), [0, 0, 0]), 1 / 8);
    const quads = [
      [[O0p, O0m, O1m, O1p], 1.0],   // outer face
      [[I0p, I1p, I1m, I0m], 0.62],  // inner face
      [[O0p, O1p, I1p, I0p], 0.5],   // side faces
      [[O0m, I0m, I1m, O1m], 0.5],
      [[O0p, I0p, I0m, O0m], 0.38],  // end cuts
      [[O1p, O1m, I1m, I1p], 0.38],
    ];
    return quads.map(([q, f]) => {
      const qc = mul(add(add(q[0], q[1]), add(q[2], q[3])), 0.25);
      return [dot(cross(sub(q[1], q[0]), sub(q[2], q[0])), sub(qc, centre)) < 0 ? q.slice().reverse() : q, f];
    });
}

DomeZ.lumber = {
  unitsOnTwoPlanes, acidomeNumbering, largestChain, buildJointLumber, boardQuads,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
