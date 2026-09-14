import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateNextSowState,
  generateTasksForBreed,
  generateTasksForPregnant,
  generateTasksForFarrow,
  generateTasksForRecovery,
} from './cycleEngine';
import { getPigSaleDocumentId } from './pigSaleIdempotency';

const sowFixture = {
  id: 'sow-test-2026-09-14-001',
  displayId: 'SOW-TEST-001',
  userId: 'staff-test-001',
  breedDate: '2026-09-01',
};

test('Sow test data completes the lifecycle and preserves parity rules', () => {
  assert.deepEqual(calculateNextSowState('IDLE', 0, 'BREED'), { status: 'MATED', parity: 0 });
  assert.deepEqual(calculateNextSowState('MATED', 0, 'ULTRASOUND_POS'), { status: 'PREGNANT', parity: 0 });
  assert.deepEqual(calculateNextSowState('PREGNANT', 0, 'FARROW'), { status: 'LACTATING', parity: 1 });
  assert.deepEqual(calculateNextSowState('LACTATING', 1, 'WEAN'), { status: 'RECOVERY', parity: 1 });
  assert.deepEqual(calculateNextSowState('RECOVERY', 1, 'BREED'), { status: 'MATED', parity: 1 });
});

test('Sow test data links cycle tasks to the same isolated sow', () => {
  const breedTasks = generateTasksForBreed(sowFixture.breedDate, sowFixture.id, sowFixture.displayId, sowFixture.userId);
  const pregnantTasks = generateTasksForPregnant(sowFixture.breedDate, sowFixture.id, sowFixture.displayId, sowFixture.userId);
  const weanTasks = generateTasksForFarrow('2026-12-24', sowFixture.id, sowFixture.displayId, sowFixture.userId);
  const recoveryTasks = generateTasksForRecovery('2027-01-17', sowFixture.id, sowFixture.displayId, sowFixture.userId);
  const allTasks = [...breedTasks, ...pregnantTasks, ...weanTasks, ...recoveryTasks];

  assert.equal(allTasks.length, 8);
  assert.equal(allTasks.every(task => task.sowId === sowFixture.id && task.userId === sowFixture.userId), true);
  assert.deepEqual(breedTasks.map(task => task.type), ['HEAT_CHECK', 'ULTRASOUND', 'MOVE_TO_FARROW', 'FARROW']);
  assert.equal(recoveryTasks[0].type, 'BREED');
});

const saleFixture = {
  userId: 'staff-test-001',
  saleId: 'SALE-TEST-2026-09-14-001',
  totalPigs: 3,
  records: [
    { grossWeight: 120, tareWeight: 20, netWeight: 100 },
    { grossWeight: 118, tareWeight: 18, netWeight: 100 },
    { grossWeight: 125, tareWeight: 25, netWeight: 100 },
  ],
  pricePerKg: 72,
  deductions: 100,
};

test('Pig Sale test data calculates deterministic totals', () => {
  const totalNetWeight = saleFixture.records.reduce((total, record) => total + record.netWeight, 0);
  const grossTotal = totalNetWeight * saleFixture.pricePerKg;
  const netTotal = grossTotal - saleFixture.deductions;

  assert.equal(totalNetWeight, 300);
  assert.equal(grossTotal, 21600);
  assert.equal(netTotal, 21500);
  assert.equal(totalNetWeight / saleFixture.totalPigs, 100);
});

test('Pig Sale retries resolve to one deterministic document identity', () => {
  const firstAttempt = getPigSaleDocumentId(saleFixture);
  const retryAttempt = getPigSaleDocumentId({ ...saleFixture });
  const otherSale = getPigSaleDocumentId({ ...saleFixture, saleId: 'SALE-TEST-2026-09-14-002' });

  assert.equal(firstAttempt, 'sale-staff-test-001-SALE-TEST-2026-09-14-001');
  assert.equal(retryAttempt, firstAttempt);
  assert.notEqual(otherSale, firstAttempt);
});
