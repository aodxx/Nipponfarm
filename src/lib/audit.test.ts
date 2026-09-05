import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAuditEvent, DEFAULT_FARM_ID, sanitizeAuditPayload } from './audit';

test('buildAuditEvent emits the shared V2 contract', () => {
  const event = buildAuditEvent({
    actor: { uid: 'admin-1', role: 'ADMIN' },
    action: 'SALE_VOIDED',
    target: { domain: 'SALES', collection: 'pig_sales', id: 'sale-1' },
    previous: { recordStatus: 'ACTIVE' },
    next: { recordStatus: 'VOID' },
    reason: 'duplicate sale',
    source: 'UI',
    occurredAt: 123,
  });

  assert.equal(event.farmId, DEFAULT_FARM_ID);
  assert.equal(event.actorUid, 'admin-1');
  assert.equal(event.actorRoleSnapshot, 'ADMIN');
  assert.equal(event.action, 'SALE_VOIDED');
  assert.equal(event.targetDomain, 'SALES');
  assert.equal(event.targetCollection, 'pig_sales');
  assert.equal(event.targetId, 'sale-1');
  assert.equal(event.reason, 'duplicate sale');
  assert.equal(event.occurredAt, 123);
  assert.equal(event.schemaVersion, 1);
});

test('audit payload sanitization recursively redacts sensitive fields', () => {
  assert.deepEqual(
    sanitizeAuditPayload({
      token: 'abc',
      nested: {
        accountNumber: '123456',
        safe: 'ok',
      },
      list: [{ apiKey: 'secret' }],
    }),
    {
      token: '[REDACTED]',
      nested: {
        accountNumber: '[REDACTED]',
        safe: 'ok',
      },
      list: [{ apiKey: '[REDACTED]' }],
    },
  );
});

test('audit contract rejects missing identity and target fields', () => {
  assert.throws(() => buildAuditEvent({
    actor: { uid: ' ', role: 'ADMIN' },
    action: 'SOW_REMOVED',
    target: { domain: 'BREEDING', collection: 'sows', id: 'sow-1' },
  }));

  assert.throws(() => buildAuditEvent({
    actor: { uid: 'admin-1', role: 'ADMIN' },
    action: 'SOW_REMOVED',
    target: { domain: 'BREEDING', collection: '', id: 'sow-1' },
  }));
});
