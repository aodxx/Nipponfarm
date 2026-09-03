import { auth } from "./firebase";

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("กรุณาลงชื่อเข้าใช้ก่อนใช้งานฟังก์ชันนี้");
  }

  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${idToken}`);

  return fetch(input, { ...init, headers });
}
