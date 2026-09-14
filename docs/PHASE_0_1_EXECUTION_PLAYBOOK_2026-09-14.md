# Nipponfarm Phase 0–1 Execution Playbook

**วันที่จัดทำ:** 14 กันยายน 2026  
**Baseline local:** `main` ที่ `c678ff2`  
**Remote baseline:** `origin/main` ที่ `615ecfc`  
**สถานะ:** local `main` นำหน้า remote 2 commits และต้อง sync ก่อนเริ่ม staging  
**ขอบเขต:** เตรียม repository และ controlled staging เท่านั้น ไม่ทำ Firebase migration, ไม่ deploy production rules และไม่สร้างข้อมูลทดสอบใน production

## เป้าหมายของ Playbook

เอกสารนี้แปลง Phase 0 และ Phase 1 จากแผนระดับโครงการให้เป็นงานที่ทีมสามารถมอบหมายและตรวจรับได้ทีละรายการ เป้าหมายไม่ใช่เพียงให้ staging เปิดได้ แต่ต้องทำให้รู้ว่า staging ใช้ commit ใด, ใช้ resource ใด, ใครเข้าถึงได้, rollback ไปที่ใด และหลักฐาน runtime อยู่ที่ไหน

> **หลักการ:** หากยังไม่ยืนยัน resource isolation หรือไม่สามารถบอก rollback target ได้ ให้หยุดก่อนสร้าง test record หรือเปิด secret ใด ๆ

# Part A — Phase 0: Baseline, Branch และ Execution Control

## A1. ผลลัพธ์ที่ Phase 0 ต้องสร้าง

| Deliverable | เจ้าของ | หลักฐานขั้นต่ำ | สถานะตั้งต้น |
|---|---|---|---|
| Remote `main` ตรงกับ local candidate | Repository maintainer | `git rev-parse`, push result | ต้องทำ |
| CI ของ candidate ผ่าน | Repository maintainer | GitHub Actions run URL/status | ต้องทำ |
| Staging candidate ถูกระบุ | DevOps | commit SHA, branch, deployment target | ต้องทำ |
| Production rollback reference | DevOps/owner | deployment ID/URL/SHA | ต้องขอจาก Vercel |
| Test account matrix | System owner | account role/status, no secrets | ต้องจัดทำ |
| Test data naming convention | Developer/tester | prefix, cleanup rule | ต้องจัดทำ |
| Evidence workspace | Reviewer | private path/access list | ต้องจัดทำ |
| Workboard และ owner | Project lead | task IDs/status/owner | ต้องจัดทำ |

## A2. A0 — ตรวจความสะอาดและระบุตัวตนของ repository

### ผู้รับผิดชอบ

Repository maintainer

### คำสั่ง

```bash
cd /home/ubuntu/work/Nipponfarm

git status --short --branch
git branch -vv
git log --oneline --decorate -5
git rev-parse HEAD
git rev-parse origin/main
```

### สิ่งที่ต้องยืนยัน

- อยู่ใน repository ที่ถูกต้อง
- branch คือ `main`
- working tree ไม่มี modified/untracked file ที่ไม่ตั้งใจ
- commit `c678ff2` เป็น candidate ที่จะส่งขึ้น remote
- commits ที่จะ push คือ:
  - `5856485` — Firebase backup/inventory Action Plan
  - `c678ff2` — phased Development Action Plan
- ไม่มี export, `.env`, token, service-account JSON หรือ production data ใน staged/untracked files

### Secret scan แบบไม่เปิดเผยค่าลับ

```bash
git status --short --untracked-files=all
git diff origin/main..HEAD --stat
git diff origin/main..HEAD --check

git diff origin/main..HEAD | grep -Ein \
  'AIza|BEGIN PRIVATE KEY|password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token' \
  || true
```

ผล grep ต้องถูกตรวจโดย reviewer เพราะคำว่า `secret` ในเอกสารอาจเป็นเพียงคำอธิบาย policy ไม่ใช่ค่าลับจริง

### หลักฐาน

บันทึก output ที่ redact แล้วใน `phase-0/repository-baseline.md` หรือ issue/workboard ภายใน ห้ามใส่ credential หรือ full environment dump

