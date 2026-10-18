import test from 'node:test';
import assert from 'node:assert/strict';
import DomeZ from './load.mjs';

const { PRODUCT_COLORS, productColor, CATEGORICAL, typeColor, mixHex } = DomeZ.colors;

test('Acidome\'s palette: its ten named colours, then the generated ones', () => {
  assert.deepEqual(PRODUCT_COLORS.slice(0, 10),
    ['#CC2222', '#CCCC22', '#22CC22', '#058361', '#272C5B', '#A72465', '#F2801F', '#95B6E1', '#00617E', '#8B4588']);
  assert.ok(PRODUCT_COLORS.length > 99);
  for (const c of PRODUCT_COLORS) assert.match(c, /^#[0-9A-F]{6}$/);
  assert.equal(productColor(0), '#CC2222');
  assert.equal(productColor(1e6), PRODUCT_COLORS[98]);
});

test('strut types: a categorical palette for up to ten, then a ramp', () => {
  assert.equal(typeColor(3, 10), CATEGORICAL[3]);
});

test('the ramp matches three.js r160 (Color.lerp in linear light, then getHexString)', () => {
  // recorded from three@0.160.0 in the browser
  const three = [[0, 11, '#2b4c9b'], [5, 11, '#62bb6d'], [10, 11, '#e8743a'], [3, 20, '#2f7dbf'], [17, 40, '#53b284'],
    [29, 30, '#e8743a'], [1, 13, '#2d69af'], [100, 257, '#46ac91']];
  for (const [k, n, hex] of three) assert.equal(typeColor(k, n), hex, `${k} of ${n}`);
  assert.equal(mixHex('#000000', '#ffffff', 0), '#000000');
  assert.equal(mixHex('#000000', '#ffffff', 1), '#ffffff');
});
