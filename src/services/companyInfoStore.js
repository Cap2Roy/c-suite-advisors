// Company Info Store — per-user company context for advisors.
// Backed by Firestore: users/{userId}/settings/company-info

import { userCollection } from "./db.js";

const COMPANY_DOC = "company-info";

const DEFAULT_COMPANY_INFO = {
  name: "",
  industry: "",
  stage: "",
  teamSize: "",
  website: "",
  description: "",
  goals: "",
};

/**
 * Get the user's company info, merged with defaults.
 */
export async function getCompanyInfo(userId) {
  const doc = await userCollection(userId, "settings").doc(COMPANY_DOC).get();
  if (!doc.exists) return { ...DEFAULT_COMPANY_INFO };
  return { ...DEFAULT_COMPANY_INFO, ...doc.data() };
}

/**
 * Save company info (full replace).
 */
export async function saveCompanyInfo(userId, info) {
  const clean = {};
  for (const [key, value] of Object.entries(info)) {
    if (value !== undefined && value !== null) {
      clean[key] = typeof value === "string" ? value : String(value);
    }
  }
  await userCollection(userId, "settings").doc(COMPANY_DOC).set(clean);
  return { ...DEFAULT_COMPANY_INFO, ...clean };
}

/**
 * Build a context string from company info for injection into advisor prompts.
 * Returns empty string if no company info is set.
 */
export async function buildCompanyContext(userId) {
  const info = await getCompanyInfo(userId);
  if (!info.name && !info.description && !info.industry) return "";
  const lines = [];
  if (info.name) lines.push(`Company: ${info.name}`);
  if (info.industry) lines.push(`Industry: ${info.industry}`);
  if (info.stage) lines.push(`Stage: ${info.stage}`);
  if (info.teamSize) lines.push(`Team size: ${info.teamSize}`);
  if (info.website) lines.push(`Website: ${info.website}`);
  if (info.description) lines.push(`Description: ${info.description}`);
  if (info.goals) lines.push(`Current goals: ${info.goals}`);
  return lines.length > 0 ? `--- Company Context ---\n${lines.join("\n")}` : "";
}
