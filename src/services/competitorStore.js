// Competitor Store — User-isolated competitor tracking.
// Path: users/{userId}/competitors/{id}

import { userCollection, getNextId } from "./db.js";

/**
 * Add a competitor.
 * @param {string} userId
 * @param {object} competitor - { name, category, strengths, weaknesses, url, notes }
 * @returns {Promise<object>} The saved competitor.
 */
export async function addCompetitor(userId, { name, category = "", strengths = "", weaknesses = "", url = "", notes = "" }) {
  const id = await getNextId(userId, "competitors");
  const record = {
    id,
    name,
    category,
    strengths,
    weaknesses,
    url,
    notes,
    addedAt: new Date().toISOString(),
  };
  await userCollection(userId, "competitors").doc(String(id)).set(record);
  return record;
}

/**
 * List all competitors (sorted by addedAt desc).
 */
export async function listCompetitors(userId) {
  const snap = await userCollection(userId, "competitors").get();
  const results = snap.docs.map((d) => d.data());
  return results.sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
}

/**
 * Update a competitor.
 */
export async function updateCompetitor(userId, id, updates) {
  const ref = userCollection(userId, "competitors").doc(String(id));
  const doc = await ref.get();
  if (!doc.exists) return null;
  const clean = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      clean[key] = value;
    }
  }
  await ref.update(clean);
  const updated = await ref.get();
  return updated.data();
}

/**
 * Delete a competitor.
 */
export async function deleteCompetitor(userId, id) {
  const ref = userCollection(userId, "competitors").doc(String(id));
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

/**
 * Build a context string from competitors for inclusion in prompts.
 */
export async function buildCompetitorContext(userId) {
  const competitors = await listCompetitors(userId);
  if (competitors.length === 0) return "";
  const lines = competitors.map((c) => {
    const parts = [c.name];
    if (c.category) parts.push(`Category: ${c.category}`);
    if (c.strengths) parts.push(`Strengths: ${c.strengths}`);
    if (c.weaknesses) parts.push(`Weaknesses: ${c.weaknesses}`);
    if (c.url) parts.push(`URL: ${c.url}`);
    if (c.notes) parts.push(`Notes: ${c.notes}`);
    return parts.join(" | ");
  });
  return `\n--- Competitive Landscape ---\n${lines.join("\n")}\n`;
}
