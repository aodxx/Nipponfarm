# Nipponfarm Production Backup & Inventory Runbook

Status: Wave 0.2 readiness baseline

## Purpose

This runbook prepares a safe recovery baseline before any production migration. It is intentionally read-only until an operator explicitly starts a backup/export action.

## Safety rules

- Do not run destructive migrations before inventory + backup + dry-run review are complete.
- Never commit access tokens, service-account JSON, Firebase secrets, or exported production data.
- Treat the current production Firebase project as legacy-sensitive until project identity and dataset ownership are verified.
- If any record is ambiguous, mark it `NEEDS_REVIEW`; do not infer missing business truth.
- A migration is not approved merely because code tests pass. Production inventory and recovery readiness must also be confirmed.

## 1. Confirm production identity

Before reading or exporting production data, record:

- Firebase / Google Cloud project ID
- Firestore database ID, normally `(default)`
- Storage bucket name
- production app URL
- operator Google account
- timestamp of verification

Do not assume the repo project name is the production Firebase project name.

## 2. Read-only Firestore inventory

Use the repository script:

```bash
node scripts/firestore-production-inventory.mjs --project <PROJECT_ID> --output firestore-inventory.json
```

Authentication options:

```bash
gcloud auth login
```

or provide a short-lived access token only in the shell environment:

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
```

The script performs Firestore REST reads only. It reports:

- document count per known top-level collection
- distinct top-level field signatures (schema variants)
- no document contents unless `--include-documents` is explicitly supplied

For a local logical recovery copy, use:

```bash
node scripts/firestore-production-inventory.mjs \
  --project <PROJECT_ID> \
  --include-documents \
  --output firestore-logical-export.json
```

The resulting JSON can contain sensitive production data. Keep it outside the repository and store it only in an approved private recovery location.

## 3. Collections in the baseline inventory

The current baseline scans:

- users
- sows
- events
- tasks
- pig_sales
- maintenance_requests
- chat_rooms
- chat_messages
- employee_transactions
- EmployeeTransaction
- employee_salaries
- payroll_slips
- salary_advances
- payroll_audit_events
- bills
- bill_items
- feed_recipes
- pig_prices
- historical_pig_prices
- farm_settings
- master_ingredients
- news_posts
- manuals

If production contains additional top-level collections, rerun with:

```bash
node scripts/firestore-production-inventory.mjs \
  --project <PROJECT_ID> \
  --collections collectionA,collectionB
```

## 4. Managed Firestore export

A managed Firestore export is preferred as the primary recovery source when the production Google Cloud project, bucket, permissions, billing implications, and retention location have been explicitly confirmed.

Do not start the managed export automatically from application code.

Typical operator command after confirmation:

```bash
gcloud firestore export gs://<PRIVATE_BACKUP_BUCKET>/<DATE_PREFIX> \
  --project=<PROJECT_ID> \
  --database='(default)'
```

Before running it, confirm:

- backup bucket belongs to the correct project/account
- bucket is private
- expected storage/export costs are acceptable
- operator has required IAM permissions
- retention period is documented

## 5. Storage inventory / backup

Firestore export does not back up Firebase Storage objects.

Before migrations that may affect Storage references:

1. record the production bucket name
2. count/list relevant prefixes
3. confirm current `storage.rules`
4. copy/export required objects to a private recovery location when needed
5. preserve original object paths so Firestore references can be reconciled

Do not delete legacy objects during Wave 0.

## 6. Inventory review checklist

For each collection record:

- total document count
- schema variant count
- obvious legacy variants
- records missing owner/user identifiers
- records with unexpected status values
- records requiring migration
- records requiring `NEEDS_REVIEW`

Priority review areas:

### users
- role distribution
- unexpected ADMIN documents
- missing uid/email/createdAt

### sows / events / tasks
- CULLED records
- parity versus FARROW history
- missing or inconsistent sow references
- event detail variants

### pig_sales
- current delete-sensitive records
- payment status distribution

### bills / bill_items
- missing units
- inconsistent totals
- legacy item shapes

### payroll
- salary advance status variants
- historical base salary availability
- duplicate/legacy employee transaction collections

## 7. Recovery acceptance gate

Wave 0.2 is complete only when all of the following are true:

- production project identity is confirmed
- inventory report exists and has been reviewed
- document counts are recorded
- schema variants are recorded
- a private recovery copy/export exists or an explicitly approved recovery method is documented
- Storage recovery scope is documented
- no secrets or production exports are committed to Git
- ambiguous records are identified before migration

## 8. Output naming

Recommended local/private names:

```text
firestore-inventory-YYYYMMDD-HHMM.json
firestore-logical-export-YYYYMMDD-HHMM.json
firestore-managed-export/YYYYMMDD-HHMM/
storage-inventory-YYYYMMDD-HHMM.txt
```

## 9. Next step

After this gate passes, continue to Wave 0.3: verify that deployed production Firestore and Storage rules match the repository rules before starting Wave 1 historical-truth changes.
