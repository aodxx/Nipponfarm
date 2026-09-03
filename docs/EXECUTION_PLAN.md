# แผนดำเนินงาน Nipponfarm ต่อจากการย้ายขึ้น Vercel

อัปเดตล่าสุด: 2026-09-03

## เป้าหมาย

ทำให้ Nipponfarm พัฒนา ทดสอบ และ deploy จาก GitHub/Vercel ได้โดยไม่ต้องพึ่ง Google AI Studio โดยรักษาข้อมูลเดิมไว้ครบ ป้องกันความลับรั่ว และมีทางย้อนกลับหากการย้ายระบบผิดพลาด

## สถานะตั้งต้น

- ผ่านแล้ว: GitHub เป็นแหล่งซอร์สหลัก, CI lint/build, Vercel production, หน้าเว็บ, Firebase Login และการอ่านข้อมูลเดิม
- ยังไม่ยืนยัน: HTTP API, AI, Email, ImageKit/R2, Cron, สิทธิ์เขียนข้อมูล และ PWA
- ยังไม่พร้อม: Live AI WebSocket และการแยก Firebase ออกจาก project เดิมชื่อ `Thailottery`

## วิธีใช้แผนนี้

1. ทำทีละระยะตามลำดับ ห้ามข้ามเกณฑ์ผ่าน
2. ใช้บัญชี/ข้อมูลทดสอบ และตั้งชื่อ record ให้ค้นหาและลบได้ง่าย
3. ทุกงานโค้ดต้องผ่าน `npm run lint` และ `npm run build`
4. ห้ามใส่ค่าความลับใน GitHub, เอกสาร, screenshot หรือแชต
5. อัปเดต `PROJECT_STATUS.md` และ `docs/VERIFICATION_CHECKLIST.md` หลังจบแต่ละระยะ

## ภาพรวมลำดับงาน

| ระยะ | เป้าหมาย | ผู้ดำเนินการหลัก | เกณฑ์ผ่าน |
| --- | --- | --- | --- |
| 0 | ตรึงสถานะและทางย้อนกลับ | Codex + เจ้าของระบบ | รู้ production commit และ rollback ได้ |
| 1 | ตรวจ HTTP API และ logs | Codex; เจ้าของช่วยเปิด Dashboard เมื่อจำเป็น | `/api/health` ตอบ 200 และไม่มี runtime error |
| 2 | ตรวจข้อมูลและสิทธิ์ | Codex + ผู้ใช้ทดสอบในหน้าเว็บ | Create/Read/Update/Delete test ผ่าน; บัญชีไม่มีสิทธิ์ถูกปฏิเสธ |
| 3 | ปิดความเสี่ยง key/secret | เจ้าของบัญชี โดย Codex นำทาง | จำกัดหรือ rotate key ที่เคยเผยแพร่ครบ |
| 4 | เปิด integrations ทีละตัว | Codex + เจ้าของใส่ secret | AI, Email, รูป และวิดีโอมีหลักฐานทดสอบ |
| 5 | ทำ Cron และ Live AI ให้เหมาะกับ Vercel | Codex | Cron รันจริง; Live AI ใช้ transport ที่รองรับ |
| 6 | สำรองและแยก Firebase | เจ้าของบัญชี + Codex | จำนวนผู้ใช้/records/files ตรงและทดสอบระบบใหม่ผ่าน |
| 7 | Release, monitoring และคู่มือทีม | Codex + ทีม | มี preview gate, rollback, alerts และ runbook |
| 8 | ปรับประสิทธิภาพและพัฒนาต่อ | ทีม | Core Web Vitals/ขนาด bundle อยู่ในเกณฑ์ที่กำหนด |

---

## ระยะ 0 — ตรึงสถานะที่ใช้งานได้และเตรียมย้อนกลับ

### งาน

