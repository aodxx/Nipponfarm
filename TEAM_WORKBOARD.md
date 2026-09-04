# Nipponfarm Team Workboard

เอกสารนี้เป็นกระดานงานกลางสำหรับ lock scope ป้องกันงานทับกัน และระบุว่าใครกำลังทำอะไรใน **Nipponfarm Core Workflow & UX Consolidation**

**Rule:** งานที่ไม่มี Task ID + Owner + Branch + Status ห้ามเริ่ม

## Active board

| Task ID | Task | Owner | Branch | Status | Locked Area / Files | Blocked By | Evidence / Exit condition |
|---|---|---|---|---|---|---|---|
| `NP-COORD-01` | Coordination / Verification Packet | `NIPON-LEAD-01` | `main` / coordination | `IN_PROGRESS` | `AGENT_REGISTRY.md`, `TEAM_WORKBOARD.md`, coordination docs | — | status documents remain synchronized |
| `NP-DOC-01` | Maintain project status docs | `NIPON-DOC-01` | `docs/<task-name>` | `IN_PROGRESS` | `CURRENT_STATUS.md`, `KNOWN_ISSUES.md`, `NEXT_ACTIONS.md`, `TEST_REPORT.md` | `NP-COORD-01` for sequencing | update only from verified evidence |
| `NP-FB-01` | Firebase Safety & Integration Verification | `NIPON-FB-01` | `verify/firebase-test-environment` | `BLOCKED` | Firebase inventory, emulator/test project, Firestore/Storage verification | isolated Firebase test environment + owner approval | emulator/test evidence; no unauthorized production mutation |
| `NP-AI-01` | Gemini Integration Verification | `NIPON-AI-01` | `verify/gemini-integration` | `BLOCKED` | Gemini readiness, safe error contract, Preview success path | test-only Gemini credential + Preview environment | authenticated AI success/error evidence |
| `NP-PAY-01` | Payroll rejected-resubmit correctness | `NIPON-DEV-01` | completed via PR #8 / `fba7c2d` | `REVIEW` | `src/services/employeeService.ts`, `src/lib/payrollUtils.ts`, payroll tests | `NP-FB-01` for emulator validation | Submit → Reject → Resubmit passes emulator/test account while rejected history remains immutable |
| `NP-PAY-02` | Payroll Audit Trail verification/coverage | `NIPON-TEST-01` | `test/payroll-audit-verification` | `BLOCKED` | `payroll_audit_events`, payroll authorization flows | `NP-FB-01` | owner/admin/wrong-owner + audit immutability verified in emulator/test environment |
| `NP-WF-02` | Receipt → Expense core workflow | — | — | `READY` | `ScanReceipt`, `billService`, bill persistence/expense mapping | `NP-PAY-01`, integration gate | do not start until Payroll workflow verification closes or Lead explicitly reorders |
| `NP-UX-01` | Dashboard / Navigation consolidation | — | — | `BLOCKED` | `Dashboard.tsx`, `Layout`, navigation, dashboard components | Core workflow + integration baseline | no large UX refactor yet |
| `NP-PERF-01` | Route lazy loading / bundle reduction | — | — | `BLOCKED` | `App.tsx`, route imports, build chunks | integration verification | baseline + before/after bundle evidence |

## File/area lock rules

- `IN_PROGRESS` หรือ `REVIEW` = scope/area ยังถือ lock จนกว่า Lead จะปลดหรือเปลี่ยนเป็น `DONE`/`PAUSED`
- `BLOCKED` ไม่ควรมี code mutation ต่อ ยกเว้นงานเตรียม test/docs ที่ไม่ชน owner อื่น
- `READY` หมายถึงยังไม่มี owner; ห้ามเริ่มจนลง Owner + Branch และเปลี่ยนเป็น `IN_PROGRESS`
- หาก task ใหม่ต้องแตะ Locked Area เดียวกัน ให้เพิ่ม task ใหม่เป็น `BLOCKED` พร้อม `Blocked By`

## Current merge order

1. ปิด verification ของ `NP-PAY-01`
2. เปิด Firebase test/emulator path (`NP-FB-01`)
3. ยืนยัน Payroll audit/permissions (`NP-PAY-02`)
4. ยืนยัน Gemini integration (`NP-AI-01`)
5. จากนั้นเริ่ม `NP-WF-02` Receipt → Expense
6. UX/Performance งานใหญ่เริ่มหลัง core workflows และ integration baseline ผ่าน

## Registration template

เมื่อเพิ่มงานใหม่ ให้ใช้หนึ่งแถวตามรูปแบบ:

```text
Task ID: NP-<DOMAIN>-NN
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

## Change discipline

ทุกครั้งที่มีการเริ่ม, block, handoff, review หรือ merge task ต้องแก้ Workboard ใน commit/PR เดียวกันหรือ coordination commit ถัดไปทันที เพื่อให้ Agent ใหม่อ่านแล้วเห็น lock ปัจจุบันก่อนเริ่มงาน
