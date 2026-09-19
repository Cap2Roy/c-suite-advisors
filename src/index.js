// Express Server — C-Suite Advisors API
// Provides chat, task, data, workflow, report, and messaging endpoints.

import express from "express";
import multer from "multer";
import { agents, getAgentById } from "./agents/definitions.js";
import { runTask, getAllTasks } from "./services/taskRunner.js";
import { complete, isLLMConfigured } from "./services/llmClient.js";
import {
  addFile,
  listFiles,
  getFile,
  deleteFile,
  searchFiles,
  buildContext,
  getStats as getDataStats,
} from "./services/dataStore.js";
import { sendMessage, runDiscussion, MessageType } from "./services/orchestrator.js";
import { generateReport, formatReportAsMarkdown } from "./services/reportGenerator.js";
import { workflows, executeWorkflow } from "./services/workflows.js";

const app = express();
app.use(express.json({ limit: "5mb" }));

// File upload via multer — store in memory, then save to data store as text
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// Serve static files
app.use(express.static("public"));

// --- Data Repository Routes ---

// List all files in the knowledge base
app.get("/api/data", (req, res) => {
  res.json(listFiles());
});

// Get a single file with content
app.get("/api/data/:id", (req, res) => {
  const file = getFile(req.params.id);
  if (!file) return res.status(404).json({ error: "File not found" });
  res.json(file);
});

// Upload a file (text content) to the knowledge base
app.post("/api/data", upload.single("file"), async (req, res) => {
  try {
    let originalName, content, mimeType;

    if (req.file) {
      // File uploaded via multipart
      originalName = req.file.originalname;
      content = req.file.buffer.toString("utf-8");
      mimeType = req.file.mimetype;
    } else if (req.body.name && req.body.content) {
      // JSON body upload (paste text directly)
      originalName = req.body.name;
      content = req.body.content;
      mimeType = req.body.mimeType || "text/plain";
    } else {
      return res.status(400).json({ error: "Provide a file or {name, content} in body" });
    }

    const entry = addFile({ originalName, content, mimeType });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: "Upload failed", detail: err.message });
  }
});

// Delete a file
app.delete("/api/data/:id", (req, res) => {
  const ok = deleteFile(req.params.id);
  if (!ok) return res.status(404).json({ error: "File not found" });
  res.json({ ok: true });
});

// Search files
app.get("/api/data/search/:query", (req, res) => {
  res.json(searchFiles(decodeURIComponent(req.params.query)));
});

// Get data stats
app.get("/api/data/stats", (req, res) => {
  res.json(getDataStats());
});

// --- Agent Routes ---

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

// Chat with an advisor — supports optional data context files
app.post("/api/chat", async (req, res) => {
  const { agentId, message, history = [], contextFileIds = [] } = req.body;

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

    const contextBlock = buildContext(contextFileIds);

    const prompt = `${contextBlock}${conversation ? `Previous conversation:\n${conversation}\n\n` : ""}User: ${message}`;

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

// Run a structured task for an advisor — supports optional data context
app.post("/api/tasks/run", async (req, res) => {
  const { agentId, taskId, inputs = {}, contextFileIds = [] } = req.body;

  if (!agentId || !taskId) {
    return res.status(400).json({ error: "agentId and taskId are required" });
  }

  try {
    const contextBlock = buildContext(contextFileIds);
    const result = await runTask(agentId, taskId, inputs, { complete }, contextBlock);
    res.json(result);
  } catch (err) {
    console.error("Task error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Inter-Agent Messaging ---

// Send a message from one advisor to another
app.post("/api/agents/message", async (req, res) => {
  const { fromId, toId, type = "request", message, context = "" } = req.body;

  if (!fromId || !toId || !message) {
    return res.status(400).json({ error: "fromId, toId, and message are required" });
  }

  try {
    const result = await sendMessage(fromId, toId, type, message, context, { complete });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run a multi-advisor discussion
app.post("/api/agents/discuss", async (req, res) => {
  const { topic, agentIds } = req.body;

  if (!topic || !agentIds || agentIds.length < 2) {
    return res.status(400).json({ error: "topic and agentIds (min 2) are required" });
  }

  try {
    const result = await runDiscussion(topic, agentIds, { complete });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Report Generation ---

// Generate a multi-advisor report
app.post("/api/reports/generate", async (req, res) => {
  const { title, subject, sections, synthesizerId } = req.body;

  if (!title || !subject || !sections) {
    return res.status(400).json({ error: "title, subject, and sections are required" });
  }

  try {
    const report = await generateReport({ title, subject, sections, synthesizerId }, { complete });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Workflows ---

// List all workflow templates
app.get("/api/workflows", (req, res) => {
  res.json(
    workflows.map((w) => ({
      id: w.id,
      name: w.name,
      icon: w.icon,
      description: w.description,
      stepCount: w.steps.length,
      steps: w.steps.map((s) => ({
        id: s.id,
        agentId: s.agentId,
        action: s.action,
        type: s.type,
      })),
    }))
  );
});

// Execute a workflow
app.post("/api/workflows/:id/run", async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: "input is required" });
  }

  try {
    const result = await executeWorkflow(req.params.id, input, { complete });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Health Check ---

app.get("/api/health", (req, res) => {
  const dataStats = getDataStats();
  res.json({
    status: "ok",
    llmConfigured: isLLMConfigured(),
    agentCount: agents.length,
    workflowCount: workflows.length,
    dataFiles: dataStats.fileCount,
  });
});

// SPA fallback — serve index.html for non-API routes
app.get("*not-found", (req, res) => {
  res.sendFile(new URL("../public/index.html", import.meta.url).pathname);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  ╔════════════════════════════════════════════════╗`);
  console.log(`  ║   C-Suite AI Advisors                          ║`);
  console.log(`  ║   http://localhost:${PORT}                        ║`);
  console.log(`  ║   ${agents.length} advisors • ${workflows.length} workflows • ${isLLMConfigured() ? "LLM connected" : "Demo mode"}       ║`);
  console.log(`  ╚════════════════════════════════════════════════╝\n`);
});
