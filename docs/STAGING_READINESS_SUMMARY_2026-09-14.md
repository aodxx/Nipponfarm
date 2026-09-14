# Nipponfarm — Production Readiness และ Staging Decision

**วันที่ตรวจสอบ:** 14 กันยายน 2026  
**Repository:** `aodxx/Nipponfarm`  
**Commit ที่ตรวจสอบ:** `f6fb9cf` (`test: verify core workflow acceptance contracts`)  
**Branch:** `test/core-workflow-acceptance`  
**ขอบเขต:** repository-side readiness และเกณฑ์สำหรับ controlled staging deployment โดยไม่เขียนหรือเปลี่ยนข้อมูล production

## Executive decision

Nipponfarm **พร้อมสำหรับ controlled staging deployment** บน isolated environment หรือ Preview project ที่ใช้ test account และ test data แยกจาก production อย่างชัดเจน แต่ **ยังไม่พร้อมประกาศ Production Ready หรือ promote ขึ้น production แบบ unrestricted**.

เหตุผลหลักคือ quality gates ฝั่ง repository ผ่านแล้ว แต่หลักฐานจาก production integrations, Firebase production rules, runtime logs, real CRUD/permission tests, PWA device acceptance และ Live AI transport ยังไม่ครบ การมี Vercel build สำเร็จหรือหน้าเว็บเปิดได้ไม่ถือเป็นหลักฐานว่า integration ทั้งระบบพร้อมใช้งานจริง

## Current readiness matrix

| Domain | Current status | Evidence | Staging decision |
|---|---|---|---|
| Source control | PASS | Clean feature branch at `f6fb9cf`; changes are committed | Allowed after review/merge or deploy branch explicitly |
| TypeScript | PASS | `npm run lint` passed | Gate passed |
| Automated regression | PASS | `npm run test:auth`: 69 passed, 0 failed | Gate passed |
| Production build | PASS with warnings | `npm run build` exit 0; Vite/PWA artifacts generated | Allowed; track bundle warnings |
| Authentication | PASS baseline | Existing production login and protected-route 401 evidence | Re-test in staging with test account |
| Firestore read path | PASS baseline / read-only evidence | Existing user-confirmed data visibility | Staging CRUD still required |
| Firestore CRUD | NOT VERIFIED | No complete isolated browser/Emulator acceptance for all core flows in current run | Must test in staging before promotion |
| Storage | REPOSITORY PASS / PRODUCTION NOT VERIFIED | Rules and some Emulator evidence exist | Use isolated bucket/project or test objects only |
| Sow Lifecycle | REPOSITORY ACCEPTANCE PASS | Lifecycle, parity, task linking test data passed | Run browser/Emulator acceptance in staging |
| Pig Sale | REPOSITORY ACCEPTANCE PASS | Totals and deterministic retry identity passed | Run create/read/retry/void acceptance in staging |
| Maintenance | REPOSITORY ACCEPTANCE PASS | Transition guard, owner/admin boundary, resolvedAt and cleanup scope passed | Run owner/admin acceptance in staging |
| Payroll | CODE/EMULATOR EVIDENCE PASS, PRODUCTION NOT VERIFIED | Permission, audit, idempotency regression evidence exists | Do not use real payroll data; test account only |
| Gemini AI | BLOCKED / NOT READY | Production baseline `aiReady:false`, `AI_NOT_CONFIGURED` | Keep disabled unless isolated server credential is configured |
| SMTP | NOT VERIFIED | No delivery evidence | Keep disabled or use sink/test mailbox |
| R2/ImageKit | NOT VERIFIED | Credentials and E2E not confirmed | Use least-privilege staging credentials only |
| Cron | NOT VERIFIED | Unauthorized path evidence exists; successful run not verified | Do not enable production-like side effects yet |
| Live AI | BLOCKED | Standalone WebSocket is not exported by current Vercel HTTP handler | Exclude from staging gate or use separate supported runtime |
| PWA/offline | NOT VERIFIED | No device acceptance evidence | Required before production promotion, optional for initial staging |
| Dependency security | PASS for critical baseline, review remaining | Critical vulnerabilities reported as 0 after remediation; `xlsx` and `adm-zip` remain review items | Record as accepted staging risk, do not force-upgrade |
| Multi-farm tenancy | NOT READY | Several collections still use broad active-user boundaries; no `farmId` boundary | Staging must remain single-farm/test scope |

