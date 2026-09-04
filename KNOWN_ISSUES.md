# Nipponfarm Known Issues

อัปเดตผล Audit: **4 กันยายน 2026**. Severity: P0 = ความเสี่ยงด้านความปลอดภัย/ข้อมูลหรือขวาง production, P1 = สำคัญต่อเสถียรภาพและการรับรองระบบ, P2 = ปรับปรุงภายหลัง.

| Severity | Issue | Cause / Evidence | Impact | Recommended direction |
|---|---|---|---|---|
| P0 | Firebase project เดิมชื่อ `Thailottery` ยังใช้งานร่วมความเสี่ยง | เอกสารและ config ระบุ project เดิม; ยังไม่มี inventory/backup/reconciliation | Rules/config ผิดอาจกระทบข้อมูลระบบอื่น | ทำ inventory, export/backup และ count reconciliation ก่อนเปลี่ยน project/rules |
| P1 | AI production ยังไม่พร้อม | `/api/health` = `aiReady:false`, `AI_NOT_CONFIGURED` | Receipt/Swine/TTS ใช้งานจริงไม่ได้ | ตั้ง `GEMINI_API_KEY` ฝั่ง server แล้วทดสอบ success/error ด้วย test account |
| P1 | Standalone startup ต้องการ Firebase env ตั้งแต่ import | `dailyTasksAlert.ts` เรียก `getFirebaseRuntimeConfig()` ตอน start | local smoke test/standalone start หยุดแม้ route ที่ไม่ใช้ Firebase | lazy-init ที่ขอบเขต cron/service และเพิ่ม startup tests env ครบ/ไม่ครบ |
| P1 | Live AI ไม่รองรับ current Vercel handler | WebSocket อยู่ใน standalone server; `api/index.ts` เป็น HTTP app | `/live` production ใช้งานไม่ได้ | เลือก SSE/HTTP streaming หรือแยก WS runtime พร้อม auth/reconnect test |
| P1 | Firebase Storage rules กว้างเกิน least privilege | `news`, `bills`, `maintenance` allow signed-in read/write | user อาจอ่าน/เขียนข้ามขอบเขต | ออกแบบ path ownership/role rules และทดสอบ emulator ก่อน deploy |
| P1 | Firestore ownership/farm boundary ยังไม่เข้มในบาง collection | `sows`, `events`, `tasks`, `pig_sales`, chat/settings ใช้ active-user policy กว้าง | staff อาจแก้ข้อมูลข้าม farm/owner หาก policy ไม่บังคับ | ทำ farmId/owner matrix และ emulator permission tests; ห้ามแก้ rules ทันทีบน shared project |
| P1 | ไม่มี production runtime log evidence | ยังไม่ได้ตรวจ Vercel logs หลัง API calls | 5xx, auth หรือ PII leakage อาจไม่ถูกพบ | ตรวจ logs ด้วย owner access และเพิ่ม structured safe request/error IDs หากจำเป็น |
| P1 | Dependency vulnerabilities | npm audit: 28 production issues (2 critical, 15 high, 7 moderate, 4 low) | supply-chain/runtime risk | ทำ remediation branch, review transitive path และ regression tests; ไม่ force upgrade |
| P1 | Core workflows ยังไม่มี E2E/CRUD evidence | Sow, Receipt, Sale, Payroll, Maintenance ผ่าน static/code tests บางส่วนเท่านั้น | ไม่ยืนยันการใช้งานจริงของเกษตรกร | สร้าง isolated test account/project และรัน acceptance matrix |
| P1 | Main bundle ใหญ่ | main JS ~4.62 MB pre-gzip; lottie/import warnings | โหลดช้าบนเครือข่ายฟาร์ม | route-level lazy loading และ library split หลัง integration baseline |
| RESOLVED / VERIFY | Server endpoint authorization baseline | middleware และ ownership checks merged; unauthenticated smoke routes 401 | success/role runtime ยังไม่พิสูจน์ | ทดสอบ ADMIN/STAFF/PENDING/wrong-owner บน preview/test data |
| RESOLVED / VERIFY | Payroll idempotency/rejected resubmit/audit | code tests ผ่าน; payroll tests แยก 15/15 | ยังไม่มี emulator/production evidence | ทดสอบ concurrent duplicate, approve/reject/resubmit และ audit persistence |
| P2 | Infrastructure documentation mismatch | `TECHNICAL_DOCUMENTATION.md` ระบุ Cloud Run/Nginx แต่ปัจจุบัน Vercel | ทีมอาจ debug/deploy ผิดระบบ | อัปเดตเอกสารหลัง P0/P1 verification |
| P2 | Generic package metadata | package name `react-example`, version `0.0.0` | traceability/release management ต่ำ | controlled release task พร้อม changelog/policy |

ไม่มีการลบข้อมูลจริง, deploy rules หรือ rotate/revoke credential ใน Audit นี้.
