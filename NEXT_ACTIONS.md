# Niponfarm Next Actions

อัปเดต: **4 กันยายน 2026**

> แผนงานหลักช่วงถัดไปให้อ้างอิง `NIPPONFARM_CORE_WORKFLOW_UX_CONSOLIDATION.md` เป็นเอกสารกลางสำหรับงาน Consolidation ทั้งระบบ

## สถานะสำคัญ

- งาน server endpoint authorization baseline ถูกดำเนินการและ merge แล้ว
- ห้ามกลับไปทำงาน P0 เดิมซ้ำโดยไม่ตรวจ commit ล่าสุด
- งานถัดไปต้องเปลี่ยนจาก “เพิ่มฟีเจอร์” ไปเป็น “พิสูจน์ workflow หลัก + ลดความซับซ้อน + ทำระบบให้ใช้งานจริงได้ครบวงจร”

## P0 — Production & Integration Verification

1. ยืนยัน `GEMINI_API_KEY` และทำให้ production health รายงาน `aiReady: true`
2. ทดสอบ Gemini success path จริงอย่างน้อย 1 workflow ด้วย test account/data
3. ทำ Firestore CRUD test: create/read/update/delete ด้วย test record ที่แยกจากข้อมูลจริง
4. ทำ Firebase Storage upload/download/delete test
5. ตรวจ authorization ของ role หลัก: unauthenticated, pending, staff, admin และ wrong-owner
6. ยืนยัน SMTP, `CRON_SECRET`, ImageKit/R2 และ server-only environment variables ตามที่ใช้งานจริง
7. ตรวจ Vercel runtime logs หลังเรียก API สำคัญ
8. ตรวจ Firebase project `Thailottery` inventory/backup/reconciliation ก่อนเปลี่ยน rules หรือ migration

## P1 — Nipponfarm Core Workflow & UX Consolidation

ดำเนินงานตาม `NIPPONFARM_CORE_WORKFLOW_UX_CONSOLIDATION.md`

### Core workflows ที่ต้องพิสูจน์

1. Sow Lifecycle
2. Receipt → Expense
3. Pig Sale
4. Payroll & Advance
5. Maintenance

### UX / Frontend priorities

- ลด primary navigation ให้เหลือกลุ่มงานหลัก
- Dashboard ต้องตอบว่า “วันนี้ต้องทำอะไร”
- refactor `Dashboard.tsx`
- refactor `ScanReceipt.tsx`
- แยก large pages อื่นตามลำดับความเสี่ยง
- เพิ่ม use-case hooks ระหว่าง UI กับ services
- route-level lazy loading
- ลด initial bundle

### Data foundation priorities

- ออกแบบ `farmId` strategy
- permission matrix
- audit trail สำหรับธุรกรรมสำคัญ
- ลด hard-coded admin bypass ในระยะยาวโดยมี recovery plan

## P1 — Technical Health

1. แก้ critical/high dependency vulnerabilities แบบมี regression test
2. ห้ามใช้ `npm audit fix --force` โดยไม่ review
3. จัดการ `xlsx` ด้วย risk decision หรือ replacement plan หากไม่มี safe fix
4. ลด main bundle จาก baseline
5. แก้ import duplication / heavy library loading

## P2 — Field Reliability

1. PWA install/offline/update/relogin acceptance test บน Android จริง
2. ออกแบบ pending sync state
3. ทดลอง offline write workflow อย่างน้อย 1 workflow ที่ไม่ใช่การเงิน
4. unified loading/success/error/retry/sync feedback

## P2 — Business Intelligence

ทำหลัง data quality ผ่านแล้ว:

- รายรับ/รายจ่าย
- feed cost trend
- cost per pig
- sow performance
- maintenance backlog
- payroll cost
- sale price trend
- farm operating summary

## NEXT TASK

**Task 1: Core Workflow Verification Baseline — เสร็จแล้วในระดับเอกสาร/static verification**

สร้าง verification matrix สำหรับ 5 workflow หลักไว้ที่ `docs/CORE_WORKFLOW_VERIFICATION_MATRIX.md`:

1. Sow Lifecycle
2. Receipt → Expense
3. Pig Sale
4. Payroll & Advance
5. Maintenance

แต่ละ workflow ต้องมี:

