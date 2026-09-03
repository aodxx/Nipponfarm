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
| AI endpoint authentication | ผ่านระดับโค้ด | Receipt/Swine/TTS และ WebSocket ตรวจ Firebase ID token; lint/build และ negative auth tests ผ่าน |
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

1. ตรวจ deployment ของชุดป้องกัน AI และยืนยัน endpoint ปฏิเสธ request ที่ไม่ล็อกอิน
2. สร้าง Gemini key ใหม่และใส่ใน Vercel เป็น `GEMINI_API_KEY` (Production เท่านั้น)
3. ตรวจ `/api/health` ให้ `aiReady` เป็น `true`
4. ทดสอบ Receipt AI, Swine AI และ Text-to-Speech ด้วยบัญชีที่ล็อกอิน
5. ตั้ง `APP_URL`, `CRON_SECRET` และ SMTP แล้วทดสอบตามลำดับ
6. ตัดสินใจ transport ใหม่สำหรับ Live AI บน Vercel
7. สำรอง Firebase project เดิมก่อนเริ่มแยก project
