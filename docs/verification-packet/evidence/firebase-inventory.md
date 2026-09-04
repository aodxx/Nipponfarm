# Firebase Test Environment Inventory

**Evidence ID:** `INV-YYYYMMDD-RUNID`
**Environment:** `firebase-test` / `vercel-preview`
**Owner:**
**Reviewer:**
**Created UTC:**
**Commit SHA:**

## Project identity

| Field | Value | Verified by | UTC |
|---|---|---|---|
| Firebase project ID |  |  |  |
| Display name |  |  |  |
| Firestore database ID |  |  |  |
| Region |  |  |  |
| Storage bucket name |  |  |  |
| Auth providers enabled |  |  |  |
| Preview URL |  |  |  |
| Vercel deployment ID |  |  |  |

Do not enter API keys, service-account JSON, passwords, Firebase ID tokens, Gemini keys, SMTP passwords, R2 secrets or private URLs containing credentials.

## Configuration checklist

| Check | Result | Evidence reference |
|---|---|---|
| Preview `VITE_FIREBASE_PROJECT_ID` is test project | NOT RUN |  |
| Production project ID is not used by Preview | NOT RUN |  |
| Auth test users are synthetic | NOT RUN |  |
| Rules revision recorded | NOT RUN |  |
| Indexes revision recorded | NOT RUN |  |
| Server-only variable names recorded without values | NOT RUN |  |
| Browser bundle has no server secret | NOT RUN |  |
| Test Storage bucket is isolated | NOT RUN |  |
| Test external destinations are isolated | NOT RUN |  |

## Baseline counts

| Resource | Count/size | As-of UTC | Manifest/checksum reference |
|---|---:|---|---|
| Auth test users |  |  |  |
| Firestore `users` |  |  |  |
| Firestore `sows` |  |  |  |
| Firestore `events` |  |  |  |
| Firestore `tasks` |  |  |  |
| Firestore `maintenance_requests` |  |  |  |
| Firestore payroll collections |  |  |  |
| Firestore other collections |  |  |  |
| Storage objects |  |  |  |
| Storage total bytes |  |  |  |

## Backup/reconciliation record

| Artifact | Location outside Git | Checksum | Created UTC | Restore rehearsal | Cleanup |
|---|---|---|---|---|---|
| Rules export |  |  |  |  |  |
| Index export |  |  |  |  |  |
| Firestore test export |  |  |  |  |  |
| Storage test manifest |  |  |  |  |  |
| Auth test-user manifest |  |  |  |  |  |

**Decision:** `NOT RUN`
**Reviewer notes:**
