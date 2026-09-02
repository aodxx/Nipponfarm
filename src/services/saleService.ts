import { collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, deleteDoc, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PigSale } from '../types';
import { OperationType, handleFirestoreError } from '../lib/firestore-error';

const PIG_SALES_COLLECTION = 'pig_sales';

const getCurrentUserId = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  return userId;
};

export const getRecentBuyers = async (): Promise<{name: string, email: string, vehicleReg: string}[]> => {
  try {
    const q = query(
      collection(db, PIG_SALES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    const buyersMap = new Map<string, {name: string, email: string, vehicleReg: string}>();
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (data.buyerName && !buyersMap.has(data.buyerName)) {
        buyersMap.set(data.buyerName, {
          name: data.buyerName,
          email: data.buyerEmail || '',
          vehicleReg: data.vehicleReg || ''
        });
      }
    });
    return Array.from(buyersMap.values());
  } catch (error) {
    console.error("Error fetching buyers: ", error);
    return [];
  }
};

export const savePigSale = async (saleData: Omit<PigSale, 'id' | 'userId' | 'createdAt'>, recordedBy: string) => {
  const userId = getCurrentUserId();
  try {
    const docRef = await addDoc(collection(db, PIG_SALES_COLLECTION), {
      ...saleData,
      recordedBy,
      userId,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PIG_SALES_COLLECTION);
  }
};



export const subscribeToPigSales = (callback: (sales: PigSale[]) => void) => {
  const q = query(collection(db, PIG_SALES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PigSale)));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, PIG_SALES_COLLECTION);
  });
};

export const getPigSaleById = async (id: string): Promise<PigSale | null> => {
  const docRef = doc(db, PIG_SALES_COLLECTION, id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as PigSale;
  }
  return null;
};

export const deletePigSale = async (id: string) => {
  try {
    await deleteDoc(doc(db, PIG_SALES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PIG_SALES_COLLECTION}/${id}`);
  }
};

