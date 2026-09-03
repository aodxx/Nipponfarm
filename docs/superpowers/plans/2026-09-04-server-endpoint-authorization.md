# Server Endpoint Authorization Baseline Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with tests and review gates.

**Goal:** ปิดช่องว่าง authorization ของ email, upload gateway, R2 presign และ manual trigger โดยผูกสิทธิ์กับ Firebase ID token ที่ตรวจสอบแล้ว ไม่เชื่อ `userId` จาก request body เพียงอย่างเดียว

**Architecture:** ใช้ middleware บน Express ที่ต่อจาก `requireFirebaseAuth` เดิม เพิ่ม policy สำหรับ active user และ admin และตรวจว่า body userId ตรงกับ UID ใน token. คง Firestore/Firebase Rules และโครงสร้างระบบเดิม; client จะใช้ `authenticatedFetch` ที่มีอยู่แล้วเพื่อส่ง Bearer token.

**Tech Stack:** Express, TypeScript, Firebase Auth ID token verification, Firebase Firestore profile lookup, Node test runner ผ่าน `tsx --test`, Vite/esbuild.

**Spec:** `NEXT_ACTIONS.md`, `KNOWN_ISSUES.md`, `TEST_REPORT.md`

## Global Constraints

- ห้ามแก้หรือลบข้อมูลจริง, Firebase Rules, Firebase Configuration หรือ Deployment configuration.
- ห้ามใช้ค่า secret จริงใน repository, tests หรือเอกสาร.
- ต้องรัน `npm run lint` และ `npm run build` ก่อนถือว่าสำเร็จ.
- ต้องมีผลทดสอบ unauthenticated, wrong-user, pending และ admin/active paths.
- การเปลี่ยนต้องจำกัดเฉพาะ authorization baseline ไม่ refactor architecture ใหญ่.

---

### Task 1: Authorization policy primitives

**Files:**
- Create: `server/authorizationPolicy.ts`
- Test: `server/authorizationPolicy.test.ts`

- [ ] กำหนด pure functions `isAdminProfile`, `isActiveProfile`, `isSameUser` พร้อม test cases สำหรับ ADMIN, STAFF, PENDING, RESIGNED และ UID mismatch.
- [ ] รัน `npx tsx --test server/authorizationPolicy.test.ts` ให้ผ่าน.
- [ ] Commit `test: define server authorization policy`.

### Task 2: Express authorization middleware

**Files:**
- Modify: `server/firebaseAuth.ts`
- Modify: `server/r2Service.ts`
- Test: `server/authorizationPolicy.test.ts`

- [ ] เพิ่ม `requireActiveFirebaseAuth`, `requireAdminFirebaseAuth` และ `requireBodyUserMatchesToken` โดยใช้ UID จาก `res.locals.firebaseUser`.
- [ ] เพิ่ม server-side profile role lookup ที่ไม่ทำงานจนกว่า protected route จะถูกเรียก.
- [ ] ตรวจ error เป็น 401/403 และไม่ส่ง error details หรือ secret กลับ client.
- [ ] รัน policy tests และ `npm run lint`.
- [ ] Commit `fix: enforce verified user authorization on server routes`.

### Task 3: Protect routes and update clients

**Files:**
- Modify: `appServer.ts`
- Modify: `src/components/VideoRecorderUpload.tsx`
- Modify: `src/pages/UserManagement.tsx`
- Modify: `src/pages/payroll/PayrollSummary.tsx`
- Modify: `src/services/imageOptimizer.ts` if needed

- [ ] ป้องกัน email, test email และ manual trigger ด้วย admin middleware.
- [ ] ป้องกัน upload gateway ด้วย active-user middleware.
- [ ] ป้องกัน R2 upload/download ด้วย active-user middleware + body UID match + key validation.
- [ ] เปลี่ยน client calls ที่เกี่ยวข้องเป็น `authenticatedFetch`.
- [ ] รัน API smoke tests โดยไม่ส่ง tokenต้องได้ 401; malformed payload ที่มี tokenจำลองต้องได้ 400/403 ตาม policy.
- [ ] รัน lint/build.
- [ ] Commit `fix: secure server integration endpoints`.

### Task 4: Review and documentation

**Files:**
- Modify: `KNOWN_ISSUES.md`
- Modify: `NEXT_ACTIONS.md`
- Create: `docs/PR_AUTHORIZATION_BASELINE.md`

- [ ] บันทึก routes ที่ป้องกันแล้ว ข้อจำกัดเรื่อง legacy R2 keys และ test evidence.
- [ ] ตรวจ staged diff ไม่พบ secrets.
- [ ] รัน lint/build สุดท้ายและตรวจ git diff.
- [ ] Commit `docs: record authorization baseline verification`.
