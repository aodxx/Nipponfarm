# Firebase Rules Scenario & Evidence Matrix

**Task:** `NP-RULES-02`
**Owner:** `NIPON-SEC-01` (Team A)
**Branch:** `security/rules-scenario-matrix-2026-09-04`
**Source revision:** `d1d6848068065ba3219f4c46e809a80ec09c049f`
**Rules examined:** `firestore.rules`, `storage.rules`
**Artifact status:** `STATIC PREPARATION COMPLETE`
**Runtime status:** `NOT RUN` / next execution `BLOCKED` until an isolated Firebase boundary and owner-approved synthetic fixtures are supplied.

This document is a static scenario and evidence plan derived from the rules currently in this branch. It records expected authorization outcomes; it does **not** claim that any scenario passed, that the rules are safe, or that production is authorized. No Firebase project, production credential, production data, or external destination was accessed or mutated while preparing this matrix.

## 1. Scope, source basis, and interpretation

The source snapshot uses Firestore rules version 2 and Storage rules version 2. Firestore helper and validation functions are in `firestore.rules:5-109`; the default deny match is at `firestore.rules:112-115`. The explicit Firestore paths are at `firestore.rules:117-243`. Storage authentication, path matches, and default deny are at `storage.rules:4-33`.

`ADMIN` means a synthetic signed-in user whose isolated `users/{uid}` document has `role: 'ADMIN'`; the rules also contain two hard-coded email bypasses, but this matrix must not use personal identities or production accounts. `STAFF` means `role: 'STAFF'`. `PENDING` and `RESIGNED` mean signed-in synthetic users whose profile role is respectively `PENDING` or `RESIGNED`; the current rules do not define dedicated helper functions for either status. `WRONG_OWNER` means `STAFF_B` acting on a record owned by `STAFF_A`, unless the row explicitly says that the incoming owner field is changed.

The words **allow** and **deny** below are static expectations from the current source. Every `Actual` value is intentionally `NOT RUN`. An allow means the request should be authorized; it does not mean that the record exists, the payload is valid at the application layer, or that a query returns data. A deny means the authorization layer should return a permission error (or an equivalent emulator denial).

## 2. Actor and fixture assumptions

All accounts and records must be synthetic and created only inside a local emulator or a separately approved test project. The IDs below are labels, not credentials. They must not be replaced with production UIDs, email addresses, tokens, or personal data.

| Actor label | Synthetic UID | Auth/profile assumption | `isSignedIn()` | `isAdmin()` | `isActiveUser()` |
|---|---|---|---:|---:|---:|
| `UNAUTH` | none | No Auth Emulator session/token | false | false | false |
| `ADMIN_TEST` | `admin-test-001` | `users/admin-test-001.role = 'ADMIN'` | true | true | true |
| `STAFF_A` | `staff-a-001` | `users/staff-a-001.role = 'STAFF'` | true | false | true |
| `STAFF_B` | `staff-b-001` | `users/staff-b-001.role = 'STAFF'`; used for wrong-owner checks | true | false | true |
| `PENDING_TEST` | `pending-test-001` | `users/pending-test-001.role = 'PENDING'` | true | false | false |
| `RESIGNED_TEST` | `resigned-test-001` | `users/resigned-test-001.role = 'RESIGNED'` | true | false | false |

Seed at least one existing record owned by `STAFF_A`, one own record for each signed-in actor where an ownership read is tested, and valid/invalid fixtures where a validator is called. Use fixed IDs such as `rules-matrix-001` and timestamps generated inside the isolated test run. Do not use real names, phone numbers, payroll, farm, image, or financial data.

The following payload assumptions are required for validator-dependent rows. Extra fields should be added only when the scenario is explicitly testing an affected-key or exact-key condition.

