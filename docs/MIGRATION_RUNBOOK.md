# Runbook ย้าย Nipponfarm ไปสภาพแวดล้อมใหม่

เอกสารนี้ใช้ย้ายโดยไม่ปิดระบบเดิมจนกว่าจะตรวจสอบระบบใหม่ผ่าน

## สถานะ

| งาน | สถานะ |
| --- | --- |
| นำซอร์สจาก ZIP เข้า GitHub | เสร็จแล้ว |
| ถอน R2 credentials ที่เคยฝังในซอร์ส | เสร็จแล้ว; ต้อง revoke ชุดเดิม |
| ถอน Firebase config/key ออกจาก Git history ปัจจุบัน | เสร็จใน working tree; ต้อง rotate/restrict key เดิม |
| ทำ runtime config ผ่าน environment variables | เสร็จแล้ว |
| เพิ่ม Vercel Functions/Cron/GitHub Actions | เสร็จแล้ว |
| สร้าง Firebase project ใหม่ที่ผู้ใช้เป็นเจ้าของ | ต้องทำในบัญชีผู้ใช้ |
| สำรองและย้ายข้อมูล Firestore/Storage/Auth | ต้องทำหลังยืนยันสิทธิ์โครงการเดิม |
| สร้าง Vercel project จาก GitHub | เสร็จแล้ว |
| ตั้ง Firebase public config และ Authorized Domain | เสร็จแล้ว |
| Login และอ่านข้อมูลเดิมบน Vercel | ผู้ใช้ยืนยันว่าผ่าน |
| ตั้ง server-only secrets | ยังไม่เสร็จ |
| Smoke test API/AI/Email/R2/Cron/WebSocket | ยังไม่เสร็จ |

## 1. จัดการ key ที่เคยเผยแพร่

1. เปิด Google Cloud Console ของ project เดิม
2. ไปที่ APIs & Services > Credentials
3. ตรวจ key ที่ GitHub เคยแจ้งเตือน
4. ถ้ายังใช้ project เดิมชั่วคราว ให้จำกัด Application restriction เป็น HTTP referrers ของโดเมนจริง และจำกัด API เฉพาะ Firebase ที่ใช้
5. ถ้าไม่ใช้ต่อ ให้ลบหรือ rotate key หลังระบบใหม่ผ่าน smoke test
6. เข้า Cloudflare R2 และ revoke Access Key ID/Secret ชุดที่เคยอยู่ใน ZIP แล้วสร้างชุดใหม่ที่จำกัดเฉพาะ bucket

การลบ key ออกจาก commit ล่าสุดไม่ทำให้ key หายจาก commit เก่า การ rotate/revoke จึงจำเป็น

## 2. สร้าง Firebase project ใหม่

1. สร้าง project ใน Firebase Console ด้วยบัญชีเจ้าของฟาร์ม
2. เปิด Authentication > Sign-in method > Google
3. สร้าง Firestore database โดยเลือก region ใกล้ผู้ใช้และจดชื่อ database หากไม่ใช่ `(default)`
4. เปิด Storage
5. เพิ่ม Web App แล้วนำค่าจาก Firebase SDK config ไปใส่ตัวแปร `VITE_FIREBASE_*` ใน Vercel
6. Deploy `firestore.rules` และ `storage.rules` หลังตรวจอีเมลผู้ดูแลใน rules
7. เพิ่มโดเมน Vercel ใน Authentication > Settings > Authorized domains

## 3. สำรองข้อมูลก่อนย้าย

ต้องเก็บรายการต่อไปนี้ก่อนแตะระบบเดิม:

- รายชื่อ Firebase project ID และ database ID เดิม
- จำนวนเอกสารแยกตาม collection
- Export ของ Firestore
- รายการและสำเนา Firebase Storage objects
- รายชื่อผู้ใช้ Authentication และ provider
- Rules และ indexes
- R2 object inventory

ห้ามลบ project เดิมจนกว่าจำนวน records, files และผู้ใช้จะตรงกัน และผู้ใช้จริงผ่านการทดสอบ

## 4. Deploy Vercel

1. Import GitHub repository `aodxx/Nipponfarm` เข้า Vercel project `nipponfarm`
2. ใช้ preset Vite และ root directory `./`
3. ใส่ environment variables ตาม `.env.example`
4. ตั้ง `APP_URL=https://nipponfarm.vercel.app`
5. Deploy แล้วเปิด `/api/health`; ต้องได้ `status: ok`
6. เพิ่ม `nipponfarm.vercel.app` ใน Firebase Authorized domains
7. ยืนยันว่า production deployment ชี้ไปที่ `main`

## 5. Smoke test ก่อนสลับระบบ

- หน้า Login เปิดได้และ Google Sign-in สำเร็จ
- บัญชี ADMIN เห็นข้อมูลที่ย้ายมา
- เพิ่ม/แก้ไขแม่พันธุ์และกิจกรรมได้
- สแกนบิลผ่าน AI ได้ โดย key ไม่ปรากฏใน browser
- อัปโหลดรูปและวิดีโอได้
- WebSocket `/live` เชื่อมต่อได้
- ส่ง SMTP test ได้
- Rules ปฏิเสธบัญชีที่ไม่มีสิทธิ์
- PWA ติดตั้งและเปิดซ้ำได้

## 6. Cutover และ Rollback

เมื่อ smoke test ผ่าน ให้หยุดการเขียนข้อมูลในระบบเดิมชั่วคราว ทำ export รอบสุดท้าย ตรวจจำนวนข้อมูล แล้วเปลี่ยน URL ที่ผู้ใช้เปิด หากพบความผิดปกติให้กลับ URL เดิมและเก็บระบบใหม่ไว้ตรวจสอบ ห้ามลบข้อมูลทั้งสองฝั่งในวัน cutover
