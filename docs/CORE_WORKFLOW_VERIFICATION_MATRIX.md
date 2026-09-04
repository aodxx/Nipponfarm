# Core Workflow Verification Baseline

อัปเดต: **4 กันยายน 2026**  
ขอบเขต: static code verification และการกำหนด acceptance evidence เท่านั้น ยังไม่มีการเขียน/แก้/ลบข้อมูล production

## วิธีอ่านสถานะ

- **PARTIAL**: พบเส้นทางในโค้ดและเงื่อนไขบางส่วน แต่ยังไม่มีหลักฐาน end-to-end จาก test account
- **NOT TESTED**: ยังไม่มีการทดสอบ runtime ตาม checklist
- **BLOCKED**: มีข้อจำกัดทางระบบหรือสิทธิ์ที่ทำให้ยังพิสูจน์ workflow ไม่ครบ
- การตรวจรอบนี้ไม่ตีความว่า build ผ่านเท่ากับ workflow production-ready

## สรุปผล

| Workflow | Entry point | สถานะปัจจุบัน | Risk | Implementation ถัดไป |
|---|---|---:|---:|---|
| Sow Lifecycle | `/sows` → `/sows/add` → `/sows/:id` | PARTIAL | High | หลัง payroll; เพิ่ม E2E และตรวจ ownership/record linking |
| Receipt → Expense | `/scan` → `/scan/history` | PARTIAL | High | หลัง payroll; ป้องกัน duplicate save และทดสอบ AI failure |
| Pig Sale | `/sales` → `/sales/new` | PARTIAL | High | หลัง payroll; เพิ่ม calculation/permission regression |
| Payroll & Advance | `/payroll/base-salary`, `/payroll/advance`, `/payroll/advance-approval`, `/payroll/summary` | **BLOCKED** | **Critical** | **งาน implementation ถัดไป** |
| Maintenance | `/maintenance` → `/maintenance/new` → `/maintenance/:id` | PARTIAL | High | หลัง payroll; ทำ state transition และ audit verification |

## Matrix ราย workflow

### 1. Sow Lifecycle — PARTIAL

| หัวข้อ | หลักฐาน/ผลตรวจ |
|---|---|
| Entry point | `src/App.tsx`: `/sows`, `/sows/add`, `/sows/:id`; `SowList.tsx`, `AddSow.tsx`, `SowDetails.tsx` |
| Service/API | `src/services/sowService.ts`: เพิ่ม/อ่าน/แก้ไข sow และบันทึก event/task ที่เกี่ยวข้อง |
| Collections | `sows`, `events`, `tasks`; อาจมี Storage สำหรับภาพ/วิดีโอจากรายละเอียดแม่พันธุ์ |
| Roles | `ProtectedRoute`; Firestore อนุญาต active user อ่าน/สร้าง/แก้ไข และ admin ลบสำหรับ `sows`, `events`, `tasks` |
| Happy path ที่ต้องทดสอบ | เพิ่มแม่พันธุ์ → เปิดรายละเอียด → บันทึก event สำคัญ → ตรวจ task/calendar → แก้ข้อมูล → reload/relogin |
| Failure path ที่ต้องทดสอบ | ฟอร์มไม่ครบ, Firestore/network failure, event/task link ไม่สำเร็จ, record ซ้ำ, session หมดอายุ |
| Permission test | unauthenticated เข้าไม่ได้; pending/resigned ถูกปฏิเสธ; staff ทดสอบ read/create/update; non-admin ทดสอบ delete ต้องถูกปฏิเสธ; wrong-owner ต้องไม่แก้ record ที่ไม่ใช่ของตนตาม policy ที่กำหนด |
| Reload/relogin persistence | **NOT TESTED**; ต้องตรวจ sow, event และ task หลัง reload และ login ใหม่ |
| Mobile usability | **NOT TESTED**; ต้องทดสอบเส้นทางเพิ่ม/บันทึก event บนจอเล็กและการอัปโหลดรูป |
| Current blocker | ไม่มี E2E/integration harness; rules ของ `sows/events/tasks` ยังใช้ active-user policy กว้างและต้องยืนยัน ownership/farm boundary |
| Owner/action | Developer: เพิ่ม smoke/E2E และกำหนด expected ownership; Tester: รันด้วย test account แยกข้อมูลจริง |

