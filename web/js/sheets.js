/* DomeZ · sheets: The printable cut sheet and jig sheet, and their CSV rows. Each takes the model, the state and the design link. */
(function (DomeZ) {
'use strict';
const { METHODS, effectiveMethod } = DomeZ.geodesic;
const { fracText, effectivePartial } = DomeZ.cut;
const { productColor, typeColor } = DomeZ.colors;
const { boardDrawing, overallOf, boardSVG } = DomeZ.drawing;
const { faceOpening } = DomeZ.openings;
const { JIG, buildJigs, cradleSVG, endTopSVG } = DomeZ.jig;
const { LATHJIG, buildLathJigs, jigPlanSVG, jigSectionSVG, lathJigSCAD } = DomeZ.lathjig;
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
  if (M.gridshell) return lathJigSheetHTML(M, s, href);
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
  if (M.gridshell) return lathJigCsvRows(M, s, href);
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

/** The joints and the stock lengths, for either layout: facts, the method, and each type's plies. */
function gridshellStock(G, s) {
  const st = G.stock, mm = (m) => Math.round(m * 1000), joins = G.types.map((t) => t.joins);
  const lo = Math.min(...joins), hi = Math.max(...joins), money = (x) => (x >= 100 ? x.toFixed(0) : x.toFixed(2));
  return {
    facts: [['Joints per lath', lo === hi ? String(lo) : `${lo}–${hi}`], ['Stock lengths', `${st.lengths} × ${s.lathStock} mm`],
            ...(st.price > 0 ? [['Lath cost', `≈ ${money(st.cost)} at ${st.price} a length`]] : []), ['Timber', `${st.timber.toFixed(1)} m`]],
    method: `Each ply is laid end to end from ${s.lathStock} mm stock. ` + (st.plies > 1
      ? `Ply 1 starts with a whole length and each further ply with a shorter piece, so the joints in neighbouring plies are staggered and every joint is bridged by the other ${st.plies === 2 ? 'ply' : 'plies'}. Screw or bolt the plies together either side of each joint.`
      : 'With a single ply, every joint needs a splice plate: a short piece of the same lath screwed across it.') +
      ` Joints stay ${mm(st.clear)} mm clear of the bolts, and no end piece is shorter than ${mm(st.minPiece)} mm.` +
      ` ${st.joins} joints in all: ${st.pieces} pieces from ${st.lengths} stock lengths, ${st.whole} of them used whole and the other pieces packed into ${st.cutFrom}, with ${st.waste.toFixed(1)} m of offcuts.`,
    plies: (t) => t.splice.map((r, k) => [`Ply ${k + 1}`, r.joints.length ? r.joints.map(mm).join(', ') : 'none', r.pieces.map(mm).join(' + ')]),
  };
}

const pliesTable = (rows) => `<div class="tablewrap-x"><table>
      <thead><tr><th>Ply</th><th>Joints, mm from the start</th><th>Pieces, mm</th></tr></thead>
      <tbody>${rows.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="seq">${esc(b)}</td><td class="seq">${esc(c)}</td></tr>`).join('')}</tbody>
    </table></div>`;

const verdictOf = (B) => (B.ratio > 1
  ? `Too stiff to bend this far: ${B.ply} mm plies reach ${B.maxStress.toFixed(1)} MPa at the tightest bend (${B.minRadius.toFixed(2)} m radius), over the ${B.allowable} MPa allowed. Use plies of ${B.maxPly.toFixed(1)} mm or less, and more of them for the same section.`
  : `${B.ply} mm plies reach ${B.maxStress.toFixed(1)} MPa at the tightest bend (${B.minRadius.toFixed(2)} m radius), within the ${B.allowable} MPa allowed.`);

const PROTOTYPE = 'Prototype: this is geometry plus a simple bend check. The plies are taken as unglued, so each bends on its own thickness: stress = E × ply thickness ÷ (2 × bend radius). Twist, buckling, snow and wind loads, the joints and the bolted crossings still need an engineer’s check.';

/** A crown gridshell's facts, its bend verdict and its crossing rows, shared by the sheet and the CSV. */
function gridshellParts(M, s) {
  const G = M.gridshell, B = G.bend, mm = (m) => Math.round(m * 1000), deg = (r) => (r * 180 / Math.PI).toFixed(1) + '°';
  const over = B.ratio > 1, stock = gridshellStock(G, s);
  return {
    G, B, mm, deg, over, stock,
    facts: [['Laths', `${2 * G.N} (${G.N} + ${G.N} mirrored)`], ['Lath length', `${mm(G.length)} mm`],
            ['Section', `${B.width} × ${B.ply} mm, ${B.plies} ${B.plies === 1 ? 'ply' : 'plies'}`], ['Crossings', G.crossings],
            ['Base ring', `Ø ${mm(2 * G.rhoBase)} mm`], ['Crown ring', `Ø ${mm(2 * G.c)} mm`], ['Crown height', `${mm(G.tCrown - G.tBase)} mm up`],
            ['Tightest bend', `${B.minRadius.toFixed(2)} m`], ['Ply stress', `${B.maxStress.toFixed(1)} of ${B.allowable} MPa`],
            ['Thickest safe ply', `${B.maxPly.toFixed(1)} mm`], ['Most twist', `${B.maxTwist.toFixed(1)}°/m`], ...stock.facts],
    verdict: verdictOf(B),
    setOut: `Set out ${G.N} points evenly on the base ring, every ${(360 / G.N).toFixed(2)}°. From each point an A lath leaves leaning ${deg(G.psi)} from the vertical one way, and a B lath ${deg(G.psi)} the other way. A laths run in the outer layer and B laths in the inner layer. Each A lath crosses a B lath at every row of the table, where the two are bolted. Every lath ends on the crown ring, running level along it, having turned ${deg(G.crownTurn)} around the dome.`,
  };
}

/** An over-the-top gridshell's facts, verdict, setting-out text and per-lath rows. */
function overParts(M, s) {
  const G = M.gridshell, B = G.bend, mm = (m) => Math.round(m * 1000), deg = (r) => (r * 180 / Math.PI).toFixed(1) + '°';
  const stock = gridshellStock(G, s), axis = G.ridge.along[1] ? 'Y' : 'X';
  const name = (l) => `${l.family}${l.i + 1}`;
  const endOf = (l, start) => {
    const on = start ? l.startOn : l.endOn, q = l.samples[start ? 0 : l.samples.length - 1].p;
    return on ? `on ${on.family}${on.i + 1}, ${mm(on.s)} mm along it` : `base at X ${mm(q[0])}, Y ${mm(q[1])}`;
  };
  return {
    G, B, mm, deg, over: B.ratio > 1, stock, axis, name, endOf,
    facts: [['Laths', `${2 * G.N} (${G.N} + ${G.N} mirrored)`], ['Lath types', G.types.length], ['Lath lengths', `${mm(G.shortest)}–${mm(G.length)} mm`],
            ['Section', `${B.width} × ${B.ply} mm, ${B.plies} ${B.plies === 1 ? 'ply' : 'plies'}`], ['Crossings', G.crossings],
            ['Base', `${mm(2 * G.base[0])} × ${mm(2 * G.base[1])} mm`], ['Ridge', `${mm(G.ridge.length)} mm`], ['Ridge spacing', `${mm(G.ridge.spacing)} mm`],
            ['Tightest bend', `${B.minRadius.toFixed(2)} m`], ['Ply stress', `${B.maxStress.toFixed(1)} of ${B.allowable} MPa`],
            ['Thickest safe ply', `${B.maxPly.toFixed(1)} mm`], ['Most twist', `${B.maxTwist.toFixed(1)}°/m`], ...stock.facts],
    verdict: verdictOf(B),
    setOut: `Mark the ridge, the line over the top along the ${axis} axis, ${mm(G.ridge.length)} mm from base to base, measuring from its −${axis} end. Each lath crosses the ridge at the distance in the table, ${deg(G.psi)} from the fall line there: A laths one way, B laths the other. A laths run in the outer layer and B laths in the inner layer, and each A lath is bolted to each B lath it crosses. A lath starts on the base, at the point given from the centre of the base, and runs over the ridge to its far end.${G.trimmed ? ` Near the ends, where laths of one family converge, ${G.trimmed} lath ends stop on a lath of their own family instead, bolted to it.` : ''}`,
    templates: 'Laths of one type share a drilling template, marked from the start end. A lath listed as reversed takes the template from its far end, and B laths, mirror images, take it turned over. Distances run along the lath’s centre line.',
  };
}

const crossingRows = (list, mm) => list.map((n, k) => `<tr>
      <td>${k + 1}</td><td class="n">${mm(n.s)}</td><td class="n">${mm(n.rise)}</td><td class="n">${n.angle.toFixed(1)}°</td>
      <td class="n">${Number.isFinite(n.radius) ? n.radius.toFixed(2) : '—'}</td></tr>`).join('');

/** The gridshell sheet: the laths, where they cross, where they are joined, and the bend check. */
function gridshellSheetHTML(M, s, href) {
  const d = designFacts(M, s);
  if (!M.gridshell.ok) return `<h1>Gridshell · ${esc(d.title)}</h1><p class="sub">${esc(M.gridshell.reason)}</p>`;
  if (M.gridshell.layout === 'over') return overSheetHTML(M, s, href, d);
  const { G, mm, deg, over, facts, verdict, setOut, stock } = gridshellParts(M, s);
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
    <h3>Joints</h3>
    ${pliesTable(stock.plies(G.types[0]))}
    <p class="note">${esc(stock.method)}</p>

    <h2>Setting out</h2>
    <p class="note">${esc(setOut)}</p>
    <p class="note">${esc(PROTOTYPE)}</p>
    <p class="note link">Design link: ${esc(href)}</p>`;
}

