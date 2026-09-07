import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReceiptMath } from './receiptValidation';

const item = { description: 'อาหาร', quantity: 2, unitPrice: 100, amount: 200 };

test('recomputes validity independently of AI flags', () => {
  const result = validateReceiptMath({ isValidBill: true, totalAmount: 200, isCorrect: false, items: [{ ...item, isLineValid: false }] });
  assert.equal(result.items[0].isLineValid, true);
  assert.equal(result.isCorrect, true);
});

test('detects line mismatch even when the total matches', () => {
  const result = validateReceiptMath({ isValidBill: true, totalAmount: 150, isCorrect: true, items: [{ ...item, amount: 150 }] });
  assert.equal(result.items[0].isLineValid, false);
  assert.equal(result.deterministicValidation.totalMatches, true);
  assert.equal(result.isCorrect, false);
});

test('detects bill total mismatch', () => {
  const result = validateReceiptMath({ isValidBill: true, totalAmount: 350, items: [item, { ...item, quantity: 1, amount: 100 }] });
  assert.equal(result.deterministicValidation.expectedTotalFromLines, 300);
  assert.equal(result.deterministicValidation.totalMatches, false);
});

test('does not substitute zero for missing extraction values', () => {
  const result = validateReceiptMath({ isValidBill: true, totalAmount: 0, items: [{ ...item, quantity: undefined as unknown as number, amount: 0 }] });
  assert.equal(result.isCorrect, false);
  assert.equal(result.items[0].isLineValid, false);
  assert.equal(result.deterministicValidation.requiresReview, true);
});

test('rejects empty, unverified, negative and nonfinite inputs', () => {
  assert.equal(validateReceiptMath({ isValidBill: true, totalAmount: 0, items: [] }).isCorrect, false);
  assert.equal(validateReceiptMath({ totalAmount: 200, items: [item] }).isCorrect, false);
  assert.equal(validateReceiptMath({ isValidBill: true, totalAmount: -1, items: [item] }).isCorrect, false);
  assert.equal(validateReceiptMath({ isValidBill: true, totalAmount: 200, items: [{ ...item, amount: Infinity }] }).isCorrect, false);
});

test('accepts cent rounding and rejects invalid tolerance', () => {
  const result = validateReceiptMath({ isValidBill: true, totalAmount: 0.30, items: [{ description: 'test', quantity: 3, unitPrice: 0.1, amount: 0.3 }] });
  assert.equal(result.isCorrect, true);
  assert.throws(() => validateReceiptMath({ isValidBill: true, totalAmount: 200, items: [item] }, -1));
});
