# Vercel Environment Variables Audit

วันที่ตรวจ: **4 กันยายน 2026**

## Executive result

ตรวจ source code, `.env.example`, `docs/ENVIRONMENT_VARIABLES.md`, `vercel.json` และ production health แล้วพบว่า **รายการตัวแปรที่ประกาศใน repository ครอบคลุมตัวแปรหลักที่โค้ดใช้งาน** แต่ยังไม่สามารถยืนยันได้ว่าค่าจริงถูกตั้งอยู่ใน Vercel ครบทุก environment เพราะ Vercel connector ตอบ `403 Not authorized` สำหรับ team scope `aodaod3826-4032s-projects` และ repository ไม่มี `.vercel/project.json` หรือไฟล์ค่าจริงให้ตรวจแทน.

ดังนั้นผลรวมคือ **Inventory: PASS; Vercel actual configuration: NOT VERIFIED**. หลักฐาน production ที่ตรวจได้คือ `/api/health` ตอบ HTTP 200 แต่ `aiReady:false` ซึ่งยืนยันว่า Gemini server key ยังไม่พร้อมใช้งานหรือไม่ได้ถูกอ่านโดย deployment ปัจจุบัน.

## Variables ที่ต้องมีใน Production

| Variable | Required | Role | Verification |
| --- | --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase browser config | ต้องมีค่าใน Preview/Production |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase browser config | ต้องมีค่าใน Preview/Production |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase browser/server auth project | ต้องมีค่าและตรงกับ Firebase project เดิมที่ตั้งใจใช้ |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage | ต้องมีค่าใน Preview/Production |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase browser config | ต้องมีค่าใน Preview/Production |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase browser config | ต้องมีค่าใน Preview/Production |
| `VITE_FIRESTORE_DATABASE_ID` | Conditional | Named Firestore database | ต้องมีเฉพาะเมื่อใช้ named database; ว่างได้สำหรับ default |
| `APP_URL` | Yes | Email links/runtime | Production ควรเป็น `https://nipponfarm.vercel.app` |
| `NODE_ENV` | Yes | Runtime mode | ควรเป็น `production` |
| `CRON_SECRET` | Yes before enabling Cron | Vercel Cron authorization | ต้องเป็น random secret และใช้เฉพาะ Production |
| `AI_PROVIDER` | Yes when AI enabled | Provider selection | ควรเป็น `gemini` |
| `GEMINI_API_KEY` | Yes when AI enabled | Server-only Gemini credential | ต้องเป็น key ใหม่/restricted; ห้ามใช้ `VITE_` |
| `AI_VISION_MODEL` | Yes when receipt/swine AI enabled | Gemini vision model | ต้องเป็น model ที่ account ใช้งานได้ |
| `AI_TEXT_MODEL` | Yes when text AI enabled | Gemini text model | ต้องเป็น model ที่ account ใช้งานได้ |
| `AI_TTS_MODEL` | Yes when TTS enabled | Gemini TTS model | ต้องเป็น model ที่ account ใช้งานได้ |
| `SMTP_HOST` | Yes when email enabled | SMTP server | ต้องตั้งพร้อม SMTP credentials ครบ |
| `SMTP_PORT` | Yes when email enabled | SMTP port | Numeric; ปกติ 587 หรือ 465 ตาม provider |
| `SMTP_USER` | Yes when email enabled | SMTP account | Server-only |
| `SMTP_PASS` | Yes when email enabled | SMTP password | Server-only secret |
| `SMTP_FROM` | Yes when email enabled | Sender address | ต้องเป็น sender ที่ provider อนุญาต |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Yes when R2 enabled | R2 account | ใช้ชุด credential ใหม่ |
| `CLOUDFLARE_R2_BUCKET_NAME` | Yes when R2 enabled | R2 bucket | จำกัดเฉพาะ bucket ที่ต้องใช้ |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Yes when R2 enabled | R2 access credential | Least privilege |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Yes when R2 enabled | R2 secret | Server-only secret |
| `CLOUDFLARE_R2_ENDPOINT` | Yes when R2 enabled | S3-compatible endpoint | ต้องตรง account/bucket setup |

## Variables ที่เป็น Optional

| Variable | Use | Note |
| --- | --- | --- |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Analytics | ว่างได้ |
| `IMAGEKIT_PUBLIC_KEY` | Declared ImageKit config | ไม่พบการใช้งาน server-side ที่จำเป็นใน current code; ไม่ต้องตั้งเพียงเพื่อ Firebase Storage fallback |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit upload gateway | ต้องใช้คู่กับ `IMAGEKIT_URL_ENDPOINT`; ตั้งเมื่อเปิด ImageKit เท่านั้น |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit upload gateway | ต้องใช้คู่กับ private key |

