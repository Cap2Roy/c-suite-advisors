// Prevent server crash on unhandled promise rejections (e.g. network errors to LLM API)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason?.message || reason);
});

// Express Server — C-Suite Advisors API
// User-authenticated: every user has isolated settings, memory, and knowledge.
// Company: BetterAI360

import express from "express";
import multer from "multer";
import { agents, getAgentById } from "./agents/definitions.js";
import {
  getAdvisorConfig,
  saveAdvisorConfig,
  resetAdvisorConfig,
  getCustomAdvisors,
  createCustomAdvisor,
  updateCustomAdvisor,
  deleteCustomAdvisor,
} from "./services/advisorConfigStore.js";
import { getEffectiveAgents, getEffectiveAgent } from "./services/agentResolver.js";
import { runTask, getAllTasks } from "./services/taskRunner.js";
import { complete, isLLMConfigured, getLLMModel } from "./services/llmClient.js";
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
import { runSimulation } from "./services/simulationRunner.js";
import { searchWeb, formatSearchContext, extractSearchQuery } from "./services/webSearch.js";
import {
  getSettings,
  updateSettings,
} from "./services/settingsStore.js";
import {
  getSharedMemory,
  addSharedMemory,
  deleteSharedMemory,
  getPersonalMemory,
  addPersonalMemory,
  deletePersonalMemory,
  buildMemoryContext,
  getMemoryStats,
} from "./services/memoryStore.js";
import {
  registerUser,
  loginUser,
  loginWithGoogle,
  getUserById,
  verifyAuthToken,
} from "./services/userStore.js";
import { authRequired, authOptional } from "./services/authMiddleware.js";

const app = express();
app.use(express.json({ limit: "5mb" }));

// File upload via multer — store in memory, then save to data store as text
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// Serve static files
app.use(express.static("public"));

// --- Auth Routes (no auth required) ---

// Register a new user
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const result = await registerUser(email, password, name);
  if (result.error) {
    return res.status(409).json({ error: result.error });
  }
  res.status(201).json(result);
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const result = await loginUser(email, password);
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  res.json(result);
});

// Google OAuth login — accepts a Google ID token, creates/finds user, returns session token
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "Google credential is required" });
  }
  const result = await loginWithGoogle(credential);
  if (result.error) {
    return res.status(401).json({ error: result.error });
  }
  res.json(result);
});

// Auth config — returns public config needed by the frontend (e.g. Google client ID)
app.get("/api/auth/config", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

// Check session (validate token)
app.get("/api/auth/session", authRequired, (req, res) => {
  res.json({ user: req.user });
});

// --- Settings Routes (auth required) ---

app.get("/api/settings", authRequired, async (req, res) => {
  res.json(await getSettings(req.user.id));
});

app.post("/api/settings", authRequired, async (req, res) => {
  const { apiKey, apiBase, model } = req.body;
  const updated = await updateSettings(req.user.id, { apiKey, apiBase, model });
  res.json({
    ok: true,
    hasKey: Boolean(updated.apiKey),
    apiBase: updated.apiBase,
    model: updated.model,
    maskedKey: updated.apiKey
      ? `${updated.apiKey.slice(0, 4)}...${updated.apiKey.slice(-4)}`
      : "",
  });
});

// --- Memory Routes (auth required) ---

app.get("/api/memory/shared", authRequired, async (req, res) => {
  res.json(await getSharedMemory(req.user.id));
});

app.post("/api/memory/shared", authRequired, async (req, res) => {
  const { content, createdBy } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });
  res.json(await addSharedMemory(req.user.id, content, createdBy || req.user.email));
});

app.delete("/api/memory/shared/:id", authRequired, async (req, res) => {
  const ok = await deleteSharedMemory(req.user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: "Memory entry not found" });
  res.json({ ok: true });
});

app.get("/api/memory/personal/:agentId", authRequired, async (req, res) => {
  res.json(await getPersonalMemory(req.user.id, req.params.agentId));
});

app.post("/api/memory/personal/:agentId", authRequired, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });
  res.json(await addPersonalMemory(req.user.id, req.params.agentId, content));
});

