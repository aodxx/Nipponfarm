# Nipponfarm Development Action Plan

**วันที่จัดทำ:** 14 กันยายน 2026  
**Baseline:** `main` local commit `5856485`  
**เป้าหมาย:** ทำให้ทีมเดินงานจาก controlled staging ไปสู่ production promotion อย่างมีลำดับ โดยไม่ข้ามหลักฐานความปลอดภัย ข้อมูล และการกู้คืน

## Executive direction

Nipponfarm ไม่ควรเพิ่ม major feature ในช่วงนี้ งานควรเดินแบบ **readiness-first** โดยปิดความเสี่ยงที่อาจกระทบข้อมูลและสิทธิ์ก่อน แล้วจึงเก็บ runtime evidence ใน staging จากนั้นค่อยตัดสินใจเปิด integrations และ promote production

ลำดับที่แนะนำคือ:

> **จัดระเบียบ branch และเอกสาร → เตรียม isolated staging → ทำ Firebase inventory/backup → ตรวจ core workflow runtime → ตรวจ rules และ integrations → ทดสอบ recovery/PWA → production go/no-go → post-release hardening**

คำว่า **Gate** ในแผนนี้หมายถึงจุดตัดสินใจที่ต้องมีหลักฐานก่อนเริ่มระยะถัดไป หาก gate ไม่ผ่าน ให้คงระบบไว้ใน staging และแก้เฉพาะ blocker ที่เกี่ยวข้อง ห้ามข้ามไป production ด้วยเหตุผลว่า build ผ่าน

## เป้าหมายและเกณฑ์สำเร็จ

| เป้าหมาย | เกณฑ์สำเร็จ |
|---|---|
| Repository พร้อมทำงานต่อ | `main` และ remote ตรงกัน, CI ผ่าน, working tree สะอาด |
| Staging ปลอดภัย | ใช้ isolated Firebase/resources, test account, test credentials และ rollback reference |
| Recovery baseline พร้อม | Project identity, Firestore/Storage/Auth inventory, managed export, checksum และ restore validation ครบ |
| Core workflow พร้อม | Sow, Pig Sale, Maintenance และ Payroll มี runtime CRUD/permission/persistence evidence ตาม scope |
| External integrations พร้อมหรือถูกปิดอย่างถูกต้อง | Gemini, Email, R2/ImageKit และ Cron มี test evidence หรือมี disabled behavior/owner ชัดเจน |
| Production promotion ปลอดภัย | Rules, logs, rollback, PWA/device และ known risks ผ่านเกณฑ์ที่ตกลงกัน |

## สถานะตั้งต้น

### สิ่งที่ผ่านแล้ว

- TypeScript check ผ่าน
- Automated regression suite ผ่าน 69 tests
- Production build ผ่าน
- Core workflow repository acceptance สำหรับ Sow, Pig Sale และ Maintenance ผ่าน
- Branch feature ถูก merge เข้า `main` ที่ `615ecfc`
- มี Firebase backup/inventory runbook และ Action Plan แล้ว

### สิ่งที่ยังค้าง

- Local `main` มีเอกสาร commit `5856485` ที่ยังต้อง push ขึ้น `origin/main`
- Controlled staging runtime evidence ยังไม่ครบ
- Firebase production identity, backup, inventory และ reconciliation ยังไม่ปิด
- Production Firestore/Storage rules deployment ยังไม่ยืนยัน
- Gemini, SMTP, R2/ImageKit และ Cron ยังไม่มี success-path evidence ครบ
- Live AI WebSocket ยังไม่รองรับผ่าน Vercel HTTP handler
- PWA/device acceptance ยังไม่ทำ
- `xlsx`/`adm-zip`, broad tenant boundary และ legacy Storage path ยังมี risk ที่ต้องมีแผนรองรับ

## Workstream และ ownership

