# Gemini Readiness and Error Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ทำให้ Gemini REST endpoints ใช้ readiness helper และ error codes กลางเมื่อ provider ไม่พร้อมหรือล้มเหลว โดยไม่เปิดเผยรายละเอียดภายในให้ client.

**Architecture:** เพิ่ม policy module ใน `server/aiProvider.ts` สำหรับ readiness และ safe error classification. เพิ่ม response helper ใน `server/aiErrors.ts` เพื่อคืน `{ error, code }` รูปแบบเดียวกัน. Route handlers ใช้ helper เดิมโดยไม่เปลี่ยน data model หรือ deployment architecture. เพิ่ม unit tests ที่ครอบคลุม missing key, unsupported provider, quota, invalid key, unavailable และ malformed response.

**Tech Stack:** TypeScript, Express, Node test runner ผ่าน `tsx`, Vite build.

**Spec:** `docs/GEMINI_ERROR_FALLBACK_AUDIT.md` sections “Error-handling risks” and “Recommended implementation order”.

## Global Constraints

- ห้ามส่ง API key, SDK raw error หรือ `details` กลับไปยัง browser.
- เมื่อ AI ยังไม่ตั้งค่า ใช้ HTTP 503 และ code `AI_NOT_CONFIGURED`.
- ห้ามแก้ Firebase Rules, database, deployment config หรือ environment secret.
- ต้องคง Firebase authentication ของทุก AI route.
- ทุก code change ต้องผ่าน `npm run test:auth`, `npm run lint` และ `npm run build`.

---

### Task 1: เพิ่ม shared readiness และ error policy

**Files:**
- Modify: `server/aiProvider.ts`
- Create: `server/aiErrors.ts`
- Create: `server/aiErrors.test.ts`
- Modify: `package.json` only if a test script is needed

**Interfaces:**
- `getAiReadiness(): { ready: boolean; code?: "AI_NOT_CONFIGURED" | "AI_PROVIDER_UNSUPPORTED" }`
- `aiErrorResponse(error: unknown): { status: number; code: string; message: string }`
- `sendAiError(res, error): void`

- [ ] เขียน tests สำหรับ readiness false และ error classification โดยไม่ใช้ network หรือ secret จริง.
- [ ] ทำให้ readiness ใช้ key precedence เดิม `GEMINI_API_KEY` แล้ว fallback `CENTRAL_GEMINI_API_KEY`.
- [ ] กำหนด safe messages สำหรับ missing key, invalid key, quota, unavailable, malformed response และ generic provider failure.
- [ ] ทำให้ response helper log raw error เฉพาะ server log และส่งกลับเฉพาะ safe code/message.
- [ ] รัน `npm run test:auth` และ test ใหม่; ต้องผ่าน.

### Task 2: ใช้ helper กับ Gemini REST routes

**Files:**
- Modify: `appServer.ts`
- Modify: `api/health.ts`

**Interfaces:**
- Receipt, Swine AI และ TTS routes เรียก readiness ก่อนสร้าง client.
- ทุก Gemini failure response ใช้ `sendAiError` และไม่มี `details` field.
- Health ยังตอบ process health แต่มี `aiReady` และ `aiStatus` ที่ชัดเจน.

- [ ] เพิ่ม readiness gate ให้ Receipt, Swine AI และ TTS.
- [ ] เปลี่ยน missing key จาก HTTP 500 เป็น HTTP 503 + `AI_NOT_CONFIGURED`.
- [ ] เปลี่ยน route catches ให้ใช้ safe error response.
- [ ] รักษา error messages ภาษาไทยและ client success payload เดิม.
- [ ] เพิ่ม HTTP smoke tests ที่ไม่มี tokenและตรวจว่า auth ยังคงตอบ 401.

### Task 3: ปรับ client error handling และเอกสาร

**Files:**
- Modify: `src/services/aiService.ts`
- Modify: `src/pages/ScanReceipt.tsx`
- Modify: `src/pages/ScanAI.tsx`
- Create: `docs/GEMINI_READINESS_ERROR_CODES.md`

- [ ] ให้ client อ่าน `code` ได้โดยยังแสดงข้อความ safe จาก server.
- [ ] แยก `AI_NOT_CONFIGURED` เป็นข้อความตั้งค่า integration ไม่ใช่ข้อความ network failure.
- [ ] ไม่สร้าง fake AI result เมื่อ provider ไม่พร้อม.
- [ ] บันทึก error code contract และ rollout notes.
- [ ] รัน `npm run test:auth`, `npm run lint`, `npm run build`, `git diff --check`.
- [ ] ตรวจ diff ไม่ให้มี secret และ commit เป็น atomic PR.
