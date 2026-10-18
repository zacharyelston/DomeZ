// Loads the viewer's modules (web/js/*.js) the way the page does: as classic scripts, in the order
// web/index.html lists them, sharing one global DomeZ namespace. Each test file gets its own copy.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PAGE = readFileSync(path.join(ROOT, 'web/index.html'), 'utf8');
export const SCRIPTS = [...PAGE.matchAll(/<script src="(js\/[\w-]+\.js)"><\/script>/g)].map((m) => m[1]);

globalThis.DomeZ = {};
for (const src of SCRIPTS) vm.runInThisContext(readFileSync(path.join(ROOT, 'web', src), 'utf8'), { filename: src });

const DomeZ = globalThis.DomeZ;
export default DomeZ;

/** A full design: the viewer's defaults with some values changed. */
export const design = (patch = {}) => ({ ...DomeZ.state.DEFAULTS, ...patch });

/** The reference dome checked against acidome.com: 3V Chords, 3/4, radius 3 m, Joint, 120 × 40 boards. */
export const REFERENCE = { r: 3, method: 'chords', partial: '3/4' };

/** Close to within tol (absolute). */
export const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
