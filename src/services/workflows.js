// Workflow Templates
// Pre-defined multi-advisor flows that map how advisors collaborate
// to produce a coordinated outcome.

export const workflows = [
  {
    id: "market-entry",
    name: "Market Entry Strategy",
    icon: "🌍",
    description:
      "CEO frames the opportunity, CSO analyzes market entry, CFO assesses financials, CMO designs GTM, CLO reviews legal. CEO synthesizes.",
    steps: [
      {
        id: 1,
        agentId: "ceo",
        action: "Frame the market entry opportunity and strategic objectives",
        type: "task",
        outputKey: "strategicFrame",
      },
      {
        id: 2,
        agentId: "cso",
        action: "Analyze market entry options and recommend go/no-go with entry mode",
        type: "task",
        dependsOn: "strategicFrame",
        outputKey: "marketAnalysis",
      },
      {
        id: 3,
        agentId: "cfo",
        action: "Assess financial requirements: investment needed, ROI projection, and risk",
        type: "task",
        dependsOn: "marketAnalysis",
        outputKey: "financialAssessment",
      },
      {
        id: 4,
        agentId: "cmo",
        action: "Design the go-to-market plan for the new market",
        type: "task",
        dependsOn: "marketAnalysis",
        outputKey: "gtmPlan",
      },
      {
        id: 5,
        agentId: "clo",
        action: "Review legal and regulatory requirements for market entry",
        type: "task",
        dependsOn: "marketAnalysis",
        outputKey: "legalReview",
      },
      {
        id: 6,
        agentId: "ceo",
        action: "Synthesize all inputs into a final market entry recommendation",
        type: "synthesize",
        dependsOn: ["strategicFrame", "marketAnalysis", "financialAssessment", "gtmPlan", "legalReview"],
        outputKey: "finalRecommendation",
      },
    ],
  },
  {
    id: "product-launch",
    name: "Product Launch Plan",
    icon: "🚀",
    description:
      "CPO defines the product, CTO assesses technical feasibility, CMO creates launch plan, CFO models the economics, COO plans operations.",
    steps: [
      {
        id: 1,
        agentId: "cpo",
        action: "Define the product vision, target user, and success metrics",
        type: "task",
        outputKey: "productDefinition",
      },
      {
        id: 2,
        agentId: "cto",
        action: "Assess technical feasibility and architecture requirements",
        type: "task",
        dependsOn: "productDefinition",
        outputKey: "techFeasibility",
      },
      {
        id: 3,
        agentId: "cfo",
        action: "Model the unit economics and investment needed for launch",
        type: "task",
        dependsOn: "productDefinition",
        outputKey: "economics",
      },
      {
        id: 4,
        agentId: "coo",
        action: "Plan operational readiness: support, logistics, and scaling",
        type: "task",
        dependsOn: "techFeasibility",
        outputKey: "opsPlan",
      },
      {
        id: 5,
        agentId: "cmo",
        action: "Create the go-to-market and launch campaign plan",
        type: "task",
        dependsOn: "productDefinition",
        outputKey: "launchPlan",
      },
      {
        id: 6,
        agentId: "cpo",
        action: "Synthesize into a unified product launch plan with timeline",
        type: "synthesize",
        dependsOn: ["productDefinition", "techFeasibility", "economics", "opsPlan", "launchPlan"],
        outputKey: "finalPlan",
      },
    ],
  },
  {
    id: "fundraising-prep",
    name: "Fundraising Preparation",
    icon: "💸",
    description:
      "CEO sets the vision narrative, CFO builds the financial model and use of funds, CMO defines market opportunity, CTO outlines tech moat, CSO prepares competitive positioning.",
    steps: [
      {
        id: 1,
        agentId: "ceo",
        action: "Craft the company vision and investment narrative",
        type: "task",
        outputKey: "narrative",
      },
      {
        id: 2,
        agentId: "cfo",
        action: "Build the financial model: current metrics, projections, and use of funds",
        type: "task",
        dependsOn: "narrative",
        outputKey: "financialModel",
      },
      {
        id: 3,
        agentId: "cmo",
        action: "Define the market opportunity size and growth trajectory",
        type: "task",
        dependsOn: "narrative",
        outputKey: "marketOpportunity",
      },
      {
        id: 4,
        agentId: "cto",
        action: "Outline the technology moat and defensibility",
        type: "task",
        dependsOn: "narrative",
        outputKey: "techMoat",
      },
      {
        id: 5,
        agentId: "cso",
        action: "Prepare competitive positioning and differentiation analysis",
        type: "task",
        dependsOn: "narrative",
        outputKey: "competitivePosition",
      },
      {
        id: 6,
        agentId: "ceo",
        action: "Synthesize all sections into a cohesive investor narrative",
        type: "synthesize",
        dependsOn: ["narrative", "financialModel", "marketOpportunity", "techMoat", "competitivePosition"],
        outputKey: "investorPitch",
      },
    ],
  },
  {
    id: "security-audit",
    name: "Security Audit & Compliance",
    icon: "🛡️",
    description:
      "CISO leads security assessment, CTO reviews architecture, COO assesses operational controls, CLO maps compliance requirements, CFO quantifies risk exposure.",
    steps: [
      {
        id: 1,
        agentId: "ciso",
        action: "Conduct a comprehensive security assessment and threat model",
        type: "task",
        outputKey: "securityAssessment",
      },
      {
        id: 2,
        agentId: "cto",
        action: "Review technical architecture for security vulnerabilities",
        type: "task",
        dependsOn: "securityAssessment",
        outputKey: "archReview",
      },
      {
        id: 3,
        agentId: "coo",
        action: "Assess operational controls, access management, and incident readiness",
        type: "task",
        dependsOn: "securityAssessment",
        outputKey: "opsControls",
      },
      {
        id: 4,
        agentId: "clo",
        action: "Map all compliance requirements: GDPR, SOC2, HIPAA as applicable",
        type: "task",
        dependsOn: "securityAssessment",
        outputKey: "complianceMap",
      },
      {
        id: 5,
        agentId: "cfo",
        action: "Quantify the financial risk exposure and cost of remediation",
        type: "task",
        dependsOn: "securityAssessment",
        outputKey: "riskQuantification",
      },
      {
        id: 6,
        agentId: "ciso",
        action: "Synthesize into a unified security remediation plan with priorities",
        type: "synthesize",
        dependsOn: ["securityAssessment", "archReview", "opsControls", "complianceMap", "riskQuantification"],
        outputKey: "remediationPlan",
      },
    ],
  },
  {
    id: "org-restructure",
    name: "Organizational Restructuring",
    icon: "🏗️",
    description:
      "CEO defines strategic intent, CHRO designs the new org structure, CFO models cost impact, COO assesses operational disruption, CPO evaluates product impact.",
    steps: [
      {
        id: 1,
        agentId: "ceo",
        action: "Define the strategic intent and objectives for the restructure",
        type: "task",
        outputKey: "strategicIntent",
      },
      {
        id: 2,
        agentId: "chro",
        action: "Design the new organizational structure, roles, and reporting lines",
        type: "task",
        dependsOn: "strategicIntent",
        outputKey: "orgDesign",
      },
      {
        id: 3,
        agentId: "cfo",
        action: "Model the financial impact: severance, hiring, and ongoing cost",
        type: "task",
        dependsOn: "orgDesign",
        outputKey: "financialImpact",
      },
      {
        id: 4,
        agentId: "coo",
        action: "Assess operational disruption and create a transition plan",
        type: "task",
        dependsOn: "orgDesign",
        outputKey: "transitionPlan",
      },
      {
        id: 5,
        agentId: "cpo",
        action: "Evaluate impact on product roadmaps and customer commitments",
        type: "task",
        dependsOn: "orgDesign",
        outputKey: "productImpact",
      },
      {
        id: 6,
        agentId: "ceo",
        action: "Synthesize into a final restructuring recommendation and plan",
        type: "synthesize",
        dependsOn: ["strategicIntent", "orgDesign", "financialImpact", "transitionPlan", "productImpact"],
        outputKey: "finalPlan",
      },
    ],
  },
];

