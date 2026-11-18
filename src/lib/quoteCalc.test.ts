import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAcQuote, formatRub, validateQuoteForm } from './quoteCalc';

test('calculateAcQuote computes deterministic Moscow AC estimate', () => {
  const res = calculateAcQuote({
    areaTier: '25_to_35',
    installStage: 'finished_wall',
    zone: 'inside_mkad',
  });
  assert.equal(res.btuLabel, '12 BTU');
  assert.equal(res.deliveryPrice, 0);
  assert.equal(res.totalPrice, 54900 + 17500);

  const twoStageMo = calculateAcQuote({
    areaTier: '25_to_35',
    installStage: 'two_stage_chase',
    zone: 'new_moscow_mo',
  });
  assert.equal(twoStageMo.deliveryPrice, 1800);
  assert.equal(twoStageMo.installPrice, 17500 + 6500);
});

test('formatRub uses thin spaces and ruble symbol', () => {
  assert.equal(formatRub(72400), '72\u2009400 ₽');
});

test('validateQuoteForm rejects empty/invalid inputs and accepts valid data', () => {
  const bad = validateQuoteForm('А', '123');
  assert.equal(bad.valid, false);
  assert.ok(bad.nameError);
  assert.ok(bad.phoneError);

  const ok = validateQuoteForm('Алексей', '+7 (999) 123-45-67');
  assert.equal(ok.valid, true);
  assert.equal(ok.nameError, null);
  assert.equal(ok.phoneError, null);
});
