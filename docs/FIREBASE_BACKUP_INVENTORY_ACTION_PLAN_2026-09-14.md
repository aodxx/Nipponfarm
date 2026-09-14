# Firebase Backup & Inventory Action Plan

**โครงการ:** Nipponfarm  
**วันที่จัดทำ:** 14 กันยายน 2026  
**Blocker:** Production Readiness ข้อ 1 — Firebase inventory, backup และ record-count reconciliation  
**เป้าหมาย:** สร้าง recovery baseline ที่ตรวจสอบย้อนกลับได้ก่อน deploy production rules, migrate data, แยก Firebase project หรือทำ destructive operation ใด ๆ

## 1. Decision และขอบเขต

งานนี้เป็น **read-only inventory + controlled backup** ไม่ใช่ migration และไม่ใช่การเปลี่ยน Firebase production configuration โดยอัตโนมัติ ห้ามลบ แก้ ย้าย หรือเขียนข้อมูล production ระหว่าง Wave 0.

ผลลัพธ์ที่ต้องได้คือหลักฐานที่ตอบคำถามต่อไปนี้ได้อย่างชัดเจน:

1. Production ใช้ Firebase/Google Cloud project และ Firestore database ใด
2. Dataset ใดเป็นของ Nipponfarm และ dataset ใดอาจใช้ร่วมกับระบบอื่น
3. มีข้อมูลกี่รายการในแต่ละ collection และมี schema/status/owner variant ใดบ้าง
4. Firestore, Storage และ Authentication มี recovery copy ที่เก็บในตำแหน่ง private และตรวจสอบ checksum ได้หรือไม่
5. หากต้อง rollback หรือ restore จะทำอย่างไร ใครเป็นผู้อนุมัติ และมีข้อจำกัดอะไร
6. มี record ใดที่กำกวม ขาด owner หรือมี schema ผิดรูปแบบ ซึ่งต้อง `NEEDS_REVIEW` ก่อน migration หรือ rules deployment

**ห้ามถือว่า blocker ปิด** เพียงเพราะ script ทำงานสำเร็จ หรือมีไฟล์ export อยู่ ไฟล์และผลนับต้องผ่านการ review, reconciliation และ approval ก่อน

## 2. สถานะตั้งต้นจาก repository

สิ่งที่มีอยู่แล้ว:

- `scripts/firestore-production-inventory.mjs` สำหรับ read-only Firestore REST inventory
- `docs/PRODUCTION_BACKUP_INVENTORY_RUNBOOK.md`
- รายชื่อ baseline collections 24 รายการ
- Firestore/Storage rules และ emulator verification บางส่วน
- Main branch ล่าสุด `615ecfc`

ข้อจำกัดที่ต้องระวัง:

- ยังไม่ยืนยัน production project ID จาก console หรือ deployment runtime อย่างเป็นทางการ
- Firebase project เดิมมีชื่อ `Thailottery` และอาจมีระบบอื่นร่วมอยู่
- Firestore export ไม่รวม Firebase Storage objects
- Repository script inventory-only สรุป output โดยไม่เขียน document contents ลงไฟล์ แต่จะ decode ข้อมูลที่อ่านได้ใน process; ต้องรันในเครื่องที่ควบคุมได้และไม่ redirect output ไปที่ public/log aggregation
- ยังไม่มี script ครบชุดสำหรับ Storage object inventory, Auth user inventory, rules/indexes snapshot และ checksum manifest

## 3. Roles และการอนุมัติ

| Role | ความรับผิดชอบ |
|---|---|
| System owner | ยืนยันว่า project/bucket/database เป็น production ของ Nipponfarm และอนุมัติขอบเขต |
| Backup operator | รัน inventory/export ตามคำสั่ง, เก็บ evidence และรักษาความลับ |
| Reviewer | ตรวจ counts, schema variants, ambiguous records และ checksum |
| Migration approver | อนุมัติ rules deployment/migration หลัง recovery gate ผ่านเท่านั้น |
| Developer | ตรวจ mapping ระหว่าง collection/schema กับ application code; ไม่ตัดสิน business ownership แทนเจ้าของข้อมูล |

