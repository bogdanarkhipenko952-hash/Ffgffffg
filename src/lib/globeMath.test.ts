import test from 'node:test';
import assert from 'node:assert/strict';
import {
  latLonToUnitVec,
  decodeLandDots,
  projectGlobePoint,
  buildGreatCircleArc,
} from './globeMath';

test('latLonToUnitVec produces unit-length vectors', () => {
  const moscow = latLonToUnitVec(55.75, 37.62);
  const len = Math.hypot(moscow.x, moscow.y, moscow.z);
  assert.ok(Math.abs(len - 1) < 1e-6);
  assert.ok(moscow.y > 0.8); // Northern hemisphere
});

test('decodeLandDots decodes tenths of degrees accurately', () => {
  const dots = decodeLandDots([376, 558, -463, -240]);
  assert.equal(dots.length, 2);
  assert.ok(dots[0].y > 0);
  assert.ok(dots[1].y < 0);
});

test('projectGlobePoint centers Moscow when viewLon matches Moscow lon', () => {
  const moscow = latLonToUnitVec(55.75, 37.62);
  const proj = projectGlobePoint(moscow, 37.62, 9);
  assert.ok(Math.abs(proj.x) < 1e-5);
  assert.ok(proj.z > 0.65 && proj.z < 0.72); // Facing viewer at cos(55.75 - 9)
});

test('buildGreatCircleArc lifts midpoint above sphere surface', () => {
  const p1 = latLonToUnitVec(55.75, 37.62);
  const p2 = latLonToUnitVec(39.9, 116.4);
  const arc = buildGreatCircleArc(p1, p2, 56);
  assert.equal(arc.length, 57);
  const mid = arc[28];
  const midR = Math.hypot(mid.x, mid.y, mid.z);
  assert.ok(midR > 1.07);
  const endR = Math.hypot(arc[0].x, arc[0].y, arc[0].z);
  assert.ok(Math.abs(endR - 1) < 1e-5);
});
