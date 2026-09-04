# Nipponfarm Next Actions

อัปเดต: **4 กันยายน 2026** หลัง merge PR #21.

## หลักการ

ยังไม่เพิ่ม major feature ใหม่. งานปัจจุบันคือ reliability, security, acceptance และ production verification. ทุก runtime/code change ต้องมี automated tests ที่เกี่ยวข้อง, `npm run lint`, `npm run build` และ rollback/compatibility consideration.

## สิ่งที่ปิดแล้ว ไม่ต้องทำซ้ำ

- Firestore owner-boundary hardening + Emulator verification.
- Receipt duplicate-save/retry idempotency.
- Route-level lazy loading baseline.
- Standalone startup without Firebase runtime env.
- Bill Storage owner/type/size boundary + Storage Emulator verification.
- Payroll calculation/audit regression suites in standard CI.
- Payroll own/wrong-owner/admin/audit immutability scenarios in Firestore Emulator.

## P0 — Production access gate

1. **Firebase inventory/backup/reconciliation** สำหรับ project เดิม `Thailottery` ก่อน deploy/migrate สิ่งที่กระทบ production.
2. **Controlled rules deployment verification** หลัง backup: deploy latest reviewed Firestore/Storage rules, smoke owner/admin flows และมี rollback evidence.
3. **Vercel/Gemini production integration**: resolve project access, ตรวจ server-side env โดยไม่เปิดเผยค่า, ทำ `/api/health` ให้ `aiReady:true` และทดสอบ Receipt/Swine/TTS success path.
4. **Production runtime logs**: ตรวจ 4xx/5xx/secret/PII leakage หลัง smoke requests.

P0 เหล่านี้ให้หยุดเฉพาะรายการที่ต้องใช้ console/credential; ห้ามหยุดงาน repository อื่น.

## P1 — Repository work ที่ทำต่อได้ทันที

1. **Dependency remediation inventory + compatibility fixes**
   - ระบุ direct/transitive package ที่ทำให้เกิด critical/high findings.
   - แก้ทีละกลุ่ม ไม่ใช้ `npm audit fix --force`.
   - ทุก upgrade ต้องผ่าน CI/core regression.
2. **Core acceptance: Sow Lifecycle**
   - Add Sow → lifecycle event → derived task/reminder → update state → persistence/error path.
3. **Core acceptance: Pig Sale**
   - create sale → validate weight/price/total → persistence → list/report consistency.
4. **Core acceptance: Maintenance**
   - create request → optional media → status transition → resolved state → permission/error paths.
5. **Storage legacy path migration**
   - ย้าย `news`/`maintenance` uploads ไป path ที่ระบุ owner/role ได้ แล้ว tighten rules พร้อม Emulator tests.
6. **Firestore farm/tenant design**
   - เพิ่ม permission matrix และ migration plan สำหรับ `farmId` ก่อนเปิด multi-farm.

## P2

- Remaining vendor/lottie bundle cleanup.
- Live AI transport decision: SSE/HTTP streaming หรือ separate WS runtime.
- Android PWA install/offline/update/recovery acceptance.
- Offline pending-sync design สำหรับ non-financial field workflows.
- Consolidate infrastructure documentation ให้ Vercel เป็น deployment source of truth.
- Package/release metadata + changelog policy.

## NEXT TASK

**Dependency Remediation — Inventory First**

เป้าหมายรอบถัดไปคือสร้าง evidence ว่า critical/high vulnerabilities มาจาก package ใด, เป็น direct หรือ transitive, มี safe patched version หรือไม่ และ upgrade ใดมี breaking risk จากนั้นแก้เฉพาะชุดที่ compatibility พิสูจน์ได้ด้วย CI.

### Definition of Done

- มี vulnerability inventory แยก direct/transitive/severity.
- ระบุ package ที่ไม่มี safe automatic fix แยกต่างหาก.
- upgrade ที่ทำจริงผ่าน authorization, payroll, receipt, rules-policy tests, TypeScript, build และ standalone smoke.
- ไม่มี `--force` หรือ major-version jump โดยไม่มี rationale/regression evidence.
- อัปเดต `CURRENT_STATUS.md`, `KNOWN_ISSUES.md`, `TEAM_WORKBOARD.md` หลังจบรอบ.
