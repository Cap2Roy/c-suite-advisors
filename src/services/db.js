// Firestore database wrapper.
// On Cloud Run, credentials are auto-discovered from the runtime.
// For local dev, run: gcloud auth application-default login --project=csuite-advisors-prod

import { Firestore } from "@google-cloud/firestore";

// Use the project ID from env or fall back to csuite-advisors-prod
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "csuite-advisors-prod";

const db = new Firestore({ projectId });

/**
 * Get a user-scoped subcollection reference.
 * Collections: users (top-level), then subcollections per user.
 */
export function userCollection(userId, collection) {
  return db.collection("users").doc(String(userId)).collection(collection);
}

/**
 * Top-level collection (e.g. users).
 */
export function collection(name) {
  return db.collection(name);
}

/**
 * Atomic counter helper — get next ID for a collection.
 * Uses a meta doc to track the next ID.
 */
export async function getNextId(userId, collectionName) {
  const metaRef = db.collection("users").doc(String(userId)).collection("_meta").doc(collectionName);
  const doc = await db.runTransaction(async (tx) => {
    const snap = await tx.get(metaRef);
    const current = snap.exists ? (snap.data().nextId || 1) : 1;
    tx.set(metaRef, { nextId: current + 1 });
    return current;
  });
  return doc;
}

/**
 * Top-level atomic counter (for users collection).
 */
export async function getNextUserId() {
  const metaRef = db.collection("_meta").doc("users");
  const id = await db.runTransaction(async (tx) => {
    const snap = await tx.get(metaRef);
    const current = snap.exists ? (snap.data().nextId || 1) : 1;
    tx.set(metaRef, { nextId: current + 1 });
    return current;
  });
  return id;
}

export default db;
