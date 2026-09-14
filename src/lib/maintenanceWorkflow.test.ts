import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAINTENANCE_TEST_DATA,
  assertMaintenanceStatusTransition,
  buildMaintenanceTestPath,
  canTransitionMaintenanceStatus,
  getMaintenanceStatusPatch,
  getMaintenanceVerificationEvidence,
  isMaintenanceAdmin,
  isMaintenanceOwner,
  isScopedMaintenanceTestRecord,
  isTerminalMaintenanceStatus,
} from './maintenanceWorkflow';

test('maintenance test fixture is isolated and owner-scoped', () => {
  assert.equal(isScopedMaintenanceTestRecord(MAINTENANCE_TEST_DATA), true);
  assert.equal(isMaintenanceOwner(MAINTENANCE_TEST_DATA.userId, MAINTENANCE_TEST_DATA.userId), true);
  assert.equal(isMaintenanceOwner('staff-test-002', MAINTENANCE_TEST_DATA.userId), false);
});

test('maintenance happy path follows pending, in-progress, resolved', () => {
  assert.deepEqual(buildMaintenanceTestPath(), ['PENDING', 'IN_PROGRESS', 'RESOLVED']);
  assert.equal(canTransitionMaintenanceStatus('PENDING', 'IN_PROGRESS'), true);
  assert.equal(canTransitionMaintenanceStatus('IN_PROGRESS', 'RESOLVED'), true);
  assert.equal(isTerminalMaintenanceStatus('RESOLVED'), true);
});

test('maintenance rejects skipping or reopening workflow states', () => {
  assert.throws(() => assertMaintenanceStatusTransition('PENDING', 'RESOLVED'), /Invalid maintenance status transition/);
  assert.throws(() => assertMaintenanceStatusTransition('RESOLVED', 'PENDING'), /Invalid maintenance status transition/);
});

test('maintenance resolution patch records resolvedAt only at terminal state', () => {
  assert.deepEqual(getMaintenanceStatusPatch('IN_PROGRESS', 123), { status: 'IN_PROGRESS' });
  assert.deepEqual(getMaintenanceStatusPatch('RESOLVED', 123), { status: 'RESOLVED', resolvedAt: 123 });
});

test('maintenance verification evidence is repository-only and cleanup-scoped', () => {
  assert.deepEqual(getMaintenanceVerificationEvidence(), {
    testRecordId: 'maintenance-test-2026-09-14-001',
    path: ['PENDING', 'IN_PROGRESS', 'RESOLVED'],
    happyPath: true,
    invalidTransitionRejected: true,
    ownerBoundary: true,
    adminBoundary: true,
    cleanupScoped: true,
    productionDataTouched: false,
  });
  assert.equal(isMaintenanceAdmin('ADMIN'), true);
  assert.equal(isMaintenanceAdmin('STAFF'), false);
});
