/* DomeZ · vec: 3-vector helpers on plain [x, y, z] arrays. */
(function (DomeZ) {
'use strict';

const PHI = (1 + Math.sqrt(5)) / 2;

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const len = (a) => Math.hypot(a[0], a[1], a[2]);

const norm = (a) => { const l = len(a); return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : a; };

const rotX = (p, t) => [p[0], p[1] * Math.cos(t) - p[2] * Math.sin(t), p[1] * Math.sin(t) + p[2] * Math.cos(t)];

const rotY = (p, t) => [p[0] * Math.cos(t) + p[2] * Math.sin(t), p[1], -p[0] * Math.sin(t) + p[2] * Math.cos(t)];

const rotZ = (p, t) => [p[0] * Math.cos(t) - p[1] * Math.sin(t), p[0] * Math.sin(t) + p[1] * Math.cos(t), p[2]];

const unit = (a) => norm(a);

const comp = (v, d) => dot(v, unit(d));

const angleBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b)))));

/** Solve three planes n·X = d. */
function solve3(n1, d1, n2, d2, n3, d3) {
  const c23 = cross(n2, n3), c31 = cross(n3, n1), c12 = cross(n1, n2), det = dot(n1, c23);
  return add(add(mul(c23, d1 / det), mul(c31, d2 / det)), mul(c12, d3 / det));
}

const R2D = 180 / Math.PI;

DomeZ.vec = {
  PHI, R2D, add, sub, mul, dot, cross, len,
  norm, unit, comp, angleBetween, rotX, rotY, rotZ, solve3,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
