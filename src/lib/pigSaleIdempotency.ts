export interface PigSaleIdentity {
  userId: string;
  saleId: string;
}

export function getPigSaleDocumentId({ userId, saleId }: PigSaleIdentity): string {
  const normalizedUserId = userId.trim();
  const normalizedSaleId = saleId.trim();

  if (!normalizedUserId) throw new Error('Pig sale userId is required');
  if (!normalizedSaleId) throw new Error('Pig sale saleId is required');

  return `sale-${encodeURIComponent(normalizedUserId)}-${encodeURIComponent(normalizedSaleId)}`;
}
