import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  Timestamp,
  writeBatch,
  doc,
  orderBy,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { ReceiptAnalysis } from './aiService';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';

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
  if (!auth.currentUser) throw new Error("User not authenticated");

  const userId = auth.currentUser.uid;
  const userName = auth.currentUser.displayName || auth.currentUser.email || "Unknown";

  const batch = writeBatch(db);

  // 1. Create the Bill document reference
  const billRef = doc(collection(db, 'bills'));
  
  let finalImageUrl = imageUrl;
  
  // If imageUrl is a base64 string, upload it to storage using our centralized optimizer & gateway
  if (imageUrl && imageUrl.startsWith('data:image')) {
    try {
      const { optimizeImage, uploadOptimizedImage } = await import('./imageOptimizer');
      
      // Optimize client-side first (preserves high-contrast text and reduces size to 200-400KB WebP)
      const optimized = await optimizeImage(imageUrl, { type: 'document' });
      
      // We implement a generous 15-second timeout
      const uploadTask = uploadOptimizedImage(optimized, `bills/${userId}/${billRef.id}`);

      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Central Gateway/Storage upload timed out after 15 seconds')), 15000);
      });

      finalImageUrl = await Promise.race([uploadTask, timeoutPromise]);
    } catch (storageErr) {
      console.warn('Centralized Image Optimization Gateway failed or timed out. Storing compressed image directly in Firestore as robust fail-safe:', storageErr);
      // Fallback: Store the base64 string directly in document field so no user data is lost.
      // Because we compress dynamically, the image payload size is within limits.
      finalImageUrl = imageUrl;
    }
  }

  // Generate reference number based on bill date
  const cleanDate = analysis.date.replace(/\D/g, ''); // Extract only digits
  const shortUid = Math.random().toString(36).substring(2, 6).toUpperCase();
  const referenceNo = cleanDate ? `REF-${cleanDate}-${shortUid}` : `REF-${Date.now()}`;

  const billData: Omit<Bill, 'id'> = {
    userId,
    billDate: analysis.date,
    vendorName: analysis.merchantName,
    imageUrl: finalImageUrl,
    totalAmount: analysis.totalAmount,
    taxAmount: 0, 
    discountAmount: 0,
    recordedBy: userName,
    referenceNo: referenceNo,
    createdAt: serverTimestamp()
  };

  batch.set(billRef, billData);

  // 2. Create the BillItems
  analysis.items.forEach((item) => {
    const itemRef = doc(collection(db, 'bill_items'));
    const itemData: Omit<BillItem, 'id'> = {
      userId,
      billId: billRef.id,
      description: item.description,
      quantity: item.quantity,
      unit: '', 
      pricePerUnit: item.unitPrice,
      total: item.amount,
      date: analysis.date
    };
    batch.set(itemRef, itemData);
  });

  try {
    await batch.commit();
    return billRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'bills/bill_items batch');
  }
}

export const STANDARD_PRODUCTS = [
  "ปลายข้าว (บดละเอียด)",
  "ปลายข้าว (เมล็ด)",
  "ข้าวโพด",
  "กากถั่วเหลือง(Tvo)",
  "ถั่วอบ",
  "รำ",
  "ปลาบด",
  "วิตามินรวม",
  "เกลือ",
  "ไซลีน โมโนไฮโดรคลอ",
  "แอสไทมูลิน10",
  "วัน-มิกซ์(One-Mix)",
  "โปรแลค มอร์",
  "วันฟรีมิกซ์",
  "นม"
];

export async function getHistoricalItemDescriptions(): Promise<string[]> {
  if (!auth.currentUser) return STANDARD_PRODUCTS;
  const path = 'bill_items';
  try {
    const q = query(
      collection(db, path),
      orderBy('description'),
      limit(200) // Don't fetch too many to avoid hitting prompt limits
    );
    const snapshot = await getDocs(q);
    const descriptions = snapshot.docs.map(doc => doc.data().description as string);
    // Combine with standard farm products to ensure backend learning is always seeded
    const combined = [...STANDARD_PRODUCTS, ...descriptions];
    return Array.from(new Set(combined)).filter(d => !!d);
  } catch (err) {
    console.error("Error fetching historical descriptions:", err);
    return STANDARD_PRODUCTS;
  }
}

export async function getHistoricalVendors(): Promise<string[]> {
  if (!auth.currentUser) return [];
  const path = 'bills';
  try {
    const q = query(
      collection(db, path),
      limit(100)
    );
    const snapshot = await getDocs(q);
    const vendors = snapshot.docs.map(doc => doc.data().vendorName as string);
    return Array.from(new Set(vendors)).filter(v => !!v);
  } catch (err) {
    console.error("Error fetching historical vendors:", err);
    return [];
  }
}

export async function getBills() {
  if (!auth.currentUser) return [];
  const path = 'bills';
  try {
    const q = query(
      collection(db, path), 
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function getBillItems(billId: string) {
  if (!auth.currentUser) return [];
  const path = 'bill_items';
  try {
    const q = query(
      collection(db, path), 
      where('billId', '==', billId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BillItem));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}
