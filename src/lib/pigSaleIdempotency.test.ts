import assert from 'node:assert/strict';
import test from 'node:test';
import { getPigSaleDocumentId } from './pigSaleIdempotency';

test('creates a stable pig sale document id for the same user and sale id', () => {
  const first = getPigSaleDocumentId({ userId: 'staff/1', saleId: 'PS-20260904-123' });
  const second = getPigSaleDocumentId({ userId: 'staff/1', saleId: 'PS-20260904-123' });
  assert.equal(first, second);
  assert.equal(first, 'sale-staff%2F1-PS-20260904-123');
});

test('separates the same sale id across different users', () => {
  assert.notEqual(
    getPigSaleDocumentId({ userId: 'staff-a', saleId: 'PS-001' }),
    getPigSaleDocumentId({ userId: 'staff-b', saleId: 'PS-001' }),
  );
});

test('rejects missing sale identity fields', () => {
  assert.throws(() => getPigSaleDocumentId({ userId: '', saleId: 'PS-001' }));
  assert.throws(() => getPigSaleDocumentId({ userId: 'staff-a', saleId: '   ' }));
});
