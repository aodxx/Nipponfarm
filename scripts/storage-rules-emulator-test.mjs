import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  ref,
  uploadBytes,
  deleteObject,
} from 'firebase/storage';

const PROJECT_ID = 'nipponfarm-rules-ci';
const rules = readFileSync('storage.rules', 'utf8');

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  storage: {
    host: '127.0.0.1',
    port: 9199,
    rules,
  },
});

const image = new Uint8Array([137, 80, 78, 71]);

try {
  const staffA = testEnv.authenticatedContext('staff-a').storage();
  const staffB = testEnv.authenticatedContext('staff-b').storage();
  const anonymous = testEnv.unauthenticatedContext().storage();

  await assertSucceeds(
    uploadBytes(ref(staffA, 'bills/staff-a/bill-a.webp'), image, { contentType: 'image/webp' }),
  );

  await assertFails(
    uploadBytes(ref(staffB, 'bills/staff-a/stolen.webp'), image, { contentType: 'image/webp' }),
  );

  await assertFails(
    uploadBytes(ref(staffA, 'bills/staff-a/not-image.txt'), image, { contentType: 'text/plain' }),
  );

  await assertSucceeds(
    uploadBytes(ref(staffA, 'maintenance/maintenance-a.webp'), image, { contentType: 'image/webp' }),
  );

  await assertFails(
    uploadBytes(ref(anonymous, 'maintenance/anonymous.webp'), image, { contentType: 'image/webp' }),
  );

  await assertSucceeds(
    uploadBytes(ref(staffA, 'avatars/staff-a/avatar.webp'), image, { contentType: 'image/webp' }),
  );

  await assertFails(
    uploadBytes(ref(staffB, 'avatars/staff-a/stolen.webp'), image, { contentType: 'image/webp' }),
  );

  await assertSucceeds(deleteObject(ref(staffA, 'bills/staff-a/bill-a.webp')));

  console.log('Firebase Storage emulator authorization checks passed.');
} finally {
  await testEnv.cleanup();
}
