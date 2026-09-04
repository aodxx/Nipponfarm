# Nipponfarm Current Status

อัปเดต: **4 กันยายน 2026** จาก branch `main` หลัง merge PR #21 (`ab099e1`). เอกสารนี้ใช้เป็นสถานะล่าสุดของงาน Consolidation และแยกชัดเจนระหว่าง **repository/emulator evidence** กับ **production evidence**.

## สรุป

Nipponfarm ยังอยู่ใน **controlled production-readiness verification** และยังไม่ควรประกาศ production complete แต่ baseline ความน่าเชื่อถือดีขึ้นอย่างมีนัยสำคัญ: authorization, Firestore owner boundary, Storage boundary, Payroll permissions/audit, Receipt idempotency, route lazy loading และ standalone startup มี automated evidence แล้ว.

## สิ่งที่ผ่านแล้วใน repository / isolated test

- PR #14: route-level lazy loading; initial main JS ลดจากประมาณ 4.62 MB เหลือ ~2.02 MB ก่อน gzip.
- PR #15: Receipt → Expense retry/double-submit ใช้ deterministic IDs ลด duplicate bill/item.
- PR #16: Firestore owner immutability และ active-account payroll boundary ผ่าน isolated Firestore Emulator.
- PR #17: standalone server สามารถ boot โดยไม่มี Firebase runtime env; `/api/health` smoke ผ่าน และปิดเฉพาะ cron/Live WS ใน fallback mode.
- PR #18: Storage rules สำหรับ bill image เปลี่ยนเป็น `bills/<uid>/...`, จำกัด image type/size และผ่าน Firestore + Storage Emulator. **ยังไม่ถือว่า deployed production.**
- PR #20: payroll calculation + payroll audit tests ถูกรวมเข้า standard CI gate ทุก PR.
- PR #21: Payroll Emulator verification ผ่าน: active staff create/read own advance, wrong-owner deny, staff approve deny, admin approve pass, audit admin-only/immutable, pending owner cancellation pass และ approved cancellation deny.
- Standard CI มี `npm ci`, authorization/regression tests, TypeScript lint, production build และ standalone startup smoke.

## สิ่งที่ยังต้องพิสูจน์หรือทำต่อ

### External / production access

- Gemini production ยังมี baseline เดิม `aiReady:false`, `AI_NOT_CONFIGURED`; ยังต้องตรวจ/ตั้ง server-side credential และทดสอบ Receipt/Swine/TTS success path.
- Vercel GitHub status ยืนยัน project slug `nipponfarm` แต่ connected Vercel API ยัง lookup project ไม่ได้ (404) จึงยังตรวจ environment variables/runtime logs ไม่ได้.
- Firebase ยังอ้าง project เดิม `Thailottery`; ต้อง inventory + backup/export + record-count reconciliation ก่อนแยกหรือ deploy rules ที่มีผลต่อ production.
- Firestore/Storage rules ที่ merge ใน repo **ยังต้องมี controlled production deployment/verification**; Emulator PASS ไม่เท่ากับ production deployment.

### Repository / architecture debt

- Core workflows Sow Lifecycle, Pig Sale และ Maintenance ยังขาด full user-level acceptance/E2E evidence.
- Storage legacy paths `news` และ `maintenance` ยังรักษา compatibility แบบ signed-in write; ต้อง migrate path ให้มี owner/role boundary ก่อน tighten ต่อ.
- Firestore collections `sows`, `events`, `tasks`, `pig_sales`, chat/settings ยังใช้ active-user boundary กว้างและยังไม่มี `farmId` tenant boundary.
- Live AI `/live` ใช้ standalone WebSocket และไม่ทำงานผ่าน current Vercel HTTP handler.
- Dependency vulnerabilities จาก audit baseline ยังต้อง remediation แบบ compatibility-first; ห้าม `npm audit fix --force` โดยไม่ review.
- Bundle ยังมี vendor/lottie debt แม้ initial route bundle ลดลงแล้ว.
- PWA install/offline/update/recovery และ offline data sync ยังไม่มี device acceptance evidence.

## Phase decision

เดินต่อใน **Core Workflow & UX Consolidation / controlled readiness** โดยไม่เพิ่ม major feature ใหม่. งานที่ทำได้จาก repository ให้เดินต่อได้ทันที; งานที่ต้องใช้ production credential, console หรือ backup permission ให้จัดเป็น external blocker และห้ามใช้ข้อมูลจริงแทน isolated evidence.
