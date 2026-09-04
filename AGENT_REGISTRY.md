# Niponfarm Agent Registry

ทะเบียนกลางสำหรับระบุว่า Agent แต่ละตัวรับผิดชอบเรื่องใด ทำงานอยู่บน branch ใด และมีหลักฐานล่าสุดอยู่ที่ไหน

**Project:** Niponfarm
**Repository:** `aodxx/Nipponfarm`
**Production:** `https://nipponfarm.vercel.app`
**Registry owner:** `NIPON-LEAD-01`
**Last updated:** 4 September 2026
**Registry status:** Active

## วิธีใช้งาน

ก่อนเริ่มงาน Agent ต้องอ่าน `TEAM_HANDOFF.md`, `CURRENT_STATUS.md`, `KNOWN_ISSUES.md` และ `NEXT_ACTIONS.md` ก่อนลงทะเบียน scope ของตนเอง ห้ามใช้ชื่อหรือ branch ที่มีผู้รับผิดชอบอยู่แล้ว

เมื่อเริ่มงาน ให้เปลี่ยนสถานะเป็น `In Progress` และระบุ branch กับ task ที่ชัดเจน เมื่อจบ milestone ให้บันทึก commit หรือ evidence reference แล้วเปลี่ยนเป็น `Completed`, `Blocked` หรือ `Handed Off` ตามสถานการณ์จริง

ห้ามบันทึก API key, password, bearer token, Firebase ID token, service-account JSON, private key หรือข้อมูลส่วนบุคคลจริงในไฟล์นี้

## สถานะที่ใช้ได้

| Status | ความหมาย |
|---|---|
| `Planned` | วางบทบาทไว้แล้ว แต่ยังไม่ได้เริ่มงาน |
| `In Progress` | กำลังทำงานอยู่และมี branch/evidence รองรับ |
| `Blocked` | ติดสิทธิ์ ข้อมูล หรือ dependency ที่ต้องให้ owner ช่วย |
| `Review` | ทำงานเสร็จและรอการตรวจ |
| `Completed` | งานผ่านเกณฑ์ของ scope แล้ว |
| `Handed Off` | ส่งต่อให้ Agent หรือผู้รับผิดชอบคนอื่นแล้ว |
| `Inactive` | ไม่ได้ทำงานในรอบปัจจุบัน |

## Agent roster

| Agent ID | Role | Responsibility | Branch / workspace | Status | Current task | Last evidence |
|---|---|---|---|---|---|---|
| `NIPON-LEAD-01` | Audit Coordinator / Team Lead | จัดลำดับงาน, คุม scope, ตรวจ handoff และประสาน owner | `main` หรือ coordination workspace | `In Progress` | คุม Verification Packet และตัดสินใจงานถัดไป | `NEXT_ACTIONS.md` |
| `NIPON-AUDIT-01` | Project Audit & Recovery | ตรวจ baseline, build, runtime, API, risk และเอกสาร audit | `audit/recovery-baseline-2026-09-04` | `Completed` | สร้าง Audit baseline และ Verification Packet | commit `3fc9899` |
| `NIPON-PM-01` | Project Manager | ตรวจ PRD, README, roadmap, progress, phase และงานค้าง | `pm/<task-name>` | `Planned` | — | — |
| `NIPON-ARCH-01` | System Architect | ตรวจ repository, frontend, backend, Firebase, hosting และ data flow | `arch/<task-name>` | `Planned` | — | `SYSTEM_ARCHITECTURE.md` |
| `NIPON-DEV-01` | Developer | แก้ implementation เฉพาะ scope พร้อม tests; ห้าม refactor ใหญ่โดยไม่มีแผน | `fix/<task-name>` หรือ `feature/<task-name>` | `Planned` | — | — |
| `NIPON-TEST-01` | Tester | รัน user flow, API smoke, CRUD, permissions, integration และ cleanup evidence | `test/<task-name>` | `Planned` | — | `TEST_REPORT.md` |
| `NIPON-FB-01` | Firebase / Backend | ตรวจ Firebase project, Auth, Firestore, Storage, rules และ environment names | `verify/firebase-test-environment` | `Blocked` | รอ isolated Firebase Test Project และ owner approval | `docs/verification-packet/` |
| `NIPON-AI-01` | AI Integration | ตรวจ Gemini readiness, provider initialization, model, error codes และ safe responses | `verify/gemini-integration` | `Blocked` | รอ test-only Gemini credential และ Preview environment | `docs/verification-packet/` |
| `NIPON-SEC-01` | Security Reviewer | ตรวจ secrets, authorization, ownership, dependency และ data-loss risk | `security/<task-name>` | `Planned` | — | `KNOWN_ISSUES.md` |
| `NIPON-DOC-01` | Documentation | ดูแล status, architecture, test report, known issues, next actions และ handoff | `docs/<task-name>` | `In Progress` | ดูแลเอกสารตามผล verification | `CURRENT_STATUS.md` |