### Stop conditions

- working tree ไม่สะอาด
- HEAD ไม่ใช่ commit ที่อนุมัติ
- พบไฟล์ production export หรือ credential
- ไม่รู้ว่า `origin/main` ชี้ repository ใด

## A3. A1 — Push candidate ขึ้น `origin/main`

### ผู้รับผิดชอบ

Repository maintainer

### Pre-push check

```bash
cd /home/ubuntu/work/Nipponfarm

git fetch origin --prune
git status --short --branch
git log --oneline --decorate origin/main..HEAD
```

ตรวจว่า output แสดงเฉพาะ commits ที่ต้องการ push และไม่มี remote commit ใหม่ที่ยังไม่ได้ merge

### Push

```bash
git push origin main
```

### Post-push verification

```bash
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/main
git status --short --branch
```

เกณฑ์ผ่านคือ `HEAD` และ `origin/main` เป็น SHA เดียวกัน และ status ไม่มี ahead/behind

### หลักฐาน

- push output
- commit SHA
- UTC timestamp
- GitHub commit URL

### Rollback

หากยังไม่ deploy staging และพบปัญหาในเอกสาร ให้ใช้ revert commit บน `main` ไม่ใช้ force-push:

```bash
git revert <COMMIT_SHA>
git push origin main
```

หากเป็นปัญหาที่ต้องหยุด deploy ให้หยุดที่ CI/staging gate ไม่ต้อง revert ทันทีจนกว่าจะระบุผลกระทบ

## A4. A2 — ตรวจ GitHub Actions และ repository gate

### ผู้รับผิดชอบ

Repository maintainer/reviewer

### คำสั่งตัวอย่าง

```bash
gh run list --branch main --limit 10
gh run list --commit "$(git rev-parse HEAD)" --limit 10
gh pr checks --help
```

หากมี workflow ที่ผูกกับ commit ให้เปิดรายละเอียด:

```bash
gh run view <RUN_ID> --log-failed
gh run view <RUN_ID>
```

### Checks ที่ต้องผ่าน

- install/dependency step
- TypeScript/lint
- test suite
- production build
- standalone startup smoke ถ้ามี
- Firebase rules tests ถ้า workflow รันใน commit นี้

### เกณฑ์รับงาน

- ไม่มี required check เป็น pending/failed
- failure ที่เป็น flaky ต้องมี rerun และเหตุผลบันทึกไว้
- ไม่ถือว่า local test แทน GitHub Actions ได้จนกว่า result ของ commit เดียวกันจะผ่าน

### Stop conditions

- required check fail
- workflow ใช้ environment/secret ผิด staging/production
- CI log เปิดเผย secret
- build artifact ไม่ใช่จาก commit candidate

## A5. A3 — กำหนด staging candidate และ deployment ownership

### ผู้รับผิดชอบ

DevOps/เจ้าของ Vercel

### ต้องตัดสินใจ

| คำถาม | ค่าที่ต้องบันทึก |
|---|---|
| Staging ใช้ branch ใด | `main` หรือ Preview branch ที่อนุมัติ |
| Commit ที่ deploy | full SHA |
| Vercel project | project slug และ team/owner |
| Deployment URL | Preview/staging URL |
| Firebase project | staging project ID หรือ approved namespace |
| Firestore database | database ID |
| Storage bucket | bucket name |
| Rollback target | last known-good deployment ID/URL/SHA |
| Test window | start/end UTC |
| Operator | ชื่อ/role |

### กติกา

- Staging ต้องชี้ไป isolated Firebase project/database หรือ namespace ที่มี cleanup proof
- ห้ามใช้ production Firebase credentials เพียงเพราะ staging ใช้งานง่ายกว่า
- หาก Vercel project lookup ไม่ได้ ให้ถือเป็น blocker ของ staging ownership จนกว่าจะยืนยันผ่าน Dashboard/owner

### หลักฐาน

`phase-0/staging-candidate.md` ที่ระบุ commit, deployment target และ rollback target

## A6. A4 — บันทึก production known-good deployment และ rollback reference

### ผู้รับผิดชอบ

DevOps/ระบบ owner

### ต้องบันทึก

