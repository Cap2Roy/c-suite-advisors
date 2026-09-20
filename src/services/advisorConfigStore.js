// Advisor Config Store — Per-user advisor CV/profile overrides + custom advisors.
// Backed by Firestore:
//   users/{userId}/advisor_configs/{agentId}  — overrides for built-in advisors
//   users/{userId}/custom_advisors/{agentId}  — fully custom advisor definitions
//
// Overrides store only changed fields; built-in defaults fill the gaps.
// Custom advisors are standalone definitions stored in full.

import { userCollection, getNextId } from "./db.js";

// --- Override configs for built-in advisors ---

/**
 * Get a single built-in advisor's config overrides.
 * @returns {Promise<object|null>} Override fields or null if none saved.
 */
export async function getAdvisorConfig(userId, agentId) {
  const doc = await userCollection(userId, "advisor_configs").doc(agentId).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Get all built-in advisor config overrides for a user.
 * @returns {Promise<object>} Map of agentId -> override fields.
 */
export async function getAllAdvisorConfigs(userId) {
  const snap = await userCollection(userId, "advisor_configs").get();
  const configs = {};
  snap.forEach((doc) => {
    configs[doc.id] = doc.data();
  });
  return configs;
}

/**
 * Save built-in advisor config overrides (full replace).
 * @param {string} userId
 * @param {string} agentId
 * @param {object} config - { name, title, tagline, background, expertise, systemPrompt, capabilities }
 */
export async function saveAdvisorConfig(userId, agentId, config) {
  const clean = {};
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined && value !== null && value !== "") {
      clean[key] = value;
    }
  }
  await userCollection(userId, "advisor_configs").doc(agentId).set(clean);
  return clean;
}

/**
 * Reset built-in advisor config to defaults (delete override).
 */
export async function resetAdvisorConfig(userId, agentId) {
  const ref = userCollection(userId, "advisor_configs").doc(agentId);
  const doc = await ref.get();
  if (doc.exists) {
    await ref.delete();
  }
  return true;
}

// --- Custom advisors ---

/**
 * Get all custom advisors for a user.
 * @returns {Promise<object[]>} Array of custom advisor definitions.
 */
export async function getCustomAdvisors(userId) {
  const snap = await userCollection(userId, "custom_advisors").orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

/**
 * Create a new custom advisor.
 * @param {string} userId
 * @param {object} advisor - { name, title, icon, color, tagline, expertise[], systemPrompt, capabilities[], tasks[] }
 * @returns {Promise<object>} The created advisor with assigned ID.
 */
export async function createCustomAdvisor(userId, advisor) {
  const id = `custom-${await getNextId(userId, "custom_advisors")}`;
  const doc = {
    name: advisor.name || "New Advisor",
    title: advisor.title || "Advisor",
    shortTitle: advisor.shortTitle || advisor.name?.slice(0, 3)?.toUpperCase() || "ADV",
    icon: advisor.icon || "🎯",
    color: advisor.color || "#6366f1",
    tagline: advisor.tagline || "Custom advisor",
    expertise: Array.isArray(advisor.expertise) ? advisor.expertise : [],
    systemPrompt: advisor.systemPrompt || `You are ${advisor.name || "an advisor"}. Provide expert analysis in your domain.`,
    capabilities: Array.isArray(advisor.capabilities) ? advisor.capabilities : [],
    tasks: Array.isArray(advisor.tasks) ? advisor.tasks : [],
    createdAt: new Date().toISOString(),
    custom: true,
  };
  await userCollection(userId, "custom_advisors").doc(id).set(doc);
  return { ...doc, id };
}

/**
 * Update a custom advisor.
 */
export async function updateCustomAdvisor(userId, agentId, updates) {
  const clean = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      clean[key] = value;
    }
  }
  await userCollection(userId, "custom_advisors").doc(agentId).update(clean);
  return clean;
}

/**
 * Delete a custom advisor.
 */
export async function deleteCustomAdvisor(userId, agentId) {
  const ref = userCollection(userId, "custom_advisors").doc(agentId);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}
