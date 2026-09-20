// Settings Service — User-isolated LLM configuration.
// Backed by Firestore: users/{userId}/settings/user-settings

import "dotenv/config";
import { userCollection } from "./db.js";

const SETTINGS_DOC = "user-settings";

async function readSettings(userId) {
  const doc = await userCollection(userId, "settings").doc(SETTINGS_DOC).get();
  return doc.exists ? doc.data() : {};
}

async function writeSettings(userId, settings) {
  const current = await readSettings(userId);
  const merged = { ...current, ...settings };
  await userCollection(userId, "settings").doc(SETTINGS_DOC).set(merged);
  return merged;
}

/**
 * Get current LLM settings (API key is masked).
 */
export async function getSettings(userId) {
  const stored = await readSettings(userId);
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
export async function updateSettings(userId, { apiKey, apiBase, model }) {
  const updates = {};
  if (apiKey !== undefined && apiKey !== "") updates.apiKey = apiKey;
  if (apiBase !== undefined && apiBase !== "") updates.apiBase = apiBase;
  if (model !== undefined && model !== "") updates.model = model;
  return writeSettings(userId, updates);
}

/**
 * Get the raw values needed by llmClient (unmasked).
 */
export async function getLLMConfig(userId) {
  const s = await getSettings(userId);
  return {
    apiKey: s.apiKey,
    apiBase: s.apiBase,
    model: s.model,
  };
}

/**
 * Get the current model name for health endpoint.
 */
export async function getLLMModel(userId) {
  const s = await getSettings(userId);
  return s.model || "gpt-4o";
}

/**
 * Check if LLM is configured.
 */
export async function isLLMConfigured(userId) {
  const s = await getSettings(userId);
  return Boolean(s.apiKey);
}
