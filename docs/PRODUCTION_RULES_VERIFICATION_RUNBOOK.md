# Nipponfarm Production Rules Verification Runbook

Status: Wave 0.3 readiness baseline

## Goal

Confirm that the Firestore and Firebase Storage rules currently deployed in the real production Firebase project are byte-equivalent (after line-ending normalization) to the repository files before Wave 1 historical-data changes begin.

This step is read-only. It must not deploy or modify rules.

## Prerequisites

Confirm the actual production Firebase / Google Cloud project ID first. Do not infer it from the repository name.

Authenticate with a Google account that can read Firebase Rules metadata:

```bash
gcloud auth login
```

Then run:

```bash
node scripts/verify-production-rules.mjs --project <PROJECT_ID>
```

Alternative short-lived token:

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
node scripts/verify-production-rules.mjs --project <PROJECT_ID>
```

Never commit the token.

## What the verifier checks

The verifier uses the Firebase Rules API in read-only mode to:

1. list the project's deployed Rules releases
2. locate the `cloud.firestore` release
3. locate the Firebase Storage release
4. fetch the ruleset source currently attached to each release
5. compare deployed Firestore source with `firestore.rules`
6. compare deployed Storage source with `storage.rules`
7. report SHA-256 hashes and release/ruleset timestamps

## Expected result

Both sections must report:

```text
status: MATCH
```

The script exits with:

- `0` when Firestore and Storage both match
- `2` when a deployed release/source is missing or differs from the repo
- `1` for authentication/API/configuration failure

## If MISMATCH is found

Do not start Wave 1.

Record:

- project ID
- deployed release name
- deployed ruleset name
- local SHA-256
- deployed SHA-256
- verification timestamp

Then determine whether:

1. production intentionally has newer rules that are not yet in Git, or
2. Git contains the intended rules but production has not been deployed, or
3. the wrong Firebase project/account was checked.

Do not automatically overwrite production merely to make hashes match. Reconcile the intended policy first, rerun emulator tests, and only then perform an explicit deployment.

## Storage release ambiguity

If multiple Firebase Storage releases are returned, the verifier stops instead of guessing which bucket is production. Confirm the bucket in Firebase Console / Google Cloud first.

## Wave 0.3 acceptance gate

Wave 0.3 is complete only when:

- the production project ID is explicitly confirmed
- Firestore deployed rules = repository `firestore.rules`
- Storage deployed rules = repository `storage.rules`
- the verification result and timestamp are recorded
- any mismatch has been reconciled intentionally
- no deployment or migration was performed as an accidental side effect of verification

After this gate passes, Wave 1.1 — Sow Removal Safety may begin.
