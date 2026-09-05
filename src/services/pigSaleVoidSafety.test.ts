import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, './saleService.ts'), 'utf8');

test('pig sale service never hard-deletes normal sale records', () => {
  assert.equal(source.includes('deleteDoc('), false, 'Pig sale service must not hard-delete sale records');
  assert.equal(source.includes("recordStatus: 'VOID'"), true, 'Void operation must mark recordStatus VOID');
  assert.equal(source.includes('voidReason:'), true, 'Void operation must preserve a reason');
  assert.equal(source.includes('voidedAt:'), true, 'Void operation must preserve a timestamp');
  assert.equal(source.includes('voidedBy:'), true, 'Void operation must preserve the actor');
});

test('normal sale subscriptions exclude VOID records by default', () => {
  assert.equal(
    source.includes(".filter(sale => options.includeVoided || sale.recordStatus !== 'VOID')"),
    true,
    'Operational/report subscribers should exclude VOID sales unless explicitly requested',
  );
});

test('new sales are explicitly ACTIVE', () => {
  assert.equal(source.includes("recordStatus: 'ACTIVE'"), true);
});
