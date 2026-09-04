# Nipponfarm Execution Board

กระดานสถานะสำหรับการทำงานแบบ **Single Controller Execution**

**Controller:** `NIPON-LEAD-01`  
**Last updated:** 4 September 2026  
**Rule:** ไม่มี Team A / Team B queue แล้ว งานที่ไม่ชนกันเดินคู่ขนานได้ผ่านคนละ branch และใช้ PR + CI เป็น quality gate

## Current execution

| Priority | Task | Status | Branch / Evidence | Result / Next action |
|---|---|---|---|---|
| P0 | Firebase rules static scenario matrix | `DONE` | PR #11 | matrix ถูก merge แล้ว; ใช้เป็น evidence สำหรับ owner/role risks |
| P0 | Five core workflow verification matrix | `DONE` | PR #12 | matrix 5 workflow ถูก mergeแล้ว; runtime E2E ยังแยกเป็น external verification |
| P0 | Firestore owner-boundary hardening | `DONE` | PR #16, merge `8f5b478` | owner immutability + active payroll boundary ผ่าน Verify และ isolated Firestore Emulator CI; PR #13 เก่าปิดเป็น superseded |
| P1 | Route-level lazy loading | `DONE` | PR #14, merge `e9c3f69` | main JS ลดจาก ~4.62 MB เป็น ~2.02 MB ก่อน gzip; route chunks แยกแล้ว |
| P1 | Receipt → Expense reliability/idempotency | `DONE` | PR #15, merge `27939a6` | retry/double-submit ใช้ deterministic IDs, ไม่สร้าง bill/item ซ้ำ และ CI ผ่าน |
| P1 | Standalone startup without Firebase cron config | `IN_PROGRESS` | PR #17 `fix/standalone-startup-fallback` | fallback เปิด HTTP app ได้โดยไม่ลด Firebase validation; CI กำลังทดสอบ build + `/api/health` โดย unset Firebase env |
| P0 | Firebase isolated CRUD / permission E2E | `EXTERNAL_BLOCKED` | Firestore Emulator baseline จาก PR #16 | owner/wrong-owner/admin/PENDING/RESIGNED subset ผ่านแล้ว; ยังเหลือ Auth + full Firestore CRUD + Storage E2E/test data boundary |
| P0 | Gemini production readiness | `EXTERNAL_BLOCKED` | `/api/health` baseline `AI_NOT_CONFIGURED` | ต้องเข้าถึง Vercel environment/test credential; connector เห็น team แต่ project lookup ยัง 404 แม้ GitHub deployment status ระบุ project slug `nipponfarm` |
| P1 | Payroll emulator verification | `PARTIAL` | payroll code tests + PR #16 permission baseline | active-account boundary ผ่าน emulator; ยังเหลือ approve/reject/resubmit transaction + audit persistence scenario |
| P1 | Storage least-privilege migration | `BACKLOG` | `storage.rules` | rules ปัจจุบันให้ signed-in write กว้างใน news/bills/maintenance; ต้องรักษา compatibility กับ path จริงและเพิ่ม emulator tests ก่อน deploy |
| P1 | Dependency vulnerabilities | `BACKLOG` | npm audit baseline | 29 issues ใน full install; แก้เป็น compatibility branches ไม่ใช้ `npm audit fix --force` |
| P2 | Remaining bundle/vendor cleanup | `BACKLOG` | build output | main ยัง ~2.02 MB; UserManagement static import และ lottie/vendor debt ยังเหลือ |
| P2 | Live AI transport on Vercel | `BACKLOG` | `/live` standalone WS | current Vercel HTTP handler ไม่รองรับ standalone WS; ต้องเลือก HTTP streaming/SSE หรือ runtime ที่รองรับ long-lived WS |
| P1 | Production runtime log verification | `EXTERNAL_BLOCKED` | Vercel connector | GitHub status ยืนยัน Vercel integration แต่ connected project API ยัง lookup `nipponfarm` ไม่ได้ |

## Completed in this execution cycle

1. ปิด PR #10 เก่าที่ชน coordination files โดยไม่ merge
2. Merge Firebase rules verification matrix (PR #11)
3. Merge core workflow verification matrix (PR #12)
4. Merge route-level lazy loading (PR #14) และลด initial main JS จากประมาณ 4.62 MB → 2.02 MB ก่อน gzip
5. Merge Receipt idempotency/retry safety (PR #15)
6. Rebuild Firestore security จาก current `main`, ผ่านทั้ง static regression + isolated Firestore Emulator, merge PR #16 และปิด PR #13 เก่า
7. เปลี่ยนกติกาจาก multi-team queue เป็น Single Controller Execution
8. เริ่ม PR #17 เพื่อปิด standalone startup blocker ด้วย HTTP fallback + CI smoke test

## External blockers เท่านั้นที่อนุญาตให้หยุดงาน

ให้ใช้ `EXTERNAL_BLOCKED` เฉพาะเมื่อ repository side ทำได้ครบเท่าที่ทำได้แล้ว แต่ต้องใช้สิ่งใดสิ่งหนึ่งต่อไปนี้:

- credential/secret ที่ไม่ควรเก็บใน Git
- Firebase isolated project/test accounts สำหรับ scenario ที่ emulator อย่างเดียวไม่พอ
- Vercel project/environment access
- production console/backup/restore permission
- external test destination

การมี blocker ภายนอกหนึ่งรายการไม่ห้ามเดินงาน repository อื่นที่ไม่เกี่ยวข้อง

## Next order

1. ทำ PR #17 ให้ CI smoke startup ผ่านและ merge
2. ปิด Storage least-privilege ที่แก้/ทดสอบได้โดยไม่ deploy production rules
3. ทำ dependency vulnerability remediation แบบ compatibility-first
4. ทำ Payroll transaction/audit emulator scenarios ที่ไม่ต้องใช้ production data
5. ลด remaining bundle/vendor debt
6. เมื่อ Firebase/Vercel production access พร้อม ค่อยปิด Gemini, full CRUD/Storage, runtime logs และ production smoke ในรอบเดียว
