# Team Handoff

เอกสารนี้เป็นจุดเริ่มต้นสำหรับ AI agent หรือนักพัฒนาที่รับงานต่อ

## เป้าหมายปัจจุบัน

ทำให้ Nipponfarm พัฒนาและ deploy จาก GitHub/Vercel ได้โดยไม่ต้องเปิด Google AI Studio พร้อมรักษาข้อมูล Firebase เดิมจนกว่าการสำรองและย้ายข้อมูลจะผ่านการตรวจ

## อ่านตามลำดับ

1. `PROJECT_STATUS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/ENVIRONMENT_VARIABLES.md`
4. `docs/VERIFICATION_CHECKLIST.md`
5. `docs/MIGRATION_RUNBOOK.md`

## ระบบปัจจุบัน

- Repository: `https://github.com/aodxx/Nipponfarm`
- Production: `https://nipponfarm.vercel.app`
- Frontend: React 19 + Vite + PWA
- HTTP backend: Express exported from `api/index.ts`
- Auth/Data/primary images: Firebase
- AI: Gemini through `server/aiProvider.ts`
- Video: Cloudflare R2
- Optional image gateway: ImageKit
- Scheduled task: Vercel Cron at 22:00 UTC (05:00 Asia/Bangkok)

## กฎการทำงาน

- ห้าม commit secrets, `.env`, service-account JSON หรือ API keys
- ห้ามลบ/ย้ายข้อมูล Firebase เดิมก่อน backup และ record-count reconciliation
- ทุกการเปลี่ยนต้องรัน `npm run lint` และ `npm run build`
- ห้ามรายงานว่า feature ผ่านโดยอาศัย build อย่างเดียว ต้องมีหลักฐานตาม checklist
- อัปเดต `PROJECT_STATUS.md` เมื่อสถานะ integration เปลี่ยน

## Known blockers

- Vercel connector ใน ChatGPT ยังไม่ list project แม้ Dashboard แสดง project แล้ว
- Production API logs ยังไม่ได้ตรวจ
- Server-only environment variables ยังไม่ครบ
- Live AI WebSocket `/live` ยังไม่พร้อมบน Vercel handler
- Firebase ยังเป็น project เดิมชื่อ `Thailottery`

## งานถัดไปที่อนุญาต

ตรวจ server integrations แบบไม่แก้ข้อมูลจริง, เพิ่ม error reporting และออกแบบ migration plan ได้ ห้ามทำ destructive migration หรือ revoke credential ที่ระบบเดิมยังใช้อยู่โดยไม่มี cutover plan
