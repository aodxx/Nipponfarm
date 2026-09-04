# Nipponfarm Agent Registry

ทะเบียนบทบาทอ้างอิงของโครงการหลังเปลี่ยนเป็น **Single Controller Execution**

**Repository:** `aodxx/Nipponfarm`  
**Production:** `https://nipponfarm.vercel.app`  
**Active controller:** `NIPON-LEAD-01`  
**Last updated:** 4 September 2026

## Operating model

มีผู้คุมงานที่ active เพียงตัวเดียวคือ `NIPON-LEAD-01`. บทบาทอื่นด้านล่างใช้เป็น checklist/มุมตรวจเฉพาะทางเมื่อต้องการ ไม่ใช่ทีมแยก ไม่ถือคิวงาน และไม่ทำให้ implementation ต้องรอ handoff/reviewer หลายชั้น

การเปลี่ยน behavior/security/integration ใช้ branch + PR + CI เป็น quality gate ตาม `TEAM_WORK_RULES.md`.

## Registry

| Agent ID | Reference role | Status | ใช้เมื่อ |
|---|---|---|---|
| `NIPON-LEAD-01` | Controller / Integrator | `ACTIVE` | จัดลำดับ ลงมือ เปิด PR ตรวจ CI merge และสรุปสถานะทั้งหมด |
| `NIPON-AUDIT-01` | Audit & Recovery | `REFERENCE` | ตรวจ baseline/recovery/readiness |
| `NIPON-PM-01` | Product / Project Planning | `REFERENCE` | ตรวจ roadmap/priority/acceptance |
| `NIPON-ARCH-01` | Architecture | `REFERENCE` | ตรวจ frontend/backend/data flow |
| `NIPON-DEV-01` | Implementation | `REFERENCE` | coding/refactor/fix |
| `NIPON-TEST-01` | Test | `REFERENCE` | unit/integration/smoke/E2E |
| `NIPON-FB-01` | Firebase | `REFERENCE` | Auth/Firestore/Storage/test boundary |
| `NIPON-AI-01` | AI Integration | `REFERENCE` | Gemini readiness/models/errors |
| `NIPON-SEC-01` | Security | `REFERENCE` | auth/ownership/secrets/data-loss risk |
| `NIPON-DOC-01` | Documentation | `REFERENCE` | status/known issues/next actions |
| `NIPON-UX-01` | UX / Field Workflow | `REFERENCE` | mobile/usability/offline workflow |
| `NIPON-QA-01` | QA / Acceptance | `REFERENCE` | acceptance matrix/regression |
| `NIPON-DATA-01` | Data Steward | `REFERENCE` | schema/backup/reconciliation/retention |
| `NIPON-DEVOPS-01` | DevOps / Release | `REFERENCE` | CI/Vercel/deployment/rollback |
| `NIPON-SRE-01` | Reliability / Observability | `REFERENCE` | logs/incidents/recovery |
| `NIPON-AUTH-01` | Identity & Access | `REFERENCE` | role lifecycle/account recovery |
| `NIPON-RULES-01` | Firebase Rules | `REFERENCE` | Firestore/Storage permission review |
| `NIPON-INT-01` | External Integrations | `REFERENCE` | SMTP/R2/ImageKit/Cron destinations |
| `NIPON-RELEASE-01` | Release Review | `REFERENCE` | final diff/checks/release evidence |
| `NIPON-SUPPORT-01` | Support / Triage | `REFERENCE` | reproduce/triage user defects |

## Rules

1. ห้ามสร้าง “ทีม” หรือคิวใหม่จาก Registry นี้เอง
2. งานทั้งหมดให้ดูสถานะจาก `TEAM_WORKBOARD.md`
3. งาน repository ที่ไม่ชนกันสามารถเดินคู่ขนานผ่าน branch แยกได้
4. PR + CI แทน review queue หลายชั้น
5. credential, production data, rules deployment และ destructive migration ยังต้องรักษา safety boundary ตาม `TEAM_WORK_RULES.md`
6. ห้ามเก็บ secret/token/password/service-account/private key ใน Registry หรือเอกสารใด ๆ

## Current note

PR #11 และ #12 ถูก merge แล้ว, route lazy loading ถูก mergeผ่าน PR #14 และ security owner-boundary fix อยู่ใน PR #13. งาน Firebase/Gemini runtime ที่ต้องใช้ isolated environment หรือ Vercel console access ให้ถือเป็น external blocker เท่านั้น ไม่ห้ามงาน repository อื่นเดินต่อ