- Production URL
- Current Ready deployment ID
- Current production commit SHA
- เวลา deploy
- วิธี Promote previous deployment
- ผู้ที่มีสิทธิ์ rollback
- Smoke checks หลัง rollback
- เงื่อนไข rollback:
  - homepage/health fail
  - authenticated read fail
  - unexpected 5xx
  - sensitive data leakage
  - cross-owner access

### ห้ามทำ

- ห้ามลบ previous deployment
- ห้าม rollback ด้วยการเปลี่ยน Firebase data/rules
- ห้ามใช้ force-push เพื่อแก้ release history

## A7. A5 — สร้าง test account และ test data policy

### ผู้รับผิดชอบ

System owner + Tester

### Test account matrix

| Account | Role/status | ใช้ทดสอบ | ห้ามทำ |
|---|---|---|---|
| `staging-admin` | ADMIN/active | admin action, audit, approved workflow | ใช้ credential จริงใน chat |
| `staging-staff-owner` | STAFF/active | own records, own maintenance, own sales | อ่านข้อมูลของ owner อื่น |
| `staging-staff-other` | STAFF/active | wrong-owner denial | แก้ข้อมูล owner แรก |
| `staging-pending` | PENDING | access denial/limited access | ใช้กับ production |

ชื่อจริงและ email จริงไม่ต้องบันทึกใน repository; เก็บใน private access record

### Test record convention

ใช้ prefix ที่แยกจาก production เช่น:

```text
SOW-STG-20260914-<RUN_ID>
SALE-STG-20260914-<RUN_ID>
MAINT-STG-20260914-<RUN_ID>
PAYROLL-STG-20260914-<RUN_ID>
```

ทุก record ต้องมี:

- environment = staging
- creator account
- creation timestamp
- test run ID
- expected cleanup owner
- cleanup result

### Stop conditions

- ไม่มีวิธีลบ/void test record อย่างปลอดภัย
- staging resource ยังชี้ production
- account role ไม่สามารถยืนยันได้
- test prefix อาจชนกับข้อมูลจริง

## A8. A6 — ตั้ง private evidence workspace และ workboard

### ผู้รับผิดชอบ

Reviewer/project lead

### Evidence structure

```text
phase-0/
  repository-baseline.md
  ci-record.md
  staging-candidate.md
  rollback-reference.md
  test-account-matrix.md
  workboard.md
phase-1/
  deployment-record.md
  env-name-inventory.md
  smoke-test.md
  auth-boundary.md
  runtime-log-review.md
  cleanup-proof.md
```

เก็บนอก repository และตั้ง permission แบบ least privilege

### Workboard fields

| Field | ตัวอย่าง |
|---|---|
| Task ID | P0-01 |
| Owner | Repository maintainer |
| Status | NEXT/IN PROGRESS/BLOCKED/DONE |
| Dependency | P0-00 |
| Evidence | path/URL |
| Stop condition | text |
| Reviewer | role/name |
| Updated at | UTC timestamp |

## A9. Phase 0 Definition of Done

Phase 0 ผ่านเมื่อ:

- [ ] local `main` และ `origin/main` ตรงกัน
- [ ] candidate SHA ถูกบันทึก
- [ ] required GitHub checks ผ่าน
- [ ] staging project/deployment owner ถูกระบุ
- [ ] previous production deployment และ rollback path ถูกบันทึก
- [ ] test account roles ถูกยืนยัน
- [ ] test record prefix และ cleanup owner ถูกกำหนด
- [ ] evidence workspace private และอยู่นอก repository
- [ ] workboard มี owner/dependency/status
- [ ] ไม่มี production write หรือ secret exposure ระหว่าง Phase 0

หากข้อใดไม่ผ่าน ให้สถานะ Phase 0 เป็น `BLOCKED` ไม่ใช่ `PARTIAL PASS`

# Part B — Phase 1: Controlled Staging Foundation

## B1. เป้าหมายของ Phase 1

สร้าง staging deployment ที่ตรวจสอบได้และปลอดภัยพอสำหรับ runtime acceptance โดยยังไม่เปิด integrations ที่ไม่มี credentials/evidence และยังไม่ใช้ข้อมูล production เป็น test data

