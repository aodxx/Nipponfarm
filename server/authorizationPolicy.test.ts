import assert from "node:assert/strict";
import test from "node:test";
import {
  isActiveProfile,
  isAdminProfile,
  isSameUser,
  isSafeContentType,
  isSafeImagePayload,
  isSafeR2Key,
} from "./authorizationPolicy.js";

test("admin role and approved admin emails are administrators", () => {
  assert.equal(isAdminProfile({ role: "ADMIN" }), true);
  assert.equal(isAdminProfile({ email: "PANAOD3826@GMAIL.COM" }), true);
  assert.equal(isAdminProfile({ email: "unknown@example.com", role: "STAFF" }), false);
});

test("only admin and staff profiles are active", () => {
  assert.equal(isActiveProfile({ role: "ADMIN" }), true);
  assert.equal(isActiveProfile({ role: "STAFF" }), true);
  assert.equal(isActiveProfile({ role: "PENDING" }), false);
  assert.equal(isActiveProfile({ role: "RESIGNED" }), false);
  assert.equal(isActiveProfile(null), false);
});

test("ownership requires an exact authenticated UID match", () => {
  assert.equal(isSameUser("user-1", "user-1"), true);
  assert.equal(isSameUser("user-1", "user-2"), false);
  assert.equal(isSameUser(undefined, "user-1"), false);
});

test("R2 keys are restricted to the videos namespace and safe characters", () => {
  assert.equal(isSafeR2Key("videos/sales/draft-1.webm"), true);
  assert.equal(isSafeR2Key("videos/sales/../../private.webm"), false);
  assert.equal(isSafeR2Key("other/file.webm"), false);
  assert.equal(isSafeR2Key("videos/sales/file.exe"), true);
});

test("R2 content types and image payloads are bounded", () => {
  assert.equal(isSafeContentType("video/webm"), true);
  assert.equal(isSafeContentType("video/mp4"), true);
  assert.equal(isSafeContentType("image/png"), false);
  assert.equal(isSafeImagePayload("data:image/webp;base64,abc"), true);
  assert.equal(isSafeImagePayload("x".repeat(15 * 1024 * 1024 + 1)), false);
});
