# Nipponfarm Project Status

อัปเดตล่าสุด: 2026-09-03

## สรุปผู้บริหาร

Nipponfarm แยกซอร์สและวงจร deploy ออกจาก Google AI Studio แล้ว ระบบเปิดบน Vercel, Login ผ่าน Firebase และผู้ใช้ยืนยันว่าเห็นข้อมูลเดิมแล้ว แต่ยังอยู่ในสถานะ **migration validation** ไม่ใช่ production complete เพราะฟังก์ชันฝั่ง server ยังไม่ได้ตั้งค่าและตรวจครบ

## สถานะตามหลักฐาน

| ขอบเขต | สถานะ | หลักฐาน |
| --- | --- | --- |
| Source of truth | ผ่าน | `aodxx/Nipponfarm`, branch `main` |
| CI lint/build | ผ่าน | `npm run lint` และ `npm run build` ผ่านในรอบย้าย |
| Vercel deployment | ผ่าน | Project `nipponfarm`, domain `nipponfarm.vercel.app`, Dashboard แสดง Ready |
| Frontend boot | ผ่าน | แก้ Firebase env แล้วหน้าเว็บเปิดได้ |
| Firebase Authentication | ผ่าน | เพิ่ม Authorized Domain และ Login สำเร็จ |
| Existing Firestore data | ผ่านเบื้องต้น | ผู้ใช้ยืนยันว่าเห็นข้อมูลเดิม |
| HTTP API `/api/health` | ผ่าน | Production ตอบ `{\"status\":\"ok\",\"aiProvider\":\"gemini\",\"aiReady\":false}` ตามผลทดสอบของผู้ใช้ |
| AI endpoint authentication | ผ่านบน production | Receipt/Swine/TTS ตอบ `401 Authentication required` เมื่อไม่มี token; WebSocket ตรวจ token ในโค้ด standalone |
| Receipt/Swine AI | รอตั้งค่าและทดสอบ | ต้องสร้าง `GEMINI_API_KEY` ใหม่ ใส่เฉพาะฝั่ง server แล้วทดสอบข้อมูลที่ไม่มีความลับ |
| Email | รอตั้งค่าและทดสอบ | ต้องมี SMTP variables |
| ImageKit/R2 | รอตั้งค่าและทดสอบ | ต้องใช้ credentials ใหม่ที่จำกัดสิทธิ์ |
| Daily Cron | ไม่พร้อม | ต้องมี `CRON_SECRET` และหลักฐานการรัน |
| Live AI WebSocket | ไม่พร้อม | `/live` ยังไม่ถูก export โดย Vercel handler |
| Firebase separation | ไม่พร้อม | ยังใช้ project เดิมชื่อ `Thailottery` |

## ความเสี่ยงสำคัญ

1. Firebase project เดิมชื่อ `Thailottery` อาจมีข้อมูลหรือบริการของระบบอื่นร่วมอยู่ ห้ามลบหรือเปลี่ยน rules โดยไม่มี inventory และ backup
2. Firebase web API key เคยอยู่ใน Git history ต้องจำกัด HTTP referrers/API และวางแผน rotate
3. R2 credentials จาก ZIP เดิมต้อง revoke ก่อนเปิดใช้งานวิดีโอจริง
4. Vercel `Ready` ยืนยัน build/deploy เท่านั้น ไม่ยืนยัน integration ภายนอก
5. Live AI ใช้ WebSocket server lifecycle แบบเดิม ซึ่งยังไม่ทำงานผ่าน `api/index.ts`

## Next milestone

**M1 — Server Integration Verification**

1. สร้าง Gemini key ใหม่และใส่ใน Vercel เป็น `GEMINI_API_KEY` (Production เท่านั้น)
2. ตรวจ `/api/health` ให้ `aiReady` เป็น `true`
3. ทดสอบ Receipt AI, Swine AI และ Text-to-Speech ด้วยบัญชีที่ล็อกอิน
4. ตั้ง `APP_URL`, `CRON_SECRET` และ SMTP แล้วทดสอบตามลำดับ
5. ตัดสินใจ transport ใหม่สำหรับ Live AI บน Vercel
6. สำรอง Firebase project เดิมก่อนเริ่มแยก project


## Core Workflow Verification Baseline — 4 กันยายน 2026

Task 1 เสร็จในระดับเอกสารและ static code verification โดยยังไม่มีการเขียน/แก้/ลบข้อมูล production. สร้าง matrix ครบ 5 workflow ใน `docs/CORE_WORKFLOW_VERIFICATION_MATRIX.md` ผลปัจจุบันคือ Sow Lifecycle, Receipt → Expense, Pig Sale และ Maintenance อยู่ที่ `PARTIAL`; Payroll & Advance อยู่ที่ `BLOCKED / Critical` เพราะเป็นธุรกรรมการเงินที่ยังไม่มี audit trail, สูตรยังไม่มี regression test, ยังไม่มี production CRUD/permission evidence และต้องตรวจความสอดคล้องของ `EmployeeTransaction` กับ `employee_transactions`.

งาน implementation ถัดไปที่เลือกคือ **Payroll & Advance — Security, Consistency & Audit Baseline**. ต้องเริ่มด้วย test account/data และเพิ่ม test/audit/idempotency boundary ก่อนพิจารณาเปลี่ยน rules หรือ deploy. ห้ามทำ destructive migration หรือแก้ข้อมูลเงินจริง.

ผล validation ของ repository รอบนี้:

- `npm run lint`: ผ่าน
- `npm run test:auth`: ผ่าน 5/5
- `npm run build`: ผ่าน
- Build ยังมี warning จาก `lottie-web`, dynamic/static import duplication และ main chunk ประมาณ 4.6 MB
- `npm ci` รายงาน 29 vulnerabilities: 2 critical, 16 high, 7 moderate, 4 low

สถานะ production ยังคงเป็น **migration validation** ไม่ใช่ production complete จนกว่า integration, CRUD, role/security, runtime logs และ PWA evidence ตาม checklist จะผ่าน.

## Payroll Integration Progress — 4 กันยายน 2026

เชื่อม duplicate advance guard เข้ากับ `employeeService.addAdvance` และ `AdvanceRequest` แล้ว โดย query รายการของ user/date ก่อนเขียน และปฏิเสธรายการที่มี user, amount และ date เดียวกันในสถานะ `PENDING` หรือ `APPROVED`; รายการ `REJECTED` สามารถส่งใหม่ได้. Payroll utility และ submit-flow tests ผ่าน 7/7, authorization regression ผ่าน 5/5, lint และ build ผ่าน.

ข้อจำกัดที่ยังเปิดอยู่: query-before-add ลด duplicate จาก retry ปกติ แต่ยังไม่รับประกัน concurrent writes แบบ atomic transaction. ต้องทำเป็นงาน consistency/idempotency ถัดไปก่อนถือว่า payroll production-ready และยังไม่มีการเปลี่ยน Firestore rules หรือข้อมูล production.