| Workstream | Owner หลัก | ผู้ร่วมตรวจ | ผลลัพธ์ |
|---|---|---|---|
| Repository/CI | Developer | Reviewer | main, CI, build, test evidence |
| Staging/Hosting | DevOps/เจ้าของ Vercel | Developer | staging URL, deployment record, logs |
| Firebase recovery | System owner + Backup operator | Reviewer | inventory/export/reconciliation package |
| Security rules | Developer | System owner/Reviewer | rules matrix, emulator/controlled evidence |
| Core workflows | Developer | Tester/Domain owner | browser/runtime acceptance records |
| Integrations | Integration owner | Tester | success/failure evidence หรือ disabled decision |
| PWA/device | Tester | Developer | device acceptance report |
| Release decision | System owner | Reviewer/ทีม | go/no-go record และ rollback plan |

หากยังไม่มีชื่อบุคคล ให้ใช้ role เหล่านี้เป็น owner ชั่วคราว ห้ามถือว่างานมี owner เพียงเพราะมีคนเริ่มแก้ไฟล์

# Phase Plan

## Phase 0 — Baseline, branch และ execution control

**ลำดับ:** ทำทันที  
**Dependency:** ไม่มี  
**Owner:** Repository maintainer

### งาน

1. Push local `main` commit `5856485` ขึ้น `origin/main` หลังตรวจว่าเอกสารไม่มีข้อมูลลับ
2. ตรวจ GitHub Actions/CI ของ commit ที่ remote
3. ยืนยัน Vercel staging/preview จะ deploy จาก commit ใด
4. บันทึก production known-good deployment และ rollback target
5. กำหนดชื่อ test accounts, test record prefix และ evidence location
6. เปิด workboard โดยแยกงานเป็น branch สั้น ๆ หนึ่ง logical change ต่อ branch

### Deliverables

- Remote `main` ตรงกับ local
- CI result URL/record
- staging deployment target
- rollback reference
- test data naming convention

### Gate 0

ผ่านเมื่อ remote และ local ตรงกัน, CI ผ่าน, branch clean และทีมรู้ว่า staging จะใช้ commit ใด

**ห้ามทำ:** deploy rules, สร้าง test record ใน production, หรือเปิด external secrets ก่อนยืนยัน staging target

## Phase 1 — Controlled staging foundation

**ลำดับ:** หลัง Gate 0  
**Dependency:** Phase 0  
**Owner:** DevOps/เจ้าของ hosting

### งาน

1. สร้างหรือยืนยัน staging/Preview deployment
2. ใช้ Firebase project/database หรือ namespace ที่แยกจาก production
3. สร้าง test accounts อย่างน้อย STAFF, ADMIN และ wrong-owner/PENDING ตามที่จำเป็น
4. ตั้งเฉพาะ staging environment variables
5. ปิด integrations ที่ยังไม่มี staging credentials
6. ตรวจ homepage, `/api/health` และ protected endpoints
7. ตรวจ Vercel build/runtime logs
8. บันทึก deployment URL, commit SHA, timestamp และ rollback path

### Deliverables

- Staging URL
- Environment variable inventory เฉพาะชื่อและ environment
- Test account matrix
- Smoke test record
- Runtime log review

### Gate 1

ผ่านเมื่อ frontend boot, login, `/api/health`, 401 boundary และ logs ผ่าน โดยไม่มีข้อมูล production ถูกเขียน

## Phase 2 — Firebase identity, inventory และ recovery baseline

**ลำดับ:** ต้องทำก่อน rules deployment หรือ data migration  
**Dependency:** Phase 0; staging ไม่จำเป็นต้องรอจบทั้งหมดเพื่อเริ่ม แต่ production ห้ามข้าม  
**Owner:** System owner + Backup operator

### งาน

1. ยืนยัน production project ID, database ID, region และ Storage bucket
2. สร้าง private evidence workspace นอก repository
3. รัน Firestore inventory-only
4. ตรวจ top-level collections ที่มีจริงเทียบกับ baseline
5. เก็บ Firestore rules/indexes/config snapshot
6. ทำ managed Firestore export ไป private backup bucket
7. ทำ Storage object inventory และกำหนด recovery scope
8. ทำ Auth user/profile inventory โดยไม่เก็บ secrets
9. ทำ logical export เฉพาะเมื่อได้รับอนุมัติ
10. สร้าง checksum manifest
11. ทำ count/schema/owner reconciliation
12. ลงทะเบียน anomalies เป็น `NEEDS_REVIEW`
13. ทำ restore validation ใน non-production project

