// LLM Client Service
// Supports OpenAI-compatible chat completion APIs.
// Falls back to a deterministic demo mode when no API key is configured.
// Reads config per-user from the settings store.

import "dotenv/config";
import { getLLMConfig } from "./settingsStore.js";

export function isLLMConfigured(userId) {
  return Boolean(getLLMConfig(userId).apiKey);
}

export function getLLMModel(userId) {
  return getLLMConfig(userId).model;
}

/**
 * Call an OpenAI-compatible chat completion endpoint.
 * @param {{system: string, prompt: string, maxTokens?: number, userId?: number}} opts
 * @returns {Promise<string>} The assistant's response text.
 */
export async function complete({ system, prompt, maxTokens = 2000, userId }) {
  const config = getLLMConfig(userId);
  if (config.apiKey) {
    return completeWithAPI({ system, prompt, maxTokens }, config);
  }
  return demoResponse({ system, prompt });
}

async function completeWithAPI({ system, prompt, maxTokens }, config) {
  const url = `${config.apiBase}/chat/completions`;
  const body = {
    model: config.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  };

  const MAX_RETRIES = 4;
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Abort timeout: 90s per request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        // Retry on 503, 429, and network errors
        if (response.status === 503 || response.status === 429) {
          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s
            console.error(
              `LLM API ${response.status}, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
        }
        throw new Error(`LLM API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned empty response");
      return content;
    } catch (err) {
      clearTimeout(timeout);
      // Retry on network/abort errors
      if (err.name === "AbortError" || err.message?.includes("fetch")) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          console.error(
            `LLM network error, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
      lastError = err;
    }
  }

  throw lastError || new Error("LLM API exhausted retries");
}

/**
 * Demo mode: produces a structured, advisor-aware response when no API key is set.
 */
function demoResponse({ system, prompt }) {
  // Extract advisor name and title from system prompt
  const nameMatch = system?.match(/You are ([^,]+),/);
  const titleMatch = system?.match(/,\s*([^\.]+)\./);
  const name = nameMatch ? nameMatch[1] : "Advisor";
  const title = titleMatch ? titleMatch[1] : "Executive";

  if (prompt.length > 500) {
    return formatDemoTask(name, title, "Analysis", "detailed analysis", prompt);
  }
  return formatDemoChat(name, title, prompt);
}

function formatDemoChat(name, title, userMessage) {
  return `**${name} — ${title}** (Demo Mode)

I'm currently in demo mode, which means no LLM API key is configured. Here's how I would respond to your message:

> "${userMessage.slice(0, 200)}"

In a live configuration, I would provide strategic analysis drawing on my expertise as ${title}. I'd consider the business implications, risks, and opportunities, and give you actionable recommendations.

**To enable full AI responses:**
1. Click **Settings** in the sidebar
2. Enter your OpenAI-compatible API key
3. Set the model (e.g., gpt-4o, gemini-3.6-flash)
4. Save

*Demo mode lets you explore the full UI without an LLM backend.*`;
}

function formatDemoTask(name, title, taskName, description, fullPrompt) {
  const inputPreview = fullPrompt.slice(0, 300);
  return `## ${taskName} — Demo Mode

**${name}**, ${title}

This task was executed in demo mode (no API key configured). Here's a summary of what the full analysis would cover:

### Input Summary
\`\`\`
${inputPreview}...
\`\`\`

### What I Would Analyze
As ${title}, I would approach this ${description} by:
1. **Assessing the current situation** — understanding the context and constraints
2. **Identifying key factors** — the variables that matter most
3. **Evaluating options** — tradeoffs between different approaches
4. **Recommending a path forward** — with specific, actionable steps
5. **Flagging risks** — what could go wrong and how to mitigate

**To enable full AI responses, configure your API key in Settings.**`;
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + "..." : str;
}