## B2. B0 — Preflight isolation ก่อนสร้าง deployment

### ผู้รับผิดชอบ

DevOps + System owner

### ตรวจ isolation matrix

| Resource | Staging value | Production value | ต้องต่างกันหรือไม่ |
|---|---|---|---|
| Vercel environment | Preview/Staging | Production | ต้องแยก environment |
| Firebase project | `<STAGING_PROJECT_ID>` | `<PRODUCTION_PROJECT_ID>` | แนะนำให้ต่าง project |
| Firestore database | staging DB | production DB | ต้องยืนยัน |
| Storage bucket | staging bucket | production bucket | ต้องแยก |
| Auth users | test accounts | real users | ต้องแยก |
| Email destination | sink/test mailbox | real recipients | ต้องแยก |
| AI credential | staging/restricted หรือ disabled | production/restricted | ห้าม copy โดยไม่อนุมัติ |
| R2/ImageKit | staging bucket/disabled | production bucket | ต้องแยก |
| Cron | disabled/manual | scheduled | ควรปิดใน staging |

### Stop conditions

- staging Firebase project ID ไม่สามารถยืนยันได้
- VITE config ชี้ production โดยไม่มี explicit approval
- Storage bucket เป็น production bucket
- staging email ส่งถึงผู้ใช้จริง
- Cron มี side effects จริงโดยไม่มี idempotency/cleanup plan

## B3. B1 — Environment variable inventory และ configuration

### ผู้รับผิดชอบ

DevOps

### หลักการ

- Public Firebase identifiers ใช้ `VITE_` ได้ตาม design
- Server-only secrets ห้ามขึ้นต้นด้วย `VITE_`
- เก็บเฉพาะชื่อ variable, environment, owner และสถานะ ห้ามบันทึกค่า
- Preview secrets เปิดเฉพาะเมื่อ resource แยกและ test plan พร้อม

### Inventory template

| Variable/group | Preview/Staging | Production | Owner | Status |
|---|---|---|---|---|
| `VITE_FIREBASE_*` | configured/verified | configured/verified | DevOps |  |
| `VITE_FIRESTORE_DATABASE_ID` | configured if named DB | configured if named DB | DevOps |  |
| `APP_URL` | staging URL | production URL | DevOps |  |
| `NODE_ENV` | staging policy | production | DevOps |  |
| `CRON_SECRET` | disabled or staging-only | pending | Ops |  |
| `AI_*` / `GEMINI_API_KEY` | disabled or isolated | pending | Integration owner |  |
| `SMTP_*` | sink/test only | pending | Integration owner |  |
| `IMAGEKIT_*` | disabled/isolated | pending | Integration owner |  |
| `CLOUDFLARE_R2_*` | disabled/isolated | pending | Integration owner |  |

### Verification

1. ตรวจ Vercel Project Settings ด้วยสิทธิ์ที่ได้รับอนุมัติ
2. ตรวจ environment scope ของแต่ละ variable
3. ตรวจว่า server-only value ไม่อยู่ใน client bundle
4. เปิดเฉพาะ feature ที่มี test destination
5. Redeploy หลังเปลี่ยน configuration และบันทึก deployment SHA

### Stop conditions

- พบ secret ใน source, client bundle, screenshot หรือ logs
- staging secret ใช้ production data/resource
- ไม่มี owner ของ secret rotation
- integration เปิดอยู่แต่ไม่มี test destination/cleanup plan

## B4. B2 — สร้างหรือยืนยัน Preview deployment

### ผู้รับผิดชอบ

DevOps

### คำสั่งตรวจจากภายนอกหลังได้ URL

```bash
export PREVIEW_URL="https://<preview-deployment-url>"

curl -fsS "$PREVIEW_URL/" -o /tmp/nipponfarm-preview.html
curl -fsS "$PREVIEW_URL/api/health"
curl -i -sS -X POST "$PREVIEW_URL/api/send-welcome-email" \
  -H 'Content-Type: application/json' --data '{}'
curl -i -sS -X POST "$PREVIEW_URL/api/r2/presign-upload" \
  -H 'Content-Type: application/json' --data '{}'
```

### Expected result

