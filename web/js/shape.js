/* DomeZ · shape: From the unit sphere to the final shape in metres: sphere, ellipsoid or Hügelschäffer egg. */
(function (DomeZ) {
'use strict';
const { mul } = DomeZ.vec;

/** Unit sphere -> final shape in metres. */
function shapeTransform(p) {
  if (p.shape === 'ellipsoid') return (q) => [q[0] * p.rx, q[1] * p.ry, q[2] * p.rz];
  if (p.shape === 'egg') {
    // Hügelschäffer egg: r(t) = (B/2) * sqrt((L² - 4t²) / (L² + 8wt + 4w²)), t along the axis.
    // A unit-sphere point at height z maps to t = zL/2; its horizontal radius sqrt(1-z²) scales by
    // r(t)/sqrt(1-z²) = (B/2)·L / sqrt(L² + 8wt + 4w²), which stays finite at the poles.
    const L = p.eggL, B = p.eggB, w = p.eggW * L * (p.eggTip === 'up' ? 1 : -1);
    return (q) => {
      const t = q[2] * L / 2;
      const s = (B / 2) * L / Math.sqrt(L * L + 8 * w * t + 4 * w * w);
      return [q[0] * s, q[1] * s, t];
    };
  }
  return (q) => mul(q, p.r);
}

DomeZ.shape = {
  shapeTransform,
};
})(globalThis.DomeZ = globalThis.DomeZ || {});
