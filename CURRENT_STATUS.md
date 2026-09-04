# Nipponfarm Current Status

อัปเดต: **4 กันยายน 2026** จาก branch `main` หลัง merge PR #28 (`d6188a2`). เอกสารนี้เป็นสถานะล่าสุดของงาน **Nipponfarm Core Workflow & UX Consolidation** และแยกชัดเจนระหว่าง **repository/emulator evidence** กับ **production evidence**.

## สรุป

Nipponfarm ยังอยู่ใน **controlled production-readiness verification** และยังไม่ควรประกาศ production complete แต่ baseline ความน่าเชื่อถือดีขึ้นมาก: authorization, Firestore owner boundary, Storage boundary, Payroll permissions/audit, Receipt/Pig Sale idempotency, Sow lifecycle regression, route lazy loading, standalone startup, CI speed และ critical dependency remediation มี automated evidence แล้ว.

## สิ่งที่ผ่านแล้วใน repository / isolated test

- PR #14: route-level lazy loading; initial main JS ลดจากประมาณ 4.62 MB เหลือ ~2.02 MB ก่อน gzip.
- PR #15: Receipt → Expense retry/double-submit ใช้ deterministic IDs ลด duplicate bill/item.
- PR #16: Firestore owner immutability และ active-account payroll boundary ผ่าน isolated Firestore Emulator.
- PR #17: standalone server สามารถ boot โดยไม่มี Firebase runtime env; `/api/health` smoke ผ่าน และปิดเฉพาะ cron/Live WS ใน fallback mode.
- PR #18: Storage rules สำหรับ bill image เปลี่ยนเป็น `bills/<uid>/...`, จำกัด image type/size และผ่าน Firestore + Storage Emulator. **ยังไม่ถือว่า deployed production.**
- PR #20: payroll calculation + payroll audit tests ถูกรวมเข้า standard CI gate ทุก PR.
- PR #21: Payroll Emulator verification ผ่าน: active staff create/read own advance, wrong-owner deny, staff approve deny, admin approve pass, audit admin-only/immutable, pending owner cancellation pass และ approved cancellation deny.
- PR #23: Pig Sale persistence เพิ่ม deterministic document identity ลด retry/double-submit duplicate.
- PR #24: Sow lifecycle regression tests ครอบคลุม breeding schedule, pregnancy confirmation, farrow/wean/recovery dates และ parity/status transitions.
- PR #26: normal CI ใช้ `npm ci --no-audit`; dependency audit ถูกแยกไป workflow เฉพาะ ทำให้ Verify/Firebase Rules เร็วขึ้นโดยไม่ลด test/security coverage.
- PR #27: Maintenance Storage legacy flat path ถูกจำกัดให้สร้างใหม่ได้เฉพาะ safe image และ object เดิม immutable; owner-scoped `maintenance/<uid>/...` ผ่าน Storage Emulator สำหรับ owner/wrong-owner behavior.
- PR #28: dependency remediation แบบ compatibility-first ผ่าน tests, TypeScript และ production build; อัปเดต `react-router-dom` ภายใน major 7, Vite ภายใน major 6 และ override `protobufjs`/`websocket-driver`; generation audit ยืนยัน **critical vulnerabilities = 0**.
- Standard CI มี authorization/regression tests, TypeScript lint, production build และ standalone startup smoke.

## สิ่งที่ยังต้องพิสูจน์หรือทำต่อ

### External / production access

- Gemini production ยังมี baseline เดิม `aiReady:false`, `AI_NOT_CONFIGURED`; ยังต้องตรวจ/ตั้ง server-side credential และทดสอบ Receipt/Swine/TTS success path.
- Vercel GitHub status ยืนยัน project slug `nipponfarm` แต่ connected Vercel API ยัง lookup project ไม่ได้ (404) จึงยังตรวจ environment variables/runtime logs ไม่ได้.
- Firebase ยังอ้าง project เดิม `Thailottery`; ต้อง inventory + backup/export + record-count reconciliation ก่อนแยกหรือ deploy rules ที่มีผลต่อ production.
- Firestore/Storage rules ที่ merge ใน repo **ยังต้องมี controlled production deployment/verification**; Emulator PASS ไม่เท่ากับ production deployment.

### Repository / architecture debt

- Core workflow acceptance ระดับ user/E2E ยังไม่ครบทุก flow แม้ Receipt, Pig Sale, Payroll และ Sow lifecycle มี regression evidence แล้ว.
- Maintenance client ยังเขียน legacy flat path อยู่; owner-scoped path ถูกเปิดไว้ใน rules แล้วและควรย้าย client ในรอบถัดไป.
- `news` Storage path ยังเป็น signed-in write compatibility และควรทำ role/owner boundary.
- Firestore collections `sows`, `events`, `tasks`, `pig_sales`, chat/settings ยังใช้ active-user boundary กว้างและยังไม่มี `farmId` tenant boundary.
- Live AI `/live` ใช้ standalone WebSocket และไม่ทำงานผ่าน current Vercel HTTP handler.
- `adm-zip` ยังต้อง review เพราะ remediation เป็น semver-major; `xlsx` ยังไม่มี fix จาก npm audit จึงต้องใช้ mitigation/replace strategy แทนการ force upgrade.
- Bundle ยังมี vendor/lottie debt แม้ initial route bundle ลดลงแล้ว; `UserManagement` ยังมี static import ที่ลดประสิทธิภาพ code splitting บางส่วน.
- PWA install/offline/update/recovery และ offline data sync ยังไม่มี device acceptance evidence.

## Phase decision

เดินต่อใน **Core Workflow & UX Consolidation / controlled readiness** โดยไม่เพิ่ม major feature ใหม่. Repository blockers ที่ปิดแล้วห้ามเปิดงานซ้ำ; งานถัดไปให้โฟกัสเฉพาะ production integration access, remaining high dependency debt, maintenance owner-path client migration, PWA/offline acceptance และ UX consolidation ตามลำดับ.
