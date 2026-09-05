import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeBreedingTask,
  normalizeMaintenanceRequest,
  sortUnifiedWorkItems,
} from './taskEngine';

test('normalizes legacy breeding tasks without rewriting source records', () => {
  const item = normalizeBreedingTask({
    id: 'task-1',
    sowId: 'sow-doc-1',
    sowDisplayId: 'S001',
    type: 'FARROW',
    dueDate: '2026-09-06',
    status: 'PENDING',
    createdAt: 10,
  });

  assert.equal(item.source, 'BREEDING');
  assert.equal(item.kind, 'TASK');
  assert.equal(item.priority, 'HIGH');
  assert.equal(item.status, 'OPEN');
  assert.equal(item.route, '/sows/sow-doc-1');
});

test('critical maintenance becomes an exception', () => {
  const item = normalizeMaintenanceRequest({
    id: 'maintenance-1',
    title: 'ปั๊มน้ำหยุดทำงาน',
    location: 'โรงเรือน 2',
    urgency: 'CRITICAL',
    status: 'PENDING',
    createdAt: 20,
  });

  assert.equal(item.source, 'MAINTENANCE');
  assert.equal(item.kind, 'EXCEPTION');
  assert.equal(item.priority, 'CRITICAL');
  assert.equal(item.status, 'OPEN');
});

test('sorts critical work before overdue normal work and future work', () => {
  const critical = normalizeMaintenanceRequest({
    id: 'm1', title: 'ไฟดับ', location: 'โรงเรือน', urgency: 'CRITICAL', status: 'PENDING', createdAt: 1,
  });
  const overdue = normalizeBreedingTask({
    id: 't1', sowId: 's1', sowDisplayId: 'S001', type: 'BREED', dueDate: '2026-09-05', status: 'PENDING', createdAt: 2,
  });
  const future = normalizeBreedingTask({
    id: 't2', sowId: 's2', sowDisplayId: 'S002', type: 'BREED', dueDate: '2026-09-07', status: 'PENDING', createdAt: 3,
  });

  const sorted = sortUnifiedWorkItems([future, overdue, critical], '2026-09-06');
  assert.deepEqual(sorted.map((item) => item.id), [critical.id, overdue.id, future.id]);
});
