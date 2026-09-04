# Niponfarm Agent Registry

ทะเบียนกลางสำหรับระบุว่า Agent แต่ละตัวรับผิดชอบเรื่องใด ทำงานอยู่บน branch ใด และมีหลักฐานล่าสุดอยู่ที่ไหน

**Project:** Niponfarm
**Repository:** `aodxx/Nipponfarm`
**Production:** `https://nipponfarm.vercel.app`
**Registry owner:** `NIPON-LEAD-01`
**Last updated:** 4 September 2026
**Registry status:** Active

## วิธีใช้งาน

ก่อนเริ่มงาน Agent ต้องอ่านตามลำดับ:

1. `TEAM_WORK_RULES.md`
2. `TEAM_WORKBOARD.md`
3. `TEAM_HANDOFF.md`
4. `CURRENT_STATUS.md`
5. `KNOWN_ISSUES.md`
6. `NEXT_ACTIONS.md`

จากนั้นต้องลงทะเบียน **Task ID + Team + Owner + Reviewer + Branch + Status + Locked Area + Blocked By + Definition of Done** ใน `TEAM_WORKBOARD.md` ก่อนเริ่ม implementation ห้ามเลือกงานเองจาก repository และห้ามใช้ชื่อ, task, branch หรือ scope ที่มีผู้รับผิดชอบ/lock อยู่แล้ว

เมื่อเริ่มงาน ให้เปลี่ยนสถานะเป็น `IN_PROGRESS` ใน Workboard และระบุ branch กับ task ที่ชัดเจน เมื่อจบ milestone ให้บันทึก commit/PR/evidence แล้วเปลี่ยนเป็น `REVIEW`, `DONE`, `BLOCKED` หรือ `PAUSED` ตามสถานการณ์จริง

ห้ามบันทึก API key, password, bearer token, Firebase ID token, service-account JSON, private key หรือข้อมูลส่วนบุคคลจริงในไฟล์นี้

## สถานะที่ใช้ได้

Registry ใช้สถานะบทบาทระดับ Agent:

| Status | ความหมาย |
|---|---|
| `Planned` | วางบทบาทไว้แล้ว แต่ยังไม่ได้เริ่มงาน |
| `In Progress` | กำลังรับผิดชอบงานในรอบปัจจุบัน |
| `Blocked` | ติดสิทธิ์ ข้อมูล หรือ dependency ที่ต้องให้ owner ช่วย |
| `Review` | งานหลักเสร็จและรอการตรวจ |
| `Completed` | งานใน scope ผ่านเกณฑ์แล้ว |
| `Handed Off` | ส่งต่อให้ Agent หรือผู้รับผิดชอบคนอื่นแล้ว |
| `Inactive` | ไม่ได้ทำงานในรอบปัจจุบัน |

สถานะระดับ Task ให้ใช้ตาม `TEAM_WORKBOARD.md` เท่านั้น

## Agent roster

