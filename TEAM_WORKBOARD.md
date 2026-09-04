# Nipponfarm Execution Board

กระดานสถานะสำหรับ **Single Controller Execution**

**Controller:** `NIPON-LEAD-01`  
**Last updated:** 4 September 2026  
**Rule:** ไม่มี Team A / Team B queue; งาน repository ที่ไม่ชนกันเดินได้ทันทีผ่าน branch + PR + automated evidence.

## Current execution

| Priority | Task | Status | Evidence | Result / Next action |
|---|---|---|---|---|
| P0 | Firebase rules static scenario matrix | `DONE` | PR #11 | baseline owner/role matrix |
| P0 | Five core workflow verification matrix | `DONE` | PR #12 | static workflow matrix merged |
| P0 | Firestore owner-boundary hardening | `DONE` | PR #16 `8f5b478` | owner immutability + active payroll boundary ผ่าน Firestore Emulator |
| P1 | Route-level lazy loading | `DONE` | PR #14 `e9c3f69` | main JS ~4.62 MB → ~2.02 MB before gzip |
| P1 | Receipt → Expense idempotency | `DONE` | PR #15 `27939a6` | deterministic bill/item IDs; retry ไม่สร้าง duplicate |
| P1 | Standalone startup fallback | `DONE` | PR #17 `14581fd` | build + startup without Firebase env + `/api/health` smoke ผ่าน |
| P1 | Storage owner/type/size boundary | `DONE_REPO` | PR #18 `db17fe7` | Firestore + Storage Emulator PASS; production rules deployment ยังไม่ยืนยัน |
| P1 | Payroll regression suites in CI | `DONE` | PR #20 `085e883` | payroll calculation + audit tests รันใน standard CI ทุก PR |
| P1 | Payroll permission/audit Emulator | `DONE` | PR #21 `ab099e1` | own/wrong-owner/admin/audit immutability/cancel scenarios ผ่าน Emulator |
| P0 | Firebase inventory/backup/reconciliation | `EXTERNAL_BLOCKED` | project เดิม `Thailottery` | ต้อง console/backup access ก่อน migration หรือ production rules deploy |
| P0 | Gemini production readiness | `EXTERNAL_BLOCKED` | baseline `AI_NOT_CONFIGURED` | ต้อง Vercel env/test credential + success-path smoke |
| P1 | Production rules deployment verification | `EXTERNAL_BLOCKED` | latest rules อยู่ใน repo | ต้อง backup + controlled deploy + rollback + production smoke |
| P1 | Core workflow acceptance: Sow/Pig Sale/Maintenance | `READY` | workflow matrix | ทำ isolated acceptance โดยไม่เพิ่ม feature |
| P1 | Dependency vulnerabilities | `READY` | npm audit baseline | compatibility-first remediation; no force upgrade |
| P1 | Storage legacy path migration | `READY` | `news`/`maintenance` ยัง broad | เปลี่ยน client path ให้ owner/role scoped ก่อน tighten rules |
| P1 | Firestore `farmId` / permission matrix | `DESIGN_READY` | active-user collections ยัง broad | ออกแบบ tenant boundary ก่อนรองรับหลายฟาร์ม |
| P2 | Remaining bundle/vendor cleanup | `READY` | main ~2.02 MB | lottie/vendor cleanup หลัง P1 |
| P2 | Live AI transport | `READY` | `/live` standalone WS | ออกแบบ SSE/HTTP streaming หรือแยก WS runtime |
| P2 | PWA/offline acceptance | `EXTERNAL_DEVICE_TEST` | PWA shell มีแล้ว | Android install/offline/update/recovery + pending sync |

## Completed in current consolidation cycle

1. ปิด coordination PR เก่าที่เสี่ยง overwrite.
2. Merge PR #11/#12 verification baselines.
3. Merge PR #14 route lazy loading.
4. Merge PR #15 Receipt idempotency.
5. Merge PR #16 Firestore owner-boundary + Emulator CI.
6. Merge PR #17 standalone startup smoke.
7. Merge PR #18 Storage rules + Storage Emulator verification.
8. Merge PR #20 payroll regression suites into standard CI; ปิด PR #19 ที่ superseded.
9. Merge PR #21 payroll permission/audit Emulator verification.
10. ใช้ Single Controller Execution แทน multi-team queue.

## Next order

1. **Dependency remediation inventory + safe compatibility fixes** ที่ทำได้จาก repository.
2. **Core acceptance: Sow Lifecycle → Pig Sale → Maintenance** ด้วย isolated/test data.
3. **Storage legacy path migration** (`news`, `maintenance`) ให้ owner/role scoped.
4. **Firestore farm/tenant permission design** ก่อนเพิ่ม multi-farm capability.
5. **Remaining bundle/vendor cleanup.**
6. เมื่อ production access พร้อม ให้ทำครั้งเดียวเป็น gate: Firebase backup/inventory → controlled rules deploy → Vercel env/Gemini → runtime logs → production smoke.

## External blocker rule

`EXTERNAL_BLOCKED` ใช้เฉพาะเมื่อ repository-side work ทำครบแล้วและต้องใช้ credential, console, backup/restore permission, production environment หรือ physical-device evidence. Blocker หนึ่งรายการไม่หยุดงาน repository อื่น.
