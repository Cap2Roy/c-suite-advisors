// Task Runner Service
// Executes structured tasks assigned to advisors.
// Each task produces a structured deliverable using the advisor's expertise.

import { getAgentById, agents } from "../agents/definitions.js";

/**
 * Build a task execution prompt for the LLM.
 * Combines the advisor's system prompt with task-specific instructions.
 */
function buildTaskPrompt(agent, task, inputValues, contextBlock = "") {
  const inputBlock = task.inputs
    .map((key) => {
      const value = inputValues[key] || "[not provided]";
      return `**${key}:** ${value}`;
    })
    .join("\n");

  return `${agent.systemPrompt}
${contextBlock}
TASK: ${task.name}
${task.description}

INPUTS:
${inputBlock}

INSTRUCTIONS:
You are executing this task as ${agent.name}, ${agent.title}. Produce a professional, structured deliverable. Use clear headings (##), bullet points, and tables where appropriate. Be specific and actionable — avoid generic advice. Draw on your domain expertise to provide insights a non-expert wouldn't think of. If the inputs are insufficient, make reasonable assumptions and state them. If reference documents are provided, incorporate their information into your analysis.

Format your response as a professional document with:
1. Executive Summary
2. Analysis / Assessment
3. Recommendations / Deliverable
4. Key Risks & Mitigations
5. Next Steps

Be thorough but concise. This is a real deliverable for a real business decision.`;
}

/**
 * Run a task for an advisor.
 * @param {string} agentId - The advisor ID (e.g. "ceo")
 * @param {string} taskId - The task ID (e.g. "ceo-vision")
 * @param {Object} inputValues - Key-value map of task inputs
 * @param {Object} llmClient - The LLM client instance
 * @returns {Promise<{agent, task, result, timestamp}>}
 */
export async function runTask(agentId, taskId, inputValues, llmClient, contextBlock = "", effectiveAgent = null) {
  const agent = effectiveAgent || getAgentById(agentId);
  if (!agent) {
    throw new Error(`Unknown advisor: ${agentId}`);
  }

  const tasks = agent.tasks || [];
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Unknown task for ${agent.shortTitle}: ${taskId}`);
  }

  const prompt = buildTaskPrompt(agent, task, inputValues, contextBlock);

  const systemPrompt = agent.background
    ? `${agent.systemPrompt}\n\n--- Advisor Background ---\n${agent.background}`
    : agent.systemPrompt;

  const result = await llmClient.complete({
    system: systemPrompt,
    prompt,
    maxTokens: 4000,
  });

  return {
    agent: { id: agent.id, name: agent.name, title: agent.shortTitle },
    task: { id: task.id, name: task.name },
    result,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get all tasks across all advisors, grouped by advisor.
 */
export function getAllTasks() {
  return agents.map((agent) => ({
    agentId: agent.id,
    agentName: agent.name,
    agentTitle: agent.shortTitle,
    icon: agent.icon,
    color: agent.color,
    tasks: agent.tasks,
  }));
}