### 2. Receipt → Expense — PARTIAL

| หัวข้อ | หลักฐาน/ผลตรวจ |
|---|---|
| Entry point | `src/App.tsx`: `/scan`, `/scan/history`; `ScanReceipt.tsx`, `BillList.tsx` |
| Service/API | `src/services/billService.ts`: `saveScannedBill`, `getBills`, `getBillItems`; AI ผ่าน `/api/receipt-analyze` |
| Collections/Storage | `bills`, `bill_items`; ภาพบิลผ่าน image upload service/Storage ตาม runtime configuration |
| Roles | หน้าอยู่หลัง `ProtectedRoute`; Firestore create/update ตรวจ active user และ `userId`; delete เป็น admin-only |
| Happy path ที่ต้องทดสอบ | ถ่าย/เลือกภาพ → AI วิเคราะห์ → review/edit → save bill + items → เปิด history → reload |
| Failure path ที่ต้องทดสอบ | AI timeout/invalid response, ภาพไม่ใช่บิล, อ่านข้อมูลไม่ครบ, upload failure, Firestore save failure, retry หลัง partial save |
| Permission test | unauthenticated/pending/resigned ถูกปฏิเสธ; staff สร้าง record ด้วย UID ตนเอง; wrong-owner update ต้องถูกปฏิเสธ; non-admin delete ต้องถูกปฏิเสธ |
| Reload/relogin persistence | **NOT TESTED**; ต้องยืนยัน bill และ bill items ไม่หายและไม่ซ้ำหลัง reload/relogin |
| Mobile usability | **NOT TESTED**; ต้องทดสอบกล้อง, drag/drop fallback, review form และ feedback บน Android |
| Current blocker | ยังไม่มีหลักฐาน AI success path จริง, ไม่มี automated duplicate-save test, และ bill/bill_items read policy ยังกว้างระดับ active user |
| Owner/action | Developer: แยก scanning/review/save/error state และ idempotency; Tester: ใช้ภาพทดสอบที่ไม่มีข้อมูลอ่อนไหว |

### 3. Pig Sale — PARTIAL

| หัวข้อ | หลักฐาน/ผลตรวจ |
|---|---|
| Entry point | `src/App.tsx`: `/sales`, `/sales/new`; `SalesList.tsx`, `NewSale.tsx` |
| Service/API | `src/services/saleService.ts`: `savePigSale`, `subscribeToPigSales`, `getPigSaleById`, `deletePigSale` |
| Collection | `pig_sales`; อาจแนบเอกสาร/ภาพผ่าน upload service |
| Roles | หน้าอยู่หลัง `ProtectedRoute`; service ผูก `userId` จาก `auth.currentUser`; Firestore rules ปัจจุบัน active user อ่าน/สร้าง/แก้ไข และ admin ลบ |
| Happy path ที่ต้องทดสอบ | กรอก buyer/date → บันทึกน้ำหนักและจำนวน → ตรวจ net weight/ยอดรวม → save → เปิดประวัติ/summary |
| Failure path ที่ต้องทดสอบ | น้ำหนักไม่ถูกต้อง, จำนวนไม่ตรง, ราคาว่าง/ติดลบ, save failure, refresh ระหว่างบันทึก, duplicate submission |
| Permission test | unauthenticated/pending/resigned ถูกปฏิเสธ; staff create/read/update; non-admin delete ต้องถูกปฏิเสธ; ตรวจว่า update/delete ไม่ข้าม ownership ตาม business policy |
| Reload/relogin persistence | **NOT TESTED**; ต้องตรวจรายการขายและยอดรวมหลัง reload/relogin |
| Mobile usability | **NOT TESTED**; ต้องทดสอบตารางชั่งน้ำหนักและปุ่มบันทึกบนจอเล็ก |
| Current blocker | ยังไม่มี unit/integration test สำหรับยอดรวมและไม่มีหลักฐาน production CRUD; Firestore rule อนุญาต active user update โดยไม่ได้บังคับ owner field |
| Owner/action | Developer: เพิ่ม calculation tests และ owner/audit decision; Tester: ใช้ sale test record แยกจากรายการจริง |

