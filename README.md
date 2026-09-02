# Nipponfarm

ระบบบริหารจัดการฟาร์มสุกรของนิพนธ์ฟาร์ม พัฒนาด้วย React, TypeScript, Vite, Express และ Firebase

## สถานะของ repository

โค้ดชุดนี้นำเข้าจากไฟล์ `NiponFarm-app-main.zip` ที่ผู้ใช้ยืนยันว่าเป็นต้นฉบับจาก Google AI Studio เมื่อวันที่ 2 กันยายน 2026 เพื่อสร้างจุดตั้งต้นที่ตรวจสอบย้อนกลับได้

รอบการนำเข้านี้ยังไม่ได้ตัดสินใจเปลี่ยน Hosting, Database, Firebase project, AI provider หรือบริการจัดเก็บไฟล์ การตัดสินใจเหล่านั้นจะทำหลังจากตรวจสถาปัตยกรรมและข้อมูลที่ต้องรักษาแล้ว

ข้อมูลลับของ Cloudflare R2 ที่เคยฝังอยู่ในซอร์สโค้ดถูกถอดออกก่อนนำเข้า ค่าใช้งานจริงต้องตั้งผ่าน environment variables เท่านั้น และควรยกเลิก credentials ชุดเดิม

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
- repository นี้เป็น baseline สำหรับการย้ายออกจาก Google AI Studio ไม่ได้หมายความว่าระบบผ่านการตรวจความปลอดภัยสำหรับ production แล้ว
- อ่าน `TECHNICAL_DOCUMENTATION.md` และ `PROGRESS.md` เพื่อดูโครงสร้างและประวัติเดิม แต่ให้ยืนยันสถานะกับผลทดสอบจริงก่อนเชื่อข้อความว่าโมดูลพร้อมใช้งาน 100%
