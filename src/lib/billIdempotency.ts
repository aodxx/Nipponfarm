import type { ReceiptAnalysis } from '../services/aiService';

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

/**
 * Small deterministic 64-bit-ish fingerprint (two independent 32-bit hashes).
 * It is used only for client idempotency/document IDs, not for security.
 */
export function stableFingerprint(value: string): string {
  let fnv = 0x811c9dc5;
  let djb = 5381;

  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    fnv ^= code;
    fnv = Math.imul(fnv, 0x01000193);
    djb = ((djb << 5) + djb) ^ code;
  }

  return `${(fnv >>> 0).toString(16).padStart(8, '0')}${(djb >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildBillSubmissionId(
  userId: string,
  analysis: ReceiptAnalysis,
  imageSource: string,
): string {
  const items = analysis.items.map((item) => [
    normalizeText(item.description),
    normalizeNumber(item.quantity),
    normalizeNumber(item.unitPrice),
    normalizeNumber(item.amount),
  ]);

  const canonical = JSON.stringify({
    userId,
    merchant: normalizeText(analysis.merchantName),
    date: analysis.date.trim(),
    total: normalizeNumber(analysis.totalAmount),
    items,
    image: stableFingerprint(imageSource || ''),
  });

  return `bill-${stableFingerprint(canonical)}`;
}

export function buildBillItemId(billId: string, index: number): string {
  return `${billId}-item-${String(index + 1).padStart(3, '0')}`;
}

export function buildBillReferenceNo(billId: string, billDate: string): string {
  const cleanDate = billDate.replace(/\D/g, '').slice(0, 12);
  const suffix = billId.replace(/^bill-/, '').slice(0, 8).toUpperCase();
  return cleanDate ? `REF-${cleanDate}-${suffix}` : `REF-${suffix}`;
}