### 4. Payroll & Advance — BLOCKED / Critical

| หัวข้อ | หลักฐาน/ผลตรวจ |
|---|---|
| Entry point | `/payroll/base-salary` (admin), `/payroll/advance`, `/payroll/advance-approval` (admin), `/payroll/summary`; pages ใต้ `src/pages/payroll/` |
| Service/API | `src/services/employeeService.ts`: salary/advance/employee transaction; `src/services/payrollService.ts`: payroll slips; email ผ่าน `/api/send-payslip-email` |
| Collections/Storage | `employee_salaries`, `salary_advances`, `EmployeeTransaction`, `employee_transactions`, `payroll_slips`; สลิปอาจใช้ image storage |
| Roles | Base salary/approval อยู่หลัง `AdminRoute`; staff request advance และดูข้อมูลตนเอง; Firestore rules จำกัด payroll slip/employee salary/transaction ส่วนใหญ่ให้ admin และ advance owner/admin |
| Happy path ที่ต้องทดสอบ | Base Salary → staff ส่ง Advance Request → admin approve/reject + แนบสลิป → Payroll Summary คำนวณ → สร้าง/อ่าน payslip → ส่ง email test |
| Failure path ที่ต้องทดสอบ | จำนวนเงินไม่ถูกต้อง, request ซ้ำ, approve ซ้ำ, reject แล้วแก้ไม่ได้, upload สลิปล้มเหลว, email ล้มเหลว, concurrent approval, network retry |
| Permission test | unauthenticated/pending/resigned ถูกปฏิเสธ; staff อ่าน/สร้างเฉพาะของตน; staff ห้าม approve/แก้ salary/payslip; admin approve และดูภาพรวม; wrong-owner read/update ต้องถูกปฏิเสธ |
| Reload/relogin persistence | **NOT TESTED**; ต้องยืนยัน request/status/summary/payslip หลัง reload/relogin |
| Mobile usability | **NOT TESTED**; ต้องทดสอบ request และ approval บนจอเล็ก รวม feedback ว่าบันทึกสำเร็จหรือยัง |
| Current blocker | เป็นธุรกรรมการเงินแต่ยังไม่มี audit trail สำหรับ approval/change, ไม่มี regression/unit test สูตร payroll, ยังไม่มี production integration evidence และต้องตรวจ consistency ระหว่าง `EmployeeTransaction` กับ `employee_transactions` |
| Owner/action | **Implementation ถัดไป: Developer เพิ่ม transaction/audit boundary และ tests ก่อนเปลี่ยน behavior; Tester ตรวจ owner/admin matrix ด้วย test account; ห้ามใช้ข้อมูลเงินจริง** |

**เหตุผลที่เลือกเป็นงานถัดไป:** มีความเสี่ยงด้านการเงินสูงสุด, มีหลาย state transition, เกี่ยวข้องกับข้อมูลเงินเดือน/บัญชีธนาคาร และ Definition of Done กำหนดทั้ง request/approve/reject, summary, payslip และ owner/admin permission ให้ผ่านก่อนถือว่าใช้งานจริง

### 5. Maintenance — PARTIAL