**กติกา:** คนเดียวไม่ควรเป็นทั้ง operator และ sole approver สำหรับ backup ที่จะใช้เป็น recovery source

## 4. Phase 0 — Freeze scope และเตรียมพื้นที่เก็บหลักฐาน

### เป้าหมาย

สร้าง private evidence workspace นอก repository และกำหนด naming/retention ก่อนอ่านข้อมูลจริง

### ขั้นตอน

1. สร้าง directory ที่เข้าถึงได้เฉพาะ operator และ backup reviewer เช่น:

```bash
umask 077
export EVIDENCE_ROOT="$HOME/private/nipponfarm-recovery/2026-09-14T2200+09"
mkdir -p "$EVIDENCE_ROOT"/{identity,firestore,storage,auth,rules,checksums,review}
chmod -R go-rwx "$EVIDENCE_ROOT"
```

2. ห้ามสร้างไฟล์ evidence ใต้ repository และห้าม `git add` export ใด ๆ
3. บันทึก operator, timestamp, hostname และ tool versions ใน `identity/operator.txt` โดยไม่ใส่ token/secret
4. กำหนด retention และผู้มีสิทธิ์อ่านไฟล์
5. เตรียม encrypted/private backup destination ที่เจ้าของระบบอนุมัติแล้ว

### Evidence

- `identity/operator.txt`
- `identity/retention-approval.md`
- รายชื่อผู้มีสิทธิ์อ่าน/restore

### Stop condition

หยุดทันทีหาก destination เป็น public bucket, shared drive ที่ permission กว้าง, ไม่มี encryption หรือไม่รู้ว่าใครเข้าถึงได้

## 5. Phase 1 — ยืนยัน Production Identity

### เป้าหมาย

ยืนยันตัวตนของระบบก่อน export เพื่อไม่ให้ backup ผิด project

### ข้อมูลที่ต้องบันทึก

- Firebase project ID
- Google Cloud project number ถ้ามี
- Firestore database ID (`(default)` หรือ named database)
- Firestore region
- Storage bucket name
- Firebase Auth tenant/provider configuration
- Production URL และ Vercel deployment commit
- วันที่/เวลาและบัญชี operator ที่ตรวจสอบ
- แหล่งหลักฐานของแต่ละค่า เช่น Firebase Console, Vercel settings, deployment runtime

### Verification commands (read-only)

```bash
gcloud auth list
gcloud projects describe <PROJECT_ID>
gcloud firestore databases list --project=<PROJECT_ID>
gcloud firestore databases describe '(default)' --project=<PROJECT_ID>
gcloud storage buckets list --project=<PROJECT_ID>
```

ให้ใช้ `gcloud` ที่ login ด้วยบัญชีที่เจ้าของระบบอนุมัติเท่านั้น ตรวจว่า account/project ที่ active ตรงกับที่ตั้งใจ:

```bash
gcloud config get-value account
gcloud config get-value project
```

ห้ามส่ง access token เข้า chat, commit, screenshot หรือ log

### Evidence

- `identity/production-identity.md`
- screenshot/export จาก console ที่ redact แล้ว ถ้านโยบายอนุญาต
- `identity/project-ownership-confirmation.md` ลงชื่อโดย system owner

### Stop condition

ถ้า project ID, database ID หรือ bucket ไม่ตรงกัน ให้หยุดก่อนอ่าน collection ต่อ และตั้งสถานะ `NEEDS_REVIEW`

## 6. Phase 2 — Firestore Read-only Inventory

### เป้าหมาย

นับจำนวน documents, schema signatures และเก็บรายการ collection ที่พบโดยไม่สร้าง logical export ก่อน

### เตรียม authentication