function overSheetHTML(M, s, href, d) {
  const { G, mm, deg, over, facts, verdict, setOut, templates, stock, name, endOf } = overParts(M, s);
  const types = G.types.map((t) => `
    <h3>${esc(t.label)} · ${mm(t.length)} mm · ${t.members.length} ${t.members.length === 1 ? 'lath' : 'laths'}: ${esc(t.members.map((l) => name(l) + (l.reversed ? ' (reversed)' : '')).join(', '))}</h3>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Crossing</th><th class="n">Along the lath, mm</th><th class="n">Height above base, mm</th><th class="n">Angle between laths</th><th class="n">Bend radius, m</th></tr></thead>
      <tbody>${crossingRows(t.rep.crossings, mm)}</tbody>
    </table></div>
    <p class="note">Joints, ${t.joins} per lath:</p>
    ${pliesTable(stock.plies(t))}`).join('');
  const laths = G.laths.map((l) => `<tr>
      <td>${name(l)}</td><td>${esc(G.types[l.type].label)}${l.reversed ? ' <span class="tag">reversed</span>' : ''}</td>
      <td class="n">${mm(l.sigma)}</td><td>${esc(endOf(l, true))}</td><td>${esc(endOf(l, false))}</td><td class="n">${mm(l.length)}</td></tr>`).join('');
  return `
    <h1>Gridshell · ${esc(d.title)}</h1>
    <p class="sub">${d.lines.filter(([k]) => k === 'Shape' || k === 'Cut').map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join(' &nbsp;·&nbsp; ')} &nbsp;·&nbsp; <b>Laths:</b> ${G.N} per family over the top, crossing the ridge at ${deg(G.psi)} from the fall line</p>
    <div class="facts">${facts.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>
    <p class="note"${over ? ' style="color:var(--warn)"' : ''}>${esc(verdict)}</p>

    <h2>Lath types</h2>
    <p class="note">${esc(templates)}</p>
    ${types}
    <p class="note">${esc(stock.method)}</p>

    <h2>Setting out</h2>
    <p class="note">${esc(setOut)}</p>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Lath</th><th>Type</th><th class="n">Ridge at, mm</th><th>Start</th><th>Far end</th><th class="n">Length, mm</th></tr></thead>
      <tbody>${laths}</tbody>
    </table></div>
    <p class="note">${esc(PROTOTYPE)}</p>
    <p class="note link">Design link: ${esc(href)}</p>`;
}