| หัวข้อ | หลักฐาน/ผลตรวจ |
|---|---|
| Entry point | `src/App.tsx`: `/maintenance`, `/maintenance/new`, `/maintenance/:id`; `MaintenanceList.tsx`, `NewMaintenanceRequest.tsx`, `MaintenanceDetails.tsx` |
| Service/API | `src/services/maintenanceService.ts`: `createMaintenanceRequest`, `updateMaintenanceStatus`, `deleteMaintenanceRequest` |
| Collections/Storage | `maintenance_requests`; ภาพ/วิดีโอผ่าน Storage/R2 ตาม runtime configuration |
| Roles | อ่านได้สำหรับ active user; create ต้องเป็น active user และ `userId == request.auth.uid`; update เป็น admin หรือ owner ที่ผ่าน validation; delete admin-only |
| Happy path ที่ต้องทดสอบ | แจ้งปัญหา → รับเรื่อง/เปลี่ยน `IN_PROGRESS` → ดำเนินการ → `RESOLVED` → ผู้สร้างเห็นสถานะและประวัติ |
| Failure path ที่ต้องทดสอบ | ข้อมูลไม่ครบ, invalid transition, upload failure, update conflict, delete request โดยไม่มีสิทธิ์ |
| Permission test | unauthenticated/pending/resigned ถูกปฏิเสธ; owner สร้างและเห็นรายการ; owner แก้เฉพาะที่ policy อนุญาต; non-owner update/delete ถูกปฏิเสธ; admin เปลี่ยนสถานะได้ |
| Reload/relogin persistence | **NOT TESTED**; ต้องตรวจ status/resolvedAt และประวัติหลัง reload/relogin |
| Mobile usability | **NOT TESTED**; ต้องทดสอบสร้างเรื่องพร้อมรูปจากมือถือและดูสถานะล่าสุด |
| Current blocker | ยังไม่มี state-transition/audit test; Storage rules ของ `maintenance` อนุญาต signed-in users กว้างเกิน least privilege |
| Owner/action | Developer: เพิ่ม transition contract และ audit evidence; Tester: ทดสอบ owner/non-owner/admin ด้วย test records |

## Cross-workflow acceptance run

ก่อนปิด Task 1 ต้องมีหลักฐานต่อไปนี้สำหรับแต่ละ workflow โดยใช้ test account และ test record ที่ค้นหา/ลบได้ง่าย:

1. เปิด entry point และตรวจ auth guard
2. ทำ happy path ครบตามลำดับ
3. บันทึก status code/error หรือ Firestore error ที่เกิดขึ้นใน failure path
4. ทดสอบ permission matrix อย่างน้อย unauthenticated, pending/staff และ admin ตามขอบเขต
5. reload และ relogin แล้วตรวจ persistence
6. ทดสอบ mobile viewport หรืออุปกรณ์ Android จริงตามความพร้อม
7. บันทึก timestamp, environment, test record ID และผล `PASS/PARTIAL/FAIL/NOT TESTED`

## งาน implementation ถัดไปที่เลือก

**Payroll & Advance — Security, Consistency & Audit Baseline**

ขอบเขตที่แนะนำสำหรับงานถัดไป:

- เพิ่ม unit tests สำหรับสูตร advance/payroll และ net salary
- กำหนด transaction identity/idempotency สำหรับ request, approval และ payslip
- เพิ่ม audit record สำหรับ approve/reject/change โดยไม่เก็บข้อมูลลับเกินจำเป็น
- ตรวจและทำให้ collection naming (`EmployeeTransaction` กับ `employee_transactions`) สอดคล้องโดยไม่ migrate production แบบ destructive
- เพิ่ม integration tests ของ owner/admin/wrong-owner ก่อนแก้ Firestore rules
- ทดสอบ build/lint และทดสอบด้วย test data ก่อนพิจารณา deploy

ห้ามเริ่ม implementation นี้ด้วยการลบ collection, เปลี่ยน Firebase project, เปลี่ยน rules production หรือแก้ข้อมูลเงินจริง
