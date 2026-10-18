import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, REFERENCE } from './load.mjs';

const { baseName, shapeLine, objText, boardsObjText, pythonCommand } = DomeZ.export;
const { buildModel } = DomeZ.model;

const HREF = 'https://example.test/DomeZ/';

test('file names and the shape line', () => {
  assert.equal(baseName(design(REFERENCE)), 'sphere_3v_chords_3-4');
  assert.equal(baseName(design({ method: 'flat', partial: '0.6', shape: 'egg' })), 'egg_3v_flat_0_6');
  assert.equal(shapeLine(design({ shape: 'ellipsoid' })), '# Shape: ellipsoid, radii X=3 m, Y=3 m, Z=4.5 m');
});

test('the OBJ has every hub and face, Z or Y up, and optional strut lines', () => {
  const s = design({ ...REFERENCE, frame: 'struts' });
  const M = buildModel(s);
  const text = objText(M, s, HREF);
  const v = text.split('\n').filter((l) => l.startsWith('v ')), f = text.split('\n').filter((l) => l.startsWith('f '));
  assert.equal(v.length, 76);
  assert.equal(f.length, 135);
  assert.ok(text.includes('# Viewer link: https://example.test/DomeZ/#r=3&method=chords&partial=3%2F4&frame=struts'));
  assert.equal(text.split('\n').filter((l) => l.startsWith('l ')).length, 0);
  const lines = objText(M, { ...s, objLines: true }, HREF).split('\n').filter((l) => l.startsWith('l '));
  assert.equal(lines.length, 210);
  // Y up swaps the axes: (x, y, z) → (x, z, -y)
  const zUp = v[0].split(' ').slice(1).map(Number), yUp = objText(M, { ...s, upAxis: 'y' }, HREF).split('\n').find((l) => l.startsWith('v ')).split(' ').slice(1).map(Number);
  assert.deepEqual(yUp, [zUp[0], zUp[2], -zUp[1] || 0]);
});

test('the boards OBJ: one closed solid per board, grouped by type', () => {
  const s = design(REFERENCE);
  const text = boardsObjText(buildModel(s), s);
  const lines = text.split('\n');
  assert.deepEqual(lines.filter((l) => l.startsWith('g ')), ['g board_A', 'g board_B', 'g board_C', 'g board_D']);
  assert.equal(lines.filter((l) => l.startsWith('v ')).length, 210 * 8);
  assert.equal(lines.filter((l) => l.startsWith('f ')).length, 210 * 6);
});

test('the matching Python command', () => {
  assert.equal(pythonCommand(design(REFERENCE)), 'python3 -m domez dome -f 3 -r 3 -p 3/4 -b icosahedron -m chords');
  assert.equal(pythonCommand(design({ method: 'flat', partial: '0.6', flat: true, sym: 'pentad' })),
    'python3 -m domez dome -f 3 -r 2.2 -p 0.6 -b icosahedron -s pentad --flat-base');
  assert.match(pythonCommand(design({ shape: 'egg', eggTip: 'down' })), /EggGeodesic\(3, length=6, breadth=4\.4, asymmetry=-0\.08,/);
  assert.match(pythonCommand(design({ shape: 'ellipsoid', partial: '1' })), /^from domez import EllipsoidalGeodesic\nEllipsoidalGeodesic\(3, 3, 3, 4\.5,\n    base='icosahedron', method='kruschke'\)/);
});
