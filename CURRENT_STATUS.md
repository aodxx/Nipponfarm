# Nipponfarm Current Status

อัปเดตผล Audit: **4 กันยายน 2026** จาก repository `aodxx/Nipponfarm`, branch `main`, commit `fba7c2d8a2aed3217e71c5b18e11c24a1adbfced` (`fix: preserve rejected advances on resubmission (#8)`). การตรวจครั้งนี้ทำในโฟลเดอร์ clone แยกและไม่มีการแก้ไขข้อมูล production, Firebase, Vercel หรือ secrets.

## สรุป

Nipponfarm อยู่ใน **Phase 0–1: migration validation และ server integration verification** ไม่ใช่ production complete. Frontend เปิดได้, API health ทำงาน และ baseline authorization ถูก merge แล้ว แต่ยังไม่มีหลักฐานครบสำหรับ Firebase CRUD/permissions, AI success path, external integrations, runtime logs, PWA recovery และ Live AI บน Vercel.

จากเกณฑ์ production ใน verification checklist ระบบพร้อมใช้งานประมาณ **55%**. ตัวเลขนี้เป็น readiness estimate จากหลักฐานที่ตรวจได้ ไม่ใช่ uptime หรืออัตราความสำเร็จของผู้ใช้.

## สิ่งที่ผ่านแล้ว

- Repository สะอาดบน branch `main`; current HEAD คือ `fba7c2d`.
- `npm ci` ผ่าน; dependency ติดตั้งได้.
- `npm run test:auth` ผ่าน 9/9 tests.
- Payroll และ audit tests ที่รันแยกผ่าน 15/15 tests.
- `npm run lint` ผ่าน (`tsc --noEmit`).
- `npm run build` ผ่านทั้ง Vite และ esbuild server bundle.
- Production homepage `https://nipponfarm.vercel.app/` ตอบ HTTP 200.
- Production `GET /api/health` ตอบ HTTP 200 และคืน `status: ok`, `aiProvider: gemini`, `aiReady: false`, `aiStatus: AI_NOT_CONFIGURED`.
- Production `/api/weather` เมื่อไม่มีพิกัดตอบ HTTP 400 ตาม validation.
- AI, email, R2 และ upload routes ที่เรียกโดยไม่มี token ตอบ HTTP 401.
- Cron route ที่ไม่มี secret ตอบ HTTP 401.
- ไม่พบ secret รูปแบบชัดเจนใน tracked source จากการ scan (`AIza`, private key, AWS access key, token patterns).
- Firebase client configuration ใช้ `VITE_FIREBASE_*`; server secrets ไม่ถูก hard-code ในโค้ดที่ตรวจ.

## สิ่งที่ยังไม่ผ่านหรือยังไม่มีหลักฐาน

- `aiReady:false`: ยังไม่มีหลักฐานว่า `GEMINI_API_KEY` ถูกตั้งบน production และยังไม่ได้ทดสอบ AI success path ด้วย test account.
- ยังไม่ได้ตรวจ SMTP, ImageKit, Cloudflare R2, `CRON_SECRET` และ server-only variables ใน Vercel.
- ยังไม่ได้ทำ Firestore/Storage CRUD ด้วย test record แยกจากข้อมูลจริง หรือทดสอบ role matrix แบบ runtime.
- ยังไม่ได้ตรวจ Vercel runtime logs หลังเรียก API.
- Local standalone startup ล้มเหลวเมื่อไม่มี Firebase env: `dailyTasksAlert.ts` เรียก `getFirebaseRuntimeConfig()` ตอน import/startup.
- Live AI WebSocket `/live` อยู่ใน standalone Node server แต่ไม่ได้ export ผ่าน `api/index.ts` ของ Vercel.
- PWA install, offline shell, update และ recovery ยังไม่ได้ทดสอบบนอุปกรณ์จริง.
- Firebase ยังอ้าง project เดิมชื่อ `Thailottery`; ยังไม่มี inventory, backup และ reconciliation ก่อนแยก project.
- Storage rules อนุญาต signed-in user อ่าน/เขียน `news`, `bills`, `maintenance` กว้างเกิน least privilege.
- Firestore rules บาง collection เช่น `sows`, `events`, `tasks`, `pig_sales`, `chat` และ settings ใช้ active-user policy กว้าง และยังต้องพิสูจน์ farm/owner boundary.
- Main JS bundle ประมาณ 4.62 MB ก่อน gzip (1.08 MB หลัง gzip); มี lottie `eval` warning และ dynamic/static import duplication.
- เอกสารบางฉบับยังอ้าง commit เก่า (`d2dd516`, `7c37c43`) หรือ Cloud Run/Nginx ทั้งที่ deployment ปัจจุบันเป็น Vercel.

## Phase decision

คงสถานะไว้ที่ **migration validation / controlled integration verification**. ห้ามประกาศ production readiness จนกว่า P0/P1 integration, CRUD/permission evidence, runtime logs และ recovery checks จะผ่าน.

## สิ่งที่ไม่ได้ทำโดยตั้งใจ

Audit นี้ไม่เพิ่ม feature, ไม่ refactor ใหญ่, ไม่ deploy, ไม่แก้ Firebase/Storage rules, ไม่เขียน/ลบข้อมูลจริง และไม่ rotate/revoke credentials. การแก้ standalone initialization, dependency, permissions หรือ transport เป็นงานแยกที่ต้องมี test และ rollout plan.