/**
 * Execute a workflow: run each step in order, passing prior outputs as context.
 * @param {string} workflowId - The workflow ID
 * @param {string} input - The user's input describing the specific situation
 * @param {Object} llmClient - LLM client with complete()
 * @param {function} onProgress - Optional callback(stepIndex, total, stepResult)
 * @returns {Promise<object>} Full workflow execution result
 */
export async function executeWorkflow(workflowId, input, llmClient, onProgress) {
  const { getAgentById } = await import("../agents/definitions.js");
  const workflow = workflows.find((w) => w.id === workflowId);
  if (!workflow) throw new Error(`Unknown workflow: ${workflowId}`);

  const outputs = {};
  const stepResults = [];
  const total = workflow.steps.length;

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const agent = getAgentById(step.agentId);
    if (!agent) continue;

    // Build context from prior steps
    let context = "";
    if (step.dependsOn) {
      const deps = Array.isArray(step.dependsOn) ? step.dependsOn : [step.dependsOn];
      context = deps
        .map((key) => {
          if (outputs[key]) {
            const prevStep = stepResults.find((s) => s.outputKey === key);
            const prevAgent = prevStep ? prevStep.agentName : "";
            return `--- ${prevAgent} output ---\n${outputs[key].slice(0, 1500)}...`;
          }
          return null;
        })
        .filter(Boolean)
        .join("\n\n");
    }

    const isSynthesis = step.type === "synthesize";
    const prompt = isSynthesis
      ? `You are ${agent.name} (${agent.title}), synthesizing the work of your executive team.

WORKFLOW: ${workflow.name}
USER INPUT: ${input}

Your team has contributed the following analyses:
${context}

As the synthesizer, create a unified recommendation that integrates all perspectives. Structure:
1. Executive Summary (2-3 paragraphs)
2. Key Decisions (numbered)
3. Implementation Roadmap (with owners and timelines)
4. Risks & Mitigations
5. Success Metrics

Be specific and actionable. Reference insights from each contributor.`
      : `You are ${agent.name} (${agent.title}), contributing to a coordinated company initiative.

WORKFLOW: ${workflow.name}
USER INPUT: ${input}
YOUR TASK: ${step.action}

${context ? `CONTEXT FROM PRIOR TEAM MEMBERS:\n${context}\n\n` : ""}Provide your expert analysis. Structure your response with clear headings, key points, and recommendations. Be specific to the user's input and build on the context from your team. 300-500 words.`;

    const response = await llmClient.complete({
      system: agent.systemPrompt,
      prompt,
      maxTokens: isSynthesis ? 3000 : 2000,
    });

    outputs[step.outputKey] = response;
    const result = {
      stepId: step.id,
      agentId: agent.id,
      agentName: agent.name,
      agentTitle: agent.shortTitle,
      agentIcon: agent.icon,
      action: step.action,
      type: step.type,
      outputKey: step.outputKey,
      result: response,
      timestamp: new Date().toISOString(),
    };
    stepResults.push(result);

    if (onProgress) onProgress(i + 1, total, result);
  }

  return {
    workflowId,
    workflowName: workflow.name,
    input,
    steps: stepResults,
    finalOutput: stepResults[stepResults.length - 1]?.result,
    executedAt: new Date().toISOString(),
  };
}
