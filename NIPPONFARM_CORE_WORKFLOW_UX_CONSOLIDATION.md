# Nipponfarm Core Workflow & UX Consolidation

อัปเดต: 4 กันยายน 2026

## เป้าหมาย

เปลี่ยน Nipponfarm จากแอปที่มีฟีเจอร์จำนวนมากให้กลายเป็น **ระบบบริหารฟาร์มที่ใช้งานจริงได้ทุกวัน** โดยลดความซับซ้อนของ UX, ทำ workflow หลักให้จบครบวงจร, ลดหนี้เทคนิค, ทำให้ข้อมูลและสิทธิ์เป็นระบบเดียวกัน และเตรียมฐานสำหรับการขยายในอนาคต

เอกสารนี้เป็นแผนงานกลางสำหรับทีมหลังจากงาน Production Verification / Integration Verification ผ่านในระดับที่เพียงพอแล้ว

---

## หลักการทำงานของ Phase นี้

1. ยังไม่เพิ่มฟีเจอร์ใหม่ขนาดใหญ่จนกว่า workflow หลักจะเสถียร
2. ห้ามรื้อระบบใหม่ทั้งหมด หากของเดิมสามารถ refactor และทดสอบให้ดีขึ้นได้
3. ทุกงานต้องผูกกับปัญหาจริงของผู้ใช้หรือความเสี่ยงทางเทคนิค
4. ทุกการเปลี่ยนแปลงสำคัญต้องมี test หรือหลักฐาน verification
5. ต้องรักษาข้อมูลเดิมและหลีกเลี่ยง destructive migration
6. ต้องอัปเดตเอกสารสถานะหลังจบแต่ละ milestone
7. ให้ `PROJECT_STATUS.md` เป็นสถานะหลักของโปรเจกต์ และใช้ `NEXT_ACTIONS.md` เป็นคิวงานถัดไป

---

# Phase A — Core Workflow Validation

## A1. Sow Lifecycle

ทำให้ workflow แม่พันธุ์ใช้งานครบวงจร:

- เพิ่มแม่พันธุ์
- ดูรายละเอียด
- บันทึกเหตุการณ์สำคัญ
- เชื่อมปฏิทิน
- แสดงงาน/การเตือนที่เกี่ยวข้อง
- แก้ไขข้อมูลอย่างปลอดภัย
- ยืนยันว่าข้อมูลยังอยู่หลัง reload / relogin

### Definition of Done

- ผู้ใช้เพิ่มแม่พันธุ์ใหม่ได้จริง
- ข้อมูลอ่านกลับได้ถูกต้อง
- update ผ่าน
- calendar/event เชื่อมโยงถูก record
- unauthorized user ไม่สามารถทำสิ่งที่ไม่มีสิทธิ์ได้
- มี smoke/E2E test สำหรับเส้นทางหลัก

---

## A2. Receipt → Expense Workflow

เปลี่ยน Scan Receipt จากฟีเจอร์ OCR ให้เป็น workflow ต้นทุนฟาร์ม:

1. ถ่าย/เลือกภาพบิล
2. AI/OCR อ่านข้อมูล
3. ผู้ใช้ตรวจและแก้ไข
4. บันทึก bill + bill items
5. จัดหมวดรายจ่าย
6. แสดงในประวัติ
7. เชื่อมรายงานต้นทุนในอนาคต

### งานย่อย

- refactor `ScanReceipt.tsx`
- แยก scanning / review / save / error states
- ป้องกัน duplicate save
- มี loading, retry, cancel และ save state ชัดเจน
- รองรับกรณี AI อ่านไม่ครบ
- ตรวจ ownership ของ bill และ bill_items

### Definition of Done

- scan → review → save → history ทำได้ครบ
- reload แล้วยังเห็นข้อมูล
- failed AI ไม่ทำให้ข้อมูลหาย
- duplicate submission ถูกป้องกัน
- test อย่างน้อย success + failure + unauthorized

---

## A3. Pig Sale Workflow

ทำให้การขายสุกรมีเส้นทางข้อมูลชัดเจน:

- สร้างรายการขาย
- น้ำหนัก
- จำนวน
- ราคา
- ผู้ซื้อ
- วันที่
- ผู้บันทึก
- ยอดรวม
- ประวัติ

### Definition of Done

- สร้าง/อ่าน/แก้ไขรายการขายได้
- ยอดรวมคำนวณถูกต้อง
- ข้อมูลแสดงใน dashboard/รายงานได้
- permission ถูกต้อง

