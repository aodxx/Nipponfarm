# Niponfarm Core Workflow Verification Matrix

**Task:** `NP-WF-03`
**Owner:** `NIPON-QA-01` (Team B — Core Workflow & Quality)
**Branch:** `test/core-workflow-matrix-2026-09-04`
**Prepared (UTC):** 4 September 2026
**Reviewed repository commit:** `d1d6848` (`docs: assign two-team workboard tasks`)
**Environment:** Static repository/code/rules review only; no isolated Firebase test project, Preview URL, test account, or runtime CRUD run supplied
**Overall verification status:** `NOT RUN / BLOCKED`

## Scope and safety boundary

เอกสารนี้เป็น **verification matrix และ evidence preparation** ไม่ใช่ผลการรับรองระบบ การตรวจครั้งนี้อ้างอิง route, page, service, type, Firestore/Storage rules และ project status ที่มีอยู่ใน repository เท่านั้น การมีเส้นทางหรือฟังก์ชันใน source ไม่ถือเป็นหลักฐานว่า workflow ทำงานจริงใน Preview หรือ production และไม่มีการประกาศผล runtime ที่ยังไม่ได้รัน

> ห้ามใช้ production credentials, ห้ามสร้าง/แก้ไข/ลบ production data, ห้าม deploy rules หรือ integrations และห้ามบันทึก token, password, API key, bank detail, PII, raw receipt image หรือข้อมูลส่วนบุคคลใน evidence นี้ การทดสอบในอนาคตต้องใช้ isolated Firebase project/Preview และ synthetic test accounts/data เท่านั้น

### สถานะที่ใช้ในเอกสารนี้

| Status | ความหมาย |
|---|---|
| `OBSERVED (STATIC)` | พบ route, service, data model หรือ rule จากการอ่าน source แล้ว แต่ยังไม่ใช่ runtime result |
| `NOT RUN` | มี acceptance step ที่ต้องรัน แต่ยังไม่มี test execution/evidence |
| `BLOCKED` | ยังรันอย่างปลอดภัยไม่ได้เพราะขาด isolated environment, credential/destination, approval หรือมีข้อจำกัดเชิงระบบที่ต้องแก้/ตัดสินใจก่อน |
| `NOT MET` | Definition of Done ยังไม่มีหลักฐานเพียงพอ จึงยังห้าม sign-off |

## Evidence protocol

ทุก test record ที่จะเพิ่มภายหลังต้องมี `evidence_id`, environment, commit SHA, Preview URL/project ID ที่ไม่ใช่ production, actor label, operation, expected result, actual status/code หรือ redacted error code, UTC timestamp, redacted artifact reference, cleanup result และ reviewer ห้ามใส่ bearer token, Firebase ID token, รูปบิลจริง, bank detail, email body หรือ provider secret

Actor labels ที่อนุญาตสำหรับ isolated run คือ `ADMIN_TEST`, `STAFF_TEST`, `PENDING_TEST`, `RESIGNED_TEST`, `WRONG_OWNER_TEST` และ `UNAUTHENTICATED` โดยต้องบันทึก label เท่านั้น ไม่บันทึก credential หรือ email จริง

## Current implementation references

| Area | Current reference and static finding |
|---|---|
| Route and guards | `src/App.tsx:43-101,114-145` มี `ProtectedRoute`; `PENDING` แสดง first-time flow, `RESIGNED` ถูกกั้น และ `AdminRoute` จำกัด `ADMIN` สำหรับ base salary/advance approval |
| Sow | `src/services/sowService.ts:17-49,53-105,146-272` ใช้ `sows`, `events`, `tasks`; event recording เป็น batch update ที่เปลี่ยน state และสร้าง/complete/cancel tasks |
| Receipt → Expense | `src/services/billService.ts:45-123,181-210` บันทึก `bills` และ `bill_items` ใน batch; `src/pages/ScanReceipt.tsx:604-624` เชื่อมการวิเคราะห์และ save; AI route คือ `/api/receipt-analyze` |
| Pig Sale | `src/services/saleService.ts:41-82` มี create/list/get/delete สำหรับ `pig_sales`; ไม่พบ service update ที่ใช้โดยหน้าปัจจุบัน |
| Payroll | `src/services/employeeService.ts:19-228`, `src/services/payrollService.ts:6-87`, `src/lib/payrollUtils.ts:44-101`, `src/lib/payrollAudit.ts:44-74` ครอบคลุม advances, salaries, slips, transactions และ audit |
| Maintenance | `src/services/maintenanceService.ts:17-80` ใช้ `maintenance_requests`, create/status update/delete; status model คือ `PENDING`, `IN_PROGRESS`, `RESOLVED` |
| Firestore permission baseline | `firestore.rules:162-210` ให้ active-user policy กว้างกับ `sows`, `events`, `tasks`, `pig_sales`, `bills`, `bill_items`; payroll มี owner/admin boundary ต่างกัน และ audit เขียนได้เฉพาะ admin |
| Storage permission baseline | `storage.rules:13-19` ให้ signed-in user read/write path `bills` และ `maintenance`; least-privilege ownership ยังไม่พิสูจน์ |
| Project evidence baseline | `CURRENT_STATUS.md:27-39`, `KNOWN_ISSUES.md:7-18` ระบุว่ายังไม่มี Firebase CRUD/permission/runtime evidence, AI production เป็น `AI_NOT_CONFIGURED`, และยังไม่มี E2E ของ core workflows |

## Cross-workflow summary

| Workflow | Entry point | Static coverage | Runtime status | Primary blocker | Planned evidence IDs |
|---|---|---|---|---|---|
| Sow Lifecycle | `/sows` → `/sows/add` → `/sows/:id` → `/calendar` | `OBSERVED (STATIC)` | `NOT RUN` | ไม่มี E2E/isolated CRUD; ownership/farm boundary ของ `sows/events/tasks` ยังไม่เข้ม | `SOW-H-*`, `SOW-E-*`, `SOW-P-*` |
| Receipt → Expense | `/scan` → review/save → `/scan/history` | `OBSERVED (STATIC)` | `NOT RUN / BLOCKED` | ไม่มี isolated AI success path; duplicate-save และ bill ownership ยังไม่พิสูจน์ | `REC-H-*`, `REC-E-*`, `REC-P-*` |
| Pig Sale | `/sales` → `/sales/new` | `OBSERVED (STATIC)` | `NOT RUN` | ไม่มี calculation/CRUD runtime evidence; rule update/read ไม่ผูก owner และไม่พบ edit path | `SALE-H-*`, `SALE-E-*`, `SALE-P-*` |
| Payroll & Advance | `/payroll/base-salary`, `/payroll/advance`, `/payroll/advance-approval`, `/payroll/summary` | `OBSERVED (STATIC)` | `BLOCKED` | ธุรกรรมการเงินยังไม่มี isolated Firebase/emulator evidence และ audit cleanup boundary | `PAY-H-*`, `PAY-E-*`, `PAY-P-*` |
| Maintenance | `/maintenance` → `/maintenance/new` → `/maintenance/:id` | `OBSERVED (STATIC)` | `NOT RUN` | ไม่มี state-transition/audit evidence; Storage ownership กว้าง | `MNT-H-*`, `MNT-E-*`, `MNT-P-*` |