| Fixture | Minimum valid fields required by the current rules | Invalid variant to retain for a negative case |
|---|---|---|
| Maintenance | `userId`, `title`, `location`, `status` in `PENDING/IN_PROGRESS/RESOLVED`, `urgency` in `LOW/MEDIUM/HIGH/CRITICAL`, numeric `createdAt` | Missing required field or invalid status |
| News post | `userId`, `authorName`, `content`, numeric `createdAt` | Missing field or oversized string |
| Manual | `title`, `content`, numeric `updatedAt` | Missing field or oversized string |
| Bill | `userId`, `billDate`, `vendorName`, numeric `totalAmount`, `recordedBy`, numeric/timestamp `createdAt` | Missing field or wrong field type |
| Bill item | `userId`, `billId`, `description`, numeric `quantity`, numeric `total`, `date` | Missing field or wrong field type |
| Pig price | `userId`, numeric `year`, `month` 1–12, non-negative numeric `price`, `recordedBy`, numeric `createdAt` | Month outside 1–12 or negative price |
| Historical pig price | Exactly `year`, `months`, and `avg`; `year`/`avg` numeric and `months` a map | Extra key, missing key, or wrong type |
| Payroll audit | `actorUid`, `actorRole: 'ADMIN'`, allowed `action`, allowed `targetCollection`, string IDs, map `previous`/`next`, numeric `occurredAt`/`createdAt` | Non-ADMIN actor role, unsupported action, or missing field |
| Unvalidated collections | A small synthetic map is sufficient for `sows`, `events`, `tasks`, `pig_sales`, chat, settings, and ingredients | Not applicable to current rules; use a separate malformed payload only to confirm that no schema validation is present |

## 3. Evidence record schema and execution status

One evidence record must be completed for each executed scenario. The record may be a redacted emulator/test-project log or a signed-off test report, but it must never contain tokens, service-account JSON, API keys, passwords, private URLs with credentials, or production data.

| Required field | Required content |
|---|---|
| `evidence_id` | Matrix ID, for example `FS-001` or `ST-006` |
| `environment` | `firestore-emulator`, `storage-emulator`, or owner-approved isolated test project; never `production` |
| `rules_revision` | Commit SHA and rules file hash or an equivalent immutable source reference |
| `project_id` / `bucket` | Non-secret isolated identifier only; blank until verified |
| `actor_label` | One actor label from Section 2, including `UNAUTH` or `WRONG_OWNER` |
| `operation` and `path` | Exact Firestore document/query path or Storage object path |
| `fixture/reference` | Synthetic seed ID and redacted payload/checksum reference |
| `expected` | The static allow/deny result in this matrix |
| `actual_status` | `NOT RUN`, `PASS`, `FAIL`, or `BLOCKED`; do not replace `NOT RUN` with an unexecuted PASS |
| `timestamp_utc` | Start/end time of the isolated run in UTC |
| `artifact_reference` | Redacted log, emulator report, or test-run ID; no secrets |
| `cleanup_result` | Deletion and post-cleanup count/manifest, or `NOT RUN` |
| `reviewer` | Independent reviewer or `NOT ASSIGNED` |

## 4. Firestore static scenario matrix

The Firestore matrix covers each explicit collection in the source. For compactness, `read` includes a document `get` and, where the rule grants it, a collection `list`; execution must still record them separately when both are relevant. `write` means the applicable create/update/delete operation only when the row says so. The `Actual` column is intentionally `NOT RUN` for every row.