| Agent ID | Role | Responsibility | Branch / workspace | Status | Current task | Last evidence |
|---|---|---|---|---|---|---|
| `NIPON-LEAD-01` | Audit Coordinator / Team Lead | จัดลำดับงาน, คุม scope, ตรวจ handoff และประสาน owner | `main` หรือ coordination workspace | `In Progress` | `NP-COORD-01` | `TEAM_WORKBOARD.md` |
| `NIPON-AUDIT-01` | Project Audit & Recovery | ตรวจ baseline, build, runtime, API, risk และเอกสาร audit | `audit/<task-name>` | `Completed` | Audit baseline | `docs/verification-packet/` |
| `NIPON-PM-01` | Project Manager | ตรวจ PRD, roadmap, progress, phase และงานค้าง | `pm/<task-name>` | `Planned` | — | `PROJECT_STATUS.md` |
| `NIPON-ARCH-01` | System Architect | ตรวจ frontend, backend, Firebase, hosting และ data flow | `arch/<task-name>` | `Planned` | — | `SYSTEM_ARCHITECTURE.md` |
| `NIPON-DEV-01` | Developer | แก้ implementation เฉพาะ scope พร้อม tests | `fix/<task-name>` หรือ `feature/<task-name>` | `Review` | `NP-PAY-01` | PR #8 / `fba7c2d` |
| `NIPON-TEST-01` | Tester | รัน user flow, API smoke, CRUD, permissions, integration และ cleanup evidence | `test/<task-name>` | `Blocked` | `NP-PAY-02` | `TEAM_WORKBOARD.md` |
| `NIPON-FB-01` | Firebase / Backend | ตรวจ Firebase project, Auth, Firestore, Storage และ isolated test boundary | `verify/firebase-test-environment` | `Blocked` | `NP-FB-01`; reviewer `NP-RULES-02` | `docs/verification-packet/` |
| `NIPON-AI-01` | AI Integration | ตรวจ Gemini readiness, provider initialization, models และ safe responses | `verify/gemini-integration` | `Blocked` | `NP-AI-01` | `TEAM_WORKBOARD.md` |
| `NIPON-SEC-01` | Security Reviewer | ตรวจ secrets, authorization, ownership และ data-loss risk | `security/<task-name>` | `Review` | `NP-RULES-02` | PR #11 |
| `NIPON-DOC-01` | Documentation | ดูแล status, known issues, next actions, test report และ handoff | `docs/<task-name>` | `In Progress` | `NP-DOC-01` | `CURRENT_STATUS.md` |
| `NIPON-PROD-01` | Product Owner | ยืนยัน business priority, acceptance criteria, production impact และ go/no-go | `product/<task-name>` | `Planned` | — | `PROJECT_STATUS.md` |
| `NIPON-UX-01` | UX / Field Workflow | ตรวจ usability, Thai copy, mobile layout, offline expectations และ field workflow | `ux/<task-name>` | `Blocked` | reviewer `NP-UX-01` | `TEAM_WORKBOARD.md` |
| `NIPON-QA-01` | QA / E2E Tester | ออกแบบ acceptance matrix, regression, browser/device checks และ defect reproduction | `test/<task-name>` | `Review` | `NP-WF-03`; reviewer `NP-PAY-02` | PR #12 |
| `NIPON-DATA-01` | Data Steward | ตรวจ schema, migration, backup, reconciliation, retention และ data quality | `data/<task-name>` | `Blocked` | รอ isolated Firebase boundary | `docs/verification-packet/` |
| `NIPON-DEVOPS-01` | DevOps / Release | ดูแล CI, Vercel Preview/Production, rollback และ deployment evidence | `ops/<task-name>` | `Planned` | reviewer `NP-PERF-01` | `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md` |
| `NIPON-SRE-01` | SRE / Observability | ตรวจ health, runtime logs, incident response และ recovery drill | `sre/<task-name>` | `Planned` | — | `TEST_REPORT.md` |
| `NIPON-AUTH-01` | Identity & Access | ตรวจ Firebase Auth providers, role lifecycle, token verification และ account recovery | `security/auth-<task-name>` | `Planned` | — | `server/firebaseAuth.ts` |
| `NIPON-RULES-01` | Firebase Rules Reviewer | ทบทวน Firestore/Storage rules, owner/farm boundary, emulator tests และ rollback | `security/rules-<task-name>` | `Blocked` | รอ `NP-FB-01`; candidate owner `NP-RULES-03` | `firestore.rules`, `storage.rules` |
| `NIPON-INT-01` | Integration Operator | ดูแล test-only SMTP, Gemini, R2/ImageKit, Cron destinations และ cleanup | `verify/integrations-<task-name>` | `Blocked` | `NP-INT-01` | `TEAM_WORKBOARD.md` |
| `NIPON-RELEASE-01` | Release Reviewer | ตรวจ diff, checks, PR approval, release notes และ post-deploy smoke evidence | `release/<task-name>` | `Planned` | reviewer `NP-COORD-01` | `.github/workflows/verify.yml` |
| `NIPON-SUPPORT-01` | Operations / Support | รวบรวม defect จากผู้ใช้, reproduce, triage และติดตาม resolution | `support/<task-name>` | `Planned` | — | `KNOWN_ISSUES.md` |

## Scope ownership rules

แต่ละงานต้องมี **Agent owner เพียงหนึ่งตัว** และ reviewer แยกต่างหากตาม Workboard งานที่เกี่ยวข้องกับข้อมูลจริง, Firebase rules, credentials, deployment หรือ production ต้องมี owner approval ตามขั้นตอนของโครงการก่อนดำเนินการ

