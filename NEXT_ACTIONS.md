# Niponfarm Next Actions

ลำดับนี้จัดทำจาก Audit วันที่ **4 กันยายน 2026** โดยยึดหลักรักษาระบบเดิมและไม่ทำ destructive migration.

## P0 — ต้องแก้ก่อน

1. **Secure server endpoints ก่อนเปิด integrations**: เพิ่ม Firebase ID-token verification และ role/ownership authorization ให้ email, upload gateway, R2 presign และ manual trigger; ห้ามเชื่อ `userId` จาก request body เป็นตัวตัดสินสิทธิ์เพียงอย่างเดียว.
2. เพิ่ม input schema validation, content-type/size limits, rate limiting และ error responses ที่ไม่เผย `err.message`, token, email หรือข้อมูลเงินเดือนเกินจำเป็น.
3. สร้าง test cases สำหรับ unauthenticated, wrong-user, pending user, staff และ admin โดยใช้ mock/emulator หรือ test project ไม่ใช้ production data.
4. หลังแก้ให้รัน `npm run lint`, `npm run build`, API smoke tests และ review diff ก่อนเปิด PR.
5. ตรวจ inventory/backup ของ Firebase project `Thailottery` และ credentials ที่เคยเผยแพร่ก่อนเปลี่ยน rules หรือ rotate/revoke.

## P1 — สำคัญ

1. ตั้งและยืนยัน `GEMINI_API_KEY`, model variables, SMTP, `CRON_SECRET`, ImageKit/R2 ใน Vercel ตาม environment ที่ถูกต้อง แล้วทดสอบ success/error path พร้อมหลักฐาน.
2. ตรวจ Vercel build/runtime logs และเพิ่ม structured request ID/error reporting ที่ไม่เก็บ secret หรือ PII.
3. ทำ Firestore/Storage CRUD และ authorization tests ด้วย test account/data isolation; ห้ามใช้ test record ใน collection ที่อาจเป็น shared production โดยไม่มี cleanup proof.
4. ตัดสินใจ transport สำหรับ Live AI บน Vercel: SSE/HTTP streaming หรือแยก WebSocket runtime; ต้องมี auth, timeout และ reconnect test.
5. ทบทวน Storage/Firestore rules ให้ least privilege หลัง inventory และ emulator review.
6. แก้ dependency vulnerabilities อย่างเป็นลำดับ โดยเริ่ม critical/high ที่มี fix และตรวจ compatibility; `xlsx` ต้องมีทางเลือกหรือ risk acceptance เพราะไม่มี automatic fix.
7. แยก route chunks และลด main bundle หลังมี baseline mobile performance.

## P2 — ปรับปรุงภายหลัง

1. ปรับ `TECHNICAL_DOCUMENTATION.md` ให้ตรงกับ Vercel architecture และระบุ standalone WebSocket เป็นข้อจำกัด.
2. ทำ PWA install/offline/update/relogin acceptance test บน Android และเครือข่ายจำกัด.
3. เปลี่ยน package metadata จาก `react-example`/`0.0.0` เมื่อกำหนด release policy แล้ว.
4. เพิ่ม automated API smoke/security tests ใน CI โดยไม่ใช้ secrets จริง.

## NEXT TASK

**งานเดียวที่ควรเริ่มทันที:** สร้าง PR สำหรับ **server endpoint authorization baseline** โดยปิดช่องว่าง auth/ownership ของ email, upload gateway, R2 presign และ manual trigger พร้อม automated tests และรัน lint/build ก่อน review. งานนี้ต้องทำก่อนตั้งค่าและเปิดใช้ Gemini, SMTP หรือ R2 จริง เพราะลดความเสี่ยง abuse และข้อมูลรั่วที่มีผลสูงสุด.

## Definition of Done ของ Next Task

- ทุก route ดังกล่าวตรวจ verified Firebase ID token หรือมี cron secret ตามกรณี.
- R2 ใช้ UID จาก token ไม่ใช่ค่าที่ผู้เรียกอ้างเอง และมี key/path ownership validation.
- email/payslip ไม่เปิดให้ส่งไป arbitrary recipient โดยไม่มี role/recipient policy.
- unauthenticated, wrong-user และ unauthorized role ได้ 401/403 ตามคาด; authorized test ผ่าน.
- `npm run lint`, `npm run build` และ tests ผ่าน; ไม่มี secret ใน diff.
