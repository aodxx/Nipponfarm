# Nipponfarm LINE OA + LIFF Integration Plan

**Status:** PLANNING / REPOSITORY-AUDITED  
**Date:** 2026-09-17  
**Repository:** `aodxx/Nipponfarm`  
**Base branch:** `main`  
**Planning branch:** `feature/line-integration-planning`

## 1. Objective

เพิ่ม LINE Official Account เป็น **Front Door** ของ Nipponfarm โดยไม่ย้ายฐานข้อมูล ไม่สร้างระบบธุรกิจซ้ำ และไม่กระทบ workflow ที่ใช้งานได้อยู่แล้ว

Target architecture:

```text
LINE Official Account
        |
        +-- Rich Menu
        |
        +-- LIFF / LINE Login
        |
        v
Nipponfarm Web App (React/Vite/PWA)
        |
        +-- Firebase Auth
        +-- Firestore
        +-- Firebase Storage
        +-- Express/Vercel API
        +-- Gemini / Email / R2 integrations
```

หลักการสำคัญ: **Nipponfarm เป็น system of record; LINE เป็นช่องทางเข้าใช้งาน การแจ้งเตือน และ shortcut**

---

## 2. Repository Audit Baseline

ตรวจสอบ `main` ก่อนออกแบบ integration แล้วพบว่า:

- Repository หลักคือ `aodxx/Nipponfarm` และ branch หลักคือ `main`.
- ระบบปัจจุบันเป็น React 19 + TypeScript + Vite + Tailwind + PWA และ deploy บน Vercel.
- Frontend ใช้ Firebase Auth/Firestore/Storage โดยตรงสำหรับข้อมูลหลัก.
- Backend ใช้ Express ผ่าน `appServer.ts` และ Vercel entry point คือ `api/index.ts`.
- Server ตรวจ Firebase ID token ใน integration/API ที่เกี่ยวข้องอยู่แล้ว.
- AI/Gemini ใช้ server-side credential; ห้ามนำ secret ไปไว้ใน `VITE_*`.
- Production baseline ยังเป็น controlled migration/readiness ไม่ใช่ production-complete.
- Firebase project เดิมยังต้อง inventory/backup/reconciliation ก่อนทำ production rules หรือ migration ที่มีผลต่อข้อมูล.
- `/live` เป็น standalone WebSocket และยังไม่ควรนำมาเป็น dependency ของ LINE/LIFF เพราะ Vercel HTTP handler ปัจจุบันไม่ได้ export WebSocket lifecycle.
- CI มี TypeScript/lint/build และ regression/security tests อยู่แล้ว.
- ปัจจุบันยังไม่พบ LINE/LIFF integration ใน repository baseline ที่ตรวจ.

**ข้อสรุป:** สามารถเพิ่ม LINE integration แบบ additive ได้ แต่ต้องแยก integration layer และไม่แก้ core data workflow โดยไม่จำเป็น

---

## 3. Non-Goals

ใน phase แรกห้ามทำสิ่งต่อไปนี้:

1. ไม่ย้าย Firestore ไปฐานข้อมูลใหม่เพราะ LINE.
2. ไม่เปลี่ยน Firebase project เพียงเพื่อรองรับ LINE.
3. ไม่สร้างระบบพนักงานแยกจาก Nipponfarm.
4. ไม่ทำเงินเดือนหรือข้อมูลส่วนบุคคลผ่าน LINE chat message โดยตรง.
5. ไม่สร้าง business logic ซ้ำทั้งใน LINE และ Web App.
6. ไม่ผูกผู้ใช้ด้วย display name ของ LINE.
7. ไม่บังคับให้ผู้ใช้ใช้ LINE เป็นทางเข้าเพียงทางเดียว.
8. ไม่ทำ destructive migration.
9. ไม่ deploy production rules เพียงเพราะ integration branch พร้อม.
10. ไม่เพิ่ม WebSocket `/live` เข้า Vercel เพื่อรองรับ LINE.

---

## 4. Team Operating Model

โครงการใช้ **Single Controller Execution** ตาม `AGENT_REGISTRY.md`.

### Active controller

