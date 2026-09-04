# Niponfarm Team Workboard

กระดานงานกลางสำหรับ lock scope ป้องกันงานทับกัน และจัดลำดับงานตาม dependency ของ **Niponfarm Core Workflow & Integration Reliability**

**Last updated:** 4 September 2026
**Baseline:** `main` at `e6eaf21`
**Arbitration owner:** `NIPON-LEAD-01`
**Rule:** งานที่ไม่มี Task ID, Team, Owner, Reviewer, Branch, Status, Locked Area, Blocked By และ Definition of Done ห้ามเริ่ม

## Team split

| Team | Mission | Primary roles | Current boundary |
|---|---|---|---|
| Team A — Integration & Safety | Firebase, Auth, Storage, rules, AI, external integrations และ verification evidence | `NIPON-FB-01`, `NIPON-AI-01`, `NIPON-SEC-01`, `NIPON-RULES-01`, `NIPON-INT-01` | ห้ามแก้ production data/rules/credentials; งานที่ต้องใช้ test project ให้คง `BLOCKED` |
| Team B — Core Workflow & Quality | Payroll, core workflow, acceptance matrix, regression และ test evidence | `NIPON-DEV-01`, `NIPON-TEST-01`, `NIPON-QA-01`, `NIPON-UX-01` | ห้ามเริ่ม UX/performance หรือ workflow implementation ที่ข้าม dependency |

## Active board

| Task ID | Team | Task | Owner | Reviewer | Branch | Status | Locked Area / Files | Blocked By | Definition of Done |
|---|---|---|---|---|---|---|---|---|---|
| `NP-COORD-01` | Lead | Coordination / Workboard arbitration | `NIPON-LEAD-01` | `NIPON-RELEASE-01` | `main` / coordination | `IN_PROGRESS` | `AGENT_REGISTRY.md`, `TEAM_WORKBOARD.md`, coordination docs | — | ทุก task มี owner/branch/lock/evidence; collision ถูกตัดสินก่อนเริ่ม |
| `NP-DOC-01` | Lead | Maintain project status docs | `NIPON-DOC-01` | `NIPON-LEAD-01` | `docs/<task-name>` | `IN_PROGRESS` | `CURRENT_STATUS.md`, `KNOWN_ISSUES.md`, `NEXT_ACTIONS.md`, `TEST_REPORT.md` | `NP-COORD-01` for sequencing | อัปเดตจาก verified evidence เท่านั้น; ระบุสิ่งที่ยังไม่พิสูจน์ |
| `NP-RULES-02` | A | Static Firebase rules scenario matrix | `NIPON-SEC-01` | `NIPON-FB-01` | `security/rules-scenario-matrix-2026-09-04` | `REVIEW` | `docs/verification-packet/evidence/rules-scenario-matrix.md` เท่านั้น | — | มี matrix สำหรับ unauthenticated, ADMIN, STAFF, PENDING, RESIGNED, wrong-owner; ไม่แก้ `firestore.rules` หรือ `storage.rules`; มี evidence schema; commit `4d028b8`, PR #11 |
| `NP-FB-01` | A | Firebase Safety & Integration Verification | `NIPON-FB-01` | `NIPON-SEC-01` | `verify/firebase-test-environment` | `BLOCKED` | Firebase inventory, emulator/test project, Firestore/Storage verification | isolated Firebase test environment + owner approval | test project identity, rules/index inventory, CRUD/permission/cleanup evidence; ห้าม production mutation |
| `NP-AI-01` | A | Gemini Integration Verification | `NIPON-AI-01` | `NIPON-SEC-01` | `verify/gemini-integration` | `BLOCKED` | Gemini readiness, safe error contract, Preview success path | test-only Gemini credential + Preview environment | authenticated AI success/error evidence และไม่เปิดเผย provider detail |
| `NP-INT-01` | A | External integration safety inventory | `NIPON-INT-01` | `NIPON-LEAD-01` | `verify/integrations-inventory-2026-09-04` | `BLOCKED` | test-only credential/destination inventory ใน `docs/verification-packet/` | isolated destinations + owner approval | inventory ระบุชื่อ variable/environment/destination class โดยไม่เก็บค่า secret; เปิดเมื่อ `NP-FB-01` boundary พร้อม |
| `NP-PAY-01` | B | Payroll rejected-resubmit correctness | `NIPON-DEV-01` | `NIPON-TEST-01` | completed via PR #8 / `fba7c2d` | `REVIEW` | `src/services/employeeService.ts`, `src/lib/payrollUtils.ts`, payroll tests | `NP-FB-01` for emulator validation | Submit → Reject → Resubmit ผ่าน emulator/test account และ rejected history immutable |
| `NP-PAY-02` | B | Payroll Audit Trail verification/coverage | `NIPON-TEST-01` | `NIPON-QA-01` | `test/payroll-audit-verification` | `BLOCKED` | `payroll_audit_events`, payroll authorization flows | `NP-FB-01` | owner/admin/wrong-owner และ audit immutability verified in emulator/test environment |
| `NP-WF-03` | B | Five core workflow verification matrix | `NIPON-QA-01` | `NIPON-LEAD-01` | `test/core-workflow-matrix-2026-09-04` | `REVIEW` | `docs/verification-packet/evidence/core-workflow-matrix.md` เท่านั้น | — | ระบุ entry point, collections/services, roles, happy/error path, permission, reload/relogin, mobile usability และ blocker ของ Sow, Receipt, Pig Sale, Payroll, Maintenance; commit `72a1a20`, PR #12 |
| `NP-WF-02` | B | Receipt → Expense core workflow implementation | `—` | `NIPON-QA-01` | `—` | `READY` | `ScanReceipt`, `billService`, bill persistence/expense mapping | `NP-PAY-01`, `NP-WF-03`, integration gate | ห้ามเริ่มจน Lead แต่งตั้ง owner/branch และ verification matrix ระบุ blocker/acceptance criteria |
| `NP-UX-01` | B | Dashboard / Navigation consolidation | `—` | `NIPON-UX-01` | `—` | `BLOCKED` | `Dashboard.tsx`, `Layout`, navigation, dashboard components | core workflow + integration baseline | ห้ามเริ่ม major UX refactor จน P0/P1 core/integration ผ่าน |
| `NP-PERF-01` | B | Route lazy loading / bundle reduction | `—` | `NIPON-DEVOPS-01` | `—` | `BLOCKED` | `App.tsx`, route imports, build chunks | integration verification | baseline + before/after bundle evidence; ห้ามเริ่มก่อน dependency พร้อม |