`TEAM_WORKBOARD.md` เป็น source of truth สำหรับ **task ownership และ file/area lock** ถ้า Workboard ระบุ task เป็น `IN_PROGRESS` หรือ `REVIEW` ให้ถือว่า scope/area นั้นถูก lock ทีมอื่นห้ามแก้พร้อมกันโดยไม่มี handoff หรือ scope split ที่ `NIPON-LEAD-01` อนุมัติ

Agent สามารถสร้าง Task ID ใหม่เองได้เมื่อพบงานใหม่ แต่ต้องตรวจ ID/scope เดิมก่อน ลงทะเบียนใน Workboard และหาก dependency หรือ locked area ยังไม่พร้อมต้องตั้งสถานะ `BLOCKED` แทนการเริ่ม implementation

## Branch and commit convention

ใช้ branch อายุสั้นและตั้งชื่อให้สื่อ scope:

```text
feature/<short-description>
fix/<short-description>
verify/<short-description>
security/<short-description>
docs/<short-description>
audit/<short-description>
test/<short-description>
ops/<short-description>
ux/<short-description>
```

Commit ควรเป็น atomic และอธิบายเหตุผล เช่น:

```text
docs: record isolated Firebase verification packet
fix: make standalone Firebase initialization lazy
security: verify owner boundary for maintenance records
```

ห้าม push ตรงเข้า `main` สำหรับงานที่มีผลต่อ behavior, permission, deployment หรือข้อมูลโดยไม่มี review ตาม `TEAM_WORK_RULES.md`

## Handoff record

เมื่อส่งต่องาน ให้ผู้ส่งบันทึกข้อมูลต่อไปนี้ใน Pull Request, issue หรือเอกสารที่เกี่ยวข้อง และอัปเดต `TEAM_WORKBOARD.md` ก่อน owner ใหม่เริ่มงาน:

| Field | Required content |
|---|---|
| From | Agent ID และ role |
| To | Agent ID หรือ owner ที่รับต่อ |
| Task ID | รหัส task จาก Workboard |
| Scope | สิ่งที่ทำและสิ่งที่ไม่ทำ |
| Branch/commit | ชื่อ branch และ commit ล่าสุด |
| Locked Area | ไฟล์/flow ที่ยังถือ lock |
| Evidence | ไฟล์, test output หรือ URL ที่ตรวจได้ |
| Open risks | ปัญหาและ severity ที่ยังค้าง |
| Next action | งานถัดไปที่ชัดเจนหนึ่งงาน |
| Data safety | ยืนยันว่าไม่มี production mutation หรือระบุ owner approval |

## Current coordination notes

Current coordination baseline คือ main หลัง `2945440`. Team A ส่ง `NP-RULES-02` เข้า PR #11 และ Team B ส่ง `NP-WF-03` เข้า PR #12 โดยทั้งสองงานเป็น static evidence และไม่แตะ production data/rules/credentials

สถานะที่ต้องถือเป็นข้อจำกัดร่วมของทุก Agent คือ production ยังอยู่ในระยะ migration validation, Gemini health ยังเป็น `AI_NOT_CONFIGURED`, Firebase isolated test boundary ยังไม่พร้อม และยังไม่มีสิทธิ์ให้ทำ production CRUD, rules deployment, migration, credential rotation หรือ deletion โดยไม่มี owner approval

สำหรับลำดับงานและ lock ปัจจุบัน ให้ดู `TEAM_WORKBOARD.md` แทนการตีความจาก commit history เอง

## Update log

| Date (UTC) | Agent | Change | Evidence |
|---|---|---|---|
| 2026-09-04 | `NIPON-AUDIT-01` | สร้างทะเบียน Agent และกำหนด roster เริ่มต้น | `AGENT_REGISTRY.md` |
| 2026-09-04 | `NIPON-LEAD-01` | เชื่อม Registry กับ Team Work Rules และ Workboard | `TEAM_WORK_RULES.md`, `TEAM_WORKBOARD.md` |
| 2026-09-04 | `NIPON-LEAD-01` | เพิ่ม roles ที่ Workboard อ้างถึงและผูกสถานะกับสองทีมล่าสุด | PR #11, PR #12 |
