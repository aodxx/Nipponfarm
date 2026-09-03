# Environment Variables

เอกสารนี้เก็บเฉพาะชื่อ หน้าที่ และสถานะ ห้ามบันทึกค่าจริง

## Public browser configuration

ตัวแปรเหล่านี้ถูก bundle ลง browser โดยตั้งใจ จึงต้องขึ้นต้น `VITE_`

| Variable | Required | สถานะ 2026-09-03 |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | ใช่ | ตั้งแล้ว |
| `VITE_FIREBASE_AUTH_DOMAIN` | ใช่ | ตั้งแล้ว |
| `VITE_FIREBASE_PROJECT_ID` | ใช่ | ตั้งแล้ว |
| `VITE_FIREBASE_STORAGE_BUCKET` | ใช่ | ตั้งแล้ว |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ใช่ | ตั้งแล้ว |
| `VITE_FIREBASE_APP_ID` | ใช่ | ตั้งแล้ว |
| `VITE_FIREBASE_MEASUREMENT_ID` | ไม่ | ไม่จำเป็นในขณะนี้ |
| `VITE_FIRESTORE_DATABASE_ID` | เฉพาะ named database | ตั้งแล้ว |

## Server-only configuration

ห้ามเติม `VITE_` และห้ามนำค่าไปไว้ใน client code

| Group | Variables | สถานะ |
| --- | --- | --- |
| Runtime | `APP_URL`, `NODE_ENV` | ต้องตรวจบน Vercel |
| Cron | `CRON_SECRET` | ยังไม่ตั้ง/ไม่ยืนยัน |
| AI | `AI_PROVIDER`, `GEMINI_API_KEY`, `AI_VISION_MODEL`, `AI_TEXT_MODEL`, `AI_TTS_MODEL` | ยังไม่ยืนยัน |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | ยังไม่ยืนยัน |
| ImageKit | `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | ยังไม่ยืนยัน |
| R2 | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_ENDPOINT` | ต้องใช้ชุดใหม่และยังไม่ยืนยัน |

## Environments

- Firebase public config: Production และ Preview
- Production secrets: Production เท่านั้นเป็นค่าเริ่มต้น
- Preview secrets: เปิดเมื่อมีแผนใช้ข้อมูลทดสอบแยกจาก production
- Local: เก็บใน `.env.local` ซึ่งต้องถูก ignore โดย Git

## Security acceptance

- Firebase web config เป็น public identifier แต่ต้องคุมด้วย Authorized Domains, API restrictions, Firestore Rules และ Storage Rules
- `GEMINI_API_KEY`, SMTP password, ImageKit private key, R2 secret และ `CRON_SECRET` เป็น secrets
- การมีชื่อตัวแปรใน `.env.example` ไม่ได้แปลว่ามีค่าใช้งานจริง
