// Data Repository Service
// File-based knowledge store for uploading, searching, and managing
// reference documents that advisors can use as context.

import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const DATA_DIR = path.resolve("data");
const STORE_FILE = path.join(DATA_DIR, "index.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure index file exists
if (!fs.existsSync(STORE_FILE)) {
  fs.writeFileSync(STORE_FILE, JSON.stringify({ files: [], nextId: 1 }, null, 2));
}

function readIndex() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
  } catch {
    return { files: [], nextId: 1 };
  }
}

function writeIndex(index) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(index, null, 2));
}

/**
 * Add a file to the data repository.
 * @param {{originalName: string, content: string, mimeType?: string}} file
 * @returns {object} The stored file metadata
 */
export function addFile({ originalName, content, mimeType = "text/plain", agentId = null }) {
  const index = readIndex();
  const id = index.nextId++;
  const entry = {
    id,
    name: originalName,
    content,
    mimeType,
    size: content.length,
    contentHash: createHash("sha256").update(content).digest("hex").slice(0, 16),
    uploadedAt: new Date().toISOString(),
    agentId,
  };
  index.files.push(entry);
  writeIndex(index);
  return entry;
}

/**
 * List all files in the repository (metadata only — no content).
 * @param {string|null} agentId - If provided, filter to files owned by this agent.
 *        If null, return global (non-agent-specific) files only.
 *        If omitted, return all files.
 */
export function listFiles(agentId) {
  const index = readIndex();
  let files = index.files;
  if (agentId !== undefined) {
    files = files.filter((f) => (f.agentId || null) === agentId);
  }
  return files.map(({ content, ...meta }) => meta);
}

/**
 * Get a single file with content by ID.
 */
export function getFile(id) {
  const index = readIndex();
  return index.files.find((f) => f.id === Number(id));
}

/**
 * Delete a file by ID.
 */
export function deleteFile(id) {
  const index = readIndex();
  const before = index.files.length;
  index.files = index.files.filter((f) => f.id !== Number(id));
  writeIndex(index);
  return index.files.length < before;
}

/**
 * Search files by keyword in name or content.
 */
export function searchFiles(query) {
  const index = readIndex();
  const q = query.toLowerCase();
  return index.files
    .filter(
      (f) =>
        f.name.toLowerCase().includes(q) || f.content.toLowerCase().includes(q)
    )
    .map(({ content, ...meta }) => ({ ...meta, snippet: content.slice(0, 200) }));
}

/**
 * Build a context string from selected file IDs for inclusion in prompts.
 * @param {number[]} ids - File IDs to include
 * @returns {string} Formatted context block, or empty string if none.
 */
export function buildContext(ids) {
  if (!ids || ids.length === 0) return "";
  const index = readIndex();
  const selected = index.files.filter((f) => ids.includes(f.id));
  if (selected.length === 0) return "";
  const blocks = selected.map(
    (f) =>
      `--- ${f.name} (${f.size} chars, uploaded ${f.uploadedAt}) ---\n${f.content}`
  );
  return `\n\nREFERENCE DOCUMENTS FROM KNOWLEDGE BASE:\n${blocks.join("\n\n")}\n\nEND OF REFERENCE DOCUMENTS.\n\n`;
}

/**
 * Get repository stats.
 */
export function getStats() {
  const index = readIndex();
  return {
    fileCount: index.files.length,
    totalSize: index.files.reduce((sum, f) => sum + f.size, 0),
  };
}
