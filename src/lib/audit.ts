export type AuditActorRole = 'ADMIN' | 'STAFF' | 'PENDING' | 'RESIGNED';
export type AuditSource = 'UI' | 'SYSTEM' | 'AI_CONFIRMATION' | 'MIGRATION' | 'ADMIN_TOOL';
export type AuditDomain = 'BREEDING' | 'SALES' | 'PAYROLL' | 'FINANCE' | 'MAINTENANCE' | 'USERS' | 'SYSTEM';

export type AuditAction =
  | 'ROLE_PERMISSION_CHANGED'
  | 'SOW_LIFECYCLE_CORRECTED'
  | 'SOW_REMOVED'
  | 'SALE_VOIDED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_CORRECTED'
  | 'PAYROLL_CLOSED'
  | 'PAYROLL_REOPENED'
  | 'ADVANCE_APPROVED'
  | 'ADVANCE_PAID'
  | 'ADVANCE_REPAYMENT_CHANGED'
  | 'AI_DECISION_CONFIRMED'
  | 'MIGRATION_APPLIED'
  | 'RECONCILIATION_RESOLVED';

export interface AuditActor {
  uid: string;
  role: AuditActorRole;
}

export interface AuditTarget {
  domain: AuditDomain;
  collection: string;
  id: string;
}

export interface AuditEventInput {
  actor: AuditActor;
  action: AuditAction;
  target: AuditTarget;
  previous?: Record<string, unknown>;
  next?: Record<string, unknown>;
  reason?: string;
  source?: AuditSource;
  occurredAt?: number;
  correlationId?: string;
  farmId?: string;
}

export interface AuditEventV2 {
  farmId: string;
  actorUid: string;
  actorRoleSnapshot: AuditActorRole;
  action: AuditAction;
  targetDomain: AuditDomain;
  targetCollection: string;
  targetId: string;
  previous: Record<string, unknown>;
  next: Record<string, unknown>;
  reason?: string;
  source: AuditSource;
  occurredAt: number;
  correlationId?: string;
  schemaVersion: 1;
}

export const DEFAULT_FARM_ID = 'nipponfarm-main';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'slipImage',
  'signature',
  'accountNumber',
]);

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      SENSITIVE_KEYS.has(key) ? REDACTED : sanitizeValue(child),
    ]),
  );
};

export const sanitizeAuditPayload = (payload: Record<string, unknown> = {}): Record<string, unknown> => (
  sanitizeValue(payload) as Record<string, unknown>
);

export const buildAuditEvent = (input: AuditEventInput): AuditEventV2 => {
  if (!input.actor.uid.trim()) throw new Error('Audit actor uid is required');
  if (!input.target.collection.trim()) throw new Error('Audit target collection is required');
  if (!input.target.id.trim()) throw new Error('Audit target id is required');

  const reason = input.reason?.trim();
  const correlationId = input.correlationId?.trim();

  return {
    farmId: input.farmId?.trim() || DEFAULT_FARM_ID,
    actorUid: input.actor.uid,
    actorRoleSnapshot: input.actor.role,
    action: input.action,
    targetDomain: input.target.domain,
    targetCollection: input.target.collection,
    targetId: input.target.id,
    previous: sanitizeAuditPayload(input.previous),
    next: sanitizeAuditPayload(input.next),
    ...(reason ? { reason } : {}),
    source: input.source || 'UI',
    occurredAt: input.occurredAt ?? Date.now(),
    ...(correlationId ? { correlationId } : {}),
    schemaVersion: 1,
  };
};
