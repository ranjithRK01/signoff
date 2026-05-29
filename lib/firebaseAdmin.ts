import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { Bucket } from "@google-cloud/storage";
import type { ServiceAccount } from "firebase-admin/app";

function loadServiceAccount(): ServiceAccount | null {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountPath) {
    const fullPath = resolve(process.cwd(), serviceAccountPath);
    if (!existsSync(fullPath)) {
      console.error(`Firebase service account not found at: ${fullPath}`);
      return null;
    }
    return JSON.parse(readFileSync(fullPath, "utf8")) as ServiceAccount;
  }

  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson) as ServiceAccount;
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

function resolveStorageBucket(serviceAccount: ServiceAccount | null): string {
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    return process.env.FIREBASE_STORAGE_BUCKET;
  }
  const projectId = serviceAccount?.projectId || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_STORAGE_BUCKET or project_id is required.");
  }
  return `${projectId}.firebasestorage.app`;
}

let bucketPromise: Promise<Bucket> | null = null;

/** Lazy-load Firebase Admin so review pages never pull in OpenTelemetry vendor chunks. */
export async function getAdminBucket(): Promise<Bucket> {
  if (!bucketPromise) {
    bucketPromise = (async () => {
      const { initializeApp, cert, getApps } = await import("firebase-admin/app");
      const { getStorage } = await import("firebase-admin/storage");

      const serviceAccount = loadServiceAccount();
      if (!serviceAccount) {
        throw new Error(
          "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_* env vars."
        );
      }

      if (!getApps().length) {
        initializeApp({
          credential: cert(serviceAccount),
          storageBucket: resolveStorageBucket(serviceAccount),
        });
      }

      return getStorage().bucket();
    })();
  }
  return bucketPromise;
}
