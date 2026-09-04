# Nipponfarm UI/UX Design Direction

Status: Approved baseline for Core Workflow & UX Consolidation

## 1. Product feeling

Nipponfarm should feel like a modern mobile operations app: clean, calm, fast to understand, and easy to use repeatedly during real farm work.

Target visual mix:
- 80% clean premium soft UI
- 15% modern contextual interaction / floating actions
- 5% bold accent treatment for critical calls-to-action and status

This direction is mandatory for new consolidation work unless a workflow has a documented usability reason to diverge.

## 2. Core principles

1. One screen, one primary job.
2. Important information must be visible at a glance.
3. Primary actions must be thumb-friendly and obvious.
4. Secondary functions move to a second layer instead of competing on the main screen.
5. Animation must communicate state, hierarchy, or action feedback; decoration alone is not enough.
6. Existing working flows and routes must be preserved during consolidation unless a tested replacement is ready.
7. Mobile-first is the default.

## 3. Visual language

### Base
- Soft white / light neutral surfaces
- Deep navy for trust and structure
- Teal / cyan for product identity and modern farm-tech feel
- Warm coral/orange only for prominent CTA or alert emphasis
- Rounded cards and controls
- Moderate soft shadows
- Generous spacing
- Strong typographic hierarchy

### Avoid
- Too many accent colors on one screen
- Dense dashboard grids
- More than one dominant CTA in the same section
- Decorative animation that slows interaction
- Tiny type or low-contrast secondary text
- Heavy dark mode styling as the default visual identity
- Nested menus that require users to remember where a feature lives

## 4. Navigation model

Primary navigation remains five categories:
1. หน้าหลัก
2. ฟาร์ม
3. การเงิน
4. ทีมงาน
5. เพิ่มเติม

Rules:
- Bottom navigation is reserved for these five categories only.
- Detailed tools and secondary destinations stay within category pages, sidebar/profile hub, or contextual actions.
- Users should reach a frequent task in no more than two deliberate taps from the main area whenever practical.
- Current routes remain compatible during migration.

## 5. Dashboard direction

The home screen is a Today Dashboard, not a feature catalog.

Priority order:
1. What needs attention today
2. Overdue / urgent work
3. Sow / maintenance / finance alerts
4. Quick actions
5. Short operational summary
6. Historical analytics and charts only after immediate work

Large analytical widgets must not push current tasks below the fold on a typical mobile screen.

## 6. Contextual actions

Use floating or dock-style actions selectively for high-frequency tasks such as:
- Scan receipt
- Add sow
- Record pig sale
- Report maintenance

Rules:
- Keep the number of simultaneous contextual actions small.
- The central or visually strongest action must be the most likely next action.
- Expanded actions need clear labels, not icon-only guessing.
- Haptic/animation feedback should be brief and optional/fail-safe.

## 7. Forms and workflows

Every important workflow should be staged into clear states rather than one overloaded screen.

Example: Receipt → Expense
1. Capture / upload
2. AI processing
3. Review extracted data
4. Confirm / edit
5. Save
6. Success / next action
7. History / traceability

Requirements:
- Current step is always obvious.
- Back/retry behavior must not duplicate records.
- Loading, retry, empty, success, and error states are first-class UI states.
- Destructive or high-impact actions need confirmation.
- Financial data must be reviewed before final write when AI is involved.

## 8. Typography and readability

- Body text must remain comfortably readable on low-to-mid range Android phones.
- Important values use stronger weight and size than labels.
- Use high contrast for outdoor readability.
- Avoid long all-caps labels.
- Prefer concise Thai labels over technical terminology.
- Touch targets should be comfortably tappable with one hand.

## 9. Motion and interaction

Allowed motion:
- Screen/section transitions
- Bottom dock active-state movement
- Expand/collapse
- Loading progress
- Success/error confirmation
- Contextual action expansion

Motion rules:
- Short duration
- Never block user input unnecessarily
- Respect reduced-motion preferences where practical
- No perpetual decorative motion on core work screens

## 10. Component behavior standards

Cards:
- One purpose per card
- Clear title and value/action relationship
- Do not place more than 2–3 competing actions inside a card

Buttons:
- Primary: filled, high emphasis
- Secondary: neutral or outlined
- Destructive: explicit danger treatment
- Disabled/loading states must be visually clear

Status:
- Use text + color, not color alone
- Keep status wording consistent across screens

Feedback:
- Immediate local feedback after tap
- Show progress for network or AI operations
- Preserve user-entered data on recoverable errors

## 11. Accessibility baseline

- Sufficient text/background contrast
- Visible focus states where keyboard navigation applies
- Labels for icon-only controls
- No critical meaning communicated by color alone
- Respect safe-area insets
- Avoid touch targets that are too small or too close together

## 12. Performance baseline

Modern appearance must not come at the expense of speed.

Rules:
- Continue route-level lazy loading
- Keep animation libraries usage deliberate
- Avoid unnecessary image-heavy hero sections on operational screens
- Optimize large images before shipping
- New UI components should not pull large dependencies without measurable benefit

## 13. Acceptance criteria for consolidated screens

A consolidated screen is ready only when:
- Primary user goal is obvious within a few seconds
- Main CTA is immediately identifiable
- No unnecessary duplicate navigation exists
- Empty/loading/error/success states are handled
- Mobile layout works without horizontal overflow
- Existing data remains compatible
- Relevant tests/build pass
- No new security or permission regression is introduced

## 14. Current application order

Apply this design direction in this sequence:
1. Today Dashboard — started
2. Five-category Navigation — started
3. Receipt → Expense UX Consolidation
4. Maintenance Workflow Consolidation
5. Sow Details / Sow Lifecycle UX
6. User Management simplification
7. ScanAI / Bill History simplification
8. PWA / offline recovery states

## 15. Decision rule

When choosing between a visually impressive treatment and a simpler treatment, choose the simpler treatment unless the richer interaction clearly improves task speed, comprehension, or error prevention.
