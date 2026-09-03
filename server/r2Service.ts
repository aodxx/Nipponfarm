import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getFirebaseRuntimeConfig } from "./firebaseConfig.js";

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

// Initialize Firestore using deployment-neutral environment variables.
const firebaseConfig = getFirebaseRuntimeConfig();
const app = getApps().length === 0 ? initializeApp(firebaseConfig, "R2App") : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Validates if the user is authorized to perform R2 video actions.
 * Only ACTIVE users (ADMIN or STAFF) are allowed, while PENDING or RESIGNED are blocked.
 */
export async function verifyUserIsActive(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) {
      return false;
    }
    const userData = userSnap.data();
    const email = (userData.email || "").toLowerCase();
    
    // Super admin fallbacks
    if (email === "panaod3826@gmail.com" || email === "pantipa3826@gmail.com") {
      return true;
    }
    
    // Check for active role (ADMIN or STAFF)
    return userData.role === "ADMIN" || userData.role === "STAFF";
  } catch (error) {
    console.error("[R2Service] Error verifying user status:", error);
    return false;
  }
}

let s3Client: S3Client | null = null;


function getS3Client(): S3Client {
  if (!R2_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
    throw new Error("Cloudflare R2 is not configured. Set all CLOUDFLARE_R2_* environment variables.");
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

/**
 * Generates a presigned URL for uploading a video file to Cloudflare R2
 * Default expiry: 1 hour (3600 seconds)
 */
export async function getUploadPresignedUrl(key: string, contentType: string): Promise<{ url: string; key: string }> {
  try {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    
    // Generate the presigned PUT URL
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    return { url, key };
  } catch (error: any) {
    console.error("[R2Service] Error generating upload presigned URL:", error);
    throw new Error(`Failed to generate upload presigned URL: ${error.message}`);
  }
}

/**
 * Generates a presigned URL for retrieving/playing a private video file from Cloudflare R2
 * Default expiry: 24 hours (86400 seconds) to ensure video playability over sessions
 */
export async function getDownloadPresignedUrl(key: string): Promise<string> {
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    
    // Generate the presigned GET URL
    const url = await getSignedUrl(client, command, { expiresIn: 86400 });
    return url;
  } catch (error: any) {
    console.error("[R2Service] Error generating download presigned URL:", error);
    throw new Error(`Failed to generate download presigned URL: ${error.message}`);
  }
}

/**
 * Helper to extract R2 Object Key from a full R2 URL (in case we need to re-sign it)
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // If the URL contains the bucket name as part of the path or subdomain
    if (parsed.hostname.includes("cloudflarestorage.com") || parsed.hostname.includes("r2.dev")) {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      // For r2.cloudflarestorage.com/bucket-name/key or endpoint/bucket-name/key
      if (pathParts[0] === R2_BUCKET_NAME) {
        return pathParts.slice(1).join("/");
      }
      return pathParts.join("/");
    }
    return null;
  } catch {
    return null;
  }
}
