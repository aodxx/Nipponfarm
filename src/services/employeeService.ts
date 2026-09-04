import { collection, addDoc, getDocs, onSnapshot, query, where, doc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SalaryAdvance, EmployeeBaseSalary, EmployeeTransaction } from '../types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { OperationType, handleFirestoreError } from '../lib/firestore-error';
import { assertNoDuplicateAdvanceSubmission, DuplicateAdvanceSubmissionError, getAdvanceSubmissionKey, getAdvanceWriteMode } from '../lib/payrollUtils';
import { buildPayrollAuditEvent, PayrollAuditInput } from '../lib/payrollAudit';

const SALARY_ADVANCES_COLLECTION = 'salary_advances';
const SALARIES_COLLECTION = 'employee_salaries';
const PAYROLL_AUDIT_COLLECTION = 'payroll_audit_events';

const getCurrentUserId = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  return userId;
};

export const addAdvance = async (amount: number, date: string) => {
  const userId = getCurrentUserId();
  try {
    const submissionKey = getAdvanceSubmissionKey({ userId, amount, date });
    const deterministicRef = doc(db, SALARY_ADVANCES_COLLECTION, submissionKey);
    const newAdvanceRef = doc(collection(db, SALARY_ADVANCES_COLLECTION));
    const existingSnapshot = await getDocs(query(
      collection(db, SALARY_ADVANCES_COLLECTION),
      where('userId', '==', userId),
      where('date', '==', date),
    ));
    const existing = existingSnapshot.docs.map((advanceDoc) => ({ id: advanceDoc.id, ...advanceDoc.data() } as SalaryAdvance));
    assertNoDuplicateAdvanceSubmission(existing, { userId, amount, date });

    return await runTransaction(db, async (transaction) => {
      const deterministicSnapshot = await transaction.get(deterministicRef);

      const now = Date.now();
      const data = {
        userId,
        amount,
        date,
        submissionKey,
        status: 'PENDING' as const,
        createdAt: now,
        updatedAt: now,
      };
      if (deterministicSnapshot.exists()) {
        const existingDeterministic = { id: deterministicSnapshot.id, ...deterministicSnapshot.data() } as SalaryAdvance;
        const writeMode = getAdvanceWriteMode(existingDeterministic);
        if (writeMode === 'DUPLICATE') {
          assertNoDuplicateAdvanceSubmission([existingDeterministic], { userId, amount, date });
        }
        transaction.set(writeMode === 'CREATE_NEW' ? newAdvanceRef : deterministicRef, data);
      } else {
        const rejectedLegacy = existingSnapshot.docs.find((advanceDoc) => advanceDoc.data().status === 'REJECTED');
        if (rejectedLegacy) {
          transaction.set(newAdvanceRef, data);
          return newAdvanceRef.id;
        }
        transaction.set(deterministicRef, data);
      }
      return submissionKey;
    });
  } catch (error) {
    if (error instanceof DuplicateAdvanceSubmissionError) {
      throw error;
    }
    console.error("Error adding advance: ", error);
    handleFirestoreError(error, OperationType.CREATE, SALARY_ADVANCES_COLLECTION);
    throw error;
  }
};

