import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPayrollAuditEvent,
  canReadPayrollRecord,
  canUpdateAdvance,
  canWritePayrollAudit,
} from './payrollAudit';

test('staff can read only their own payroll records', () => {
  assert.equal(canReadPayrollRecord({ role: 'STAFF', uid: 'staff-1' }, { userId: 'staff-1' }), true);
  assert.equal(canReadPayrollRecord({ role: 'STAFF', uid: 'staff-1' }, { userId: 'staff-2' }), false);
});

test('admin can read and update another employee payroll record', () => {
  const admin = { role: 'ADMIN' as const, uid: 'admin-1' };
  assert.equal(canReadPayrollRecord(admin, { userId: 'staff-2' }), true);
  assert.equal(canUpdateAdvance(admin, { userId: 'staff-2', status: 'PENDING' }), true);
});

test('staff cannot update an advance even when they own it', () => {
  assert.equal(
    canUpdateAdvance(
      { role: 'STAFF', uid: 'staff-1' },
      { userId: 'staff-1', status: 'PENDING' },
    ),
    false,
  );
});

test('audit event records actor, target, transition, and safe metadata', () => {
  const event = buildPayrollAuditEvent({
    actor: { uid: 'admin-1', role: 'ADMIN' },
    action: 'ADVANCE_APPROVED',
    target: { collection: 'salary_advances', documentId: 'advance-1', userId: 'staff-1' },
    previous: { status: 'PENDING', amount: 2500 },
    next: { status: 'APPROVED', amount: 2500 },
    occurredAt: 1700000000000,
  });

  assert.deepEqual(event, {
    actorUid: 'admin-1',
    actorRole: 'ADMIN',
    action: 'ADVANCE_APPROVED',
    targetCollection: 'salary_advances',
    targetId: 'advance-1',
    targetUserId: 'staff-1',
    previous: { status: 'PENDING', amount: 2500 },
    next: { status: 'APPROVED', amount: 2500 },
    occurredAt: 1700000000000,
  });
});

test('audit event rejects secrets and unapproved target collections', () => {
  assert.throws(() => buildPayrollAuditEvent({
    actor: { uid: 'admin-1', role: 'ADMIN' },
    action: 'PAYSLIP_UPDATED',
    target: { collection: 'users', documentId: 'user-1', userId: 'staff-1' },
    previous: { password: 'secret' },
    next: { password: 'secret' },
    occurredAt: 1700000000000,
  }));
});

test('only admins can write payroll audit events and actor must match', () => {
  assert.equal(canWritePayrollAudit({ uid: 'admin-1', role: 'ADMIN' }, 'admin-1'), true);
  assert.equal(canWritePayrollAudit({ uid: 'staff-1', role: 'STAFF' }, 'staff-1'), false);
  assert.equal(canWritePayrollAudit({ uid: 'admin-1', role: 'ADMIN' }, 'admin-2'), false);
});