### Deliverables

- Production identity record
- Firestore inventory
- Managed export operation record
- Storage inventory/recovery manifest
- Auth/profile reconciliation
- Rules/index snapshot
- SHA256 checksum manifest
- Reconciliation matrix
- Anomaly register
- Restore drill report
- Owner/reviewer approval

### Gate 2 — Recovery acceptance

ผ่านเมื่อ project identity ถูกยืนยัน, backup/export complete, counts/reconciliation ไม่มี unresolved blocker, checksum ผ่าน และ restore validation ทำได้ใน non-production

**ห้ามทำ:** ลบข้อมูล, migrate collections, deploy tightening rules หรือแยก project ก่อน Gate 2

## Phase 3 — Core workflow runtime acceptance

**ลำดับ:** หลังมี staging และ test data  
**Dependency:** Gate 1; ใช้ Gate 2 เป็นเงื่อนไขก่อนกระทบ production data  
**Owner:** Developer + Tester + Domain owner

### 3.1 Sow Lifecycle

ทดสอบเพิ่มแม่พันธุ์, บันทึก BREED, ยืนยัน ultrasound, FARROW, WEAN/RECOVERY และตรวจ task/calendar linking โดยใช้ test sow ที่มี identifier ชัดเจน

ต้องตรวจ:

- Create/read/update
- Event และ task references
- Status/parity transitions
- Reload/relogin persistence
- Wrong-owner และ role behavior
- Failure path และ retry
- Cleanup เฉพาะ test record

### 3.2 Pig Sale

ทดสอบสร้าง sale, weighing records, total net weight, gross/net total, retry และ void behavior โดยใช้ sale ID deterministic

ต้องตรวจ:

- Calculation fields
- Duplicate retry ไม่สร้าง sale ซ้ำ
- Read/history excludes VOID ตาม policy
- Owner/role behavior
- Reload/relogin persistence
- Cleanup และ audit/result

### 3.3 Maintenance

ทดสอบแจ้งงาน, `PENDING → IN_PROGRESS → RESOLVED`, resolved timestamp, owner/admin boundary และ invalid transition

ต้องตรวจ:

- Create/read/update
- Wrong-owner denial
- Staff/admin behavior
- Invalid skip/reopen transition
- Storage attachment scope ถ้าเปิดใช้
- Reload/relogin persistence
- Cleanup เฉพาะ test request

### 3.4 Payroll/Advance

ใช้เฉพาะ test employee และ test amounts ตรวจ request, duplicate prevention, reject/resubmit, approve, audit immutability และ permission boundary

ห้ามใช้ข้อมูลเงินจริงหรือ test record ใน shared production collection

### Deliverables

- Acceptance record ต่อ workflow
- Test account และ record ID
- Screenshots/logs ที่ redact แล้วถ้าจำเป็น
- CRUD/permission/persistence result
- Cleanup proof
- Known issue list

### Gate 3 — Core workflow acceptance

ผ่านเมื่อ workflow ที่จะเปิดใน production มี runtime evidence ครบตาม scope และไม่มี unresolved data-loss, duplicate, owner-boundary หรือ financial correctness issue

## Phase 4 — Firestore/Storage rules และ tenancy hardening

**ลำดับ:** หลัง inventory/recovery evidence และก่อน production rules deployment  
**Dependency:** Gate 2 และผลจาก Phase 3  
**Owner:** Security-minded developer + Reviewer

### งาน