- [ ] บันทึก production URL, deployment ID, branch และ commit ที่ใช้งานจริง
- [ ] บันทึกค่า Environment Variables เฉพาะ “ชื่อและ environment” ห้ามบันทึกค่าจริง
- [ ] ตรวจว่า Vercel ยังเชื่อม `aodxx/Nipponfarm` branch `main`
- [ ] กำหนดวิธีย้อนกลับ: เลือก deployment ก่อนหน้าที่เคยเปิดได้และจดขั้นตอน Promote/Rollback
- [ ] สร้างบัญชีและข้อมูลทดสอบที่แยกจากข้อมูลใช้งานจริง

### ผู้ใช้ต้องทำ

- เปิด Vercel Dashboard เมื่อ Codex ขอ และยืนยันว่ากำลังอยู่ใน project `nipponfarm`
- ห้ามส่งค่า secret ให้ Codex; ใส่ในช่อง Vercel ด้วยตนเองเมื่อได้รับชื่อช่อง

### เกณฑ์ผ่าน

- ทีมรู้ชัดว่าระบบจริงชี้ commit ใด และย้อนกลับ deployment ใดได้

---

## ระยะ 1 — ตรวจ HTTP API และเพิ่มการมองเห็นปัญหา

### งานตามลำดับ

1. เปิด `https://nipponfarm.vercel.app/api/health`
2. ยืนยัน HTTP 200 และ JSON มี `status: "ok"`
3. ตรวจ Build Logs ของ deployment ล่าสุด
4. ตรวจ Runtime Logs ขณะเรียก `/api/health`
5. ถ้าไม่มีข้อมูลเพียงพอ ให้เพิ่ม structured logging ที่ไม่บันทึก token, อีเมล, ข้อมูลส่วนบุคคล หรือ payload สำคัญ
6. เพิ่ม request ID และ error response รูปแบบเดียวกันให้ API
7. redeploy เป็น Preview, ตรวจซ้ำ แล้วจึง promote/deploy Production

### สิ่งที่ Codex ทำได้

- ตรวจ route และ response contract
- แก้โค้ด logging/error handling
- เพิ่ม automated API smoke test และอัปเดตเอกสาร

### ผู้ใช้ต้องทำ

- หากการเชื่อมต่อ Vercel ยังอ่าน logs ไม่ได้ ให้เปิด Logs และส่ง screenshot ที่ปิดบัง secret แล้ว

### เกณฑ์ผ่าน

- `/api/health` ตอบ 200 จาก production
- Build Logs และ Runtime Logs ไม่มี error ที่ยังไม่อธิบาย
- มีหลักฐานวันที่, URL, status code และ response ที่ไม่เปิดเผยความลับ

---

## ระยะ 2 — ตรวจ Core Data และ Security Rules

### งานตามลำดับ

1. เลือก collection ที่ปลอดภัยสำหรับ test record
2. สร้าง record ชื่อ `MIGRATION_TEST_<date>`
3. อ่านกลับและเทียบค่าทุก field
4. แก้ไข field หนึ่งค่าและอ่านกลับ
5. ลบเฉพาะ test record
6. ทดสอบด้วยบัญชีสิทธิ์ต่ำหรือไม่มีสิทธิ์
7. ยืนยันว่า Firestore Rules และ Storage Rules ปฏิเสธสิ่งที่ไม่อนุญาต
8. ตรวจเส้นทางหลัก: แม่พันธุ์, กิจกรรม, บิล, ข่าว, เงินเดือน และงานซ่อมบำรุง โดยไม่แก้ข้อมูลจริง

### ข้อควรระวัง

- ห้ามทดลองลบ record จริง
- ห้าม deploy rules ใหม่จนกว่าจะ review ผลกระทบต่อระบบเดิม เพราะ Firebase project เดิมอาจใช้ร่วมกับระบบอื่น

### เกณฑ์ผ่าน

- CRUD test ครบและลบ test record แล้ว
- บัญชีไม่มีสิทธิ์ถูกปฏิเสธตามคาด
- ไม่มีข้อมูลจริงถูกเปลี่ยนโดยไม่ตั้งใจ

---

## ระยะ 3 — จัดการ Key และ Secret ที่เคยเผยแพร่

