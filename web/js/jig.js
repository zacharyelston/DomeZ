/* DomeZ · jig: cutting every board end on a plain miter saw (the jig sheet's geometry).

   The saw stays at 0° bevel and only miters (up to 45° either way). The board stands on its outer
   face in a V-cradle set against the fence: a seat under the outer face that rises toward the fence
   by the cradle's lean, and a back at 90° to the seat that holds one wide face. Leaning the board
   turns each compound end cut into a plain vertical cut, so the lean does the bevel's job.
   Table frame: X along the fence to the right, Y from the fence toward you, Z up.
 */
(function (DomeZ) {
'use strict';
const { R2D, add, sub, mul, dot, cross, len, unit } = DomeZ.vec;
const { boardDrawing } = DomeZ.drawing;

const JIG = { maxMiter: 45, maxBevel: 45, leanStep: 0.5, wedgeStep: 5, seatExtra: 0.01, base: 0.01, maxFixed: 8 };

/** A board's axes as its cut drawing shows them: x along the board from its left end, y down the
    drawing (across the outer face, toward the bottom-edge face), z inward (outer face to inner face). */
function boardAxes(bd) {
  const [t0, t1] = bd.tails;
  const ex = unit(sub(t1.outer, t0.outer));
  const io = sub(t0.inner, t0.outer);
  const ez = unit(sub(io, mul(ex, dot(io, ex))));
  return { ex, ey: cross(ez, ex), ez };
}

/** End i (0 = the drawing's left end) of a board: its V-cradle setup, and for comparison the saw
    settings with the board flat on a wide face and no jig. */
function endSetup(bd, i, L) {
  const { ex, ey, ez } = boardAxes(bd);
  const toEnd = i === 0 ? mul(ex, -1) : ex;
  let n = bd.tails[i].nW;                                    // the end cut's plane, normal out of this end
  if (dot(n, toEnd) < 0) n = mul(n, -1);
  const nx = dot(n, ex), ny = dot(n, ey), nz = dot(n, ez);
  // the wide face on the back (outward normal f) is the one that lets the board lean back by 0–90°
  const fSign = nz * ny >= 0 ? 1 : -1, f = mul(ey, fSign);
  const lean = Math.atan2(Math.abs(nz), Math.abs(ny));
  // board → table: Z = cos·ez − sin·f, Y = sin·ez + cos·f, X = Y × Z
  const Zb = sub(mul(ez, Math.cos(lean)), mul(f, Math.sin(lean)));
  const Yb = add(mul(ez, Math.sin(lean)), mul(f, Math.cos(lean)));
  const Xb = cross(Yb, Zb);
  const tX = dot(n, Xb), tY = dot(n, Yb);                     // the cut's normal on the table (its Z part is 0)
  const side = tX > 0 ? 'right' : 'left';                     // which side of the blade the cut end lies
  const angle = Math.atan(Math.abs(tY / tX)) * R2D;
  let wedge = 0;
  if (angle > JIG.maxMiter) wedge = Math.ceil((angle - JIG.maxMiter) / JIG.wedgeStep) * JIG.wedgeStep;
  const waste = side === 'right' ? 1 : -1;
  return {
    end: i, hub: L.hubNo[bd.tails[i].hub], lean: lean * R2D, side, back: fSign > 0 ? 'bottom' : 'top',
    angle, miter: angle - wedge, wedge, wedgeThick: tY > 0 ? 'far' : 'blade',
    longToward: (-tY / tX) * waste > 0 ? 'you' : 'fence',
    height: JIG.base + L.t * Math.sin(lean) + L.w * Math.cos(lean),
    reach: (L.t + JIG.seatExtra) * Math.cos(lean) + L.w * Math.sin(lean),
    frame: { Xb, Yb, Zb, n },
    flat: { miter: Math.atan(Math.abs(nz / nx)) * R2D, bevel: Math.asin(Math.min(1, Math.abs(ny))) * R2D },
  };
}

/** Cradles (grouped by lean) and the cutting steps for every board type. */
function buildJigs(L) {
  const step = JIG.leanStep, cradles = new Map();
  const plans = L.boardTypes.map((bt) => {
    const D = boardDrawing(bt.rep, L);
    const ends = [0, 1].map((i) => endSetup(bt.rep, i, L));
    for (const e of ends) {
      const key = (Math.round(e.lean / step) * step).toFixed(1);
      if (!cradles.has(key)) cradles.set(key, { lean: +key, ends: 0, types: new Set(), height: 0, reach: 0 });
      const c = cradles.get(key);
      c.ends += bt.members.length;
      c.types.add(bt.label);
      c.height = Math.max(c.height, e.height);
      c.reach = Math.max(c.reach, e.reach);
      e.cradleKey = key;
    }
    // stop for the second cut: the outer face's length along the edge that sits in the V
    const second = ends[1], along = D.edgeLengths.find((x) => x.kind === 'outer' && x.edge === second.back);
    return { bt, ends, overall: D.overall, stop: along ? along.mm : D.overall, stopEdge: second.back };
  });
  const list = [...cradles.values()].sort((a, b) => a.lean - b.lean);
  list.forEach((c, k) => { c.name = 'V' + (k + 1); });
  const byKey = new Map(list.map((c) => [c.lean.toFixed(1), c]));
  for (const pl of plans) for (const e of pl.ends) e.cradle = byKey.get(e.cradleKey);
  const all = plans.flatMap((pl) => pl.ends);
  const range = (k) => [Math.min(...all.map((e) => e[k])), Math.max(...all.map((e) => e[k]))];
  // two passes, first ends then second ends to length, each in order of lean so a setting is used once
  const pass = (i) => plans.map((pl) => ({ pl, e: pl.ends[i], i })).sort((a, b) => a.e.lean - b.e.lean || a.e.miter - b.e.miter);
  const median = all.map((e) => e.lean).sort((a, b) => a - b)[Math.floor(all.length / 2)];
  const flatRange = (k) => [Math.min(...all.map((e) => e.flat[k])), Math.max(...all.map((e) => e.flat[k]))];
  return {
    cradles: list, plans, passes: [pass(0), pass(1)], adjustable: list.length > JIG.maxFixed, median,
    seat: L.t + JIG.seatExtra, back: L.w,
    lean: range('lean'), miter: range('angle'), height: range('height')[1], reach: range('reach')[1],
    // an adjustable cradle's hinge sits a seat's length out from the fence, so the seat clears it at every lean
    reachAdjustable: Math.max(...all.map((e) => L.t + JIG.seatExtra + L.w * Math.sin(e.lean / R2D))),
    flatMiter: flatRange('miter'), flatBevel: flatRange('bevel'), wedges: all.filter((e) => e.wedge).length,
  };
}

/** Cross-section of a V-cradle, looking along the fence: the fence on the left, the seat rising to
    it, the back at 90° to the seat, and the board standing in the V. */
function cradleSVG(c, J, L) {
  const W = 300, H = 210, s = 0.95 * 1000;                     // px per metre
  const lean = c.lean / R2D, cs = Math.cos(lean), sn = Math.sin(lean);
  const ox = 50, oy = H - 22;                                  // the fence's foot on the saw table
  const P = ([x, y]) => [ox + x * s, oy - y * s];
  const at = (p, d, len) => [p[0] + d[0] * len, p[1] + d[1] * len];
  const us = [-cs, sn], ub = [sn, cs];                         // up the seat (to the fence), up the back
  // the V's corner: the seat reaches the fence, or on an adjustable cradle the hinge sits a seat's length out
  const C = [c.adjustable ? J.seat : J.seat * cs, JIG.base];
  const S = at(C, us, J.seat), B = at(C, ub, J.back);          // seat's top end, back's top
  const block = [[0, 0], [0, JIG.base], [S[0], JIG.base], S, C, B, [B[0], 0]];
  const board = [C, at(C, us, L.t), at(at(C, us, L.t), ub, L.w), at(C, ub, L.w)];
  const top = Math.max(...board.map((p) => p[1]));
  const f1 = (v) => v.toFixed(1);
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map((p) => P(p).map(f1).join(',')).join(' ')}"/>`;
  const ln = (a, b, cls) => { const [x1, y1] = P(a), [x2, y2] = P(b); return `<line class="${cls}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`; };
  const tx = (p, str, cls, anchor = 'start', dy = 0, dx = 0) => { const [x, y] = P(p); return `<text class="${cls}" x="${f1(x + dx)}" y="${f1(y + dy)}" text-anchor="${anchor}">${str}</text>`; };
  // the lean: an arc at the V's corner from the level to the seat, labelled just outside the fence
  const R = 22, [cx, cy] = P(C);
  const arc = `<path class="arc" d="M${f1(cx - R)} ${f1(cy)} A${R} ${R} 0 0 1 ${f1(cx - R * cs)} ${f1(cy - R * sn)}"/>`;
  const mm = (m) => Math.round(m * 1000);
  return `<svg class="cradle" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Cradle ${c.name} cross-section">
    ${ln([-0.03, 0], [0.25, 0], 'table')}
    ${ln([0, 0], [0, 0.17], 'fence')}
    ${tx([0, 0.17], 'fence', 'small', 'middle', -4)}
    ${poly(block, 'jig')}${poly(board, 'wood')}
    ${ln([0, C[1]], [C[0], C[1]], 'level')}${arc}
    ${tx([0, C[1]], c.lean.toFixed(1) + '°', 'ang', 'end', 5, -5)}
    ${tx(at(at(C, us, L.t / 2), ub, L.w / 2), 'board', 'small', 'middle', 3)}
    ${tx([B[0] + 0.004, B[1] / 2], `back ${mm(J.back)}`, 'dim')}
    ${tx([B[0] / 2, 0], `${mm(B[0])} deep`, 'dim', 'middle', 13)}
    ${ln([B[0] + 0.03, 0], [B[0] + 0.03, top], 'dimline')}
    ${tx([B[0] + 0.034, top], `${mm(top)} tall`, 'dim', 'start', 10)}
  </svg>`;
}

/** End e of a board seen from above on the saw table, in metres: Y from the fence toward you, and
    X along the fence with 0 where the cut crosses the edge that sits in the V. The board is a strip
    across Y (its leaning cross-section seen from above) cut off by the vertical cut, and the cut's
    normal on the table is (nX, nY). With a fence wedge the board, cradle and cut turn by the wedge. */
function endTopView(bd, e, J, L) {
  const { Xb, Yb, Zb, n } = e.frame, tl = bd.tails[e.end], lean = e.lean / R2D;
  const T = (p) => [dot(p, Xb), dot(p, Yb), dot(p, Zb)];
  const outer = [-1, 1].map((s) => T(add(tl.outer, mul(tl.walker, s))));
  const corners = [...outer, ...[-1, 1].map((s) => T(add(tl.inner, mul(tl.walker, s))))];
  // the edge in the V: of the outer face's two edges, the one against the back
  const toBack = (p) => p[1] * Math.cos(lean) - p[2] * Math.sin(lean);
  const v = toBack(outer[0]) > toBack(outer[1]) ? outer[0] : outer[1];
  const yV = J.adjustable ? J.seat : J.seat * Math.cos(lean);  // the V's distance from the fence
  const ys = corners.map((p) => p[1] - v[1] + yV);
  let nX = dot(n, Xb), nY = dot(n, Yb);
  // a wedge turns everything about the V point so the cut sits at the saw's miter
  const turn = e.wedge ? -Math.sign(nX) * Math.sign(nY) * e.wedge / R2D : 0;
  return { yV, yMin: Math.min(...ys), yMax: Math.max(...ys), nX, nY, turn, depth: J.adjustable ? J.seat + J.back * Math.sin(lean) : J.seat * Math.cos(lean) + J.back * Math.sin(lean) };
}

/** The top view as SVG: fence at the top, you at the bottom, the board in its cradle, the blade at
    the miter with its angle from square, and the long point. */
function endTopSVG(bd, e, J, L) {
  const tv = endTopView(bd, e, J, L), W = 340, H = 176, s = 1000 * 1.05, oy = 22;
  const waste = e.side === 'right' ? 1 : -1;
  const xCut = (y) => (tv.nY * (tv.yV - y)) / tv.nX;           // the cut line, before any wedge turn
  const midY = (tv.yMin + tv.yMax) / 2, ox = W / 2 - xCut(midY) * s;
  const c = Math.cos(tv.turn), sn = Math.sin(tv.turn);
  const rot = ([x, y]) => [x * c - (y - tv.yV) * sn, x * sn + (y - tv.yV) * c + tv.yV];
  const P = (p) => { const [x, y] = rot(p); return [ox + x * s, oy + y * s]; };
  const f1 = (v) => v.toFixed(1);
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map((p) => P(p).map(f1).join(',')).join(' ')}"/>`;
  const far = 0.4;                                             // well past the drawing's edge
  const keep = [[-waste * far, tv.yMin], [xCut(tv.yMin), tv.yMin], [xCut(tv.yMax), tv.yMax], [-waste * far, tv.yMax]];
  const off = [[xCut(tv.yMin), tv.yMin], [waste * far, tv.yMin], [waste * far, tv.yMax], [xCut(tv.yMax), tv.yMax]];
  const cradle = [[-far, 0], [far, 0], [far, tv.depth], [-far, tv.depth]];
  // the blade: the cut line across the table, from the fence toward you
  const [bx0, by0] = P([xCut(0), 0]), [bx1, by1] = P([xCut(0.19), 0.19]);
  const kx = (bx1 - bx0), ky = (by1 - by0), kl = Math.hypot(kx, ky), ux = kx / kl, uy = ky / kl;
  const yF = oy, xF = bx0 + (yF - by0) * (kx / ky);           // where the blade meets the fence
  const R = 34, a0 = Math.PI / 2, a1 = Math.atan2(uy, ux);
  const sweep = a1 > a0 ? 1 : 0;
  const arc = `<path class="arc" d="M${f1(xF)} ${f1(yF + R)} A${R} ${R} 0 0 ${sweep} ${f1(xF + R * ux)} ${f1(yF + R * uy)}"/>`;
  const am = (a0 + a1) / 2;
  const longY = (xCut(tv.yMin) - xCut(tv.yMax)) * waste > 0 ? tv.yMin : tv.yMax;
  const [lx, ly] = P([xCut(longY), longY]);
  const [cx, cy] = P([-waste * 0.09, (tv.yMin + tv.yMax) / 2]);
  // the miter's label sits in the arc; the long point's label takes the first spot by its dot clear of it
  const mx = xF + (R + 8) * Math.cos(am), my = yF + (R + 8) * Math.sin(am) + 5, mw = (e.miter.toFixed(1) + '°').length * 8.6;
  const mBox = ux >= 0 ? [mx, my - 12, mx + mw, my + 3] : [mx - mw, my - 12, mx, my + 3];
  const lw = 66, near = ux >= 0 ? -1 : 1;
  const spots = (longY === tv.yMin ? [12, 24, -6] : [-6, -18, 12]).flatMap((dy) => [[near, dy], [-near, dy]]);
  const boxOf = ([sg, dy]) => { const x = lx + sg * 8, y = ly + dy; return sg > 0 ? [x, y - 9, x + lw, y + 2] : [x - lw, y - 9, x, y + 2]; };
  const clear = (b) => !(b[0] < mBox[2] && mBox[0] < b[2] && b[1] < mBox[3] && mBox[1] < b[3]) && b[0] >= 0 && b[2] <= W && b[1] >= oy + 2 && b[3] <= H;
  const [lsg, ldy] = spots.find((sp) => clear(boxOf(sp))) || spots[0];
  return `<svg class="topview" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Board ${bd.type.label} end ${e.end + 1} from above">
    ${poly(cradle, 'cradle')}${poly(keep, 'wood')}${poly(off, 'waste')}
    <line class="fence" x1="0" y1="${oy}" x2="${W}" y2="${oy}"/>
    <text class="small" x="6" y="${oy - 6}">fence${e.wedge ? ` · ${e.wedge}° wedge` : ''}</text>
    <text class="small" x="${W / 2}" y="${H - 6}" text-anchor="middle">you</text>
    <line class="square" x1="${f1(xF)}" y1="${f1(yF)}" x2="${f1(xF)}" y2="${f1(yF + R + 18)}"/>
    <line class="blade" x1="${f1(xF)}" y1="${f1(yF)}" x2="${f1(xF + ux * (H - oy) / Math.max(0.2, uy))}" y2="${f1(H)}"/>
    ${arc}
    <text class="ang" x="${f1(mx)}" y="${f1(my)}" text-anchor="${ux >= 0 ? 'start' : 'end'}">${e.miter.toFixed(1)}°</text>
    <circle class="long" cx="${f1(lx)}" cy="${f1(ly)}" r="3.5"/>
    <text class="small" x="${f1(lx + lsg * 8)}" y="${f1(ly + ldy)}" text-anchor="${lsg > 0 ? 'start' : 'end'}">long point</text>
    <text class="small" x="${f1(cx)}" y="${f1(cy + 4)}" text-anchor="middle">board ${bd.type.label}</text>
  </svg>`;
}

DomeZ.jig = {
  JIG, boardAxes, endSetup, buildJigs, cradleSVG, endTopView, endTopSVG,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
