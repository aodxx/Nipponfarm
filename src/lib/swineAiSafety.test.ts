import assert from 'node:assert/strict';
import test from 'node:test';
import { applySwineAiSafetyGate } from './swineAiSafety';

test('blocks AI-assisted abortion from changing lifecycle', () => {
  const decision = applySwineAiSafetyGate('ULTRASOUND', {
    ai_assisted: true,
    result: 'ABORTION',
    confidence: 52,
  });

  assert.equal(decision.lifecycleActionable, false);
  assert.equal(decision.details.result, 'UNCERTAIN');
  assert.equal(decision.details.requiresHumanReview, true);
});

test('allows confirmed AI-assisted pregnancy positive/negative after user confirmation path', () => {
  assert.equal(applySwineAiSafetyGate('ULTRASOUND', { ai_assisted: true, result: 'POSITIVE' }).lifecycleActionable, true);
  assert.equal(applySwineAiSafetyGate('ULTRASOUND', { ai_assisted: true, result: 'NEGATIVE' }).lifecycleActionable, true);
});

test('does not treat AI estrus NONE as heat return lifecycle event', () => {
  const decision = applySwineAiSafetyGate('HEAT_RETURN', {
    ai_assisted: true,
    result: 'NONE',
  });

  assert.equal(decision.lifecycleActionable, false);
  assert.equal(decision.details.safetyGate, 'AI_ESTRUS_NOT_CONFIRMED');
});

test('allows confirmed active heat return', () => {
  const decision = applySwineAiSafetyGate('HEAT_RETURN', {
    ai_assisted: true,
    result: 'ACTIVE',
  });
  assert.equal(decision.lifecycleActionable, true);
});
