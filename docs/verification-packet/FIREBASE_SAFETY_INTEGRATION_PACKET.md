# Firebase Safety & Integration Verification Packet

**Project:** Nipponfarm
**Repository:** `aodxx/Nipponfarm`
**Source baseline:** `fba7c2d8a2aed3217e71c5b18e11c24a1adbfced`
**Packet date:** 4 September 2026
**Target:** isolated Firebase test project and isolated Vercel Preview environment
**Production protection:** no production writes, rule deployment, credential rotation/revocation, migration, or deletion is authorized by this packet.

## 1. Purpose and exit decision

This packet provides a controlled way to verify Firebase safety, API authorization, Gemini readiness, and integration boundaries before any production change. It is an evidence package, not an authorization to create a Firebase project, export production data, set secrets, deploy rules, or send real email.

The verification result may be **PASS**, **PARTIAL**, **FAIL**, **BLOCKED**, or **NOT RUN**. A production-ready decision is prohibited unless all P0 items pass, test evidence is timestamped, cleanup is proven, and the owner approves the next production action separately.

## 2. Non-negotiable safety gates

| Gate | Rule | Stop condition |
|---|---|---|
| Environment isolation | Preview must point to a dedicated Firebase project, dedicated database, dedicated Storage bucket and test-only external credentials | Any Preview variable points to the production project or production credential |
| Data protection | Use synthetic records named `NIPONFARM_TEST_<run-id>`; never use a production record for mutation tests | A test requires reading, updating or deleting an unlabelled production record |
| Secret handling | Store values only in Firebase/Vercel secret stores; record names and environment only | A secret appears in Git, Markdown, screenshot, terminal output or browser bundle |
| Rules | Test existing rules in the isolated project before considering any rule change | A rule change is proposed without emulator/test-project evidence and rollback |
| External effects | Email, R2, ImageKit, Cron and Gemini use isolated credentials/destinations or remain NOT RUN | A test sends to a real recipient, creates a production object, or consumes production quota |
| Cleanup | Every created test document/object/account has an owner, ID, deletion result and timestamp | Cleanup cannot be proven or a test record cannot be identified |
| Incident handling | Stop immediately on unexpected 5xx, cross-user data visibility, unauthorized write, secret exposure or wrong project ID | Do not retry destructively; preserve redacted evidence and escalate to owner |

## 3. Required owner inputs (values must not be pasted into this packet)

The owner must provide these through the appropriate consoles, not through chat or Git:

| Input | Required value recorded in evidence |
|---|---|
| Firebase test project | Project ID, display name, region, database ID; no credential values |
| Firebase test Web App | App ID and enabled Auth providers; no API key value |
| Test users | UIDs, role labels and creation timestamp; no passwords or tokens |
| Vercel Preview | Preview URL, deployment ID, commit SHA and environment name |
| Server variables | Variable names and configured/not-configured status only |
| Gemini | Isolated key configured status, model names, quota/test account; never key value |
| SMTP | Test sender/destination domain and configured status; never password |
| R2/ImageKit | Isolated bucket/endpoint and credential scope; never secret |
| Backup/export | Artifact location, checksum, document/object counts and timestamp; never upload secret-containing artifacts here |

## 4. Phase A — isolate and inventory

1. Create or select a Firebase test project owned by the project owner. Do not copy production data into it unless a separate approved anonymization/migration plan exists.
2. Enable only the Auth provider, Firestore database, Storage and APIs required by the test. Record project ID, database ID, region, rules revision and indexes revision in `evidence/firebase-inventory.md`.
3. Configure the Vercel Preview environment with the test Firebase `VITE_FIREBASE_*` identifiers only. Keep production variables unchanged.
4. Create synthetic users labelled `ADMIN_TEST`, `STAFF_TEST`, `PENDING_TEST` and `RESIGNED_TEST`. Use a test-only email domain and record only UID, role and status.
5. Confirm the Preview bundle does not contain server-only values. A public Firebase web identifier is expected; Gemini, SMTP, R2, ImageKit and cron values must not appear.
6. Record a baseline count of test-project documents by collection and Storage objects. The expected production collections in this codebase include `users`, `sows`, `events`, `tasks`, `pig_sales`, `maintenance_requests`, `bills`, `bill_items`, `employee_salaries`, `salary_advances`, `employee_transactions`, `EmployeeTransaction`, `payroll_slips` and `payroll_audit_events`.

## 5. Phase B — backup and reconciliation safety rehearsal

This phase must be performed against the isolated test project first. A production export requires a separately approved owner operation.

Record the following without storing secrets or personal data in Git:

| Item | Evidence |
|---|---|
| Project/database identity | Project ID, database ID, region |
| Rules and indexes | Revision/commit/hash and export timestamp |
| Firestore | Collection/subcollection counts and export artifact checksum |
| Storage | Object count, total bytes, prefixes and manifest checksum |
| Auth | Test-user count/provider summary; production user export is owner-only and NOT part of this run |
| Reconciliation | Before/after counts, mismatches, reviewer and timestamp |
| Restore rehearsal | Test-project restore result and cleanup result |

No production data is copied, transformed, deleted or reconciled by this packet. If production backup is required, stop after preparing the inventory form and obtain owner approval for a separate backup run.

## 6. Phase C — API and authorization matrix

Run the existing non-destructive HTTP smoke checks against Preview first. Expected unauthenticated behavior is:

| Request | Expected |
|---|---:|
| `GET /` | 200 |
| `GET /api/health` | 200; `status=ok`; readiness recorded |
| `GET /api/weather` without coordinates | 400 |
| `GET /api/cron/daily-tasks` without secret | 401 |
| AI routes without Firebase token | 401 |
| Email routes without Firebase token | 401 |
| R2 presign/upload routes without Firebase token | 401 |

With synthetic test users and test data, verify:

| Actor | Must pass | Must be denied |
|---|---|---|
| ADMIN_TEST | Admin payroll read/update, approval, audit create; authorized integration route | Wrong-project token, malformed body, invalid ownership |
| STAFF_TEST | Own advance create/read and permitted active-user flow | Admin route, another user's payroll, mismatched `userId`, audit write |
| PENDING_TEST | Login boundary may be observed | Active-user data read/write and all protected integrations |
| RESIGNED_TEST | Login boundary may be observed | All active-user data write and protected integrations |
| Unauthenticated | Public health and validation checks only | Firebase, payroll, AI, email, R2 and upload protected operations |

Record status code, response `code/error` only, test user label, test record ID, timestamp and cleanup result. Never record bearer tokens, raw AI prompts, images, bank details or email bodies.

## 7. Phase D — Firebase CRUD and rules verification

Use only synthetic records. For each selected collection, execute create → read → update one harmless field → read → delete → verify missing. Start with one non-financial workflow such as a test sow or maintenance record. Payroll tests require an explicit test-project approval because they exercise financial-shaped data.

At minimum verify owner/admin/wrong-owner behavior for `sows`, `events`, `tasks`, `bills`, `bill_items`, `maintenance_requests`, `salary_advances`, `employee_salaries`, `payroll_slips` and `payroll_audit_events`. Do not deploy altered rules from this packet. If current rules permit a cross-owner action unexpectedly, mark **FAIL**, preserve redacted evidence and stop.

## 8. Phase E — integration checks

| Integration | Safe test | Pass evidence |
|---|---|---|
| Gemini | Test-only key/model and synthetic receipt/swine input; no sensitive image | Health readiness plus one success and one safe failure response |
| SMTP | Test mailbox/domain only, one message maximum | Message ID/status and redacted delivery result |
| R2 | Dedicated test bucket, synthetic small object, expiry check, delete object | Upload/download/expiry/delete evidence |
| ImageKit | Test namespace and synthetic image only | Upload/read/delete result |
| Cron | Preview/manual invocation with test secret and no real email side effect | Auth result, idempotency result and log timestamp |
| Live AI | Do not call production; record current Vercel limitation | Transport decision and isolated proof-of-concept only |

If a credential or destination is not isolated, mark the integration **NOT RUN** rather than substituting simulation success for production evidence.

## 9. Evidence and sign-off

Every evidence row must contain: `evidence_id`, environment, commit SHA, URL/project ID, actor label, operation, expected result, actual status, timestamp in UTC, redacted artifact reference, cleanup result and reviewer. Use the templates in this directory.

The packet is complete only when the inventory, test matrix, CRUD results, integration results, cleanup proof and unresolved issue list are present. A PASS here means the isolated test boundary passed; it does not authorize production promotion.

## 10. Current baseline before owner inputs

| Area | Status | Reason |
|---|---|---|
| Isolated Firebase project | BLOCKED | No test project ID supplied/created in this run |
| Backup inventory | BLOCKED | Production export requires owner operation and approval |
| Preview environment | NOT RUN | No isolated Preview URL/evidence available |
| HTTP unauthenticated matrix | PASS on production smoke only | No-token routes returned expected 200/400/401; no mutation attempted |
| Firebase CRUD | NOT RUN | No test account/data and no production writes permitted |
| Gemini readiness | BLOCKED on production | `/api/health` reports `AI_NOT_CONFIGURED` |
| External integrations | NOT RUN | Isolated credentials/destinations not available |
| Cleanup proof | NOT RUN | No test records were created |

**Decision:** Do not promote, migrate, change rules, rotate/revoke credentials, or enable production integrations based on this packet alone.
