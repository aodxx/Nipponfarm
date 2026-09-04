# Nipponfarm Audit Test Report

วันที่ทดสอบ: **4 กันยายน 2026**. Repository ที่ตรวจ: `aodxx/Nipponfarm`, commit `fba7c2d8a2aed3217e71c5b18e11c24a1adbfced`. วิธีทดสอบเป็น static inspection, local dependency/build checks และ production HTTP smoke checks โดยไม่ใช้บัญชีผู้ใช้ ไม่ส่งข้อมูลจริง และไม่เขียนฐานข้อมูล.

## ผลทดสอบ

| Test | Result | Evidence / Method |
|---|---|---|
| Repository baseline | PASS | Clone แยก, branch `main` สะอาดก่อนสร้าง branch audit |
| Dependency install | PASS with warnings | `npm ci` สำเร็จ; 29 vulnerabilities ใน full install |
| Auth/AI policy tests | PASS | `npm run test:auth`: 9/9 |
| Payroll/audit tests | PASS | `npx tsx --test src/lib/payrollUtils.test.ts src/lib/payrollAudit.test.ts`: 15/15 |
| TypeScript | PASS | `npm run lint` (`tsc --noEmit`) |
| Production build | PASS with warnings | `npm run build`; Vite/esbuild สำเร็จ |
| Homepage | PASS | `GET https://nipponfarm.vercel.app/` → 200 |
| Health | PASS, AI not ready | `/api/health` → 200, `aiReady:false`, `AI_NOT_CONFIGURED` |
| Weather validation | PASS | `/api/weather` without coordinates → 400 |
| Unauthenticated AI | PASS | Receipt/TTS/Swine AI without token → 401 |
| Unauthenticated email/integration | PASS | Email, R2 presign และ upload gateway without token → 401 |
| Cron unauthorized | PASS | `/api/cron/daily-tasks` without secret → 401 |
| Secret scan | PASS with scope limitation | ไม่พบ common hard-coded secret patterns ใน tracked source; ไม่ใช่ proof ว่า history/hosting secrets ปลอดภัยทั้งหมด |
| Local standalone no-env | FAIL / KNOWN BLOCKER | `npm run dev` with no env exits 1: `Missing required environment variable: VITE_FIREBASE_API_KEY` from `dailyTasksAlert.ts` import |
| Firebase Auth login | NOT RUN | ต้องใช้ interactive test account |
| Firestore CRUD | NOT RUN | ไม่สร้าง test record เพื่อปกป้องข้อมูลจริง |
| Storage upload/download | NOT RUN | ไม่มี test object/credential ที่แยกจาก production |
| Gemini success path | BLOCKED | production `aiReady:false`; ไม่มี test token/key |
| SMTP/R2/ImageKit success path | NOT RUN | credentials ไม่ยืนยัน |
| Cron successful invocation | NOT RUN | secret ไม่ใช้ในการตรวจครั้งนี้ |
| Live WebSocket `/live` | BLOCKED | current Vercel handler exports HTTP only |
| PWA install/offline recovery | NOT RUN | ต้องใช้ browser/device acceptance test |

## Build warnings

Build ผ่านแต่พบ `lottie-web` ใช้ `eval`, `imageOptimizer.ts` ถูก import ทั้ง dynamic และ static และ main chunk ประมาณ 4.62 MB ก่อน gzip/1.08 MB หลัง gzip. ถือเป็น performance/security review item ไม่ใช่ build failure.

## Dependency audit

`npm audit --omit=dev` ตรวจพบ 28 production vulnerabilities: 4 low, 7 moderate, 15 high และ 2 critical. รายการสำคัญรวม `protobufjs` และ transitive dependencies; `xlsx` ยังเป็นรายการที่ต้อง risk-review. ห้ามใช้ `npm audit fix --force` โดยไม่ทำ compatibility branch และ regression test.

## ข้อจำกัดของหลักฐาน

เว็บไซต์เปิดได้ไม่ใช่หลักฐานว่า Firebase write, role enforcement, AI, SMTP, R2, Cron, WebSocket หรือ PWA ใช้งานจริง. ต้องทดสอบด้วย preview/test project, test account และ test record ที่มี cleanup proof ก่อนเปลี่ยนสถานะเป็น production-ready.
