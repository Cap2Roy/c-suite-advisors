// Data Repository Service — User-isolated knowledge store.
// Backed by Firestore: users/{userId}/data

import { userCollection, getNextId } from "./db.js";

/**
 * Add a file to the data repository.
 */
export async function addFile(userId, { originalName, content, mimeType = "text/plain", agentId = null }) {
  const id = await getNextId(userId, "data");
  const file = {
    id,
    originalName,
    content,
    mimeType,
    agentId,
    uploadedAt: new Date().toISOString(),
    size: content.length,
  };
  await userCollection(userId, "data").doc(String(id)).set(file);
  const { content: _, ...meta } = file;
  return meta;
}

/**
 * List all files in the repository (metadata only — no content).
 */
export async function listFiles(userId, agentId) {
  const snap = await userCollection(userId, "data").get();
  let files = snap.docs
    .map((d) => {
      const { content, ...meta } = d.data();
      return meta;
    })
    .sort((a, b) => (a.uploadedAt || "").localeCompare(b.uploadedAt || ""));
  if (agentId !== undefined) {
    files = files.filter((f) => f.agentId === agentId);
  }
  return files;
}

/**
 * Get a single file with content by ID.
 */
export async function getFile(userId, id) {
  const doc = await userCollection(userId, "data").doc(String(parseInt(id))).get();
  if (!doc.exists) return null;
  return doc.data();
}

/**
 * Delete a file by ID.
 */
export async function deleteFile(userId, id) {
  const ref = userCollection(userId, "data").doc(String(parseInt(id)));
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

/**
 * Search files by keyword in name or content.
 */
export async function searchFiles(userId, query) {
  const snap = await userCollection(userId, "data").get();
  const q = query.toLowerCase();
  return snap.docs
    .map((d) => d.data())
    .filter(
      (f) =>
        f.originalName.toLowerCase().includes(q) ||
        (f.content || "").toLowerCase().includes(q)
    )
    .map(({ content, ...meta }) => meta);
}

/**
 * Build a context string from selected file IDs for inclusion in prompts.
 */
export async function buildContext(userId, ids) {
  if (!ids || ids.length === 0) return "";
  const snap = await userCollection(userId, "data").get();
  const selected = snap.docs
    .map((d) => d.data())
    .filter((f) => ids.includes(f.id));
  if (selected.length === 0) return "";
  return selected
    .map((f) => `--- ${f.originalName} ---\n${f.content}`)
    .join("\n\n");
}

/**
 * Get repository stats.
 */
export async function getStats(userId) {
  const snap = await userCollection(userId, "data").get();
  const files = snap.docs.map((d) => d.data());
  return {
    fileCount: files.length,
    totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
  };
}
