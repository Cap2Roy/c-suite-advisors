// Web Search Service — gives advisors the ability to search the web.
// Uses Tavily API if a key is configured (best results), otherwise
// falls back to DuckDuckGo HTML scraping (no key needed, good enough).
// Results are formatted as context injected into the advisor's prompt.

import "dotenv/config";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
const MAX_RESULTS = 5;

/**
 * Search the web for a query.
 * @param {string} query - The search query
 * @param {number} maxResults - Max number of results (default 5)
 * @returns {Promise<{query, results: Array<{title, url, snippet, source}>}>}
 */
export async function searchWeb(query, maxResults = MAX_RESULTS) {
  if (!query || !query.trim()) {
    return { query, results: [] };
  }

  if (TAVILY_API_KEY) {
    try {
      return await searchWithTavily(query, maxResults);
    } catch (err) {
      console.error("Tavily search failed, falling back to DuckDuckGo:", err.message);
    }
  }

  return searchWithDuckDuckGo(query, maxResults);
}

/**
 * Tavily API search — best quality, requires API key.
 */
async function searchWithTavily(query, maxResults) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      max_results: maxResults,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error ${response.status}`);
  }

  const data = await response.json();
  const results = (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content?.substring(0, 300) || "",
    source: "tavily",
  }));

  // Prepend the AI-generated answer if available
  if (data.answer) {
    results.unshift({
      title: "AI Summary",
      url: "",
      snippet: data.answer,
      source: "tavily-answer",
    });
  }

  return { query, results };
}

/**
 * DuckDuckGo HTML search — no API key needed.
 * Scrapes the lightweight HTML endpoint and parses results.
 */
async function searchWithDuckDuckGo(query, maxResults) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`DuckDuckGo error ${response.status}`);
    }

    const html = await response.text();
    const results = parseDuckDuckGoHtml(html, maxResults);
    return { query, results };
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`Web search failed: ${err.message}`);
  }
}

/**
 * Parse DuckDuckGo HTML results.
 */
function parseDuckDuckGoHtml(html, maxResults) {
  const results = [];
  // DuckDuckGo HTML results have links in <a class="result__a" href="...">title</a>
  // and snippets in <a class="result__snippet">...</a>
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const links = [...html.matchAll(linkRegex)];
  const snippets = [...html.matchAll(snippetRegex)];

  for (let i = 0; i < Math.min(links.length, maxResults); i++) {
    let rawUrl = links[i][1];
    // DuckDuckGo wraps URLs in a redirect: //duckduckgo.com/l/?uddg=<encoded>
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      rawUrl = decodeURIComponent(uddgMatch[1]);
    }
    // Clean relative URLs
    if (rawUrl.startsWith("//")) rawUrl = "https:" + rawUrl;

    const title = stripHtml(links[i][2]).trim();
    const snippet = snippets[i] ? stripHtml(snippets[i][1]).trim() : "";

    if (title && rawUrl) {
      results.push({ title, url: rawUrl, snippet, source: "duckduckgo" });
    }
  }

  return results;
}

function stripHtml(text) {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Format search results as a context block for injection into LLM prompts.
 * @param {Array<{title, url, snippet, source}>} results
 * @returns {string} Formatted context string
 */
export function formatSearchContext(results) {
  if (!results || results.length === 0) return "";

  const formatted = results
    .map((r, i) => {
      const source = r.url ? `[${i + 1}] ${r.title} (${r.url})` : `[${i + 1}] ${r.title}`;
      return `${source}\n${r.snippet}`;
    })
    .join("\n\n");

  return `\n--- Web Search Results ---\n${formatted}\n--- End Web Search Results ---\n`;
}

/**
 * Extract search-relevant keywords from a user message.
 * The LLM model's prompt can include this to guide the search.
 */
export function extractSearchQuery(message) {
  // For now, use the message directly (up to 200 chars).
  // The LLM could generate a search query, but keeping it simple:
  // just use the user's message, truncated.
  return message.substring(0, 200).trim();
}
