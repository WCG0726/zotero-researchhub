/**
 * AI API client - ported from ResearchHub src/utils/ai.js
 * Supports OpenAI-compatible APIs with retry and caching
 */

import { getPref, setPref, PREF_KEYS } from "../prefs";

interface AIConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function getAIConfig(): AIConfig {
  return {
    provider: getPref(PREF_KEYS.AI_PROVIDER) || "openai",
    apiKey: getPref(PREF_KEYS.AI_API_KEY) || "",
    baseUrl: getPref(PREF_KEYS.AI_BASE_URL) || "",
    model: getPref(PREF_KEYS.AI_MODEL) || "gpt-4o-mini",
  };
}

export function isAIConfigured(): boolean {
  return !!getAIConfig().apiKey;
}

function getAPIUrl(config: AIConfig): string {
  return config.provider === "openai"
    ? "https://api.openai.com/v1/chat/completions"
    : config.baseUrl;
}

function validateConfig(): AIConfig {
  const config = getAIConfig();
  if (!config.apiKey) throw new Error('请先在"设置"页面配置 API Key');
  return config;
}

// In-memory cache: TTL 5min, max 50 entries
const _cache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX = 50;

function cacheGet(key: string): string | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key: string, value: string): void {
  if (_cache.size >= CACHE_MAX) {
    const oldest = _cache.keys().next().value;
    if (oldest) _cache.delete(oldest);
  }
  _cache.set(key, { value, ts: Date.now() });
}

function messagesToCacheKey(messages: Array<{ role: string; content: string }>): string {
  return messages.map((m) => m.content.slice(0, 80)).join("|");
}

export async function callAIChat(
  messages: Array<{ role: string; content: string }>,
  options: { temperature?: number; maxTokens?: number; useCache?: boolean } = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2000, useCache = true } = options;

  const cacheKey = useCache
    ? `chat|${messagesToCacheKey(messages)}|${temperature}`
    : null;
  if (cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  const config = validateConfig();
  const url = getAPIUrl(config);

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0)
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || "gpt-4o-mini",
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        lastError = new Error(
          (err as any).error?.message || `API 请求失败 (${resp.status})`
        );
        if (resp.status === 429 || resp.status >= 500) continue;
        throw lastError;
      }
      const data = await resp.json();
      const result = data.choices[0].message.content.trim();
      if (cacheKey) cacheSet(cacheKey, result);
      return result;
    } catch (e: any) {
      lastError = e;
      if (e.message?.includes("API 请求失败")) continue;
      throw e;
    }
  }
  throw lastError;
}

export async function callAI(
  systemPrompt: string,
  userMessage: string,
  options: { temperature?: number; maxTokens?: number; useCache?: boolean } = {}
): Promise<string> {
  return callAIChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    options
  );
}

export async function callAIStream(
  systemPrompt: string,
  userMessage: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    onChunk?: (text: string) => void;
    signal?: AbortSignal;
  } = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2000, onChunk, signal } = options;
  const config = validateConfig();
  const url = getAPIUrl(config);

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0)
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
        signal,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        lastError = new Error(
          (err as any).error?.message || `API 请求失败 (${resp.status})`
        );
        if (resp.status === 429 || resp.status >= 500) continue;
        throw lastError;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onChunk?.(fullText);
            }
          } catch {
            /* skip malformed chunks */
          }
        }
      }
      return fullText;
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      lastError = e;
      if (e.message?.includes("API 请求失败")) continue;
      throw e;
    }
  }
  throw lastError!;
}

// ===== Preset AI functions =====

export async function polishText(
  text: string,
  style: "academic" | "deep" | "sci" = "academic"
): Promise<string> {
  const prompts: Record<string, string> = {
    academic: `You are an expert academic editor. Polish the following text for clarity, coherence, and academic tone. Fix grammar errors, improve word choice, and enhance readability. Keep the original meaning. Output only the polished text.`,
    deep: `You are an expert academic editor. Revise the following text and explain each change:
1. The original sentence
2. The revised sentence
3. Reason for change
Focus on: grammar, clarity, conciseness, academic tone.`,
    sci: `You are a scientific editor for top-tier SCI journals. Thoroughly revise the following manuscript text:
- Ensure precise and concise scientific language
- Eliminate redundancy
- Strengthen logical flow
- Use appropriate hedging
- Ensure terminology consistency
Output the revised text only.`,
  };
  return callAI(prompts[style] || prompts.academic, text, { temperature: 0.3 });
}

