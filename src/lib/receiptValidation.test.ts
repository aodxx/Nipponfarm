import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReceiptMath } from './receiptValidation';

test('recomputes line validity and total correctness independently of AI flags', () => {
  const result = validateReceiptMath({
    isValidBill: true,
    totalAmount: 300,
    isCorrect: true,
    analysisNote: 'AI said correct',
    items: [
      { description: 'อาหาร', quantity: 2, unitPrice: 100, amount: 200, isLineValid: false },
      { description: 'ยา', quantity: 1, unitPrice: 100, amount: 100, isLineValid: false },
    ],
  });

  assert.equal(result.items[0].isLineValid, true);
  assert.equal(result.items[1].isLineValid, true);
  assert.equal(result.isCorrect, true);
  assert.equal(result.deterministicValidation.totalMatches, true);
});

test('detects line arithmetic mismatch even if total happens to match', () => {
  const result = validateReceiptMath({
    isValidBill: true,
    totalAmount: 250,
    items: [
      { description: 'อาหาร', quantity: 2, unitPrice: 100, amount: 150 },
      { description: 'ยา', quantity: 1, unitPrice: 100, amount: 100 },
    ],
  });

  assert.equal(result.items[0].isLineValid, false);
  assert.equal(result.deterministicValidation.lineMismatchCount, 1);
  assert.equal(result.deterministicValidation.totalMatches, true);
  assert.equal(result.isCorrect, false);
});

test('detects bill total mismatch', () => {
  const result = validateReceiptMath({
    isValidBill: true,
    totalAmount: 350,
    items: [
      { description: 'อาหาร', quantity: 2, unitPrice: 100, amount: 200 },
      { description: 'ยา', quantity: 1, unitPrice: 100, amount: 100 },
    ],
  });

  assert.equal(result.deterministicValidation.expectedTotalFromLines, 300);
  assert.equal(result.deterministicValidation.totalMatches, false);
  assert.equal(result.isCorrect, false);
});
