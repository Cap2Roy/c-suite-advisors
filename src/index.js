// Express Server — C-Suite Advisors API
// Provides chat and task endpoints for all C-level advisors.

import express from "express";
import { agents, getAgentById } from "./agents/definitions.js";
import { runTask, getAllTasks } from "./services/taskRunner.js";
import { complete, isLLMConfigured } from "./services/llmClient.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

// --- API Routes ---

// List all advisors (metadata only — no system prompts)
app.get("/api/agents", (req, res) => {
  const summary = agents.map((a) => ({
    id: a.id,
    name: a.name,
    title: a.title,
    shortTitle: a.shortTitle,
    icon: a.icon,
    color: a.color,
    tagline: a.tagline,
    expertise: a.expertise,
    capabilities: a.capabilities,
    taskCount: a.tasks.length,
  }));
  res.json(summary);
});

// Get a single advisor's details including tasks
app.get("/api/agents/:id", (req, res) => {
  const agent = getAgentById(req.params.id);
  if (!agent) return res.status(404).json({ error: "Advisor not found" });
  const { systemPrompt, ...publicData } = agent;
  res.json(publicData);
});

// Get all tasks grouped by advisor
app.get("/api/tasks", (req, res) => {
  res.json(getAllTasks());
});

// Chat with an advisor — streaming not used; returns full response
app.post("/api/chat", async (req, res) => {
  const { agentId, message, history = [] } = req.body;

  if (!agentId || !message) {
    return res.status(400).json({ error: "agentId and message are required" });
  }

  const agent = getAgentById(agentId);
  if (!agent) {
    return res.status(404).json({ error: "Advisor not found" });
  }

  try {
    // Build conversation context from history
    const conversation = history
      .map((h) => `${h.role === "user" ? "User" : agent.name}: ${h.content}`)
      .join("\n\n");

    const prompt = conversation
      ? `Previous conversation:\n${conversation}\n\nUser: ${message}`
      : message;

    const response = await complete({
      system: agent.systemPrompt,
      prompt,
      maxTokens: 2000,
    });

    res.json({
      agentId,
      agentName: agent.name,
      agentTitle: agent.shortTitle,
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Failed to generate response", detail: err.message });
  }
});

// Run a structured task for an advisor
app.post("/api/tasks/run", async (req, res) => {
  const { agentId, taskId, inputs = {} } = req.body;

  if (!agentId || !taskId) {
    return res.status(400).json({ error: "agentId and taskId are required" });
  }

  try {
    const result = await runTask(agentId, taskId, inputs, { complete });
    res.json(result);
  } catch (err) {
    console.error("Task error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    llmConfigured: isLLMConfigured(),
    agentCount: agents.length,
  });
});

// SPA fallback — serve index.html for non-API routes
app.get("*not-found", (req, res) => {
  res.sendFile(new URL("../public/index.html", import.meta.url).pathname);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   C-Suite AI Advisors                     ║`);
  console.log(`  ║   http://localhost:${PORT}                  ║`);
  console.log(`  ║   ${agents.length} advisors ready • ${isLLMConfigured() ? "LLM connected" : "Demo mode"}          ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
