/* DomeZ · state: The design state: its defaults, and reading and writing it as a URL query. */
(function (DomeZ) {
'use strict';
const { SYMMETRY_OPTIONS, METHODS } = DomeZ.geodesic;

const DEFAULTS = {
  shape: 'sphere', r: 2.2, rx: 3, ry: 3, rz: 4.5, eggL: 6, eggB: 4.4, eggW: 0.08, eggTip: 'up',
  base: 'icosahedron', freq: 3, method: 'kruschke', sym: 'pentad', partial: '7/12', flat: false,
  panels: 'glass', showStruts: true, showHubs: true, colorTypes: true, spin: false,
  tol: 1, frame: 'joint', beamW: 120, beamT: 40, gap: 0, upAxis: 'z', objLines: false,
};

const NUMERIC = new Set(['r', 'rx', 'ry', 'rz', 'eggL', 'eggB', 'eggW', 'freq', 'tol', 'beamW', 'beamT', 'gap']);

const FRAMES = {
  joint: 'Acidome\u2019s Joint: hubless boards, each end cut against the side of the next board clockwise around the hub (seen from outside). Width runs along the radius; every board aims at the dome\u2019s centre.',
  'joint-ccw': 'Joint turning the other way: each board butts into the next board anticlockwise around the hub.',
  struts: 'Hub-to-hub struts only, for metal hubs or your own connectors. Lengths are centre to centre.',
};

const BOOLEAN = new Set(['flat', 'showStruts', 'showHubs', 'colorTypes', 'spin', 'objLines']);

/** A design from a URL query ("r=3&freq=4…"), filling in defaults and clamping bad values. */
function parseState(query) {
  const s = { ...DEFAULTS };
  const q = new URLSearchParams(query);
  for (const [k, v] of q) {
    if (!(k in DEFAULTS)) continue;
    if (NUMERIC.has(k)) { const n = parseFloat(v); if (Number.isFinite(n)) s[k] = n; }
    else if (BOOLEAN.has(k)) s[k] = v === '1';
    else s[k] = v;
  }
  if (!METHODS[s.method]) s.method = DEFAULTS.method;
  if (s.base !== 'octahedron') s.base = 'icosahedron';
  if (!SYMMETRY_OPTIONS.some((x) => x.v === s.sym)) s.sym = DEFAULTS.sym;
  s.freq = Math.min(12, Math.max(1, Math.round(s.freq)));
  if (!FRAMES[s.frame]) s.frame = DEFAULTS.frame;
  if (!(s.beamW > 0)) s.beamW = DEFAULTS.beamW;
  if (!(s.beamT > 0)) s.beamT = DEFAULTS.beamT;
  if (!(s.gap >= 0)) s.gap = 0;
  return s;
}

/** The query for a design: only values that differ from the defaults, in the defaults' order. */
function stateQuery(s) {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) {
    if (s[k] === DEFAULTS[k]) continue;
    q.set(k, BOOLEAN.has(k) ? (s[k] ? '1' : '0') : String(s[k]));
  }
  return q.toString();
}

DomeZ.state = {
  DEFAULTS, NUMERIC, BOOLEAN, FRAMES, parseState, stateQuery,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
