# Nipponfarm Consolidation Skill Pack

Updated: 2026-09-04

Purpose: provide a focused set of reusable skills for **Nipponfarm Core Workflow & UX Consolidation** without creating more agent/team overhead. The project continues under **Single Controller Execution**; these are capabilities/checklists to apply when needed, not separate autonomous teams.

## Operating rule

Use only the skill(s) required by the current task. Do not activate every skill at once. Every implementation task must still follow the repository CI, Firebase Emulator, and production-safety gates already established.

---

## SKILL-01 — Workflow & Product UX Consolidation

### Use for
- Dashboard / Today View
- simplifying multi-step workflows
- removing duplicate or confusing entry points
- deciding primary vs secondary navigation
- converting feature-oriented screens into task-oriented screens

### Required method
1. Identify the user's real job-to-be-done.
2. Map current start → decision → action → confirmation → history/recovery.
3. Mark friction, duplicate decisions, hidden states, dead ends and risky writes.
4. Reduce steps before changing visual styling.
5. Preserve existing data behavior unless explicitly migrated.
6. Define success and failure states before implementation.

### UX decision rule
Prefer **task completion clarity** over feature visibility.

### Definition of Done
- primary user can identify what to do next without reading documentation
- critical action has explicit success/failure feedback
- no duplicate primary action for the same workflow
- back/retry/recovery path is defined
- behavior is verified at user level, not only by static code review

---

## SKILL-02 — Mobile-first Farm UX

### Use for
- Dashboard
- scan flows
- field maintenance
- sow operations
- sales entry
- staff/payroll mobile views

### Required checks
- readable outdoors / high-glare conditions
- important values visually dominant
- minimum practical touch area for frequent actions
- no critical action hidden below ambiguous scroll regions
- loading, offline, retry and disabled states are visible
- destructive/financial writes require clear confirmation
- frequent inputs minimize typing and repeated data entry

### Definition of Done
- usable one-handed on common Android screen sizes
- primary action remains obvious after validation/error state
- text hierarchy distinguishes title, decision data, supporting detail and metadata
- no horizontal scrolling in primary workflows

---

## SKILL-03 — React/Vite Performance & Chunking

### Use for
- large routes/components
- bundle warnings
- slow initial navigation
- duplicate static/dynamic imports
- chart/PDF/media-heavy features

### Required method
1. Measure current bundle output before changing code.
2. Prefer route-level lazy loading first.
3. Remove static imports that defeat lazy route chunks.
4. Avoid creating loading waterfalls where code and data could load concurrently.
5. Move heavy optional libraries behind the workflow that needs them.
6. Rebuild and compare bundle/chunks after the change.

### Known Nipponfarm focus
- `UserManagement` static import leakage
- ScanReceipt heavy chunk
- PayrollSummary/chart dependencies
- lottie/vendor debt

### Definition of Done
- tests + TypeScript + production build pass
- no new duplicated static/dynamic import warning in touched area
- measurable bundle/chunk result is recorded

---

## SKILL-04 — Firebase Security & Emulator Verification

### Use for
- Firestore rules
- Storage rules
- ownership/role changes
- new collection paths
- status transitions affecting authorization
- data migrations with security impact

### Required method
1. Never infer production safety from static rule reading alone.
2. Reproduce allowed/denied scenarios in isolated Emulator tests.
3. Include at least owner, wrong-owner, admin and unauthenticated cases where relevant.
4. Preserve existing immutable audit/history records.
5. Do not deploy production rules as part of an unverified refactor.

### Definition of Done
- Emulator assertions pass
- wrong-owner and unauthenticated cases are explicitly tested
- CI gate runs automatically for changed rule/test paths
- production deployment remains a separately recorded step

---

## SKILL-05 — Offline/PWA & Recovery Design

### Use for
- field use on unreliable mobile networks
- PWA install/update/recovery
- pending writes
- resuming interrupted workflows

### Required method
1. Classify data/action as:
   - safe read cache
   - safe queued write
   - confirmation-required write
   - must-be-online write
