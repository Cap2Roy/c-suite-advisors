// Report Generation Service
// Compiles multiple advisor analyses into a unified report.

import { getAgentById } from "../agents/definitions.js";

/**
 * Generate a comprehensive report by having multiple advisors contribute
 * their sections, then synthesizing into an executive summary.
 *
 * @param {object} params
 * @param {string} params.title - Report title
 * @param {string} params.subject - The subject/challenge being analyzed
 * @param {Array<{agentId: string, question: string}>} params.sections - Advisors and their specific questions
 * @param {string} params.synthesizerId - Advisor ID to write the executive summary (default: ceo)
 * @param {Object} llmClient - LLM client with complete()
 * @returns {Promise<object>} Full report with sections and summary
 */
export async function generateReport(params, llmClient) {
  const { title, subject, sections, synthesizerId = "ceo" } = params;

  if (!title || !subject || !sections || sections.length === 0) {
    throw new Error("title, subject, and sections are required");
  }

  // Phase 1: Each advisor contributes their section
  const sectionResults = [];
  for (const section of sections) {
    const agent = getAgentById(section.agentId);
    if (!agent) continue;

    const prompt = `You are contributing a section to a company report.

REPORT TITLE: ${title}
SUBJECT: ${subject}

YOUR SECTION QUESTION: ${section.question}

As ${agent.name} (${agent.title}), provide your expert analysis for this report section. Structure your section with:
- A clear heading with your name and title
- 3-5 key points specific to your domain
- 1-2 concrete recommendations
- 1 key risk to flag

Keep your section to 300-500 words. Be specific to the subject. Use your domain expertise — this is a real report.`;

    const response = await llmClient.complete({
      system: agent.systemPrompt,
      prompt,
      maxTokens: 2000,
    });

    sectionResults.push({
      agent: { id: agent.id, name: agent.name, title: agent.shortTitle, icon: agent.icon },
      question: section.question,
      content: response,
      timestamp: new Date().toISOString(),
    });
  }

  // Phase 2: Synthesizer creates executive summary
  const synthesizer = getAgentById(synthesizerId);
  const sectionDigest = sectionResults
    .map(
      (s) =>
        `--- ${s.agent.name} (${s.agent.title}) ---\n${s.content.slice(0, 800)}...`
    )
    .join("\n\n");

  const synthPrompt = `You are synthesizing a company report. Here are the sections contributed by your executive team:

REPORT TITLE: ${title}
SUBJECT: ${subject}

SECTIONS:
${sectionDigest}

As ${synthesizer.name} (${synthesizer.title}), write the Executive Summary for this report. Synthesize the key themes across all sections. Highlight where advisors agree, where they diverge, and what the priority actions should be.

Structure:
## Executive Summary
- 3-4 paragraph synthesis
## Key Consensus Points
- Bulleted list of where the team agrees
## Priority Actions
- Numbered list of top 5 actions, with owner
## Key Risks
- Bulleted list of risks flagged across sections
## Open Questions
- Questions that need further investigation

Keep it to 400-600 words. This goes to the board.`;

  const summary = await llmClient.complete({
    system: synthesizer.systemPrompt,
    prompt: synthPrompt,
    maxTokens: 2000,
  });

  return {
    title,
    subject,
    generatedAt: new Date().toISOString(),
    sections: sectionResults,
    executiveSummary: summary,
    synthesizer: {
      id: synthesizer.id,
      name: synthesizer.name,
      title: synthesizer.shortTitle,
    },
  };
}

/**
 * Format a report as a single markdown document.
 */
export function formatReportAsMarkdown(report) {
  let md = `# ${report.title}\n\n`;
  md += `**Subject:** ${report.subject}\n`;
  md += `**Generated:** ${report.generatedAt}\n`;
  md += `**Synthesized by:** ${report.synthesizer.name}, ${report.synthesizer.title}\n\n`;
  md += `---\n\n`;
  md += `${report.executiveSummary}\n\n`;
  md += `---\n\n`;

  for (const section of report.sections) {
    md += `## ${section.agent.icon} ${section.agent.name} — ${section.agent.title}\n\n`;
    md += `> ${section.question}\n\n`;
    md += `${section.content}\n\n`;
  }

  return md;
}
