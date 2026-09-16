# Dependency Remediation Inventory

วันที่ตรวจ: **17 กันยายน 2026**
Branch: `audit/dependency-inventory`
ขอบเขต: `package.json`, `package-lock.json`, dependency tree ที่ติดตั้งจริง, `npm audit` และ `npm outdated`

## Executive summary

Repository มี vulnerability advisories **25 รายการใน full dependency tree** ได้แก่ 14 high, 7 moderate และ 4 low. เมื่อใช้ `npm audit --omit=dev` ซึ่งใกล้เคียงกับ runtime production มากกว่า ยังเหลือ **24 รายการ** ได้แก่ 13 high, 7 moderate และ 4 low.

รายการที่ต้องจัดการก่อนมีสามกลุ่ม. กลุ่มแรกคือ `xlsx` ซึ่งเป็น direct dependency ระดับ high และ npm audit ระบุว่าไม่มี safe automatic fix. กลุ่มที่สองคือ `nodemailer` ซึ่งเป็น direct dependency ระดับ high และมี patch อยู่ในสาย 9.x ที่ต้องทดสอบอีเมลก่อน deploy. กลุ่มที่สามคือ transitive packages ที่มาจาก Firebase, Vite/PWA toolchain, `shadcn` และ optional MCP dependency tree. กลุ่มเหล่านี้ควรแก้ผ่าน parent package หรือ `overrides` ที่มีหลักฐาน compatibility ไม่ควรแก้ด้วย `npm audit fix --force`.

การตรวจนี้เป็น **inventory only**. ยังไม่มีการแก้ `package.json`, `package-lock.json`, source code หรือ production configuration.

## Evidence and commands

คำสั่งที่ใช้:

```bash
npm ls --depth=0
npm audit --json
npm audit --omit=dev --json
npm outdated --json
npm explain <package>
```

Runtime baseline ที่ตรวจคือ Node `v22.13.0` และ npm `10.9.2`. Lockfile ที่ใช้คือ `package-lock.json`.

## Vulnerability summary

| Severity | Full tree | Production-oriented tree | Interpretation |
| --- | ---: | ---: | --- |
| Critical | 0 | 0 | ไม่พบ critical advisory ใน snapshot นี้ |
| High | 14 | 13 | ต้องจัดลำดับแก้ก่อน โดยเฉพาะ direct runtime packages |
| Moderate | 7 | 7 | แก้ตาม root dependency และ exposure |
| Low | 4 | 4 | รวมใน compatibility batches หลัง high findings |
| Total | 25 | 24 | จำนวน advisory ไม่เท่ากับจำนวน package เพราะ package เดียวมีหลาย advisory ได้ |

## Direct dependencies requiring priority review

| Package | Current | Wanted / patched signal | Severity | Direct or transitive | Fix status | Compatibility risk |
| --- | --- | --- | --- | --- | --- | --- |
| `xlsx` | `0.18.5` | npm audit range is `<0.19.3` and `<0.20.2`; npm reports no fix | High | Direct runtime | **No safe automatic fix** | **High**. Evaluate replacing the library or isolate/validate workbook input before changing major API |
| `nodemailer` | `9.0.3` | `9.1.1` is the npm `wanted` version; latest is `10.0.10` | High | Direct runtime | Patch available in current major line | **Medium**. Upgrade to 9.1.1 first, then run email template, SMTP and recipient-validation tests |
| `adm-zip` | `0.5.18` | `0.6.1` | High plus moderate | Direct dev dependency | Fix is marked SemVer major | **Medium**. Used by repository tooling/tests; upgrade separately from runtime packages |
| `esbuild` | `0.28.0` | `0.28.1+`; npm wanted `0.28.2` | Low | Direct build dependency and nested copies | Patch available | **Low to medium**. Run Vite build and standalone server build |

`xlsx` must not be treated as resolved by an automatic audit command. The current package is below the advisory ranges, and npm reports no patch. A separate design decision is required because a major upgrade or replacement may change parsing behavior and workbook output.

## High-severity transitive findings

