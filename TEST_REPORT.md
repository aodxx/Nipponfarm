# Niponfarm Audit Test Report

วันที่ทดสอบ: **4 กันยายน 2026**. วิธีทดสอบเป็น static inspection, local dependency/build checks และ production HTTP smoke checks โดยไม่ใช้บัญชีผู้ใช้หรือเขียนข้อมูลจริง.

## ผลทดสอบ

| Test | Result | Evidence / Method |
| --- | --- | --- |
| Repository clean baseline | PASS | `git status --short --branch`; commit `d2dd516` |
| Dependency install | PASS with warnings | `npm ci` สำเร็จ; npm audit รายงาน vulnerabilities |
| TypeScript | PASS | `npm run lint` / `tsc --noEmit` |
| Production build | PASS with warnings | `npm run build`; Vite + esbuild สำเร็จ |
| Local standalone runtime | FAIL / BLOCKED | `PORT=3417 NODE_ENV=production npm run dev` หยุดที่ `Missing required environment variable: VITE_FIREBASE_API_KEY` จาก eager import ใน `server/dailyTasksAlert.ts` |
| Homepage | PASS | `curl https://nipponfarm.vercel.app/` → HTTP 200, HTML 1040 bytes |
| Health endpoint | PASS, AI not ready | `/api/health` → HTTP 200, `{status:"ok", aiProvider:"gemini", aiReady:false}` |
| Weather validation | PASS | `/api/weather` without coordinates → HTTP 400 |
| AI unauthenticated access | PASS | POST receipt, swine AI, TTS without token → HTTP 401 |
| Cron unauthorized access | PASS | GET cron without bearer secret → HTTP 401 |
| R2 request validation | PASS for missing fields | POST presign routes with `{}` → HTTP 400 |
| Email request validation | PASS for missing fields | POST email routes with `{}` → HTTP 400 |
| Firebase Auth login | NOT RUN in this audit | Requires interactive user session |
| Firestore read/write | NOT RUN | No test record created to protect real data |
| Storage upload/download | NOT RUN | No real object or credential used |
| Gemini receipt/swine/TTS success path | BLOCKED | Production `aiReady=false`, no test token/key |
| SMTP email | NOT RUN | SMTP credentials not verified |
| R2 presign success path | NOT RUN | R2 credentials not verified |
| Cron successful invocation | NOT RUN | `CRON_SECRET` not available for safe test |
| Live WebSocket `/live` | BLOCKED | Current Vercel handler exports HTTP app only |
| PWA install/offline recovery | NOT RUN | Requires device/browser interactive test |

## Build warnings

Build สำเร็จแต่มีคำเตือนจาก `lottie-web` เรื่อง `eval`, การ dynamic/static import ซ้ำของ `imageOptimizer.ts` และ chunk หลักประมาณ 4.6 MB ก่อน gzip (ประมาณ 1.08 MB หลัง gzip). ถือเป็น P1 performance/security review ไม่ใช่ build failure.

## Dependency audit

`npm audit --omit=dev` ตรวจได้ 28 vulnerabilities: 4 low, 7 moderate, 15 high และ 2 critical. รายการที่ต้องจัดลำดับ review ได้แก่ `vite`, `react-router-dom`, `protobufjs`, `websocket-driver`, `xlsx`, `nanoid`, `postcss` และ transitive packages. `xlsx` รายงาน high severity แต่ไม่มี automatic fix ในผลตรวจ; ห้ามใช้ `npm audit fix --force` โดยไม่ทำ compatibility branch และ regression test.

## สิ่งที่ยังพิสูจน์ไม่ได้

เว็บไซต์เปิดได้ไม่ใช่หลักฐานว่า Firebase write, AI, SMTP, R2, Cron, WebSocket หรือ PWA ใช้งานจริง. ผลเหล่านี้ต้องทดสอบด้วย test account/project ที่แยกจาก production และเก็บ timestamp/log ที่ไม่เปิดเผย secret.