---

# 1. Sow Lifecycle

**Workflow status:** `OBSERVED (STATIC)`; acceptance runtime `NOT RUN`; full DoD `NOT MET`
**Implementation references:** `src/App.tsx:116,130-132`, `src/pages/SowList.tsx`, `src/pages/AddSow.tsx`, `src/pages/SowDetails.tsx`, `src/services/sowService.ts`, `src/types/index.ts:23-66`

## Entry point

ผู้ใช้ที่ authenticated เข้า `/sows` เพื่อดูรายการแม่พันธุ์ กดเพิ่มที่ `/sows/add` และเปิดรายละเอียดที่ `/sows/:id` การบันทึก event และ task ทำจากรายละเอียดแม่พันธุ์ ส่วนงานที่ generate จาก cycle engine แสดงร่วมกับ `/calendar` และ dashboard task subscription

## Collections and services

| Resource | Static use |
|---|---|
| `sows` | `addSow`, `subscribeToSows`, `subscribeToSow`, `updateSowPen`; fields หลักคือ `sowId`, `breed`, `birthDate`, `entryDate`, `status`, `parity`, `penId`, `userId` |
| `events` | `subscribeToSowEvents`, `recordEvent`; ผูกด้วย `sowId`, มี `type`, `date`, `parity`, `details`, `recordedBy` |
| `tasks` | `subscribeToSowTasks`, `subscribeToAllPendingTasks`, `recordEvent`; cycle engine สร้างหรือเปลี่ยน task เป็น `COMPLETED`/`CANCELLED` |
| Storage/video | `SowDetails`/`ScanAI` อาจใช้ attachment/video path ตาม runtime configuration; ยังไม่มี isolated Storage evidence |
| Services | `sowService.ts`, `cycleEngine.ts`; event write ใช้ Firestore batch และอาจทำ destructive CULL ที่ลบ sow, events และ tasks ที่เกี่ยวข้อง |

## Roles and permission expectations

`ProtectedRoute` กั้น unauthenticated, แสดง boundary สำหรับ `PENDING` และ `RESIGNED` ก่อนถึงหน้า workflow ใน rules ปัจจุบัน `sows`, `events`, `tasks` ใช้ `isActiveUser()` สำหรับ read/create/update และให้ `ADMIN` delete (`firestore.rules:162-176`) แต่ยังไม่ตรวจ `userId`/`farmId` ใน operation เหล่านี้ จึงต้องทดสอบ wrong-owner และ cross-farm boundary แยกต่างหาก โดยไม่ตีความ active-user access ว่าปลอดภัยแล้ว

## Happy path matrix

| Evidence ID | Step | Expected | Status |
|---|---|---|---|
| `SOW-H-01` | `STAFF_TEST` เปิด `/sows` | รายการโหลดได้โดยไม่เปิดเผยข้อมูลนอกขอบเขตที่อนุมัติ | `NOT RUN` |
| `SOW-H-02` | เปิด `/sows/add`, กรอก synthetic sow ครบ แล้วบันทึก | สร้าง `sows` 1 record พร้อม `userId` ของ actor และ default `IDLE`/parity `0` | `NOT RUN` |
| `SOW-H-03` | เปิด `/sows/:id` | อ่าน sow record ที่สร้างได้ถูกต้อง | `NOT RUN` |
| `SOW-H-04` | บันทึก event เช่น `HEALTH` หรือ `BREED` | `events` ผูก `sowId`; state update และ task generation/complete ทำใน operation เดียวกันตามที่คาด | `NOT RUN` |
| `SOW-H-05` | เปิด `/calendar` และรายละเอียดอีกครั้ง | task ที่เกี่ยวข้องปรากฏด้วยวันที่/status ถูกต้อง | `NOT RUN` |
| `SOW-H-06` | แก้ข้อมูลที่อนุญาต เช่น pen แล้วตรวจรายการ | ค่า update อ่านกลับได้ และไม่มี record ซ้ำ | `NOT RUN` |

## Error path matrix

| Evidence ID | Fault injection / scenario | Expected handling | Status |
|---|---|---|---|
| `SOW-E-01` | ส่งฟอร์มไม่ครบหรือ date/identifier ไม่ถูกต้อง | UI ปฏิเสธและไม่สร้าง partial record | `NOT RUN` |
| `SOW-E-02` | Firestore/network failure ระหว่าง add หรือ event batch | แสดง failure ที่สื่อสารได้; ไม่ประกาศ save สำเร็จ และตรวจว่าไม่มี partial write | `NOT RUN` |
| `SOW-E-03` | event มี invalid transition หรือ task link ผิด | operation ถูกปฏิเสธ/แจ้ง error โดยไม่ทำให้ state เสียหาย | `NOT RUN` |
| `SOW-E-04` | กดบันทึก event ซ้ำหรือ reload ระหว่าง save | ต้องทราบว่าเกิด record เดียวหรือมี duplicate; หาก duplicate ได้ให้บันทึกเป็น blocker | `NOT RUN` |
| `SOW-E-05` | session หมดอายุ/actor ถูกเปลี่ยนเป็น pending หรือ resigned | operation protected ถูกปฏิเสธและไม่มี write | `NOT RUN` |
| `SOW-E-06` | ทดสอบ CULL | ทำได้เฉพาะ synthetic test record และต้องยืนยัน cascade deletion อย่างตั้งใจ; ห้ามใช้เป็น production cleanup | `BLOCKED` จนมี isolated project และ approval |

## Permission test matrix

| Evidence ID | Actor and operation | Expected | Status |
|---|---|---|---|
| `SOW-P-01` | `UNAUTHENTICATED` เปิด route/อ่าน Firestore | route redirect/login และ protected read ถูกปฏิเสธ | `NOT RUN` |
| `SOW-P-02` | `PENDING_TEST` หรือ `RESIGNED_TEST` read/create/update | ถูกกั้นที่ app และ denied ที่ data boundary | `NOT RUN` |
| `SOW-P-03` | `STAFF_TEST` create/read/update own synthetic sow/event/task | allowed เฉพาะ operation ที่ policy อนุมัติ | `NOT RUN` |
| `SOW-P-04` | `STAFF_TEST` update/delete `WRONG_OWNER_TEST` record | ต้อง denied ตาม intended ownership/farm policy; current broad rules ทำให้เป็น high-priority verification | `NOT RUN` |
| `SOW-P-05` | `STAFF_TEST` delete และ `ADMIN_TEST` delete test record | staff denied; admin allowed ใน isolated project เท่านั้น | `NOT RUN` |

