import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import DomeZ, { ROOT, PAGE, SCRIPTS } from './load.mjs';

test('the page loads every module, each before the code that uses it', () => {
  const files = readdirSync(path.join(ROOT, 'web/js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f).sort();
  assert.deepEqual([...SCRIPTS].sort(), files);
  assert.ok(PAGE.indexOf('<script src="js/') < PAGE.indexOf('<script type="module">'));
  // a module may only take from modules listed before it
  SCRIPTS.forEach((src, k) => {
    const text = readFileSync(path.join(ROOT, 'web', src), 'utf8');
    for (const [, dep] of text.matchAll(/= DomeZ\.(\w+);/g)) {
      assert.ok(SCRIPTS.slice(0, k).includes(`js/${dep}.js`), `${src} takes from ${dep} before it is loaded`);
    }
  });
});

test('each module adds just its own namespace', () => {
  assert.deepEqual(Object.keys(DomeZ), SCRIPTS.map((s) => path.basename(s, '.js')));
  for (const ns of Object.values(DomeZ)) for (const [k, v] of Object.entries(ns)) assert.notEqual(v, undefined, k);
});

test('the page script imports only names the modules export', () => {
  const script = PAGE.slice(PAGE.indexOf('<script type="module">'));
  for (const [, names, mod] of script.matchAll(/^const \{ ([^}]+) \} = DomeZ\.(\w+);$/gm)) {
    for (const n of names.split(',').map((x) => x.trim())) assert.ok(n in DomeZ[mod], `${mod}.${n}`);
  }
});
