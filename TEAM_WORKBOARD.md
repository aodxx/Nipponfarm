# Nipponfarm Execution Board

กระดานสถานะสำหรับการทำงานแบบ **Single Controller Execution**

**Controller:** `NIPON-LEAD-01`  
**Last updated:** 4 September 2026  
**Rule:** ไม่มี Team A / Team B queue แล้ว งานที่ไม่ชนกันเดินคู่ขนานได้ผ่านคนละ branch และใช้ PR + CI เป็น quality gate

## Current execution

| Priority | Task | Status | Branch / Evidence | Result / Next action |
|---|---|---|---|---|
| P0 | Firebase rules static scenario matrix | `DONE` | PR #11, merge `64efda8` | matrix ถูก merge แล้ว; ใช้เป็น evidence สำหรับ owner/role risks |
| P0 | Five core workflow verification matrix | `DONE` | PR #12, merge `80961ba` | matrix 5 workflow ถูก mergeแล้ว; runtime E2E ยังแยกเป็น external verification |
| P0 | Firestore owner-boundary hardening | `IN_PROGRESS` | PR #13 `fix/firestore-owner-boundary` | tests 12/12 + lint ผ่าน; กำลังทำให้ build CI reproducible แล้ว merge |
| P1 | Route-level lazy loading | `DONE` | PR #14, merge `e9c3f69` | main JS ลดจาก ~4.62 MB เป็น ~2.02 MB ก่อน gzip; route chunks แยกแล้ว |
| P0 | Firebase isolated CRUD / permission E2E | `EXTERNAL_BLOCKED` | verification packet | ต้องมี isolated Firebase project/emulator/test accounts; ห้ามใช้ production data แทน |
| P0 | Gemini production readiness | `EXTERNAL_BLOCKED` | `/api/health` baseline `AI_NOT_CONFIGURED` | ต้องเข้าถึง Vercel environment/test credential; connected Vercel project lookup ปัจจุบันตอบ 404 |
| P1 | Receipt → Expense reliability/idempotency | `BACKLOG` | `ScanReceipt`, `billService` | เริ่มหลัง PR #13 merge; เน้น duplicate-save + persistence/error tests |
| P1 | Payroll emulator verification | `EXTERNAL_BLOCKED` | payroll tests + verification matrix | code/idempotency/audit มีแล้ว; runtime permission/transaction ต้อง isolated Firebase |
| P1 | Standalone startup lazy cron initialization | `BACKLOG` | `appServer.ts`, `dailyTasksAlert.ts` | แก้ eager Firebase config dependency โดยไม่ลด validation |
| P1 | Storage least-privilege migration | `EXTERNAL_BLOCKED` | `storage.rules` | ต้องออกแบบ path/owner compatibility และทดสอบ isolated ก่อน deploy |
| P1 | Dependency vulnerabilities | `BACKLOG` | npm audit baseline | 29 issues ใน full install; แก้เป็น compatibility branches ไม่ใช้ `npm audit fix --force` |
| P2 | Remaining bundle/vendor cleanup | `BACKLOG` | build output | main ยัง ~2.02 MB; UserManagement static import และ lottie/vendor debt ยังเหลือ |
| P2 | Live AI transport on Vercel | `BACKLOG` | `/live` standalone WS | ต้องเลือก HTTP streaming/SSE หรือ runtime ที่รองรับ long-lived WS |

## Completed in this execution cycle

1. ปิด PR #10 เก่าที่ชน coordination files โดยไม่ merge
2. Merge Firebase rules verification matrix (PR #11)
3. Merge core workflow verification matrix (PR #12)
4. เพิ่ม targeted Firestore owner immutability + active payroll boundary พร้อม regression tests (PR #13 กำลังปิด CI)
5. Merge route-level lazy loading (PR #14)
6. ลด initial main JS จากประมาณ 4.62 MB → 2.02 MB ก่อน gzip
7. เปลี่ยนกติกาจาก multi-team queue เป็น Single Controller Execution

## External blockers เท่านั้นที่อนุญาตให้หยุดงาน

ให้ใช้ `EXTERNAL_BLOCKED` เฉพาะเมื่อ repository side ทำได้ครบเท่าที่ทำได้แล้ว แต่ต้องใช้สิ่งใดสิ่งหนึ่งต่อไปนี้:

- credential/secret ที่ไม่ควรเก็บใน Git
- Firebase isolated project/emulator/test accounts
- Vercel project/environment access
- production console/backup/restore permission
- external test destination

การมี blocker ภายนอกหนึ่งรายการไม่ห้ามเดินงาน repository อื่นที่ไม่เกี่ยวข้อง

## Next order

1. ทำ PR #13 ให้ CI ผ่านและ merge
2. ทำ Receipt duplicate-save/idempotency reliability
3. แก้ standalone startup initialization
4. ลด dependency/performance debt ที่แก้ได้จาก repository
5. เมื่อ Firebase/Vercel isolated access พร้อม ค่อยปิด runtime verification ทั้งชุดในรอบเดียว