| Package | Current evidence | Root path | Fix signal | Risk and recommended parent-first action |
| --- | --- | --- | --- | --- |
| `@babel/plugin-transform-modules-systemjs` | `7.29.0` range is affected | `vite-plugin-pwa` → `workbox-build` → Babel toolchain | Fix available | Build-time only. Upgrade PWA/toolchain in a dedicated build batch |
| `@grpc/grpc-js` | `1.9.15` is affected | `firebase` → `@firebase/firestore` | Fix available | Runtime dependency path. Upgrade Firebase within 12.x first and run Firestore emulator tests |
| `brace-expansion` | `5.0.5` and nested `2.1.0` are affected | `vite-plugin-pwa`/`shadcn` → `glob`/`minimatch` | Fix available | Tooling tree. Parent upgrades should remove both versions; verify build and shadcn commands |
| `browserslist` | `4.28.2` is affected | `autoprefixer`, `core-js-compat`, PWA/Babel | Fix available | Build-time only. Update compatible PostCSS/Browserslist parents together |
| `fast-uri` | `3.1.0` is affected | `shadcn` and `@google/genai` optional MCP peer → AJV | Fix available | Do not force a top-level override before testing SDK initialization; first assess whether MCP packages are needed in production |
| `hono` | `4.12.14` is affected | `shadcn`/`@google/genai` optional MCP SDK | Fix available | Likely tooling/optional path. Prefer removing unnecessary production inclusion or upgrading parent package |
| `ip-address` | `10.1.0` is affected | `@modelcontextprotocol/sdk` → `express-rate-limit` | Fix available | Same optional MCP tree; parent-first remediation is preferable |
| `js-yaml` | `4.1.1` is affected | `shadcn` → `cosmiconfig` | Fix available | Tooling only. Update `shadcn` or its config dependency in isolation |
| `nanoid` | `3.3.11` is affected | `vite`/`autoprefixer` → `postcss` | Fix available | Build-time path. Update PostCSS/Vite-compatible parents and rebuild |
| `postcss` | `8.5.9` is affected | `autoprefixer`, `shadcn`, `vite` | Fix available | Build-time path. Treat with `nanoid` and `browserslist` as one toolchain batch |
| `serialize-javascript` | `6.0.2` is affected | `vite-plugin-pwa` → `workbox-build` → `@rollup/plugin-terser` | Fix available | Build-time path. Update PWA/Workbox parent; do not add a blind override without build evidence |

The full audit also reports `@babel/core`, `@hono/node-server`, `@rollup/plugin-terser`, `body-parser`, `dompurify`, `express-rate-limit`, `postcss-selector-parser`, `qs` and `workbox-build`. They are moderate or low in the current advisory snapshot, or are transitively covered by the parent/toolchain groups above.

## Outdated packages without a current vulnerability finding

`npm outdated` reports **35 outdated direct packages**. Outdated does not mean vulnerable, and these must not all be upgraded in one change. The safest first candidates are patch/minor updates that stay within the declared major line.

| Package group | Current → wanted | Recommendation |
| --- | --- | --- |
| AWS SDK | `3.1085.0 → 3.1134.0` for client and presigner | Batch together; run R2 authorization/presign tests |
| Gemini SDK | `1.49.0 → 1.52.0`; latest `2.22.0` | Upgrade only to `1.52.0` first; defer major 2 until AI success-path tests are available |
| Firebase | `12.12.0 → 12.19.0` | High priority because it may resolve `@grpc/grpc-js`; run Firebase emulator and auth tests |
| Express | `4.22.1 → 4.22.3`; latest `5.2.1` | Take patch only; defer Express 5 because middleware behavior can change |
| React and React DOM | `19.2.5 → 19.3.0` | Low security priority; upgrade together with UI regression checks |
| Tailwind toolchain | `tailwindcss`/`@tailwindcss/vite` `4.2.2 → 4.3.3` | Batch with PostCSS/Vite build verification |
| `react-router-dom` | `7.18.3 → 7.18.4` | Low-risk patch candidate; run route smoke tests |
| `recharts` | `3.8.1 → 3.10.1` | Defer until dashboard visual regression coverage exists |
| `motion` | `12.38.0 → 12.43.0`; latest `13.4.0` | Use wanted 12.x only; defer major 13 |
| `lottie-react` | `2.4.1 → 2.4.2`; latest `3.1.2` | Use patch only; monitor existing `lottie-web` warning |
| `typescript` | `5.8.3`; latest `7.0.2` | Do not jump to 7 in remediation; current declared range is already satisfied |
| `vite` | `6.4.3`; latest `8.3.0` | Defer major 8; update only when plugin compatibility is proven |
| `nodemailer` | `9.0.3 → 9.1.1`; latest `10.0.10` | Security priority; use 9.1.1 first |
| `ws` | `8.21.0 → 8.21.3` | Patch candidate, but Live AI transport remains blocked on Vercel |

