import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLayoutUnits,
  computeHorizonGlow,
  computeServicesProgress,
  computeCardSweepPercent,
  formatStatValue,
  computeSpeedKmh,
} from './scrollMath';

test('computeLayoutUnits produces exact desktop sticky units at 1440x900', () => {
  const units = computeLayoutUnits(1440, 900, 2200);
  assert.equal(units.uc, 1);
  assert.equal(units.uv, 1);
  assert.equal(units.us, 1);
  assert.equal(units.modes.sticky, true);
  assert.equal(units.modes.port, false);
  assert.equal(units.modes.land, false);
  assert.equal(units.modes.hp, false);
  assert.equal(units.wrapHeight, 1.65 * 900);
});

test('computeLayoutUnits handles portrait mobile and short landscape properly', () => {
  const port = computeLayoutUnits(375, 812);
  assert.equal(port.modes.port, true);
  assert.equal(port.modes.hp, true);
  assert.equal(port.modes.sticky, false);

  const land = computeLayoutUnits(812, 375, 2200, 500);
  assert.equal(land.modes.land, true);
  assert.equal(land.modes.hp, true);
  assert.equal(land.modes.sticky, false);
  assert.equal(land.uc, 812 / 1440);
  assert.equal(land.heroHeight, 528);
});

test('computeHorizonGlow tracks edge, deceleration, fade, and glitch out', () => {
  const wrapH = 1.65 * 900;
  const start = computeHorizonGlow(wrapH, 0, 900);
  assert.ok(start.e > 1.1);
  assert.equal(start.visible, false);
  assert.equal(start.k, 0);

  const mid = computeHorizonGlow(wrapH, 350, 900);
  assert.equal(mid.visible, true);
  assert.ok(mid.k > 0 && mid.k < 1);
  assert.ok(mid.copyOpacity < 1);

  const end = computeHorizonGlow(wrapH, 2000, 900);
  assert.equal(end.heroHidden, true);
  assert.equal(end.visible, false);
});

test('computeServicesProgress maps clip scrubbing and horizontal strip motion', () => {
  const s0 = computeServicesProgress(2000, 2000, 900, 2.4, 2.0, 2000, 3000, 1440);
  assert.equal(s0.q, 0);
  assert.equal(s0.r, 0);
  assert.equal(s0.settled, false);
  assert.equal(s0.stripX, 1440);

  const sMid = computeServicesProgress(2000 + 2.4 * 900, 2000, 900, 2.4, 2.0, 2000, 3000, 1440);
  assert.equal(sMid.q, 1);
  assert.equal(sMid.settled, true);
  assert.equal(sMid.r, 0);

  const sEnd = computeServicesProgress(2000 + 4.4 * 900, 2000, 900, 2.4, 2.0, 2000, 3000, 1440);
  assert.equal(sEnd.r, 1);
  assert.ok(sEnd.stripX < 0);
});

test('computeCardSweepPercent and formatStatValue format cleanly', () => {
  assert.equal(computeCardSweepPercent(1600, 1440), -40);
  assert.ok(computeCardSweepPercent(700, 1440) > 100);
  assert.equal(formatStatValue(3200, 0, '+', 0), '0+');
  assert.equal(formatStatValue(3200, 0, '+', 1), '3\u2009200+');
  assert.equal(formatStatValue(98.6, 1, '%', 1), '98.6%');
});

test('computeSpeedKmh clamps and formats two-digit readout', () => {
  const res = computeSpeedKmh(1200, 0.016, 0);
  assert.ok(res.speed > 0 && res.speed <= 99);
  assert.match(res.label, /^\d{2} КМ\/Ч$/);
});
