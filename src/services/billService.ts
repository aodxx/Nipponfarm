import {
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc,
  writeBatch,
  doc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ReceiptAnalysis } from './aiService';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';
import {
  buildBillItemId,
  buildBillReferenceNo,
  buildBillSubmissionId,
} from '../lib/billIdempotency';

export interface Bill {
  id?: string;
  userId: string;
  billDate: string;
  vendorName: string;
  imageUrl: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  recordedBy: string;
  referenceNo?: string;
  createdAt: any;
}

export interface BillItem {
  id?: string;
  userId: string;
  billId: string;
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  total: number;
  date: string;
}

export async function saveScannedBill(analysis: ReceiptAnalysis, imageUrl: string) {
  if (!auth.currentUser) throw new Error('User not authenticated');

  const userId = auth.currentUser.uid;
  const userName = auth.currentUser.displayName || auth.currentUser.email || 'Unknown';
  const billId = buildBillSubmissionId(userId, analysis, imageUrl);
  const billRef = doc(db, 'bills', billId);

  // A retry after a successful/uncertain client response must resolve to the same bill,
  // without uploading the image again or creating another set of line items.
  try {
    const existingBill = await getDoc(billRef);
    if (existingBill.exists()) return billId;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `bills/${billId}`);
  }

  const batch = writeBatch(db);
  let finalImageUrl = imageUrl;

  if (imageUrl && imageUrl.startsWith('data:image')) {
    try {
      const { optimizeImage, uploadOptimizedImage } = await import('./imageOptimizer');
      const optimized = await optimizeImage(imageUrl, { type: 'document' });
      const uploadTask = uploadOptimizedImage(optimized, `bills/${userId}/${billId}`);
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Central Gateway/Storage upload timed out after 15 seconds')), 15000);
      });
      finalImageUrl = await Promise.race([uploadTask, timeoutPromise]);
    } catch (storageErr) {
      console.warn(
        'Centralized Image Optimization Gateway failed or timed out. Storing compressed image directly in Firestore as robust fail-safe:',
        storageErr,
      );
      finalImageUrl = imageUrl;
    }
  }

  const billData: Omit<Bill, 'id'> = {
    userId,
    billDate: analysis.date,
    vendorName: analysis.merchantName,
    imageUrl: finalImageUrl,
    totalAmount: analysis.totalAmount,
    taxAmount: 0,
    discountAmount: 0,
    recordedBy: userName,
    referenceNo: buildBillReferenceNo(billId, analysis.date),
    createdAt: serverTimestamp(),
  };

  batch.set(billRef, billData);

  analysis.items.forEach((item, index) => {
    const itemId = buildBillItemId(billId, index);
    const itemRef = doc(db, 'bill_items', itemId);
    const itemData: Omit<BillItem, 'id'> = {
      userId,
      billId,
      description: item.description,
      quantity: item.quantity,
      unit: '',
      pricePerUnit: item.unitPrice,
      total: item.amount,
      date: analysis.date,
    };
    batch.set(itemRef, itemData);
  });

  try {
    await batch.commit();
    return billId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'bills/bill_items batch');
  }
}

export const STANDARD_PRODUCTS = [
  'ปลายข้าว (บดละเอียด)',
  'ปลายข้าว (เมล็ด)',
  'ข้าวโพด',
  'กากถั่วเหลือง(Tvo)',
  'ถั่วอบ',
  'รำ',
  'ปลาบด',
  'วิตามินรวม',
  'เกลือ',
  'ไซลีน โมโนไฮโดรคลอ',
  'แอสไทมูลิน10',
  'วัน-มิกซ์(One-Mix)',
  'โปรแลค มอร์',
  'วันฟรีมิกซ์',
  'นม',
];

export async function getHistoricalItemDescriptions(): Promise<string[]> {
  if (!auth.currentUser) return STANDARD_PRODUCTS;
  const path = 'bill_items';
  try {
    const q = query(
      collection(db, path),
      orderBy('description'),
      limit(200),
    );
    const snapshot = await getDocs(q);
    const descriptions = snapshot.docs.map((snapshotDoc) => snapshotDoc.data().description as string);
    const combined = [...STANDARD_PRODUCTS, ...descriptions];
    return Array.from(new Set(combined)).filter((description) => !!description);
  } catch (err) {
    console.error('Error fetching historical descriptions:', err);
    return STANDARD_PRODUCTS;
  }
}

export async function getHistoricalVendors(): Promise<string[]> {
  if (!auth.currentUser) return [];
  const path = 'bills';
  try {
    const q = query(collection(db, path), limit(100));
    const snapshot = await getDocs(q);
    const vendors = snapshot.docs.map((snapshotDoc) => snapshotDoc.data().vendorName as string);
    return Array.from(new Set(vendors)).filter((vendor) => !!vendor);
  } catch (err) {
    console.error('Error fetching historical vendors:', err);
    return [];
  }
}

export async function getBills() {
  if (!auth.currentUser) return [];
  const path = 'bills';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as Bill));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function getBillItems(billId: string) {
  if (!auth.currentUser) return [];
  const path = 'bill_items';
  try {
    const q = query(collection(db, path), where('billId', '==', billId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as BillItem));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}
