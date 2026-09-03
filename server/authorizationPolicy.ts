export type AuthorizationProfile = {
  uid?: string;
  role?: string;
  email?: string | null;
};

export const ADMIN_EMAILS = new Set([
  "panaod3826@gmail.com",
  "pantipa3826@gmail.com",
]);

function normalizedEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() || "";
}

export function isAdminProfile(profile: AuthorizationProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.role === "ADMIN" || ADMIN_EMAILS.has(normalizedEmail(profile.email));
}

export function isActiveProfile(profile: AuthorizationProfile | null | undefined): boolean {
  if (!profile) return false;
  return isAdminProfile(profile) || profile.role === "STAFF";
}

export function isSameUser(profileUid: string | undefined, authenticatedUid: string | undefined): boolean {
  return Boolean(profileUid && authenticatedUid && profileUid === authenticatedUid);
}

export function isSafeR2Key(key: string): boolean {
  return /^videos\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(key) && key.length <= 512;
}

export function isSafeContentType(contentType: string): boolean {
  return /^video\/(webm|mp4|quicktime)$/i.test(contentType);
}

export function isSafeImagePayload(image: string): boolean {
  return image.length > 0 && image.length <= 15 * 1024 * 1024;
}