1. เปรียบเทียบ deployed rules กับ repository rules
2. สร้าง scenario matrix สำหรับ unauthenticated, PENDING, STAFF, ADMIN, owner และ wrong-owner
3. ปิด broad active-user boundary ที่ไม่จำเป็น
4. ยืนยัน owner fields และ immutable fields
5. วาง `farmId` tenant model ก่อนรองรับหลายฟาร์ม
6. ย้าย Maintenance client จาก legacy flat path ไป owner-scoped path
7. ปรับ `news` Storage boundary ให้ least privilege
8. ทำ Emulator tests และ controlled staging tests
9. เตรียม deploy/rollback runbook

### Deliverables

- Permission matrix
- Rules diff review
- Emulator evidence
- Staging denial/allow evidence
- Tenant design note
- Rules deployment and rollback plan

### Gate 4 — Security rules acceptance

ผ่านเมื่อ rules behavior ตรงกับ matrix, ไม่มี cross-owner access ที่ไม่ตั้งใจ, deployment scope รู้ชัด และ rollback ทำได้

## Phase 5 — External integrations

**ลำดับ:** หลัง staging core flow stable  
**Dependency:** Gate 1, test credentials และ isolation; production ต้อง Gate 2 และ Gate 4  
**Owner:** Integration owner

ทำทีละ integration ไม่เปิดทั้งหมดพร้อมกัน

### Gemini

- ตั้ง server-only key ใหม่
- ตรวจ health readiness
- ทดสอบ Receipt, Swine AI และ TTS
- ตรวจ timeout, validation, auth และ error path
- ตรวจไม่ให้ key อยู่ใน client/logs

### SMTP

- ใช้ test mailbox หรือ sink
- ตรวจ encoding และ sender
- ตรวจ retry/idempotency
- ตรวจ failure behavior

### R2/ImageKit

- ใช้ least-privilege credentials
- ทดสอบ presigned upload/download/expiry
- ตรวจ type/size/access policy
- ลบ test object ตาม cleanup proof

### Cron

- ตั้ง `CRON_SECRET`
- ทดสอบ successful invocation แบบควบคุม side effects
- ตรวจ idempotency และ logs

### Live AI

เลือก SSE/HTTP streaming หรือ runtime WebSocket แยกต่างหาก ห้ามประกาศ current Vercel handler ว่ารองรับ Live WebSocket

### Deliverables

- Integration test record ต่อบริการ
- Credential inventory เฉพาะชื่อ/environment
- Success/failure evidence
- Disable/enable decision
- Operational owner และ alert path

### Gate 5 — Integration decision

แต่ละ integration ต้องเป็น `TESTED AND ENABLED` หรือ `DISABLED AND DOCUMENTED` พร้อม user-facing behavior และ owner ชัดเจน

## Phase 6 — PWA, recovery และ operational readiness

**ลำดับ:** ก่อน production promotion หาก PWA/offline เป็น production promise  
**Dependency:** Staging stable และ Gate 3  
**Owner:** Tester + Developer + Operations

### งาน

1. ติดตั้ง PWA บน Android ที่ทีมเลือก
2. ทดสอบเปิดซ้ำหลังปิดแอป
3. ทดสอบ offline shell
4. ทดสอบ service worker update และ stale version recovery
5. ทดสอบ logout/login ใหม่
6. ตรวจ pending sync ถ้ามี
7. ตรวจ error reporting และ alert ownership
8. บันทึก rollback, incident contact และ release window

### Deliverables

- Device acceptance report
- PWA version/update evidence
- Recovery checklist
- Monitoring/alert owner
- Incident and rollback contact list

### Gate 6

ผ่านเมื่ออุปกรณ์เป้าหมายติดตั้ง เปิดซ้ำ offline/update/recovery ได้ตาม production promise และทีมมี operational response path

## Phase 7 — Dependency, performance และ technical debt gate

**ลำดับ:** ทำคู่ขนานได้ แต่ต้องปิด risk acceptance ก่อน production  
**Dependency:** สามารถเริ่มจาก Phase 0  
**Owner:** Developer + Security reviewer

### งาน

- ทำ mitigation plan สำหรับ `xlsx`
- Review `adm-zip` compatibility/usage boundary
- ตรวจ input validation และ file processing safety
- ทำ bundle/vendor review
- ประเมิน Lottie warning และ static/dynamic import duplication
- วัด Core Web Vitals ใน staging หากเป็น acceptance target
- สรุป debt ที่ยอมรับได้และ owner/date สำหรับ follow-up

