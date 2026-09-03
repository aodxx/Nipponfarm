# Niponfarm Known Issues

อัปเดตผล Audit: **4 กันยายน 2026**. Severity ใช้ P0 = เสี่ยงต่อความปลอดภัย/ข้อมูลหรือขวาง production, P1 = สำคัญต่อความเสถียรและการรับรองระบบ, P2 = ปรับปรุงภายหลัง.

| Severity | Issue | Cause / Evidence | Impact | Recommended direction |
| --- | --- | --- | --- | --- |
| P0 | Server email endpoints ไม่มี auth middleware | `appServer.ts` routes `/api/send-welcome-email`, `/api/send-payslip-email`, `/api/test-email` รับ request ก่อนตรวจ Firebase token | บุคคลภายนอกอาจส่งอีเมล/ทำ abuse และ payslip payload มีข้อมูลเงินเดือน/บัญชี | ผูก verified Firebase token กับ role/recipient; เพิ่ม schema validation, rate limit และ audit log |
| P0 | Upload gateway ไม่มี auth | `/api/upload-gateway` รับ base64 และอาจใช้ ImageKit private credential | เสี่ยง resource abuse และค่าใช้บริการ; อาจอัปโหลดโดยไม่มีสิทธิ์ | ใช้ auth middleware, file type/size limits และ allowlist path |
| P0 | R2 authorization เชื่อ `userId` จาก body | `/api/r2/presign-upload` และ download เรียก `verifyUserIsActive(userId)` โดยไม่ได้ bind userId กับ token | ผู้โจมตีอาจอ้าง UID ผู้ใช้ active เพื่อขอ presigned URL | ตรวจ ID token server-side และใช้ `req.auth.uid`; validate key ownership/path |
| P0 | Firebase project เดิมชื่อ `Thailottery` ยังใช้งานร่วมความเสี่ยง | ระบุใน `PROJECT_STATUS.md`/handoff; ไม่มี inventory/backup/reconciliation | rules หรือการตั้งค่าผิดอาจกระทบข้อมูลระบบอื่น | backup, inventory, count reconciliation และแยก project ตาม migration runbook |
| P1 | AI production ยังไม่พร้อม | Production health = `aiReady:false`; `GEMINI_API_KEY` ยังไม่ยืนยัน | Receipt/Swine/TTS ใช้งานจริงไม่ได้ | ตั้ง secret ฝั่ง server แล้วทดสอบ success/error paths ด้วย test account |
| P1 | Standalone runtime เริ่มไม่ได้เมื่อ local env ไม่มี Firebase config | `startStandaloneServer()` eager-import `dailyTasksAlert.ts`, ซึ่งเรียก `getFirebaseRuntimeConfig()` ทันที | local smoke test และ standalone deployment ที่ env ไม่ครบหยุดตั้งแต่ startup แม้ health route อาจไม่ต้องใช้ Firebase | แยก initialization แบบ lazy/ตรวจ env ที่ขอบเขต cron และเพิ่ม startup smoke test ด้วย env ครบ/ไม่ครบ โดยไม่ใส่ค่าจริงใน repository |
| P1 | Live AI ไม่รองรับ Vercel handler | WebSocket อยู่ใน standalone server แต่ `api/index.ts` export Express HTTP app | ScanAI live mode ใช้งานบน production ไม่ได้ | เลือก SSE/HTTP streaming หรือแยก WebSocket runtime แล้วทดสอบ reconnect/auth |
| P1 | Firebase Storage rules กว้างเกิน least privilege | `news`, `bills`, `maintenance` อนุญาต read/write แก่ signed-in ทุกคน | ผู้ใช้ที่ล็อกอินอาจเขียน/อ่านข้าม farm หรือแก้ไฟล์ที่ไม่ควรแก้ | ทำ path ownership/role rules และทดสอบ emulator ก่อน deploy; ระวัง project shared |
| P1 | Firestore บาง collection ให้สิทธิ์กว้าง | chat, farm settings, master ingredients ใช้ `isActiveUser()` สำหรับ write ทั้ง document | staff อาจแก้ข้อมูลข้ามขอบเขตถ้าไม่มี ownership field | inventory schema และเขียน rules แบบ owner/admin |
| P1 | ไม่มี runtime log evidence | Checklist ยังไม่ได้ตรวจ logs | error ใน production อาจไม่ถูกพบ | เปิด Vercel logs, เพิ่ม structured request/error IDs โดยไม่ log secrets/PII |
| P1 | Dependency vulnerabilities | `npm audit --omit=dev`: 28 issues รวม 2 critical/15 high | supply-chain/runtime risk; บางรายการเป็น transitive | ทำ dependency remediation branch, lockfile review และ regression test; ไม่ force upgrade ทันที |
| P1 | Bundle ใหญ่ | build รายงาน main chunk ~4.6 MB pre-gzip | โหลดช้าในพื้นที่ฟาร์ม/เครือข่ายจำกัด | route-level code splitting และวัด mobile performance |
| P2 | เอกสาร infrastructure ไม่ตรง deployment | `TECHNICAL_DOCUMENTATION.md` ระบุ Cloud Run/Nginx แต่ปัจจุบันเป็น Vercel | ทีมอาจ deploy/debug ผิดระบบ | อัปเดตเอกสารหลัง security baseline |
| P2 | ชื่อ package/version ยังเป็น generic | `package.json` name `react-example`, version `0.0.0` | traceability/release management ต่ำ | เปลี่ยนเป็น controlled release task พร้อม CI/release policy |
| P2 | Build warning จาก `lottie-web` และ import duplication | Vite build warnings | maintenance และ bundle split ไม่เหมาะสม | แยกเป็น performance cleanup หลัง P0/P1 |

ไม่มีการลบข้อมูลจริง, deploy rules หรือ rotate credential ใน Audit นี้.