## Dependency order

```text
NP-WF-03 ───────────────┐
                        ├─> NP-WF-02 (Receipt → Expense implementation)
NP-PAY-01 ─> NP-PAY-02 ─┤
                        │
NP-RULES-02 ─> NP-FB-01 ─> NP-AI-01 / NP-INT-01
                        │
                        └─> NP-UX-01 / NP-PERF-01 (ภายหลัง)
```

ลำดับปัจจุบันคือ: (1) Team A ทำ `NP-RULES-02` ซึ่งเป็น static evidence ไม่แตะ rules, (2) Team B ทำ `NP-WF-03` verification matrix, (3) รอ isolated Firebase project เพื่อปลด `NP-FB-01`, (4) ตรวจ Payroll audit, Gemini และ external integrations, และ (5) จึงค่อยพิจารณา Receipt implementation, UX และ Performance

## File/area lock rules

`IN_PROGRESS` หรือ `REVIEW` ถือว่า scope/area ถูก lock จนกว่า Lead จะปลดหรือเปลี่ยนเป็น `DONE`/`PAUSED`. ทีมอื่นห้ามแก้ไฟล์หรือ flow ที่ระบุไว้ในแถวนั้น

`BLOCKED` ห้ามทำ implementation ต่อ ยกเว้น preparation ที่ไม่ชน locked area และไม่เปลี่ยน behavior. `READY` หมายถึงยังไม่มี owner; ห้ามเริ่มจนแต่งตั้ง owner, reviewer และ branch

หากงานใหม่ต้องแตะ locked area เดียวกัน ให้สร้าง Task ID ใหม่เป็น `BLOCKED`, ระบุ `Blocked By` และหยุดการแก้ไฟล์จน Lead ตัดสิน scope split หรือ handoff

## Review and evidence gate

ก่อนเปลี่ยนเป็น `REVIEW` ต้องมี commit/PR, tests ที่เกี่ยวข้อง, `npm run lint`, `npm run build`, evidence reference, สิ่งที่ยังไม่ได้พิสูจน์ และ cleanup result หากมี test data. ห้ามใช้ `DONE` หากยังขาด emulator, production verification หรือ acceptance test ที่ Definition of Done ระบุไว้

## Registration template

```text
Task ID: NP-<DOMAIN>-NN
Team: A | B | Lead
Task:
Owner:
Reviewer:
Branch:
Status: READY | IN_PROGRESS | REVIEW | DONE | BLOCKED | PAUSED | CANCELLED
Locked Area / Files:
Blocked By:
Definition of Done:
Evidence:
```

## Arbitration and collision handling

`NIPON-LEAD-01` เป็นผู้ตัดสินเมื่อสองทีมเลือก task เดียวกัน, locked area ซ้อนกัน, dependency ไม่ชัด หรือจำเป็นต้องเปลี่ยนลำดับงาน หากพบ collision ให้หยุดทั้งสองฝ่าย, ระบุ `BLOCKED_BY` ใน handoff/Workboard และห้ามแก้ไฟล์ทับกันหรือ force-push เข้า `main`

## Change log

| Date (UTC) | Agent | Change | Evidence |
|---|---|---|---|
| 2026-09-04 | `NIPON-LEAD-01` | เพิ่ม team split, task ownership, locks, dependency order และสอง task ที่เริ่มได้โดยไม่ข้าม dependency | `TEAM_WORKBOARD.md` |
