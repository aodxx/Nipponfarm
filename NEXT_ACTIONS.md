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

**Task 1: Core Workflow Verification Baseline**

สร้าง verification matrix สำหรับ 5 workflow หลัก:

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

จากนั้นจัดอันดับ blocker และเลือก workflow ที่เสี่ยงสูงสุดเป็น implementation task ถัดไป

## Definition of Done ของ Task 1

- verification matrix ครบทั้ง 5 workflow
- ระบุ PASS / PARTIAL / FAIL / NOT TESTED
- มี blocker และ owner/action ของแต่ละปัญหา
- ไม่มีการเพิ่ม feature ใหม่ใน task นี้
- `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`, `KNOWN_ISSUES.md` ต้องอัปเดตให้ตรงกับผลตรวจ
- lint/build/tests ที่เกี่ยวข้องต้องผ่านก่อนสรุป task