## Reload/relogin persistence

ต้องสร้าง sow และ event/task ใน isolated project แล้ว reload `/sows`, `/sows/:id`, `/calendar`; จากนั้น sign out/sign in ด้วย actor เดิมและตรวจ `sows`, `events`, `tasks`, status, parity และ task dates อีกครั้ง ปัจจุบันยังไม่มี execution หรือ persistence artifact: **`NOT RUN`**

## Mobile usability

ต้องตรวจ viewport โทรศัพท์จริงหรือ device emulation สำหรับเพิ่ม sow, เปิดรายละเอียด, เลือก event, กรอกรายละเอียด, บันทึก และดู calendar/task โดยตรวจ keyboard ไม่บังปุ่ม, touch target, overflow และ feedback ระหว่าง batch save ปัจจุบันยังไม่มี mobile run: **`NOT RUN`**

## Current blockers

Blockers หลักคือยังไม่มี isolated CRUD/E2E harness และไม่มี runtime role evidence; `sows`, `events`, `tasks` ใช้ active-user rule กว้างโดยไม่บังคับ owner/farm boundary; event batch มี cascade CULL ที่เสี่ยงต่อข้อมูลหากใช้ record ผิด; และยังไม่มีหลักฐาน mobile/reload/relogin

## Test data policy and cleanup

ใช้ `sowId` สังเคราะห์ที่มี prefix เช่น `QA-NP-WF03-SOW-<run-id>` พร้อมชื่อ breed/วันที่สมมติ ห้ามใช้ ear tag หรือรูป/วิดีโอของฟาร์มจริง การ run ต้องเริ่มจาก isolated project และบันทึก document IDs แบบไม่ใช่ข้อมูลส่วนบุคคล หากมี test record ให้ cleanup ใน project เดียวกันด้วย admin-approved delete ของ `events`, `tasks`, `sows` และตรวจ missing/read denied หลัง cleanup; ห้ามใช้ CULL เป็นวิธี cleanup โดยอัตโนมัติ ไม่มี record ถูกสร้างในการเตรียม matrix นี้ ดังนั้น cleanup ปัจจุบันคือ **`NOT RUN / n/a`**

## Definition of Done

| Criterion | Required evidence | Current result |
|---|---|---|
| เพิ่มและอ่าน sow ได้จริง | create/read artifact จาก isolated project | `NOT MET — NOT RUN` |
| update ผ่านและไม่สร้าง duplicate | before/after record IDs และ redacted result | `NOT MET — NOT RUN` |
| event, cycle state, calendar/task เชื่อมโยงถูกต้อง | event + task references และ expected state transition | `NOT MET — NOT RUN` |
| unauthorized/wrong-owner ทำ operation ไม่ได้ | role matrix จาก rules/emulator | `NOT MET — NOT RUN` |
| reload/relogin คงข้อมูล | before/after session evidence | `NOT MET — NOT RUN` |
| smoke/E2E และ mobile path ผ่าน | test run artifact + viewport/device result | `NOT MET — NOT RUN` |

---

# 2. Receipt → Expense

**Workflow status:** `OBSERVED (STATIC)`; runtime `NOT RUN / BLOCKED`
**Implementation references:** `src/App.tsx:133-134`, `src/pages/ScanReceipt.tsx`, `src/pages/BillList.tsx`, `src/services/billService.ts:45-210`, `src/services/aiService.ts`

## Entry point

ผู้ใช้ authenticated เปิด `/scan` เพื่อถ่าย/เลือกภาพและวิเคราะห์บิล จากนั้น review/edit แล้วกด save; ประวัติอยู่ที่ `/scan/history` ซึ่งอ่าน `bills` และรายการย่อย `bill_items`

## Collections, services, and integrations

| Resource | Static use |
|---|---|
| `bills` | `saveScannedBill` สร้าง bill document ด้วย `userId`, `billDate`, `vendorName`, `imageUrl`, totals, `referenceNo`, `createdAt`; `getBills` อ่าน history |
| `bill_items` | save เป็น batch เดียวกับ bill โดยผูก `billId`, `description`, quantity, unit price, total, date; `getBillItems` query ตาม `billId` |
| AI | `/api/receipt-analyze` วิเคราะห์ภาพ; current production health ระบุ `aiReady:false`/`AI_NOT_CONFIGURED`, จึงยังไม่มี success evidence |
| Storage/image gateway | base64 image อาจถูก optimize/upload ไป `bills/<userId>/<billId>`; เมื่อ gateway timeout/fail โค้ดมี fallback เก็บ compressed base64 ใน document; Storage rule ปัจจุบันกว้าง |
| Services | `billService.ts`, `aiService.ts`, `imageOptimizer.ts`; save ใช้ batch แต่ยังไม่เห็น idempotency key สำหรับ bill save |

## Roles and permission expectations

หน้าอยู่หลัง `ProtectedRoute` Rules ให้ active user read และ create เมื่อ `incoming().userId == request.auth.uid`; update อนุญาต owner/admin และ delete admin (`firestore.rules:200-210`) แต่ read ของทั้ง `bills` และ `bill_items` เป็น active-user collection read ไม่ได้พิสูจน์ ownership query boundary จึงต้องมี wrong-owner test

## Happy path matrix

| Evidence ID | Step | Expected | Status |
|---|---|---|---|
| `REC-H-01` | `STAFF_TEST` เปิด `/scan` และเลือก synthetic receipt image | capture/input พร้อมโดยไม่ใช้ภาพจริงหรือ PII | `NOT RUN` |
| `REC-H-02` | เรียก analyze ด้วย isolated AI/Preview | ได้ schema ที่อ่านได้ หรือ safe error contract | `BLOCKED` — ไม่มี isolated AI credential/Preview |
| `REC-H-03` | ตรวจและแก้ merchant/date/items/amount | review state แสดงค่าที่แก้ก่อน save | `NOT RUN` |
| `REC-H-04` | กด save หนึ่งครั้ง | สร้าง `bills` 1 และ `bill_items` ที่ผูก `billId` ใน batch เดียว | `NOT RUN` |
| `REC-H-05` | เปิด `/scan/history` และขยาย bill | history อ่าน bill/items และยอดตรงกับ test input | `NOT RUN` |
| `REC-H-06` | reload/relogin แล้วค้นหา reference | record เดิมยังอยู่หนึ่งชุด ไม่เกิด duplicate | `NOT RUN` |

## Error path matrix

