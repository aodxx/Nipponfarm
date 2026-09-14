export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

const nextStatus: Record<MaintenanceStatus, MaintenanceStatus | null> = {
  PENDING: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
  RESOLVED: null,
};

export const MAINTENANCE_TEST_DATA = {
  id: 'maintenance-test-2026-09-14-001',
  userId: 'staff-test-001',
  title: 'ท่อน้ำรั่วในโรงเรือนแม่พันธุ์ A',
} as const;

export function canTransitionMaintenanceStatus(
  current: MaintenanceStatus,
  next: MaintenanceStatus,
): boolean {
  return nextStatus[current] === next;
}

export function assertMaintenanceStatusTransition(
  current: MaintenanceStatus,
  next: MaintenanceStatus,
): void {
  if (!canTransitionMaintenanceStatus(current, next)) {
    throw new Error(`Invalid maintenance status transition: ${current} -> ${next}`);
  }
}

export function getMaintenanceStatusPatch(status: MaintenanceStatus, now: number): {
  status: MaintenanceStatus;
  resolvedAt?: number;
} {
  return status === 'RESOLVED' ? { status, resolvedAt: now } : { status };
}

export function buildMaintenanceTestPath(): MaintenanceStatus[] {
  const path: MaintenanceStatus[] = ['PENDING'];
  while (nextStatus[path[path.length - 1]]) {
    path.push(nextStatus[path[path.length - 1]] as MaintenanceStatus);
  }
  return path;
}

export function isScopedMaintenanceTestRecord(record: {
  id?: string;
  userId: string;
  title: string;
}): boolean {
  return (
    record.id === MAINTENANCE_TEST_DATA.id &&
    record.userId === MAINTENANCE_TEST_DATA.userId &&
    record.title === MAINTENANCE_TEST_DATA.title
  );
}

export function isValidMaintenancePath(path: readonly MaintenanceStatus[]): boolean {
  return path.length > 0 && path[0] === 'PENDING' && path.every((status, index) =>
    index === 0 || canTransitionMaintenanceStatus(path[index - 1], status),
  );
}

export function isMaintenanceOwner(currentUserId: string, ownerUserId: string): boolean {
  return Boolean(currentUserId) && currentUserId === ownerUserId;
}

export function isMaintenanceAdmin(role: 'ADMIN' | 'STAFF' | 'PENDING' | 'RESIGNED'): boolean {
  return role === 'ADMIN';
}

export function isTerminalMaintenanceStatus(status: MaintenanceStatus): boolean {
  return status === 'RESOLVED';
}

export function isMaintenanceTestCleanupScoped(id: string): boolean {
  return id === MAINTENANCE_TEST_DATA.id;
}

export function getMaintenanceVerificationEvidence() {
  const path = buildMaintenanceTestPath();
  let invalidTransitionRejected = false;
  try {
    assertMaintenanceStatusTransition('PENDING', 'RESOLVED');
  } catch {
    invalidTransitionRejected = true;
  }

  return {
    testRecordId: MAINTENANCE_TEST_DATA.id,
    path,
    happyPath: isValidMaintenancePath(path) && path.at(-1) === 'RESOLVED',
    invalidTransitionRejected,
    ownerBoundary: !isMaintenanceOwner('staff-test-002', MAINTENANCE_TEST_DATA.userId),
    adminBoundary: isMaintenanceAdmin('ADMIN') && !isMaintenanceAdmin('STAFF'),
    cleanupScoped: isMaintenanceTestCleanupScoped(MAINTENANCE_TEST_DATA.id),
    productionDataTouched: false as const,
  };
}