app.delete("/api/memory/personal/:agentId/:id", authRequired, async (req, res) => {
  const ok = await deletePersonalMemory(req.user.id, req.params.agentId, req.params.id);
  if (!ok) return res.status(404).json({ error: "Memory entry not found" });
  res.json({ ok: true });
});

app.get("/api/memory/stats", authRequired, async (req, res) => {
  res.json(await getMemoryStats(req.user.id));
});

// --- Data Repository Routes (auth required) ---

app.get("/api/data", authRequired, async (req, res) => {
  const { agentId } = req.query;
  res.json(await listFiles(req.user.id, agentId !== undefined ? agentId : undefined));
});

app.get("/api/data/search/:query", authRequired, async (req, res) => {
  res.json(await searchFiles(req.user.id, decodeURIComponent(req.params.query)));
});

app.get("/api/data/stats", authRequired, async (req, res) => {
  res.json(await getDataStats(req.user.id));
});

app.get("/api/data/:id", authRequired, async (req, res) => {
  const file = await getFile(req.user.id, req.params.id);
  if (!file) return res.status(404).json({ error: "File not found" });
  res.json(file);
});

app.post("/api/data", authRequired, upload.single("file"), async (req, res) => {
  try {
    let originalName, content, mimeType;
    const agentId = req.body.agentId || null;

    if (req.file) {
      originalName = req.file.originalname;
      content = req.file.buffer.toString("utf-8");
      mimeType = req.file.mimetype;
    } else if (req.body.name && req.body.content) {
      originalName = req.body.name;
      content = req.body.content;
      mimeType = req.body.mimeType || "text/plain";
    } else {
      return res.status(400).json({ error: "Provide a file or {name, content} in body" });
    }

    const entry = await addFile(req.user.id, { originalName, content, mimeType, agentId });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: "Upload failed", detail: err.message });
  }
});

app.delete("/api/data/:id", authRequired, async (req, res) => {
  const ok = await deleteFile(req.user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: "File not found" });
  res.json({ ok: true });
});

// --- Agent Routes (public metadata, auth for chat/task) ---

// GET /api/agents — returns effective agents (base + overrides + custom) for the user.
// Uses authOptional: if authenticated, includes per-user overrides and custom advisors.
app.get("/api/agents", authOptional, async (req, res) => {
  const agentList = req.user
    ? await getEffectiveAgents(req.user.id)
    : agents;
  const summary = agentList.map((a) => ({
    id: a.id,
    name: a.name,
    title: a.title,
    shortTitle: a.shortTitle,
    icon: a.icon,
    color: a.color,
    tagline: a.tagline,
    expertise: a.expertise,
    capabilities: a.capabilities,
    taskCount: (a.tasks || []).length,
    custom: a.custom || false,
  }));
  res.json(summary);
});

// GET /api/agents/:id — returns a single effective agent (with systemPrompt if authenticated).
app.get("/api/agents/:id", authOptional, async (req, res) => {
  const agent = req.user
    ? await getEffectiveAgent(req.user.id, req.params.id)
    : getAgentById(req.params.id);
  if (!agent) return res.status(404).json({ error: "Advisor not found" });
  const { systemPrompt, ...publicData } = agent;
  // Include systemPrompt for authenticated users (they may be editing it)
  if (req.user) {
    res.json({ ...publicData, systemPrompt });
  } else {
    res.json(publicData);
  }
});

app.get("/api/tasks", authOptional, async (req, res) => {
  if (req.user) {
    const agentList = await getEffectiveAgents(req.user.id);
    const allTasks = agentList.map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      agentTitle: agent.shortTitle,
      icon: agent.icon,
      color: agent.color,
      tasks: agent.tasks || [],
    }));
    res.json(allTasks);
  } else {
    res.json(getAllTasks());
  }
});