| Evidence ID | Fault injection / scenario | Expected handling | Status |
|---|---|---|---|
| `REC-E-01` | AI timeout, 401/5xx, invalid JSON หรืออ่านบิลไม่ครบ | แสดง error/loading/retry ที่ชัดเจน; ไม่ลบ input ที่ผู้ใช้แก้ และไม่สร้าง record โดยไม่ยืนยัน | `BLOCKED` สำหรับ AI runtime; `NOT RUN` สำหรับ UI |
| `REC-E-02` | ภาพไม่ใช่บิล/ภาพเสีย/ไฟล์ใหญ่ | validation หรือ safe analysis failure; no production upload | `NOT RUN` |
| `REC-E-03` | image optimization/upload timeout | fallback behavior ถูกตรวจว่าไม่เกิน document limit และไม่เผยแพร่ข้อมูล | `NOT RUN` |
| `REC-E-04` | Firestore batch save failure หลัง review | แสดง save failure และตรวจ no partial `bills`/`bill_items` | `NOT RUN` |
| `REC-E-05` | retry หรือ double-click save | ต้องไม่สร้าง duplicate bill/items; ปัจจุบันยังไม่มี automated duplicate-save evidence | `NOT RUN` |
| `REC-E-06` | session หมดอายุหรือ actor เปลี่ยนสถานะ | analyze/save protected operation ถูกปฏิเสธอย่างปลอดภัย | `NOT RUN` |

## Permission test matrix

| Evidence ID | Actor and operation | Expected | Status |
|---|---|---|---|
| `REC-P-01` | `UNAUTHENTICATED` เปิด `/scan`/history หรือเรียก protected AI | redirect/login และ API protected denied | `NOT RUN` |
| `REC-P-02` | `PENDING_TEST`/`RESIGNED_TEST` read/create/update | denied ที่ app/data boundary | `NOT RUN` |
| `REC-P-03` | `STAFF_TEST` create own bill/items with own UID | allowed when schema valid | `NOT RUN` |
| `REC-P-04` | `STAFF_TEST` read/update `WRONG_OWNER_TEST` bill/items | denied ตาม intended ownership; broad read rule ต้องถูกพิสูจน์และหาก allowed ผิดให้หยุด | `NOT RUN` |
| `REC-P-05` | `STAFF_TEST` delete; `ADMIN_TEST` delete isolated record | staff denied; admin allowed | `NOT RUN` |

## Reload/relogin persistence

ต้องตรวจ reference, bill totals, image reference และทุก `bill_items` หลัง browser reload; จากนั้น relogin ด้วย actor เดิมและตรวจว่า history มีชุดเดียวและ item count/totals เดิม ปัจจุบันยังไม่มี artifact: **`NOT RUN`**

## Mobile usability

ต้องทดสอบ Android/viewport เล็กสำหรับ camera/file picker, image preview, review/edit fields, keyboard, long item list, save feedback, retry/cancel และ history detail โดยไม่ใช้ภาพบิลจริง ปัจจุบันไม่มี mobile result: **`NOT RUN`**

## Current blockers

ยังไม่มี isolated AI success/failure evidence และ production health เป็น `AI_NOT_CONFIGURED`; ยังไม่มี duplicate-save/idempotency test; `bills`/`bill_items` read policy กว้างระดับ active user; Storage path `bills` ให้ signed-in read/write กว้าง; และยังไม่มี CRUD/ownership/reload/mobile evidence

## Test data policy and cleanup

ใช้ synthetic image ที่สร้างขึ้นสำหรับ test เท่านั้น เช่น receipt ที่มี `QA Vendor`, วันที่สมมติ และจำนวนเงินเล็กน้อย ไม่ใช้ชื่อร้านจริง เลขภาษี บัญชีธนาคาร หรือภาพจาก production บันทึกเฉพาะ bill/item document IDs และ redacted totals ที่จำเป็นต่อการตรวจ เมื่อ run สำเร็จให้ลบ `bill_items` ตาม `billId`, `bills` และ test Storage object จาก isolated project ด้วย admin cleanup แล้ว verify missing; หาก Storage/Firestore cleanup ทำไม่ได้ให้ถือว่า run blocked และห้ามเปลี่ยนไปใช้ production ไม่มี record ถูกสร้างในงานนี้: **cleanup `NOT RUN / n/a`**

## Definition of Done

| Criterion | Required evidence | Current result |
|---|---|---|
| scan → review → save → history ครบ | isolated AI/UI run และ linked bill/items | `NOT MET — BLOCKED/NOT RUN` |
| reload/relogin เห็นข้อมูลเดิม | session persistence artifact | `NOT MET — NOT RUN` |
| AI failure ไม่ทำข้อมูลหาย | safe failure + retained review input evidence | `NOT MET — BLOCKED` |
| duplicate submission ถูกป้องกัน | double-click/retry with one-record proof | `NOT MET — NOT RUN` |
| unauthorized/wrong-owner denied | role/emulator evidence | `NOT MET — NOT RUN` |
| mobile path ใช้ได้ | device/viewport evidence | `NOT MET — NOT RUN` |

---

# 3. Pig Sale

**Workflow status:** `OBSERVED (STATIC)`; runtime `NOT RUN`; full DoD `NOT MET`
**Implementation references:** `src/App.tsx:119,135`, `src/pages/sales/SalesList.tsx`, `src/pages/sales/NewSale.tsx`, `src/services/saleService.ts:41-82`, `src/types/index.ts:107-129`

## Entry point

ผู้ใช้ authenticated เปิด `/sales` เพื่อดูประวัติ และ `/sales/new` เพื่อสร้างรายการขาย หน้าสร้างมี buyer/date, sale type, payment status, จำนวน, ราคา และ weighing records; service ปัจจุบัน expose create/list/get/delete เป็นหลัก

## Collection and service

| Resource | Static use |
|---|---|
| `pig_sales` | `savePigSale` ใช้ `addDoc` เติม `recordedBy`, `userId`, `createdAt`; `subscribeToPigSales` list; `getPigSaleById` get; `deletePigSale` delete |
| Sale payload | `records`, `totalPigs`, `pricePerKg`, `deductions`, `totalNetWeight`, `averageWeight`, `grossTotal`, `netTotal`, `signature`, optional delivery photo |
| Upload/attachments | delivery photo may use optimized URL/base64 according to page/runtime; no isolated upload evidence |

## Roles and permission expectations

`ProtectedRoute` กั้น unauthenticated/pending/resigned ที่ UI layer แต่ Firestore rule ของ `pig_sales` ให้ active user read/create/update และ admin delete (`firestore.rules:162-165`) โดยไม่บังคับ `userId` ใน incoming record หรือ update ดังนั้น staff cross-owner read/update risk ต้องถูกทดสอบก่อน sign-off นอกจากนี้ไม่พบ edit operation ที่เชื่อมใน current page/service แม้ workflow DoD ต้องการแก้ไขรายการขาย

## Happy path matrix

