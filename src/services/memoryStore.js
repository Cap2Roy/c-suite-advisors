// Memory Service — User-isolated shared + per-advisor memory.
// Each user has their own memory store: data/user-{id}/memory.json
//
// Structure:
// {
//   shared: [{ id, content, createdAt, createdBy }],
//   personal: { [agentId]: [{ id, content, createdAt }] },
//   nextId: number
// }

import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("data");

function getUserDir(userId) {
  if (!userId) return DATA_DIR;
  const dir = path.join(DATA_DIR, `user-${userId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getMemoryFile(userId) {
  return path.join(getUserDir(userId), "memory.json");
}

function ensureMemory(userId) {
  const memFile = getMemoryFile(userId);
  if (!fs.existsSync(memFile)) {
    fs.writeFileSync(
      memFile,
      JSON.stringify({ shared: [], personal: {}, nextId: 1 }, null, 2)
    );
  }
}

function readMemory(userId) {
  ensureMemory(userId);
  try {
    return JSON.parse(fs.readFileSync(getMemoryFile(userId), "utf-8"));
  } catch {
    return { shared: [], personal: {}, nextId: 1 };
  }
}

function writeMemory(userId, memory) {
  fs.writeFileSync(getMemoryFile(userId), JSON.stringify(memory, null, 2));
}

// --- Shared Memory ---

export function getSharedMemory(userId) {
  return readMemory(userId).shared;
}

export function addSharedMemory(userId, content, createdBy = "user") {
  const memory = readMemory(userId);
  const entry = {
    id: memory.nextId++,
    content,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  memory.shared.push(entry);
  writeMemory(userId, memory);
  return entry;
}

export function deleteSharedMemory(userId, id) {
  const memory = readMemory(userId);
  const before = memory.shared.length;
  memory.shared = memory.shared.filter((m) => m.id !== parseInt(id));
  const deleted = before !== memory.shared.length;
  writeMemory(userId, memory);
  return deleted;
}

// --- Personal Memory (per advisor) ---

export function getPersonalMemory(userId, agentId) {
  const memory = readMemory(userId);
  return memory.personal[agentId] || [];
}

export function addPersonalMemory(userId, agentId, content) {
  const memory = readMemory(userId);
  if (!memory.personal[agentId]) memory.personal[agentId] = [];
  const entry = {
    id: memory.nextId++,
    content,
    createdAt: new Date().toISOString(),
  };
  memory.personal[agentId].push(entry);
  writeMemory(userId, memory);
  return entry;
}

export function deletePersonalMemory(userId, agentId, id) {
  const memory = readMemory(userId);
  if (!memory.personal[agentId]) return false;
  const before = memory.personal[agentId].length;
  memory.personal[agentId] = memory.personal[agentId].filter(
    (m) => m.id !== parseInt(id)
  );
  const deleted = before !== memory.personal[agentId].length;
  writeMemory(userId, memory);
  return deleted;
}

// --- Memory Context for Prompts ---

export function buildMemoryContext(userId, agentId) {
  const memory = readMemory(userId);
  const shared = memory.shared;
  const personal = memory.personal[agentId] || [];
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
export function getMemoryStats(userId) {
  const memory = readMemory(userId);
  const personalCount = Object.values(memory.personal).reduce(
    (sum, entries) => sum + entries.length,
    0
  );
  return {
    sharedCount: memory.shared.length,
    personalCount,
    total: memory.shared.length + personalCount,
    advisorsWithMemory: Object.keys(memory.personal).filter(
      (k) => memory.personal[k].length > 0
    ).length,
  };
}
