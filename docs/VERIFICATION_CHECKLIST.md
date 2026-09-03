# Production Verification Checklist

ใช้สถานะ `PASS`, `FAIL`, `BLOCKED` หรือ `NOT RUN` พร้อมวันที่และหลักฐาน

## A. Deployment

- [x] Vercel project เชื่อม GitHub `main`
- [x] Production domain เปิดได้
- [x] Login สำเร็จ
- [x] อ่านข้อมูลเดิมได้
- [x] `/api/health` ตอบ HTTP 200 และ `status: ok`
- [ ] ตรวจ production build logs ไม่มี error
- [ ] ตรวจ runtime error logs หลังทดสอบ

## B. Core data flow

- [ ] สร้างรายการทดสอบใน collection ที่กำหนด
- [ ] อ่านรายการกลับได้
- [ ] แก้ไขรายการได้
- [ ] ลบเฉพาะ test record แล้วตรวจ audit/ผลลัพธ์
- [ ] บัญชีไม่มีสิทธิ์ถูก rules ปฏิเสธ

## C. Integrations

- [ ] Weather API
- [ ] Receipt AI
- [ ] Swine AI REST analysis
- [ ] Text-to-speech
- [ ] Welcome/test/payslip email
- [ ] Image upload fallback
- [ ] R2 presigned upload/download
- [ ] Vercel Cron พร้อม `CRON_SECRET`
- [ ] Live AI transport `/live`

## D. PWA and recovery

- [ ] ติดตั้ง PWA บน Android
- [ ] เปิดซ้ำหลังปิดแอป
- [ ] Offline shell แสดงผล
- [ ] Service worker update ไม่ค้างเวอร์ชันเก่า
- [ ] Logout/Login ซ้ำได้

## Current verification record

| Boundary | Result | Evidence |
| --- | --- | --- |
| Browser render | PASS | ผู้ใช้ยืนยันหน้า production เปิดได้ |
| Browser → Firebase Auth | PASS | Login สำเร็จหลังเพิ่ม Authorized Domain |
| Firebase → UI | PASS (read only) | ผู้ใช้ยืนยันข้อมูลเดิมแสดง |
| Browser → HTTP API | PASS | ผู้ใช้เปิด production `/api/health` และได้รับ `{\"status\":\"ok\",\"aiProvider\":\"gemini\",\"aiReady\":false}` เมื่อ 2026-09-03 |
| HTTP API → external services | NOT RUN | Secrets และ logs ยังไม่ยืนยัน |
| Live WebSocket | BLOCKED | handler ปัจจุบันไม่ได้ export ผ่าน `api/index.ts` |