## What is safe to deploy to staging

The staging candidate can be used to validate frontend boot, protected routes, repository-supported core workflow contracts, isolated Firebase CRUD, role boundaries, error states and UI persistence. Staging must use a separate Firebase project/database or a clearly isolated test namespace, separate test accounts, and credentials with minimum required permissions.

The staging deployment must not be used to validate against live financial records, live sow/sale/maintenance records, production Storage objects, or production email recipients. If an external integration is not configured, the feature must be marked disabled or blocked; simulation/fallback behavior must not be reported as production delivery evidence.

## Mandatory staging preflight

1. Confirm the deployment commit and branch that will be deployed. The current evidence is on `test/core-workflow-acceptance`; it is not yet evidence that `main` or production contains this commit.
2. Create or select isolated staging Firebase resources and test accounts. Do not point staging at the shared production project unless a documented namespace and cleanup proof exist.
3. Configure only staging environment variables. Do not copy production secrets into Preview without confirming isolation and minimum scope.
4. Record the previous known-good deployment and rollback path before deploying.
5. Run homepage and `/api/health` smoke checks after deployment.
6. Verify protected routes without a token return the expected 401 response and do not produce unexplained 5xx errors.
7. Inspect Vercel build and runtime logs for the smoke window. Logs must not contain tokens, passwords, account numbers, image payloads, email addresses or AI prompts.

## Staging acceptance gates

### Core workflow gates

For each of Sow Lifecycle, Pig Sale and Maintenance, use a clearly labeled test record and record timestamp, account, environment, record ID and result.

- Open the protected entry point.
- Complete the happy path.
- Reload and relogin, then verify persistence.
- Exercise at least one invalid input or failure path.
- Verify owner/staff/admin behavior and wrong-owner denial where applicable.
- Confirm retry does not create duplicates.
- Delete or clean up only the explicitly labeled test record and verify cleanup.
- Confirm no production record or Storage object was changed.

### Integration gates

The following are not required to start a code-only staging deployment, but must remain explicitly `NOT VERIFIED` until tested with isolated credentials:

- Gemini Receipt, Swine AI and TTS success paths.
- SMTP delivery to a test mailbox or sink.
- R2/ImageKit upload/download and expiry behavior.
- Cron successful invocation and idempotency.
- Production Firebase rules deployment and rollback.
- PWA install, offline shell, update and recovery on a real device.

## Production promotion decision

**Current decision: HOLD production promotion.**

Production promotion can be reconsidered only after the following blockers are closed with evidence:

1. Firebase inventory, backup/export and record-count reconciliation are complete.
2. Rules are deployed through a controlled process with rollback evidence, or the deployment scope is proven not to affect shared production data.
3. At least one isolated test account completes CRUD and permission acceptance for each core workflow.
4. Runtime logs are inspected after deployment with no unexplained errors or sensitive data leakage.
5. Required external integrations have explicit decisions: tested and enabled, or disabled with user-facing behavior and operational ownership documented.
6. The Live AI transport decision is documented; the current Vercel HTTP handler must not be represented as WebSocket-ready.
7. PWA/device acceptance is complete if offline/install behavior is part of the production promise.
8. Remaining dependency risks (`xlsx`, `adm-zip`) have a documented mitigation or replacement plan.

## Known non-blocking warnings for staging

The production build passes but still reports a large main chunk (approximately 2.03 MB before gzip in the latest build output) and existing vendor/Lottie chunk warnings. These are performance follow-up items, not a reason to block an isolated staging deployment, unless the staging objective is specifically Core Web Vitals or low-bandwidth mobile performance.

## Final status

| Decision | Status |
|---|---:|
| Repository quality gate | **PASS** |
| Core workflow repository acceptance | **PASS** |
| Controlled staging deployment | **READY WITH CONDITIONS** |
| Production deployment | **HOLD** |
| Production-ready declaration | **NOT APPROVED** |

> Staging is an environment for collecting the missing runtime evidence. It is not evidence by itself that Nipponfarm is production-ready.
