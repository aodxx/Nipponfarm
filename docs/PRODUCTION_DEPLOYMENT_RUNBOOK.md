# Niponfarm Production Deployment Runbook

อัปเดต: **4 กันยายน 2026**

## Deployment target

- Repository: `aodxx/Nipponfarm`
- Branch: `main`
- Merged change: `ec276f5 fix: secure server integration endpoints` (squashed PR #2)
- Production URL: `https://nipponfarm.vercel.app`
- Hosting: Vercel
- Build command: `npm run build`
- Output directory: `dist`
- Cron: `/api/cron/daily-tasks`, schedule `0 22 * * *` UTC / 05:00 Asia/Bangkok

การ merge สำเร็จแล้ว แต่เอกสารฉบับนี้ **ยังไม่ใช่หลักฐานว่า production deployment ผ่าน**. ต้องทำ Preview gate และ Production smoke test ตามลำดับก่อนประกาศใช้งาน.

## Safety rules

ห้ามใส่ค่า secret ใน GitHub, source code, issue, PR comment, screenshot หรือแชต. ห้าม deploy Firebase Rules, ลบข้อมูล, migrate collection หรือเปลี่ยน Firebase project ในขั้นตอน code deployment นี้. หากพบข้อมูลผู้ใช้ผิดปกติหรือ API 5xx ให้หยุด rollout และ rollback deployment เท่านั้น.

## Phase 0: Preflight

1. เปิด Vercel project `nipponfarm` และยืนยันว่า Git repository คือ `aodxx/Nipponfarm`, production branch คือ `main` และ deployment ล่าสุดอ้างอิง commit `ec276f5`.
2. บันทึก deployment URL/ID ของ production เดิมเพื่อ rollback ก่อน promote version ใหม่.
3. ยืนยัน Firebase Authorized Domains มี `nipponfarm.vercel.app` และโดเมน custom ที่ใช้งานจริง โดยไม่เปลี่ยน Firestore หรือ Storage rules.
4. ตรวจว่า branch `main` clean และ GitHub Actions `Verify` ของ commit merge ผ่าน.
5. สร้างหรือเลือกบัญชี test ที่แยกจากข้อมูลจริงสำหรับ Preview. ห้ามสร้าง test record ใน production collection หากยังไม่มี cleanup proof.

## Phase 1: Environment variables

ตั้งค่าผ่าน Vercel Project Settings เท่านั้น และเลือก environment ให้ตรงกับการใช้งาน. ค่า public Firebase เป็น identifier ที่ browser ต้องเห็นได้; ค่าอื่นที่ระบุว่า server-only ห้ามขึ้นต้นด้วย `VITE_`.

| Variable | Environment | Required / purpose |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Preview + Production | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Preview + Production | Firebase web config |
| `VITE_FIREBASE_PROJECT_ID` | Preview + Production | Firebase web config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Preview + Production | Firebase web config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Preview + Production | Firebase web config |
| `VITE_FIREBASE_APP_ID` | Preview + Production | Firebase web config |
| `VITE_FIREBASE_MEASUREMENT_ID` | As required | Optional |
| `VITE_FIRESTORE_DATABASE_ID` | Preview + Production | Only for named database |
| `APP_URL` | Production | `https://nipponfarm.vercel.app` |
| `NODE_ENV` | Production | `production` |
| `CRON_SECRET` | Production | Long random secret for Vercel Cron |
| `AI_PROVIDER` | Production | `gemini` |
| `GEMINI_API_KEY` | Production | New/restricted server-only Gemini key |
| `AI_VISION_MODEL` | Production | Approved vision model |
| `AI_TEXT_MODEL` | Production | Approved text model |
| `AI_TTS_MODEL` | Production | Approved TTS model |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Production | Only if email is being enabled |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | Production | Only if ImageKit is enabled |
| `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_ENDPOINT` | Production | New least-privilege R2 credential set |

Do not set AI/SMTP/R2 secrets in Preview unless Preview uses isolated test data and credentials. If a required integration is not configured, keep that feature disabled or document it as blocked; do not treat simulation fallback as production delivery.

## Phase 2: Preview deployment gate

After Vercel creates a Preview deployment for the branch/commit, record its URL and run:

```bash
export PREVIEW_URL="https://<preview-deployment-url>"
curl -fsS "$PREVIEW_URL/"
curl -fsS "$PREVIEW_URL/api/health"
curl -i -sS -X POST "$PREVIEW_URL/api/send-welcome-email" \
  -H 'Content-Type: application/json' --data '{}'
curl -i -sS -X POST "$PREVIEW_URL/api/r2/presign-upload" \
  -H 'Content-Type: application/json' --data '{}'
```

Expected results:

| Check | Expected |
| --- | --- |
| Homepage | HTTP 200 and application HTML |
| `/api/health` | HTTP 200 and JSON `status: ok` |
| Protected email route without token | HTTP 401, `Authentication required` |
| Protected R2 route without token | HTTP 401, `Authentication required` |
| GitHub Verify | PASS |
| Vercel build | READY / successful |

With a test account, verify login, existing read-only display, one authorized admin action in a safe test context, and one STAFF R2 request using the real Firebase ID token. Verify that a missing token, a PENDING user and a mismatched `userId` receive 401/403. Do not send real email or create a real R2 object unless the test destination and cleanup are confirmed.

## Phase 3: Production promotion

Promote the Preview deployment only after all Preview gates pass and Vercel build logs contain no unexplained errors. If Vercel is connected to GitHub `main`, the normal path is to allow the merged commit on `main` to create the production deployment; do not manually change build commands or output settings.

After production deployment reports Ready, record its deployment ID, URL, commit SHA and timestamp. Keep the previous Ready deployment available for rollback until production smoke tests and the first normal operating window complete.

## Phase 4: Production smoke test

Run the non-destructive checks first:

```bash
export PROD_URL="https://nipponfarm.vercel.app"
curl -fsS "$PROD_URL/"
curl -fsS "$PROD_URL/api/health"
curl -i -sS -X POST "$PROD_URL/api/send-welcome-email" \
  -H 'Content-Type: application/json' --data '{}'
curl -i -sS -X POST "$PROD_URL/api/r2/presign-download" \
  -H 'Content-Type: application/json' --data '{}'
curl -i -sS "$PROD_URL/api/cron/daily-tasks"
```

Expected statuses are homepage 200, health 200, protected email/R2 routes 401, and cron 401 without the bearer secret. Then, using the approved test account and test data only, verify login, read-only dashboard, AI readiness, an authorized route, an unauthorized route, and error handling. Check Vercel runtime logs for 5xx, unexpected 401/403, secret values, email addresses, account numbers, raw image payloads or AI prompts.

Do not mark the following as passed without evidence: Gemini success path, SMTP delivery, ImageKit upload, R2 upload/download, Cron successful run, Firestore CRUD, Storage rules, PWA offline recovery, or Live AI WebSocket. The existing audit identified these as unverified or blocked.

## Rollback

Rollback is required if homepage/health fails, authenticated users cannot read existing data, protected routes return unexpected 5xx, or sensitive data appears in logs. In Vercel Dashboard, open the project deployment list, select the last known-good deployment recorded in Phase 0, and use **Promote to Production**. Confirm the production URL and `/api/health` after rollback, then preserve failed deployment logs for diagnosis. Do not delete Firebase data or the failed deployment during incident handling.

## Post-deploy record

Update `PROJECT_STATUS.md` and `docs/VERIFICATION_CHECKLIST.md` with deployment ID, commit SHA, UTC timestamp, URL, status codes and test evidence without recording secrets or personal data. Update `KNOWN_ISSUES.md` only after confirming whether AI, SMTP, R2, Cron and PWA checks actually passed.

## Current release decision

The code change is merged, but production promotion remains **READY FOR CONTROLLED DEPLOYMENT**, not production-verified. The first operational task after deployment should be to confirm the Preview/Production endpoint authorization behavior and inspect runtime logs before enabling external integrations.
