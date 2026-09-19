// Memory Service
// Manages shared memory (accessible by all advisors) and per-advisor
// personal memory. Each memory entry is a note that gets injected into
// the advisor's system prompt to provide persistent context.
//
// Storage: data/memory.json
// Structure:
// {
//   shared: [{ id, content, createdAt, createdBy }],
//   personal: { [agentId]: [{ id, content, createdAt }] },
//   nextId: number
// }

import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(MEMORY_FILE)) {
  fs.writeFileSync(
    MEMORY_FILE,
    JSON.stringify({ shared: [], personal: {}, nextId: 1 }, null, 2)
  );
}

function readMemory() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
  } catch {
    return { shared: [], personal: {}, nextId: 1 };
  }
}

function writeMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// --- Shared Memory ---

export function getSharedMemory() {
  return readMemory().shared;
}

export function addSharedMemory(content, createdBy = "user") {
  const mem = readMemory();
  const entry = {
    id: mem.nextId++,
    content,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  mem.shared.push(entry);
  writeMemory(mem);
  return entry;
}

export function deleteSharedMemory(id) {
  const mem = readMemory();
  const before = mem.shared.length;
  mem.shared = mem.shared.filter((m) => m.id !== Number(id));
  writeMemory(mem);
  return mem.shared.length < before;
}

// --- Personal Memory (per advisor) ---

export function getPersonalMemory(agentId) {
  const mem = readMemory();
  return mem.personal[agentId] || [];
}

export function addPersonalMemory(agentId, content) {
  const mem = readMemory();
  if (!mem.personal[agentId]) mem.personal[agentId] = [];
  const entry = {
    id: mem.nextId++,
    content,
    createdAt: new Date().toISOString(),
  };
  mem.personal[agentId].push(entry);
  writeMemory(mem);
  return entry;
}

export function deletePersonalMemory(agentId, id) {
  const mem = readMemory();
  if (!mem.personal[agentId]) return false;
  const before = mem.personal[agentId].length;
  mem.personal[agentId] = mem.personal[agentId].filter(
    (m) => m.id !== Number(id)
  );
  writeMemory(mem);
  return mem.personal[agentId].length < before;
}

// --- Memory Context for Prompts ---

/**
 * Build a memory context block to inject into prompts.
 * Includes both shared memory and the advisor's personal memory.
 * @param {string} agentId - The advisor ID
 * @returns {string} Formatted memory block, or empty string if none.
 */
export function buildMemoryContext(agentId) {
  const mem = readMemory();
  const shared = mem.shared;
  const personal = mem.personal[agentId] || [];

  if (shared.length === 0 && personal.length === 0) return "";

  let block = "\n\nPERSISTENT MEMORY:\n";

  if (shared.length > 0) {
    block += "\nShared organizational memory (applies to all advisors):\n";
    shared.forEach((m) => {
      block += `- ${m.content}\n`;
    });
  }

  if (personal.length > 0) {
    block += `\nYour personal memory (specific to you as ${agentId}):\n`;
    personal.forEach((m) => {
      block += `- ${m.content}\n`;
    });
  }

  block += "\nUse this memory as background context. Do not repeat it verbatim — weave it into your analysis naturally.\n";

  return block;
}

/**
 * Get all memory stats.
 */
export function getMemoryStats() {
  const mem = readMemory();
  const personalCount = Object.values(mem.personal).reduce(
    (sum, entries) => sum + entries.length,
    0
  );
  return {
    sharedCount: mem.shared.length,
    personalCount,
    total: mem.shared.length + personalCount,
    advisorsWithMemory: Object.keys(mem.personal).length,
  };
}