function gridshellSheetRows(M, s, href) {
  const d = designFacts(M, s);
  if (!M.gridshell.ok) return [['DomeZ gridshell', d.title], ['Note', M.gridshell.reason]];
  if (M.gridshell.layout === 'over') return overSheetRows(M, s, href, d);
  const { G, mm, facts, verdict, setOut, stock } = gridshellParts(M, s);
  const rows = [['DomeZ gridshell', d.title], ...d.lines.filter(([k]) => k === 'Shape' || k === 'Cut'), ['Design link', href], [], ...facts, ['Bend check', verdict], []];
  rows.push(['The lath (every lath the same; B laths mirrored)'], ['Crossing', 'Along the lath (mm)', 'Height above base (mm)', 'Angle between laths (deg)', 'Bend radius (m)']);
  for (const n of G.nodes) rows.push([n.k ? n.k : 'base', mm(n.s), mm(n.rise), n.angle.toFixed(1), Number.isFinite(n.radius) ? n.radius.toFixed(2) : '']);
  rows.push([], ['Ply', 'Joints (mm from the start)', 'Pieces (mm)'], ...stock.plies(G.types[0]), ['Joints', stock.method]);
  rows.push([], ['Setting out', setOut]);
  return rows;
}

function overSheetRows(M, s, href, d) {
  const { G, mm, facts, verdict, setOut, templates, stock, name, endOf } = overParts(M, s);
  const rows = [['DomeZ gridshell', d.title], ...d.lines.filter(([k]) => k === 'Shape' || k === 'Cut'), ['Design link', href], [], ...facts, ['Bend check', verdict], []];
  rows.push(['Lath types', templates]);
  for (const t of G.types) {
    rows.push([], [`Type ${t.label}`, `${mm(t.length)} mm`, t.members.map((l) => name(l) + (l.reversed ? ' (reversed)' : '')).join(' ')]);
    rows.push(['Crossing', 'Along the lath (mm)', 'Height above base (mm)', 'Angle between laths (deg)', 'Bend radius (m)']);
    t.rep.crossings.forEach((n, k) => rows.push([k + 1, mm(n.s), mm(n.rise), n.angle.toFixed(1), n.radius.toFixed(2)]));
    rows.push(['Ply', 'Joints (mm from the start)', 'Pieces (mm)'], ...stock.plies(t));
  }
  rows.push([], ['Joints', stock.method], [], ['Setting out', setOut], ['Lath', 'Type', 'Ridge at (mm)', 'Start', 'Far end', 'Length (mm)']);
  for (const l of G.laths) rows.push([name(l), G.types[l.type].label + (l.reversed ? ' reversed' : ''), mm(l.sigma), endOf(l, true), endOf(l, false), mm(l.length)]);
  return rows;
}

