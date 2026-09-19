# C-Suite AI Advisors

A company of ten C-level AI advisors you can chat with and assign tasks to. Each advisor is a domain expert with a detailed persona, capabilities, and pre-built task templates that produce structured deliverables.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure an LLM API key
cp .env.example .env
# Edit .env and add your API key

# 3. Start the server
npm start

# 4. Open the web interface
open http://localhost:3000
```

The app runs in **Demo Mode** without an API key — you can explore the full UI and get simulated responses. Add an LLM API key to `.env` for real expert responses.

---

## The Executive Team

| Advisor | Role | Domain |
|---------|------|--------|
| 👑 Alex Morgan | CEO | Vision, strategy & organizational leadership |
| 💰 Sarah Chen | CFO | Finance, capital & risk management |
| ⚙️ Marcus Reid | COO | Operations, execution & scaling |
| 💻 Priya Sharma | CTO | Technology, architecture & engineering |
| 📢 Diego Rivera | CMO | Brand, growth & customer acquisition |
| 🤝 Amara Okafor | CHRO | People, culture & talent |
| 🛡️ Viktor Novak | CISO | Security, compliance & risk |
| 🎯 Lena Bergstrom | CPO | Product, roadmap & user experience |
| ♟️ James Okonkwo | CSO | Strategy, M&A & market expansion |
| ⚖️ Sophia Reyes | CLO | Legal, governance & contracts |

Each advisor has:
- A detailed system prompt encoding their expertise, experience, and communication style
- 6-7 declared capabilities
- 5 pre-built task templates with structured inputs and deliverables

---

## Features

### Chat with Advisors

Click any advisor in the sidebar to open a chat. Ask any question in their domain and get a response grounded in their expertise. Conversation history is maintained per advisor within the session.

### Run Structured Tasks

The Tasks view lets you select an advisor and a specific task, fill in the required inputs, and receive a structured deliverable. Tasks produce professional documents with:

1. Executive Summary
2. Analysis / Assessment
3. Recommendations / Deliverable
4. Key Risks & Mitigations
5. Next Steps

### Task Catalog (50 tasks total)

**CEO:** Company Vision & Mission, Strategic Plan, Competitive Analysis, Board Presentation, Crisis Response Plan

**CFO:** Financial Model, Unit Economics Analysis, Annual Budget, Fundraising Strategy, Cash Runway Analysis

**COO:** Process Design, Scaling Plan, Supply Chain Optimization, Vendor Strategy, Quality System Design

**CTO:** System Architecture, Technology Stack Evaluation, Engineering Org Design, DevOps Strategy, AI/ML Strategy

**CMO:** Brand Strategy, Go-to-Market Plan, Customer Acquisition Strategy, Content Strategy, Campaign Plan

**CHRO:** Hiring Strategy, Compensation Framework, Performance System, Culture Strategy, Organizational Design

**CISO:** Security Program, Threat Model, Compliance Roadmap, Incident Response Plan, Vendor Risk Assessment

**CPO:** Product Roadmap, Product Requirements Doc, Pricing Strategy, Discovery Plan, Product Metrics Framework

**CSO:** Corporate Strategy, Market Entry Analysis, M&A Strategy, Partnership Strategy, Scenario Planning

**CLO:** Contract Review, Governance Framework, IP Strategy, Privacy Compliance, Employment Law Guide

---

## LLM Configuration

The app uses any OpenAI-compatible chat completion API. Set these in `.env`:

```bash
# OpenAI (default)
OPENAI_API_KEY=sk-...

# Or any compatible provider
LLM_API_KEY=your-key
LLM_API_BASE=https://openrouter.ai/api/v1
LLM_MODEL=anthropic/claude-3.5-sonnet
```

### Supported Providers

| Provider | API Base | Example Model |
|----------|----------|---------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| OpenRouter | `https://openrouter.ai/api/v1` | `anthropic/claude-3.5-sonnet` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Together AI | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` |
| Local (Ollama) | `http://localhost:11434/v1` | `llama3` |
| Local (LM Studio) | `http://localhost:1234/v1` | (varies) |

---

## API Reference

### `GET /api/agents`
Returns all advisors with metadata (excludes system prompts).

### `GET /api/agents/:id`
Returns a single advisor's details including tasks.

### `GET /api/tasks`
Returns all tasks grouped by advisor.

### `POST /api/chat`
Send a message to an advisor.

```json
{
  "agentId": "ceo",
  "message": "How should I think about entering a new market?",
  "history": [
    { "role": "user", "content": "What's our competitive position?" },
    { "role": "assistant", "content": "..." }
  ]
}
```

### `POST /api/tasks/run`
Run a structured task.

```json
{
  "agentId": "cfo",
  "taskId": "cfo-unit-economics",
  "inputs": {
    "Pricing": "$99/month",
    "Sales channels": "Direct sales + PLG",
    "Customer behavior": "Average 14-month retention"
  }
}
```

### `GET /api/health`
Returns server status and LLM configuration.

---

## Project Structure

```
c-suite-advisors/
├── src/
│   ├── agents/
│   │   └── definitions.js    # All 10 advisor personas, capabilities, tasks
│   ├── services/
│   │   ├── llmClient.js      # OpenAI-compatible LLM client + demo mode
│   │   └── taskRunner.js     # Task execution logic
│   └── index.js              # Express server with API routes
├── public/
│   └── index.html            # Single-page web app (dashboard, chat, tasks)
├── docs/
│   └── AGENTS.md             # Detailed agent reference
├── .env.example             # Configuration template
├── package.json
└── README.md
```

---

## How It Works

1. **Agent Definitions** (`src/agents/definitions.js`): Each advisor is defined with a detailed system prompt that encodes their personality, expertise, frameworks, and communication style. They also have declared capabilities and pre-built task templates.

2. **LLM Client** (`src/services/llmClient.js`): Sends chat completions to any OpenAI-compatible API. When no API key is configured, it falls back to Demo Mode, producing structured simulated responses so the UI is fully explorable.

3. **Task Runner** (`src/services/taskRunner.js`): Combines an advisor's system prompt with task-specific instructions and user inputs to produce structured deliverables.

4. **Express Server** (`src/index.js`): Serves the web interface and provides REST API endpoints for listing agents, chatting, and running tasks.

5. **Web Interface** (`public/index.html`): A single-page app with three views — dashboard, chat, and task runner. Built with vanilla JS, no build step required.

---

## Adding a New Advisor

1. Add an entry to the `agents` array in `src/agents/definitions.js`:

```javascript
{
  id: "cmo-digital",
  name: "Your Name",
  title: "Chief Digital Officer",
  shortTitle: "CDO",
  icon: "📱",
  color: "#your-color",
  tagline: "Digital transformation & innovation",
  expertise: [...],
  systemPrompt: "You are ...",
  capabilities: [...],
  tasks: [
    {
      id: "cdo-task",
      name: "Task Name",
      description: "What it produces",
      inputs: ["Input 1", "Input 2"],
    },
  ],
}
```

2. The advisor automatically appears in the sidebar, dashboard, and task list. No other changes needed.

---

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML/CSS/JS (no build step, no framework)
- **LLM:** Any OpenAI-compatible API
- **No external frontend dependencies** — fonts loaded from Google Fonts CDN

---

## License

MIT
