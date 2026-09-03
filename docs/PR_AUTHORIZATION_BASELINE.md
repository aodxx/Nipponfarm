# PR Authorization Baseline

## Scope

PR นี้ปิดช่องว่าง authorization ที่พบจาก Audit โดยเพิ่มการตรวจ Firebase ID token, active/admin role และ ownership ของ `userId` ใน server routes ต่อไปนี้:

| Route | Policy |
| --- | --- |
| `POST /api/send-welcome-email` | Admin only |
| `POST /api/send-payslip-email` | Admin only |
| `POST /api/test-email` | Admin only |
| `POST /api/trigger-daily-tasks-alert` | Admin only |
| `POST /api/r2/presign-upload` | Verified active user + body UID match |
| `POST /api/r2/presign-download` | Verified active user + body UID match |
| `POST /api/upload-gateway` | Verified active user |

R2 keys ถูกจำกัดให้อยู่ใน `videos/<module>/<filename>` และรับเฉพาะ content type `video/webm`, `video/mp4` หรือ `video/quicktime`. Image gateway จำกัด payload ไม่เกิน 15 MiB.

## Client changes

จุดเรียก API ที่เกี่ยวข้องเปลี่ยนจาก `fetch` เป็น `authenticatedFetch` ซึ่งใช้ Firebase current user ขอ ID token แล้วส่งเป็น `Authorization: Bearer <token>`. Firebase Rules, data model, production environment และ deployment configuration ไม่ได้ถูกแก้ไข.

## Verification

- `npm run test:auth`: ผ่าน 5 policy tests.
- HTTP smoke test: protected routes ทั้ง 7 routes ตอบ HTTP 401 เมื่อไม่มี token และไม่โหลด Firebase/R2/SMTP ต่อ.
- `npm run lint`: ผ่าน.
- `npm run build`: ต้องผ่านก่อน merge; build อาจแสดง warning เดิมจาก bundle size และ lottie eval.
- ตรวจ diff ด้วย `git diff --check` และตรวจ secret pattern ก่อน commit.

## Security limitation retained

PR นี้ยืนยันว่า request ต้องมี verified token และ R2 `userId` ต้องตรงกับ token แต่ legacy R2 key ยังไม่มี UID อยู่ใน path จึงยังไม่สามารถพิสูจน์ ownership ของ object รายชิ้นได้อย่างสมบูรณ์. การเปลี่ยน key namespace หรือย้าย object ต้องทำเป็น migration แยกต่างหากพร้อม backup และ rollback.

## Rollout

ให้ deploy เป็น Preview ก่อน, ทดสอบด้วยบัญชี ADMIN/STAFF/PENDING และข้อมูลทดสอบแยก, ตรวจ 401/403 และ success path จากนั้นจึงพิจารณา promote. ห้ามใส่ secret ใน PR และห้าม deploy Firebase Rules จาก PR นี้.
