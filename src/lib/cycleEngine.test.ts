import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CYCLE_DAYS,
  calculateNextSowState,
  generateTasksForBreed,
  generateTasksForFarrow,
  generateTasksForImmediateBreed,
  generateTasksForPregnant,
  generateTasksForRecovery,
} from './cycleEngine';

test('breed schedules heat, ultrasound, move-to-farrow and farrow on expected dates', () => {
  const tasks = generateTasksForBreed('2026-09-01', 'sow-1', 'S001', 'staff-a');
  assert.deepEqual(tasks.map(task => [task.type, task.dueDate]), [
    ['HEAT_CHECK', '2026-09-22'],
    ['ULTRASOUND', '2026-09-29'],
    ['MOVE_TO_FARROW', '2026-12-17'],
    ['FARROW', '2026-12-24'],
  ]);
  assert.equal(tasks[2].isDraft, true);
  assert.equal(tasks[3].isDraft, true);
});

test('pregnancy confirmation recreates only committed farrowing tasks from breed date', () => {
  const tasks = generateTasksForPregnant('2026-09-01', 'sow-1', 'S001', 'staff-a');
  assert.deepEqual(tasks.map(task => [task.type, task.dueDate, task.isDraft]), [
    ['MOVE_TO_FARROW', '2026-12-17', undefined],
    ['FARROW', '2026-12-24', undefined],
  ]);
});

test('farrow and recovery schedules use the configured cycle days', () => {
  assert.equal(CYCLE_DAYS.WEAN, 24);
  assert.equal(CYCLE_DAYS.RECOVERY, 7);

  const wean = generateTasksForFarrow('2026-01-01', 'sow-1', 'S001', 'staff-a');
  assert.equal(wean[0].type, 'WEAN');
  assert.equal(wean[0].dueDate, '2026-01-25');

  const recovery = generateTasksForRecovery('2026-01-25', 'sow-1', 'S001', 'staff-a');
  assert.equal(recovery[0].type, 'BREED');
  assert.equal(recovery[0].dueDate, '2026-02-01');
});

test('immediate breed task keeps the selected date', () => {
  const tasks = generateTasksForImmediateBreed('2026-10-03', 'sow-1', 'S001', 'staff-a');
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].type, 'BREED');
  assert.equal(tasks[0].dueDate, '2026-10-03');
});

test('status transitions preserve parity except successful wean', () => {
  assert.deepEqual(calculateNextSowState('IDLE', 2, 'BREED'), { status: 'MATED', parity: 2 });
  assert.deepEqual(calculateNextSowState('MATED', 2, 'ULTRASOUND_POS'), { status: 'PREGNANT', parity: 2 });
  assert.deepEqual(calculateNextSowState('MATED', 2, 'ULTRASOUND_NEG'), { status: 'IDLE', parity: 2 });
  assert.deepEqual(calculateNextSowState('MATED', 2, 'HEAT_RETURN'), { status: 'IDLE', parity: 2 });
  assert.deepEqual(calculateNextSowState('PREGNANT', 2, 'ABORTION'), { status: 'RECOVERY', parity: 2 });
  assert.deepEqual(calculateNextSowState('PREGNANT', 2, 'FARROW'), { status: 'LACTATING', parity: 2 });
  assert.deepEqual(calculateNextSowState('LACTATING', 2, 'WEAN'), { status: 'RECOVERY', parity: 3 });
  assert.deepEqual(calculateNextSowState('RECOVERY', 3, 'CULL'), { status: 'CULLED', parity: 3 });
});
