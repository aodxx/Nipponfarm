import { collection, doc, setDoc, getDocs, query, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PayrollSlip } from '../types';
import { OperationType, handleFirestoreError } from '../lib/firestore-error';

export const getPayrollSlips = async (year: number, month: number, periodIndex: 1 | 2): Promise<PayrollSlip[]> => {
  const q = query(
    collection(db, 'payroll_slips'),
    where('periodYear', '==', year),
    where('periodMonth', '==', month),
    where('periodIndex', '==', periodIndex)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollSlip));
};

export const subscribeToPayrollSlips = (year: number, month: number, periodIndex: 1 | 2, callback: (slips: PayrollSlip[]) => void) => {
  const q = query(
    collection(db, 'payroll_slips'),
    where('periodYear', '==', year),
    where('periodMonth', '==', month),
    where('periodIndex', '==', periodIndex)
  );
  
  return onSnapshot(q, (snapshot) => {
    const slips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollSlip));
    callback(slips);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'payroll_slips');
  });
};

export const subscribeToUserPayrollSlips = (userId: string, callback: (slips: PayrollSlip[]) => void) => {
  const q = query(
    collection(db, 'payroll_slips'),
    where('userId', '==', userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const slips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollSlip));
    callback(slips);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'payroll_slips');
  });
};

export const savePayrollSlip = async (slip: PayrollSlip) => {
  const docId = slip.id || `${slip.periodYear}_${slip.periodMonth}_${slip.periodIndex}_${slip.userId}`;
  const docRef = doc(db, 'payroll_slips', docId);
  const now = Date.now();
  
  const dataToSave = {
    ...slip,
    id: docId,
    updatedAt: now,
    createdAt: slip.createdAt || now,
  };
  
  await setDoc(docRef, dataToSave, { merge: true });
};

export const updatePayrollSlipStatus = async (slipId: string, status: 'PENDING' | 'PAID', slipImage?: string) => {
  const docRef = doc(db, 'payroll_slips', slipId);
  const updateData: any = {
    status,
    paymentDate: status === 'PAID' ? Date.now() : null,
    updatedAt: Date.now()
  };
  if (slipImage) {
    updateData.slipImage = slipImage;
  }
  await updateDoc(docRef, updateData);
};

export const getUserPayrollSlips = async (userId: string, year: number, month: number, periodIndex: 1 | 2): Promise<PayrollSlip[]> => {
  const q = query(
    collection(db, 'payroll_slips'),
    where('userId', '==', userId),
    where('periodYear', '==', year),
    where('periodMonth', '==', month),
    where('periodIndex', '==', periodIndex)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollSlip));
};