ตัวเลือกที่แนะนำคือ short-lived token ใน shell:

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
unset GOOGLE_OAUTH_ACCESS_TOKEN  # ทำทันทีเมื่อ inventory เสร็จ
```

ห้ามเขียน token ลงไฟล์หรือใช้ service-account JSON ใน repository

### รัน baseline inventory

```bash
cd /home/ubuntu/work/Nipponfarm
node scripts/firestore-production-inventory.mjs \
  --project <PROJECT_ID> \
  --database '(default)' \
  --output "$EVIDENCE_ROOT/firestore/firestore-inventory-20260914-2200.json" \
  2>"$EVIDENCE_ROOT/firestore/inventory.stderr.log"
```

ก่อนรัน collection baseline ให้ตรวจว่ามี collection เพิ่มเติมจากรายการใน runbook หรือไม่ และเพิ่มรายการด้วย `--collections` แทนการเดา

### ต้องตรวจใน report

- count ต่อ collection
- schema variant count และ field names
- collection ที่ไม่พบ
- pagination/read errors
- unexpected top-level collections
- generated timestamp, project ID และ database ID

### ข้อควรระวัง

อย่าเริ่มด้วย `--include-documents` เพราะ logical export อาจมีข้อมูลส่วนบุคคล, ข้อมูลเงินเดือน, รูปภาพแบบ encoded หรือข้อมูลอ่อนไหวจำนวนมาก ให้ทำเฉพาะเมื่อ owner อนุมัติ scope และ destination แล้ว

### Evidence

- `firestore/firestore-inventory-*.json`
- `firestore/inventory.stderr.log`
- `firestore/collection-catalog.md`
- `firestore/inventory-review.md`

## 7. Phase 3 — Firestore Managed Export

### เป้าหมาย

สร้าง recovery source หลักที่เหมาะกับการ restore โดยใช้ Google Cloud managed export ไม่ใช่การเก็บ JSON เป็น source เดียว

### Preflight ก่อน export

ยืนยันทุกข้อเป็นลายลักษณ์อักษร:

- backup bucket เป็นของบัญชี/องค์กรที่ถูกต้อง
- bucket private และไม่มี public access
- bucket location และ retention policy ถูกต้อง
- service account/operator มี IAM สำหรับ export และตรวจสถานะ
- ค่าใช้จ่ายและช่วงเวลาของ export ได้รับอนุมัติ
- export prefix เป็น immutable/unique และไม่เขียนทับชุดเก่า
- ไม่มี migration หรือ rules deployment ขณะกำลังทำ snapshot

### คำสั่งตัวอย่างหลังได้รับอนุมัติเท่านั้น

```bash
gcloud firestore export \
  "gs://<PRIVATE_BACKUP_BUCKET>/nipponfarm/firestore/20260914-2200" \
  --project=<PROJECT_ID> \
  --database='(default)'
```

ตรวจสถานะ operation และเก็บ operation ID, start/end time, output URI และ error หากมี:

```bash
gcloud firestore operations list --project=<PROJECT_ID>
gcloud firestore operations describe <OPERATION_NAME> --project=<PROJECT_ID>
```

### Evidence

- `firestore/managed-export-approval.md`
- `firestore/managed-export-operation.md`
- URI ของ export (ไม่ต้องคัดลอกข้อมูลจริงเข้า repository)
- export completion status และ timestamp
- retention/access policy ของ backup bucket

### Stop condition

ถ้า export ล้มเหลว, bucket ผิด project, operation ยังไม่ complete หรือไม่มีสิทธิ์ตรวจ restore metadata ให้หยุดและอย่าดำเนิน migration ต่อ

## 8. Phase 4 — Logical Firestore Reconciliation Copy

### เป้าหมาย

เก็บ logical report สำหรับเทียบ field/schema และ business-level reconciliation นอกเหนือจาก managed export

### การทำงาน

1. เริ่มจาก collection ที่มีความเสี่ยงสูงก่อน: `users`, `sows`, `events`, `tasks`, `pig_sales`, `maintenance_requests`, payroll collections, `bills`, `bill_items`
2. ใช้ output private และเข้ารหัสตาม policy
3. อย่าใส่ JSON ใน Git, issue, PR หรือ chat
4. สร้าง hash ของไฟล์หลัง export

ตัวอย่างเมื่อได้รับอนุมัติ:

```bash
node scripts/firestore-production-inventory.mjs \
  --project <PROJECT_ID> \
  --database '(default)' \
  --collections users,sows,events,tasks,pig_sales,maintenance_requests,employee_transactions,EmployeeTransaction,employee_salaries,payroll_slips,salary_advances,payroll_audit_events,bills,bill_items \
  --include-documents \
  --output "$EVIDENCE_ROOT/firestore/firestore-logical-export-20260914-2200.json"
