// Simulation Runner — Business outcome simulations.
// Multiple advisors analyze a business scenario from their functional lens,
// then a synthesizer (CEO or chosen advisor) produces a unified outcome
// projection with best/base/worst-case scenarios.

/**
 * Run a business simulation.
 * @param {object} params
 * @param {string} params.scenario - The business scenario to simulate (e.g., "We cut headcount by 20%")
 * @param {string[]} params.agentIds - Advisor IDs to include in the simulation
 * @param {string} params.synthesizerId - Advisor ID for the synthesis step (defaults to first agent or "ceo")
 * @param {object} params.llmClient - LLM client with complete({ system, prompt, maxTokens })
 * @param {object[]} params.effectiveAgents - Pre-resolved effective agents (merged with overrides)
 * @param {function} [params.onProgress] - Optional callback(stepIndex, total, stepResult)
 * @returns {Promise<object>} Simulation result with per-advisor analyses + synthesis
 */
export async function runSimulation({ scenario, agentIds, synthesizerId, llmClient, effectiveAgents = [], onProgress }) {
  if (!scenario || !agentIds || agentIds.length === 0) {
    throw new Error("scenario and agentIds are required");
  }

  // Resolve agents from the effective list
  const agentMap = new Map(effectiveAgents.map((a) => [a.id, a]));
  const agents = agentIds.map((id) => agentMap.get(id)).filter(Boolean);

  if (agents.length === 0) {
    throw new Error("No valid advisors found for simulation");
  }

  const synthAgent = agentMap.get(synthesizerId) || agents[0];
  const analyses = [];
  const total = agents.length + 1; // +1 for synthesis

  // Phase 1: Each advisor analyzes the scenario from their lens
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const prompt = buildAnalysisPrompt(agent, scenario);
    const response = await llmClient.complete({
      system: agent.systemPrompt,
      prompt,
      maxTokens: 2000,
    });

    const result = {
      agentId: agent.id,
      agentName: agent.name,
      agentTitle: agent.shortTitle,
      agentIcon: agent.icon,
      analysis: response,
      timestamp: new Date().toISOString(),
    };
    analyses.push(result);
    if (onProgress) onProgress(i + 1, total, result);
  }

  // Phase 2: Synthesis — produce unified outcome projection
  const synthesisPrompt = buildSynthesisPrompt(synthAgent, scenario, analyses);
  const synthesisResponse = await llmClient.complete({
    system: synthAgent.systemPrompt,
    prompt: synthesisPrompt,
    maxTokens: 3000,
  });

  const synthesis = {
    agentId: synthAgent.id,
    agentName: synthAgent.name,
    agentTitle: synthAgent.shortTitle,
    analysis: synthesisResponse,
    timestamp: new Date().toISOString(),
  };
  if (onProgress) onProgress(total, total, synthesis);

  return {
    scenario,
    agentIds,
    synthesizerId: synthAgent.id,
    analyses,
    synthesis,
    executedAt: new Date().toISOString(),
  };
}

function buildAnalysisPrompt(agent, scenario) {
  return `BUSINESS SIMULATION SCENARIO:
${scenario}

YOUR TASK:
As ${agent.name} (${agent.title}), analyze this business scenario from your functional lens. Predict the likely outcomes, risks, and opportunities.

Structure your analysis:
1. **Immediate Impact** — What happens in the first 30-90 days from your domain
2. **6-Month Outlook** — Medium-term effects on your area of responsibility
3. **12-Month Projection** — Long-term consequences and trajectory
4. **Key Risks** — What could go wrong, with probability (high/medium/low) and impact
5. **Opportunities** — Hidden upside or strategic advantages
6. **Your Recommendation** — Proceed, modify, or abort, and why

Be specific and quantitative where possible. Use your domain expertise to identify what others might miss. Think about second-order effects — what does this trigger downstream?

300-500 words. Be direct and actionable.`;
}

function buildSynthesisPrompt(synthAgent, scenario, analyses) {
  const contextBlock = analyses
    .map((a) => `--- ${a.agentName} (${a.agentTitle}) ---\n${a.analysis}`)
    .join("\n\n---\n\n");

  return `BUSINESS SIMULATION SCENARIO:
${scenario}

Your executive team has analyzed this scenario from their respective functional domains. Their analyses follow.

TEAM ANALYSES:
${contextBlock}

YOUR TASK AS SYNTHESIZER (${synthAgent.name}, ${synthAgent.title}):
Synthesize the team's analyses into a unified business outcome simulation. Integrate their perspectives, resolve conflicts, and produce a clear projection.

Structure the simulation outcome:
1. **Executive Summary** — 2-3 paragraphs synthesizing the overall outlook
2. **Outcome Scenarios**:
   - **Best Case** (25% probability): What must go right, expected outcomes
   - **Base Case** (50% probability): Most likely outcome
   - **Worst Case** (25% probability): What could go wrong, impact
3. **Financial Impact Estimate** — Revenue, cost, and profitability implications (ranges)
4. **Operational Impact** — What changes in how the business runs
5. **Critical Decision Points** — When and what must be decided, with triggers
6. **Risk Heat Map** — Top 5 risks ranked by probability × impact
7. **Final Recommendation** — Go/no-go with conditions and guardrails

Be specific. Use the team's insights. Don't just summarize — add your executive judgment on what to do.`;
}