// Chat with an advisor — auth required, user-scoped memory/context
app.post("/api/chat", authRequired, async (req, res) => {
  const { agentId, message, history = [], contextFileIds = [], webSearch = false } = req.body;

  if (!agentId || !message) {
    return res.status(400).json({ error: "agentId and message are required" });
  }

  const agent = await getEffectiveAgent(req.user.id, agentId);
  if (!agent) {
    return res.status(404).json({ error: "Advisor not found" });
  }

  try {
    const conversation = history
      .map((h) => `${h.role === "user" ? "User" : agent.name}: ${h.content}`)
      .join("\n\n");

    const contextBlock = await buildContext(req.user.id, contextFileIds);
    const memoryBlock = await buildMemoryContext(req.user.id, agentId);

    // Web search: if enabled, search the web and inject results as context
    let searchBlock = "";
    let searchResults = null;
    if (webSearch) {
      try {
        const query = extractSearchQuery(message);
        const searchResult = await searchWeb(query);
        searchResults = searchResult.results;
        searchBlock = formatSearchContext(searchResult.results);
        if (searchResult.results.length > 0) {
          searchBlock = `\nYou have access to real-time web search results. Use the following search results to inform your response. Cite sources where relevant.\n${searchBlock}`;
        }
      } catch (err) {
        console.error("Web search failed:", err.message);
        // Continue without search results — don't block the chat
      }
    }

    const prompt = `${contextBlock}${memoryBlock}${searchBlock}${conversation ? `Previous conversation:\n${conversation}\n\n` : ""}User: ${message}`;

    const response = await complete({
      system: agent.systemPrompt,
      prompt,
      maxTokens: 2000,
      userId: req.user.id,
    });

    res.json({
      agentId,
      agentName: agent.name,
      agentTitle: agent.shortTitle,
      response,
      webSearchUsed: webSearch && searchResults !== null,
      webSearchResults: searchResults,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Failed to generate response", detail: err.message });
  }
});

// Run a structured task — auth required, user-scoped
app.post("/api/tasks/run", authRequired, async (req, res) => {
  const { agentId, taskId, inputs = {}, contextFileIds = [], webSearch = false } = req.body;

  if (!agentId || !taskId) {
    return res.status(400).json({ error: "agentId and taskId are required" });
  }

  try {
    const agent = await getEffectiveAgent(req.user.id, agentId);
    if (!agent) {
      return res.status(404).json({ error: "Advisor not found" });
    }

    const contextBlock = await buildContext(req.user.id, contextFileIds);
    const memoryBlock = await buildMemoryContext(req.user.id, agentId);

    // Web search: if enabled, build a search query from task inputs
    let searchBlock = "";
    if (webSearch) {
      try {
        const inputValues = Object.values(inputs).filter(Boolean).join(" ");
        const taskDesc = agent.tasks?.find((t) => t.id === taskId)?.name || taskId;
        const query = extractSearchQuery(`${taskDesc} ${inputValues}`.trim());
        const searchResult = await searchWeb(query);
        searchBlock = formatSearchContext(searchResult.results);
        if (searchResult.results.length > 0) {
          searchBlock = `\nYou have access to real-time web search results. Use them to inform your analysis. Cite sources where relevant.\n${searchBlock}`;
        }
      } catch (err) {
        console.error("Web search for task failed:", err.message);
      }
    }

    const fullContext = contextBlock + memoryBlock + searchBlock;

    // Pass a user-scoped complete function to taskRunner
    const userLLM = {
      complete: (opts) => complete({ ...opts, userId: req.user.id }),
    };
    const result = await runTask(agentId, taskId, inputs, userLLM, fullContext, agent);
    res.json(result);
  } catch (err) {
    console.error("Task error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Advisor Config Routes (auth required) ---

// GET advisor config overrides for a specific advisor
app.get("/api/advisors/:id/config", authRequired, async (req, res) => {
  try {
    const config = await getAdvisorConfig(req.user.id, req.params.id);
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT (save) advisor config overrides
app.put("/api/advisors/:id/config", authRequired, async (req, res) => {
  try {
    const saved = await saveAdvisorConfig(req.user.id, req.params.id, req.body);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (reset) advisor config to defaults
app.delete("/api/advisors/:id/config", authRequired, async (req, res) => {
  try {
    await resetAdvisorConfig(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Custom Advisor Routes (auth required) ---

// GET all custom advisors for the user
app.get("/api/advisors/custom", authRequired, async (req, res) => {
  try {
    const custom = await getCustomAdvisors(req.user.id);
    res.json(custom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new custom advisor
app.post("/api/advisors/custom", authRequired, async (req, res) => {
  try {
    const created = await createCustomAdvisor(req.user.id, req.body);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update a custom advisor
app.put("/api/advisors/custom/:id", authRequired, async (req, res) => {
  try {
    const updated = await updateCustomAdvisor(req.user.id, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a custom advisor
app.delete("/api/advisors/custom/:id", authRequired, async (req, res) => {
  try {
    const ok = await deleteCustomAdvisor(req.user.id, req.params.id);
    res.json({ ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Inter-Agent Messaging (auth required) ---

app.post("/api/agents/message", authRequired, async (req, res) => {
  const { fromId, toId, type = "request", message, context = "" } = req.body;

  if (!fromId || !toId || !message) {
    return res.status(400).json({ error: "fromId, toId, and message are required" });
  }

  try {
    const userLLM = {
      complete: (opts) => complete({ ...opts, userId: req.user.id }),
    };
    const result = await sendMessage(fromId, toId, type, message, context, userLLM);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/agents/discuss", authRequired, async (req, res) => {
  const { topic, agentIds } = req.body;

  if (!topic || !agentIds || agentIds.length < 2) {
    return res.status(400).json({ error: "topic and agentIds (min 2) are required" });
  }

  try {
    const userLLM = {
      complete: (opts) => complete({ ...opts, userId: req.user.id }),
    };
    const result = await runDiscussion(topic, agentIds, userLLM);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Report Generation (auth required) ---

app.post("/api/reports/generate", authRequired, async (req, res) => {
  const { title, subject, sections, synthesizerId } = req.body;

  if (!title || !subject || !sections) {
    return res.status(400).json({ error: "title, subject, and sections are required" });
  }

  try {
    const userLLM = {
      complete: (opts) => complete({ ...opts, userId: req.user.id }),
    };
    const report = await generateReport({ title, subject, sections, synthesizerId }, userLLM);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Workflows ---

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

app.post("/api/workflows/:id/run", authRequired, async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: "input is required" });
  }

  try {
    const userLLM = {
      complete: (opts) => complete({ ...opts, userId: req.user.id }),
    };
    const result = await executeWorkflow(req.params.id, input, userLLM);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Simulations (auth required) ---

app.post("/api/simulations/run", authRequired, async (req, res) => {
  const { scenario, agentIds, synthesizerId } = req.body;

  if (!scenario || !agentIds || agentIds.length === 0) {
    return res.status(400).json({ error: "scenario and agentIds are required" });
  }

  try {
    const effectiveAgents = await getEffectiveAgents(req.user.id);
    const userLLM = {
      complete: (opts) => complete({ ...opts, userId: req.user.id }),
    };
    const result = await runSimulation({
      scenario,
      agentIds,
      synthesizerId: synthesizerId || agentIds[0],
      llmClient: userLLM,
      effectiveAgents,
    });
    res.json(result);
  } catch (err) {
    console.error("Simulation error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Web Search (auth required) ---

// POST /api/web-search — search the web for real-time information
app.post("/api/web-search", authRequired, async (req, res) => {
  const { query, maxResults = 5 } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }
  try {
    const result = await searchWeb(query.trim(), maxResults);
    res.json(result);
  } catch (err) {
    console.error("Web search error:", err.message);
    res.status(500).json({ error: "Web search failed", detail: err.message });
  }
});

// --- Health Check (public, no auth) ---

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    agentCount: agents.length,
    workflowCount: workflows.length,
  });
});

// SPA fallback — serve index.html for non-API routes
app.get("*not-found", (req, res) => {
  res.sendFile(new URL("../public/index.html", import.meta.url).pathname);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  ╔════════════════════════════════════════════════╗`);
  console.log(`  ║   BetterAI360 — C-Suite Advisors                ║`);
  console.log(`  ║   http://localhost:${PORT}                        ║`);
  console.log(`  ║   ${agents.length} advisors • ${workflows.length} workflows                    ║`);
  console.log(`  ╚════════════════════════════════════════════════╝\n`);
});