---

## A4. Payroll & Advance Workflow

ทำให้เส้นทางนี้ครบ:

`Base Salary → Advance Request → Approval → Payroll Summary → Payslip`

### งานย่อย

- ยืนยันสูตรคำนวณ
- ป้องกันแก้ transaction ย้อนหลังแบบไร้ร่องรอย
- เพิ่ม audit trail สำหรับ approval/change
- staff เห็นเฉพาะข้อมูลที่ควรเห็น
- admin เห็นภาพรวม

### Definition of Done

- request/approve/reject ทำงานจริง
- summary ตรงกับ transaction
- payslip ถูกต้อง
- สิทธิ์ owner/admin ผ่าน test

---

## A5. Maintenance Workflow

ทำให้แจ้งซ่อมครบวงจร:

`แจ้งปัญหา → รับเรื่อง → ดำเนินการ → ปิดงาน`

### Definition of Done

- state transition ชัดเจน
- ผู้สร้างเห็นสถานะล่าสุด
- ผู้ดูแลแก้ไขสถานะได้
- ประวัติงานไม่หาย

---

# Phase B — UX Consolidation

## B1. ลดความซับซ้อนของ Navigation

เป้าหมาย: ผู้ใช้ต้องรู้ว่า “งานที่ต้องทำอยู่ตรงไหน” โดยไม่ต้องจำชื่อฟีเจอร์จำนวนมาก

### โครงสร้างเป้าหมาย

Primary navigation:

- หน้าหลัก
- ฟาร์ม
- การเงิน
- ทีมงาน
- เพิ่มเติม

Secondary features เช่น Chat, News, Manual, Calculator, Feed, Settings ให้อยู่ในหมวดที่เหมาะสม ไม่ให้แข่งขันกับงานหลัก

### Definition of Done

- primary nav ไม่เกิน 5 จุดหลัก
- เส้นทางงานหลักเข้าถึงได้ภายใน 1–2 ขั้น
- ไม่มีเมนูซ้ำความหมาย
- mobile navigation ทดสอบได้บนจอเล็ก

---

## B2. Dashboard = What Needs Attention Today

Dashboard ต้องเปลี่ยนจากหน้ารวม widget เป็นหน้าตัดสินใจ

### สิ่งที่ควรแสดง

- งานวันนี้
- แม่พันธุ์ที่ต้องติดตาม
- เหตุการณ์ใกล้ถึง
- งานซ่อมค้าง
- บิล/รายการที่รอตรวจ
- คำขอเบิกที่รออนุมัติ
- ตัวเลขสำคัญของฟาร์ม
- AI insight เฉพาะที่มี action ต่อได้

### Component ที่ควรแยก

- TodaySummary
- SowAlerts
- FarmStatistics
- FinancialSnapshot
- MaintenanceAlert
- UpcomingEvents
- WeatherWidget
- QuickActions

### Definition of Done

- `Dashboard.tsx` ลดขนาด/ความรับผิดชอบลงอย่างชัดเจน
- widget หลักแยก component
- dashboard โหลดเฉพาะข้อมูลจำเป็น
- ไม่มีข้อมูลที่ผู้ใช้ action ต่อไม่ได้มาบดบังข้อมูลสำคัญ

---

## B3. Unified Status & Feedback

ทุก workflow ต้องมีรูปแบบสถานะสม่ำเสมอ:

- กำลังโหลด
- สำเร็จ
- บันทึกแล้ว
- รอซิงก์
- ล้มเหลว
- ไม่มีสิทธิ์
- ไม่มีข้อมูล
- ต้องลองใหม่

### Definition of Done

- ไม่ใช้ข้อความ error ต่างรูปแบบกระจัดกระจาย
- ผู้ใช้รู้ว่าข้อมูลถูกบันทึกหรือยัง
- retry path ชัดเจน

---

# Phase C — Frontend Refactor & Maintainability

## C1. Split Large Pages

ไฟล์ที่ต้องจัดลำดับ refactor ก่อน:

1. `Dashboard.tsx`
2. `ScanReceipt.tsx`
3. `SowDetails.tsx`
4. `UserManagement.tsx`
5. `ScanAI.tsx`
6. `BillList.tsx`

### หลักการ

- UI component แยกจาก business logic
- data access ผ่าน service/hook
- หลีกเลี่ยง component ที่ทำหลาย responsibility

### Definition of Done

