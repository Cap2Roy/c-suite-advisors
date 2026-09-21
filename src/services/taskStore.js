// Task Store — Persists task execution results to Firestore.
// Path: users/{userId}/task_results/{id}

import { userCollection, getNextId } from "./db.js";

/**
 * Save a task execution result.
 * @param {string} userId
 * @param {object} result - { agentId, agentName, taskId, taskName, inputs, result, webSearchUsed }
 * @returns {Promise<object>} The saved record (with id, without the full result text).
 */
export async function saveTaskResult(userId, { agentId, agentName, taskId, taskName, inputs, result, webSearchUsed = false }) {
  const id = await getNextId(userId, "task_results");
  const record = {
    id,
    agentId,
    agentName,
    taskId,
    taskName,
    inputs,
    result,
    webSearchUsed,
    ranAt: new Date().toISOString(),
  };
  await userCollection(userId, "task_results").doc(String(id)).set(record);
  return record;
}

/**
 * List all saved task results (newest first, metadata + truncated result).
 */
export async function listTaskResults(userId) {
  const snap = await userCollection(userId, "task_results").get();
  const results = snap.docs.map((d) => {
    const { result, ...meta } = d.data();
    return { ...meta, resultPreview: (result || "").substring(0, 200) };
  });
  return results.sort((a, b) => (b.ranAt || "").localeCompare(a.ranAt || ""));
}

/**
 * Get a single task result with full content.
 */
export async function getTaskResult(userId, id) {
  const doc = await userCollection(userId, "task_results").doc(String(id)).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Delete a task result.
 */
export async function deleteTaskResult(userId, id) {
  const ref = userCollection(userId, "task_results").doc(String(id));
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}
