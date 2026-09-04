# Nipponfarm Team Work Rules

เอกสารนี้เป็นกติกากลางสำหรับป้องกัน Agent/ทีมทำงานซ้ำ ทับไฟล์ หรือ merge งานชนกันระหว่างโครงการ **Nipponfarm Core Workflow & UX Consolidation**

## 1. Source of truth

ก่อนเริ่มงานทุกครั้งต้องอ่านตามลำดับ:

1. `AGENT_REGISTRY.md`
2. `TEAM_WORKBOARD.md`
3. `CURRENT_STATUS.md`
4. `KNOWN_ISSUES.md`
5. `NEXT_ACTIONS.md`
6. เอกสารหรือ verification packet ของ task ที่เกี่ยวข้อง

ห้ามเลือกงานเองจากการเปิด repository แล้วหาไฟล์ที่น่าจะแก้

## 2. One task = one owner = one branch

ทุก implementation task ต้องมี:

- Task ID ที่ไม่ซ้ำ เช่น `NP-PAY-01`
- Owner Agent เพียงหนึ่งตัว
- Reviewer แยกได้ แต่ reviewer ห้ามแก้ scope เดียวกันพร้อม owner
- Branch เฉพาะ task
- File/area lock ที่ชัดเจน
- Status ใน `TEAM_WORKBOARD.md`

งานที่ไม่มี Task ID + Owner + Branch + Status = **ยังไม่ได้รับอนุญาตให้เริ่ม**

## 3. Work lock

สถานะ `IN_PROGRESS` ถือเป็น lock ของ scope และไฟล์ที่ระบุใน `TEAM_WORKBOARD.md`

ทีมอื่นห้ามแก้ไฟล์/flow ที่ถูก lock เว้นแต่:

1. Owner เดิมส่ง handoff อย่างชัดเจน หรือ
2. `NIPON-LEAD-01` อนุมัติ scope split และแก้ Workboard ก่อนเริ่ม

หากงานใหม่ต้องใช้ไฟล์ที่ถูก lock ให้ตั้งสถานะ `BLOCKED` และระบุ `Blocked By` แทนการแก้ไฟล์พร้อมกัน

## 4. Main branch protection by process

- ห้าม push behavior/security/data/deployment change เข้า `main` โดยตรง
- ใช้ PR สำหรับ implementation, permissions, rules, integrations และ refactor
- Documentation-only coordination update ทำบน `main` ได้เมื่อไม่เปลี่ยน production behavior
- ผู้ merge เข้า `main` ควรเป็น `NIPON-LEAD-01` หรือ Integrator ที่ได้รับมอบหมาย

## 5. Before merge

ทุก PR ที่เปลี่ยน code ต้อง:

- sync กับ `main` ล่าสุด
- ตรวจ conflict กับ `TEAM_WORKBOARD.md`
- รัน tests ที่เกี่ยวข้อง
- รัน `npm run test:auth`
- รัน `npm run lint`
- รัน `npm run build`
- ระบุ evidence ใน PR/handoff
- ไม่มี secret, token หรือ production personal data ใน diff

ถ้าแก้ Firebase/authorization ต้องมี emulator/test-environment evidence ก่อน production sign-off

## 6. Handoff

เมื่อเปลี่ยน owner ต้องบันทึก:

- From / To Agent ID
- Task ID
- Scope ที่ทำเสร็จ
- Scope ที่ยังไม่ทำ
- Branch + commit ล่าสุด
- Files/areas ที่ lock อยู่
- Tests/evidence
- Open risks
- Next action

จากนั้นแก้ `TEAM_WORKBOARD.md` ก่อน owner ใหม่เริ่มงาน

## 7. Status lifecycle

ใช้สถานะเหล่านี้เท่านั้น:

`READY` → `IN_PROGRESS` → `REVIEW` → `DONE`

สถานะเสริม:

- `BLOCKED` — รอ dependency/approval
- `PAUSED` — ตั้งใจพักและปลด file lock แล้ว
- `CANCELLED` — ยกเลิกงาน

`DONE` ต้องมี commit/PR/evidence อ้างอิงเสมอ

## 8. Collision rule

ถ้าพบ 2 ทีมกำลังแก้ scope เดียวกัน:

1. หยุด merge ทั้งสองฝั่ง
2. ใช้ Workboard ตัดสิน owner ปัจจุบัน
3. owner ที่ไม่ได้ถือ lock เปลี่ยนเป็น `BLOCKED`
4. Lead แยก scope หรือทำ handoff
5. ห้ามแก้ conflict ด้วยการ force push เข้า `main`

## 9. Current program constraint

ช่วงนี้ห้ามเพิ่ม major feature ใหม่จนกว่า Core Workflow verification และ integration safety baseline จะผ่าน งานที่อนุญาตคือ blocker fixes, tests, reliability, security, integration verification และ UX consolidation ตามแผนเท่านั้น
