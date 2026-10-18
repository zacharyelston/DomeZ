import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ, { design, REFERENCE } from './load.mjs';

const { shapeTitle, designFacts, cutSheetHTML, cutSheetRows, jigSheetHTML, jigCsvRows, boardsAroundHub } = DomeZ.sheets;
const { buildModel } = DomeZ.model;

const HREF = 'https://example.test/DomeZ/#r=3';
const s = design(REFERENCE);
const M = buildModel(s);

test('titles and facts', () => {
  assert.equal(shapeTitle(s), '3V Chords icosa sphere · 3/4');
  assert.equal(shapeTitle(design({ shape: 'egg', method: 'flat', partial: '1', base: 'octahedron' })), '3V flat-grid octa egg · full');
  const d = designFacts(M, s);
  assert.deepEqual(d.lines[0], ['Shape', 'Sphere, radius 3 m']);
  assert.deepEqual(d.facts.slice(0, 2), [['Struts', 210], ['Strut types', M.groups.length]]);
});

test('the Joint cut sheet: boards, drawings, hubs and panels', () => {
  const html = cutSheetHTML(M, s, HREF);
  assert.equal((html.match(/<svg class="board"/g) || []).length, 4);
  assert.match(html, /<td class="n big">1238<\/td>/);
  assert.match(html, /28\.4° miter, 10\.7° bevel/);
  assert.ok(html.includes(`Design link: ${HREF}`));
  const rows = cutSheetRows(M, s, HREF);
  const boards = rows.findIndex((r) => r[0] === 'Boards');
  assert.deepEqual(rows[boards + 2].slice(0, 5), ['A', 90, 1238, '48 3/4"', 1163]);
  assert.deepEqual(rows[boards + 2].slice(-2), ['0 25 1188 1214', '22 47 1212 1238']);
});

test('the struts cut sheet', () => {
  const st = design({ ...REFERENCE, frame: 'struts', tol: 1 });
  const SM = buildModel(st);
  const html = cutSheetHTML(SM, st, HREF);
  assert.match(html, /<h2>Struts<\/h2>/);
  assert.doesNotMatch(html, /<svg class="board"/);
  const rows = cutSheetRows(SM, st, HREF);
  assert.ok(rows.some((r) => r.length === 1 && r[0] === 'Struts'), 'a Struts section');
  assert.deepEqual(rows.find((r) => r[0] === 'Struts'), ['Struts', 210]);       // the summary line comes first
  assert.equal(rows.filter((r) => /^[A-Z]+$/.test(String(r[0])) && r.length === 7).length, SM.groups.length);
});

test('the jig sheet: cradles, a card per board, two passes', () => {
  const html = jigSheetHTML(M, s, HREF);
  assert.equal((html.match(/<svg class="cradle"/g) || []).length, 6);
  assert.equal((html.match(/class="drawing jig-board"/g) || []).length, 4);
  assert.equal((html.match(/<svg class="topview"/g) || []).length, 8);
  assert.match(html, /Pass 1 · first ends[\s\S]*Pass 2 · second ends, to length/);
  const rows = jigCsvRows(M, s, HREF);
  assert.equal(rows.filter((r) => /^Pass \d/.test(String(r[0]))).length, 2);
  assert.equal(rows.filter((r) => ['A', 'B', 'C', 'D'].includes(r[0]) && r.length === 16).length, 8);
});

test('boards around a hub, clockwise from outside', () => {
  const L = M.lumber;
  const ring = boardsAroundHub(L, L.hubTypes[0].hubs[0]);
  assert.equal(ring.length, L.hubTypes[0].valence);
});
