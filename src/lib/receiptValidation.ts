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
}

export type ValidatedReceipt<T extends ReceiptMathInput> = Omit<T, 'items' | 'isCorrect' | 'analysisNote' | 'totalAmount'> & {
  totalAmount: number;
  items: Array<ReceiptMathItem & { isLineValid: boolean }>;
  isCorrect: boolean;
  analysisNote: string;
  deterministicValidation: ReceiptValidationSummary;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const validateReceiptMath = <T extends ReceiptMathInput>(input: T, tolerance = 0.01): ValidatedReceipt<T> => {
  const items = Array.isArray(input.items) ? input.items : [];
  let lineMismatchCount = 0;

  const validatedItems = items.map((item) => {
    const quantity = isFiniteNumber(item.quantity) ? item.quantity : 0;
    const unitPrice = isFiniteNumber(item.unitPrice) ? item.unitPrice : 0;
    const amount = isFiniteNumber(item.amount) ? item.amount : 0;
    const expected = roundMoney(quantity * unitPrice);
    const actual = roundMoney(amount);
    const isLineValid = Math.abs(expected - actual) <= tolerance;
    if (!isLineValid) lineMismatchCount += 1;

    return {
      ...item,
      quantity,
      unitPrice,
      amount,
      isLineValid,
    };
  });

  const expectedTotalFromLines = roundMoney(validatedItems.reduce((sum, item) => sum + item.amount, 0));
  const totalAmount = isFiniteNumber(input.totalAmount) ? roundMoney(input.totalAmount) : 0;
  const totalMatches = Math.abs(expectedTotalFromLines - totalAmount) <= tolerance;
  const isCorrect = input.isValidBill !== false && lineMismatchCount === 0 && totalMatches;

  const mismatchNotes: string[] = [];
  if (lineMismatchCount > 0) mismatchNotes.push(`พบ ${lineMismatchCount} รายการที่จำนวน × ราคาต่อหน่วยไม่ตรงกับยอดรายการ`);
  if (!totalMatches) mismatchNotes.push(`ผลรวมรายการ ${expectedTotalFromLines.toFixed(2)} บาท ไม่ตรงกับยอดรวม ${totalAmount.toFixed(2)} บาท`);

  const baseNote = typeof input.analysisNote === 'string' ? input.analysisNote.trim() : '';
  const deterministicNote = mismatchNotes.length > 0
    ? `ตรวจด้วยระบบคำนวณ: ${mismatchNotes.join('; ')}`
    : 'ตรวจด้วยระบบคำนวณ: ตัวเลขรายการและยอดรวมสอดคล้องกัน';

  return {
    ...input,
    totalAmount,
    items: validatedItems,
    isCorrect,
    analysisNote: [baseNote, deterministicNote].filter(Boolean).join('\n'),
    deterministicValidation: {
      lineMismatchCount,
      expectedTotalFromLines,
      totalMatches,
      tolerance,
    },
  };
};
