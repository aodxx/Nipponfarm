export type PayrollRole = 'ADMIN' | 'STAFF' | 'PENDING' | 'RESIGNED';

export interface PayrollActor {
  uid: string;
  role: PayrollRole;
}

export interface PayrollTarget {
  collection: string;
  documentId: string;
  userId: string;
}

export interface PayrollAuditInput {
  actor: PayrollActor;
  action: 'ADVANCE_APPROVED' | 'ADVANCE_REJECTED' | 'PAYSLIP_UPDATED' | 'SALARY_UPDATED';
  target: PayrollTarget;
  previous: Record<string, unknown>;
  next: Record<string, unknown>;
  occurredAt: number;
}

export interface PayrollAuditEvent {
  actorUid: string;
  actorRole: PayrollRole;
  action: PayrollAuditInput['action'];
  targetCollection: string;
  targetId: string;
  targetUserId: string;
  previous: Record<string, unknown>;
  next: Record<string, unknown>;
  occurredAt: number;
}

const FORBIDDEN_KEYS = new Set(['password', 'token', 'secret', 'apiKey', 'slipImage']);
const ALLOWED_COLLECTIONS = new Set(['salary_advances', 'payroll_slips', 'employee_salaries', 'EmployeeTransaction']);

const assertSafeMetadata = (metadata: Record<string, unknown>): void => {
  if (Object.keys(metadata).some((key) => FORBIDDEN_KEYS.has(key))) {
    throw new Error('Payroll audit metadata contains a forbidden secret field');
  }
};

export const canReadPayrollRecord = (
  actor: PayrollActor,
  target: Pick<PayrollTarget, 'userId'>,
): boolean => actor.role === 'ADMIN' || (actor.role === 'STAFF' && actor.uid === target.userId);

export const canUpdateAdvance = (
  actor: PayrollActor,
  target: Pick<PayrollTarget, 'userId'> & { status: string },
): boolean => actor.role === 'ADMIN';

export const canWritePayrollAudit = (actor: PayrollActor, actorUid: string): boolean => (
  actor.role === 'ADMIN' && actor.uid === actorUid
);

export const buildPayrollAuditEvent = (input: PayrollAuditInput): PayrollAuditEvent => {
  if (!ALLOWED_COLLECTIONS.has(input.target.collection)) {
    throw new Error('Payroll audit target collection is not allowed');
  }
  assertSafeMetadata(input.previous);
  assertSafeMetadata(input.next);
  return {
    actorUid: input.actor.uid,
    actorRole: input.actor.role,
    action: input.action,
    targetCollection: input.target.collection,
    targetId: input.target.documentId,
    targetUserId: input.target.userId,
    previous: input.previous,
    next: input.next,
    occurredAt: input.occurredAt,
  };
};