| Evidence ID | Step | Expected | Status |
|---|---|---|---|
| `SALE-H-01` | `STAFF_TEST` เปิด `/sales/new` และกรอก synthetic buyer/date/type | validation ผ่านด้วยข้อมูลไม่อ่อนไหว | `NOT RUN` |
| `SALE-H-02` | เพิ่ม weighing records และตรวจ net/average | net weight และ average weight ตรงกับ input | `NOT RUN` |
| `SALE-H-03` | ตรวจ gross total/net total จากราคาและ deductions | totals คำนวณถูกต้องและไม่ติดลบโดยไม่ตั้งใจ | `NOT RUN` |
| `SALE-H-04` | sign/submit รายการ | สร้าง `pig_sales` 1 record พร้อม actor UID และ reference | `NOT RUN` |
| `SALE-H-05` | กลับ `/sales` และเปิดรายละเอียด/get record | ประวัติอ่านกลับได้ครบและตรงกับ saved payload | `NOT RUN` |
| `SALE-H-06` | ทดสอบ intended edit path | หาก product requirement ต้องแก้ไข ต้องมี UI/service/rule evidence; current implementation ยังไม่พบ path | `BLOCKED` — implementation gap |

## Error path matrix

| Evidence ID | Fault injection / scenario | Expected handling | Status |
|---|---|---|---|
| `SALE-E-01` | จำนวน/น้ำหนักเป็นศูนย์ ติดลบ หรือ format ไม่ถูกต้อง | validation ปฏิเสธและไม่เขียน record | `NOT RUN` |
| `SALE-E-02` | total pigs ไม่ตรงกับ weighing records | submit ถูกปฏิเสธหรือแสดง discrepancy ให้แก้ก่อน save | `NOT RUN` |
| `SALE-E-03` | price/deduction ว่าง ติดลบ หรือคำนวณ overflow | validation/error ชัดเจน; ห้ามบันทึกยอดผิด | `NOT RUN` |
| `SALE-E-04` | Firestore failure/reload ระหว่าง submit | ไม่มีประกาศสำเร็จปลอม และตรวจ duplicate/partial result | `NOT RUN` |
| `SALE-E-05` | double-click submit | สร้างรายการเดียว หรือบันทึก defect หากเกิด duplicate | `NOT RUN` |
| `SALE-E-06` | signature/delivery photo upload failure | sale state และ user feedback ชัด; no unintended production upload | `NOT RUN` |

## Permission test matrix

| Evidence ID | Actor and operation | Expected | Status |
|---|---|---|---|
| `SALE-P-01` | `UNAUTHENTICATED` route/read/create | route redirect and data denied | `NOT RUN` |
| `SALE-P-02` | `PENDING_TEST`/`RESIGNED_TEST` create/update | denied at app/data boundary | `NOT RUN` |
| `SALE-P-03` | `STAFF_TEST` create/read own synthetic sale | allowed only with valid actor data | `NOT RUN` |
| `SALE-P-04` | `STAFF_TEST` read/update `WRONG_OWNER_TEST` sale | must be denied by intended owner/farm policy; current rules are broad and require emulator evidence | `NOT RUN` |
| `SALE-P-05` | `STAFF_TEST` delete vs `ADMIN_TEST` delete | staff denied; admin allowed in isolated project | `NOT RUN` |

## Reload/relogin persistence

ต้องตรวจ sale reference, buyer/date, records, weight totals, deductions, net total และ payment status หลัง reload และ relogin; ปัจจุบันไม่มี CRUD/persistence artifact: **`NOT RUN`**

## Mobile usability

ต้องตรวจ numeric keyboard, dynamic weighing table, horizontal overflow, signature/photo controls, total visibility, sticky/accessible save action และ error feedback บนจอเล็ก ปัจจุบันไม่มี mobile run: **`NOT RUN`**

## Current blockers

ยังไม่มี calculation/unit integration evidence สำหรับ sale totals และไม่มี isolated CRUD; Firestore rule ให้ active user update โดยไม่บังคับ ownership; current source ยังไม่แสดง edit operation แม้ DoD ระบุ create/read/edit; ยังไม่มี duplicate-submit, permission, reload/relogin หรือ mobile evidence

## Test data policy and cleanup

ใช้ synthetic buyer เช่น `QA Buyer NP-WF03`, vehicle plate placeholder ที่ไม่ใช่ทะเบียนจริง, sale reference prefix `QA-NP-WF03-SALE-<run-id>`, น้ำหนักและราคาจำนวนน้อยเพื่อไม่สับสนกับข้อมูลจริง ห้ามใช้ buyer email/phone/ทะเบียนจริงหรือรูปส่งมอบจริง เมื่อ run เสร็จให้ admin ลบ `pig_sales` test record ใน isolated project และตรวจ missing; ไม่มี delete operation จาก staff และไม่มี test record จากงานนี้ จึงเป็น **`NOT RUN / n/a`**

## Definition of Done

| Criterion | Required evidence | Current result |
|---|---|---|
| create/read/edit sale ได้ | create/read/update runtime evidence; current edit path missing | `NOT MET — BLOCKED/NOT RUN` |
| weight/count/price/totals ถูกต้อง | calculation cases with expected values | `NOT MET — NOT RUN` |
| history/dashboard/report อ่าน record เดิม | post-save reload/relogin artifact | `NOT MET — NOT RUN` |
| permission ถูกต้อง | unauthenticated/role/wrong-owner/delete matrix | `NOT MET — NOT RUN` |
| duplicate/error handling และ mobile path | failure + device evidence | `NOT MET — NOT RUN` |

---

# 4. Payroll & Advance

**Workflow status:** `BLOCKED` (Critical financial-shaped workflow); runtime `BLOCKED` until isolated Firebase/emulator and owner-approved test boundary
**Implementation references:** `src/App.tsx:142-145`, `src/pages/payroll/*.tsx`, `src/services/employeeService.ts`, `src/services/payrollService.ts`, `src/lib/payrollUtils.ts`, `src/lib/payrollAudit.ts`

## Entry point

`ADMIN_TEST` ใช้ `/payroll/base-salary` ตั้งค่าเงินเดือน และ `/payroll/advance-approval` อนุมัติ/ปฏิเสธคำขอ; staff ใช้ `/payroll/advance` ส่งคำขอ; `/payroll/summary` ใช้ทั้ง admin และ staff เพื่อคำนวณ/อ่าน payroll slip ตามขอบเขต

## Collections, services, and integrations

| Resource | Static use |
|---|---|
| `employee_salaries` | `saveBaseSalary`, admin list และ user-specific subscription; document ID เป็น employee UID |
| `salary_advances` | `addAdvance`, monthly/user subscriptions, `updateAdvanceStatus`; statuses `PENDING`, `APPROVED`, `REJECTED`; active duplicate detection ใช้ user/amount/date และ deterministic `submissionKey` |
| `payroll_slips` | `savePayrollSlip`, `updatePayrollSlipStatus`, period/user reads; document ID deterministic จาก period/user เมื่อไม่มี ID |
| `employee_transactions` / `EmployeeTransaction` | transaction history มีทั้ง lower-case rule collection และ legacy capitalized collection ใน service; ต้องพิสูจน์ว่าใช้ model ใดในแต่ละหน้า |
| `payroll_audit_events` | advance approve/reject transaction สร้าง audit event; `recordPayrollAudit` รองรับ audit create; metadata ห้ามมี secret/slipImage |
| Formula | `calculateNetSalary` แบ่ง base salary ครึ่งหนึ่งต่อ period หัก approved advances ของ user/period และ clamp net salary ไม่ให้ติดลบ |
| External | `/api/send-payslip-email` และ slip image/upload path อยู่ใน page/runtime; ไม่มี isolated mailbox/storage evidence |

