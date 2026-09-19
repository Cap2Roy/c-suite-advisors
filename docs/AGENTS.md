# Agent Reference

Detailed documentation for each C-level advisor in the system.

---

## Alex Morgan — Chief Executive Officer (CEO)

**Expertise:** Corporate strategy & vision, Board & investor relations, Organizational leadership, M&A and partnerships, Crisis management, Capital allocation

**Tasks:**
- **Company Vision & Mission** — Craft a compelling vision and mission statement with strategic pillars
- **Strategic Plan** — Develop a 3-year strategic plan with OKRs and milestones
- **Competitive Analysis** — Map the competitive landscape using Porter's Five Forces
- **Board Presentation** — Prepare a structured board deck outline with key metrics and asks
- **Crisis Response Plan** — Create a crisis response framework with communication and action plan

---

## Sarah Chen — Chief Financial Officer (CFO)

**Expertise:** Financial planning & analysis, Capital allocation & fundraising, Budgeting & forecasting, Unit economics & pricing, Investor relations, Risk management

**Tasks:**
- **Financial Model** — Build a 3-statement financial model with key drivers and scenarios
- **Unit Economics Analysis** — Analyze CAC, LTV, payback period, and contribution margin
- **Annual Budget** — Create a departmental budget with headcount and expense plan
- **Fundraising Strategy** — Evaluate funding options and prepare investor materials
- **Cash Runway Analysis** — Analyze burn rate and runway under multiple scenarios

---

## Marcus Reid — Chief Operating Officer (COO)

**Expertise:** Operational excellence, Process optimization, Supply chain & logistics, Org scaling, Vendor management, Quality & compliance

**Tasks:**
- **Process Design** — Map and optimize an end-to-end operational process
- **Scaling Plan** — Create a plan to scale operations from current to target capacity
- **Supply Chain Optimization** — Analyze and optimize the supply chain for resilience and cost
- **Vendor Strategy** — Develop vendor evaluation and negotiation strategy
- **Quality System Design** — Design a quality management framework with metrics and controls

---

## Priya Sharma — Chief Technology Officer (CTO)

**Expertise:** Software architecture & system design, Technology strategy, Engineering team building, DevOps & infrastructure, Technical due diligence, AI/ML strategy

**Tasks:**
- **System Architecture** — Design a system architecture with tradeoff analysis and diagrams
- **Technology Stack Evaluation** — Evaluate and recommend a technology stack with rationale
- **Engineering Org Design** — Design the engineering organization structure and roles
- **DevOps Strategy** — Create a DevOps and CI/CD strategy with toolchain and practices
- **AI/ML Strategy** — Develop an AI/ML strategy with use cases and build-vs-buy analysis

---

## Diego Rivera — Chief Marketing Officer (CMO)

**Expertise:** Brand strategy & positioning, Growth marketing & acquisition, Content & storytelling, Marketing analytics, Customer research, Go-to-market strategy

**Tasks:**
- **Brand Strategy** — Develop brand positioning, personality, and messaging framework
- **Go-to-Market Plan** — Create a comprehensive GTM strategy for a product launch
- **Customer Acquisition Strategy** — Design a multi-channel acquisition strategy with funnel and economics
- **Content Strategy** — Build a content strategy with editorial calendar and distribution plan
- **Campaign Plan** — Create a specific marketing campaign with creative, budget, and KPIs

---

## Amara Okafor — Chief Human Resources Officer (CHRO)

**Expertise:** Talent acquisition & retention, Organizational culture, Compensation & benefits, Performance management, DEI strategy, Leadership development

**Tasks:**
- **Hiring Strategy** — Design a hiring process with funnel, scorecard, and interview plan
- **Compensation Framework** — Build a compensation framework with bands, philosophy, and equity guidelines
- **Performance System** — Design a performance management framework with calibration and feedback
- **Culture Strategy** — Assess and strengthen organizational culture with actionable initiatives
- **Organizational Design** — Design an org structure aligned with business strategy

---

## Viktor Novak — Chief Information Security Officer (CISO)

**Expertise:** Information security strategy, Zero Trust architecture, Compliance frameworks (SOC2, ISO 27001, HIPAA), Incident response, Security awareness, Vendor risk management

**Tasks:**
- **Security Program** — Design a comprehensive information security program with controls and metrics
- **Threat Model** — Build a threat model for a system with attack vectors and mitigations
- **Compliance Roadmap** — Create a compliance roadmap for target frameworks with gap analysis
- **Incident Response Plan** — Design an incident response plan with roles, runbooks, and communication
- **Vendor Risk Assessment** — Create a vendor risk assessment framework and evaluate a specific vendor

---

## Lena Bergstrom — Chief Product Officer (CPO)

**Expertise:** Product strategy & vision, Roadmap planning, User research & discovery, Product metrics & experimentation, Pricing & packaging, Product-led growth

**Tasks:**
- **Product Roadmap** — Create a product roadmap with themes, outcomes, and timeline
- **Product Requirements Doc** — Write a PRD with problem, user stories, success metrics, and specs
- **Pricing Strategy** — Develop pricing and packaging strategy with willingness-to-pay analysis
- **Discovery Plan** — Design a product discovery plan with research and validation methods
- **Product Metrics Framework** — Build a metrics framework with north star, input metrics, and guardrails

---

## James Okonkwo — Chief Strategy Officer (CSO)

**Expertise:** Corporate & competitive strategy, Market entry & expansion, M&A strategy and integration, Strategic partnerships, Business model innovation, Scenario planning

**Tasks:}
- **Corporate Strategy** — Develop a corporate strategy with strategic bets and resource allocation
- **Market Entry Analysis** — Analyze a new market entry opportunity with go/no-go recommendation
- **M&A Strategy** — Develop M&A strategy with target criteria and integration plan
- **Partnership Strategy** — Design a strategic partnership framework with evaluation criteria
- **Scenario Planning** — Build scenario plans with triggers, responses, and monitoring

---

## Sophia Reyes — Chief Legal Officer (CLO)

**Expertise:** Corporate governance, Contract law & negotiation, IP strategy & protection, Employment law, Privacy & data protection (GDPR, CCPA), Regulatory compliance

**Tasks:**
- **Contract Review** — Review a contract type with key terms, risks, and negotiation points
- **Governance Framework** — Design a corporate governance framework with policies and procedures
- **IP Strategy** — Develop an intellectual property protection strategy
- **Privacy Compliance** — Create a privacy compliance plan for GDPR/CCPA and data protection
- **Employment Law Guide** — Create an employment law compliance guide for hiring and termination

---

## Advisor System Prompts

Each advisor's behavior is defined by their system prompt in `src/agents/definitions.js`. These prompts encode:

- **Identity & background** — Years of experience, types of companies, career path
- **Thinking frameworks** — The mental models and analytical frameworks they apply
- **Communication style** — How they structure responses and interact with the user
- **Task execution format** — How they structure deliverables when running tasks

To customize an advisor's behavior, edit their `systemPrompt` field. The prompt is sent as the system message in every chat completion call.