`NIPON-LEAD-01` — เป็นผู้คุมลำดับงาน, integration, branch/PR, CI และ release decision

### Reference roles

| Role | Responsibility ใน LINE project | Output |
|---|---|---|
| `NIPON-PM-01` | scope, priority, acceptance criteria | roadmap + acceptance |
| `NIPON-ARCH-01` | architecture/data flow | LINE integration architecture |
| `NIPON-AUTH-01` | identity/linking/recovery | account-linking policy |
| `NIPON-SEC-01` | privacy, token, secret, abuse boundary | security checklist |
| `NIPON-FB-01` | Firebase Auth/Firestore/Storage boundary | data/security impact |
| `NIPON-INT-01` | LINE API/webhook/external integration | API contract |
| `NIPON-DEV-01` | implementation | code + tests |
| `NIPON-TEST-01` | automated integration tests | test evidence |
| `NIPON-QA-01` | field acceptance | device/user acceptance |
| `NIPON-UX-01` | Rich Menu/LIFF/mobile flow | UX specification |
| `NIPON-DEVOPS-01` | Vercel/env/release | deployment evidence |
| `NIPON-SRE-01` | logging/monitoring/recovery | observability plan |
| `NIPON-DOC-01` | status/handoff/docs | project records |
| `NIPON-RELEASE-01` | final release gate | release checklist |

Roles above are review lenses, not a new multi-team queue.

---

## 5. Target User Experience

### Staff main menu

```text
+----------------+----------------+
|    งานวันนี้    |      ฟาร์ม      |
+----------------+----------------+
|    การเงิน      |     ทีมงาน      |
+----------------+----------------+
|    แจ้งปัญหา    |   ช่วยเหลือ      |
+----------------+----------------+
```

### Farm submenu

```text
+----------------+----------------+
|    แม่พันธุ์     |    แผนผังคอก     |
+----------------+----------------+
|    ปฏิทิน       |    เพิ่มข้อมูล    |
+----------------+----------------+
|    สแกน AI      |    หน้าหลัก       |
+----------------+----------------+
```

### Finance submenu

```text
+----------------+----------------+
| เงินเดือนของฉัน |   เบิกล่วงหน้า   |
+----------------+----------------+
|  สลิปเงินเดือน  |    รายการขาย     |
+----------------+----------------+
|    สแกนบิล      |    หน้าหลัก       |
+----------------+----------------+
```

### Admin/Manager

เมนูผู้บริหารต้องใช้ role/permission ของ Nipponfarm ไม่ใช้ LINE profile เป็นตัวตัดสินสิทธิ์:

- Dashboard
- งานรออนุมัติ
- Payroll/Advance
- Sales/Cost
- Maintenance queue
- User management
- Audit/history

---

## 6. Account Linking Design

### Canonical identity

บัญชี Nipponfarm ยังคงเป็น identity หลัก

```text
Firebase Auth UID
      |
      +-- employee/staff profile
      |
      +-- role
      |
      +-- farm/tenant scope (เมื่อ policy พร้อม)
      |
      +-- optional LINE identity link
             |
             +-- LINE user ID
             +-- linkedAt
             +-- linkedBy / verification method
             +-- status
```

### ห้ามใช้

- LINE display name
- รูป profile
- nickname
- phone number จาก LINE โดยไม่มี verification

เป็นตัวระบุบัญชีหลัก

### Linking flow

1. ผู้ใช้ login เข้า Nipponfarm ด้วยวิธีที่ระบบรองรับอยู่แล้ว.
2. เลือก `เชื่อมบัญชี LINE`.
3. เปิด LIFF/LINE Login.
4. ระบบได้รับ LINE identity จาก trusted LINE flow.
5. Backend ตรวจสอบ session/ID token และบัญชีเป้าหมาย.
6. สร้าง/อัปเดต link record ตาม policy.
7. แสดงผลว่าเชื่อมสำเร็จ.
8. ทุก subsequent request ใช้ Nipponfarm authorization เป็นตัวตัดสินสิทธิ์.

### Recovery

ต้องมี flow สำหรับ:

- เปลี่ยนโทรศัพท์แต่ใช้ LINE เดิม
- เปลี่ยน LINE account
- ยกเลิกการเชื่อม
- บัญชี LINE ถูก compromise
- พนักงานออกจากงาน
- ผู้ดูแล reset link