### งานตามลำดับ

1. ทำ inventory ว่า key ใดกำลังถูกระบบเดิมและระบบใหม่ใช้งาน
2. จำกัด Firebase web API key ด้วย HTTP referrers ของโดเมนที่ใช้จริง
3. จำกัด API ที่ key เรียกได้เท่าที่จำเป็น
4. สร้าง/rotate Gemini key หาก key เดิมเคยอยู่ใน source หรือ history
5. ตรวจ R2 credential ที่เคยอยู่ใน ZIP
6. สร้าง R2 credential ใหม่แบบจำกัด bucket และสิทธิ์ขั้นต่ำ
7. เปลี่ยนระบบไปใช้ credential ใหม่และทดสอบ
8. revoke ชุดเดิมหลังยืนยันว่าระบบใหม่ผ่านเท่านั้น
9. ตรวจ Git history และ CI logs ว่าไม่มี secret ใหม่หลุด

### ผู้ใช้ต้องทำ

- ลงชื่อเข้า Google Cloud/Firebase/Cloudflare และกดสร้าง จำกัด หรือ revoke credential
- ใส่ secret ลง Vercel Environment Variables ด้วยตนเอง

### สิ่งที่ Codex ทำได้

- บอกชื่อช่องและค่าประเภทใดที่ต้องใส่ โดยไม่ขอค่าจริง
- ตรวจว่าโค้ดแยก public config กับ server secret ถูกต้อง
- เพิ่ม secret scanning ใน CI

### เกณฑ์ผ่าน

- key ที่เคยเผยแพร่ถูกจำกัดหรือยกเลิกครบ
- production ใช้ credential ใหม่และสิทธิ์ขั้นต่ำ
- ไม่มี secret อยู่ใน GitHub หรือ browser bundle

---

## ระยะ 4 — เปิด External Integrations ทีละตัว

ทำทีละ integration ตามลำดับต่อไปนี้ และจบการทดสอบตัวหนึ่งก่อนเริ่มตัวถัดไป

### 4.1 Gemini AI

- [ ] ตั้ง `AI_PROVIDER`, `GEMINI_API_KEY` และชื่อโมเดลฝั่ง server
- [ ] ตรวจ health ว่า AI พร้อม โดยไม่แสดง key
- [ ] ทดสอบ OCR ใบเสร็จหนึ่งภาพที่ไม่มีข้อมูลอ่อนไหว
- [ ] ทดสอบ Swine AI หนึ่งกรณี
- [ ] ทดสอบ Text-to-Speech
- [ ] เพิ่ม timeout, validation, error message และ rate limit
- [ ] ตรวจว่า Network tab/browser bundle ไม่เห็น API key

### 4.2 Email

- [ ] ตั้ง `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- [ ] ส่ง test email ไปยังบัญชีทดสอบ
- [ ] ตรวจ sender, subject, encoding ภาษาไทย และกรณีส่งไม่สำเร็จ
- [ ] ป้องกันการส่งซ้ำจาก retry/cron

### 4.3 รูปภาพ

- [ ] ทดสอบ Firebase Storage upload/download
- [ ] ถ้าใช้ ImageKit ให้ตั้ง key ใหม่และทดสอบ signed upload
- [ ] ตรวจชนิดไฟล์ ขนาดสูงสุด สิทธิ์เข้าถึง และการลบ test file

### 4.4 วิดีโอผ่าน Cloudflare R2

- [ ] สร้าง bucket/credential ที่จำกัดสิทธิ์
- [ ] ตั้ง R2 variables ฝั่ง server
- [ ] ทดสอบ presigned upload, playback/download และหมดอายุของ URL
- [ ] ลบ test object และตรวจว่า object จริงไม่ถูกกระทบ

### เกณฑ์ผ่านรวม

- แต่ละ integration มี test case, ผลลัพธ์, timestamp และ error case อย่างน้อยหนึ่งกรณี
- ไม่มี secret ใน client หรือ logs

---

## ระยะ 5 — Scheduled Jobs และ Live AI

### 5.1 Vercel Cron

1. สร้าง `CRON_SECRET` แบบสุ่มและเก็บเฉพาะใน Vercel
2. ตั้ง `APP_URL=https://nipponfarm.vercel.app`
3. ตรวจ schedule `0 22 * * *` ซึ่งตรงกับ 05:00 Asia/Bangkok
4. เรียก cron route แบบทดสอบโดยไม่ส่งอีเมลจริงจำนวนมาก
5. ตรวจ Runtime Logs และผลป้องกัน unauthorized request
6. ทดสอบ idempotency เพื่อไม่ให้แจ้งเตือนหรือจ่ายงานซ้ำ

