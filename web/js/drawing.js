/* DomeZ · drawing: Board cut drawings, Acidome's front view: the outer face, seen from outside. */
(function (DomeZ) {
'use strict';
const { sub, mul, dot, cross, angleBetween } = DomeZ.vec;

/** Everything printed on a board type's drawing, in board coordinates (x along the board from its
    left extreme, y across the outer face from 0 to the thickness), lengths in metres. */
function boardDrawing(bd, L) {
  const h = L.t, depth = L.w, mid = bd.mid;
  const t0 = bd.tails[0];
  const off0 = Math.max(Math.abs(t0.bevelInner + t0.bevelSides[0]), Math.abs(t0.bevelInner + t0.bevelSides[1]));
  const out = { length: bd.maxL, h, marks: [], cuts: [], blue: [], red: [], hubs: [], edges: { top: [], bottom: [] }, saw: [] };
  const deg = (r) => r * 180 / Math.PI;
  bd.tails.forEach((tl, idx) => {
    const turn = idx === 1, TURN = turn ? -1 : 1, base = off0 + (turn ? mid : 0);
    const b = tl.bevelInner, s = tl.bevelSides;
    const oc = [base - TURN * b, h / 2], ic = [base + TURN * b, h / 2];
    let outerAnchor = null, innerAnchor = null;
    const mark = (x, anchor, edge, kind) => {
      const f = x * 1000;
      const label = anchor === null ? Math.round(f) : Math.round(anchor + Math.round(f - anchor));
      out.marks.push({ x, label, edge, kind, side: turn ? 'right' : 'left' });
      return f;
    };
    let blue = null, red = null;
    if (tl.bevelZero) {                                          // square across the outer face: one mark per face
      outerAnchor = mark(oc[0], outerAnchor, 'top', 'outer');
      innerAnchor = mark(ic[0], innerAnchor, 'bottom', 'inner');
    }
    for (let i = 0; i < 2; i++) {
      const top = turn !== Boolean(i), y = top ? 0 : h;
      const ob = [oc[0] + TURN * s[i], y], ib = [ic[0] + TURN * s[i], y];
      if (tl.bevelStraight && Math.abs(s[0] - s[1]) > 1e-12) {
        outerAnchor = mark(ob[0], outerAnchor, top ? 'top' : 'bottom', 'outer');
        innerAnchor = mark(ib[0], innerAnchor, top ? 'top' : 'bottom', 'inner');
      }
      out.cuts.push({ from: oc, to: ob, hidden: false, side: turn ? 'right' : 'left' });
      out.cuts.push({ from: ic, to: ib, hidden: (ic[0] > oc[0]) !== turn, side: turn ? 'right' : 'left' });
      if (top) out.edges.top.push(ob[0]); else out.edges.bottom.push(ob[0]);
      if ((!tl.bevelZero && tl.bevelStraight && (turn !== (ob[0] > oc[0]))) || (tl.bevelZero && i === 0)) {
        const byOuter = [ob[0] - oc[0], ob[1] - oc[1], 0], toInner = [ic[0] - oc[0], ic[1] - oc[1], depth];
        const nc = mul(cross(byOuter, toInner), i ? 1 : -1);
        blue = Math.round(deg(angleBetween([0, 0, depth], nc)) * 10) / 10;
        out.blue.push({ value: blue, from: oc, to: ob, side: turn ? 'right' : 'left' });
      } else if (tl.bevelStraight && (!tl.bevelZero || i)) {
        const sq = [ob[0], oc[1]];
        const AB = Math.hypot(ob[0] - oc[0], ob[1] - oc[1]), BC = Math.hypot(sq[0] - ob[0], sq[1] - ob[1]), CA = Math.hypot(oc[0] - sq[0], oc[1] - sq[1]);
        red = Math.round(deg(Math.acos(Math.max(-1, Math.min(1, (AB * AB + BC * BC - CA * CA) / (2 * AB * BC))))) * 5) / 5;
        if (red) out.red.push({ value: red, at: ob, from: oc, side: turn ? 'right' : 'left' });
      }
    }
    out.hubs.push({ at: oc, no: L.hubNo[tl.hub], spokes: L.liveValence[tl.hub] || 6, side: turn ? 'right' : 'left' });
    // Saw settings for this end (my derivation from Acidome's numbers): outer face on the table, or a wide face
    const m2 = Math.abs(2 * b / depth), sb = Math.abs(2 * s[0] / h);
    out.saw.push({
      side: turn ? 'right' : 'left', hub: L.hubNo[tl.hub],
      outerDown: red === null || blue === null ? null : { miter: red, bevel: Math.round(Math.abs(90 - blue) * 10) / 10 },
      sideDown: { miter: Math.round(deg(Math.atan(m2)) * 10) / 10, bevel: Math.round((90 - deg(Math.acos(sb / Math.sqrt(1 + sb * sb + m2 * m2)))) * 10) / 10 },
    });
  });
  // black ∟: angle between each adjacent face's cover plane and the board's radial plane
  // (only faces that are built: a board on the cut edge has one)
  out.faceAngles = bd.faces.flatMap((f, k) => {
    if (!L.keep[f]) return [];
    const re = L.reals[f], nf = cross(sub(re[0], re[1]), sub(re[2], re[1]));
    let a = Math.round(deg(angleBetween(nf, bd.lineNormal)) / 0.1) / 10;
    if (a > 90) a = Math.round((180 - a) * 10) / 10;
    return [{ value: a, edge: dot(L.P[bd.thirds[k]], bd.lineNormal) <= 0 ? 'bottom' : 'top' }];
  });
  // how far each end's cuts reach into the board, from its own end (the drawing keeps these at true scale)
  const xsOf = (side) => [...out.cuts.filter((c) => c.side === side).flatMap((c) => [c.from[0], c.to[0]]),
                          ...out.marks.filter((m) => m.side === side).map((m) => m.x)];
  out.extent = [Math.max(...xsOf('left')), out.length - Math.min(...xsOf('right'))];
  // lengths along the four long edges, from the labels, so every number agrees with the drawing
  const lab = (edge, kind, side) => out.marks.find((m) => m.edge === edge && m.kind === kind && m.side === side)
    || out.marks.find((m) => m.kind === kind && m.side === side);            // a square end has one mark per face
  out.edgeLengths = [];
  for (const kind of ['outer', 'inner']) for (const edge of ['top', 'bottom']) {
    const a = lab(edge, kind, 'left'), b = lab(edge, kind, 'right');
    if (a && b) out.edgeLengths.push({ kind, edge, mm: b.label - a.label });
  }
  out.overall = out.marks.length ? Math.max(...out.marks.map((m) => m.label)) : Math.round(bd.maxL * 1000);
  out.shortest = out.edgeLengths.length ? Math.min(...out.edgeLengths.map((e) => e.mm)) : Math.round(bd.minL * 1000);
  return out;
}

/** A board type's overall length in mm, as its drawing labels its furthest corner. */
function overallOf(bt, L) {
  if (bt.overall === undefined) bt.overall = boardDrawing(bt.rep, L).overall;
  return bt.overall;
}

/** The drawing as SVG, at one scale both ways. As in Acidome, each end keeps everything its cut
    touches at true scale; a long board's middle is shortened between them, and longer board types
    are drawn longer. */
function boardSVG(bd, L, color) {
  const D = boardDrawing(bd, L);
  const H = 210, mx = 46, my = 34, gapPx = 34, baseWidth = 720;
  const k = (H - 2 * my) / D.h;                                 // px per metre, same both ways
  const pad = 44 / k;                                           // room past an end's last mark for its label
  const lens = L.boardTypes.map((bt) => bt.rep.maxL), lo = Math.min(...lens), hi = Math.max(...lens);
  const share = hi - lo > 1e-9 ? 0.6 + 0.4 * (bd.maxL - lo) / (hi - lo) : 1;
  const budget = (baseWidth - 2 * mx - gapPx) / k * share;     // metres of board shown
  let left = D.extent[0] + pad, right = D.extent[1] + pad;
  const slack = budget - left - right;
  if (slack > 0) { left += slack / 2; right += slack / 2; }
  const squeeze = left + right < D.length;
  const X = (x) => {
    if (!squeeze || x <= left) return mx + x * k;
    if (x >= D.length - right) return mx + left * k + gapPx + (x - (D.length - right)) * k;
    return mx + left * k + (x - left) / (D.length - left - right) * gapPx;
  };
  const Y = (y) => my + y * k;
  const width = squeeze ? 2 * mx + (left + right) * k + gapPx : 2 * mx + D.length * k;
  const parts = [];
  const f1 = (v) => v.toFixed(1);
  const line = (x1, y1, x2, y2, attrs) => parts.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" ${attrs}/>`);
  const text = (x, y, s, attrs) => parts.push(`<text x="${f1(x)}" y="${f1(y)}" ${attrs}>${s}</text>`);
  // reference lines and thickness labels
  line(mx - 14, Y(0), width - 6, Y(0), 'class="ref"');
  line(mx - 14, Y(D.h), width - 6, Y(D.h), 'class="ref"');
  text(4, Y(0) + 4, '0', 'class="lab"');
  text(4, Y(D.h) + 4, String(Math.round(D.h * 1000)), 'class="lab"');
  // division lines and marks: at each end the mark nearer the end is labelled on its outside
  const CHAR = 7.9;                                             // px per character of the 13px monospace labels
  const taken = { top: [], bottom: [] };                        // label spans along each edge's label row
  for (const m of D.marks) {
    line(X(m.x), my - 22, X(m.x), Y(D.h) + 22, 'class="ref"');
    const pair = D.marks.filter((o) => o.edge === m.edge && o.side === m.side);
    const outermost = m.side === 'left' ? m.x <= Math.min(...pair.map((o) => o.x)) : m.x >= Math.max(...pair.map((o) => o.x));
    const anchor = outermost === (m.side === 'left') ? 'end' : 'start';
    const x0 = X(m.x) + (anchor === 'end' ? -3 : 3), w = String(m.label).length * CHAR;
    taken[m.edge].push(anchor === 'end' ? [x0 - w, x0] : [x0, x0 + w]);
    text(x0, m.edge === 'top' ? my - 8 : Y(D.h) + 18, String(m.label), `class="mark${m.kind === 'inner' ? ' inner' : ''}" text-anchor="${anchor}"`);
  }
  // long edges, broken in the shortened middle
  const edge = (xs, y) => {
    const [x1, x2] = [Math.min(...xs), Math.max(...xs)];
    if (squeeze) {
      line(X(x1), Y(y), X(left), Y(y), 'class="wood"');
      line(X(D.length - right), Y(y), X(x2), Y(y), 'class="wood"');
      line(X(left), Y(y), X(D.length - right), Y(y), 'class="gap"');
    } else line(X(x1), Y(y), X(x2), Y(y), 'class="wood"');
  };
  edge(D.edges.top, 0);
  edge(D.edges.bottom, D.h);
  // end cuts: solid on the outer face, dashed where the inner face's cut is hidden behind it
  for (const c of D.cuts) line(X(c.from[0]), Y(c.from[1]), X(c.to[0]), Y(c.to[1]), c.hidden ? 'class="cut hidden"' : 'class="cut"');
  // blue ∟: along its cut line, on the waste side, toward the board's edge
  for (const a of D.blue) {
    const ax = X(a.from[0]), ay = Y(a.from[1]), bx = X(a.to[0]), by = Y(a.to[1]);
    const l = Math.hypot(bx - ax, by - ay) || 1;
    let nx = (ay - by) / l, ny = (bx - ax) / l;
    if ((a.side === 'left') !== (nx < 0)) { nx = -nx; ny = -ny; }
    // as near 0.62 of its half of the cut as fits (Acidome's spot), with the label inside the board's band
    // and clear of the hub's spokes (22 px); move it further out from the cut only when it must
    const half = `∟${a.value}°`.length * CHAR * 0.55, tall = 7, ux = (bx - ax) / l, uy = (by - ay) / l;
    const fits = (along, off) => {
      const cy = ay + uy * along + ny * off, reach = Math.abs(uy) * half + Math.abs(ny) * tall;
      const hub = Math.hypot(Math.max(0, along - half), Math.max(0, off - tall));
      return cy - reach >= Y(0) + 1 && cy + reach <= Y(D.h) - 1 && hub >= 23;
    };
    const alongs = [];
    for (let s = 0; s <= l + half; s += 2) alongs.push(s);
    alongs.sort((p, q) => Math.abs(p - 0.62 * l) - Math.abs(q - 0.62 * l));
    let along = 0.62 * l, off = 30;
    search: for (const o of [10, 16, 22, 28, 34]) for (const s of alongs) if (fits(s, o)) { along = s; off = o; break search; }
    const px = ax + ux * along + nx * off, py = ay + uy * along + ny * off;
    let deg = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
    if (deg > 90) deg -= 180; else if (deg <= -90) deg += 180;
    text(px, py, `∟${a.value}°`, `class="blue" text-anchor="middle" dominant-baseline="middle" transform="rotate(${f1(deg)} ${f1(px)} ${f1(py)})"`);
  }
  // red: the cut's angle from square on the outer face, an arc in the corner it makes with the edge
  for (const a of D.red) {
    const bx = X(a.at[0]), by = Y(a.at[1]), R = 24;
    const u1 = [X(a.from[0]) - bx, Y(a.from[1]) - by], u2 = [0, Y(a.from[1]) - by];
    const n1 = Math.hypot(...u1) || 1, n2 = Math.hypot(...u2) || 1;
    const e1 = [u1[0] / n1, u1[1] / n1], e2 = [u2[0] / n2, u2[1] / n2];
    const sweep = e1[0] * e2[1] - e1[1] * e2[0] > 0 ? 1 : 0;
    parts.push(`<path class="arc" d="M${f1(bx + R * e1[0])} ${f1(by + R * e1[1])} A${R} ${R} 0 0 ${sweep} ${f1(bx + R * e2[0])} ${f1(by + R * e2[1])}"/>`);
    const bis = [e1[0] + e2[0], e1[1] + e2[1]], nb = Math.hypot(...bis) || 1;
    const px = bx + bis[0] / nb * (R + 6), py = by + bis[1] / nb * (R + 6);
    text(px, py, `${a.value}°`, `class="red" text-anchor="${a.side === 'left' ? 'end' : 'start'}" dominant-baseline="middle"`);
  }
  // hub circles, with one spoke per board at that hub
  for (const hb of D.hubs) {
    const cx = X(hb.at[0]), cy = Y(hb.at[1]), r = 11;
    for (let i = 0; i < hb.spokes; i++) {
      const ang = (i + 0.3) * 2 * Math.PI / hb.spokes;
      line(cx + r * Math.cos(ang), cy + r * Math.sin(ang), cx + 2 * r * Math.cos(ang), cy + 2 * r * Math.sin(ang), 'class="spoke"');
    }
    parts.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r}" class="hubc"/>`);
    text(cx, cy + 4, String(hb.no), 'class="hubn" text-anchor="middle"');
  }
  // panel angles along the edges, in the widest stretch of their label row that no mark label uses
  const freeMiddle = (spans) => {
    let best = null, from = mx;
    for (const [a, b] of [...spans, [width - mx, width - mx]].sort((p, q) => p[0] - q[0])) {
      if (!best || a - from > best[1] - best[0]) best = [from, a];
      from = Math.max(from, b);
    }
    return (best[0] + best[1]) / 2;
  };
  for (const fa of D.faceAngles) {
    text(freeMiddle(taken[fa.edge]), fa.edge === 'top' ? my - 8 : Y(D.h) + 18, `∟${fa.value}°`, 'class="face" text-anchor="middle"');
  }
  return `<svg class="board" viewBox="0 0 ${width.toFixed(0)} ${H}" width="${width.toFixed(0)}" style="--c:${color}" role="img"
    aria-label="Board ${bd.type.label} cut drawing">${parts.join('')}</svg>`;
}

DomeZ.drawing = {
  boardDrawing, overallOf, boardSVG,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