## Roles and permission expectations

Routes base salary และ approval ใช้ `AdminRoute`; advance request และ summary ใช้ `ProtectedRoute` แต่ Firestore rule ต้องถูกตรวจแยก: `employee_salaries` read เป็น admin หรือ document ID ของตนและ write admin; `payroll_slips` read เป็น admin หรือ owner จาก `resource.data.userId`, write admin; `salary_advances` create ตรวจเพียง signed-in + incoming owner, read admin/owner, update admin, delete admin หรือ owner ที่ยัง `PENDING`; `payroll_audit_events` read/admin-create เท่านั้น (`firestore.rules:180-197`)

จุดเสี่ยงที่ต้องไม่ข้ามคือ rule ของ `salary_advances` create ใช้ `isSignedIn()` ไม่ใช่ `isActiveUser()` ขณะที่ app กั้น `PENDING`/`RESIGNED` ด้วย `ProtectedRoute`; จึงต้องทดสอบ direct data boundary สำหรับ pending/resigned และไม่ประกาศว่า denied จนมี emulator evidence

## Happy path matrix

| Evidence ID | Step | Expected | Status |
|---|---|---|---|
| `PAY-H-01` | `ADMIN_TEST` บันทึก synthetic base salary ให้ `STAFF_TEST` | `employee_salaries` ใช้ UID test และอ่านกลับได้เฉพาะ policy ที่กำหนด | `BLOCKED` |
| `PAY-H-02` | `STAFF_TEST` ส่ง advance จำนวนสมมติและวันที่สมมติ | สร้าง `salary_advances` สถานะ `PENDING` ด้วย owner UID | `BLOCKED` |
| `PAY-H-03` | submit ซ้ำด้วย user/amount/date เดิม | active duplicate ถูกปฏิเสธ; rejected request จึงค่อย resubmit ได้ตาม static logic | `BLOCKED` |
| `PAY-H-04` | `ADMIN_TEST` approve หรือ reject | status transition และ audit event อยู่ใน transaction เดียว; ห้ามใส่ slip/secret ลง audit metadata | `BLOCKED` |
| `PAY-H-05` | rejected request resubmit แล้ว approve | request ใหม่/record ที่ถูกต้องไม่ทำลาย rejected history และ audit ครบ | `BLOCKED` |
| `PAY-H-06` | เปิด `/payroll/summary` และคำนวณ period | base salary, approved advances, custom fields และ net salary ตรง expected formula | `BLOCKED` |
| `PAY-H-07` | admin save/read payslip และ mark `PAID` ด้วย synthetic slip | `payroll_slips` deterministic ID, status/paymentDate และ read-back ถูกต้อง | `BLOCKED` |
| `PAY-H-08` | optional email test | ใช้ test-only mailbox/destination เท่านั้น และบันทึก redacted status | `BLOCKED` — destination ไม่พร้อม |

## Error path matrix

| Evidence ID | Fault injection / scenario | Expected handling | Status |
|---|---|---|---|
| `PAY-E-01` | amount/date invalid, zero/negative หรือ missing employee | validation/error และ no financial-shaped write | `BLOCKED` |
| `PAY-E-02` | duplicate active advance, concurrent submit | หนึ่ง active record เท่านั้น; duplicate error ไม่ถูกกลืน | `BLOCKED` |
| `PAY-E-03` | approve/reject ซ้ำหรือ approve record ที่ไม่ใช่ pending | transition contract ต้องชัด; audit ต้องไม่หลอกว่ามีการเปลี่ยนที่ valid | `BLOCKED` |
| `PAY-E-04` | reject → resubmit | rejected history ต้อง immutable และ resubmission ไม่ overwrite โดยไม่ตั้งใจ | `BLOCKED` |
| `PAY-E-05` | audit write failure/partial transaction | advance status และ audit ต้องสอดคล้อง; หากไม่สอดคล้องให้หยุด sign-off | `BLOCKED` |
| `PAY-E-06` | formula mismatch, missing salary/advance, net below zero | safe error/expected clamp และ redacted calculation evidence | `BLOCKED` |
| `PAY-E-07` | slip image optimize/upload or email failure | payroll status ไม่ falsely report success; retry/cancel ชัดเจน | `BLOCKED` |
| `PAY-E-08` | reload/session expiry during approval | no duplicate approval/payment and persisted status is verified | `BLOCKED` |

## Permission test matrix

| Evidence ID | Actor and operation | Expected | Status |
|---|---|---|---|
| `PAY-P-01` | `UNAUTHENTICATED` payroll route/data/API | redirect/denied; no protected read/write | `BLOCKED` |
| `PAY-P-02` | `PENDING_TEST`/`RESIGNED_TEST` direct advance create/read | expected denied; specifically verify `salary_advances` create rule discrepancy | `BLOCKED` |
| `PAY-P-03` | `STAFF_TEST` own advance create/read/delete while pending | create/read allowed by intended policy; delete only while pending; no admin action | `BLOCKED` |
| `PAY-P-04` | `STAFF_TEST` read/update other user's advance/salary/slip | denied | `BLOCKED` |
| `PAY-P-05` | `STAFF_TEST` approve, update salary/slip, write audit | denied | `BLOCKED` |
| `PAY-P-06` | `ADMIN_TEST` approve, salary/slip write, audit create | allowed with actor UID matching audit actor | `BLOCKED` |
| `PAY-P-07` | `WRONG_OWNER_TEST` access/update/delete financial-shaped record | denied and no data leakage | `BLOCKED` |

## Reload/relogin persistence

ต้องตรวจ advance status/history, rejected record, audit count/fields, salary, summary, payslip status/paymentDate หลัง reload และ relogin ของ staff/admin แยกกัน โดยห้ามเก็บ bank/slip PII ปัจจุบันไม่มี isolated environment และ evidence: **`BLOCKED`**

## Mobile usability

ต้องทดสอบ staff advance form และ admin approval/summary บน viewport เล็ก ตรวจ numeric input, period selector, status feedback, slip picker, table overflow และปุ่ม approve/reject ที่ไม่กดพลาด ปัจจุบันยังไม่ควรทดลองกับข้อมูลเงินจริงหรือ destination จริง: **`BLOCKED`**

## Current blockers