---

## 7. Integration Components

### A. LINE Official Account

ใช้สำหรับ:

- Rich Menu
- push notification
- broadcast/news
- entry point
- basic support

### B. LINE Login / LIFF

ใช้สำหรับ:

- เปิด Nipponfarm ภายใน LINE
- account linking
- staff-specific pages
- finance/private pages
- maintenance/report forms

### C. Nipponfarm Backend

เพิ่ม integration endpoints แยก namespace เช่น:

```text
/api/line/health
/api/line/webhook
/api/line/link/start
/api/line/link/callback
/api/line/link/status
/api/line/unlink
/api/line/notifications/*
```

ชื่อ endpoint เป็น design target; implementation ต้องตรวจ route conventions เดิมก่อนเพิ่มจริง

### D. Firestore

เพิ่มเฉพาะ integration metadata ที่จำเป็น เช่น:

```text
line_accounts/{lineUserId}
```

หรือ schema ที่เหมาะสมหลัง architecture review

ห้ามเก็บ access token/secret แบบถาวรโดยไม่มีเหตุผลและห้าม duplicate employee master data

---

## 8. Security Model

1. LINE identity ≠ Nipponfarm authorization.
2. Backend ต้องตรวจ authenticated Nipponfarm identity ก่อนเข้าถึงข้อมูลส่วนตัว.
3. LIFF URL parameters ห้ามใช้เป็น authorization.
4. Secrets ของ LINE Messaging API ต้องอยู่ server environment เท่านั้น.
5. ห้ามใช้ `VITE_` กับ LINE secret/channel secret/access token.
6. Webhook ต้องตรวจ signature ตาม LINE platform mechanism ก่อนประมวลผล.
7. Notification payload ต้องไม่เปิดเผยข้อมูลเงินเดือน/ข้อมูลส่วนบุคคลละเอียด.
8. Staff เห็นเฉพาะข้อมูลของตนเองตาม existing authorization.
9. Manager/Admin ใช้ role จาก Nipponfarm.
10. ต้องมี audit event สำหรับ account link/unlink และ sensitive administrative actions.
11. ต้องมี idempotency สำหรับ webhook/event ที่อาจถูกส่งซ้ำ.
12. ต้องมี rate limiting/abuse boundary ตามความเหมาะสมของ public webhook.

---

## 9. Notification Policy

### Allowed examples

```text
มีงานใหม่ที่ต้องดำเนินการ
[เปิดงานวันนี้]
```

```text
สลิปเงินเดือนของคุณพร้อมดูแล้ว
[เปิดดู]
```

```text
คำขอเบิกล่วงหน้าของคุณมีการเปลี่ยนสถานะ
[เปิดรายการ]
```

### Avoid

```text
เงินเดือนเดือนนี้ 25,000 บาท
```

หรือรายละเอียดส่วนตัว/ข้อมูลการเงินที่ไม่จำเป็นในข้อความ LINE

---

## 10. Phased Implementation

### Phase 0 — Repository & Production Baseline

**Goal:** ยืนยันว่า integration จะไม่ชนของเดิม

Tasks:

- freeze baseline commit
- inventory routes/auth/data model
- inventory Firebase/Vercel environment requirements
- inventory existing user/role fields
- identify safe integration insertion points
- record existing tests/build evidence

Acceptance:

- existing lint/build/tests ผ่าน
- ไม่มี core workflow regression
- ไม่มี production data mutation

### Phase 1 — LINE Foundation

Tasks:

- create/configure LINE Official Account
- configure Messaging API
- configure LINE Login/LIFF
- register allowed LIFF endpoints
- define server-side environment variables
- add non-secret `.env.example` entries
- add `/api/line/health`
- add webhook verification skeleton
- add structured logging without secrets

Acceptance:

- server starts without LINE credentials in local fallback mode
- health endpoint reports configured/not configured safely
- build/lint/tests pass

### Phase 2 — Account Linking

Tasks:

- design link collection
- implement secure link initiation
- verify LINE identity
- bind to authenticated Nipponfarm UID
- duplicate-link handling
- unlink/recovery flow
- audit events

