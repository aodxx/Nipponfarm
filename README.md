# Nipponfarm

ระบบบริหารจัดการฟาร์มสุกรของนิพนธ์ฟาร์ม พัฒนาด้วย React, TypeScript, Vite, Express และ Firebase

## สถานะของ repository

โค้ดชุดนี้นำเข้าจากไฟล์ `NiponFarm-app-main.zip` ที่ผู้ใช้ยืนยันว่าเป็นต้นฉบับจาก Google AI Studio เมื่อวันที่ 2 กันยายน 2026 เพื่อสร้างจุดตั้งต้นที่ตรวจสอบย้อนกลับได้

repository นี้เป็นแหล่งซอร์สหลักที่ไม่ต้องใช้ Google AI Studio ในการพัฒนาหรือ deploy สถาปัตยกรรมเป้าหมายและขั้นตอนย้ายระบบอยู่ที่ [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) และ [`docs/MIGRATION_RUNBOOK.md`](docs/MIGRATION_RUNBOOK.md)

ข้อมูลลับของ Cloudflare R2 ที่เคยฝังอยู่ในซอร์สโค้ดถูกถอดออกก่อนนำเข้า และ Firebase config เดิมถูกเปลี่ยนเป็น environment variables ค่าใช้งานจริงต้องตั้งบนระบบ hosting เท่านั้น และต้องยกเลิก credentials ชุดเดิม

## เริ่มต้นในเครื่องพัฒนา

```bash
npm ci
cp .env.example .env.local
npm run dev
```

ตรวจสอบก่อนส่งมอบ:

```bash
npm run lint
npm run build
```

## ข้อควรระวัง

- ห้าม commit `.env` หรือ credentials จริง
- Render Free เหมาะกับการทดสอบ แต่ไม่รับประกัน `node-cron` เวลา 05:00 เพราะบริการอาจพักเมื่อไม่มีการใช้งาน
- อ่าน `TECHNICAL_DOCUMENTATION.md` และ `PROGRESS.md` เพื่อดูโครงสร้างและประวัติเดิม แต่ให้ยืนยันสถานะกับผลทดสอบจริงก่อนเชื่อข้อความว่าโมดูลพร้อมใช้งาน 100%
