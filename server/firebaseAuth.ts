import { createVerify } from "node:crypto";
import type { RequestHandler } from "express";

const FIREBASE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

type FirebaseTokenHeader = {
  alg?: string;
  kid?: string;
};

export type VerifiedFirebaseToken = {
  aud: string;
  auth_time: number;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  user_id?: string;
  email?: string;
};

let certificateCache:
  | { certificates: Record<string, string>; expiresAt: number }
  | undefined;

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

function cacheLifetime(response: Response): number {
  const cacheControl = response.headers.get("cache-control") || "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
  return Math.max(60, maxAge) * 1000;
}

async function getFirebaseCertificates(): Promise<Record<string, string>> {
  if (certificateCache && certificateCache.expiresAt > Date.now()) {
    return certificateCache.certificates;
  }

  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Unable to load Firebase signing certificates (${response.status})`);
  }

  const certificates = (await response.json()) as Record<string, string>;
  certificateCache = {
    certificates,
    expiresAt: Date.now() + cacheLifetime(response),
  };
  return certificates;
}

export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
): Promise<VerifiedFirebaseToken> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed Firebase ID token");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeSegment<FirebaseTokenHeader>(encodedHeader);
  const payload = decodeSegment<VerifiedFirebaseToken>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported Firebase ID token header");
  }

  const certificates = await getFirebaseCertificates();
  const certificate = certificates[header.kid];
  if (!certificate) {
    certificateCache = undefined;
    throw new Error("Unknown Firebase signing key");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  if (!verifier.verify(certificate, Buffer.from(encodedSignature, "base64url"))) {
    throw new Error("Invalid Firebase ID token signature");
  }

  const now = Math.floor(Date.now() / 1000);
  const clockSkewSeconds = 300;
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Firebase ID token subject is missing");
  }
  if (payload.aud !== projectId) {
    throw new Error("Firebase ID token audience does not match this project");
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Firebase ID token issuer does not match this project");
  }
  if (!payload.exp || payload.exp <= now) {
    throw new Error("Firebase ID token has expired");
  }
  if (!payload.iat || payload.iat > now + clockSkewSeconds) {
    throw new Error("Firebase ID token issued-at time is invalid");
  }
  if (!payload.auth_time || payload.auth_time > now + clockSkewSeconds) {
    throw new Error("Firebase ID token authentication time is invalid");
  }

  return payload;
}

export const requireFirebaseAuth: RequestHandler = async (req, res, next) => {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    console.error("[FirebaseAuth] VITE_FIREBASE_PROJECT_ID is not configured");
    return res.status(503).json({ error: "Authentication service is not configured" });
  }

  try {
    const token = await verifyFirebaseIdToken(match[1], projectId);
    res.locals.firebaseUser = { uid: token.sub, email: token.email };
    return next();
  } catch (error) {
    console.warn("[FirebaseAuth] Token verification failed:", (error as Error).message);
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }
};
