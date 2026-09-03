# Nipponfarm

ระบบบริหารจัดการฟาร์มสุกรของนิพนธ์ฟาร์ม พัฒนาด้วย React, TypeScript, Vite, Express และ Firebase

## สถานะของ repository

โค้ดชุดนี้นำเข้าจากไฟล์ `NiponFarm-app-main.zip` ที่ผู้ใช้ยืนยันว่าเป็นต้นฉบับจาก Google AI Studio เมื่อวันที่ 2 กันยายน 2026 เพื่อสร้างจุดตั้งต้นที่ตรวจสอบย้อนกลับได้

repository นี้เป็นแหล่งซอร์สหลักที่ไม่ต้องใช้ Google AI Studio ในการพัฒนาหรือ deploy ระบบปัจจุบันเผยแพร่ผ่าน Vercel ที่ [`nipponfarm.vercel.app`](https://nipponfarm.vercel.app)

เริ่มอ่านสถานะล่าสุดที่ [`PROJECT_STATUS.md`](PROJECT_STATUS.md) และส่งต่องานจาก [`TEAM_HANDOFF.md`](TEAM_HANDOFF.md) ก่อนอ่านเอกสารเชิงลึกใน [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

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
- Vercel แสดงสถานะ `Ready` เมื่อ build/deploy ผ่าน แต่ไม่ได้ยืนยันว่า AI, Email, R2, Cron และ WebSocket ใช้งานได้
- ห้ามสรุปว่า production พร้อมจนกว่ารายการใน [`docs/VERIFICATION_CHECKLIST.md`](docs/VERIFICATION_CHECKLIST.md) จะผ่าน
- อ่าน `TECHNICAL_DOCUMENTATION.md` และ `PROGRESS.md` เพื่อดูโครงสร้างและประวัติเดิม แต่ให้ยืนยันสถานะกับผลทดสอบจริงก่อนเชื่อข้อความว่าโมดูลพร้อมใช้งาน 100%
