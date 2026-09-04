# Nipponfarm Execution Rules

เอกสารนี้กำหนดวิธีทำงานแบบ **Single Controller Execution** เพื่อให้โครงการเดินหน้าเร็วโดยยังรักษาความปลอดภัยของข้อมูลและคุณภาพของโค้ด

## 1. ผู้คุมงานหลัก

`NIPON-LEAD-01` เป็นผู้จัดลำดับ ลงมือ ประสาน และ merge งานทั้งหมดของรอบปัจจุบันโดยตรง ไม่แบ่งคิวเป็น Team A / Team B และไม่รอ handoff ระหว่าง Agent หากงานหนึ่งไม่จำเป็นต้องรออีกงาน ให้เดินคู่ขนานผ่านคนละ branch ได้ทันที

Agent/Role อื่นใน `AGENT_REGISTRY.md` เป็น **บทบาทอ้างอิงสำหรับการตรวจเฉพาะด้าน** ไม่ใช่เจ้าของคิวงาน และไม่ทำให้ implementation ต้องหยุดรอ

## 2. Source of truth

ก่อนทำงานให้ดูตามลำดับ:

1. `PROJECT_STATUS.md`
2. `CURRENT_STATUS.md`
3. `KNOWN_ISSUES.md`
4. `NEXT_ACTIONS.md`
5. `TEAM_WORKBOARD.md`
6. verification/evidence ที่เกี่ยวข้อง

`TEAM_WORKBOARD.md` ใช้เพียงติดตามสถานะจริงและ branch ที่เปิดอยู่ ไม่ใช้สร้างขั้นตอนอนุมัติหลายชั้น

## 3. วิธีเดินงาน

- เลือก blocker ที่กระทบ production/use-case มากที่สุดก่อน
- งานที่ไม่ชนไฟล์หรือ dependency สามารถทำคู่ขนานบนคนละ branch
- ไม่เพิ่ม feature ใหญ่จนกว่า reliability/security/core workflow สำคัญจะนิ่ง
- ถ้าพบ defect ที่แก้ได้จาก repository และมี test รองรับ ให้แก้ทันที
- ถ้าต้องใช้ credential, console access หรือ production data ที่ไม่มีสิทธิ์เข้าถึง ให้ทำส่วน repository ให้ครบแล้วระบุ external blocker แบบสั้นและชัด

## 4. Branch / PR / CI

การเปลี่ยน behavior, security, Firebase rules, data model, integration, performance หรือ deployment configuration ต้องใช้ branch + Pull Request

ก่อน merge ต้องมีอย่างน้อย:

- tests ที่เกี่ยวข้องผ่าน
- `npm run test:auth` ผ่าน
- `npm run lint` ผ่าน
- `npm run build` ผ่าน
- ไม่มี secret/token/production personal data ใน diff
- diff ไม่ทำ destructive migration โดยไม่มี backup/rollback

Documentation-only status/coordination update สามารถ commit เข้า `main` ได้โดยตรงเมื่อไม่เปลี่ยน production behavior

## 5. Firebase / Production Safety

- ห้ามลบหรือ migrate production data โดยไม่มี backup + reconciliation + rollback plan
- ห้าม deploy Firestore/Storage rules ที่เปลี่ยน permission โดยไม่มี test/emulator หรือ isolated environment evidence
- ห้ามใส่ API key, password, ID token, service-account JSON หรือ private key ใน Git/Markdown/log
- ถ้า test ต้องใช้ external destination ให้ใช้ test-only destination; ถ้าไม่มีให้ระบุ `BLOCKED` แทนการใช้ข้อมูลจริง

## 6. สถานะงาน

ใช้สถานะง่าย ๆ เท่านั้น:

- `IN_PROGRESS` — กำลังทำ
- `READY_TO_MERGE` — code/test ผ่านและรอ merge
- `DONE` — merge แล้วและ evidence ครบตามขอบเขตที่ทำได้
- `EXTERNAL_BLOCKED` — repository side ทำได้ครบแล้ว แต่ต้องใช้ console/credential/test environment ภายนอก
- `BACKLOG` — ยังไม่ถึงลำดับ

ห้ามใช้ `DONE` แทน production verification หากยังไม่ได้ทดสอบ runtime จริง

## 7. หลักตัดสินใจ

เป้าหมายคือ **ทำงานให้เสร็จเร็วที่สุดโดยไม่แลกกับข้อมูลเสียหายหรือ security regression**. การ review ใช้ CI, diff และ evidence เป็นหลัก ไม่สร้างคิว reviewer/agent เพิ่มโดยไม่จำเป็น
