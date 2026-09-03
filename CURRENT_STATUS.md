# Niponfarm Current Status

อัปเดตผล Audit: **4 กันยายน 2026** (repository commit `d2dd51639fd52c95a8622b4938fc60ae941e514f`, branch `audit/recovery-baseline`)

## สรุป

Niponfarm อยู่ใน **Phase 0–1: migration validation และ server integration verification** ไม่ใช่ production complete. Source code อยู่บน GitHub และ production domain เปิดได้ แต่ยังไม่มีหลักฐานครบสำหรับการเขียนข้อมูล, external integrations, runtime logs, PWA recovery และการแยก Firebase project.

จากขอบเขตที่ตรวจได้ใน audit นี้ ระบบใช้งานได้ประมาณ **55% ของเกณฑ์ production ที่ระบุใน verification checklist**. ตัวเลขนี้เป็น readiness estimate ไม่ใช่ uptime หรือความสำเร็จของผู้ใช้จริง.

## สิ่งที่ผ่านแล้ว

- GitHub repository `aodxx/Nipponfarm`, branch `main` มี working tree สะอาด และ CI ล่าสุดที่ตรวจพบผ่าน.
- หน้า production `https://nipponfarm.vercel.app` ตอบ HTTP 200 และ HTML โหลดได้.
- `GET /api/health` ตอบ HTTP 200 พร้อม `status: ok` และ `Cache-Control: no-store`.
- `GET /api/weather` ตรวจ validation กรณีไม่มีพิกัดและตอบ HTTP 400 ตามคาด.
- AI REST endpoints ที่ไม่มี Firebase ID token ถูกปฏิเสธ HTTP 401.
- Cron endpoint ที่ไม่มี `CRON_SECRET` ถูกปฏิเสธ HTTP 401.
- `npm ci`, `npm run lint` และ `npm run build` ผ่านบนโค้ด commit ที่ตรวจ.
- Firebase client config ใช้ `VITE_` environment variables และไม่มีค่า secret ใน working tree.
- Firestore มี default deny และแยก role `ADMIN`, `STAFF`, `PENDING`, `RESIGNED` ในกฎหลัก.

## สิ่งที่ยังไม่ผ่านหรือยังไม่มีหลักฐาน

- Production health รายงาน `aiReady: false`; ยังไม่ยืนยัน `GEMINI_API_KEY` และยังไม่ได้ทดสอบ AI ด้วยบัญชีจริง.
- ยังไม่ยืนยัน SMTP, ImageKit, Cloudflare R2, `CRON_SECRET` และ server-only variables ใน Vercel.
- ยังไม่ได้ทำ Firestore/Storage CRUD test record แบบ create/read/update/delete และไม่มีหลักฐานทดสอบบัญชีสิทธิ์ต่ำ.
- ยังไม่ได้ตรวจ Vercel runtime logs หลังเรียก API.
- Live AI WebSocket `/live` ยังไม่อยู่ใน Vercel function handler.
- PWA install, offline shell, update และ recovery ยังไม่ถูกทดสอบ.
- ระบบยังใช้ Firebase project เดิมชื่อ `Thailottery`; ยังไม่มี backup/reconciliation และ cutover plan ที่ทำจริง.
- `TECHNICAL_DOCUMENTATION.md` ยังกล่าวถึง Cloud Run/Nginx ขณะที่ deployment ปัจจุบันเป็น Vercel จึงต้องถือว่าเอกสารเดิมมีข้อมูลล้าสมัยบางส่วน.

## Phase decision

ให้คงระบบไว้ที่ **migration validation** และห้ามประกาศ production readiness จนกว่า P0 เรื่อง authorization ของ server endpoints และ P0/P1 integration verification จะผ่าน.

## สิ่งที่ไม่ได้ทำโดยตั้งใจ

Audit นี้ไม่เพิ่มฟีเจอร์, ไม่เปลี่ยน architecture, ไม่ deploy, ไม่แก้ Firebase rules, ไม่ลบหรือแก้ข้อมูลจริง และไม่ rotate/revoke credentials เพราะเป็นการเปลี่ยนแปลงที่ต้องมี owner approval และ cutover plan.