/* ---- Lath jigs: a cradle for each kind of crossing of a gridshell ---- */

/** The lath jig sheet's shared parts: the jigs, each one's turn and where it serves, and the facts. */
function lathJigParts(M, s) {
  const G = M.gridshell, J = buildLathJigs(G, s), mm = (m) => Math.round(m * 1000);
  const turn = (j) => `${degText(j.theta)} ${j.phi >= 0 ? 'anticlockwise' : 'clockwise'}`;
  const where = (j) => (G.layout === 'crown'
    ? `crossing${j.rings.length > 1 ? 's' : ''} ${j.rings.join(', ')} of every lath, ${mm(j.rise[0])}${j.rise[1] - j.rise[0] > 0.0005 ? `–${mm(j.rise[1])}` : ''} mm up`
    : `${j.count} crossing${j.count > 1 ? 's' : ''}, ${mm(j.rise[0])}${j.rise[1] - j.rise[0] > 0.0005 ? `–${mm(j.rise[1])}` : ''} mm up`);
  const R = (r) => (Number.isFinite(r) ? `${r.toFixed(2)} m` : 'flat');
  const facts = [['Crossings', J.crossings], ['Jigs', J.jigs.length], ['Lath', `${s.lathW} × ${mm(J.stack)} mm (${s.lathPlies} × ${s.lathT})`],
    ['Turn, A over B', rangeText(J.turn)], ['Bend radii', Number.isFinite(J.radius[0]) ? `${J.radius[0].toFixed(2)}–${J.radius[1].toFixed(2)} m` : '—'],
    ['Blocks', `${mm(2 * J.reach[0])}–${mm(2 * J.reach[1])} mm square`], ['Skin fit', `within ${(J.worst * 1000).toFixed(1)} mm`],
    ['Strap round a crossing', `${mm(J.strap[0])}–${mm(J.strap[1])} mm`], ['Strap in all', `${J.strapTotal.toFixed(1)} m + seals`]];
  return { G, J, mm, turn, where, R, facts };
}

/** The lath jig sheet: a card per jig with its plan and sections, every jig in a table, and which jig
    each lath meets at each crossing. */
