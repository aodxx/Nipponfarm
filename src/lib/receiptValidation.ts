export interface ReceiptMathItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isLineValid?: boolean;
}

export interface ReceiptMathInput {
  isValidBill?: boolean;
  totalAmount: number;
  items: ReceiptMathItem[];
  isCorrect?: boolean;
  analysisNote?: string;
}

export interface ReceiptValidationSummary {
  lineMismatchCount: number;
  expectedTotalFromLines: number;
  totalMatches: boolean;
  tolerance: number;
  requiresReview: boolean;
  issues: string[];
}

export type ValidatedReceipt<T extends ReceiptMathInput> = Omit<T, 'items' | 'isCorrect' | 'analysisNote' | 'totalAmount'> & {
  totalAmount: number;
  items: Array<ReceiptMathItem & { isLineValid: boolean }>;
  isCorrect: boolean;
  analysisNote: string;
  deterministicValidation: ReceiptValidationSummary;
};

const isMoneyNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000;
const toCents = (value: number): number => Math.round((value + Number.EPSILON) * 100);
const fromCents = (value: number): number => value / 100;

export const validateReceiptMath = <T extends ReceiptMathInput>(input: T, tolerance = 0.01): ValidatedReceipt<T> => {
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 1) {
    throw new Error('Invalid receipt math tolerance');
  }
  const toleranceCents = Math.round(tolerance * 100);
  const items = Array.isArray(input.items) ? input.items : [];
  const issues: string[] = [];
  let lineMismatchCount = 0;
  let sumCents = 0;
  const validatedItems = items.map((item, index) => {
    const valid = isMoneyNumber(item.quantity) && isMoneyNumber(item.unitPrice) && isMoneyNumber(item.amount);
    const product = valid ? item.quantity * item.unitPrice : NaN;
    const expected = Number.isFinite(product) && product <= 1_000_000_000 ? toCents(product) : NaN;
    const actual = valid ? toCents(item.amount) : NaN;
    const isLineValid = valid && Number.isFinite(expected) && Math.abs(expected - actual) <= toleranceCents;
    if (!isLineValid) {
      lineMismatchCount += 1;
      issues.push(`LINE_${index + 1}_MISMATCH_OR_INVALID`);
    }
    if (Number.isFinite(actual)) sumCents += actual;
    return { ...item, isLineValid };
  });
  if (items.length === 0) issues.push('NO_ITEMS');
  const validTotal = isMoneyNumber(input.totalAmount);
  if (!validTotal) issues.push('INVALID_TOTAL');
  const expectedTotalFromLines = fromCents(sumCents);
  const totalMatches = validTotal && items.length > 0 && Math.abs(sumCents - toCents(input.totalAmount)) <= toleranceCents;
  if (!totalMatches) issues.push('TOTAL_MISMATCH_OR_INVALID');
  if (input.isValidBill !== true) issues.push('DOCUMENT_NOT_VERIFIED');
  const isCorrect = issues.length === 0;
  const baseNote = typeof input.analysisNote === 'string' ? input.analysisNote.trim() : '';
  const deterministicNote = isCorrect
    ? 'ตรวจด้วยระบบคำนวณ: ตัวเลขรายการและยอดรวมสอดคล้องกัน (ยังต้องตรวจความถูกต้องของการอ่านภาพ)'
    : 'ตรวจด้วยระบบคำนวณ: พบข้อมูลไม่ครบหรือยอดไม่ตรง กรุณาตรวจบิลต้นฉบับก่อนบันทึก';
  return {
    ...input,
    items: validatedItems,
    isCorrect,
    analysisNote: [baseNote, deterministicNote].filter(Boolean).join('\n'),
    deterministicValidation: {
      lineMismatchCount,
      expectedTotalFromLines,
      totalMatches,
      tolerance,
      requiresReview: !isCorrect,
      issues,
    },
  };
};
