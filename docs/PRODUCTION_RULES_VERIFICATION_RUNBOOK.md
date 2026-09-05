# Nipponfarm Production Rules Verification Runbook

Status: Wave 0.3 readiness baseline

## Goal

Confirm that the Firestore and Firebase Storage rules currently deployed in the real production Firebase project are byte-equivalent (after line-ending normalization) to the repository files before Wave 1 historical-data changes begin.

This step is read-only. It must not deploy or modify rules.

## Confirmed Nipponfarm production target

Current target supplied for Wave 0 verification:

```text
Firebase project: gen-lang-client-0326253424
Firestore database: ai-studio-remixniponfarmap-b0e121f8-01e3-477b-899b-b0076a40772b
Storage bucket: gen-lang-client-0326253424.firebasestorage.app
```

The Firestore database is a named database, not `(default)`. Verification must therefore target its database-specific Firebase Rules release. Do not accept a successful comparison against `cloud.firestore` for the default database as proof for this Nipponfarm database.

## Prerequisites

Authenticate with a Google account that can read Firebase Rules metadata:

```bash
gcloud auth login
```

Then run the explicit production check:

```bash
node scripts/verify-production-rules.mjs \
  --project gen-lang-client-0326253424 \
  --database ai-studio-remixniponfarmap-b0e121f8-01e3-477b-899b-b0076a40772b \
  --bucket gen-lang-client-0326253424.firebasestorage.app
```

Alternative short-lived token:

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
node scripts/verify-production-rules.mjs \
  --project gen-lang-client-0326253424 \
  --database ai-studio-remixniponfarmap-b0e121f8-01e3-477b-899b-b0076a40772b \
  --bucket gen-lang-client-0326253424.firebasestorage.app
```

Never commit the token.

## What the verifier checks

The verifier uses the Firebase Rules API in read-only mode to:

1. list the project's deployed Rules releases
2. locate the exact Firestore release for the selected database
3. locate the exact Firebase Storage release for the selected bucket
4. fetch the ruleset source currently attached to each release
5. compare deployed Firestore source with `firestore.rules`
6. compare deployed Storage source with `storage.rules`
7. report SHA-256 hashes and release/ruleset timestamps

For a named Firestore database, the expected release is:

```text
projects/<PROJECT_ID>/releases/cloud.firestore/<DATABASE_ID>
```

For Storage, the expected release is:

```text
projects/<PROJECT_ID>/releases/firebase.storage/<BUCKET_NAME>
```

## Expected result

Both sections must report:

```text
status: MATCH
```

The script exits with:

- `0` when the explicitly selected Firestore database and Storage bucket both match
- `2` when a deployed release/source is missing or differs from the repo
- `1` for authentication/API/configuration failure

## If MISMATCH is found

Do not start Wave 1.

Record:

- project ID
- Firestore database ID
- Storage bucket
- deployed release name
- deployed ruleset name
- local SHA-256
- deployed SHA-256
- verification timestamp

Then determine whether:

1. production intentionally has newer rules that are not yet in Git, or
2. Git contains the intended rules but production has not been deployed, or
3. the wrong Firebase project/database/bucket/account was checked.

Do not automatically overwrite production merely to make hashes match. Reconcile the intended policy first, rerun emulator tests, and only then perform an explicit deployment.

## Multi-database deployment warning

`firebase.json` must explicitly associate a rules file with each named Firestore database before any future CLI deployment. A deployment configuration that only points to a generic Firestore rules file can target the default database and must not be assumed to deploy rules to this Nipponfarm named database.

Do not modify or deploy production configuration during this verification step. Treat configuration correction as a separate reviewed milestone after the deployed state has been read and recorded.

## Wave 0.3 acceptance gate

Wave 0.3 is complete only when:

- the production project ID is explicitly confirmed
- the production Firestore database ID is explicitly confirmed
- the production Storage bucket is explicitly confirmed
- Firestore deployed rules for that named database = repository `firestore.rules`
- Storage deployed rules for that bucket = repository `storage.rules`
- the verification result and timestamp are recorded
- any mismatch has been reconciled intentionally
- no deployment or migration was performed as an accidental side effect of verification

After this gate passes, Wave 1.1 — Sow Removal Safety may begin.
