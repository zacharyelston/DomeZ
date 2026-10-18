/* DomeZ · format: Text formatting shared by the sheets and exports. */
(function (DomeZ) {
'use strict';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const mmText = (m) => String(Math.round(m * 1000));

/** Metres to inches, to the nearest 1/16". */
function inchText(m) {
  const sixteenths = Math.round(m / 0.0254 * 16);
  const whole = Math.floor(sixteenths / 16);
  let num = sixteenths % 16, den = 16;
  if (!num) return `${whole}"`;
  while (num % 2 === 0) { num /= 2; den /= 2; }
  return `${whole} ${num}/${den}"`;
}

const fmtM = (m) => (m >= 10 ? m.toFixed(2) : m.toFixed(3)) + ' m';

const fmtLen = (m) => (m < 1 ? (m * 1000).toFixed(1) + ' mm' : m.toFixed(4) + ' m');

const degText = (a) => a.toFixed(1) + '°';

const rangeText = (r) => (r[0].toFixed(1) === r[1].toFixed(1) ? degText(r[0]) : `${r[0].toFixed(1)}–${r[1].toFixed(1)}°`);

/** CSV text for rows of cells, with a byte-order mark so spreadsheet apps read ×, ², – and inch marks as UTF-8. */
function csvText(rows) {
  const q = (v) => { const t = String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\n') + '\n';
}

DomeZ.format = {
  esc, mmText, inchText, fmtM, fmtLen, degText, rangeText, csvText,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