### Gate 7

ผ่านเมื่อ high-risk dependency มี mitigation/replacement decision และ performance risk ถูกยอมรับเป็นลายลักษณ์อักษรหรือแก้แล้ว

## Phase 8 — Production go/no-go และ controlled promotion

**ลำดับ:** หลัง Gate 2–7 ตาม production scope  
**Owner:** System owner เป็นผู้อนุมัติ

### Pre-promotion checklist

- [ ] Main commit และ deployment candidate ถูกระบุ
- [ ] CI, lint, tests, build ผ่านจาก candidate เดียวกัน
- [ ] Firebase identity/backup/reconciliation ผ่าน
- [ ] Rules diff และ rollback ผ่าน
- [ ] Core workflows runtime acceptance ผ่าน
- [ ] Integrations เปิด/ปิดพร้อมหลักฐานครบ
- [ ] Logs ไม่มี unexplained 5xx หรือข้อมูลอ่อนไหว
- [ ] PWA/device gate ผ่านหากอยู่ใน promise
- [ ] Previous known-good deployment ถูกบันทึก
- [ ] Owner, reviewer และ rollback operator พร้อมใน release window
- [ ] Production smoke plan และ stop conditions พร้อม

### Promotion

1. Deploy/promote เฉพาะ candidate ที่ผ่าน gates
2. ตรวจ homepage, `/api/health`, protected endpoints
3. ตรวจ login และ read-only dashboard
4. ทดสอบ authorized action ที่ปลอดภัย
5. ตรวจ logs ในช่วง smoke window
6. หยุด rollout ทันทีเมื่อพบ data, auth, 5xx หรือ secret leakage issue

### Gate 8 — Production decision

ผลลัพธ์ต้องเป็นหนึ่งในสามค่า:

- `GO`: เปิดตาม scope ที่อนุมัติ
- `GO WITH EXPLICIT LIMITATIONS`: เปิดเฉพาะฟีเจอร์ที่ผ่าน และปิดส่วนที่ยังไม่พร้อม
- `NO-GO`: คง staging และสร้าง remediation task

ห้ามใช้คำว่า Production Ready หากมี blocker ที่ผู้ใช้จะรับรู้ได้และไม่มี mitigation/owner ที่อนุมัติ

## Phase 9 — Post-release stabilization

**ลำดับ:** หลัง production promotion  
**Owner:** Operations + Developer

### ช่วงเฝ้าระวังแรก

- ตรวจ homepage/health ตามรอบที่กำหนด
- ตรวจ auth error และ unexpected 5xx
- ตรวจ workflow error rate
- ตรวจ duplicate/void/audit anomalies
- ตรวจ email/AI/R2/Cron side effects
- เก็บ user feedback และ incident notes

### Deliverables

- Post-release smoke record
- Incident/alert report ถ้ามี
- Updated `CURRENT_STATUS.md`
- Updated `VERIFICATION_CHECKLIST.md`
- Changelog และ follow-up backlog

### Exit criteria

ระบบมี stable operating window ตามที่ owner กำหนด, ไม่มี unresolved critical incident และ rollback window ถูกปิดโดยผู้มีอำนาจอนุมัติ

# Execution Board