```

ไฟล์ logical export ต้องมี access control สูงกว่า inventory-only report และต้องลบจาก local workspace เมื่อ copy ไป recovery destination และตรวจ checksum เรียบร้อยแล้ว ตาม retention policy

## 9. Phase 5 — Storage Inventory และ Recovery Copy

### เหตุผล

Firestore export ไม่รวม Firebase Storage objects แต่ Firestore records อาจอ้างอิงรูป/วิดีโอผ่าน path หรือ URL

### Inventory

ต้องบันทึก:

- bucket name และ location
- object count รวมและแยกตาม prefix
- total bytes
- object path, generation/update time, content type และ checksum/hash ถ้า API เปิดเผย
- prefixes สำคัญ: `bills/`, `maintenance/`, `news/`, วิดีโอ/R2 references ที่ระบบใช้
- objects ที่ orphaned หรือไม่มี Firestore reference (ถ้าทำได้โดยไม่เปลี่ยนข้อมูล)

ใช้ `gcloud storage ls --recursive` หรือเครื่องมือที่เจ้าของระบบอนุมัติ โดย redirect output ไป evidence workspace private เท่านั้น:

```bash
gcloud storage ls --recursive "gs://<STORAGE_BUCKET>/**" \
  >"$EVIDENCE_ROOT/storage/storage-object-list.txt"