นี่เป็น financial-shaped workflow และยังไม่มี isolated Firebase project/emulator ที่ owner อนุมัติ; ยังไม่มี runtime CRUD/permission/audit evidence; ต้องตรวจ consistency ระหว่าง `employee_transactions` และ `EmployeeTransaction`; `payroll_audit_events` ไม่มี delete rule จึงต้องใช้ disposable test project หรือ owner-approved retention/cleanup plan; rule ของ salary advance create ยังใช้ signed-in boundary; และยังไม่มี isolated email/storage destination

Unit tests ที่ status baseline ระบุว่าผ่านเป็นหลักฐานระดับ utility/code เท่านั้น ไม่ใช่หลักฐานว่าการ submit → approve/reject → summary → payslip ทำงานจริงใน environment: ห้ามใช้แทน acceptance run

## Test data policy and cleanup

ต้องใช้ synthetic UID/employee name เช่น `STAFF_TEST` กับจำนวนเงินและวันที่สมมติเท่านั้น ห้ามใช้เงินจริง เลขบัญชี รูปสลิปจริง email จริง หรือ production employee record หากจำเป็นต้องทดสอบ slip ให้ใช้ synthetic image ที่ไม่มีข้อความอ่อนไหวและ test-only storage หาก run เสร็จให้ลบ salary/advance/slip/employee transaction ใน isolated project ตามสิทธิ์ admin และเก็บ audit cleanup/retention proof; เนื่องจาก `payroll_audit_events` ไม่มี delete path ห้าม run บน shared/production project และต้องเลือก disposable project หรือ obtain owner-approved reset/export plan ก่อนเริ่ม ปัจจุบันไม่มี test record: **cleanup `BLOCKED / n/a`**

## Definition of Done

| Criterion | Required evidence | Current result |
|---|---|---|
| request/approve/reject/resubmit ทำงานจริง | isolated emulator/project state + audit references | `NOT MET — BLOCKED` |
| duplicate/idempotency และ rejected history ถูกต้อง | concurrent/duplicate run and immutable history | `NOT MET — BLOCKED` |
| summary ตรง transaction และสูตรถูกต้อง | expected-value calculation plus persisted read-back | `NOT MET — BLOCKED` |
| payslip/status/payment evidence ถูกต้อง | admin write, staff owner read, status persistence | `NOT MET — BLOCKED` |
| owner/admin/wrong-owner permission ผ่าน | role matrix including pending/resigned discrepancy | `NOT MET — BLOCKED` |
| audit trail และ cleanup ปลอดภัย | redacted audit evidence and disposable-project cleanup | `NOT MET — BLOCKED` |
| mobile path ผ่าน | device/viewport evidence | `NOT MET — BLOCKED` |

---

# 5. Maintenance

**Workflow status:** `OBSERVED (STATIC)`; runtime `NOT RUN`; full DoD `NOT MET`
**Implementation references:** `src/App.tsx:123,137-138`, `src/pages/equipment/MaintenanceList.tsx`, `src/pages/equipment/NewMaintenanceRequest.tsx`, `src/pages/equipment/MaintenanceDetails.tsx`, `src/services/maintenanceService.ts:17-80`

## Entry point

ผู้ใช้ authenticated เปิด `/maintenance` เพื่อดูรายการ กด `/maintenance/new` เพื่อแจ้งเรื่อง และเปิด `/maintenance/:id` เพื่อดูรายละเอียด สถานะใน model คือ `PENDING` → `IN_PROGRESS` → `RESOLVED`; หน้า detail แสดง status controls ให้ admin

## Collections, services, and storage

| Resource | Static use |
|---|---|
| `maintenance_requests` | `createMaintenanceRequest`, `updateMaintenanceStatus`, `deleteMaintenanceRequest`; fields รวม `userId`, title, description, location, category, urgency, status, reportedBy, timestamps |
| Storage/video | optional image/imageUrls/videoUrl; `storage.rules` path `maintenance` read/write ให้ signed-in user กว้าง และ video อาจใช้ R2 runtime |
| History/audit | ไม่พบ `maintenance_status_events` หรือ audit service ใน current implementation; `resolvedAt` ถูก set เมื่อ status เป็น `RESOLVED` |

## Roles and permission expectations

Rules ให้ active user read; create ต้อง active และ `incoming().userId == request.auth.uid`; update เป็น admin หรือ owner ที่ส่ง valid document; delete admin (`firestore.rules:166-170`) หน้า detail แสดงปุ่ม update status เฉพาะ admin แต่ service `updateMaintenanceStatus` รับ status โดยไม่มี client-side transition contract จึงต้องทดสอบ owner/non-owner และ invalid transition ที่ data boundary ไม่สรุปจาก UI เพียงอย่างเดียว

## Happy path matrix

| Evidence ID | Step | Expected | Status |
|---|---|---|---|
| `MNT-H-01` | `STAFF_TEST` เปิด `/maintenance/new` และกรอก synthetic issue | validation ผ่านพร้อม title/location/category/urgency | `NOT RUN` |
| `MNT-H-02` | สร้าง request | `maintenance_requests` 1 record พร้อม owner UID และ `PENDING` | `NOT RUN` |
| `MNT-H-03` | เปิด `/maintenance/:id` ด้วย creator | creator เห็น detail/status ล่าสุด | `NOT RUN` |
| `MNT-H-04` | `ADMIN_TEST` เปลี่ยน `PENDING` → `IN_PROGRESS` | status persisted และ user เห็น state ใหม่ | `NOT RUN` |
| `MNT-H-05` | admin เปลี่ยน `IN_PROGRESS` → `RESOLVED` | `resolvedAt` ถูกเติมและรายการปิดงาน | `NOT RUN` |
| `MNT-H-06` | reload/relogin creator | history/status ไม่หายและไม่มี duplicate request | `NOT RUN` |

## Error path matrix

| Evidence ID | Fault injection / scenario | Expected handling | Status |
|---|---|---|---|
| `MNT-E-01` | title/location/description/urgency ไม่ครบหรือ invalid | validation ปฏิเสธ no partial create | `NOT RUN` |
| `MNT-E-02` | image/video upload failure | request save/error state ชัดเจน; no unintended production object | `NOT RUN` |
| `MNT-E-03` | owner/non-admin พยายาม transition หรือ update invalid fields | denied ตาม rule/policy; no unauthorized status change | `NOT RUN` |
| `MNT-E-04` | transition ข้าม state เช่น `PENDING` → `RESOLVED` หรือ update ซ้ำ | contract ต้องถูกกำหนดและตรวจ; current service ไม่มี explicit state validation | `NOT RUN` |
| `MNT-E-05` | Firestore/network failure ระหว่าง create/update | no false success; reload verifies actual persisted state | `NOT RUN` |
| `MNT-E-06` | double-submit/delete without permission | one request only; staff/non-admin delete denied | `NOT RUN` |

## Permission test matrix

