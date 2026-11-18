import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMoskvaRiver,
  buildMoscowRing,
  generateMoscowDotGrid,
  moscowKmToUnitVec,
  MOSCOW_HUBS,
} from './moscowMap';
import { computeNonWhiteBounds } from './imageCrop';
import { filterReviewsByDistrict, MOSCOW_REVIEWS } from '../data/reviewsData';

test('moscowKmToUnitVec maps Kremlin (0,0) directly to front pole', () => {
  const center = moscowKmToUnitVec(0, 0);
  assert.equal(center.x, 0);
  assert.equal(center.y, 0);
  assert.equal(center.z, 1);
});

test('generateMoscowDotGrid produces dense Moscow urban fabric with unit vectors', () => {
  const dots = generateMoscowDotGrid();
  assert.ok(dots.length > 700 && dots.length < 2500);
  for (const d of dots) {
    const len = Math.hypot(d.x, d.y, d.z);
    assert.ok(Math.abs(len - 1) < 1e-6);
    assert.ok(d.z > 0.5);
  }
});

test('Moscow rings, river, and 4 Moscow hubs are well-formed', () => {
  const mkad = buildMoscowRing(17.2, 20.4);
  assert.equal(mkad.length, 73);
  const river = buildMoskvaRiver(48);
  assert.equal(river.length, 49);
  assert.equal(MOSCOW_HUBS.length, 4);
});

test('computeNonWhiteBounds tightly isolates left & right units on synthetic RGBA buffer', () => {
  const w = 100;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4).fill(255); // pure white
  // Paint dark pixel block in left slice (x: 10..30, y: 12..25)
  for (let y = 12; y <= 25; y++) {
    for (let x = 10; x <= 30; x++) {
      const i = (y * w + x) * 4;
      data[i] = 20;
      data[i + 1] = 50;
      data[i + 2] = 40;
    }
  }
  const b = computeNonWhiteBounds(data, w, h, 0, 55);
  assert.equal(b.x, 7);
  assert.equal(b.y, 9);
  assert.equal(b.width, 27);
  assert.equal(b.height, 20);
});

test('filterReviewsByDistrict returns all or filtered Moscow district reviews', () => {
  assert.equal(filterReviewsByDistrict('all').length, MOSCOW_REVIEWS.length);
  const cao = filterReviewsByDistrict('cao');
  assert.ok(cao.length >= 2);
  assert.ok(cao.every((r) => r.districtKey === 'cao'));
});