```

สร้าง summary count/bytes แยก prefix และเก็บ rules snapshot ที่ใช้ ณ เวลาเดียวกัน

### Recovery copy

1. กำหนดว่าต้องเก็บทุก object หรือเฉพาะ object ที่ Firestore อ้างอิง
2. ถ้าเป็น migration ที่กระทบ path ให้เก็บทุก object ที่เกี่ยวข้องและคง original path
3. copy ไป private recovery bucket/location ที่แยกจาก source
4. ห้ามลบ legacy object ใน Wave 0
5. ตรวจจำนวนและ checksum หลัง copy

### Evidence

- `storage/storage-inventory-*.json` หรือ summary
- `storage/storage-object-list.txt`
- `storage/rules-snapshot-*.txt`
- `storage/recovery-copy-manifest.*`
- `storage/storage-reconciliation.md`

## 10. Phase 6 — Firebase Authentication Inventory

Firestore backup ไม่ครอบคลุม Auth users ดังนั้นต้องแยก inventory และ recovery plan

### ต้องบันทึก

- จำนวน user ทั้งหมด
- UID, provider type, disabled state, creation/last sign-in timeในรูปแบบที่ policy อนุญาต
- role distribution จาก profile documents
- users ที่ไม่มี profile หรือ profile ที่ไม่มี corresponding Auth user
- ADMIN/PENDING/RESIGNED anomalies
- provider configuration และ authorized domains

ห้าม export password hash, refresh token, ID token หรือ secret

คำสั่งต้องใช้ Firebase Admin/Google Cloud tooling ที่เจ้าของอนุมัติ และ output ต้อง redact ตาม privacy policy หากยังไม่มีเครื่องมือที่ผ่านการ review ให้ mark `NOT RUN` แทนการเขียน script ad hoc ต่อ production

### Evidence

- `auth/auth-inventory-summary.json` (ไม่เก็บ secrets)
- `auth/profile-auth-reconciliation.md`
- provider/domain configuration snapshot
- owner approval สำหรับ retention

## 11. Phase 7 — Rules, Indexes และ Configuration Snapshot

เก็บ snapshot ของ:

- `firestore.rules`
- `storage.rules`
- Firestore indexes
- Firebase project settings ที่เกี่ยวกับ Auth/Storage/Firestore
- Vercel environment variable **ชื่อและ environment เท่านั้น** ห้ามค่า
- deployed commit และ deployment ID

เปรียบเทียบ repository rules กับ deployed rules หากมีสิทธิ์ตรวจ และ mark ความต่างเป็น `NEEDS_REVIEW`

ห้าม deploy rules ระหว่าง phase นี้ เว้นแต่มี change approval แยกต่างหาก

## 12. Phase 8 — Reconciliation และ Anomaly Review

### Reconciliation matrix

สร้างตารางอย่างน้อย:

| Dataset | Inventory count | Managed export present | Logical copy present | Storage/Auth related count | Difference | Status |
|---|---:|---:|---:|---:|---:|---|
| users |  |  |  |  |  |  |
| sows |  |  |  |  |  |  |
| events |  |  |  |  |  |  |
| tasks |  |  |  |  |  |  |
| pig_sales |  |  |  |  |  |  |
| maintenance_requests |  |  |  |  |  |  |
| payroll collections |  |  |  |  |  |  |
| bills / bill_items |  |  |  |  |  |  |
| Storage objects |  |  |  |  |  |  |
| Auth users |  |  |  |  |  |  |

### Review rules

- Counts ไม่ตรง: `NEEDS_REVIEW`
- Collection หาย: `BLOCKED`
- Schema variant ที่ไม่รู้ที่มา: `NEEDS_REVIEW`
- Missing owner/user identifier: `NEEDS_REVIEW`
- Unexpected role/status: `NEEDS_REVIEW`
- Export incomplete: `BLOCKED`
- Checksum mismatch: `BLOCKED`
- ไม่มีหลักฐาน Storage/Auth recovery: `BLOCKED` สำหรับ migration ที่กระทบ resource นั้น

ห้ามแก้ข้อมูลเพื่อให้ count ตรงระหว่าง reconciliation

## 13. Phase 9 — Checksum, Access Review และ Restore Drill

### Checksum manifest

```bash
find "$EVIDENCE_ROOT" -type f -not -path '*/checksums/*' -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  >"$EVIDENCE_ROOT/checksums/SHA256SUMS"
sha256sum -c "$EVIDENCE_ROOT/checksums/SHA256SUMS"
```

### Access review

ตรวจว่า:

- operator อ่านได้เท่าที่จำเป็น
- reviewer อ่าน evidence ได้แต่ไม่แก้ไข source export
- backup bucket ไม่ public
- retention/immutability ถูกตั้งตาม policy
- logs ไม่มี token/PII เกินจำเป็น

### Restore drill

ก่อนปิด blocker ควรทำ restore validation ใน **separate non-production project**:

1. Restore managed Firestore export ไป test project/database
2. ตรวจ counts และ representative records
3. ตรวจ Storage recovery copy ด้วย sample หรือ full verification ตาม scope
4. ตรวจ Auth recovery plan โดยไม่เปลี่ยน production users
5. รัน read-only application smoke หรือ rules emulator against restored dataset หากทำได้
6. บันทึกเวลา restore, missing data, permission errors และ cleanup proof
7. ลบ test project/data หลังได้รับอนุมัติและเก็บ evidence เท่านั้น

ห้ามทดลอง restore ทับ production

## 14. Recovery Acceptance Gate

Blocker ข้อนี้ถือว่า **CLOSED** ได้เมื่อครบทุกข้อ:

- [ ] System owner ยืนยัน production project ID, database ID และ bucket
- [ ] Inventory ครบทุก top-level collection ที่พบจริง ไม่ใช่เฉพาะ baseline list
- [ ] Counts และ schema variants ผ่าน reviewer
- [ ] Auth user/profile inventory และ role anomalies ถูกตรวจ
- [ ] Storage object inventory และ recovery scope ถูกบันทึก
- [ ] Firestore managed export สำเร็จและตรวจ operation completion แล้ว
- [ ] Logical copy มีเฉพาะเมื่ออนุมัติ และเก็บใน private encrypted destination
- [ ] Rules/indexes/config snapshot ถูกเก็บโดยไม่เปิดเผย secrets
- [ ] Checksum manifest ตรวจผ่าน
- [ ] Count reconciliation ไม่มี unresolved `BLOCKED` หรือ `NEEDS_REVIEW`
- [ ] Restore drill หรือ recovery validation ผ่านใน non-production environment
- [ ] ไม่มี production export, token หรือ secret ถูก commit เข้า Git
- [ ] Operator และ reviewer ลงชื่อรับรอง evidence
- [ ] Owner อนุมัติให้ดำเนิน Wave ถัดไป

## 15. Stop conditions และ incident handling

หยุดงานทันทีหากพบ:

- project/bucket/database ไม่ตรงกับ production identity
- access token หรือ secret ถูกเขียนลงไฟล์ที่ไม่ private
- export ไป bucket ที่ไม่ใช่ของ owner หรือ public
- collection มีข้อมูลของระบบอื่นและแยก ownership ไม่ได้
- counts เปลี่ยนระหว่าง snapshot อย่างมีนัยสำคัญ
- managed export operation failed/partial
- checksum mismatch
- unexpected permission denied ที่อธิบายไม่ได้
- operator พบ PII/financial data รั่วออก log หรือ chat
- มีคำขอให้ลบ/แก้ข้อมูลก่อน backup gate ปิด

เมื่อหยุด: เก็บ evidence ของ error, ไม่ retry แบบเปลี่ยน scope เอง, แจ้ง system owner และสร้าง incident note ที่ไม่มี secrets

## 16. Output package และ handoff

Recovery package ควรมีโครงสร้าง:

```text
identity/
firestore/
  inventory-report
  managed-export-reference
  logical-export-reference (ถ้าอนุมัติ)
