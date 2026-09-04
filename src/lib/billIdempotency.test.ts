import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReceiptAnalysis } from '../services/aiService';
import {
  buildBillItemId,
  buildBillReferenceNo,
  buildBillSubmissionId,
  stableFingerprint,
} from './billIdempotency';

const receipt = (overrides: Partial<ReceiptAnalysis> = {}): ReceiptAnalysis => ({
  merchantName: 'QA Feed Store',
  date: '2026-09-04',
  totalAmount: 350,
  isCorrect: true,
  analysisNote: '',
  items: [
    { description: 'Feed A', quantity: 2, unitPrice: 100, amount: 200, isLineValid: true },
    { description: 'Feed B', quantity: 1, unitPrice: 150, amount: 150, isLineValid: true },
  ],
  ...overrides,
});

test('same reviewed receipt and image produce the same deterministic bill id', () => {
  const first = buildBillSubmissionId('user-1', receipt(), 'data:image/webp;base64,ABC123');
  const retry = buildBillSubmissionId('user-1', receipt(), 'data:image/webp;base64,ABC123');
  assert.equal(first, retry);
  assert.match(first, /^bill-[0-9a-f]{16}$/);
});

test('meaningful receipt or image changes produce a different bill id', () => {
  const base = buildBillSubmissionId('user-1', receipt(), 'image-A');
  assert.notEqual(base, buildBillSubmissionId('user-1', receipt({ totalAmount: 351 }), 'image-A'));
  assert.notEqual(base, buildBillSubmissionId('user-1', receipt(), 'image-B'));
  assert.notEqual(base, buildBillSubmissionId('user-2', receipt(), 'image-A'));
});

test('harmless merchant whitespace/case normalization does not create duplicate ids', () => {
  const a = buildBillSubmissionId('user-1', receipt({ merchantName: ' QA Feed Store ' }), 'image-A');
  const b = buildBillSubmissionId('user-1', receipt({ merchantName: 'qa   feed store' }), 'image-A');
  assert.equal(a, b);
});

test('bill item ids are deterministic and reference number is stable', () => {
  const billId = buildBillSubmissionId('user-1', receipt(), 'image-A');
  assert.equal(buildBillItemId(billId, 0), `${billId}-item-001`);
  assert.equal(buildBillItemId(billId, 1), `${billId}-item-002`);
  assert.equal(buildBillReferenceNo(billId, '2026-09-04'), `REF-20260904-${billId.slice(5, 13).toUpperCase()}`);
});

test('fingerprint is deterministic and compact for large image strings', () => {
  const image = `data:image/webp;base64,${'A'.repeat(250_000)}`;
  const fingerprint = stableFingerprint(image);
  assert.equal(fingerprint.length, 16);
  assert.equal(fingerprint, stableFingerprint(image));
});
