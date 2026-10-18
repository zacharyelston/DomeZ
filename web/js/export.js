/* DomeZ · export: OBJ exports, file names and the matching Python command. */
(function (DomeZ) {
'use strict';
const { PY_NATIVE_SYM, METHODS, effectiveMethod } = DomeZ.geodesic;
const { parsePartial, fracText, effectivePartial } = DomeZ.cut;
const { boardQuads } = DomeZ.lumber;
const { stateQuery } = DomeZ.state;

function baseName(s) {
  const f = fracText(effectivePartial(s));
  const part = f === '1/1' ? 'full' : f.replace('/', '-').replace('.', '_');
  return `${s.shape}_${s.freq}v_${effectiveMethod(s)}_${part}`;
}

function shapeLine(s) {
  if (s.shape === 'egg') return `# Shape: Hügelschäffer egg, length ${s.eggL} m, breadth ${s.eggB} m, asymmetry ${Math.round(s.eggW * 100)}%, pointed end ${s.eggTip}`;
  if (s.shape === 'ellipsoid') return `# Shape: ellipsoid, radii X=${s.rx} m, Y=${s.ry} m, Z=${s.rz} m`;
  return `# Shape: sphere, radius ${s.r} m`;
}

/** Every board as a closed solid, grouped by board type (like Acidome's "Framework .obj"). */
function boardsObjText(M, s) {
  const L = M.lumber;
  const toOut = s.upAxis === 'y' ? (p) => [p[0], p[2], -p[1]] : (p) => p;
  const lines = ['# DomeZ boards export (Joint)', shapeLine(s),
    `# Boards: ${L.boards.length} in ${L.boardTypes.length} types, ${s.beamW} x ${s.beamT} mm`,
    `# Units: metres, up axis: ${s.upAxis.toUpperCase()}`, ''];
  let base = 1;
  for (const bt of L.boardTypes) {
    lines.push(`g board_${bt.label}`);
    for (const bd of bt.members) {
      const quads = boardQuads(bd), verts = [], index = new Map();
      const id = (pt) => { const k = pt.map((c) => c.toFixed(9)).join(','); if (!index.has(k)) { index.set(k, verts.length); verts.push(pt); } return index.get(k); };
      const faces = quads.map(([q]) => q.map(id));
      for (const pt of verts) { const o = toOut(pt); lines.push(`v ${o[0].toFixed(6)} ${o[1].toFixed(6)} ${o[2].toFixed(6)}`); }
      for (const f of faces) lines.push('f ' + f.map((i) => i + base).join(' '));
      base += verts.length;
    }
  }
  return lines.join('\n') + '\n';
}

function objText(M, s, href) {
  const toOut = s.upAxis === 'y' ? (p) => [p[0], p[2], -p[1]] : (p) => p;
  const lines = [
    '# DomeZ viewer export',
    shapeLine(s),
    `# Frequency: ${s.freq}V, base: ${s.base}, method: ${METHODS[effectiveMethod(s)].label}, symmetry: ${s.sym}`,
    `# Partial: ${fracText(effectivePartial(s)) === '1/1' ? 'full' : fracText(effectivePartial(s))}${s.flat ? ', flattened base' : ''}`,
    `# Units: metres, up axis: ${s.upAxis.toUpperCase()}`,
    `# Vertices: ${M.pts.length}`,
    `# Faces: ${M.tris.length}`,
    `# Struts: ${M.edges.length} in ${M.groups.length} types (grouped within ${s.tol} mm)`,
  ];
  if (METHODS[effectiveMethod(s)].credit) lines.push('# ' + METHODS[effectiveMethod(s)].credit);
  lines.push('# Viewer link: ' + href.split('#')[0] + '#' + stateQuery(s));
  lines.push('');
  for (const p of M.pts) { const q = toOut(p); lines.push(`v ${q[0].toFixed(6)} ${q[1].toFixed(6)} ${q[2].toFixed(6)}`); }
  lines.push('');
  for (const t of M.tris) lines.push(`f ${t[0] + 1} ${t[1] + 1} ${t[2] + 1}`);
  if (s.objLines) { lines.push(''); for (const [a, b] of M.edges) lines.push(`l ${a + 1} ${b + 1}`); }
  return lines.join('\n') + '\n';
}

/** The same dome from the Python package (python3 -m domez dome / from domez import ...), leaving out its defaults. */
function pythonCommand(s) {
  const method = effectiveMethod(s);
  const defaultSym = method === 'flat' ? PY_NATIVE_SYM[s.base] : 'pentad';
  const f = parsePartial(effectivePartial(s));
  const full = f.value >= 1;
  const part = full ? '1' : f.q ? `${f.p}/${f.q}` : String(f.value); // "7/12" is valid Python too
  const flat = s.flat && !full;
  if (s.shape === 'sphere') {
    const args = [`-f ${s.freq}`, `-r ${s.r}`, `-p ${part}`, `-b ${s.base}`];
    if (method !== 'flat') args.push(`-m ${method}`);
    if (s.sym !== defaultSym) args.push(`-s ${s.sym}`);
    if (flat) args.push('--flat-base');
    return `python3 -m domez dome ${args.join(' ')}`;
  }
  const kw = [`base='${s.base}'`];
  if (!full) kw.push(`partial=${part}`);
  if (method !== 'flat') kw.push(`method='${method}'`);
  if (s.sym !== defaultSym) kw.push(`symmetry='${s.sym}'`);
  if (flat) kw.push('flat_base=True');
  if (s.shape === 'ellipsoid') {
    return `from domez import EllipsoidalGeodesic\nEllipsoidalGeodesic(${s.freq}, ${s.rx}, ${s.ry}, ${s.rz},\n    ${kw.join(', ')})\\\n    .generate().to_obj('ellipsoid.obj')`;
  }
  const asymmetry = s.eggTip === 'up' ? s.eggW : -s.eggW;
  return `from domez import EggGeodesic\nEggGeodesic(${s.freq}, length=${s.eggL}, breadth=${s.eggB}, asymmetry=${asymmetry},\n    ${kw.join(', ')})\\\n    .generate().to_obj('egg.obj')`;
}

DomeZ.export = {
  baseName, shapeLine, objText, boardsObjText, pythonCommand,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