storage/
auth/
rules/
checksums/
review/
  reconciliation-matrix
  anomaly-register
  restore-drill-report
  approval-record
```

ห้ามนำข้อมูลจริงเข้า repository โดยให้ commit เฉพาะเอกสารสรุปที่ redact แล้ว เช่น:

- project/database/bucket identifier ที่อนุญาตให้เผยแพร่ภายในทีม
- counts ที่ไม่เปิดเผย record contents หาก policy อนุญาต
- status, evidence URI ภายใน, timestamps และ reviewer
- unresolved risks และ owner ของแต่ละรายการ

## 17. Recommended execution order

ลำดับที่ปลอดภัยที่สุด:

1. Freeze scope และ private evidence workspace
2. Confirm production identity
3. Firestore inventory-only
4. Rules/indexes/config snapshot
5. Managed Firestore export
6. Storage inventory/recovery copy
7. Auth inventory/profile reconciliation
8. Logical export เฉพาะ scope ที่อนุมัติ
9. Checksum/access review
10. Reconciliation/anomaly review
11. Non-production restore drill
12. Owner approval และปิด blocker
13. จึงพิจารณา production rules deployment หรือ migration plan ระยะถัดไป

> **หลักการสำคัญ:** Backup ที่ยังไม่ผ่าน identity verification, checksum, reconciliation และ restore validation ให้ถือเป็น `NOT READY` แม้ไฟล์ export จะถูกสร้างสำเร็จแล้ว
