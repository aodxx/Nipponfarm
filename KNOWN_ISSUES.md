# Nipponfarm Known Issues

อัปเดต: **4 กันยายน 2026** หลัง PR #21. Severity: P0 = ความเสี่ยงด้านข้อมูล/production, P1 = สำคัญต่อ reliability/security, P2 = ปรับปรุงภายหลัง.

| Severity | Issue | Latest evidence | Impact / Next direction |
|---|---|---|---|
| P0 | Firebase project เดิม `Thailottery` ยังมี migration risk | ยังไม่มี inventory/backup/reconciliation ที่ยืนยันครบ | ทำ inventory + export/backup + count reconciliation ก่อนแยก project หรือ deploy rules ที่อาจกระทบข้อมูลจริง |
| P1 | Gemini production ยังไม่พร้อม | baseline `/api/health`: `aiReady:false`, `AI_NOT_CONFIGURED` | ต้องเข้าถึง Vercel env/test credential และทดสอบ Receipt/Swine/TTS success path |
| P1 | Vercel runtime evidence ยังขาด | GitHub status ระบุ project slug `nipponfarm` แต่ connected Vercel API lookup ยัง 404 | ตรวจ env/runtime logs เมื่อ connector/account access ถูกต้อง |
| P1 | Rules ใน repo ยังไม่เท่ากับ production deployment | Firestore/Storage Emulator ผ่าน แต่ไม่มีหลักฐานว่า rules ล่าสุดถูก deploy production | ทำ controlled deploy + smoke + rollback plan หลัง backup/owner approval |
| P1 | Storage legacy path `news`/`maintenance` ยัง broad | PR #18 tighten `bills/<uid>` แล้ว แต่คง compatibility สำหรับ legacy paths | migrate client path ให้ owner/role scoped แล้ว tighten rules รอบถัดไป |
| P1 | Firestore farm/tenant boundary ยังไม่ชัด | `sows`, `events`, `tasks`, `pig_sales`, chat/settings ยังใช้ active-user policy | ออกแบบ `farmId`/permission matrix ก่อนรองรับหลายฟาร์มหรือข้อมูลหลายขอบเขต |
| P1 | Core workflow E2E ยังไม่ครบ | Payroll permission/audit + Receipt idempotency มี automated evidence แต่ Sow/Pig Sale/Maintenance ยังไม่มี full acceptance | ทำ isolated acceptance test ทีละ workflow |
| P1 | Dependency vulnerabilities | audit baseline ยังมี critical/high issues โดยเฉพาะ dependency path เก่า | remediation compatibility-first; ห้าม force upgrade โดยไม่ regression |
| P1 | Live AI transport ไม่รองรับ Vercel handler ปัจจุบัน | `/live` อยู่ standalone WebSocket; Vercel ใช้ HTTP function | เลือก SSE/HTTP streaming หรือแยก WS runtime พร้อม auth/reconnect tests |
| P2 | PWA/offline data acceptance ยังขาด | มี PWA shell แต่ยังไม่มี device/offline-data sync evidence | Android device acceptance + pending-sync design |
| P2 | Remaining bundle/vendor debt | route lazy loading ลด main bundle เหลือ ~2.02 MB แต่ lottie/vendor debt ยังอยู่ | vendor split/removal หลัง P1 reliability |
| P2 | Infrastructure docs บางไฟล์ยังเก่า | บางเอกสารยังอ้าง Cloud Run/Nginx | consolidate docs ให้ Vercel เป็น architecture ปัจจุบัน |
| P2 | Generic package metadata | `react-example`, `0.0.0` | เปลี่ยนเมื่อกำหนด release policy/changelog |

## Resolved / Verified in repository

- Server endpoint authorization baseline.
- Rejected payroll advance resubmission preserves rejected history.
- Firestore owner reassignment attack path สำหรับ bills/bill_items/pig_prices/maintenance ถูกปิดและผ่าน Emulator.
- Payroll permission + audit immutability ผ่าน isolated Firestore Emulator.
- Receipt duplicate-save/retry idempotency มี regression tests.
- Standalone startup ไม่ crash เมื่อ Firebase runtime env ไม่ครบ และ `/api/health` smoke ผ่าน.
- Bill Storage write boundary + image constraints ผ่าน Storage Emulator.
- Route-level lazy loading ถูก merge และลด initial bundle ลงมาก.

**หมายเหตุ:** `Resolved / Verified in repository` ไม่ได้หมายความว่า production deployment/config ถูกเปลี่ยนแล้ว.