function lathJigSheetHTML(M, s, href) {
  const d = designFacts(M, s), G = M.gridshell;
  if (!G.ok) return `<h1>Lath jig sheet · ${esc(d.title)}</h1><p class="sub">${esc(G.reason)}</p>`;
  const { J, mm, turn, where, R, facts } = lathJigParts(M, s), f1 = (x) => x.toFixed(1);
  if (!J.jigs.length) return `<h1>Lath jig sheet · ${esc(d.title)}</h1><p class="sub">The laths never cross above the base, so there is nothing to jig.</p>`;
  const cards = J.jigs.map((j) => `
    <div class="cradle-card">
      <div class="drawing-head"><span class="dot jig">${j.name}</span><b>A over B, turned ${esc(turn(j))}</b> · ${esc(where(j))}</div>
      ${jigPlanSVG(j)}
      ${jigSectionSVG(j, 'A')}
      ${jigSectionSVG(j, 'B')}
      <div class="small-facts">Block ${mm(2 * j.reach)} × ${mm(2 * j.reach)} mm, ${mm(j.depth)} mm tall at the centre; groove ${mm(j.w + 2 * LATHJIG.clearance)} wide and ${mm(j.stack)} deep along B, fences ${mm(LATHJIG.fence)} mm along A. Bend radius ${R(j.RA)} along A and ${R(j.RB)} along B, so the top sags ${f1(j.sagA * 1000)} and ${f1(j.sagB * 1000)} mm to the block's edge; twist ${f1(Math.abs(j.twistA))}° along A and ${f1(Math.abs(j.twistB))}° along B over the block. The laths overlap ${j.overlap.long > 1 ? 'over 1000' : mm(j.overlap.long)} × ${mm(j.overlap.short)} mm${j.overlap.long > 2 * j.reach ? ', longer than the block' : ''}. Skin fit within ${(j.worst * 1000).toFixed(1)} mm. Strap round the crossing ${mm(j.strapRound)} mm plus the seal.</div>
    </div>`).join('');
  const rows = J.jigs.map((j) => `<tr>
      <td class="big">${j.name}</td><td class="n big">${esc(turn(j))}</td><td class="n">${j.count}</td><td>${esc(where(j))}</td>
      <td class="n">${R(j.RA)}</td><td class="n">${R(j.RB)}</td><td class="n">${f1(j.sagA * 1000)} / ${f1(j.sagB * 1000)}</td>
      <td class="n">${f1(Math.abs(j.twistA))}° / ${f1(Math.abs(j.twistB))}°</td><td class="n">${mm(2 * j.reach)}</td><td class="n">${mm(j.strapRound)}</td></tr>`).join('');
  const along = G.layout === 'crown'
    ? `<p class="note">Every lath is the same, so every lath meets the jigs in the same order from its base end: ${esc(J.byLath[0].map((n, k) => `${n} at crossing ${k + 1}`).join(', '))}. A jig holds one A lath over one B lath, so the B laths take the same jigs at the same crossings.</p>`
    : `<div class="tablewrap-x"><table>
      <thead><tr><th>Lath</th><th>Type</th><th>Jig at each crossing, from the lath's start</th></tr></thead>
      <tbody>${G.laths.map((l, k) => `<tr><td>${l.family}${l.i + 1}</td><td>${esc(G.types[l.type].label)}${l.reversed ? ' <span class="tag">reversed</span>' : ''}</td><td class="seq">${esc(J.byLath[k].join(' '))}</td></tr>`).join('')}</tbody>
    </table></div>`;
  const many = J.jigs.length > 12 ? `<p class="note">This design needs ${J.jigs.length} different jigs: the laths meet at many turns and the skin's curvature changes along them. For a plywood build, make one flat block per turn and shim its groove to the sag; for printing, the OpenSCAD file renders them all in a row.</p>` : '';
  return `
    <h1>Lath jig sheet · ${esc(d.title)}</h1>
    <p class="sub">Where an <b>A lath</b> (outer layer) crosses a <b>B lath</b> (inner layer), both bent to the skin, a <b>cradle</b> holds them as they sit in the shell: a block whose top copies the skin round the crossing, with lath B in a groove one lath deep and lath A over it between two fences. Clamp the pair in it to drill the bolt hole square to the skin, or to strap them together, then move on to the next crossing.</p>
    <div class="facts">${facts.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>
    <p class="note">The turn is the angle from lath B's line to lath A's line, seen from outside, so a jig and its mirror image are two jigs. The bend radii and twists are the skin's along each lath at the crossing, straight from the lath spec; the top of each block is the skin itself, fitted as a quadric, which carries them both. Crossings whose turn is within ${LATHJIG.angleStep}° and whose sag over the block is within ${LATHJIG.sagStep * 1000} mm share a jig.</p>
    ${many}

    <h2>Jigs to make</h2>
    <p class="note">Each card shows the jig from outside (lath A on top, the bolt at the crossing, the strap line dashed), then a section along each lath's centre line with the skin's sag over the block. <b>Download OpenSCAD</b> gives every block as a printable solid, with the lath size, clearance, fences, bolt and strap as settings at the top of the file; or cut a flat block to the plan and shim the groove's bed to the sag.</p>
    <div class="lathjig-grid">${cards}</div>

    <h2>All jigs</h2>
    <div class="tablewrap-x"><table>
      <thead><tr><th>Jig</th><th class="n">Turn, A over B</th><th class="n">Crossings</th><th>Where</th><th class="n">R along A</th><th class="n">R along B</th><th class="n">Sag A / B, mm</th><th class="n">Twist A / B</th><th class="n">Block, mm</th><th class="n">Strap, mm</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>

    <h2>Jigs along the laths</h2>
    ${along}
    <p class="note">Using a jig: set the block under the crossing with the groove along lath B and the fences along lath A, lay lath B in the groove and lath A over it, clamp, and drill through both on the block's axis (the skin's normal) for the bolt; or pass a strap through the block's slot, under lath B and over lath A, pull it tight and seal it. Strap lengths are the distance round the two laths; add your sealing overlap. A lath end that stops on a lath of its own family is a lap, not a crossing, and is not jigged here.</p>
    <p class="note">${esc(PROTOTYPE)}</p>
    <p class="note link">Design link: ${esc(href)}</p>`;
}

