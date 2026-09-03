# Niponfarm System Architecture

อัปเดตผล Audit: **4 กันยายน 2026**. เอกสารนี้สะท้อน implementation และ deployment ที่ตรวจได้จาก repository commit `d2dd516` และ production domain ปัจจุบัน.

## ภาพรวม

ระบบเป็น React 19 SPA ที่ build ด้วย Vite และ deploy static frontend บน Vercel. HTTP backend ใช้ Express ใน `appServer.ts` และ export ผ่าน `api/index.ts` เป็น Vercel Function. ใน local/standalone mode `start.ts` เริ่ม Node HTTP server และ WebSocket bridge แยกต่างหาก.

| ส่วน | Implementation ปัจจุบัน | สถานะจาก Audit |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind, PWA | Build ผ่าน; production page 200 |
| Backend/API | Express, `api/index.ts`, `appServer.ts` | Health และ validation routes ตอบได้; integration ยังไม่ครบ |
| Authentication | Firebase Auth client; server ตรวจ Firebase ID token ใน AI routes | AI unauthenticated ถูกปฏิเสธ; routes อื่นบางตัวต้อง review |
| Database | Firebase Firestore client direct sync | Rules อ่านผ่านการตรวจ static; CRUD จริงยัง NOT RUN |
| Storage | Firebase Storage client; optional ImageKit gateway | Rules กว้างในบาง path; upload จริงยัง NOT RUN |
| AI provider | Gemini ผ่าน `server/aiProvider.ts` | Provider = gemini; `aiReady=false` production |
| Video | Cloudflare R2 presigned URLs | Credentials และ end-to-end upload ยังไม่ยืนยัน |
| Email | Nodemailer SMTP หรือ simulation fallback | SMTP ยังไม่ยืนยัน |
| Hosting | Vercel production `nipponfarm.vercel.app` | Page/health ผ่าน; logs ยังไม่ตรวจ |
| Scheduling | Vercel Cron `0 22 * * *` → 05:00 Asia/Bangkok | Unauthorized test 401; successful run ยังไม่ยืนยัน |
| Live AI | Standalone `ws` server `/live` | ไม่ถูก export ผ่าน Vercel handler; BLOCKED |

## API surface ที่พบ

`GET /api/health`, `GET /api/weather`, `POST /api/receipt-analyze`, `POST /api/text-to-speech`, `POST /api/swine-ai-analyze`, email routes, R2 presign routes, upload gateway, image proxy, cron route และ manual daily-task trigger. AI routes มี `requireFirebaseAuth`; health แยกเป็น `api/health.ts` และ route ใน Express.

## Data flow

ผู้ใช้เปิด PWA จาก Vercel → React ใช้ Firebase SDK เชื่อม Firebase Auth/Firestore/Storage โดยตรง → เรียก Express API สำหรับ weather, AI, email, R2 และ proxy → server ใช้ server-only environment variables ติดต่อ Gemini, SMTP, ImageKit หรือ R2. GitHub Actions ตรวจ `npm ci`, TypeScript lint และ production build.

## Security boundaries ที่ตรวจพบ

Firebase public web configuration ถูกอ่านจาก `VITE_FIREBASE_*` ซึ่งเป็น identifier ที่ browser ต้องเห็น. Gemini, SMTP, ImageKit private key, R2 secret และ cron secret อยู่ใน server environment ตามแบบที่เอกสารกำหนด. อย่างไรก็ตาม email routes, upload gateway และ manual trigger ยังไม่ติด middleware auth ใน `appServer.ts`; R2 ใช้ `userId` จาก request body เพื่อตรวจ role แทนการผูกกับ verified token. ประเด็นนี้เป็น P0 และยังไม่ควรถือว่า boundary ปลอดภัย.

## Known documentation mismatch

`TECHNICAL_DOCUMENTATION.md` ระบุ Google Cloud Run และ Nginx เป็น infrastructure หลัก แต่ README, `vercel.json`, `api/index.ts` และ production response แสดงว่า current deployment เป็น Vercel. เอกสารเดิมควรได้รับการแก้ในงานถัดไปหลัง security baseline ไม่ควรใช้ Cloud Run description เป็นหลักฐาน deployment ปัจจุบัน.