| Check | Expected |
|---|---|
| Homepage | HTTP 200 และเป็น application HTML |
| `/api/health` | HTTP 200 และ `status: ok` |
| Email route no token | HTTP 401, `Authentication required` |
| R2 route no token | HTTP 401, `Authentication required` |
| Build | Ready/success |
| Commit | ตรงกับ Phase 0 candidate |

ห้ามตีความ `aiReady:false` ว่าเป็น failure ของ frontend หาก AI ถูกปิดโดยตั้งใจ แต่ต้องบันทึกเป็น disabled/not configured อย่างชัดเจน

## B5. B3 — Auth และ read-only smoke

### ผู้รับผิดชอบ

Tester + System owner

### ขั้นตอน

1. เปิด staging URL ใน private/incognito session
2. ทดสอบ login ด้วย `staging-staff-owner`
3. ยืนยันว่า user profile และ role ถูกอ่านจาก staging resource
4. เปิด dashboard/read-only views
5. logout แล้ว login ใหม่
6. ทดสอบ `staging-pending` ว่าเข้าถึงถูกจำกัด
7. ใช้ `staging-staff-other` ตรวจว่าไม่เห็น/แก้ข้อมูลของ owner แรก
8. บันทึก result โดยไม่เก็บ token หรือ screenshot ที่มี PII เกินจำเป็น

### Expected result

- Active test account login สำเร็จ
- Pending/mismatched user ได้ behavior ตาม policy
- ข้อมูลที่เห็นเป็น staging/test data หรือ empty baseline ที่อธิบายได้
- reload/relogin ไม่เปลี่ยนไป production

## B6. B4 — Runtime log review

### ผู้รับผิดชอบ

DevOps + Reviewer

### ช่วงที่ต้องตรวจ

- deployment build
- homepage/health smoke
- login/logout
- protected API 401/403
- test account read-only flow

### ตรวจหา

- unexpected 5xx
- Firebase permission errors ที่อธิบายไม่ได้
- wrong project/bucket reference
- secret/token/password
- email address, account number, raw image payload หรือ AI prompt
- stack trace ที่เปิด internal configuration

### ผลลัพธ์ที่อนุญาต

| ผล | การดำเนินการ |
|---|---|
| No unexplained errors | ผ่านต่อ |
| Known warning ไม่กระทบ function | บันทึกเป็น accepted warning |
| 401/403 ตาม policy | ผ่าน |
| Unexpected 5xx/data leak/cross-environment access | STOP และ rollback/fix |

## B7. B5 — Test data safety และ cleanup proof

### ผู้รับผิดชอบ

Tester + Data owner

ก่อนสร้าง record ใด ๆ ต้องกรอก:

```text
Environment: staging
Test run ID:
Account:
Resource/project:
Record prefix:
Expected cleanup method:
Cleanup owner:
```

หลัง test:

1. ลบหรือ void เฉพาะ record ที่ prefix ตรงกัน
2. ตรวจ query/list ว่า record หายหรืออยู่ใน terminal state ตาม policy
3. ตรวจ Storage objects ที่อัปโหลด
4. ตรวจไม่มี email จริงถูกส่ง
5. เก็บ cleanup result และ timestamp

ห้ามลบข้อมูลด้วย broad query หรือ bulk delete ที่ไม่จำกัด prefix

## B8. B6 — Phase 1 acceptance run

ดำเนินการตามลำดับเดียวกันทุกครั้ง:

1. Record deployment URL/SHA/timestamp
2. Run homepage/health checks
3. Run protected endpoint checks
4. Run active account login
5. Run pending/wrong-owner boundary check
6. Inspect logs
7. Run one safe admin/read-only action ตาม scope
8. Cleanup test records/objects
9. Reviewer ตรวจ evidence
10. Update workboard status

## B9. Phase 1 Definition of Done

Phase 1 ผ่านเมื่อ:

- [ ] Staging deployment URL และ commit SHA ถูกบันทึก
- [ ] Staging Firebase/database/bucket isolation ผ่าน
- [ ] Environment variable inventory มีชื่อและ scope ครบ โดยไม่มีค่า secret ใน evidence
- [ ] Homepage HTTP 200
- [ ] `/api/health` HTTP 200
- [ ] Protected endpoints no-token ได้ 401 ตาม policy
- [ ] Active test login ผ่าน
- [ ] Pending/wrong-owner behavior ผ่านตาม policy
- [ ] Runtime logs ไม่มี unexplained 5xx หรือ sensitive leakage
- [ ] Test data cleanup ผ่าน
- [ ] Rollback target ถูกบันทึก
- [ ] Reviewer และ system owner รับรองผล

## B10. Phase 1 Failure Handling

### กรณี build/deployment fail

1. หยุด runtime acceptance
2. เก็บ deployment ID และ build log
3. ตรวจว่า candidate SHA ตรงกับที่ทดสอบ local
4. แก้บน feature branch ใหม่
5. รัน lint/test/build
6. merge/push ตาม workflow
7. สร้าง deployment ใหม่โดยไม่เปลี่ยน staging resource แบบไร้หลักฐาน

### กรณี staging ชี้ production

1. หยุดการทดสอบทันที
2. ห้ามสร้าง test record ต่อ
3. บันทึก resource IDs ที่พบโดยไม่เผยแพร่ secrets
4. ตรวจว่ามี write เกิดขึ้นหรือไม่
5. แจ้ง system owner และทำ incident note
6. แยก resource/credentials ใหม่ก่อนเริ่มซ้ำ

### กรณี runtime 5xx หรือ permission ผิด

1. หยุด workflow acceptance
2. เก็บ request path, timestamp และ correlation/deployment ID
3. ห้าม retry แบบ bulk ที่อาจสร้าง duplicate
4. ตรวจ logs และ rules ใน staging เท่านั้น
5. แก้ไขและ rerun เฉพาะ test case ที่ fail

### กรณีพบ secret ใน logs/bundle

1. หยุด deployment
2. Rotate/revoke credential ตาม owner
3. เก็บ evidence แบบ redact
4. ตรวจ scope ของ credential ที่รั่ว
5. สร้าง fix และ rerun secret scan
6. ห้าม paste secret เพื่อช่วย debug

## Final Phase 0–1 Gate Record

ใช้ template นี้ลงใน workboard เมื่อจบ:

```text
Phase: 0 / 1
Candidate commit:
Remote main SHA:
Staging deployment URL:
Staging deployment ID:
Firebase staging project/database:
Storage bucket:
Test window UTC:
Operator:
Reviewer:
Rollback target:

Repository/CI: PASS | FAIL | BLOCKED
Isolation: PASS | FAIL | BLOCKED
Homepage/health: PASS | FAIL | BLOCKED
Auth/read-only: PASS | FAIL | BLOCKED
401/403 boundary: PASS | FAIL | BLOCKED
Runtime logs: PASS | FAIL | BLOCKED
Cleanup: PASS | FAIL | BLOCKED

Open issues:
Decision: GO TO PHASE 2 | HOLD | ROLLBACK
Evidence links:
```

## Immediate execution order

ให้ทีมทำตามลำดับนี้:

1. Repository maintainer push local `main` ให้ตรงกับ remote
2. รอ required CI ของ commit เดียวกันผ่าน
3. DevOps บันทึก staging candidate และ previous production rollback target
4. System owner ยืนยัน isolated Firebase/database/bucket
5. DevOps ตั้ง environment variables ตาม scope โดยไม่เปิด unverified integrations
6. Deploy Preview/staging
7. Run homepage, health และ protected-route checks
8. Tester run login/read-only/boundary checks
9. Reviewer inspect runtime logs
10. Tester cleanup test data/objects
11. Owner sign Gate 0 และ Gate 1
12. จากนั้นจึงเริ่ม Phase 2 Firebase inventory และ Phase 3 core workflow runtime acceptance

## References

[1]: ./NIPPONFARM_DEVELOPMENT_ACTION_PLAN_2026-09-14.md "Nipponfarm Development Action Plan"
[2]: ./PRODUCTION_DEPLOYMENT_RUNBOOK.md "Production Deployment Runbook"
[3]: ./ENVIRONMENT_VARIABLES.md "Environment Variables"
[4]: ./PRODUCTION_BACKUP_INVENTORY_RUNBOOK.md "Production Backup and Inventory Runbook"