| Evidence ID | Actor and operation | Expected | Status |
|---|---|---|---|
| `MNT-P-01` | `UNAUTHENTICATED` route/read/create | redirect and protected data denied | `NOT RUN` |
| `MNT-P-02` | `PENDING_TEST`/`RESIGNED_TEST` read/create/update | denied at app/data boundary | `NOT RUN` |
| `MNT-P-03` | `STAFF_TEST` create/read own issue | allowed with own UID and valid schema | `NOT RUN` |
| `MNT-P-04` | `STAFF_TEST` update own issue where policy permits | only allowed fields/transition; verify current rules and app behavior | `NOT RUN` |
| `MNT-P-05` | `STAFF_TEST` read/update/delete `WRONG_OWNER_TEST` | non-owner update/delete denied; no cross-owner leakage | `NOT RUN` |
| `MNT-P-06` | `ADMIN_TEST` status update/delete test issue | allowed in isolated project and audit/cleanup recorded | `NOT RUN` |

## Reload/relogin persistence

หลังสร้างและเปลี่ยน status ต้อง reload list/detail และ relogin ด้วย creator/admin แยกกัน ตรวจ `status`, `resolvedAt`, timestamps และ identity ของ creator ปัจจุบันยังไม่มี runtime evidence: **`NOT RUN`**

## Mobile usability

ต้องทดสอบ create form พร้อมกล้อง/รูป, long description, urgency selector, detail status card และ feedback หลัง save บน Android/viewport เล็ก ตรวจ touch target, keyboard, image preview, network retry และ status readability ปัจจุบันไม่มี mobile result: **`NOT RUN`**

## Current blockers

ยังไม่มี state-transition test หรือ maintenance audit/history collection; service ไม่ enforce transition sequence อย่างชัดเจน; Storage `maintenance` read/write กว้างสำหรับ signed-in users; ไม่มี isolated upload/R2 evidence; และยังไม่มี CRUD/role/reload/mobile run

## Test data policy and cleanup

ใช้ synthetic issue เช่น `QA-NP-WF03-MNT-<run-id>`, location `TEST-PEN-01`, ไม่ใช้ตำแหน่งหรือรูปอุปกรณ์จริง ใช้ภาพ/วิดีโอ placeholder ที่ไม่มี PII ใน isolated storage เท่านั้น หลัง run ให้ admin ลบ `maintenance_requests` และ test Storage/R2 object แล้ว verify missing; หาก object อยู่ใน destination ที่ลบไม่ได้ ให้หยุดและรายงาน blocked ไม่ใช้ production cleanup ไม่มี record จากงานนี้: **cleanup `NOT RUN / n/a`**

## Definition of Done

| Criterion | Required evidence | Current result |
|---|---|---|
| state transition แจ้ง → รับเรื่อง → ดำเนินการ → ปิดงานชัดเจน | transition matrix and persisted status evidence | `NOT MET — NOT RUN` |
| creator เห็นสถานะล่าสุดหลัง reload/relogin | owner read-back/session evidence | `NOT MET — NOT RUN` |
| admin แก้สถานะได้และ non-owner ทำไม่ได้ | role/wrong-owner emulator evidence | `NOT MET — NOT RUN` |
| ประวัติงานไม่หาย/audit decision ชัดเจน | history/audit or documented accepted boundary | `NOT MET — NOT RUN` |
| upload failure, cleanup และ mobile path ปลอดภัย | redacted failure, cleanup and device evidence | `NOT MET — NOT RUN` |

---

## Cross-workflow execution gate

งาน acceptance จริงต้องทำตามลำดับนี้โดยเริ่มจาก isolated Preview/Firebase test project ที่ระบุ project ID และ environment ชัดเจน ไม่เริ่มจาก production

| Gate | Required input | Current status |
|---|---|---|
| `GATE-01` Environment safety | isolated Firebase project, Preview URL, synthetic auth users, rules/index revision | `BLOCKED` — `NP-FB-01` ยัง blocked |
| `GATE-02` Baseline auth | unauthenticated, pending, resigned, staff, admin sign-in boundary | `NOT RUN` |
| `GATE-03` Happy paths | one synthetic record set per workflow with IDs and UTC timestamps | `NOT RUN` |
| `GATE-04` Error paths | redacted error/status code, no partial data proof | `NOT RUN` |
| `GATE-05` Permission paths | owner/admin/wrong-owner matrix against emulator/test project | `NOT RUN` |
| `GATE-06` Reload/relogin | persisted data and status after fresh browser/session | `NOT RUN` |
| `GATE-07` Mobile | viewport/device result for each workflow | `NOT RUN` |
| `GATE-08` Cleanup | deleted records/objects, missing verification, audit-retention note where deletion is impossible | `NOT RUN`; payroll remains `BLOCKED` without disposable project |
| `GATE-09` Sign-off | evidence rows reviewed by `NIPON-LEAD-01`; no production mutation; unresolved blockers listed | `NOT MET` |

## Current decision

เอกสารนี้สร้าง acceptance contract และบันทึก static blockers เท่านั้น ผลรวมคือ **ยังไม่สามารถรับรอง core workflow ใดเป็น production-ready** ได้ Sow, Pig Sale และ Maintenance อยู่ในระดับ static `PARTIAL` แต่ runtime `NOT RUN`; Receipt → Expense มี AI/integration boundary เป็น `BLOCKED`; Payroll & Advance เป็น `BLOCKED` ระดับ Critical จนกว่าจะมี isolated financial-shaped test environment, permission/audit evidence และ cleanup plan ที่ได้รับอนุมัติ

**Production promotion:** `NOT AUTHORIZED`
**Production CRUD/mutation:** `NOT AUTHORIZED`
**Rules/deployment/credential change:** `NOT AUTHORIZED`
**Reviewer:** `NIPON-LEAD-01` (pending review)

## Out of scope / files not touched by this task

งานนี้ไม่แก้ application code, Firebase/Storage rules, credentials, deployment, production data, Workboard, status docs หรือ `docs/CORE_WORKFLOW_VERIFICATION_MATRIX.md` ที่เป็นอีกไฟล์ใน lock ของ `NP-WF-03` เอกสารที่เปลี่ยนมีเพียง `docs/verification-packet/evidence/core-workflow-matrix.md`

## Handoff fields

| Field | Value |
|---|---|
| From | `NIPON-QA-01`, Team B |
| To | `NIPON-LEAD-01` reviewer |
| Task | `NP-WF-03` |
| Scope completed | Static matrix/evidence preparation for five core workflows; no runtime claims |
| Scope not completed | Firebase CRUD, role runtime, E2E, mobile, reload/relogin, AI/integration and cleanup execution |
| Data safety | No production credentials or data used; no test record created |
| Open risks | Firebase shared-project boundary, broad ownership rules, AI not configured, payroll audit cleanup, missing sale edit path |
| Next action | Supply isolated Preview/Firebase test project and approved synthetic accounts, then execute rows by evidence ID |

> **Evidence state at commit:** All workflow execution rows remain `NOT RUN` or `BLOCKED` as shown above. No PASS is claimed by this document.
