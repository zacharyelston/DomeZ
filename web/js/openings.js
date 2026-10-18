/* DomeZ · openings: Panel openings between the boards around each face. */
(function (DomeZ) {
'use strict';
const { sub, mul, dot, cross, len, unit, angleBetween, solve3 } = DomeZ.vec;

/** A face's opening between the facing sides of its three boards: corner points at the outer face
    (the plane through the hubs), at the inner face (one board width deeper), and shrunk by a gap. */
function faceOpening(f, L, gap) {
  const tri = L.tris[f], H = tri.map((v) => L.P[v]);
  let nf = unit(cross(sub(H[1], H[0]), sub(H[2], H[0])));
  if (dot(nf, H[0]) < 0) nf = mul(nf, -1);
  const level = dot(nf, H[0]);
  // side k is opposite corner k
  const sides = [0, 1, 2].map((k) => {
    const u = tri[(k + 1) % 3], v = tri[(k + 2) % 3], e = L.edges[L.edgeAt.get(L.key(u, v))];
    const sgn = dot(e.n, H[k]) > 0 ? 1 : -1;
    return { n: mul(e.n, sgn), u, v, board: L.boards.find((bd) => bd.edge === L.edgeAt.get(L.key(u, v))) };
  });
  const corners = (depth, g) => [0, 1, 2].map((k) => {
    const a = sides[(k + 1) % 3], b = sides[(k + 2) % 3];
    return solve3(a.n, L.t / 2 + g, b.n, L.t / 2 + g, nf, level - depth);
  });
  const lengths = (c) => [0, 1, 2].map((k) => len(sub(c[(k + 1) % 3], c[(k + 2) % 3])));
  const angles = (c) => [0, 1, 2].map((k) => angleBetween(sub(c[(k + 1) % 3], c[k]), sub(c[(k + 2) % 3], c[k])) * 180 / Math.PI);
  const outer = corners(0, 0), inner = corners(L.w, 0);
  const real = L.reals[f];
  return {
    letters: sides.map((sd) => (sd.board && sd.board.type ? sd.board.type.label : '?')),
    real: lengths(real), realAngles: angles(real),
    outer: lengths(outer), outerAngles: angles(outer), inner: lengths(inner),
    panel: gap > 0 ? lengths(corners(0, gap)) : null,
  };
}

DomeZ.openings = {
  faceOpening,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