function lathJigCsvRows(M, s, href) {
  const d = designFacts(M, s), G = M.gridshell;
  if (!G.ok) return [['DomeZ lath jig sheet', d.title], ['Note', G.reason]];
  const { J, mm, where, facts } = lathJigParts(M, s), f1 = (x) => x.toFixed(1), f4 = (x) => x.toFixed(4);
  const rows = [['DomeZ lath jig sheet', d.title], ...d.lines.filter(([k]) => k === 'Shape' || k === 'Cut'), ['Design link', href], [], ...facts, []];
  rows.push(['Jig', 'Turn A over B (deg, + anticlockwise seen from outside)', 'Crossings', 'Where', 'Height above base (mm)', 'R along A (m)', 'R along B (m)',
    'Sag along A (mm)', 'Sag along B (mm)', 'Twist along A (deg over the block)', 'Twist along B (deg over the block)', 'Block (mm square)', 'Block tall at the centre (mm)',
    'Overlap long (mm)', 'Overlap short (mm)', 'Strap round (mm)', 'Skin fit (mm)', 'L (1/m)', 'M (1/m)', 'N (1/m)']);
  for (const j of J.jigs) rows.push([j.name, f1(j.phi), j.count, where(j), j.rise[1] - j.rise[0] > 0.0005 ? `${mm(j.rise[0])}-${mm(j.rise[1])}` : mm(j.rise[0]),
    Number.isFinite(j.RA) ? j.RA.toFixed(3) : '', Number.isFinite(j.RB) ? j.RB.toFixed(3) : '', f1(j.sagA * 1000), f1(j.sagB * 1000), f1(Math.abs(j.twistA)), f1(Math.abs(j.twistB)),
    mm(2 * j.reach), mm(j.depth), mm(Math.min(j.overlap.long, 10)), mm(j.overlap.short), mm(j.strapRound), (j.worst * 1000).toFixed(2), f4(j.L), f4(j.M), f4(j.N)]);
  rows.push([], ['Jigs along the laths'], ['Lath', 'Type', 'Jig at each crossing from the start']);
  G.laths.forEach((l, k) => rows.push([`${l.family}${l.i + 1}`, G.types[l.type].label + (l.reversed ? ' reversed' : ''), J.byLath[k].join(' ')]));
  return rows;
}

/** Every jig of a gridshell as OpenSCAD source. */
function lathJigScadText(M, s, href) {
  const d = designFacts(M, s), G = M.gridshell;
  if (!G || !G.ok) return `// DomeZ lath crossing jigs · ${d.title}\n// ${G ? G.reason : 'Not a gridshell design.'}\n`;
  return lathJigSCAD(buildLathJigs(G, s), s, d.title, href);
}

DomeZ.sheets = {
  sideText, faceText, shapeTitle, designFacts, boardsAroundHub, sawText, lumberSheetHTML, cutSheetHTML,
  lumberSheetRows, cutSheetRows, jigSheetHTML, jigCsvRows, gridshellSheetHTML, gridshellSheetRows,
  lathJigSheetHTML, lathJigCsvRows, lathJigScadText,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
