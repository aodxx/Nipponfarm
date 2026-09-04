# Nipponfarm System Architecture

อัปเดตผล Audit: **4 กันยายน 2026**. อ้างอิง commit `fba7c2d8a2aed3217e71c5b18e11c24a1adbfced` และ production `https://nipponfarm.vercel.app`.

## ภาพรวม

ระบบเป็น React 19 SPA ที่ build ด้วย Vite และ deploy frontend/API บน Vercel. Frontend ใช้ Firebase SDK เชื่อม Auth, Firestore และ Storage โดยตรง. Backend ใช้ Express ใน `appServer.ts` และ export เป็น Vercel Function ผ่าน `api/index.ts`; standalone Node server ใน `start.ts` เพิ่ม WebSocket `/live` และ cron ในกรณีที่รันนอก Vercel.

| ส่วน | Implementation ปัจจุบัน | สถานะ Audit |
|---|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind, PWA | Build ผ่าน; production page 200 |
| Routing | React Router, protected/admin route wrappers | Static route guard พบ; E2E ยังไม่รัน |
| Authentication | Firebase Auth client; server verifies Firebase ID token | ไม่มี token ถูกปฏิเสธ 401 |
| Database | Firestore client direct sync | Rules อ่าน static; CRUD จริง NOT RUN |
| Storage | Firebase Storage; optional ImageKit gateway | Rules บาง path กว้าง; upload NOT RUN |
| Backend/API | Express, `appServer.ts`, `api/index.ts` | Health/validation ผ่าน; success integrations NOT RUN |
| AI | Gemini adapter ใน `server/aiProvider.ts` | Provider gemini; production `aiReady:false` |
| Email | Nodemailer SMTP หรือ simulation fallback | SMTP delivery NOT RUN; simulation ต้องไม่ถือเป็น production delivery |
| Video | Cloudflare R2 presigned URLs | Credentials/E2E NOT RUN |
| Hosting | Vercel, build `npm run build`, output `dist` | Homepage/health ผ่าน |
| Scheduling | Vercel Cron `/api/cron/daily-tasks`, `0 22 * * *` UTC | Unauthorized 401; successful run NOT RUN |
| Live AI | `ws` ใน standalone server | BLOCKED on current Vercel handler |

## Data flow

ผู้ใช้เปิด PWA จาก Vercel → React route/auth guard → Firebase Auth/Firestore/Storage โดยตรงสำหรับข้อมูลหลัก → Express API สำหรับ weather, AI, email, R2 และ upload proxy → server ใช้ environment variables ติดต่อ external providers. GitHub Actions รัน `npm ci`, `npm run test:auth`, `npm run lint` และ `npm run build` เมื่อ push หรือ pull request.

## Security boundaries

Firebase web config เป็น public browser identifier และอ่านจาก `VITE_FIREBASE_*`; Gemini, SMTP, ImageKit private key, R2 secret และ cron secret ต้องอยู่ server environment. AI routes และ integration routes ที่ตรวจล่าสุดใช้ Firebase ID-token middleware. R2 ตรวจ active user, body UID และ key/content type policy.

ข้อจำกัดที่ยังเปิดอยู่คือ Firestore/Storage rules บาง collection/path อนุญาต active/signed-in users กว้างกว่าขอบเขต farm/owner ที่ควรเป็น และ `r2Service.ts` โหลด Firebase runtime config ระหว่าง module initialization ซึ่งทำให้ standalone startup ล้มเหลวเมื่อ env ไม่ครบ.

## Deployment limitation

`api/index.ts` export เฉพาะ HTTP Express app. WebSocket upgrade handler ถูกสร้างใน `startStandaloneServer()` เท่านั้น จึงไม่ควรนับ `/live` ว่ารองรับบน Vercel. ทางเลือกต้องทำเป็นงานออกแบบแยก เช่น HTTP streaming/SSE หรือ runtime ที่รองรับ connection ระยะยาว.

## Documentation mismatch

`TECHNICAL_DOCUMENTATION.md` ยังอธิบาย Cloud Run/Nginx เป็น infrastructure หลัก ขณะที่ `vercel.json`, `api/index.ts` และ production response ยืนยันว่า deployment ปัจจุบันคือ Vercel. เอกสารเดิมควรแก้ใน documentation task แยกหลัง security/integration baseline.
