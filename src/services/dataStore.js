// Data Repository Service — User-isolated file-based knowledge store.
// Each user has their own data directory: data/user-{id}/index.json

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

function getStoreFile(userId) {
  return path.join(getUserDir(userId), "index.json");
}

function ensureStore(userId) {
  const storeFile = getStoreFile(userId);
  if (!fs.existsSync(storeFile)) {
    fs.writeFileSync(storeFile, JSON.stringify({ files: [], nextId: 1 }, null, 2));
  }
}

function readIndex(userId) {
  ensureStore(userId);
  try {
    return JSON.parse(fs.readFileSync(getStoreFile(userId), "utf-8"));
  } catch {
    return { files: [], nextId: 1 };
  }
}

function writeIndex(userId, index) {
  fs.writeFileSync(getStoreFile(userId), JSON.stringify(index, null, 2));
}

/**
 * Add a file to the data repository.
 */
export function addFile(userId, { originalName, content, mimeType = "text/plain", agentId = null }) {
  const index = readIndex(userId);
  const file = {
    id: index.nextId++,
    originalName,
    content,
    mimeType,
    agentId,
    uploadedAt: new Date().toISOString(),
    size: content.length,
  };
  index.files.push(file);
  writeIndex(userId, index);
  const { content: _, ...meta } = file;
  return meta;
}

/**
 * List all files in the repository (metadata only — no content).
 */
export function listFiles(userId, agentId) {
  const index = readIndex(userId);
  let files = index.files.map(({ content, ...meta }) => meta);
  if (agentId !== undefined) {
    files = files.filter((f) => f.agentId === agentId);
  }
  return files;
}

/**
 * Get a single file with content by ID.
 */
export function getFile(userId, id) {
  const index = readIndex(userId);
  return index.files.find((f) => f.id === parseInt(id)) || null;
}

/**
 * Delete a file by ID.
 */
export function deleteFile(userId, id) {
  const index = readIndex(userId);
  const filtered = index.files.filter((f) => f.id !== parseInt(id));
  const deleted = index.files.length !== filtered.length;
  index.files = filtered;
  writeIndex(userId, index);
  return deleted;
}

/**
 * Search files by keyword in name or content.
 */
export function searchFiles(userId, query) {
  const index = readIndex(userId);
  const q = query.toLowerCase();
  return index.files
    .filter(
      (f) =>
        f.originalName.toLowerCase().includes(q) ||
        f.content.toLowerCase().includes(q)
    )
    .map(({ content, ...meta }) => meta);
}

/**
 * Build a context string from selected file IDs for inclusion in prompts.
 */
export function buildContext(userId, ids) {
  if (!ids || ids.length === 0) return "";
  const index = readIndex(userId);
  const selected = index.files.filter((f) => ids.includes(f.id));
  if (selected.length === 0) return "";
  return selected
    .map((f) => `--- ${f.originalName} ---\n${f.content}`)
    .join("\n\n");
}

/**
 * Get repository stats.
 */
export function getStats(userId) {
  const index = readIndex(userId);
  return {
    fileCount: index.files.length,
    totalSize: index.files.reduce((sum, f) => sum + (f.size || 0), 0),
  };
}