- page หลักเป็น composition layer
- business logic หลักมี hook/service ชัดเจน
- testable unit เพิ่มขึ้น

---

## C2. Add Use-case Hooks

เพิ่ม layer ระหว่าง UI กับ services เช่น:

- `useSowLifecycle()`
- `useBillScanner()`
- `usePayroll()`
- `useFarmDashboard()`
- `useMaintenanceWorkflow()`

### เป้าหมาย

ลดการเรียกหลาย service และ business logic โดยตรงใน page component

---

## C3. Route-level Lazy Loading

เปลี่ยน route imports หลักเป็น lazy loading เพื่อให้ผู้ใช้ไม่ต้องดาวน์โหลดทุกหน้าในครั้งแรก

### Definition of Done

- route สำคัญใช้ `React.lazy`
- มี Suspense/loading UI ที่เหมาะสม
- bundle หลักลดลงจาก baseline อย่างชัดเจน
- ไม่มี regression ของ routing/auth

---

# Phase D — Data Model & Permissions

## D1. Add `farmId` Strategy

เตรียมข้อมูลสำคัญให้รองรับการแยกฟาร์ม แม้ปัจจุบันใช้เพียงฟาร์มเดียว

### Entity ที่ควรพิจารณา

- sows
- events
- tasks
- pig_sales
- bills
- bill_items
- maintenance_requests
- chat_rooms
- feed_recipes
- pig_prices

### ข้อกำหนด

- ห้าม bulk migrate production โดยไม่มี backup
- เริ่มจาก schema/adapter + test ก่อน
- รองรับข้อมูล legacy ระหว่าง migration

---

## D2. Permission Matrix

ออกแบบสิทธิ์ก่อนเพิ่ม role จริง

ตัวอย่าง role ในอนาคต:

- OWNER/ADMIN
- MANAGER
- ACCOUNTING
- FARM_STAFF
- VET

ต้องกำหนดว่าแต่ละ role ทำอะไรได้กับ:

- farm records
- payroll
- sales
- bills
- maintenance
- settings
- user management

---

## D3. Remove Long-term Hard-coded Admin Bypass

ลดการพึ่ง hard-coded admin email ใน Firestore Rules

เป้าหมายระยะยาว:

- role จาก user profile หรือ custom claims
- emergency/recovery mechanism ที่มีเอกสารชัดเจน

ห้ามนำ bypass ออกทันทีโดยไม่มี recovery plan

---

## D4. Audit Trail

ข้อมูลสำคัญต้องรู้ว่า:

- ใครสร้าง
- ใครแก้
- แก้อะไร
- เมื่อไร
- สถานะเดิม/ใหม่สำหรับธุรกรรมสำคัญ

เริ่มจาก:

- payroll
- salary advance
- sale
- maintenance status
- critical sow records

---

# Phase E — Offline & Field Reliability

## E1. PWA Acceptance Test

ทดสอบบน Android จริง:

- install
-เปิด app จาก home screen
- login/relogin
- update version
- offline shell
- network reconnect

---

## E2. Offline Data Strategy

เป้าหมายต่อไปไม่ใช่แค่ “หน้าเปิดได้ตอน offline” แต่ต้องรองรับงานภาคสนาม

แนวทาง:

`User Action → Local Queue → Pending Sync → Network Return → Firestore Sync → Confirm`

### Definition of Done

อย่างน้อย 1 workflow ภาคสนามรองรับ pending sync ได้จริงก่อนขยายไป workflow อื่น

แนะนำเริ่มจาก:

- event/task หรือ
- sow note

ไม่แนะนำเริ่มจาก payroll/financial transaction

---

# Phase F — Performance & Dependency Health

## F1. Bundle Reduction

- baseline bundle size ก่อนแก้
- lazy routes
- split heavy libraries
- ตรวจ duplicate imports
- ลด lottie/image overhead ที่ไม่จำเป็น

### Target

ลด initial JavaScript payload อย่างมีนัยสำคัญ โดยไม่ทำลาย UX

---

## F2. Dependency Remediation

จัดการ vulnerabilities แบบมีลำดับ:

1. critical
2. high
3. moderate

ข้อห้าม:

- ห้าม `npm audit fix --force` โดยไม่ review
- ทุก major upgrade ต้อง build + regression test
- `xlsx` ต้องมี risk decision หรือ replacement plan หากไม่มี safe automatic fix

---

# Phase G — AI as Workflow Assistant

AI ไม่ควรเป็นเพียงหน้าแยก แต่ควรช่วยงานจริง

