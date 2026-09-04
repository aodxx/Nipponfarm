import assert from "node:assert/strict";
import test from "node:test";
import { classifyAiError } from "./aiErrors.js";
import { getAiReadiness } from "./aiProvider.js";

test("readiness reports missing key without exposing a secret", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalLegacyKey = process.env.CENTRAL_GEMINI_API_KEY;
  const originalProvider = process.env.AI_PROVIDER;
  delete process.env.GEMINI_API_KEY;
  delete process.env.CENTRAL_GEMINI_API_KEY;
  delete process.env.AI_PROVIDER;

  try {
    assert.deepEqual(getAiReadiness(), { ready: false, code: "AI_NOT_CONFIGURED" });
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalLegacyKey === undefined) delete process.env.CENTRAL_GEMINI_API_KEY;
    else process.env.CENTRAL_GEMINI_API_KEY = originalLegacyKey;
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
  }
});

test("readiness rejects an unsupported provider", () => {
  const originalProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "unsupported";
  try {
    assert.deepEqual(getAiReadiness(), { ready: false, code: "AI_PROVIDER_UNSUPPORTED" });
  } finally {
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
  }
});

test("classifies configuration and provider failures into safe codes", () => {
  assert.equal(classifyAiError(new Error("API key missing")).code, "AI_NOT_CONFIGURED");
  assert.equal(classifyAiError(new Error("API_KEY_INVALID")).code, "AI_INVALID_KEY");
  assert.equal(classifyAiError(new Error("429 RESOURCE_EXHAUSTED")).code, "AI_QUOTA_EXCEEDED");
  assert.equal(classifyAiError(new Error("503 UNAVAILABLE")).code, "AI_PROVIDER_UNAVAILABLE");
  assert.equal(classifyAiError(new Error("JSON Parse Error")).code, "AI_INVALID_RESPONSE");
});

test("error messages never include raw provider details", () => {
  const result = classifyAiError(new Error("API key invalid: super-secret-value"));
  assert.equal(result.code, "AI_INVALID_KEY");
  assert.equal(result.message.includes("super-secret-value"), false);
});