- entry point
- page/component
- service/API
- Firestore/Storage collection
- user roles
- happy path
- failure path
- permission test
- reload/relogin persistence
- mobile usability
- blocker ปัจจุบัน

ผลการจัดอันดับเลือก **Payroll & Advance** เป็น workflow ที่มี blocker สูงสุดและเป็น implementation task ถัดไป เนื่องจากเป็นธุรกรรมการเงิน มี approval/payslip หลายขั้น และยังขาด audit trail, regression tests และ production permission evidence

## Definition of Done ของ Task 1

- [x] verification matrix ครบทั้ง 5 workflow
- [x] ระบุ PARTIAL / BLOCKED / NOT TESTED ตามหลักฐานที่มี
- [x] มี blocker และ owner/action ของแต่ละปัญหา
- [x] ไม่มีการเพิ่ม feature ใหม่ใน task นี้
- [x] `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`, `KNOWN_ISSUES.md` อัปเดตให้ตรงกับผลตรวจ
- [x] lint/build/tests ที่เกี่ยวข้องผ่านก่อนสรุป task

## Task 2: Payroll & Advance — Security, Consistency & Audit Baseline

### Progress: duplicate submission guard — เสร็จแล้ว

- [x] เพิ่ม `hasDuplicateAdvanceSubmission` และ `assertNoDuplicateAdvanceSubmission`
- [x] เชื่อม guard เข้ากับ `employeeService.addAdvance` ก่อน `addDoc`
- [x] แสดง duplicate-specific feedback ใน `AdvanceRequest`
- [x] เพิ่ม submit-flow tests และผ่าน 7/7
- [x] ไม่เปลี่ยน Firestore rules และไม่แตะข้อมูล production

ข้อจำกัดเดิม: query-before-add เพียงอย่างเดียวป้องกัน retry ปกติแต่ไม่ป้องกัน concurrent writes แบบ atomic; ได้ยกระดับใน progress ด้านล่างแล้ว

### Progress: transaction-safe idempotency — เสร็จแล้ว

- [x] เพิ่ม deterministic `submissionKey` จาก user/date/amount
- [x] ใช้ Firestore transaction อ่าน/เขียน deterministic document เดียวเพื่อป้องกัน concurrent duplicate ของ submission ใหม่
- [x] รักษา legacy records เดิมโดยไม่ลบหรือ migrate และตรวจ duplicate ก่อนเขียน
- [x] เพิ่ม tests ของ key normalization และ transaction decision behavior
- [x] payroll tests 8/8, authorization tests 5/5, lint และ build ผ่าน

ข้อจำกัด: รายการเก่าที่ไม่มี `submissionKey` ยังต้องผ่าน legacy lookup; ยังต้องทดสอบ emulator/production test account ก่อนถือว่า payroll production-ready

### Progress: payroll audit trail และ owner/admin policy tests — เสร็จในระดับ code/test

- [x] เพิ่ม `payroll_audit_events` schema builder โดยเก็บ actor, target, transition และ metadata ที่ปลอดภัย
- [x] ผูกการ approve/reject advance กับการเขียน audit event ใน transaction เดียวกับ status update
- [x] เพิ่ม Firestore rule: admin อ่าน/สร้างได้เมื่อ `actorUid` ตรงกับผู้ล็อกอิน; ไม่มี update/delete
- [x] เพิ่ม owner/admin/wrong-owner policy tests 6/6
- [x] ไม่เก็บ password, token, secret หรือ slip image ใน audit metadata

ข้อจำกัด: ยังไม่ได้รัน Firebase Emulator หรือ production test-account CRUD เพราะ repository ยังไม่มี emulator harness; ต้องทำเป็น verification task ถัดไปก่อน production sign-off

1. เพิ่ม unit tests สูตร advance/payroll และ net salary
2. กำหนด transaction identity/idempotency สำหรับ request, approval และ payslip
3. เพิ่ม audit record สำหรับ approve/reject/change โดยไม่เก็บ secret หรือข้อมูลเกินจำเป็น
4. ตรวจความสอดคล้องของ `EmployeeTransaction` กับ `employee_transactions` โดยไม่ migrate หรือลบข้อมูล production
5. เพิ่ม integration tests owner/admin/wrong-owner ก่อนแก้ Firestore rules
6. รัน lint, auth tests และ build ก่อนสรุป