## Variables ที่ไม่ควรตั้งเป็น Production requirement

| Variable | Classification | Note |
| --- | --- | --- |
| `PORT` | Local/standalone only | Vercel จัดการ port เอง; ไม่ต้องตั้งเพื่อ Vercel Functions |
| `DISABLE_HMR` | Local tooling only | ไม่พบเป็น production requirement |
| `CENTRAL_GEMINI_API_KEY` | Legacy compatibility | โค้ดยังรองรับเป็น fallback แต่ไม่ควรใช้เป็นชื่อหลัก; ตั้ง `GEMINI_API_KEY` แทน และวางแผนเลิก fallback |

## Source-to-code verification

ตรวจด้วยการค้นหา `process.env.*` และ `import.meta.env.*` ใน source พบตัวแปรที่ใช้งานจริง ได้แก่ `AI_PROVIDER`, `AI_TEXT_MODEL`, `AI_TTS_MODEL`, `AI_VISION_MODEL`, `APP_URL`, `CENTRAL_GEMINI_API_KEY`, `CLOUDFLARE_R2_*`, `CRON_SECRET`, `DISABLE_HMR`, `GEMINI_API_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `NODE_ENV`, `PORT`, `SMTP_*`, `VITE_FIREBASE_*` และ `VITE_FIRESTORE_DATABASE_ID`. ไม่มี bracket-notation env access เพิ่มเติมนอก inventory นี้.

`vercel.json` ใช้ `npm run build`, output `dist`, function `api/index.ts` และ cron path `/api/cron/daily-tasks`; จึงต้องมี `CRON_SECRET` ก่อนเปิดใช้งาน cron สำเร็จ.

## วิธีตรวจค่าจริงใน Vercel โดยไม่เปิดเผย secret

1. เปิด Vercel Dashboard → Project `nipponfarm` → **Settings → Environment Variables**.
2. ตรวจชื่อ variable และ environment (`Production`, `Preview`, `Development`) โดยไม่ copy หรือ screenshot ค่า value.
3. กดแก้ไขแต่ละรายการเพื่อดูว่ามีค่าถูกตั้งไว้หรือไม่; ให้รายงานเพียง `present/missing`, ไม่รายงาน value.
4. ตรวจว่า `GEMINI_API_KEY`, SMTP password, R2 secret, ImageKit private key และ `CRON_SECRET` ไม่มี `VITE_` prefix.
5. ตรวจ Preview ด้วย credentials/test project แยกจาก Production; อย่านำ production secrets ไปใส่ Preview โดยไม่มี data isolation.
6. หลังแก้ environment variables ต้อง Redeploy เพราะ Vercel injects env ตอน build/runtime deployment.
7. ทดสอบ `/api/health`; เมื่อ Gemini พร้อม response ควรมี `aiReady:true` โดยไม่แสดง key.
8. ตรวจ runtime logs หลังเรียก route และยืนยันว่าไม่มี token, secret, email, account number หรือ raw image payload.

## Acceptance checklist

- [ ] Firebase public variables ครบใน Production และ Preview.
- [ ] `APP_URL` และ `NODE_ENV` ถูกต้องใน Production.
- [ ] `GEMINI_API_KEY` มีค่าและ `/api/health` รายงาน `aiReady:true` หลัง redeploy.
- [ ] `CRON_SECRET` มีค่าใน Production และ request ที่ไม่มี secret ได้ HTTP 401.
- [ ] SMTP variables ครบก่อนเปิด email.
- [ ] R2 variables ครบด้วย credential ใหม่ก่อนเปิด video upload/download.
- [ ] ImageKit variables ตั้งเฉพาะเมื่อเปิด ImageKit.
- [ ] Firebase Authorized Domains และ project ID ถูกต้อง.
- [ ] Preview gate, production smoke test และ rollback deployment ถูกบันทึก.

## Current decision

ยัง **ไม่ควรแก้ไขหรือตั้งค่า secrets โดยอัตโนมัติ** จาก task นี้ เพราะไม่มีค่าจริงที่ผู้ใช้มอบให้และ Vercel connector ไม่มีสิทธิ์ตรวจ. ขั้นตอนที่ปลอดภัยคือให้เจ้าของ project ตรวจรายการใน Vercel Dashboard ตามตารางนี้ แล้วตั้งค่าเฉพาะช่องที่จำเป็น จากนั้น redeploy และเก็บผลตรวจแบบไม่เปิดเผยค่า.
