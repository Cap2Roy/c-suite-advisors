// LLM Client Service
// Supports OpenAI-compatible chat completion APIs.
// Falls back to a deterministic demo mode when no API key is configured,
// so the application is fully functional out of the box for evaluation.

import "dotenv/config";

const API_KEY = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "";
const API_BASE =
  process.env.OPENAI_API_BASE || process.env.LLM_API_BASE || "https://api.openai.com/v1";
const MODEL = process.env.LLM_MODEL || "gpt-4o";

export const isLLMConfigured = () => Boolean(API_KEY);

/**
 * Call an OpenAI-compatible chat completion endpoint.
 * @param {{system: string, prompt: string, maxTokens?: number}} opts
 * @returns {Promise<string>} The assistant's response text.
 */
export async function complete({ system, prompt, maxTokens = 2000 }) {
  if (API_KEY) {
    return completeWithAPI({ system, prompt, maxTokens });
  }
  return demoResponse({ system, prompt });
}

async function completeWithAPI({ system, prompt, maxTokens }) {
  const url = `${API_BASE}/chat/completions`;
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Demo mode: produces a structured, advisor-aware response when no API key is set.
 * Lets users explore the full UI without an LLM backend.
 */
function demoResponse({ system, prompt }) {
  // Extract the advisor identity from the system prompt
  const nameMatch = system.match(/You are ([^,]+), (Chief[^.]+)\./);
  const advisorName = nameMatch ? nameMatch[1] : "Advisor";
  const advisorTitle = nameMatch ? nameMatch[2] : "C-Level Executive";

  // Detect whether this is a structured task or a chat message
  const isTask = prompt.includes("TASK:");
  const userMessage = isTask
    ? prompt.match(/TASK:\s*(.+?)\n/)?.[1] || "your task"
    : prompt;

  if (isTask) {
    const descMatch = prompt.match(/TASK:\s*.+\n(.+)/);
    const desc = descMatch ? descMatch[1].trim() : "";
    return formatDemoTask(advisorName, advisorTitle, userMessage, desc, prompt);
  }

  return formatDemoChat(advisorName, advisorTitle, userMessage);
}

function formatDemoChat(name, title, userMessage) {
  return `### ${name} — ${title}

> **Demo Mode** — No LLM API key configured. This is a simulated response to demonstrate the interface. Add an API key to \`.env\` for real advisor responses.

You asked: "${truncate(userMessage, 200)}"

As ${title}, here's my perspective on this:

## Key Considerations

- **Strategic alignment**: Any decision should be evaluated against your company's mission and current strategic priorities. Without that anchor, even good ideas become distractions.
- **Risk-reward balance**: I'd want to understand the upside scenario and the downside scenario before committing resources.
- **Timing and sequencing**: The right move at the wrong time is still the wrong move.

## Initial Assessment

This is a topic that sits squarely in my domain as ${title}. To give you a genuinely useful answer rather than a generic one, I'd need more context about your specific situation — your company stage, resources, constraints, and what success looks like.

## Recommended Next Steps

1. **Clarify the objective** — What specific outcome are you trying to achieve?
2. **Gather context** — What data or input would make this decision better informed?
3. **Define success** — How will you know the decision was right in 3, 6, 12 months?

I'm ready to go deeper. Give me specifics and I'll give you specifics back.

*— ${name}*`;
}

function formatDemoTask(name, title, taskName, description, fullPrompt) {
  const inputSection = fullPrompt.match(/INPUTS:\n([\s\S]+?)\n\nINSTRUCTIONS:/);
  const inputs = inputSection ? inputSection[1].trim() : "(none provided)";

  return `# ${taskName}

**Prepared by:** ${name}, ${title}
**Date:** ${new Date().toISOString().split("T")[0]}

> **Demo Mode** — No LLM API key configured. This is a simulated deliverable to demonstrate the task interface. Add an API key to \`.env\` for real advisor analysis.

---

## 1. Executive Summary

This ${taskName.toLowerCase()} addresses the inputs provided and applies ${title}'s domain expertise to produce actionable recommendations. The analysis below is structured to support decision-making.

**Inputs received:**
${inputs}

## 2. Analysis / Assessment

Based on the information provided, here are the key observations from a ${title} perspective:

| Dimension | Observation | Significance |
|-----------|-------------|--------------|
| Current state | Determined from inputs | Establishes baseline |
| Key drivers | Primary factors at play | Where to focus attention |
| Constraints | Limiting factors | What boundaries to work within |
| Opportunities | Upside scenarios | Where value can be created |

## 3. Recommendations / Deliverable

1. **Immediate actions (0-30 days):** Begin with the highest-impact, lowest-effort moves that build momentum.
2. **Short-term initiatives (30-90 days):** Establish the foundation and measurement framework.
3. **Strategic initiatives (90+ days):** Pursue the opportunities that compound over time.

## 4. Key Risks & Mitigations

- **Risk:** Execution capacity may be insufficient → **Mitigation:** Phase initiatives and validate before scaling.
- **Risk:** Assumptions may not hold → **Mitigation:** Define leading indicators and review monthly.
- **Risk:** External factors may shift → **Mitigation:** Build flexibility into the plan.

## 5. Next Steps

1. Review this analysis with stakeholders
2. Validate assumptions against available data
3. Assign owners and deadlines to each recommendation
4. Schedule a review checkpoint in 30 days

---

*This deliverable was prepared in demo mode. Configure an LLM API key for expert-level analysis.*

*— ${name}, ${title}*`;
}

function truncate(str, n) {
  if (str.length <= n) return str;
  return str.slice(0, n) + "...";
}
