// Memory Service — User-isolated shared + per-advisor memory.
// Backed by Firestore: users/{userId}/memory/shared, users/{userId}/memory/personal

import { userCollection, getNextId } from "./db.js";

// --- Shared Memory ---

export async function getSharedMemory(userId) {
  const snap = await userCollection(userId, "memory_shared").get();
  return snap.docs
    .map((d) => ({ id: parseInt(d.id), ...d.data() }))
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

export async function addSharedMemory(userId, content, createdBy = "user") {
  const id = await getNextId(userId, "memory_shared");
  const entry = {
    content,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  await userCollection(userId, "memory_shared").doc(String(id)).set(entry);
  return { id, ...entry };
}

export async function deleteSharedMemory(userId, id) {
  const ref = userCollection(userId, "memory_shared").doc(String(parseInt(id)));
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

// --- Personal Memory (per advisor) ---

export async function getPersonalMemory(userId, agentId) {
  const snap = await userCollection(userId, "memory_personal")
    .where("agentId", "==", agentId)
    .get();
  return snap.docs
    .map((d) => ({ id: parseInt(d.id), ...d.data(), agentId: undefined }))
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

export async function addPersonalMemory(userId, agentId, content) {
  const id = await getNextId(userId, "memory_personal");
  const entry = {
    content,
    createdAt: new Date().toISOString(),
    agentId,
  };
  await userCollection(userId, "memory_personal").doc(String(id)).set(entry);
  return { id, content, createdAt: entry.createdAt };
}

export async function deletePersonalMemory(userId, agentId, id) {
  const ref = userCollection(userId, "memory_personal").doc(String(parseInt(id)));
  const doc = await ref.get();
  if (!doc.exists) return false;
  // Verify it belongs to this agent
  const data = doc.data();
  if (data.agentId !== agentId) return false;
  await ref.delete();
  return true;
}

// --- Memory Context for Prompts ---

export async function buildMemoryContext(userId, agentId) {
  const [shared, personal] = await Promise.all([
    getSharedMemory(userId),
    getPersonalMemory(userId, agentId),
  ]);

  let context = "";

  if (shared.length > 0) {
    context += "## Shared Company Context\n";
    context += "These are notes shared across all advisors. Weave them naturally into your analysis:\n\n";
    shared.forEach((m) => {
      context += `- ${m.content}\n`;
    });
    context += "\n";
  }

  if (personal.length > 0) {
    context += "## Personal Memory\n";
    context += "These are notes specific to your role. Use them as persistent context:\n\n";
    personal.forEach((m) => {
      context += `- ${m.content}\n`;
    });
    context += "\n";
  }

  return context;
}

/**
 * Get all memory stats.
 */
export async function getMemoryStats(userId) {
  const [sharedSnap, personalSnap] = await Promise.all([
    userCollection(userId, "memory_shared").get(),
    userCollection(userId, "memory_personal").get(),
  ]);

  const sharedCount = sharedSnap.size;
  const personalCount = personalSnap.size;

  // Count unique agents with memory
  const agentsWithMemory = new Set();
  personalSnap.forEach((doc) => {
    const data = doc.data();
    if (data.agentId) agentsWithMemory.add(data.agentId);
  });

  return {
    sharedCount,
    personalCount,
    total: sharedCount + personalCount,
    advisorsWithMemory: agentsWithMemory.size,
  };
}
