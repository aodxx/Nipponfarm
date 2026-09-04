# Nipponfarm Next Actions

อัปเดต: **4 กันยายน 2026** จาก Audit commit `fba7c2d`.

## หลักการ

ยังไม่เพิ่ม feature ใหม่และยังไม่เปลี่ยน architecture ครั้งใหญ่. ห้ามลบหรือแก้ Firebase data, rules, hosting configuration หรือ secrets เดิมโดยไม่มี owner approval, backup และ rollback plan. ทุก code change ต้องมี test, `npm run lint` และ `npm run build`.

## P0 — ต้องแก้/พิสูจน์ก่อน

1. **Firebase safety baseline:** ระบุ project/database/region, rules/indexes, collections, user counts และ Storage objects ของ project เดิม `Thailottery`; ทำ backup/export และ reconciliation โดยไม่ลบหรือแก้ข้อมูล.
2. **Production integration gate:** ยืนยันชื่อ server-only variables โดยไม่เปิดเผยค่า, ตั้ง/ตรวจ `GEMINI_API_KEY` ชุดใหม่ตาม owner process และทำ preview/test-account verification.
3. **Authorization evidence:** ทดสอบ unauthenticated, PENDING, STAFF, ADMIN และ wrong-owner ต่อ routes และ core data ด้วยข้อมูลแยก.

## P1 — สำคัญ

- แก้ standalone eager initialization ด้วย lazy boundary และ startup test; ห้ามทำก่อนบันทึก root cause/มี regression test.
- ตัดสินใจ transport สำหรับ Live AI ที่รองรับ Vercel หรือแยก runtime.
- ตรวจและปรับ Storage/Firestore ownership policy ผ่าน emulator ก่อน deploy rules.
- ตรวจ Vercel runtime logs หลัง smoke requests โดยไม่เก็บ secret, PII หรือ raw payload.
- ทำ dependency remediation branch สำหรับ critical/high issues โดยเฉพาะ `protobufjs`/`xlsx` และรัน regression.
- รัน core workflow acceptance matrix ครบ: Sow Lifecycle, Receipt → Expense, Pig Sale, Payroll & Advance, Maintenance.
- ลด initial bundle หลัง integration verification ผ่าน.

## P2 — ปรับปรุงภายหลัง

- PWA install/offline/update/relogin acceptance test บน Android จริง.
- ออกแบบ pending sync สำหรับ workflow ภาคสนามที่ไม่ใช่ธุรกรรมการเงิน.
- อัปเดต technical documentation ให้ตรงกับ Vercel.
- ตั้ง package metadata/release version/changelog ให้เหมาะกับระบบจริง.
- ทำ dashboard/BI หลัง data quality และ permission boundary ผ่าน.

## NEXT TASK

**Task 1: สร้าง Firebase Safety & Integration Verification Packet บนสภาพแวดล้อมทดสอบที่แยกจาก production**

ขอบเขตของงานเดียวนี้คือรวบรวม project inventory/backup evidence ที่ owner อนุมัติ, ใช้ test account/data แยก, ตรวจ `GEMINI_API_KEY` readiness และรัน authorization/API smoke matrix พร้อมบันทึก timestamp, environment, status และ cleanup proof. ห้ามเปลี่ยน Firestore rules, migrate/delete data, rotate/revoke credential หรือเปิดใช้งาน external integration ใน production ระหว่างงานนี้.

## Definition of Done ของ NEXT TASK

- มี project ID/database ID/region/rules/index inventory โดยไม่บันทึก secret.
- มี backup/export และ record-count reconciliation ที่ตรวจย้อนกลับได้.
- Health readiness และ API auth matrix มีหลักฐานจาก test environment.
- ไม่มี production record ถูกสร้าง แก้ หรือลบโดยไม่ตั้งใจ.
- รายงาน `CURRENT_STATUS.md`, `TEST_REPORT.md`, `KNOWN_ISSUES.md` อัปเดตด้วยผลจริง.
