import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import DomeZ, { ROOT, design, REFERENCE } from './load.mjs';

const { boardDrawing, boardSVG, overallOf } = DomeZ.drawing;
const { buildModel } = DomeZ.model;
const FIXTURE = JSON.parse(readFileSync(path.join(ROOT, 'tests/js/fixtures/acidome-drawings.json'), 'utf8'));

/** Every <text> on a drawing, as Acidome's labels are recorded: sorted and joined by |. */
const labels = (svg) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).sort().join('|');

for (const d of FIXTURE.designs) {
  test(`drawings match Acidome label for label: ${d.name}`, () => {
    const L = buildModel(design(d.state)).lumber;
    for (const [label, [count, want]] of Object.entries(d.types)) {
      const bt = L.boardTypes.find((t) => t.label === label);
      assert.ok(bt, `type ${label}`);
      assert.equal(bt.members.length, count, `${label} count`);
      assert.equal(labels(boardSVG(bt.rep, L, '#000')), want, `${label} labels`);
    }
  });
}

const L = buildModel(design(REFERENCE)).lumber;

test('marks: chained rounding, both ends, both faces, both edges', () => {
  const D = boardDrawing(L.boardTypes[0].rep, L);
  assert.equal(D.marks.length, 8);
  const row = (edge) => D.marks.filter((m) => m.edge === edge).map((m) => m.label).sort((a, b) => a - b).join(' ');
  assert.equal(row('top'), '0 25 1188 1214');
  assert.equal(row('bottom'), '22 47 1212 1238');
  assert.equal(D.overall, 1238);
  assert.equal(overallOf(L.boardTypes[0], L), 1238);
  assert.equal(D.shortest, Math.min(...D.edgeLengths.map((e) => e.mm)));
  assert.deepEqual(D.edgeLengths.map((e) => e.mm).sort((a, b) => a - b), [1163, 1165, 1214, 1216]);
});

test('saw settings with the outer face down: miter = red, bevel = 90° − blue', () => {
  const D = boardDrawing(L.boardTypes[0].rep, L);
  assert.deepEqual(D.saw.map((s) => s.outerDown), [{ miter: 28.4, bevel: 10.7 }, { miter: 30.6, bevel: 10.5 }]);
});

test('each end keeps its whole cut at true scale; every cut ends on a mark', () => {
  for (const shape of [REFERENCE, { r: 3, freq: 1, partial: '3/4', flat: true, method: 'chords' }, { shape: 'egg', freq: 4, method: 'chords', partial: '3/4' }]) {
    const LL = buildModel(design(shape)).lumber;
    for (const bt of LL.boardTypes) {
      const D = boardDrawing(bt.rep, LL), svg = boardSVG(bt.rep, LL, '#000');
      const xs = [...svg.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)" class="ref"/g)].map((m) => +m[1]);
      for (const m of svg.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)" class="cut[^"]*"/g)) {
        for (const [x, y] of [[+m[1], +m[2]], [+m[3], +m[4]]]) {
          if (Math.abs(y - 34) < 0.5 || Math.abs(y - 176) < 0.5) assert.ok(xs.some((v) => Math.abs(v - x) < 0.6), `${bt.label}: cut end without a mark`);
        }
      }
      assert.ok(D.extent[0] > 0 && D.extent[1] > 0 && D.extent[0] < D.length);
    }
  }
});

test('a board on the cut edge shows its one panel angle', () => {
  const egg = buildModel(design({ shape: 'egg', freq: 4, method: 'chords', partial: '3/4' })).lumber;
  const edge = egg.boards.find((bd) => bd.selvage);
  assert.equal(boardDrawing(edge, egg).faceAngles.length, 1);
  assert.equal(boardDrawing(L.boardTypes[0].rep, L).faceAngles.length, 2);
});
