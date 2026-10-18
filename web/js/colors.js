/* DomeZ · colors: Colours: Acidome's product palette and the viewer's strut-type colours. */
(function (DomeZ) {
'use strict';

/** Acidome's palette for product types (beam A, hub 1 and face 1 share a colour). */
const PRODUCT_COLORS = (() => {
  const line = ['#CC2222', '#CCCC22', '#22CC22', '#058361', '#272C5B', '#A72465', '#F2801F', '#95B6E1', '#00617E', '#8B4588'];
  const dim = 10, steps = [], shifting = [];
  for (let i = 0; i < dim; i++) steps.push(255 - Math.floor((255 / dim) * i));
  for (let i = 0; i < dim; i++) if (i % 2) shifting.push(i);
  for (let i = 0; i < dim; i++) if (!(i % 2)) shifting.push(i);
  const hex = (x) => Math.max(0, Math.min(255, x)).toString(16).toUpperCase().padStart(2, '0');
  for (let k = 0; k < dim; k++) for (let j = 0; j < dim; j++) for (let i = 0; i < dim; i++) {
    const s = shifting[i] + shifting[j] + shifting[k];
    if (s % 2 === 0 && s > 2 && s < dim * 3 - 2) {
      const mod = Math.floor(s / 2);
      if (mod % 3 !== 2 && !(mod % 2)) line.push('#' + hex(steps[shifting[i]]) + hex(steps[shifting[j]]) + hex(steps[shifting[k]]));
    }
  }
  return line;
})();

const productColor = (k) => PRODUCT_COLORS[k] || PRODUCT_COLORS[98] || '#888888';

// Categorical palette for a few strut types; a continuous ramp once there are many.
const CATEGORICAL = ['#3b7ddd', '#e8833a', '#2fa37a', '#c94f7c', '#8a63d2', '#c9a227', '#3fb0c9', '#7f8a3a', '#d4604a', '#5f6fb0'];

const RAMP = ['#2b4c9b', '#2f7fc1', '#2fa3a0', '#62bb6d', '#b9c64a', '#f0b33c', '#e8743a'];

function typeColor(k, n) {
  if (n <= CATEGORICAL.length) return CATEGORICAL[k];
  const t = n === 1 ? 0 : k / (n - 1);
  const x = t * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(x));
  return mixHex(RAMP[i], RAMP[i + 1], x - i);
}

// sRGB <-> linear as three.js r160 converts them, so the ramp mixes in linear light like Color.lerp
const toLinear = (c) => (c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4));
const toSRGB = (c) => (c < 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055);
/** Mix two #rrggbb colours a share t of the way from a to b. */
function mixHex(a, b, t) {
  const ch = (h, k) => toLinear(parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16) / 255);
  return '#' + [0, 1, 2].map((k) => {
    const v = ch(a, k) + (ch(b, k) - ch(a, k)) * t;
    return Math.round(Math.min(255, Math.max(0, toSRGB(v) * 255))).toString(16).padStart(2, '0');
  }).join('');
}

DomeZ.colors = {
  PRODUCT_COLORS, productColor, CATEGORICAL, RAMP, typeColor, mixHex,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