### 5.2 Live AI

WebSocket แบบ server process เดิมไม่ควรถูกนับว่าพร้อมบน Vercel Function ปัจจุบัน ต้องเลือกและทำหนึ่งแนวทาง:

- ทางหลัก: เปลี่ยนเป็น HTTP streaming/SSE ที่เข้ากับ serverless
- ทางเลือก: แยกบริการ WebSocket ไปยัง runtime ที่รองรับ connection ระยะยาว

Codex ต้องทำ proof of concept, ทดสอบ disconnect/reconnect, timeout, auth และค่าใช้จ่าย ก่อนเลือกใช้จริง

### เกณฑ์ผ่าน

- Cron มีหลักฐานรันจริงหนึ่งรอบและไม่ทำงานซ้ำ
- Live AI เชื่อมต่อ ใช้งาน และ reconnect ได้ด้วย transport ที่เลือก

---

## ระยะ 6 — สำรองและแยก Firebase ออกจาก project เดิม

ระยะนี้เริ่มได้ต่อเมื่อระยะ 1–5 ผ่าน และมีผู้รับผิดชอบ backup ชัดเจน

### 6.1 Inventory และ Backup

- [ ] บันทึก project ID, database ID, region, rules และ indexes เดิม
- [ ] นับ documents แยกทุก collection/subcollection
- [ ] export Firestore
- [ ] สำรองและนับ Firebase Storage objects
- [ ] export รายชื่อ Firebase Auth users/providers ตามวิธีที่รองรับ
- [ ] ทำ R2 object inventory ถ้ามี
- [ ] ทดลอง restore ใน environment ทดสอบ

### 6.2 สร้าง Firebase ใหม่

- [ ] สร้าง project ที่ชื่อและเจ้าของตรงกับ Nipponfarm
- [ ] เลือก region โดยพิจารณา latency, ค่าใช้จ่าย และข้อจำกัดการย้าย
- [ ] เปิด Auth providers, Firestore และ Storage
- [ ] review/deploy rules และ indexes
- [ ] สร้าง Web App และตั้ง `VITE_FIREBASE_*` สำหรับ Preview ก่อน

### 6.3 Dry Run Migration

- [ ] นำเข้าข้อมูลลง project ใหม่
- [ ] เทียบจำนวน documents, users และ files
- [ ] sampling checksum/field comparison
- [ ] ทดสอบ Login, read, write, upload และ integrations บน Preview
- [ ] บันทึกเวลาที่ใช้และข้อผิดพลาด

### 6.4 Cutover

1. แจ้งช่วงหยุดเขียนข้อมูล
2. export delta รอบสุดท้าย
3. import และ reconcile จำนวนอีกครั้ง
4. เปลี่ยน Vercel Production env ไป Firebase ใหม่
5. deploy และทำ smoke test
6. ถ้าพบปัญหา ให้ rollback env/deployment กลับระบบเดิม
7. เก็บระบบเดิมแบบ read-only ตามระยะเวลาที่กำหนดก่อนพิจารณาปิด

### เกณฑ์ผ่าน

- documents, users และ files ตรงตาม reconciliation
- ผู้ใช้จริงทดสอบงานหลักผ่าน
- rollback ถูกทดลองหรือมีหลักฐานว่าทำได้
- ยังไม่ลบระบบเดิมทันทีหลัง cutover