## Scope ownership rules

แต่ละงานต้องมี **Agent owner เพียงหนึ่งตัว** และอาจมี reviewer แยกต่างหาก งานที่เกี่ยวข้องกับข้อมูลจริง, Firebase rules, credentials, deployment หรือ production ต้องมี owner approval ตามขั้นตอนของโครงการก่อนดำเนินการ

`NIPON-LEAD-01` มีหน้าที่ประสานลำดับงาน แต่ไม่ควรแก้ scope ของ `NIPON-FB-01`, `NIPON-SEC-01` หรือ `NIPON-AI-01` โดยพลการ หากยังไม่มีหลักฐานและการส่งต่อที่ชัดเจน

## Branch and commit convention

ใช้ branch อายุสั้นและตั้งชื่อให้สื่อ scope:

```text
feature/<short-description>
fix/<short-description>
verify/<short-description>
security/<short-description>
docs/<short-description>
audit/<short-description>
```

Commit ควรเป็น atomic และอธิบายเหตุผล เช่น:

```text
docs: record isolated Firebase verification packet
fix: make standalone Firebase initialization lazy
security: verify owner boundary for maintenance records
```

ห้าม push ตรงเข้า `main` สำหรับงานที่มีผลต่อ behavior, permission, deployment หรือข้อมูลโดยไม่มี review ตามกติกา repository

## Handoff record

เมื่อส่งต่องาน ให้ผู้ส่งบันทึกข้อมูลต่อไปนี้ใน Pull Request, issue หรือเอกสารที่เกี่ยวข้อง:

| Field | Required content |
|---|---|
| From | Agent ID และ role |
| To | Agent ID หรือ owner ที่รับต่อ |
| Scope | สิ่งที่ทำและสิ่งที่ไม่ทำ |
| Branch/commit | ชื่อ branch และ commit ล่าสุด |
| Evidence | ไฟล์, test output หรือ URL ที่ตรวจได้ |
| Open risks | ปัญหาและ severity ที่ยังค้าง |
| Next action | งานถัดไปที่ชัดเจนหนึ่งงาน |
| Data safety | ยืนยันว่าไม่มี production mutation หรือระบุ owner approval |

## Current coordination notes

ขณะสร้างทะเบียนนี้ repository baseline คือ commit `fba7c2d` บน `main`. Audit และ Verification Packet ถูกเก็บใน branch `audit/recovery-baseline-2026-09-04` เพื่อไม่ปะปนกับ `main` และยังไม่มีการ push หรือ deploy จาก branch นี้

สถานะที่ต้องถือเป็นข้อจำกัดร่วมของทุก Agent คือ production ยังอยู่ในระยะ migration validation, Gemini health ยังเป็น `AI_NOT_CONFIGURED`, Firebase test project ยังไม่ถูกสร้างใน packet นี้ และยังไม่มีสิทธิ์ให้ทำ production CRUD, rules deployment, migration, credential rotation หรือ deletion

## Update log

| Date (UTC) | Agent | Change | Evidence |
|---|---|---|---|
| 2026-09-04 | `NIPON-AUDIT-01` | สร้างทะเบียน Agent และกำหนด roster เริ่มต้น | `AGENT_REGISTRY.md` |