2. Do not blindly queue financial/approval/security-sensitive actions.
3. Expose offline/pending/synced/failed state to the user.
4. Design conflict behavior before enabling persistent local writes.
5. Treat trusted-device concerns explicitly when persistent web cache may contain sensitive data.

### Initial Nipponfarm policy
- begin offline queue with non-financial/non-approval workflows
- Receipt/Payroll/Sale finalization remain confirmation-sensitive
- use explicit retry rather than hidden duplicate writes

### Definition of Done
- install/update/recovery states are visible
- interrupted workflow has a deterministic resume path
- duplicate prevention is verified
- offline behavior is device-tested, not only unit-tested

---

## SKILL-06 — Accessibility & Readability

### Use for
- typography
- forms
- navigation
- alerts/status
- color hierarchy
- mobile action controls

### Required checks
- sufficient contrast for meaningful text/state
- touch targets large enough for repeated mobile use
- labels do not rely on placeholder text alone
- color is not the only signal for status/error
- focus/keyboard semantics are preserved for interactive controls
- important numbers and warnings have clear hierarchy

### Definition of Done
- primary workflows remain understandable without color alone
- controls have accessible names/roles
- validation messages identify the actual problem and next action

---

## SKILL-07 — User-level Acceptance & E2E Testing

### Use for
- closing a workflow after refactor
- navigation consolidation
- critical production-readiness gates

### Testing principle
Test what the user sees and does. Avoid coupling acceptance tests to CSS classes, internal function names or implementation details.

### Core acceptance journeys
1. **Sow** — select sow → record lifecycle action → see correct next state/task.
2. **Receipt → Expense** — scan/upload → AI/review → confirm → save → history → retry without duplicate.
3. **Pig Sale** — enter sale → confirm → save → history → retry without duplicate.
4. **Payroll & Advance** — submit → admin decision → owner visibility → immutable audit.
5. **Maintenance** — report → attach media → receive/work → resolve → history.

### Definition of Done
- tests are isolated
- selectors prefer user-visible roles/labels
- success + failure/retry path are covered for critical flows
- test evidence is linked in the task/PR

---

## SKILL-08 — Safe Dependency & Build Remediation

### Use for
- dependency advisories
- deprecated packages
- build-tool upgrades
- major-package replacement planning

### Required method
1. Inventory first.
2. Fix critical/high with compatibility-first upgrades.
3. Avoid `npm audit fix --force` without explicit review.
4. Re-run tests, TypeScript, build and affected smoke tests.
5. Use overrides only when the transitive patched version is compatible and verified.
6. Record packages intentionally deferred and why.

### Current deferred debt
- `adm-zip`: major-change remediation requires separate review
- `xlsx`: npm audit reported no direct fix; evaluate replacement/migration separately

---

# Skill activation by consolidation phase

| Phase | Primary skills |
|---|---|
| Dashboard / Today View | SKILL-01, SKILL-02, SKILL-06, SKILL-07 |
| Navigation Simplification | SKILL-01, SKILL-02, SKILL-06, SKILL-07 |
| Receipt UX Consolidation | SKILL-01, SKILL-02, SKILL-05, SKILL-07 |
| Maintenance Workflow | SKILL-01, SKILL-02, SKILL-04, SKILL-05, SKILL-07 |
| Large Page Refactor | SKILL-03, SKILL-07 |
| PWA / Offline | SKILL-05, SKILL-07 |
| Security/rules changes | SKILL-04, SKILL-07 |
| Dependency work | SKILL-08 |

# Non-goals

- no new autonomous agent/team solely for these skills
- no broad redesign before workflow mapping
- no major feature expansion during consolidation
- no production-rule deployment without isolated evidence
- no hidden offline queue for financial/approval writes
- no performance claim without before/after build evidence

# Recommended starting sequence

1. Dashboard / Today View — workflow map and information hierarchy.
2. Navigation simplification — five primary destinations.
3. Receipt → Expense UX state model.
4. Maintenance end-to-end workflow + owner-scoped media path.
5. Large-page refactor/performance.
6. PWA/offline recovery.
7. Full user-level acceptance pass across five core workflows.
