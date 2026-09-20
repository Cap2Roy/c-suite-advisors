// Settings Service — User-isolated LLM configuration.
// Each user has their own settings: data/user-{id}/settings.json

import fs from "fs";
import path from "path";
import "dotenv/config";

const DATA_DIR = path.resolve("data");

function getUserDir(userId) {
  if (!userId) return DATA_DIR;
  const dir = path.join(DATA_DIR, `user-${userId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getSettingsFile(userId) {
  return path.join(getUserDir(userId), "settings.json");
}

function readSettings(userId) {
  try {
    return JSON.parse(fs.readFileSync(getSettingsFile(userId), "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(userId, settings) {
  const current = readSettings(userId);
  const merged = { ...current, ...settings };
  fs.writeFileSync(getSettingsFile(userId), JSON.stringify(merged, null, 2));
  return merged;
}

/**
 * Get current LLM settings (API key is masked).
 */
export function getSettings(userId) {
  const stored = readSettings(userId);
  const apiKey =
    stored.apiKey ||
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY ||
    "";
  const apiBase =
    stored.apiBase ||
    process.env.OPENAI_API_BASE ||
    process.env.LLM_API_BASE ||
    "https://api.openai.com/v1";
  const model = stored.model || process.env.LLM_MODEL || "gpt-4o";

  return {
    apiKey,
    apiBase,
    model,
    hasKey: Boolean(apiKey),
    maskedKey: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "",
  };
}

/**
 * Update LLM settings. Only provided fields are updated.
 */
export function updateSettings(userId, { apiKey, apiBase, model }) {
  const updates = {};
  if (apiKey !== undefined && apiKey !== "") updates.apiKey = apiKey;
  if (apiBase !== undefined && apiBase !== "") updates.apiBase = apiBase;
  if (model !== undefined && model !== "") updates.model = model;
  return writeSettings(userId, updates);
}

/**
 * Get the raw values needed by llmClient (unmasked).
 */
export function getLLMConfig(userId) {
  const s = getSettings(userId);
  return {
    apiKey: s.apiKey,
    apiBase: s.apiBase,
    model: s.model,
  };
}

/**
 * Get the current model name for health endpoint.
 */
export function getLLMModel(userId) {
  return getSettings(userId).model || "gpt-4o";
}

/**
 * Check if LLM is configured.
 */
export function isLLMConfigured(userId) {
  return Boolean(getSettings(userId).apiKey);
}
