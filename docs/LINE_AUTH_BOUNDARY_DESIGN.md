# Nipponfarm LINE Account Linking — Auth Boundary Design

**Status:** DESIGN_READY
**Branch:** `feature/line-integration-planning`
**Scope:** Repository-side design only; no production credentials, data migration, or Firebase rule deployment.

## 1. Current identity model

Nipponfarm already uses Firebase Authentication as the primary application identity. The client receives a Firebase `User`, and `AuthContext` resolves `users/{uid}` into `UserProfile`. Supported roles are `ADMIN`, `STAFF`, `PENDING`, and `RESIGNED`.

LINE must therefore be treated as an external channel identity, not as the application's primary identity.

## 2. Proposed relationship

```text
LINE User ID (external identity)
        |
        | explicit account-linking flow
        v
Nipponfarm Firebase UID (canonical identity)
        |
        +--> users/{uid}.role
        +--> existing farm/workflow permissions
        +--> payroll ownership rules
```

Do not authorize Nipponfarm data directly from a LINE display name, LINE profile name, email address, or LIFF browser state.

## 3. Account-linking record

Preferred initial record:

`line_account_links/{lineUserId}`

Suggested fields:

- `lineUserId: string` — immutable LINE user identifier
- `firebaseUid: string` — canonical Nipponfarm UID
- `status: ACTIVE | REVOKED | PENDING`
- `linkedAt: number`
- `linkedBy: USER | ADMIN`
- `revokedAt?: number`
- `lastSeenAt?: number`
- `schemaVersion: 1`

The canonical user document may also retain `lineId` for compatibility/display, but the link record is the authoritative mapping for LINE integration.

## 4. Linking policy

Initial release should use an explicit authenticated linking flow:

1. User opens Nipponfarm while already authenticated with Firebase.
2. User starts `Connect LINE`.
3. LIFF/LINE Login establishes the LINE identity.
4. Backend verifies the LINE identity using the official LINE authentication mechanism.
5. Backend creates or updates the link only after the authenticated Firebase UID is established.
6. The UI confirms the linked account.

Alternative admin-assisted recovery may revoke the old link and create a new one after identity verification.

## 5. Authorization boundary

After linking:

- LINE identifies the channel user.
- Backend resolves LINE user ID → Firebase UID.
- Existing Nipponfarm authorization remains authoritative.
- `ADMIN`, `STAFF`, `PENDING`, and `RESIGNED` behavior must remain unchanged.
- Payroll data remains owner/admin scoped by the existing Firebase rules.
- LINE must never bypass Firebase ownership checks.

For sensitive LIFF pages, obtain/verify the authenticated application identity server-side before returning protected data.

## 6. Webhook boundary

LINE webhook requests must be signature-verified before processing. The endpoint must reject invalid signatures and must not write Firestore or send notifications for unverified events.

Webhook processing should be idempotent using a LINE event identifier or equivalent deterministic event key where available.

Never store channel secrets, access tokens, or signing secrets in source control.

## 7. Firestore rule strategy

Do not loosen existing production rules as part of the first LINE integration.

The first implementation should prefer server-side integration for link creation/revocation and notification dispatch, with explicit authorization checks. If a Firestore collection is later exposed to the browser, add narrow rules and Emulator tests first.

Do not allow a client to choose an arbitrary `firebaseUid` or overwrite another user's link.

## 8. Notification policy

LINE notifications should contain minimal information. Example:

`มีรายการใหม่ที่ต้องตรวจสอบ กรุณาเปิด Nipponfarm เพื่อดูรายละเอียด`

Do not place salary amounts, bank details, private employee data, or detailed financial records directly into push messages.

## 9. Failure and recovery

If LINE is unavailable:

- Nipponfarm web/PWA continues to operate.
- Existing Firebase authentication remains usable.
- No core workflow depends synchronously on LINE.
- Failed notifications may be retried without duplicating business transactions.

If a LINE account is changed:

- Revoke the old link.
- Verify the user through the normal Nipponfarm identity flow.
- Establish the new link.
- Preserve historical records and audit evidence.

## 10. Implementation order

### Gate A — Repository foundation

- Add server-side LINE configuration schema/validation.
- Add LINE service boundary.
- Add webhook signature verification helper.
- Add account-link service interface.
- Add unit tests for invalid signature, duplicate event, revoked link, and missing link.

### Gate B — Account linking

- Add link/unlink API.
- Add minimal Firestore schema.
- Add Emulator tests for owner/admin/revoked scenarios.
- Add LIFF connection page.

### Gate C — Read-only LIFF

Start with `งานวันนี้` and read-only farm/task information. Do not start with payroll write operations.

### Gate D — Operational actions

Add maintenance issue submission and status tracking with existing authorization boundaries.

### Gate E — Notifications

Enable push notifications only after link reliability, idempotency, and opt-in/eligibility behavior are tested.

## 11. Non-regression requirements

The LINE work must not:

- change existing Firebase roles;
- bypass `ProtectedRoute`/server authorization;
- weaken Firestore or Storage rules;
- change payroll calculations;
- alter sow/sales/maintenance business logic unnecessarily;
- require LINE for direct web/PWA login;
- commit secrets;
- depend on WebSocket `/live`, which is not exposed by the current Vercel API handler.

## 12. Definition of Ready for implementation

Implementation can begin only when:

- LINE Official Account/channel identifiers are available outside source control;
- LIFF ID(s) are defined;
- callback/origin domains are confirmed;
- account-linking UX is approved;
- Emulator test strategy is ready;
- rollback is documented;
- no production Firebase rule change is required for the first foundation PR.
