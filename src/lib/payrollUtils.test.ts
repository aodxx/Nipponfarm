import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateNetSalary } from './payrollUtils';
import * as payrollUtils from './payrollUtils';
import { SalaryAdvance } from '../types';

const advance = (overrides: Partial<SalaryAdvance> = {}): SalaryAdvance => ({
  id: 'advance-1',
  userId: 'staff-1',
  amount: 2500,
  date: '2026-09-10',
  status: 'APPROVED',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const hasDuplicateAdvanceSubmission = (
  existing: SalaryAdvance[],
  candidate: Pick<SalaryAdvance, 'userId' | 'amount' | 'date'>,
): boolean => {
  const duplicateChecker = (payrollUtils as typeof payrollUtils & {
    hasDuplicateAdvanceSubmission?: (
      existing: SalaryAdvance[],
      candidate: Pick<SalaryAdvance, 'userId' | 'amount' | 'date'>,
    ) => boolean;
  }).hasDuplicateAdvanceSubmission as ((
    existing: SalaryAdvance[],
    candidate: Pick<SalaryAdvance, 'userId' | 'amount' | 'date'>,
  ) => boolean);
  return duplicateChecker(existing, candidate);
};

test('calculates first-period net salary using approved advances only', () => {
  const result = calculateNetSalary({
    totalBaseSalary: 30000,
    advances: [
      advance({ id: 'approved-period-1', amount: 2500, date: '2026-09-10', status: 'APPROVED' }),
      advance({ id: 'pending-period-1', amount: 1000, date: '2026-09-12', status: 'PENDING' }),
      advance({ id: 'approved-period-2', amount: 700, date: '2026-09-20', status: 'APPROVED' }),
      advance({ id: 'other-user', userId: 'staff-2', amount: 900, date: '2026-09-05', status: 'APPROVED' }),
    ],
    period: 1,
    userId: 'staff-1',
  });

  assert.equal(result.periodBaseSalary, 15000);
  assert.equal(result.totalAdvancesAmount, 2500);
  assert.equal(result.netSalary, 12500);
  assert.deepEqual(result.periodAdvancesList.map((item) => item.id), ['approved-period-1']);
});

test('never returns a negative net salary when approved advances exceed the period salary', () => {
  const result = calculateNetSalary({
    totalBaseSalary: 10000,
    advances: [advance({ amount: 6000, date: '2026-09-02' }), advance({ id: 'advance-2', amount: 5000, date: '2026-09-14' })],
    period: 1,
    userId: 'staff-1',
  });

  assert.equal(result.periodBaseSalary, 5000);
  assert.equal(result.totalAdvancesAmount, 11000);
  assert.equal(result.netSalary, 0);
});

test('detects an identical pending advance submission as a duplicate', () => {
  const existing = [advance({ status: 'PENDING' })];

  assert.equal(
    hasDuplicateAdvanceSubmission(existing, {
      userId: 'staff-1',
      amount: 2500,
      date: '2026-09-10',
    }),
    true,
  );
});

test('does not treat a different user, date, or amount as a duplicate', () => {
  const existing = [advance({ status: 'PENDING' })];

  assert.equal(hasDuplicateAdvanceSubmission(existing, { userId: 'staff-2', amount: 2500, date: '2026-09-10' }), false);
  assert.equal(hasDuplicateAdvanceSubmission(existing, { userId: 'staff-1', amount: 2500, date: '2026-09-11' }), false);
  assert.equal(hasDuplicateAdvanceSubmission(existing, { userId: 'staff-1', amount: 3000, date: '2026-09-10' }), false);
});

test('does not block a new submission after a previous request was rejected', () => {
  const existing = [advance({ status: 'REJECTED' })];

  assert.equal(
    hasDuplicateAdvanceSubmission(existing, {
      userId: 'staff-1',
      amount: 2500,
      date: '2026-09-10',
    }),
    false,
  );
});
