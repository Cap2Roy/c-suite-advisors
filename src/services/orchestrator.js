// Orchestrator Service
// Enables inter-agent communication: one advisor can request input,
// review, or analysis from another advisor, and results are threaded together.

import { getAgentById, agents } from "../agents/definitions.js";

/**
 * Message types for inter-agent communication.
 */
export const MessageType = {
  REQUEST: "request",     // Advisor A asks Advisor B for analysis
  REVIEW: "review",       // Advisor A asks Advisor B to review a deliverable
  INFORM: "inform",       // Advisor A shares information with Advisor B
  DECISION: "decision",   // Advisor A communicates a decision to the org
};

/**
 * Send a message from one advisor to another.
 * Builds a prompt that includes the sender's context and message.
 * @param {string} fromId - Sending advisor ID
 * @param {string} toId - Receiving advisor ID
 * @param {string} type - Message type (request|review|inform|decision)
 * @param {string} message - The message content
 * @param {string} context - Additional context (e.g. a deliverable to review)
 * @param {Object} llmClient - LLM client with complete()
 * @returns {Promise<object>} The receiving advisor's response
 */
export async function sendMessage(fromId, toId, type, message, context = "", llmClient) {
  const from = getAgentById(fromId);
  const to = getAgentById(toId);

  if (!from || !to) {
    throw new Error("Invalid advisor ID for messaging");
  }

  const typeLabel = {
    [MessageType.REQUEST]: "is requesting your analysis on",
    [MessageType.REVIEW]: "would like you to review",
    [MessageType.INFORM]: "is sharing information with you about",
    [MessageType.DECISION]: "is communicating a decision regarding",
  }[type] || "is messaging you about";

  const prompt = `You are in an internal executive meeting. ${from.name} (${from.shortTitle}) ${typeLabel}:

${message}

${context ? `\nCONTEXT FROM ${from.shortTitle}:\n${context}\n` : ""}

As ${to.name} (${to.title}), respond directly to ${from.name}. Be concise, specific, and draw on your domain expertise. Reference what ${from.name} shared and add your professional perspective. If you need more information, say so. If you agree, say so and add nuance. If you disagree, explain why with reasoning.

Keep your response focused — this is an executive conversation, not a formal document. 200-400 words.`;

  const response = await llmClient.complete({
    system: to.systemPrompt,
    prompt,
    maxTokens: 1500,
  });

  return {
    from: { id: from.id, name: from.name, title: from.shortTitle },
    to: { id: to.id, name: to.name, title: to.shortTitle },
    type,
    message,
    context,
    response,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Multi-agent discussion: a topic is discussed by multiple advisors in sequence.
 * Each advisor sees the prior messages in the thread.
 * @param {string} topic - The topic to discuss
 * @param {string[]} agentIds - Ordered list of advisor IDs to participate
 * @param {Object} llmClient - LLM client
 * @returns {Promise<object>} Full discussion thread
 */
export async function runDiscussion(topic, agentIds, llmClient) {
  const thread = [];
  let runningContext = `TOPIC: ${topic}\n`;

  for (let i = 0; i < agentIds.length; i++) {
    const agent = getAgentById(agentIds[i]);
    if (!agent) continue;

    const priorMessages = thread
      .map(
        (m) =>
          `${m.from.title}: ${m.response.slice(0, 500)}...`
      )
      .join("\n\n");

    const prompt = `You are in an executive team meeting discussing the following topic. Here is the discussion so far:

${runningContext}
${priorMessages ? `\nPRIOR DISCUSSION:\n${priorMessages}\n` : ""}

As ${agent.name} (${agent.title}), contribute your perspective. Be concise (150-300 words). Reference points from prior speakers if relevant. Add your domain-specific insight. End with one concrete recommendation or question for the group.`;

    const response = await llmClient.complete({
      system: agent.systemPrompt,
      prompt,
      maxTokens: 1000,
    });

    thread.push({
      from: { id: agent.id, name: agent.name, title: agent.shortTitle },
      response,
      timestamp: new Date().toISOString(),
    });

    runningContext += `\n${agent.shortTitle}: ${response.slice(0, 300)}...`;
  }

  return {
    topic,
    participants: agentIds
      .map((id) => getAgentById(id))
      .filter(Boolean)
      .map((a) => ({ id: a.id, name: a.name, title: a.shortTitle })),
    messages: thread,
    timestamp: new Date().toISOString(),
  };
}