Other wanted minor/patch candidates include `@base-ui/react`, Geist, DotLottie, Node types, Nodemailer types, Autoprefixer, date-fns, dotenv, esbuild, jszip, shadcn, tailwind-merge, tsx and `vite-plugin-pwa`. They should be handled in focused batches rather than one mass upgrade.

## Recommended remediation order

### Batch 1 — direct production security fixes

Upgrade `nodemailer` to the newest safe 9.x version and run SMTP unit tests, recipient validation tests, `npm run lint`, `npm run build` and standalone smoke. In parallel, add an explicit decision record for `xlsx`: either replace it, upgrade with a compatibility proof, or isolate its input path with strict file type, size and parser controls. Do not mark `xlsx` resolved until npm audit no longer reports the direct advisory or an approved compensating-control decision exists.

### Batch 2 — Firebase runtime chain

Upgrade Firebase within the existing major line to the current wanted version. Re-run authentication, Firestore owner-boundary, payroll, receipt idempotency and emulator tests. Confirm that the `@grpc/grpc-js` advisory disappears without changing Firebase project, rules or data.

### Batch 3 — PWA and build toolchain

Upgrade `vite-plugin-pwa`, Workbox-related packages and compatible PostCSS/Babel parents. Validate PWA generation, `npm run build`, route loading and service-worker output. This batch should address `@babel`, `brace-expansion`, `browserslist`, `nanoid`, `postcss`, `serialize-javascript` and related moderate findings.

### Batch 4 — optional MCP/tooling dependency reduction

Review why `shadcn` and the optional MCP peer of `@google/genai` bring `@modelcontextprotocol/sdk`, Hono, `fast-uri`, `ip-address` and related packages into the installed tree. If these packages are not needed at runtime, move tooling dependencies out of production dependencies where architecture permits. Otherwise upgrade the parent package and test AI client initialization plus build output.

### Batch 5 — safe patch refresh

Apply remaining patch/minor updates one focused group at a time. Every group requires lockfile review, core regression tests, lint, build and standalone smoke. Major upgrades such as TypeScript 7, Vite 8, Express 5, Motion 13, Nodemailer 10 and `@google/genai` 2 require separate plans and explicit compatibility evidence.

## Definition of done for the inventory phase

The inventory phase is complete when the direct/transitive ownership and severity records above are reviewed, `xlsx` has a documented remediation decision, and remediation batches are split into PR-sized changes. No package upgrade is claimed as complete by this report.

## References

[1]: https://docs.npmjs.com/cli/v10/commands/npm-audit "npm audit command documentation"

[2]: https://docs.npmjs.com/cli/v10/commands/npm-outdated "npm outdated command documentation"

[3]: https://docs.npmjs.com/cli/v10/commands/npm-explain "npm explain command documentation"

[4]: https://github.com/advisories/GHSA-4r6h-8v6p-xvw6 "Prototype Pollution in SheetJS xlsx"

[5]: https://github.com/advisories/GHSA-5pgg-2g8v-p4x9 "SheetJS Regular Expression Denial of Service"

[6]: https://github.com/advisories/GHSA-8m3c-c648-2xjj "Nodemailer resolveContent security advisory"