---

## ระยะ 7 — Release Process, Monitoring และงานทีม

### งาน

- [ ] ใช้ feature branch และ Pull Request สำหรับงานใหม่
- [ ] ให้ทุก PR สร้าง Preview Deployment
- [ ] บังคับ lint/build/test ก่อน merge
- [ ] เพิ่ม end-to-end smoke tests: health, login, authorized read และ test mutation
- [ ] ทดสอบ Preview ก่อน promote ไป Production
- [ ] กำหนด rollback owner และ incident checklist
- [ ] เปิด error monitoring/alerts โดยไม่บันทึกข้อมูลส่วนบุคคลหรือ secret
- [ ] เพิ่ม uptime check สำหรับหน้าเว็บและ `/api/health`
- [ ] กำหนด backup schedule และทดสอบ restore เป็นรอบ
- [ ] อัปเดต `PROJECT_STATUS.md`, `TEAM_HANDOFF.md` และ checklist ทุก release

### เกณฑ์ผ่าน

- ไม่มีการ deploy production ที่ข้าม test gate
- ทีมคนใหม่เริ่มงานจากเอกสารได้โดยไม่ต้องพึ่งประวัติแชต
- เมื่อเกิดปัญหา ทีมระบุ deployment, logs และ rollback path ได้

---

## ระยะ 8 — Performance และแผนพัฒนาต่อ

เริ่มหลังระบบหลักเสถียร ไม่ทำปนกับ migration

### งาน

- [ ] วิเคราะห์ bundle หลักซึ่งปัจจุบันมีขนาดใหญ่
- [ ] แยก route/component ด้วย lazy loading
- [ ] ปรับรูปภาพ, cache และ PWA update strategy
- [ ] วัด Core Web Vitals จาก production
- [ ] เพิ่ม accessibility และ mobile regression tests
- [ ] สร้าง backlog ฟีเจอร์ใหม่โดยแยกจาก migration defects

### เกณฑ์ผ่าน

- มี baseline และเป้าหมาย performance ที่วัดซ้ำได้
- ฟีเจอร์ใหม่ไม่ทำให้ migration verification ย้อนกลับเป็นไม่ผ่าน

---

## ลำดับที่ควรเริ่มทันที

1. ระยะ 0: บันทึก production deployment และ rollback target
2. ระยะ 1: เปิด `/api/health` และเก็บ response/logs
3. ระยะ 2: ทำ CRUD test record และทดสอบบัญชีสิทธิ์ต่ำ
4. ระยะ 3: inventory/จำกัด key ที่เคยเผยแพร่
5. ระยะ 4.1: เปิด Gemini และทดสอบ AI หนึ่งกรณี

ห้ามเริ่มการย้าย Firebase จริงจนกว่างานข้างต้นและ backup/restore rehearsal จะผ่าน

## รูปแบบหลักฐานที่ต้องบันทึก

| วันที่/เวลา | Environment | Feature/Route | ผล | หลักฐาน | ผู้ตรวจ | Issue/Commit |
| --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD HH:mm | Preview/Production | เช่น `/api/health` | PASS/FAIL/BLOCKED | URL, status, screenshot/log ที่ปิด secret | ชื่อ | ลิงก์ |

## Definition of Done ของการย้ายระบบ

ถือว่าการย้ายเสร็จเมื่อครบทุกข้อ:

- ระบบหลักทำงานจาก GitHub/Vercel โดยไม่ต้องเปิด AI Studio
- Auth, data CRUD, AI, email, media, cron, PWA และ Live AI ผ่าน end-to-end tests
- secret เก็บฝั่ง server และ key ที่เคยเผยแพร่ถูก rotate/restrict
- Firebase ใหม่มีข้อมูล ผู้ใช้ ไฟล์ rules และ indexes ครบ พร้อมผล reconciliation
- มี backup ที่ restore ได้, monitoring, release gate และ rollback ที่ใช้ได้จริง
- เอกสารสถานะตรงกับ production และทีมรับช่วงงานต่อได้
