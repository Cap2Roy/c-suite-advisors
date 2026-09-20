// Seed Knowledge Base — default knowledge files created for new users.
// Provides sample data so the knowledge base isn't empty on first use.

// Sample knowledge file about BetterAI360 — the company behind C-Suite Advisors.
export const SEED_KNOWLEDGE_FILES = [
  {
    name: "BetterAI360 — Company Overview.md",
    content: `# BetterAI360

## The Heterogeneous Blueprint

BetterAI360 is an AI infrastructure company built on a simple principle: throughput is a scheduling problem, not a procurement problem. The platform pools heterogeneous accelerators — prior-generation cards, mixed vendors, uneven memory — into one addressable substrate, so capability scales with scheduling rather than with procurement.

## Core Products

### NativeOS
NativeOS is an AI appliance operating system for server farms built on the hardware you already have. It pools heterogeneous accelerators (NVIDIA CUDA, AMD ROCm, mixed generations) into one scheduling plane. Key features:
- **Heterogeneous Pooling**: One scheduling plane across ROCm and CUDA, spanning generations. Workloads are placed by measured topology and free VRAM, never by hardware SKU.
- **Memory-Tiered Sharding**: Weights are partitioned to fit the cards you own. Older accelerators with modest VRAM carry real shards instead of sitting idle.
- **Sealed Side Effects**: Every proposed action is validated before execution. Agents run without ambient credentials; capability grants are scoped and revoked per task.

### Auto Researcher
Autonomous research engine for specs, plans, and codebases. A bounded loop of context retrieval → patch → validate → LLM-Critic evaluation → keep-or-rollback, executed inside an isolated git worktree.
- **Go CLI Controller**: Side-effect ownership and loop management.
- **VCS Isolation**: Linked git worktrees for safe execution.
- **Institutional Memory**: Persistent .agent_kb/ recording.

### DataReactor
DataReactor facilitates logic-unit synthesis, transforming raw user inputs and metadata into frozen, executable code agents. When standard processing paths reach ambiguity, the ROMA Escalation Module triggers a priority system override, ensuring complex orchestration is handled with deterministic precision.
- **Logic-Unit Synthesis**: Proprietary synthesis of immutable agentic logic from high-entropy data.
- **ROMA Escalation**: Automated priority escalation for edge-case resolution and system overrides.

## Architecture Layers
- **L0 — Base OS**: NativeOS with ROCm / CUDA / Bare-Metal orchestration
- **L1 — Control Plane**: Deterministic Controller — owns every side effect
- **L2 — Autonomous Engine**: Auto Researcher — bounded research loops
- **L3 — Agentic Shell**: DataReactor — logic-unit synthesis with ROMA escalation

## Key Principle
"Models reason; code decides." The deterministic controller owns every side effect; the model only proposes.

## Performance
NativeOS lands 15–40% ahead of the best available alternative on distributed A100 tiers vs. queueing on current-generation cards. Benchmarks on 44,000-token prompts (GLM-5.3, FP8):
- NativeOS: 59.4 gen tokens/s, 1,421ms TTFT
- TensorRT-LLM: 47.9 gen tokens/s, 1,870ms TTFT
- SGLang: 42.1 gen tokens/s, 2,180ms TTFT
- vLLM (clustered): 38.7 gen tokens/s, 2,460ms TTFT

## Cost Advantage
NativeOS delivers 26% lower annual cost compared to owned B300 clusters and 77% lower than on-demand cloud, by utilizing distributed A100 accelerators with memory-tiered sharding.

## Website
https://betterai360.com
`,
  },
  {
    name: "BetterAI360 — C-Suite Advisors Product.md",
    content: `# C-Suite Advisors by BetterAI360

## Overview
C-Suite Advisors is an AI-powered platform that provides access to a team of virtual C-level executives. Each advisor is a specialized AI persona with deep domain expertise, designed to help businesses with strategy, operations, finance, technology, marketing, HR, security, product, and legal matters.

## How It Works
1. **Select an Advisor**: Choose from 11 built-in C-suite advisors (CEO, CFO, COO, CTO, CMO, CHRO, CISO, CPO, CSO, CLO, Legal Auditor) or create custom advisors.
2. **Chat or Run Tasks**: Interact conversationally or execute structured tasks that produce professional deliverables.
3. **Context-Aware**: Advisors use your knowledge files, memory notes, and conversation history to provide personalized advice.
4. **Web Search**: Enable web search for real-time information — advisors search the web and cite sources.
5. **Multi-Advisor Collaboration**: Run discussions between advisors, generate reports, and simulate scenarios.

## Advisor Capabilities
- **Chat**: Conversational advice with full context awareness
- **Tasks**: Structured deliverables (strategic plans, financial models, architectures, etc.)
- **Memory**: Personal and shared memory for persistent context
- **Knowledge Base**: Upload reference documents advisors use as context
- **Custom Advisors**: Create your own advisor personas with custom expertise
- **Web Search**: Real-time web information for time-sensitive queries

## Customization
- Edit any advisor's name, title, background, expertise, and system prompt
- Changes apply only to your account — defaults are preserved
- Create fully custom advisors from scratch
- Configure your own LLM API key (OpenAI-compatible endpoints supported)

## Security
- User-isolated data — each user's settings, memory, and knowledge are private
- Authenticated sessions with optional Google OAuth
- No data sharing between users
`,
  },
];
