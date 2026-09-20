// Agent Resolver — Merges built-in agents with per-user overrides and custom advisors.
// This is the single source of truth for "what agents does this user see and use".
//
// Callers: index.js routes (GET /api/agents, chat, tasks, workflows, simulations)
// All use getEffectiveAgents(userId) / getEffectiveAgent(userId, id) to get
// the merged agent list instead of the static `agents` array.

import { agents as baseAgents, getAgentById, getMergedAgent } from "../agents/definitions.js";
import {
  getAllAdvisorConfigs,
  getAdvisorConfig,
  getCustomAdvisors,
} from "./advisorConfigStore.js";

/**
 * Get the full list of effective agents for a user:
 * built-in agents (with overrides applied) + custom advisors.
 * @returns {Promise<object[]>}
 */
export async function getEffectiveAgents(userId) {
  const [configs, custom] = await Promise.all([
    getAllAdvisorConfigs(userId),
    getCustomAdvisors(userId),
  ]);

  const merged = baseAgents.map((a) => {
    const override = configs[a.id];
    return override ? getMergedAgent(a.id, override) : a;
  });

  // Append custom advisors
  for (const c of custom) {
    merged.push(c);
  }

  return merged;
}

/**
 * Get a single effective agent by ID for a user.
 * Checks built-in agents (with overrides) then custom advisors.
 * @returns {Promise<object|null>}
 */
export async function getEffectiveAgent(userId, agentId) {
  // Check built-in first
  const base = getAgentById(agentId);
  if (base) {
    const override = await getAdvisorConfig(userId, agentId);
    return override ? getMergedAgent(agentId, override) : base;
  }

  // Check custom advisors
  const custom = await getCustomAdvisors(userId);
  return custom.find((a) => a.id === agentId) || null;
}
