import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, './sowService.ts'), 'utf8');

const cullBlockStart = source.indexOf("if (eventType === 'CULL')");
const cullBlockEnd = source.indexOf("const eventRef = draftDocId", cullBlockStart);
const cullBlock = source.slice(cullBlockStart, cullBlockEnd);

test('CULL preserves sow and event history instead of deleting records', () => {
  assert.ok(cullBlockStart >= 0, 'Expected explicit CULL handling');
  assert.ok(cullBlockEnd > cullBlockStart, 'Expected normal event flow after CULL handling');
  assert.equal(cullBlock.includes('batch.delete('), false, 'CULL must not hard-delete sow, events, or tasks');
  assert.equal(cullBlock.includes("type: 'CULL'"), true, 'CULL must append a removal event');
  assert.equal(cullBlock.includes("status: 'CULLED'"), true, 'CULL must archive the sow via status');
  assert.equal(cullBlock.includes("status: 'CANCELLED'"), true, 'CULL must cancel pending tasks');
  assert.equal(cullBlock.includes("cancellationReason: 'SOW_REMOVED'"), true, 'Cancelled tasks need a traceable reason');
});

test('active sow subscriptions exclude archived CULLED animals', () => {
  assert.equal(
    source.includes(".filter(sow => sow.status !== 'CULLED')"),
    true,
    'Active sow list should preserve previous UX while retaining archived records in Firestore',
  );
});
