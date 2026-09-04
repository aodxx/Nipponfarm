export const isGenericMerchantName = (name: string): boolean => {
  if (!name) return true;

  const lowercase = name.toLowerCase().trim();
  const genericTerms = [
    'ใบส่งของ',
    'delivery bill',
    'delivery',
    'ใบเสร็จ',
    'ใบเสร็จรับเงิน',
    'บิล',
    'receipt',
    'ใบรับของ',
    'กรอกข้อมูลบิลเอง',
    'invoice',
    'ใบกำกับภาษี',
    'ใบรับสินค้า',
    'รายการสินค้า',
    'บิลเงินสด',
    'cash bill',
  ];

  return genericTerms.some((term) => lowercase.includes(term));
};

export const normalizeReceiptDate = (dateStr: string): string => {
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (!dateStr) return todayValue;

  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const normalizeYear = (rawYear: string) => {
    let year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const parsed = Number.parseInt(year, 10);
    if (parsed > 2400) year = String(parsed - 543);
    return year;
  };

  const slashParts = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashParts) {
    return `${normalizeYear(slashParts[3])}-${slashParts[2].padStart(2, '0')}-${slashParts[1].padStart(2, '0')}`;
  }

  const reverseSlashParts = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (reverseSlashParts) {
    return `${normalizeYear(reverseSlashParts[1])}-${reverseSlashParts[2].padStart(2, '0')}-${reverseSlashParts[3].padStart(2, '0')}`;
  }

  const digits = trimmed.match(/\d+/g);
  if (digits && digits.length >= 3) {
    let day = digits[0].padStart(2, '0');
    let month = digits[1].padStart(2, '0');
    const year = normalizeYear(digits[2]);
    const dayNumber = Number.parseInt(day, 10);
    const monthNumber = Number.parseInt(month, 10);

    if (dayNumber <= 12 && monthNumber > 12) {
      [day, month] = [month, day];
    }

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return todayValue;
};