export async function translateText(
  text: string,
  direction: "en2zh" | "zh2en" = "en2zh",
  style: "academic" | "natural" | "formal" | "simple" = "academic"
): Promise<string> {
  const prompts: Record<string, Record<string, string>> = {
    en2zh: {
      academic:
        "You are an academic translator. Translate the following text into natural, fluent Chinese suitable for academic papers. Preserve technical terminology. Output only the translation.",
      natural:
        "Translate the following text into natural, fluent Chinese. Output only the translation.",
      formal:
        "Translate the following text into formal business Chinese. Output only the translation.",
      simple:
        "Translate the following text into simple, clear Chinese. Output only the translation.",
    },
    zh2en: {
      academic:
        "You are an academic translator. Translate the following text into polished, publication-ready English suitable for academic papers. Preserve technical terminology. Output only the translation.",
      natural:
        "Translate the following text into natural, fluent English. Output only the translation.",
      formal:
        "Translate the following text into formal business English. Output only the translation.",
      simple:
        "Translate the following text into simple, clear English. Output only the translation.",
    },
  };
  const prompt = prompts[direction]?.[style] || prompts.en2zh.academic;
  return callAI(prompt, text, { temperature: 0.3 });
}

export async function generateEmail(
  scenario: string,
  keyInfo: string
): Promise<string> {
  const prompt = `You are an academic email writer. Generate a professional email in English based on:
- Scenario: ${scenario}
- Key information: ${keyInfo}

Requirements:
- Polite and professional tone
- Appropriate greeting and closing
- Concise and clear
Output the complete email.`;
  return callAI(prompt, keyInfo, { temperature: 0.5, maxTokens: 500 });
}

export async function recommendJournals(
  title: string,
  abstract: string,
  field: string
): Promise<string> {
  const prompt = `You are an academic publishing advisor. Based on the paper title${abstract ? ", abstract," : ""} and research field, recommend 3-5 suitable journals for submission.

For each journal, provide:
1. Journal name (full name + abbreviation)
2. Impact factor range
3. Why it's a good fit (scope match)
4. Acceptance difficulty (easy/moderate/difficult)

Consider: open access options, review speed, and field relevance.
Output in Chinese. Format as a numbered list.`;
  const input = `Title: ${title}\n${abstract ? `Abstract: ${abstract}\n` : ""}Field: ${field || "Not specified"}`;
  return callAI(prompt, input, { temperature: 0.5, maxTokens: 800 });
}

export async function recommendJournalsDetailed(
  title: string,
  abstract: string,
  field: string,
  preferences: Record<string, string> = {}
): Promise<any> {
  const prefStr = Object.entries(preferences)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const prompt = `You are an academic publishing advisor. Recommend 3-5 journals for this paper.

Return a JSON array (no other text, just the JSON):
[{
  "name": "Full Journal Name",
  "abbreviation": "J. Abbrev.",
  "impactFactor": "11.9",
  "scope": "Brief scope description",
  "acceptanceRate": "Easy/Moderate/Difficult",
  "reviewSpeed": "4-6 weeks",
  "openAccess": true,
  "fitScore": 85,
  "reasoning": "Why this journal fits"
}]

${prefStr ? `Preferences: ${prefStr}` : ""}`;
  const input = `Title: ${title}\n${abstract ? `Abstract: ${abstract}\n` : ""}Field: ${field || "Not specified"}`;
  const raw = await callAI(prompt, input, { temperature: 0.5, maxTokens: 1200 });
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : raw;
  } catch {
    return raw;
  }
}

export async function generatePlotCode(
  description: string,
  chartType: string,
  dataFormat: string,
  outputLang: "python" | "origin" = "python"
): Promise<string> {
  const langGuide =
    outputLang === "origin"
      ? "Generate Origin LabTalk script (.ogg) with proper Origin commands."
      : "Generate Python code using matplotlib. Include all necessary imports.";
  const prompt = `You are a scientific plotting expert. Generate complete, runnable ${outputLang} code for the following plot.

Chart type: ${chartType || "auto-detect the best type"}
${dataFormat ? `Data format: ${dataFormat}` : ""}

Requirements:
- ${langGuide}
- Use publication-quality styling (clear fonts, proper labels, legend if needed)
- Include comments explaining each section
- For materials science: use appropriate axis labels, units, and formatting
- The code should be immediately copy-pasteable and runnable

Output only the code, wrapped in a code block.`;
  return callAI(prompt, description, { temperature: 0.3, maxTokens: 1500 });
}

export async function expandInspiration(
  title: string,
  content: string
): Promise<string> {
  const prompt = `You are a research brainstorming assistant. Given a research idea, provide:
1. 可行性分析 (Feasibility): brief assessment
2. 相关方向 (Related Directions): 2-3 suggestions
3. 初步方案框架 (Preliminary Framework): outline
Output in Chinese, be concise.`;
  const input = `Idea: ${title}\nDetails: ${content || "(none)"}`;
  return callAI(prompt, input, { temperature: 0.7, maxTokens: 600 });
}
