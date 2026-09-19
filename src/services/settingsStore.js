// Settings Service
// Persists LLM configuration (API key, base URL, model) to data/settings.json.
// Allows runtime updates via the UI without restarting the server.

import fs from "fs";
import path from "path";
import "dotenv/config";

const DATA_DIR = path.resolve("data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  const current = readSettings();
  const merged = { ...current, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

/**
 * Get current LLM settings (API key is masked).
 */
export function getSettings() {
  const stored = readSettings();
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
    // Mask key for display: show first 4 + last 4 chars
    maskedKey: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "",
  };
}

/**
 * Update LLM settings. Only provided fields are updated.
 */
export function updateSettings({ apiKey, apiBase, model }) {
  const updates = {};
  if (apiKey !== undefined) updates.apiKey = apiKey;
  if (apiBase !== undefined) updates.apiBase = apiBase;
  if (model !== undefined) updates.model = model;
  return writeSettings(updates);
}

/**
 * Get the raw values needed by llmClient (unmasked).
 */
export function getLLMConfig() {
  const s = getSettings();
  return {
    apiKey: s.apiKey,
    apiBase: s.apiBase,
    model: s.model,
  };
}
