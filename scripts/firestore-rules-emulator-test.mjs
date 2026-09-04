import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'nipponfarm-rules-ci';
const rules = readFileSync('firestore.rules', 'utf8');

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules,
  },
});

const billA = {
  userId: 'staff-a',
  billDate: '2026-09-04',
  vendorName: 'QA Vendor A',
  imageUrl: '',
  totalAmount: 100,
  taxAmount: 0,
  discountAmount: 0,
  recordedBy: 'STAFF_A',
  referenceNo: 'QA-001',
  createdAt: 1,
};

const billItemA = {
  userId: 'staff-a',
  billId: 'bill-a',
  description: 'QA Item',
  quantity: 1,
  unit: 'unit',
  pricePerUnit: 100,
  total: 100,
  date: '2026-09-04',
};

const pigPriceA = {
  userId: 'staff-a',
  year: 2026,
  month: 9,
  price: 82,
  recordedBy: 'STAFF_A',
  createdAt: 1,
};

const maintenanceA = {
  userId: 'staff-a',
  title: 'QA maintenance',
  location: 'TEST-PEN',
  status: 'PENDING',
  urgency: 'LOW',
  createdAt: 1,
};

const advanceA = {
  userId: 'staff-a',
  amount: 100,
  date: '2026-09-04',
  status: 'PENDING',
  createdAt: 1,
  updatedAt: 1,
};

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', 'admin-test'), { role: 'ADMIN' });
    await setDoc(doc(db, 'users', 'staff-a'), { role: 'STAFF' });
    await setDoc(doc(db, 'users', 'staff-b'), { role: 'STAFF' });
    await setDoc(doc(db, 'users', 'pending-test'), { role: 'PENDING' });
    await setDoc(doc(db, 'users', 'resigned-test'), { role: 'RESIGNED' });

    await setDoc(doc(db, 'bills', 'bill-a'), billA);
    await setDoc(doc(db, 'bill_items', 'bill-item-a'), billItemA);
    await setDoc(doc(db, 'pig_prices', 'pig-price-a'), pigPriceA);
    await setDoc(doc(db, 'maintenance_requests', 'maintenance-a'), maintenanceA);
  });

  const adminDb = testEnv.authenticatedContext('admin-test').firestore();
  const staffADb = testEnv.authenticatedContext('staff-a').firestore();
  const staffBDb = testEnv.authenticatedContext('staff-b').firestore();
  const pendingDb = testEnv.authenticatedContext('pending-test').firestore();
  const resignedDb = testEnv.authenticatedContext('resigned-test').firestore();

  // Existing-owner boundaries.
  await assertSucceeds(updateDoc(doc(staffADb, 'bills', 'bill-a'), { vendorName: 'QA Vendor A Updated' }));
  await assertSucceeds(updateDoc(doc(staffADb, 'bill_items', 'bill-item-a'), { description: 'QA Item Updated' }));
  await assertSucceeds(updateDoc(doc(staffADb, 'pig_prices', 'pig-price-a'), { price: 83 }));
  await assertSucceeds(updateDoc(doc(staffADb, 'maintenance_requests', 'maintenance-a'), { title: 'QA maintenance updated' }));

  await assertFails(updateDoc(doc(staffBDb, 'bills', 'bill-a'), { userId: 'staff-b', vendorName: 'stolen' }));
  await assertFails(updateDoc(doc(staffBDb, 'bill_items', 'bill-item-a'), { userId: 'staff-b', description: 'stolen' }));
  await assertFails(updateDoc(doc(staffBDb, 'pig_prices', 'pig-price-a'), { userId: 'staff-b', price: 99 }));
  await assertFails(updateDoc(doc(staffBDb, 'maintenance_requests', 'maintenance-a'), { userId: 'staff-b', title: 'stolen' }));
  await assertSucceeds(updateDoc(doc(adminDb, 'bills', 'bill-a'), { vendorName: 'Admin correction' }));

  // Payroll owner paths: active staff only.
  await assertFails(setDoc(doc(pendingDb, 'salary_advances', 'pending-advance'), {
    userId: 'pending-test', amount: 100, date: '2026-09-04', status: 'PENDING', createdAt: 1, updatedAt: 1,
  }));
  await assertFails(setDoc(doc(resignedDb, 'salary_advances', 'resigned-advance'), {
    userId: 'resigned-test', amount: 100, date: '2026-09-04', status: 'PENDING', createdAt: 1, updatedAt: 1,
  }));
  await assertSucceeds(setDoc(doc(staffADb, 'salary_advances', 'staff-advance'), advanceA));
  await assertSucceeds(getDoc(doc(staffADb, 'salary_advances', 'staff-advance')));
  await assertFails(getDoc(doc(staffBDb, 'salary_advances', 'staff-advance')));
  await assertFails(updateDoc(doc(staffADb, 'salary_advances', 'staff-advance'), { status: 'APPROVED', updatedAt: 2 }));

  // Admin can approve/reject payroll requests.
  await assertSucceeds(updateDoc(doc(adminDb, 'salary_advances', 'staff-advance'), { status: 'APPROVED', updatedAt: 2 }));
  await assertSucceeds(getDoc(doc(adminDb, 'salary_advances', 'staff-advance')));

  // Audit events are admin-created/admin-readable and immutable afterwards.
  const auditEvent = {
    actorUid: 'admin-test',
    actorRole: 'ADMIN',
    action: 'ADVANCE_APPROVED',
    targetCollection: 'salary_advances',
    targetId: 'staff-advance',
    targetUserId: 'staff-a',
    previous: { status: 'PENDING', amount: 100 },
    next: { status: 'APPROVED', amount: 100 },
    occurredAt: 2,
    createdAt: 2,
  };
  await assertFails(setDoc(doc(staffADb, 'payroll_audit_events', 'audit-staff-denied'), auditEvent));
  await assertSucceeds(setDoc(doc(adminDb, 'payroll_audit_events', 'audit-approved'), auditEvent));
  await assertSucceeds(getDoc(doc(adminDb, 'payroll_audit_events', 'audit-approved')));
  await assertFails(getDoc(doc(staffADb, 'payroll_audit_events', 'audit-approved')));
  await assertFails(updateDoc(doc(adminDb, 'payroll_audit_events', 'audit-approved'), { createdAt: 3 }));
  await assertFails(deleteDoc(doc(adminDb, 'payroll_audit_events', 'audit-approved')));

  // Owner can cancel own pending request, but not an approved one.
  await assertSucceeds(setDoc(doc(staffADb, 'salary_advances', 'cancel-pending'), {
    ...advanceA,
    amount: 150,
  }));
  await assertSucceeds(deleteDoc(doc(staffADb, 'salary_advances', 'cancel-pending')));
  await assertFails(deleteDoc(doc(staffADb, 'salary_advances', 'staff-advance')));

  await assertSucceeds(getDoc(doc(staffADb, 'bills', 'bill-a')));

  console.log('Firestore emulator authorization and payroll audit checks passed.');
} finally {
  await testEnv.cleanup();
}