Acceptance:

- one LINE identity cannot silently access another staff account
- wrong-owner access denied
- unlink removes access path without deleting employee record
- duplicate/concurrent link attempts are safe

### Phase 3 — LIFF Entry Pages

Start with low-risk pages:

1. งานวันนี้
2. แจ้งปัญหา
3. ช่วยเหลือ

Then:

4. ฟาร์ม
5. การเงิน

Finance must only be enabled after account-linking and privacy tests pass.

### Phase 4 — Rich Menu

Create production-ready menu assets after LIFF routes are stable.

Requirements:

- maximum 6 primary actions
- large touch targets
- Thai labels readable on mobile
- consistent Nipponfarm visual language
- fallback to direct web app

### Phase 5 — Notifications

Implement:

- task notifications
- maintenance status
- approval status
- payroll availability
- important farm events

Every notification must have a destination page and authorization check.

### Phase 6 — Admin/Manager

Add role-specific menus only after staff flow is stable.

### Phase 7 — Production Rollout

Use controlled rollout:

```text
Test account
  -> internal device
  -> small staff pilot
  -> monitor
  -> expand
```

Rollback must disable LINE entry/notification paths without disabling the core Nipponfarm web app.

---

## 11. Test Matrix

### Identity

- unlinked LINE user
- linked staff
- linked manager
- linked admin
- duplicate LINE link
- duplicate employee link
- unlink
- re-link
- changed LINE account

### Authorization

- staff reads own data
- staff cannot read another staff's data
- manager sees permitted scope
- admin sees permitted scope
- LIFF URL tampering denied
- expired/invalid token denied

### Webhook

- valid signature
- invalid signature
- duplicate event
- malformed payload
- unsupported event
- replay/idempotency behavior

### Notifications

- notification delivered
- no sensitive values in payload
- correct deep link
- unauthorized deep link denied
- failed delivery logged safely

### Regression

- existing login
- existing Firestore reads/writes
- existing Storage
- Receipt
- Pig Sale
- Payroll/Advance
- Sow Lifecycle
- Maintenance
- PWA startup
- `/api/health`
- Vercel build

---

## 12. Production Environment Plan

Proposed server-only variables (exact naming to be finalized during implementation):

```text
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_LIFF_ID=
LINE_LOGIN_CHANNEL_ID=
```

Do not commit values.

`APP_URL` already exists and must remain the canonical application origin; LINE callback/LIFF URLs must be derived from the production URL after Vercel configuration is confirmed.

---

## 13. Rollback Strategy

LINE integration must be **feature-isolatable**.

Rollback order:

1. disable Rich Menu links / LIFF entry if required
2. disable LINE notifications
3. disable LINE webhook processing
4. retain Nipponfarm web login and normal routes
5. revert integration branch/PR if code regression exists
6. do not delete existing Firebase data as a rollback mechanism

A LINE failure must never make the core Nipponfarm application unavailable.

---

## 14. Definition of Done

LINE integration is ready for production only when all are true:

- account linking verified
- authorization verified
- webhook signature verification verified
- duplicate webhook behavior verified
- sensitive data policy verified
- LIFF routes verified on Android/iOS-supported LINE environment
- Rich Menu verified
- notification deep links verified
- existing core workflow regression suite passes
- lint/build passes
- production environment variables confirmed
- logs/monitoring available
- rollback procedure tested
- documentation updated
- release review completed

---

## 15. Immediate Next Actions

**Do not implement Rich Menu or payroll LIFF yet.**

Next repository work:

1. inspect existing Auth/user/role model and route structure in detail
2. inspect `appServer.ts` route registration and middleware boundaries
3. inspect Firebase initialization and user profile schema
4. identify the safest Firestore location for LINE link metadata
5. define exact LINE endpoint contracts
6. define account-linking threat model and tests
7. add LINE environment placeholders to `.env.example`
8. implement `/api/line/health` only after route conventions are confirmed
9. add automated tests for unconfigured/configured behavior
10. update project status/workboard after the design gate

**Production credentials, Firebase changes, and Rich Menu publishing remain external/configuration tasks and must not be guessed or committed.**