| ID | Path and operation | UNAUTH | ADMIN | STAFF / WRONG_OWNER | PENDING | RESIGNED | Static expected and fixture focus | Actual |
|---|---|---|---|---|---|---|---|---|
| FS-001 | `test/connection` — read | allow | allow | allow | allow | allow | Explicit `allow read: if true`; verify no authentication is needed. | NOT RUN |
| FS-002 | `test/connection` — create/update/delete | deny | deny | deny | deny | deny | No write rule; default deny applies. | NOT RUN |
| FS-003 | `users/{uid}` — read | deny | allow | allow | allow | allow | Any signed-in user may read; seed profile docs. | NOT RUN |
| FS-004 | `users/{uid}` — create own / create another user | deny / deny | allow / deny | allow / deny | allow / deny | allow / deny | Create requires signed-in UID equal to path UID; `ADMIN` is not a bypass for create of another UID. | NOT RUN |
| FS-005 | `users/{uid}` — update own / update another user | deny / deny | allow / allow | allow / deny | allow / deny | allow / deny | Self-update is allowed for any signed-in role; only `ADMIN` may update another profile. | NOT RUN |
| FS-006 | `news_posts/{postId}` — get/list | deny | allow | allow | allow | allow | Signed-in read/list; no active-role requirement. | NOT RUN |
| FS-007 | `news_posts/{postId}` — create valid self-owned post | deny | allow | deny | deny | deny | Requires `isAdmin()`, valid payload, and incoming `userId == auth.uid`. | NOT RUN |
| FS-008 | `news_posts/{postId}` — update `likedBy` only | deny | allow | allow, including WRONG_OWNER | allow | allow | Signed-in users may update only the `likedBy` field through the non-admin branch. | NOT RUN |
| FS-009 | `news_posts/{postId}` — full valid content update | deny | allow | deny | deny | deny | Full update requires `ADMIN` and `isValidNewsPost`; use a valid admin fixture. | NOT RUN |
| FS-010 | `news_posts/{postId}` — delete | deny | allow | deny | deny | deny | Delete is admin-only. | NOT RUN |
| FS-011 | `manuals/{manualId}` — get/list | deny | allow | allow | allow | allow | Any signed-in user may read/list. | NOT RUN |
| FS-012 | `manuals/{manualId}` — create/update valid | deny | allow | deny | deny | deny | Admin-only plus `isValidManual`. | NOT RUN |
| FS-013 | `manuals/{manualId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-014 | `sows/{documentId}` — read/create/update | deny | allow | allow, including WRONG_OWNER | deny | deny | `isActiveUser()` only; no owner, `farmId`, or payload validation. | NOT RUN |
| FS-015 | `sows/{documentId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-016 | `events/{documentId}` — read/create/update | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user-only; no owner/farm boundary in this rule. | NOT RUN |
| FS-017 | `events/{documentId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-018 | `tasks/{documentId}` — read/create/update | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user-only; no owner/farm boundary in this rule. | NOT RUN |
| FS-019 | `tasks/{documentId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-020 | `pig_sales/{documentId}` — read/create/update | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user-only; no owner/farm boundary in this rule. | NOT RUN |
| FS-021 | `pig_sales/{documentId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-022 | `maintenance_requests/{documentId}` — read | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user read; current rule does not restrict reads to the request owner. | NOT RUN |
| FS-023 | `maintenance_requests/{documentId}` — create with own `userId` | deny | allow | allow for STAFF_A; deny for WRONG_OWNER payload | deny | deny | Active user, valid maintenance payload, and incoming owner must equal auth UID. | NOT RUN |
| FS-024 | `maintenance_requests/{documentId}` — update own / another owner | deny | allow / allow | allow / deny | deny / deny | deny / deny | Active admin may update any; non-admin active user must own `existing().userId` and send a valid full payload. | NOT RUN |
| FS-025 | `maintenance_requests/{documentId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-026 | `chat_rooms/{documentId}` and `chat_messages/{documentId}` — read/write | deny | allow | allow, including WRONG_OWNER | deny | deny | Both paths use `isActiveUser()` for all reads and writes; no room/message ownership is checked. | NOT RUN |
| FS-027 | `employee_transactions/{documentId}` — read/write | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-028 | `EmployeeTransaction/{documentId}` — read/write | deny | allow | deny | deny | deny | Case-sensitive parallel payroll collection; admin-only. | NOT RUN |
| FS-029 | `employee_salaries/{documentId}` — read own / read another | deny / deny | allow / allow | allow / deny | allow / deny | allow / deny | Own read depends only on signed-in UID matching the document ID, not active status; admin reads all. | NOT RUN |
| FS-030 | `employee_salaries/{documentId}` — create/update/delete | deny | allow | deny | deny | deny | All writes are admin-only. | NOT RUN |
| FS-031 | `payroll_slips/{documentId}` — read own / read another | deny / deny | allow / allow | allow / deny | allow / deny | allow / deny | Non-admin own read depends on existing `resource.data.userId`; seed both owner variants. | NOT RUN |
| FS-032 | `payroll_slips/{documentId}` — create/update/delete | deny | allow | deny | deny | deny | All writes are admin-only. | NOT RUN |
| FS-033 | `salary_advances/{documentId}` — create own / create another | deny / deny | allow / deny | allow / deny | allow / deny | allow / deny | Create checks only signed-in status and incoming `userId`; it does **not** require active status. | NOT RUN |
| FS-034 | `salary_advances/{documentId}` — read own / read another | deny / deny | allow / allow | allow / deny | allow / deny | allow / deny | Own read is available to any signed-in role; use existing records with each `userId`. | NOT RUN |
| FS-035 | `salary_advances/{documentId}` — update | deny | allow | deny | deny | deny | Admin-only, without a separate validator. | NOT RUN |
| FS-036 | `salary_advances/{documentId}` — delete own `status='PENDING'` / own non-pending | deny / deny | allow / allow | allow / deny | allow / deny | allow / deny | Signed-in owner may delete only an existing pending advance; admin may delete either status. `WRONG_OWNER` is denied. | NOT RUN |
| FS-037 | `payroll_audit_events/{documentId}` — read | deny | allow | deny | deny | deny | Admin-only read. | NOT RUN |
| FS-038 | `payroll_audit_events/{documentId}` — create valid admin audit | deny | allow when `actorUid` is admin UID | deny | deny | deny | Requires admin, valid audit shape, and incoming `actorUid == auth.uid`; no update/delete rule exists. | NOT RUN |
| FS-039 | `payroll_audit_events/{documentId}` — invalid create / update/delete | deny / deny | deny / deny | deny / deny | deny / deny | deny / deny | Invalid audit payload is denied; all updates/deletes are denied by absence of a grant. | NOT RUN |
| FS-040 | `bills/{documentId}` — read | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user read is broad and does not inspect document owner. | NOT RUN |
| FS-041 | `bills/{documentId}` — create valid self / create with another owner | deny / deny | allow / deny | allow / deny | deny / deny | deny / deny | Valid bill, active user, and incoming owner must equal auth UID. | NOT RUN |
| FS-042 | `bills/{documentId}` — update preserving other owner / changing incoming owner to self | deny / deny | allow / allow | deny / **allow** for WRONG_OWNER | deny / deny | deny / deny | Current rule checks the incoming owner, not the existing owner. The second WRONG_OWNER case is an expected **policy gap observation**, not a desired security outcome. | NOT RUN |
| FS-043 | `bills/{documentId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-044 | `bill_items/{documentId}` — read | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user read is broad. | NOT RUN |
| FS-045 | `bill_items/{documentId}` — create valid self / create with another owner | deny / deny | allow / deny | allow / deny | deny / deny | deny / deny | Valid item, active user, and incoming owner must equal auth UID. | NOT RUN |
| FS-046 | `bill_items/{documentId}` — update preserving other owner / changing incoming owner to self | deny / deny | allow / allow | deny / **allow** for WRONG_OWNER | deny / deny | deny / deny | Same incoming-owner reassignment gap as `bills`; preserve both outcomes in evidence. | NOT RUN |
| FS-047 | `bill_items/{documentId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-048 | `feed_recipes/{documentId}` — read/create/update valid | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user plus validator for writes; validator does not require `userId == auth.uid`. | NOT RUN |
| FS-049 | `feed_recipes/{documentId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-050 | `pig_prices/{documentId}` — read | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user read is broad. | NOT RUN |
| FS-051 | `pig_prices/{documentId}` — create self / create another | deny / deny | allow / deny | allow / deny | deny / deny | deny / deny | Valid price, active user, and incoming owner must equal auth UID. | NOT RUN |
| FS-052 | `pig_prices/{documentId}` — update preserving other owner / changing incoming owner to self | deny / deny | allow / allow | deny / **allow** for WRONG_OWNER | deny / deny | deny / deny | Current rule permits an active user when incoming owner is self, even if existing owner differs; record as a policy gap observation. | NOT RUN |
| FS-053 | `pig_prices/{documentId}` — delete | deny | allow | deny | deny | deny | Admin-only. | NOT RUN |
| FS-054 | `historical_pig_prices/{documentId}` — read | deny | allow | allow, including WRONG_OWNER | allow | allow | Any signed-in user may read; no active-role or owner check. | NOT RUN |
| FS-055 | `historical_pig_prices/{documentId}` — create valid ID/payload | deny | allow | allow | deny | deny | Requires active user, valid ID, and exactly the three-field historical payload. | NOT RUN |
| FS-056 | `historical_pig_prices/{documentId}` — update allowed fields | deny | allow | allow, including WRONG_OWNER | deny | deny | Active non-admin may update only when valid and changed keys are a subset of `year`, `months`, `avg`; no owner check. | NOT RUN |
| FS-057 | `historical_pig_prices/{documentId}` — update disallowed field / invalid ID | deny / deny | allow / deny | deny / deny | deny / deny | deny / deny | Admin needs a valid ID but bypasses the payload branch; non-admin needs valid payload and allowed affected keys. | NOT RUN |
| FS-058 | `historical_pig_prices/{documentId}` — delete valid ID | deny | allow | deny | deny | deny | Admin-only plus `isValidId(documentId)`. | NOT RUN |
| FS-059 | `farm_settings/{documentId}` — read/write | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user-only; no settings owner/farm boundary. | NOT RUN |
| FS-060 | `master_ingredients/{documentId}` — read/write | deny | allow | allow, including WRONG_OWNER | deny | deny | Active-user-only; no owner or payload validation. | NOT RUN |
| FS-061 | Any nested or unknown Firestore path not matched above | deny | deny | deny | deny | deny | Confirm default `match /{document=**}` deny; include a nested probe such as `sows/rules-matrix-001/notes/n-001`. | NOT RUN |

### Firestore interpretation notes

The `users` profile document is itself the source of the role decision for synthetic non-bypass users. Seed it through an emulator/admin setup path before testing role-protected operations; do not attempt to bootstrap it by mutating production. Because `PENDING` and `RESIGNED` are not recognized as active roles, most active-user paths deny them, but several rules intentionally use only `isSignedIn()` and therefore still allow their own salary/advance/profile operations and the signed-in `news_posts.likedBy` update.

The matrix deliberately records broad grants and owner-reassignment outcomes as observations. In particular, reads and writes on several active-user collections are not constrained by `userId` or `farmId`, while `bills`, `bill_items`, and `pig_prices` compare the incoming owner on update rather than the existing owner. These are findings for review, not changes made by this task.

For any query/list execution, run both a permitted and a denied actor against the same seeded collection and record the query shape. Firestore rules are not filters, and a query that could return an unauthorized document can be denied even when a single-document `get` appears allowed. For rules that reference `resource.data`, use an existing document; a missing-document result is not evidence of a successful read authorization.

## 5. Storage static scenario matrix

Storage paths use recursive wildcards under `news`, `bills`, and `maintenance`, and under the user-specific `avatars` and `profiles` paths. In this table, `write` includes upload, overwrite, and delete because the current rule uses `allow write`. The current Storage rules distinguish only signed-in versus unauthenticated; they do not distinguish `ADMIN`, `STAFF`, `PENDING`, or `RESIGNED` for shared folders.

| ID | Object path and operation | UNAUTH | ADMIN | STAFF / WRONG_OWNER | PENDING | RESIGNED | Static expected and fixture focus | Actual |
|---|---|---|---|---|---|---|---|---|
| ST-001 | `news/rules-matrix-001.txt` — read/write | deny | allow | allow, including WRONG_OWNER | allow | allow | Any signed-in user may read or write any object below `news`. Use a tiny synthetic object. | NOT RUN |
| ST-002 | `bills/rules-matrix-001.txt` — read/write | deny | allow | allow, including WRONG_OWNER | allow | allow | Any signed-in user may read or write any object below `bills`. | NOT RUN |
| ST-003 | `maintenance/rules-matrix-001.txt` — read/write | deny | allow | allow, including WRONG_OWNER | allow | allow | Any signed-in user may read or write any object below `maintenance`. | NOT RUN |
| ST-004 | `avatars/{uid}/rules-matrix-001.txt` — read own/other | deny / deny | allow / allow | allow / allow, including WRONG_OWNER | allow / allow | allow / allow | Any signed-in user may read avatars regardless of owner. | NOT RUN |
| ST-005 | `avatars/{uid}/rules-matrix-001.txt` — write own/other | deny / deny | allow / deny | allow / deny | allow / deny | allow / deny | Write requires signed-in UID equal to the `{userId}` path segment; applies to upload, overwrite, and delete. | NOT RUN |
| ST-006 | `profiles/{uid}/rules-matrix-001.txt` — read own/other | deny / deny | allow / allow | allow / allow, including WRONG_OWNER | allow / allow | allow / allow | Any signed-in user may read profiles regardless of owner. | NOT RUN |
| ST-007 | `profiles/{uid}/rules-matrix-001.txt` — write own/other | deny / deny | allow / deny | allow / deny | allow / deny | allow / deny | Write requires signed-in UID equal to the `{userId}` path segment. | NOT RUN |
| ST-008 | `unlisted/rules-matrix-001.txt` — read/write | deny | deny | deny | deny | deny | Default recursive match is explicit deny for unknown paths. | NOT RUN |

Storage object reads and writes must be tested with a synthetic object no larger than necessary for the assertion. The broad shared-folder grants are recorded as current behavior; this task does not narrow them or modify `storage.rules`.

## 6. Prerequisites and controlled execution plan

Runtime execution is blocked until the owner supplies an isolated boundary. The acceptable boundary is either local Auth/Firestore/Storage emulators or a separately approved Firebase test project and bucket whose identifiers have been verified not to be production. No production project, shared bucket, live users, or production credentials may be used as a substitute.

| Gate | Required condition | Current status |
|---|---|---|
| Boundary identity | Test project ID, Firestore database ID, and Storage bucket recorded without secrets; production identity explicitly ruled out | **BLOCKED** — not supplied |
| Rules source | Exact rules revision/hash captured; no unreviewed rules edit during run | **READY as static source; runtime NOT RUN** |
| Emulator/test tooling | Auth, Firestore, and Storage emulator support; local-only configuration or owner-approved test project | **BLOCKED** — no repository emulator config is present |
| Synthetic Auth | Accounts for `ADMIN_TEST`, `STAFF_A`, `STAFF_B`, `PENDING_TEST`, and `RESIGNED_TEST`; no personal accounts | **BLOCKED** — not provisioned |
| Role seed | Synthetic `users/{uid}` role documents seeded before authorization checks | **BLOCKED** — no test database available |
| Fixtures | Existing owner/status/payload fixtures from Section 2, including invalid variants | **BLOCKED** — not seeded |
| Evidence sink | Redacted run output with UTC timestamps, commit/rules reference, and reviewer | **NOT RUN** |
| Cleanup control | Ability to delete test Auth users, Firestore documents, and Storage objects and verify zero test residue | **BLOCKED** — no test boundary |

When a boundary is available, the executor should load the unchanged rules into the emulator or isolated test environment, seed only synthetic profiles and fixtures, execute each row with separate Auth sessions, and capture the evidence schema in Section 3. Each deny assertion must use the exact operation and path listed; each allow assertion must also verify the expected record/object operation rather than treating a client-side success message as evidence. Admin SDK setup or teardown must target only the emulator/test project.

No test should be run against a project identifier found in the application configuration until its isolation has been independently verified. The current audit states that the existing Firebase configuration references a project named `Thailottery`; that project is not an acceptable test destination for this matrix without an explicitly approved, independently isolated replacement boundary.

## 7. Cleanup and reconciliation

Cleanup is part of the evidence, not an optional final step. After execution, delete all synthetic Auth users, every Firestore fixture under the test namespace, and every Storage object under the matrix namespace. Then re-list the namespace and compare counts against the pre-run manifest. For an emulator, stop all emulator processes and remove only the run's local export; for a test project, retain only the owner-approved redacted manifest and do not delete unrelated data. Record cleanup as `PASS` only when the test namespace is empty and the manifest reconciles; otherwise record `FAIL` and stop further testing.

The cleanup record must include the run ID, namespace/prefix, resource counts before and after, deletion result, UTC timestamp, and reviewer. It must not include raw user tokens, service-account data, production document content, or private object URLs. If a test unexpectedly touches a non-test namespace, do not attempt broad deletion; stop and escalate with the path and redacted request metadata only.

## 8. Stop conditions and decision rules

The executor must stop immediately and mark the affected row or run `BLOCKED` if any of the following occurs: the project or bucket cannot be proven isolated; a production credential, token, personal account, or production path is requested; a rule compilation error prevents faithful execution; the emulator behavior differs from the declared rules engine without an approved explanation; a fixture resolves outside the test namespace; an unexpected allow or deny is observed; cleanup cannot be proven; or completing the scenario would require changing `firestore.rules`, `storage.rules`, application code, Workboard files, or another team's locked document.

A runtime `PASS` means only that the isolated environment produced the expected result for that scenario at the recorded rules revision. It is not a production sign-off. A runtime `FAIL` requires preserving the redacted evidence and opening a rules/application review item; it does not authorize an ad hoc rules change. A run with missing boundary, credentials, fixtures, or cleanup proof remains `NOT RUN` or `BLOCKED`, never `PASS`.

## 9. Current conclusion

This artifact is complete as the requested static matrix. Runtime Firestore/Storage authorization evidence is **NOT RUN**. The next phase is **BLOCKED** by the absence of an owner-approved isolated Firebase test boundary, synthetic Auth/test data, emulator/test-project configuration, and cleanup proof. No production promotion, rules deployment, project migration, credential rotation, or data mutation is authorized by this document.

**Reviewer:** `NOT ASSIGNED`
**Runtime run ID:** `NOT CREATED`
**Cleanup evidence:** `NOT RUN`

## References

1. `firestore.rules` — current Firestore rules and validators, especially lines 5–28, 31–109, and 112–243.
2. `storage.rules` — current Storage path grants and default deny, especially lines 4–33.
3. `docs/verification-packet/FIREBASE_SAFETY_INTEGRATION_PACKET.md` — isolated-boundary, evidence, and no-production-mutation policy.
4. `docs/verification-packet/evidence/firebase-inventory.md` — project, bucket, rules revision, and cleanup inventory fields.
5. `docs/verification-packet/evidence/verification-results.md` — existing `NOT RUN` role/CRUD evidence baseline.
6. `CURRENT_STATUS.md` and `KNOWN_ISSUES.md` — current absence of Firebase CRUD/permission runtime evidence and identified broad ownership policies.
7. `TEAM_WORKBOARD.md` — `NP-RULES-02` owner, branch, status, and single-file lock.
8. `TEAM_WORK_RULES.md` — one-task/one-owner/one-branch, lock, evidence, and no-secret requirements.
9. `NIPPONFARM_CORE_WORKFLOW_UX_CONSOLIDATION.md` — permission and non-destructive verification constraints.

**Decision:** `NOT RUN / BLOCKED until isolated test boundary and synthetic fixtures are supplied.`
