import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(resolve(here, '../firestore.rules'), 'utf8');

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const source = normalize(rules);

const expectRule = (snippet: string) => {
  assert.equal(
    source.includes(normalize(snippet)),
    true,
    `Expected firestore.rules to contain policy: ${snippet}`,
  );
};

test('owner-bound updates require the existing owner and immutable userId', () => {
  expectRule("function ownerIsUnchanged() { return incoming().userId == existing().userId; }");

  for (const collection of ['bills', 'bill_items', 'pig_prices']) {
    assert.equal(source.includes(`match /${collection}/{documentId}`), true);
  }

  const protectedOwnerUpdate = `
    isAdmin() || (isOwner(existing().userId) && ownerIsUnchanged())
  `;
  assert.equal(
    source.split(normalize(protectedOwnerUpdate)).length - 1 >= 4,
    true,
    'Expected owner immutability on maintenance, bills, bill_items, and pig_prices',
  );
});

test('pending and resigned users cannot directly use payroll owner paths', () => {
  expectRule("allow create: if isActiveUser() && incoming().userId == request.auth.uid;");
  expectRule("allow read: if isAdmin() || (isActiveUser() && resource.data.userId == request.auth.uid);");
  expectRule("allow delete: if isAdmin() || (isActiveUser() && resource.data.userId == request.auth.uid && existing().status == 'PENDING');");
});

test('payroll salary and slip owner reads require an active account', () => {
  expectRule("allow read: if isAdmin() || (isActiveUser() && documentId == request.auth.uid);");
  expectRule("allow read: if isAdmin() || (isActiveUser() && resource.data.userId == request.auth.uid);");
});