ตัวอย่าง:

- Sow: แจ้งความเสี่ยงจากประวัติ
- Receipt: ชี้รายการผิดปกติ/ราคาสูง
- Feed: เปรียบเทียบต้นทุนสูตร
- Dashboard: แนะนำเรื่องที่ควรจัดการก่อน

### หลักการ

- AI insight ต้องอธิบายที่มาได้
- ผู้ใช้ต้องเป็นคนยืนยันข้อมูลสำคัญ
- AI ห้ามเขียน financial/farm critical data โดยอัตโนมัติโดยไม่มี confirmation

---

# Phase H — Business Intelligence

หลัง workflow และข้อมูลเชื่อถือได้แล้วจึงเริ่มส่วนนี้

## ตัวชี้วัดเป้าหมาย

- รายรับ/รายจ่ายรายเดือน
- feed cost trend
- cost per pig
- sow performance
- maintenance backlog
- payroll cost
- sale price trend
- farm operating summary

ห้ามทำ dashboard analytics จากข้อมูลที่ยังไม่มี data quality verification

---

# Testing Strategy

ต้องมีอย่างน้อย 3 ระดับ

## Unit

- calculations
- payroll
- sale totals
- sow lifecycle utilities

## Integration

- Firestore service
- API authorization
- AI response handling
- storage

## E2E / Critical Smoke

อย่างน้อย 5 เส้นทาง:

1. Login → Dashboard
2. Add Sow → View → Update
3. Scan Bill → Review → Save → History
4. New Sale → Summary
5. Advance Request → Approval → Payroll Summary

---

# Work Order / Priority

## P0 — เสถียรภาพก่อน

- Production Verification
- Gemini success path
- Firebase CRUD
- Storage CRUD
- role/security verification
- 5 core workflow tests

## P1 — Core Consolidation

- Dashboard refactor
- navigation consolidation
- ScanReceipt refactor
- route lazy loading
- bundle reduction
- dependency critical/high remediation

## P1 — Data Foundation

- farmId strategy
- permission matrix
- audit trail
- transaction consistency

## P2 — Field UX

- unified feedback
- offline pending sync
- PWA acceptance test
- notification consolidation

## P2 — Business Intelligence

- farm cost
- revenue/expense
- feed cost
- farm KPIs

---

# Definition of Complete สำหรับ Consolidation Program

โปรแกรมนี้ถือว่าผ่านเมื่อ:

- 5 core workflows ใช้งานจริงแบบ end-to-end ได้
- navigation ลดความซับซ้อนและทดสอบบน mobile แล้ว
- Dashboard แสดงสิ่งที่ต้องจัดการวันนี้เป็นหลัก
- large pages หลักถูก refactor
- initial bundle ลดลงจาก baseline อย่างชัดเจน
- Firestore permissions มี policy ที่ตรวจสอบได้
- schema มีทิศทาง `farmId`
- critical financial actions มี audit trail
- PWA ผ่าน install/offline/reconnect acceptance test
- automated tests ครอบคลุม critical workflows
- `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`, `KNOWN_ISSUES.md` สะท้อนสถานะจริงตรงกับโค้ด

---

# สิ่งที่ห้ามทำระหว่าง Consolidation

- ห้ามเพิ่ม feature ใหญ่เพราะ “น่าสนใจ” โดยยังไม่ปิด workflow หลัก
- ห้าม redesign ทั้งระบบพร้อมกัน
- ห้าม migration production แบบ destructive
- ห้ามเปลี่ยน Firebase rules โดยไม่มี test
- ห้ามใช้ AI auto-write ข้อมูลสำคัญโดยไม่มีผู้ใช้ยืนยัน
- ห้ามปิด issue ด้วยเพียง build ผ่าน หาก workflow จริงยังไม่ถูกพิสูจน์

---

# งานแรกที่ทีมต้องเริ่ม

**Task 1: Core Workflow Verification Baseline**

สร้าง verification matrix สำหรับ 5 workflow หลัก:

1. Sow Lifecycle
2. Receipt → Expense
3. Pig Sale
4. Payroll & Advance
5. Maintenance

สำหรับแต่ละ workflow ต้องระบุ:

- entry point
- data collections/services
- user roles
- happy path
- error path
- permission test
- reload/relogin persistence
- mobile usability
- current blockers

จากนั้นเลือก workflow ที่มี blocker สูงสุดเป็นงาน implementation ถัดไป
