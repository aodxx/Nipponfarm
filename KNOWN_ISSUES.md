# Niponfarm Known Issues

อัปเดตผล Audit: **4 กันยายน 2026**. Severity ใช้ P0 = เสี่ยงต่อความปลอดภัย/ข้อมูลหรือขวาง production, P1 = สำคัญต่อความเสถียรและการรับรองระบบ, P2 = ปรับปรุงภายหลัง.

| Severity | Issue | Cause / Evidence | Impact | Recommended direction |
| --- | --- | --- | --- | --- |
| RESOLVED / VERIFY | Server email endpoints authorization baseline | Commit `ec276f5` เพิ่ม Firebase auth middleware/role gate; ยังต้องทดสอบ success/unauthorized บน production | ต้องมีหลักฐาน runtime ว่า role และ recipient policy ทำงานจริง | รัน production verification และเก็บหลักฐานโดยไม่ใช้ข้อมูลเงินจริง |
| RESOLVED / VERIFY | Upload gateway authorization baseline | Commit `ec276f5` เพิ่ม active-user auth และ image payload limit | ยังต้องยืนยัน file type/path/size และ abuse behavior บน runtime | เพิ่ม integration test และตรวจ logs โดยไม่เปิดเผย payload |
| RESOLVED / VERIFY | R2 authorization baseline | Commit `ec276f5` bind body UID กับ authenticated UID และ validate key/content type | ยังไม่มี production evidence และ ownership/path test ครบ | ทดสอบ wrong-owner/invalid-key และ presigned URL lifecycle |
| P0 | Firebase project เดิมชื่อ `Thailottery` ยังใช้งานร่วมความเสี่ยง | ระบุใน `PROJECT_STATUS.md`/handoff; ไม่มี inventory/backup/reconciliation | rules หรือการตั้งค่าผิดอาจกระทบข้อมูลระบบอื่น | backup, inventory, count reconciliation และแยก project ตาม migration runbook |
| P1 | AI production ยังไม่พร้อม | Production health = `aiReady:false`; `GEMINI_API_KEY` ยังไม่ยืนยัน | Receipt/Swine/TTS ใช้งานจริงไม่ได้ | ตั้ง secret ฝั่ง server แล้วทดสอบ success/error paths ด้วย test account |
| P1 | Standalone runtime เริ่มไม่ได้เมื่อ local env ไม่มี Firebase config | `startStandaloneServer()` eager-import `dailyTasksAlert.ts`, ซึ่งเรียก `getFirebaseRuntimeConfig()` ทันที | local smoke test และ standalone deployment ที่ env ไม่ครบหยุดตั้งแต่ startup แม้ health route อาจไม่ต้องใช้ Firebase | แยก initialization แบบ lazy/ตรวจ env ที่ขอบเขต cron และเพิ่ม startup smoke test ด้วย env ครบ/ไม่ครบ โดยไม่ใส่ค่าจริงใน repository |
| P1 | Live AI ไม่รองรับ Vercel handler | WebSocket อยู่ใน standalone server แต่ `api/index.ts` export Express HTTP app | ScanAI live mode ใช้งานบน production ไม่ได้ | เลือก SSE/HTTP streaming หรือแยก WebSocket runtime แล้วทดสอบ reconnect/auth |
| P1 | Firebase Storage rules กว้างเกิน least privilege | `news`, `bills`, `maintenance` อนุญาต read/write แก่ signed-in ทุกคน | ผู้ใช้ที่ล็อกอินอาจเขียน/อ่านข้าม farm หรือแก้ไฟล์ที่ไม่ควรแก้ | ทำ path ownership/role rules และทดสอบ emulator ก่อน deploy; ระวัง project shared |
| P1 | Firestore บาง collection ให้สิทธิ์กว้าง | chat, farm settings, master ingredients ใช้ `isActiveUser()` สำหรับ write ทั้ง document | staff อาจแก้ข้อมูลข้ามขอบเขตถ้าไม่มี ownership field | inventory schema และเขียน rules แบบ owner/admin |
| P1 | ไม่มี runtime log evidence | Checklist ยังไม่ได้ตรวจ logs | error ใน production อาจไม่ถูกพบ | เปิด Vercel logs, เพิ่ม structured request/error IDs โดยไม่ log secrets/PII |
| P1 | Dependency vulnerabilities | `npm ci` วันที่ 4 ก.ย. 2026 รายงาน 29 issues รวม 2 critical/16 high/7 moderate/4 low | supply-chain/runtime risk; บางรายการเป็น transitive | ทำ dependency remediation branch, lockfile review และ regression test; ไม่ force upgrade ทันที |
| P1 | Bundle ใหญ่ | build รายงาน main chunk ~4.6 MB pre-gzip | โหลดช้าในพื้นที่ฟาร์ม/เครือข่ายจำกัด | route-level code splitting และวัด mobile performance |
| P2 | เอกสาร infrastructure ไม่ตรง deployment | `TECHNICAL_DOCUMENTATION.md` ระบุ Cloud Run/Nginx แต่ปัจจุบันเป็น Vercel | ทีมอาจ deploy/debug ผิดระบบ | อัปเดตเอกสารหลัง security baseline |
| P2 | ชื่อ package/version ยังเป็น generic | `package.json` name `react-example`, version `0.0.0` | traceability/release management ต่ำ | เปลี่ยนเป็น controlled release task พร้อม CI/release policy |
| P2 | Build warning จาก `lottie-web` และ import duplication | Vite build warnings | maintenance และ bundle split ไม่เหมาะสม | แยกเป็น performance cleanup หลัง P0/P1 |

ไม่มีการลบข้อมูลจริง, deploy rules หรือ rotate credential ใน Audit นี้.