export const updateAdvanceStatus = async (advanceId: string, status: 'APPROVED' | 'REJECTED', slipImage?: string) => {
  try {
    const docRef = doc(db, SALARY_ADVANCES_COLLECTION, advanceId);
    const actorUid = getCurrentUserId();
    await runTransaction(db, async (transaction) => {
      const advanceSnapshot = await transaction.get(docRef);
      if (!advanceSnapshot.exists()) {
        throw new Error('Advance request not found');
      }

      const current = advanceSnapshot.data() as SalaryAdvance;
      const now = Date.now();
      const updateData: Record<string, unknown> = { status, updatedAt: now };
      if (slipImage) updateData.slipImage = slipImage;
      transaction.update(docRef, updateData);

      const auditEvent = buildPayrollAuditEvent({
        actor: { uid: actorUid, role: 'ADMIN' },
        action: status === 'APPROVED' ? 'ADVANCE_APPROVED' : 'ADVANCE_REJECTED',
        target: { collection: SALARY_ADVANCES_COLLECTION, documentId: advanceId, userId: current.userId },
        previous: { status: current.status, amount: current.amount },
        next: { status, amount: current.amount },
        occurredAt: now,
      });
      transaction.set(doc(db, PAYROLL_AUDIT_COLLECTION, `${advanceId}-${status}-${now}`), {
        ...auditEvent,
        createdAt: now,
      });
    });
  } catch (error) {
    console.error("Error updating advance: ", error);
    handleFirestoreError(error, OperationType.UPDATE, SALARY_ADVANCES_COLLECTION);
    throw error;
  }
}

export const recordPayrollAudit = async (input: PayrollAuditInput) => {
  const event = buildPayrollAuditEvent(input);
  try {
    const docRef = await addDoc(collection(db, PAYROLL_AUDIT_COLLECTION), {
      ...event,
      createdAt: event.occurredAt,
    });
    return docRef.id;
  } catch (error) {
    console.error("Error recording payroll audit: ", error);
    handleFirestoreError(error, OperationType.CREATE, PAYROLL_AUDIT_COLLECTION);
    throw error;
  }
};

export const recordEmployeeTransaction = async (transaction: Omit<EmployeeTransaction, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'EmployeeTransaction'), {
      ...transaction,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error recording employee transaction: ", error);
    handleFirestoreError(error, OperationType.CREATE, 'EmployeeTransaction');
    throw error;
  }
};

export const subscribeToMonthlyAdvances = (monthDate: Date, callback: (advances: SalaryAdvance[]) => void) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};

  const start = startOfMonth(monthDate).toISOString().split('T')[0];
  const end = endOfMonth(monthDate).toISOString().split('T')[0];

  const q = query(
    collection(db, SALARY_ADVANCES_COLLECTION),
    where('date', '>=', start),
    where('date', '<=', end)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryAdvance)));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, SALARY_ADVANCES_COLLECTION);
  });
};

export const subscribeToPendingAdvances = (callback: (advances: SalaryAdvance[]) => void) => {
  const q = query(
    collection(db, SALARY_ADVANCES_COLLECTION),
    where('status', '==', 'PENDING')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryAdvance)));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, SALARY_ADVANCES_COLLECTION);
  });
};

export const saveBaseSalary = async (employeeUserId: string, base_salary: number) => {
  try {
    await setDoc(doc(db, SALARIES_COLLECTION, employeeUserId), {
      userId: employeeUserId,
      base_salary,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Error saving base salary: ", error);
    handleFirestoreError(error, OperationType.WRITE, SALARIES_COLLECTION);
    throw error;
  }
};

export const subscribeToBaseSalaries = (callback: (salaries: EmployeeBaseSalary[]) => void) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};

  const q = query(
    collection(db, SALARIES_COLLECTION)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeBaseSalary)));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, SALARIES_COLLECTION);
  });
};

export const subscribeToUserBaseSalary = (userId: string, callback: (salary: EmployeeBaseSalary | null) => void) => {
  return onSnapshot(doc(db, SALARIES_COLLECTION, userId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as EmployeeBaseSalary);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${SALARIES_COLLECTION}/${userId}`);
  });
};

export const subscribeToUserMonthlyAdvances = (userId: string, monthDate: Date, callback: (advances: SalaryAdvance[]) => void) => {
  const start = startOfMonth(monthDate).toISOString().split('T')[0];
  const end = endOfMonth(monthDate).toISOString().split('T')[0];

  const q = query(
    collection(db, SALARY_ADVANCES_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', start),
    where('date', '<=', end)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryAdvance)));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, SALARY_ADVANCES_COLLECTION);
  });
};