| ID | Work item | Dependency | Owner | Status | Exit evidence |
|---|---|---|---|---|---|
| P0-01 | Push `main` commit `5856485` | None | Maintainer | NEXT | origin/main matches |
| P0-02 | Confirm staging deployment target | P0-01 | DevOps | NEXT | URL/commit record |
| P1-01 | Isolated staging Firebase/test accounts | P0-02 | System owner | NEXT | account/resource matrix |
| P1-02 | Staging smoke and runtime logs | P1-01 | DevOps | BLOCKED | smoke/log report |
| P2-01 | Production identity confirmation | None | System owner | BLOCKED | identity approval |
| P2-02 | Firestore inventory-only | P2-01 | Backup operator | BLOCKED | inventory report |
| P2-03 | Managed Firestore export | P2-01 | Backup operator | BLOCKED | operation completion |
| P2-04 | Storage/Auth inventory | P2-01 | Backup operator | BLOCKED | inventory/reconciliation |
| P2-05 | Restore drill and checksum | P2-03/P2-04 | Reviewer | BLOCKED | restore report |
| P3-01 | Sow runtime acceptance | P1-02 | Tester | READY | acceptance record |
| P3-02 | Pig Sale runtime acceptance | P1-02 | Tester | READY | acceptance record |
| P3-03 | Maintenance runtime acceptance | P1-02 | Tester | READY | acceptance record |
| P3-04 | Payroll test-account acceptance | P1-02/P2-01 | Tester | READY | permission/audit record |
| P4-01 | Rules deployed-vs-repo review | P2-01 | Security reviewer | BLOCKED | rules diff |
| P4-02 | Tenant/farm boundary design | P3/P4 findings | Developer | DESIGN | approved design |
| P5-01 | Gemini decision and test | P1-02 | Integration owner | BLOCKED | test/disable record |
| P5-02 | SMTP decision and test | P1-02 | Integration owner | BLOCKED | test/disable record |
| P5-03 | R2/ImageKit decision and test | P1-02 | Integration owner | BLOCKED | test/disable record |
| P5-04 | Cron decision and test | P1-02 | Integration owner | BLOCKED | invocation record |
| P5-05 | Live AI transport decision | Architecture review | Developer | BLOCKED | transport ADR |
| P6-01 | PWA/device acceptance | P1-02 | Tester | NOT RUN | device report |
| P7-01 | Dependency risk mitigation | None | Developer | READY | risk acceptance |
| P8-01 | Production go/no-go review | Gates 2–7 | System owner | HOLD | signed decision |

## Working rules for the team

1. ทุก code change ใช้ short-lived feature branch และ commit แบบ atomic
2. ทุก change ต้องผ่าน lint, test และ build ก่อน merge
3. ทุกงานที่อ่าน/เขียน production data ต้องมี scope, operator, timestamp และ evidence
4. ห้ามแก้ production data เพื่อทำให้ test หรือ reconciliation ผ่าน
5. หากพบข้อมูลกำกวม ให้ตั้ง `NEEDS_REVIEW` ไม่เดา business truth
6. หาก gate ไม่ผ่าน ให้หยุดเฉพาะ workstream ที่เกี่ยวข้องและทำงาน repository-side ที่ไม่กระทบข้อมูลต่อได้
7. ห้ามเปิด feature ที่ integration ยังไม่พร้อมโดยอาศัย simulation เป็นหลักฐาน
8. เอกสารสถานะต้องอัปเดตเมื่อ gate เปลี่ยน ไม่ใช่เฉพาะตอน release

## Immediate next actions

ลำดับที่ควรทำต่อทันทีคือ:

1. Push `main` commit `5856485` ขึ้น remote
2. สร้าง staging deployment ที่ใช้ isolated Firebase/test data
3. รัน staging smoke และบันทึก runtime logs
4. ให้ system owner ยืนยัน production Firebase identity
5. เริ่ม Phase 2 inventory-only ก่อน managed export
6. เตรียม test account acceptance สำหรับ Sow, Pig Sale และ Maintenance แบบ parallel หลัง staging smoke ผ่าน

## References

[1]: ../CURRENT_STATUS.md "Nipponfarm Current Status"
[2]: ./STAGING_READINESS_SUMMARY_2026-09-14.md "Nipponfarm Staging Readiness Summary"
[3]: ./FIREBASE_BACKUP_INVENTORY_ACTION_PLAN_2026-09-14.md "Firebase Backup and Inventory Action Plan"
[4]: ./PRODUCTION_BACKUP_INVENTORY_RUNBOOK.md "Production Backup and Inventory Runbook"
[5]: ./VERIFICATION_CHECKLIST.md "Production Verification Checklist"
