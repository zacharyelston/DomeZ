/* DomeZ · sheets: The printable cut sheet and jig sheet, and their CSV rows. Each takes the model, the state and the design link. */
(function (DomeZ) {
'use strict';
const { METHODS, effectiveMethod } = DomeZ.geodesic;
const { fracText, effectivePartial } = DomeZ.cut;
const { productColor, typeColor } = DomeZ.colors;
const { boardDrawing, overallOf, boardSVG } = DomeZ.drawing;
const { faceOpening } = DomeZ.openings;
const { JIG, buildJigs, cradleSVG, endTopSVG } = DomeZ.jig;
const { esc, mmText, inchText, fmtM, degText, rangeText } = DomeZ.format;

function shapeTitle(s) {
  const f = fracText(effectivePartial(s));
  const part = f === '1/1' ? 'full' : f;
  const what = s.shape === 'egg' ? 'egg' : s.shape === 'ellipsoid' ? 'ellipsoid' : 'sphere';
  const m = { chords: 'Chords', arcs: 'Arcs', mexican: 'Mexican', kruschke: 'Kruschke', flat: 'flat-grid' }[effectiveMethod(s)];
  return `${s.freq}V ${m} ${s.base === 'octahedron' ? 'octa' : 'icosa'} ${what} · ${part}`;
}

/** The design, as [label, value] lines for the sheet header. */
function designFacts(M, s) {
  const shape = s.shape === 'egg'
    ? `Egg, ${s.eggL} m long × ${s.eggB} m wide, ${Math.round(s.eggW * 100)}% point ${s.eggTip}`
    : s.shape === 'ellipsoid' ? `Ellipsoid, radii ${s.rx} × ${s.ry} × ${s.rz} m (X × Y × Z)` : `Sphere, radius ${s.r} m`;
  const cut = fracText(effectivePartial(s));
  return {
    title: shapeTitle(s),
    lines: [
      ['Shape', shape],
      ['Geodesic', `${s.freq}V ${s.base}, ${METHODS[effectiveMethod(s)].label}, ${s.sym[0].toUpperCase() + s.sym.slice(1)}`],
      ['Cut', (cut === '1/1' ? 'full sphere' : cut + ' of the sphere') + (s.flat ? ', flat base' : '')],
      ['Strut grouping', s.tol > 0 ? `lengths within ${s.tol} mm are one type` : 'every distinct length is a type'],
    ],
    facts: [
      ['Struts', M.edges.length], ['Strut types', M.groups.length], ['Hubs', M.pts.length], ['Hub types', M.hubTypes.length],
      ['Panels', M.tris.length], ['Panel types', M.panelTypes.length],
      ['Height', fmtM(M.max[2] - M.min[2])], ['Width', fmtM(Math.max(M.max[0] - M.min[0], M.max[1] - M.min[1]))],
      ['Total strut length', M.totalLength.toFixed(1) + ' m'], ['Skin area', M.area.toFixed(2) + ' m²'],
    ],
  };
}

/** Boards around a hub, clockwise from outside, as type letters (only boards that are built). */
function boardsAroundHub(L, h) {
  const byB = new Map();
  L.tris.forEach(([x, y, z]) => { if (x === h) byB.set(z, y); else if (y === h) byB.set(x, z); else if (z === h) byB.set(y, x); });
  const [start] = byB.keys(), out = [];
  for (let B = start, guard = 0; guard < 32; guard++) {
    const A = byB.get(B), e = L.edgeAt.get(L.key(h, A)), bd = L.boards.find((x) => x.edge === e);
    if (bd) out.push(bd.type.label);
    B = A;
    if (B === start) break;
  }
  return out;
}

function sawText(sw) {
  return sw.outerDown ? `${sw.outerDown.miter}° miter, ${sw.outerDown.bevel}° bevel` : '';
}

function lumberSheetHTML(M, s, href) {
  const L = M.lumber, d = designFacts(M, s);
  const total = L.boards.reduce((sum, bd) => sum + bd.maxL, 0);
  const facts = [['Connection', s.frame === 'joint-ccw' ? 'Joint, anticlockwise' : 'Joint, clockwise'],
                 ['Boards', `${L.boards.length} in ${L.boardTypes.length} types`], ['Board size', `${s.beamW} × ${s.beamT} mm`],
                 ['Lumber', total.toFixed(1) + ' m'], ['Hubs', `${M.pts.length} in ${L.hubTypes.length} types`],
                 ['Panels', `${M.tris.length} in ${L.faceTypes.length} types`],
                 ['Height', fmtM(M.max[2] - M.min[2])], ['Width', fmtM(Math.max(M.max[0] - M.min[0], M.max[1] - M.min[1]))]];
  const boardRows = L.boardTypes.map((bt) => {
    const D = boardDrawing(bt.rep, L);
    return `<tr>
      <td class="big"><span class="sw" style="background:${productColor(bt.index)}"></span>${bt.label}</td>
      <td class="n big">${bt.members.length}</td>
      <td class="n big">${D.overall}</td>
      <td class="n">${inchText(D.overall / 1000)}</td>
      <td class="n">${D.shortest}</td>
      <td class="n">${D.saw.map((sw) => sw.hub).join('–')}</td>
      <td class="n">${sawText(D.saw[0])}</td>
      <td class="n">${sawText(D.saw[1])}</td></tr>`;
  }).join('');
  const drawings = L.boardTypes.map((bt) => `
    <div class="drawing">
      <div class="drawing-head"><span class="dot" style="background:${productColor(bt.index)}">${bt.label}</span>
        <b>${bt.members.length} pcs</b> · ${overallOf(bt, L)} mm overall (${inchText(overallOf(bt, L) / 1000)}) · hubs ${L.hubNo[bt.rep.a]}–${L.hubNo[bt.rep.b]}</div>
      ${boardSVG(bt.rep, L, productColor(bt.index))}
    </div>`).join('');
  const hubRows = L.hubTypes.map((ht) => `<tr>
      <td class="big"><span class="sw" style="background:${productColor(ht.no - 1)}"></span>${ht.no}</td>
      <td class="n big">${ht.hubs.length}</td>
      <td class="n">${ht.valence}</td>
      <td class="seq">${boardsAroundHub(L, ht.hubs[0]).join(' ')}</td></tr>`).join('');
  const gap = s.gap / 1000;
  const mmList = (xs) => xs.map((x) => Math.round(x * 1000)).join(' · ');
  const panelRows = L.faceTypes.map((ft) => {
    const o = faceOpening(ft.rep, L, gap);
    return `<tr>
      <td class="big"><span class="sw" style="background:${productColor(ft.no - 1)}"></span>${ft.no}</td>
      <td class="n big">${ft.faces.length}</td>
      <td class="seq">${o.letters.join(' ')}</td>
      <td class="n">${mmList(o.real)}</td>
      <td class="n big">${mmList(o.outer)}</td>
      <td class="n">${mmList(o.inner)}</td>
      ${gap > 0 ? `<td class="n big">${mmList(o.panel)}</td>` : ''}
      <td class="n">${o.outerAngles.map((a) => a.toFixed(1) + '°').join(' · ')}</td></tr>`;
  }).join('');
  return `
    <h1>${esc(d.title)}</h1>
    <p class="sub">${d.lines.filter(([k]) => k !== 'Strut grouping').map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join(' &nbsp;·&nbsp; ')}</p>
    <div class="facts">${facts.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>

    <h2>Boards</h2>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Type</th><th class="n">Qty</th><th class="n">Overall, mm</th><th class="n">Inches</th><th class="n">Shortest edge, mm</th><th class="n">Hubs</th><th class="n">Left end saw</th><th class="n">Right end saw</th></tr></thead>
      <tbody>${boardRows}</tbody>
    </table></div>
    <p class="note">Overall is the board's length from its furthest corner to its furthest corner, the length to buy and rough-cut. Shortest edge is the shortest of its four long edges. Both are read off the drawing's marks, so they agree with it. Saw settings are for the outer face lying on the saw table: miter is the cut's angle from square across that face, bevel is the blade's tilt. The drawings below show which way each cut leans.</p>

    <h2>Cut drawings</h2>
    <p class="note">Each drawing is a board's outer face seen from outside the dome, its first hub on the left. Numbers along the top and bottom edges are millimetres from the left end: where the cut crosses that edge on the outer face, then on the inner face (the dashed line is the cut on the hidden inner face). <span class="blue-t">Blue ∟</span> is the angle inside the wood between the outer face and the cut (blade bevel = 90° − blue). <span class="red-t">Red</span> is the cut's angle from square on the outer face (the miter). Circles give the hub type at each end, with one spoke per board meeting there. Black ∟ is the angle between each neighbouring panel and the board's side (a board on the cut edge has one). Each end is drawn to scale, as far in as its cut reaches; a long board's middle is shortened between the ends. Boards are drawn the same way round as in Acidome.</p>
    ${drawings}

    <h2>Hubs</h2>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Type</th><th class="n">Qty</th><th class="n">Boards</th><th>Board types around the hub (clockwise, seen from outside)</th></tr></thead>
      <tbody>${hubRows}</tbody>
    </table></div>
    <p class="note">Joint has no hub hardware: the boards lock around each hub point as a pinwheel. Hub types are numbered as Acidome numbers them, so the circles on the drawings match.</p>

    <h2>Panels</h2>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Type</th><th class="n">Qty</th><th>Board sides</th><th class="n">Triangle, mm</th><th class="n">Opening, mm</th><th class="n">At inner face, mm</th>${gap > 0 ? `<th class="n">Panel, ${s.gap} mm gap</th>` : ''}<th class="n">Opening angles</th></tr></thead>
      <tbody>${panelRows}</tbody>
    </table></div>
    <p class="note">Sides are listed in the same order in every column, labelled with the board type along them. The triangle is Acidome's face, between the boards' centre planes. The opening is the space between the facing sides of the three boards at their outer face, the size for a panel form. At the inner face, one board width deeper, it is smaller because the boards' sides lean toward the dome's centre. Set a panel gap under Frame to list panel sizes that leave that gap to every board.</p>

    <p class="note link">Design link: ${esc(href)}</p>`;
}

function cutSheetHTML(M, s, href) {
  if (M.gridshell) return gridshellSheetHTML(M, s, href);
  if (M.lumber) return lumberSheetHTML(M, s, href);
  const d = designFacts(M, s), n = M.groups.length;
  const endsText = (k) => M.strutEnds[k].map(([pair, c]) => `${pair}${M.strutEnds[k].length > 1 ? ` (${c})` : ''}`).join(', ');
  const strutRows = M.groups.map((g, k) => {
    const spread = g.max - g.min >= 0.0005 ? `${mmText(g.min)}–${mmText(g.max)}` : '';
    return `<tr>
      <td class="big"><span class="sw" style="background:${typeColor(k, n)}"></span>${g.label}</td>
      <td class="n big">${g.count}</td>
      <td class="n big">${mmText(g.mean)}</td>
      <td class="n">${inchText(g.mean)}</td>
      <td class="n">${spread}</td>
      <td>${esc(endsText(k))}</td></tr>`;
  }).join('');
  const hubRows = M.hubTypes.map((t) => `<tr>
      <td class="big">${t.no}${t.open ? '<span class="tag">cut edge</span>' : ''}</td>
      <td class="n big">${t.count}</td>
      <td class="n">${t.seq.length}</td>
      <td class="seq">${t.seq.join(' ')}</td></tr>`).join('');
  const panelRows = M.panelTypes.map((t) => `<tr>
      <td class="big">${t.no}</td>
      <td class="n big">${t.count}</td>
      <td class="seq">${t.sides.map((sd) => sd.label).join(' ')}</td>
      <td class="n">${t.sides.map((sd) => mmText(sd.len)).join(' · ')}</td>
      <td class="n">${t.sides.map((sd) => inchText(sd.len)).join(' · ')}</td>
      <td class="n">${t.angles.map((a) => a.toFixed(1) + '°').join(' · ')}</td>
      <td class="n">${t.area.toFixed(3)}</td></tr>`).join('');
  return `
    <h1>${esc(d.title)}</h1>
    <p class="sub">${d.lines.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join(' &nbsp;·&nbsp; ')}</p>
    <div class="facts">${d.facts.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>

    <h2>Struts</h2>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Type</th><th class="n">Qty</th><th class="n">Length, mm</th><th class="n">Inches</th><th class="n">Range, mm</th><th>Joins hubs</th></tr></thead>
      <tbody>${strutRows}</tbody>
    </table></div>
    <p class="note">Lengths are centre to centre, hub point to hub point. Take off your connector's allowance at each end to get the cut length. "Joins hubs" gives the hub types at the two ends (with counts when a type joins more than one pair).</p>

    <h2>Hubs</h2>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Type</th><th class="n">Qty</th><th class="n">Struts</th><th>Strut types around the hub (anticlockwise, seen from outside)</th></tr></thead>
      <tbody>${hubRows}</tbody>
    </table></div>

    <h2>Panels</h2>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Type</th><th class="n">Qty</th><th>Sides</th><th class="n">Side lengths, mm</th><th class="n">Inches</th><th class="n">Corner angles</th><th class="n">Area, m²</th></tr></thead>
      <tbody>${panelRows}</tbody>
    </table></div>
    <p class="note">Panel sides are the triangle between hub points, listed in the same order as their strut types; each corner angle is opposite the side in the same position. Mirror-image panels are one type, since a flat panel or form can be turned over. For lumber frames, the opening between the boards is smaller by the board size. Acidome Height+ gives those sizes and the board cut drawings until this viewer has its own lumber view.</p>

    <p class="note link">Design link: ${esc(href)}</p>`;
}

function lumberSheetRows(M, s, href) {
  const L = M.lumber, d = designFacts(M, s);
  const rows = [['DomeZ cut list', d.title], ...d.lines.filter(([k]) => k !== 'Strut grouping'),
    ['Connection', s.frame === 'joint-ccw' ? 'Joint, anticlockwise' : 'Joint, clockwise'], ['Board size (mm)', `${s.beamW} x ${s.beamT}`],
    ['Design link', href], []];
  rows.push(['Boards'], ['Type', 'Quantity', 'Overall (mm)', 'Overall (in)', 'Shortest edge (mm)', 'Hub types', 'Left end miter', 'Left end bevel', 'Right end miter', 'Right end bevel',
    'Top edge marks (mm)', 'Bottom edge marks (mm)']);
  for (const bt of L.boardTypes) {
    const D = boardDrawing(bt.rep, L);
    const marks = (edge) => D.marks.filter((m) => m.edge === edge).sort((a, b) => a.x - b.x).map((m) => m.label).join(' ');
    const sw = D.saw.map((x) => x.outerDown || { miter: '', bevel: '' });
    rows.push([bt.label, bt.members.length, D.overall, inchText(D.overall / 1000), D.shortest,
      D.saw.map((x) => x.hub).join('–'), sw[0].miter, sw[0].bevel, sw[1].miter, sw[1].bevel, marks('top'), marks('bottom')]);
  }
  rows.push([], ['Hubs'], ['Type', 'Quantity', 'Boards', 'Board types around (clockwise from outside)']);
  for (const ht of L.hubTypes) rows.push([ht.no, ht.hubs.length, ht.valence, boardsAroundHub(L, ht.hubs[0]).join(' ')]);
  const gap = s.gap / 1000;
  rows.push([], ['Panels'], ['Type', 'Quantity', 'Board sides', 'Triangle (mm)', 'Opening (mm)', 'At inner face (mm)', ...(gap > 0 ? [`Panel with ${s.gap} mm gap (mm)`] : []), 'Opening angles']);
  for (const ft of L.faceTypes) {
    const o = faceOpening(ft.rep, L, gap), mm = (xs) => xs.map((x) => Math.round(x * 1000)).join(' ');
    rows.push([ft.no, ft.faces.length, o.letters.join(' '), mm(o.real), mm(o.outer), mm(o.inner), ...(gap > 0 ? [mm(o.panel)] : []), o.outerAngles.map((a) => a.toFixed(1)).join(' ')]);
  }
  rows.push([], ['Note', 'Saw settings are for the outer face on the saw table. Marks are mm from the left end of each board drawing.']);
  return rows;
}

const sideText = { right: 'right of the blade', left: 'left of the blade' };

const faceText = { top: 'top-edge face', bottom: 'bottom-edge face' };

function jigSheetHTML(M, s, href) {
  const L = M.lumber, J = buildJigs(L), d = designFacts(M, s);
  const mm = (m) => Math.round(m * 1000), longest = Math.max(...J.plans.map((pl) => pl.overall)) + 10;
  const reach = J.adjustable ? J.reachAdjustable : J.reach;
  const facts = [['Board size', `${s.beamW} × ${s.beamT} mm`], ['Board ends', `${L.boards.length * 2} (${J.plans.length * 2} setups)`],
                 [J.adjustable ? 'Lean settings' : 'V-cradles', J.cradles.length], ['Leans', rangeText(J.lean)], ['Miters', rangeText(J.miter)],
                 ['Tallest cut', `${mm(J.height)} mm`], ['Reach from fence', `${mm(reach)} mm`]];
  const card = (c, head, foot) => `
    <div class="cradle-card">
      <div class="drawing-head"><span class="dot jig">${c.name}</span>${head}</div>
      ${cradleSVG(c, J, L)}
      <div class="small-facts">${foot}</div>
    </div>`;
  const cradles = J.adjustable
    ? `<h2>One adjustable V-cradle</h2>
    <p class="note">This design needs ${J.cradles.length} different leans, so rather than a cradle for each, build one that adjusts. Screw the seat and back together at 90° into an L, hinge the L at the V's corner on a base board ${mm(J.seat)} mm out from the fence (so the seat clears it at every lean), and fix the base to the fence. Make it a trough that carries a whole board (the longest is ${longest} mm, rough cut) and runs past the blade. Set each lean with an angle gauge on the seat (or 90° minus the lean on the back), and lock it with a wedge under the seat. The drawing shows it at ${degText(J.median)}. The cutting steps below are in order of lean, so each setting is used once per pass.</p>
    <div class="cradle-grid">${card({ name: 'V', lean: J.median, adjustable: true }, `<b>adjustable</b> · leans ${rangeText(J.lean)}`,
      `Seat ${mm(J.seat)} mm and back ${mm(J.back)} mm at 90°. Cuts up to ${mm(J.height)} mm tall, ${mm(reach)} mm out from the fence.`)}</div>
    <div class="tablewrap-x"><table class="lean-list">
      <thead><tr><th>Setting</th><th class="n">Lean</th><th class="n">Ends</th><th>Boards</th></tr></thead>
      <tbody>${J.cradles.map((c) => `<tr><td class="big">${c.name}</td><td class="n big">${degText(c.lean)}</td><td class="n">${c.ends}</td><td class="seq">${[...c.types].join(' ')}</td></tr>`).join('')}</tbody>
    </table></div>`
    : `<h2>V-cradles to build</h2>
    <p class="note">Each drawing is a cross-section looking along the fence: the fence on the left, the seat rising to it and the back at 90°, with the board standing in the V. Leans are grouped to ${JIG.leanStep}°. Make each cradle a trough along the fence that carries a whole board (the longest is ${longest} mm, rough cut) and runs past the blade, and fix it to the fence; the first cut kerfs it, and the kerf then shows exactly where the blade lands.</p>
    <div class="cradle-grid">${J.cradles.map((c) => card(c, `<b>${degText(c.lean)} lean</b> · ${c.ends} ends · boards ${[...c.types].join(' ')}`,
      `Seat ${mm(J.seat)} mm and back ${mm(J.back)} mm at 90°, the seat rising ${degText(c.lean)} toward the fence. Cuts up to ${mm(c.height)} mm tall, ${mm(c.reach)} mm out from the fence.`)).join('')}</div>`;
  const row = ({ pl, e, i }) => `<tr>
      <td class="big"><span class="sw" style="background:${productColor(pl.bt.index)}"></span>${pl.bt.label}</td>
      <td class="n big">${pl.bt.members.length}</td>
      <td>${i ? 'right' : 'left'} end, hub ${e.hub}</td>
      <td class="big">${e.cradle.name}<div class="tiny">${degText(e.lean)}</div></td>
      <td>${faceText[e.back]}</td>
      <td>${sideText[e.side]}</td>
      <td class="n big">${degText(e.miter)}</td>
      <td>long point ${e.longToward === 'fence' ? 'at the fence' : 'toward you'}${e.wedge ? `<span class="tag">${e.wedge}° fence wedge, thick end ${e.wedgeThick === 'far' ? 'away from' : 'at'} the blade</span>` : ''}</td>
      <td class="n${i ? ' big' : ''}">${i ? `stop ${pl.stop}<div class="tiny">along the ${pl.stopEdge} edge</div>` : `rough ${pl.overall + 10}`}</td>
      <td class="n">${degText(e.flat.miter)} / ${degText(e.flat.bevel)}${e.flat.bevel > JIG.maxBevel ? '<span class="tag">over 45°</span>' : ''}</td></tr>`;
  const endCaption = (pl, e, i) => `
        <div class="end-head"><b>End ${i + 1} · ${i ? 'right' : 'left'} end, hub ${e.hub}</b> · pass ${i + 1}</div>
        <div>Cradle <b>${e.cradle.name}</b> (${degText(e.lean)} lean), <b>${faceText[e.back]}</b> on the back</div>
        <div>Cut end ${sideText[e.side]} · miter <b>${degText(e.miter)}</b>, long point ${e.longToward === 'fence' ? 'at the fence' : 'toward you'}${e.wedge ? ` · ${e.wedge}° fence wedge, thick end ${e.wedgeThick === 'far' ? 'away from' : 'at'} the blade` : ''}</div>
        <div>${i ? `Stop <b>${pl.stop} mm</b> along the ${pl.stopEdge} edge` : `From rough length <b>${pl.overall + 10} mm</b>`}</div>
        <div class="tiny">No jig, flat on a wide face: miter ${degText(e.flat.miter)}, bevel ${degText(e.flat.bevel)}</div>`;
  const boardCards = J.plans.map((pl) => `
    <div class="drawing jig-board">
      <div class="drawing-head"><span class="dot" style="background:${productColor(pl.bt.index)}">${pl.bt.label}</span>
        <b>${pl.bt.members.length} pcs</b> · ${pl.overall} mm overall · hubs ${L.hubNo[pl.bt.rep.a]}–${L.hubNo[pl.bt.rep.b]}</div>
      ${boardSVG(pl.bt.rep, L, productColor(pl.bt.index))}
      <div class="end-grid">${pl.ends.map((e, i) => `<div class="end-card">${endTopSVG(pl.bt.rep, e, J, L)}${endCaption(pl, e, i)}</div>`).join('')}</div>
    </div>`).join('');
  const head = `<thead><tr><th>Board</th><th class="n">Qty</th><th>End</th><th>Cradle</th><th>Face on the back</th><th>Cut end</th><th class="n">Miter</th><th>Direction</th><th class="n">Length, mm</th><th class="n">No jig: miter / bevel</th></tr></thead>`;
  return `
    <h1>Jig sheet · ${esc(d.title)}</h1>
    <p class="sub">Saw at <b>0° bevel</b>, mitering up to ${JIG.maxMiter}° either way. For each cut the board stands on its <b>outer face</b> in a <b>V-cradle</b> set against the fence: a seat under the outer face rising toward the fence by the cradle's <b>lean</b>, and a back at 90° to it holding one wide face. Leaning the board makes each compound end cut a plain vertical cut, so the saw only miters.</p>
    <div class="facts">${facts.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>
    <p class="note">The board can't lie flat for this: a cradle tilts a board only about its length, and these cuts need it leaning ${rangeText(J.lean)} off its outer face. Check that your saw cuts ${mm(J.height)} mm tall at 0° bevel, ${mm(reach)} mm out from the fence; most 12-inch saws do, many 10-inch saws don't. Without a jig, the last column gives the settings with the board flat on a wide face instead (miter ${rangeText(J.flatMiter)}, bevel ${rangeText(J.flatBevel)}): only ${s.beamT} mm tall, but the blade tilts.</p>
    ${cradles}

    <h2>Boards in the jig</h2>
    <p class="note">One card per board type: its cut drawing, as on the cut sheet, then each end seen from above on the saw table with the fence at the top. The board lies in its cradle, the red line is the blade at its miter from square, and the blue dot is the long point. The offcut is shown pale.</p>
    ${boardCards}

    <h2>Cutting order</h2>
    <p class="note">Cut the ends in two passes. Pass 1 cuts one end of every board, on boards cut to their rough length. Pass 2 cuts the other end to length. Each pass is in order of lean, then miter, so every setting is used in one go.</p>
    <h3>Pass 1 · first ends</h3>
    <div class="tablewrap-x"><table class="jig-steps">${head}<tbody>${J.passes[0].map(row).join('')}</tbody></table></div>
    <h3>Pass 2 · second ends, to length</h3>
    <div class="tablewrap-x"><table class="jig-steps">${head}<tbody>${J.passes[1].map(row).join('')}</tbody></table></div>
    <p class="note">Left and right ends, faces and edges are as on the board's cut drawing: the top-edge face is the wide face along the drawing's top edge. The outer face always sits on the seat, and the named wide face lies against the back, which decides which side of the blade the end lands on. In pass 2, set a stop so the board measures the stop length along the named edge of its outer face, the edge that sits in the V (a small block or screw head in the corner of the V makes a good stop). "Long point at the fence" means the cut leaves the board longer at the fence side. Where the miter would pass ${JIG.maxMiter}°, a fence wedge of that angle between the cradle and the fence turns the board, and the listed miter is what is left for the saw. The last column is for cutting with no jig, the board flat on a wide face: miter, then blade bevel; turn the board over if your blade only tilts one way.</p>

    <p class="note link">Design link: ${esc(href)}</p>`;
}

function jigCsvRows(M, s, href) {
  const L = M.lumber, J = buildJigs(L), mm = (m) => Math.round(m * 1000), f1 = (a) => a.toFixed(1);
  const rows = [['DomeZ jig sheet', designFacts(M, s).title], ['Board size (mm)', `${s.beamW} x ${s.beamT}`], ['Saw', `0 bevel, miter up to ${JIG.maxMiter}`],
    ['V-cradle', J.adjustable ? 'one adjustable cradle' : `${J.cradles.length} fixed cradles`],
    ['V-cradle seat (mm)', mm(J.seat)], ['V-cradle back (mm)', mm(J.back)], ['Tallest cut (mm)', mm(J.height)], ['Reach from fence (mm)', mm(J.adjustable ? J.reachAdjustable : J.reach)],
    ['Design link', href], []];
  rows.push([J.adjustable ? 'Lean settings' : 'V-cradles'], ['Cradle', 'Lean (deg)', 'Ends', 'Board types', 'Cut height (mm)', 'Reach (mm)']);
  for (const c of J.cradles) rows.push([c.name, f1(c.lean), c.ends, [...c.types].join(' '), mm(c.height), mm(c.reach)]);
  const head = ['Board', 'Qty', 'End', 'Hub type', 'Cradle', 'Lean (deg)', 'Face on the back', 'Cut end', 'Miter (deg)', 'Long point',
    'Fence wedge (deg)', 'Wedge thick end', 'Length (mm)', 'Length edge', 'No jig: miter (deg)', 'No jig: bevel (deg)'];
  J.passes.forEach((steps, k) => {
    rows.push([], [k ? 'Pass 2: second ends, to length' : 'Pass 1: first ends'], head);
    for (const { pl, e, i } of steps) rows.push([pl.bt.label, pl.bt.members.length, i ? 'right' : 'left', e.hub, e.cradle.name, f1(e.lean),
      faceText[e.back], sideText[e.side], f1(e.miter), e.longToward === 'fence' ? 'at the fence' : 'toward you', e.wedge || '',
      e.wedge ? (e.wedgeThick === 'far' ? 'away from the blade' : 'at the blade') : '', i ? pl.stop : pl.overall + 10, i ? pl.stopEdge + ' edge' : 'rough length',
      f1(e.flat.miter), f1(e.flat.bevel)]);
  });
  return rows;
}

/** The cut sheet as CSV rows: the boards for a Joint frame, otherwise struts, hubs and panels. */
function cutSheetRows(M, s, href) {
  if (M.gridshell) return gridshellSheetRows(M, s, href);
  if (M.lumber) return lumberSheetRows(M, s, href);
  const d = designFacts(M, s);
  const rows = [['DomeZ cut list', d.title], ...d.lines, ['Design link', href], []];
  rows.push(['Summary'], ...d.facts, []);
  rows.push(['Struts'], ['Type', 'Quantity', 'Length (mm)', 'Length (in)', 'Shortest (mm)', 'Longest (mm)', 'Joins hub types']);
  M.groups.forEach((g, k) => rows.push([g.label, g.count, mmText(g.mean), inchText(g.mean), mmText(g.min), mmText(g.max),
    M.strutEnds[k].map(([pair, c]) => `${pair} (${c})`).join('; ')]));
  rows.push([], ['Hubs'], ['Type', 'Quantity', 'Struts', 'Strut types around (anticlockwise from outside)', 'On the cut edge']);
  for (const t of M.hubTypes) rows.push([t.no, t.count, t.seq.length, t.seq.join(' '), t.open ? 'yes' : 'no']);
  rows.push([], ['Panels'], ['Type', 'Quantity', 'Side types', 'Side 1 (mm)', 'Side 2 (mm)', 'Side 3 (mm)', 'Angle 1', 'Angle 2', 'Angle 3', 'Area (m²)']);
  for (const t of M.panelTypes) rows.push([t.no, t.count, t.sides.map((sd) => sd.label).join(' '), ...t.sides.map((sd) => mmText(sd.len)),
    ...t.angles.map((a) => a.toFixed(1)), t.area.toFixed(3)]);
  rows.push([], ['Note', 'Lengths are centre to centre between hub points; take off your connector allowance at each end for cut lengths.']);
  return rows;
}

/** A gridshell's facts, its bend verdict and its crossing rows, shared by the sheet and the CSV. */
function gridshellParts(M, s) {
  const G = M.gridshell, B = G.bend, mm = (m) => Math.round(m * 1000), deg = (r) => (r * 180 / Math.PI).toFixed(1) + '°';
  const over = B.ratio > 1;
  return {
    G, B, mm, deg, over,
    facts: [['Laths', `${2 * G.N} (${G.N} + ${G.N} mirrored)`], ['Lath length', `${mm(G.length)} mm`],
            ['Section', `${B.width} × ${B.ply} mm, ${B.plies} ${B.plies === 1 ? 'ply' : 'plies'}`], ['Crossings', G.crossings],
            ['Base ring', `Ø ${mm(2 * G.rhoBase)} mm`], ['Crown ring', `Ø ${mm(2 * G.c)} mm`], ['Crown height', `${mm(G.tCrown - G.tBase)} mm up`],
            ['Tightest bend', `${B.minRadius.toFixed(2)} m`], ['Ply stress', `${B.maxStress.toFixed(1)} of ${B.allowable} MPa`],
            ['Thickest safe ply', `${B.maxPly.toFixed(1)} mm`], ['Most twist', `${B.maxTwist.toFixed(1)}°/m`]],
    verdict: over
      ? `Too stiff to bend this far: ${B.ply} mm plies reach ${B.maxStress.toFixed(1)} MPa at the tightest bend (${B.minRadius.toFixed(2)} m radius), over the ${B.allowable} MPa allowed. Use plies of ${B.maxPly.toFixed(1)} mm or less, and more of them for the same section.`
      : `${B.ply} mm plies reach ${B.maxStress.toFixed(1)} MPa at the tightest bend (${B.minRadius.toFixed(2)} m radius), within the ${B.allowable} MPa allowed.`,
    setOut: `Set out ${G.N} points evenly on the base ring, every ${(360 / G.N).toFixed(2)}°. From each point an A lath leaves leaning ${deg(G.psi)} from the vertical one way, and a B lath ${deg(G.psi)} the other way. A laths run in the outer layer and B laths in the inner layer. Each A lath crosses a B lath at every row of the table, where the two are bolted. Every lath ends on the crown ring, running level along it, having turned ${deg(G.crownTurn)} around the dome.`,
  };
}

/** The gridshell sheet: the lath (every lath is the same; B laths are mirror images), where it crosses, and the bend check. */
function gridshellSheetHTML(M, s, href) {
  const d = designFacts(M, s);
  if (!M.gridshell.ok) return `<h1>Gridshell · ${esc(d.title)}</h1><p class="sub">${esc(M.gridshell.reason)}</p>`;
  const { G, mm, deg, over, facts, verdict, setOut } = gridshellParts(M, s);
  const rows = G.nodes.map((n) => `<tr>
      <td class="big">${n.k ? n.k : 'base'}</td>
      <td class="n big">${mm(n.s)}</td>
      <td class="n">${mm(n.rise)}</td>
      <td class="n">${n.angle.toFixed(1)}°</td>
      <td class="n">${Number.isFinite(n.radius) ? n.radius.toFixed(2) : '—'}</td></tr>`).join('');
  return `
    <h1>Gridshell · ${esc(d.title)}</h1>
    <p class="sub">${d.lines.filter(([k]) => k === 'Shape' || k === 'Cut').map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join(' &nbsp;·&nbsp; ')} &nbsp;·&nbsp; <b>Laths:</b> ${G.N} per family, leaving the base at ${deg(G.psi)} from the vertical</p>
    <div class="facts">${facts.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>
    <p class="note"${over ? ' style="color:var(--warn)"' : ''}>${esc(verdict)}</p>

    <h2>The lath</h2>
    <p class="note">Every lath has the same shape, so one drilling template marks them all. B laths are mirror images: turn the template over. Distances run along the lath's centre line from its base end.</p>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Crossing</th><th class="n">Along the lath, mm</th><th class="n">Height above base, mm</th><th class="n">Angle between laths</th><th class="n">Bend radius, m</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>

    <h2>Setting out</h2>
    <p class="note">${esc(setOut)}</p>
    <p class="note">Prototype: this is geometry plus a simple bend check. The plies are taken as unglued, so each bends on its own thickness: stress = E × ply thickness ÷ (2 × bend radius). Twist, buckling, snow and wind loads, and the bolted crossings still need an engineer's check.</p>
    <p class="note link">Design link: ${esc(href)}</p>`;
}

function gridshellSheetRows(M, s, href) {
  const d = designFacts(M, s);
  if (!M.gridshell.ok) return [['DomeZ gridshell', d.title], ['Note', M.gridshell.reason]];
  const { G, mm, facts, verdict, setOut } = gridshellParts(M, s);
  const rows = [['DomeZ gridshell', d.title], ...d.lines.filter(([k]) => k === 'Shape' || k === 'Cut'), ['Design link', href], [], ...facts, ['Bend check', verdict], []];
  rows.push(['The lath (every lath the same; B laths mirrored)'], ['Crossing', 'Along the lath (mm)', 'Height above base (mm)', 'Angle between laths (deg)', 'Bend radius (m)']);
  for (const n of G.nodes) rows.push([n.k ? n.k : 'base', mm(n.s), mm(n.rise), n.angle.toFixed(1), Number.isFinite(n.radius) ? n.radius.toFixed(2) : '']);
  rows.push([], ['Setting out', setOut]);
  return rows;
}

DomeZ.sheets = {
  sideText, faceText, shapeTitle, designFacts, boardsAroundHub, sawText, lumberSheetHTML, cutSheetHTML,
  lumberSheetRows, cutSheetRows, jigSheetHTML, jigCsvRows, gridshellSheetHTML, gridshellSheetRows,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
