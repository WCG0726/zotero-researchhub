"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/prefs.ts
  function getPref(key) {
    return Zotero.Prefs.get(key);
  }
  function setPref(key, value) {
    Zotero.Prefs.set(key, value);
  }
  var PREF_PREFIX, PREF_KEYS;
  var init_prefs = __esm({
    "src/prefs.ts"() {
      "use strict";
      PREF_PREFIX = "extensions.zotero-researchhub";
      PREF_KEYS = {
        AI_PROVIDER: `${PREF_PREFIX}.ai.provider`,
        AI_API_KEY: `${PREF_PREFIX}.ai.apiKey`,
        AI_BASE_URL: `${PREF_PREFIX}.ai.baseUrl`,
        AI_MODEL: `${PREF_PREFIX}.ai.model`,
        POMODORO_WORK: `${PREF_PREFIX}.pomodoro.workMin`,
        POMODORO_BREAK: `${PREF_PREFIX}.pomodoro.breakMin`,
        LOCALE: `${PREF_PREFIX}.locale`
      };
    }
  });

  // src/modules/ai.ts
  var ai_exports = {};
  __export(ai_exports, {
    callAI: () => callAI,
    callAIChat: () => callAIChat,
    callAIStream: () => callAIStream,
    expandInspiration: () => expandInspiration,
    generateEmail: () => generateEmail,
    generatePlotCode: () => generatePlotCode,
    isAIConfigured: () => isAIConfigured,
    polishText: () => polishText,
    recommendJournals: () => recommendJournals,
    recommendJournalsDetailed: () => recommendJournalsDetailed,
    translateText: () => translateText
  });
  function getAIConfig() {
    return {
      provider: getPref(PREF_KEYS.AI_PROVIDER) || "openai",
      apiKey: getPref(PREF_KEYS.AI_API_KEY) || "",
      baseUrl: getPref(PREF_KEYS.AI_BASE_URL) || "",
      model: getPref(PREF_KEYS.AI_MODEL) || "gpt-4o-mini"
    };
  }
  function isAIConfigured() {
    return !!getAIConfig().apiKey;
  }
  function getAPIUrl(config) {
    return config.provider === "openai" ? "https://api.openai.com/v1/chat/completions" : config.baseUrl;
  }
  function validateConfig() {
    const config = getAIConfig();
    if (!config.apiKey)
      throw new Error('\u8BF7\u5148\u5728"\u8BBE\u7F6E"\u9875\u9762\u914D\u7F6E API Key');
    return config;
  }
  function cacheGet(key) {
    const entry = _cache.get(key);
    if (!entry)
      return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
      _cache.delete(key);
      return null;
    }
    return entry.value;
  }
  function cacheSet(key, value) {
    if (_cache.size >= CACHE_MAX) {
      const oldest = _cache.keys().next().value;
      if (oldest)
        _cache.delete(oldest);
    }
    _cache.set(key, { value, ts: Date.now() });
  }
  function messagesToCacheKey(messages) {
    return messages.map((m) => m.content.slice(0, 80)).join("|");
  }
  async function callAIChat(messages, options = {}) {
    const { temperature = 0.7, maxTokens = 2e3, useCache = true } = options;
    const cacheKey = useCache ? `chat|${messagesToCacheKey(messages)}|${temperature}` : null;
    if (cacheKey) {
      const cached = cacheGet(cacheKey);
      if (cached)
        return cached;
    }
    const config = validateConfig();
    const url = getAPIUrl(config);
    let lastError;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0)
        await new Promise((r) => setTimeout(r, 1e3 * Math.pow(2, attempt - 1)));
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model || "gpt-4o-mini",
            messages,
            temperature,
            max_tokens: maxTokens
          })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          lastError = new Error(
            err.error?.message || `API \u8BF7\u6C42\u5931\u8D25 (${resp.status})`
          );
          if (resp.status === 429 || resp.status >= 500)
            continue;
          throw lastError;
        }
        const data = await resp.json();
        const result = data.choices[0].message.content.trim();
        if (cacheKey)
          cacheSet(cacheKey, result);
        return result;
      } catch (e) {
        lastError = e;
        if (e.message?.includes("API \u8BF7\u6C42\u5931\u8D25"))
          continue;
        throw e;
      }
    }
    throw lastError;
  }
  async function callAI(systemPrompt, userMessage, options = {}) {
    return callAIChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      options
    );
  }
  async function callAIStream(systemPrompt, userMessage, options = {}) {
    const { temperature = 0.7, maxTokens = 2e3, onChunk, signal } = options;
    const config = validateConfig();
    const url = getAPIUrl(config);
    let lastError;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0)
        await new Promise((r) => setTimeout(r, 1e3 * Math.pow(2, attempt - 1)));
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model || "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage }
            ],
            temperature,
            max_tokens: maxTokens,
            stream: true
          }),
          signal
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          lastError = new Error(
            err.error?.message || `API \u8BF7\u6C42\u5931\u8D25 (${resp.status})`
          );
          if (resp.status === 429 || resp.status >= 500)
            continue;
          throw lastError;
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done)
            break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: "))
              continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]")
              break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                onChunk?.(fullText);
              }
            } catch {
            }
          }
        }
        return fullText;
      } catch (e) {
        if (e.name === "AbortError")
          throw e;
        lastError = e;
        if (e.message?.includes("API \u8BF7\u6C42\u5931\u8D25"))
          continue;
        throw e;
      }
    }
    throw lastError;
  }
  async function polishText(text, style = "academic") {
    const prompts = {
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
Output the revised text only.`
    };
    return callAI(prompts[style] || prompts.academic, text, { temperature: 0.3 });
  }
  async function translateText(text, direction = "en2zh", style = "academic") {
    const prompts = {
      en2zh: {
        academic: "You are an academic translator. Translate the following text into natural, fluent Chinese suitable for academic papers. Preserve technical terminology. Output only the translation.",
        natural: "Translate the following text into natural, fluent Chinese. Output only the translation.",
        formal: "Translate the following text into formal business Chinese. Output only the translation.",
        simple: "Translate the following text into simple, clear Chinese. Output only the translation."
      },
      zh2en: {
        academic: "You are an academic translator. Translate the following text into polished, publication-ready English suitable for academic papers. Preserve technical terminology. Output only the translation.",
        natural: "Translate the following text into natural, fluent English. Output only the translation.",
        formal: "Translate the following text into formal business English. Output only the translation.",
        simple: "Translate the following text into simple, clear English. Output only the translation."
      }
    };
    const prompt2 = prompts[direction]?.[style] || prompts.en2zh.academic;
    return callAI(prompt2, text, { temperature: 0.3 });
  }
  async function generateEmail(scenario, keyInfo) {
    const prompt2 = `You are an academic email writer. Generate a professional email in English based on:
- Scenario: ${scenario}
- Key information: ${keyInfo}

Requirements:
- Polite and professional tone
- Appropriate greeting and closing
- Concise and clear
Output the complete email.`;
    return callAI(prompt2, keyInfo, { temperature: 0.5, maxTokens: 500 });
  }
  async function recommendJournals(title, abstract, field) {
    const prompt2 = `You are an academic publishing advisor. Based on the paper title${abstract ? ", abstract," : ""} and research field, recommend 3-5 suitable journals for submission.

For each journal, provide:
1. Journal name (full name + abbreviation)
2. Impact factor range
3. Why it's a good fit (scope match)
4. Acceptance difficulty (easy/moderate/difficult)

Consider: open access options, review speed, and field relevance.
Output in Chinese. Format as a numbered list.`;
    const input = `Title: ${title}
${abstract ? `Abstract: ${abstract}
` : ""}Field: ${field || "Not specified"}`;
    return callAI(prompt2, input, { temperature: 0.5, maxTokens: 800 });
  }
  async function recommendJournalsDetailed(title, abstract, field, preferences = {}) {
    const prefStr = Object.entries(preferences).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ");
    const prompt2 = `You are an academic publishing advisor. Recommend 3-5 journals for this paper.

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
    const input = `Title: ${title}
${abstract ? `Abstract: ${abstract}
` : ""}Field: ${field || "Not specified"}`;
    const raw = await callAI(prompt2, input, { temperature: 0.5, maxTokens: 1200 });
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : raw;
    } catch {
      return raw;
    }
  }
  async function generatePlotCode(description, chartType, dataFormat, outputLang = "python") {
    const langGuide = outputLang === "origin" ? "Generate Origin LabTalk script (.ogg) with proper Origin commands." : "Generate Python code using matplotlib. Include all necessary imports.";
    const prompt2 = `You are a scientific plotting expert. Generate complete, runnable ${outputLang} code for the following plot.

Chart type: ${chartType || "auto-detect the best type"}
${dataFormat ? `Data format: ${dataFormat}` : ""}

Requirements:
- ${langGuide}
- Use publication-quality styling (clear fonts, proper labels, legend if needed)
- Include comments explaining each section
- For materials science: use appropriate axis labels, units, and formatting
- The code should be immediately copy-pasteable and runnable

Output only the code, wrapped in a code block.`;
    return callAI(prompt2, description, { temperature: 0.3, maxTokens: 1500 });
  }
  async function expandInspiration(title, content) {
    const prompt2 = `You are a research brainstorming assistant. Given a research idea, provide:
1. \u53EF\u884C\u6027\u5206\u6790 (Feasibility): brief assessment
2. \u76F8\u5173\u65B9\u5411 (Related Directions): 2-3 suggestions
3. \u521D\u6B65\u65B9\u6848\u6846\u67B6 (Preliminary Framework): outline
Output in Chinese, be concise.`;
    const input = `Idea: ${title}
Details: ${content || "(none)"}`;
    return callAI(prompt2, input, { temperature: 0.7, maxTokens: 600 });
  }
  var _cache, CACHE_TTL, CACHE_MAX;
  var init_ai = __esm({
    "src/modules/ai.ts"() {
      "use strict";
      init_prefs();
      _cache = /* @__PURE__ */ new Map();
      CACHE_TTL = 5 * 60 * 1e3;
      CACHE_MAX = 50;
    }
  });

  // src/modules/storage.ts
  var _dataDir = null;
  function getDataDir() {
    if (!_dataDir) {
      _dataDir = Zotero.DataDirectory.dir + "/researchhub";
    }
    return _dataDir;
  }
  async function ensureDir() {
    const dir = getDataDir();
    const nsIFile = new Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
    nsIFile.initWithPath(dir);
    if (!nsIFile.exists()) {
      nsIFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 493);
    }
  }
  function getFilePath(key) {
    return `${getDataDir()}/${key}.json`;
  }
  async function getJson(key, defaultValue) {
    try {
      const path = getFilePath(key);
      const content = await Zotero.File.getContentsAsync(path);
      if (content) {
        return JSON.parse(content);
      }
    } catch {
    }
    return defaultValue;
  }
  async function setJson(key, data) {
    await ensureDir();
    const path = getFilePath(key);
    const content = JSON.stringify(data, null, 2);
    await Zotero.File.putContentsAsync(path, content);
  }
  async function exportAll() {
    const keys = [
      "checkins",
      "pomodoro",
      "water",
      "meals",
      "customSnippets",
      "customEmailTemplates",
      "customPolishPrompts",
      "customPlotNotes",
      "inspirations",
      "polishHistory"
    ];
    const result = {};
    for (const key of keys) {
      try {
        result[key] = await getJson(key, null);
      } catch {
      }
    }
    return JSON.stringify(result, null, 2);
  }
  async function importAll(jsonStr, mode) {
    const data = JSON.parse(jsonStr);
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === void 0)
        continue;
      if (mode === "merge") {
        const existing = await getJson(key, Array.isArray(value) ? [] : {});
        if (Array.isArray(value) && Array.isArray(existing)) {
          const merged = [...existing, ...value];
          const seen = /* @__PURE__ */ new Set();
          const deduped = merged.filter((item) => {
            const id = item.id || JSON.stringify(item);
            if (seen.has(id))
              return false;
            seen.add(id);
            return true;
          });
          await setJson(key, deduped);
        } else if (typeof value === "object" && typeof existing === "object") {
          await setJson(key, { ...existing, ...value });
        } else {
          await setJson(key, value);
        }
      } else {
        await setJson(key, value);
      }
    }
  }

  // src/modules/checkin.ts
  function todayDate() {
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString("zh-CN");
  }
  function formatDuration(ms) {
    const hours = Math.floor(ms / 36e5);
    const minutes = Math.floor(ms % 36e5 / 6e4);
    return `${hours}\u5C0F\u65F6${minutes}\u5206\u949F`;
  }
  async function loadCheckins() {
    return getJson("checkins", {});
  }
  async function clockIn() {
    const checkins = await loadCheckins();
    const today = todayDate();
    if (!checkins[today])
      checkins[today] = {};
    if (checkins[today].clockIn)
      return false;
    checkins[today].clockIn = (/* @__PURE__ */ new Date()).toISOString();
    await setJson("checkins", checkins);
    return true;
  }
  async function clockOut() {
    const checkins = await loadCheckins();
    const today = todayDate();
    if (!checkins[today]?.clockIn || checkins[today].clockOut)
      return false;
    checkins[today].clockOut = (/* @__PURE__ */ new Date()).toISOString();
    await setJson("checkins", checkins);
    return true;
  }
  async function getClockStatus() {
    const checkins = await loadCheckins();
    const today = todayDate();
    const record = checkins[today];
    if (!record)
      return { clockedIn: false, clockedOut: false, clockInTime: "", clockOutTime: "", duration: "" };
    return {
      clockedIn: !!record.clockIn,
      clockedOut: !!record.clockOut,
      clockInTime: record.clockIn ? formatTime(record.clockIn) : "",
      clockOutTime: record.clockOut ? formatTime(record.clockOut) : "",
      duration: record.clockIn && record.clockOut ? formatDuration(
        new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()
      ) : ""
    };
  }
  async function getStreak() {
    const checkins = await loadCheckins();
    const today = /* @__PURE__ */ new Date();
    let current = 0;
    let longest = 0;
    let tempStreak = 0;
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      if (checkins[dateStr]) {
        tempStreak++;
        if (i === current)
          current = tempStreak;
      } else {
        longest = Math.max(longest, tempStreak);
        tempStreak = 0;
        if (i === current)
          break;
      }
    }
    longest = Math.max(longest, tempStreak);
    return { current, longest, total: Object.keys(checkins).length };
  }
  async function getCalendarDays(year, month) {
    const checkins = await loadCheckins();
    const today = todayDate();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const days = [];
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, day: d, isToday: false, hasCheckin: !!checkins[dateStr], isCurrentMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, day: d, isToday: dateStr === today, hasCheckin: !!checkins[dateStr], isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, day: d, isToday: false, hasCheckin: !!checkins[dateStr], isCurrentMonth: false });
    }
    return days;
  }
  async function getWeekDays() {
    const checkins = await loadCheckins();
    const today = /* @__PURE__ */ new Date();
    const labels = ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
    const days = [];
    const dayOfWeek = today.getDay();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOfWeek + i);
      const dateStr = date.toISOString().split("T")[0];
      days.push({
        label: labels[i],
        date: dateStr,
        isToday: dateStr === todayDate(),
        hasCheckin: !!checkins[dateStr]
      });
    }
    return days;
  }

  // src/modules/rank.ts
  var TIERS = [
    { name: "\u5B9E\u4E60\u751F", icon: "\u{1F331}", color: "#94a3b8", minXP: 0 },
    { name: "\u7814\u7A76\u52A9\u7406", icon: "\u{1F535}", color: "#3b82f6", minXP: 50 },
    { name: "\u521D\u7EA7\u7814\u7A76\u5458", icon: "\u{1F7E2}", color: "#22c55e", minXP: 150 },
    { name: "\u4E2D\u7EA7\u7814\u7A76\u5458", icon: "\u{1F7E1}", color: "#eab308", minXP: 350 },
    { name: "\u9AD8\u7EA7\u7814\u7A76\u5458", icon: "\u{1F7E0}", color: "#f97316", minXP: 700 },
    { name: "\u8D44\u6DF1\u7814\u7A76\u5458", icon: "\u{1F534}", color: "#ef4444", minXP: 1200 },
    { name: "\u9996\u5E2D\u79D1\u5B66\u5BB6", icon: "\u{1F7E3}", color: "#a855f7", minXP: 2e3 },
    { name: "\u5B66\u672F\u6CF0\u6597", icon: "\u2B50", color: "#f59e0b", minXP: 3500 }
  ];
  function calculateXP(data) {
    const {
      checkinDays = 0,
      maxStreak = 0,
      currentStreak = 0,
      pomodoroCount = 0,
      recordsCount = 0,
      litNotesCount = 0,
      experimentsCount = 0,
      milestonesCount = 0,
      meetingsCount = 0,
      inspirationsCount = 0
    } = data;
    return currentStreak * 3 + maxStreak * 2 + checkinDays * 1 + pomodoroCount * 2 + recordsCount * 3 + litNotesCount * 4 + experimentsCount * 3 + milestonesCount * 5 + meetingsCount * 2 + inspirationsCount * 1;
  }
  function getTier(xp) {
    let tier = TIERS[0];
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (xp >= TIERS[i].minXP) {
        tier = TIERS[i];
        break;
      }
    }
    const tierIndex = TIERS.indexOf(tier);
    const nextTier = tierIndex < TIERS.length - 1 ? TIERS[tierIndex + 1] : null;
    let progress = 1;
    if (nextTier) {
      const rangeXP = nextTier.minXP - tier.minXP;
      const earnedXP = xp - tier.minXP;
      progress = Math.min(1, earnedXP / rangeXP);
    }
    return { tier, nextTier, progress, xp };
  }

  // src/ui/tabs/checkinTab.ts
  var _interval = null;
  async function render(container) {
    const status = await getClockStatus();
    const streak = await getStreak();
    const weekDays = await getWeekDays();
    const now = /* @__PURE__ */ new Date();
    const calDays = await getCalendarDays(now.getFullYear(), now.getMonth());
    const xp = calculateXP({ checkinDays: streak.total, maxStreak: streak.longest, currentStreak: streak.current });
    const tierInfo = getTier(xp);
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-text-center rh-mb-12">
        <div class="rh-rank-badge" style="background:${tierInfo.tier.color}22;color:${tierInfo.tier.color}">
          ${tierInfo.tier.icon} ${tierInfo.tier.name}
        </div>
        <div class="rh-text-sm rh-mt-8">XP: ${xp}${tierInfo.nextTier ? ` / ${tierInfo.nextTier.minXP}` : ""}</div>
        ${tierInfo.nextTier ? `
          <div class="rh-progress rh-mt-8" style="max-width:200px;margin:8px auto 0">
            <div class="rh-progress-bar" style="width:${Math.round(tierInfo.progress * 100)}%;background:${tierInfo.tier.color}"></div>
          </div>
        ` : ""}
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-text-center">
        <div id="rh-clock-status" style="font-size:18px;font-weight:600;margin-bottom:12px">
          ${status.clockedIn ? status.clockedOut ? `\u5DF2\u4E0B\u73ED \xB7 \u5DE5\u4F5C ${status.duration}` : `\u5DF2\u4E0A\u73ED \xB7 ${status.clockInTime}` : "\u5C1A\u672A\u6253\u5361"}
        </div>
        <div class="rh-flex" style="justify-content:center;gap:12px">
          <button class="rh-btn rh-btn-success" id="rh-clockin-btn" ${status.clockedIn ? 'disabled style="opacity:0.5"' : ""}>
            \u4E0A\u73ED\u6253\u5361
          </button>
          <button class="rh-btn rh-btn-danger" id="rh-clockout-btn" ${!status.clockedIn || status.clockedOut ? 'disabled style="opacity:0.5"' : ""}>
            \u4E0B\u73ED\u6253\u5361
          </button>
        </div>
        <div class="rh-text-sm rh-mt-8" id="rh-duration-display"></div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">\u672C\u5468\u6253\u5361</div>
      <div class="rh-week-bar">
        ${weekDays.map((d) => `
          <div class="rh-week-day ${d.hasCheckin ? "has-checkin" : ""} ${d.isToday ? "is-today" : ""}">
            <div style="font-weight:600">${d.label}</div>
            <div style="font-size:16px">${d.hasCheckin ? "\u2713" : ""}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-flex" style="justify-content:space-between;margin-bottom:8px">
        <button class="rh-btn" id="rh-cal-prev">\u25C0</button>
        <span style="font-weight:600">${now.getFullYear()}\u5E74${now.getMonth() + 1}\u6708</span>
        <button class="rh-btn" id="rh-cal-next">\u25B6</button>
      </div>
      <div class="rh-calendar">
        ${["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"].map((d) => `<div class="rh-calendar-header">${d}</div>`).join("")}
        ${calDays.map((d) => `
          <div class="rh-calendar-day ${d.hasCheckin ? "has-checkin" : ""} ${d.isToday ? "is-today" : ""} ${!d.isCurrentMonth ? "other-month" : ""}">
            ${d.day}
          </div>
        `).join("")}
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-grid-3 rh-text-center">
        <div><div style="font-size:24px;font-weight:700;color:#22c55e">${streak.current}</div><div class="rh-text-sm">\u8FDE\u7EED\u6253\u5361</div></div>
        <div><div style="font-size:24px;font-weight:700;color:#f97316">${streak.longest}</div><div class="rh-text-sm">\u6700\u957F\u8FDE\u7EED</div></div>
        <div><div style="font-size:24px;font-weight:700;color:#3b82f6">${streak.total}</div><div class="rh-text-sm">\u603B\u6253\u5361\u5929\u6570</div></div>
      </div>
    </div>
  `;
    container.querySelector("#rh-clockin-btn")?.addEventListener("click", async () => {
      const success = await clockIn();
      if (success)
        render(container);
    });
    container.querySelector("#rh-clockout-btn")?.addEventListener("click", async () => {
      const success = await clockOut();
      if (success)
        render(container);
    });
    if (status.clockedIn && !status.clockedOut) {
      const statusEl = container.querySelector("#rh-clock-status");
      _interval = setInterval(async () => {
        const s = await getClockStatus();
        if (s.clockedIn && !s.clockedOut) {
          statusEl.textContent = `\u5DF2\u4E0A\u73ED \xB7 ${s.clockInTime}`;
        }
      }, 6e4);
    }
  }
  function destroy() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
  }

  // src/modules/pomodoro.ts
  init_prefs();
  function todayDate2() {
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
  async function loadStats() {
    return getJson("pomodoro", {
      total: 0,
      today: 0,
      todayDate: "",
      history: []
    });
  }
  async function addSession(minutes) {
    const stats = await loadStats();
    const today = todayDate2();
    if (stats.todayDate !== today) {
      stats.todayDate = today;
      stats.today = 0;
    }
    stats.total++;
    stats.today++;
    stats.history.push({ date: today, minutes, time: (/* @__PURE__ */ new Date()).toISOString() });
    if (stats.history.length > 500)
      stats.history = stats.history.slice(-500);
    await setJson("pomodoro", stats);
    return stats;
  }
  function getWorkMinutes() {
    return getPref(PREF_KEYS.POMODORO_WORK) || 25;
  }
  function getBreakMinutes() {
    return getPref(PREF_KEYS.POMODORO_BREAK) || 5;
  }

  // src/ui/tabs/pomodoroTab.ts
  init_prefs();
  var _interval2 = null;
  var _remaining = 0;
  var _isRunning = false;
  var _isBreak = false;
  async function render2(container) {
    const stats = await loadStats();
    const workMin = getWorkMinutes();
    const breakMin = getBreakMinutes();
    if (!_isRunning) {
      _remaining = (_isBreak ? breakMin : workMin) * 60;
    }
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">\u756A\u8304\u949F</div>
      <div class="rh-timer" id="rh-timer-display">${formatTime2(_remaining)}</div>
      <div class="rh-text-center rh-text-sm rh-mb-12" id="rh-timer-label">${_isBreak ? "\u4F11\u606F\u65F6\u95F4" : "\u4E13\u6CE8\u65F6\u95F4"}</div>
      <div class="rh-flex" style="justify-content:center;gap:12px">
        <button class="rh-btn rh-btn-primary" id="rh-timer-start">${_isRunning ? "\u6682\u505C" : "\u5F00\u59CB"}</button>
        <button class="rh-btn" id="rh-timer-reset">\u91CD\u7F6E</button>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-grid-2">
        <div class="rh-text-center">
          <div style="font-size:28px;font-weight:700;color:#ef4444">${stats.today || 0}</div>
          <div class="rh-text-sm">\u4ECA\u65E5\u756A\u8304</div>
        </div>
        <div class="rh-text-center">
          <div style="font-size:28px;font-weight:700;color:#3b82f6">${stats.total}</div>
          <div class="rh-text-sm">\u603B\u8BA1\u756A\u8304</div>
        </div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">\u8BBE\u7F6E</div>
      <div class="rh-grid-2">
        <div>
          <label class="rh-text-sm">\u4E13\u6CE8 (\u5206\u949F)</label>
          <input class="rh-input" type="number" id="rh-work-min" value="${workMin}" min="1" max="120"/>
        </div>
        <div>
          <label class="rh-text-sm">\u4F11\u606F (\u5206\u949F)</label>
          <input class="rh-input" type="number" id="rh-break-min" value="${breakMin}" min="1" max="60"/>
        </div>
      </div>
    </div>

    ${stats.history.length > 0 ? `
      <div class="rh-card">
        <div class="rh-card-title">\u6700\u8FD1\u8BB0\u5F55</div>
        <div class="rh-scroll-list">
          ${stats.history.slice(-10).reverse().map((h) => `
            <div style="padding:4px 0;font-size:12px;color:#666">
              ${new Date(h.time).toLocaleDateString("zh-CN")} ${new Date(h.time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} - ${h.minutes}\u5206\u949F
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}
  `;
    const display = container.querySelector("#rh-timer-display");
    const label = container.querySelector("#rh-timer-label");
    const startBtn = container.querySelector("#rh-timer-start");
    startBtn?.addEventListener("click", () => {
      if (_isRunning) {
        stopTimer();
        startBtn.textContent = "\u7EE7\u7EED";
      } else {
        startTimer(display, label, startBtn, container);
        startBtn.textContent = "\u6682\u505C";
      }
    });
    container.querySelector("#rh-timer-reset")?.addEventListener("click", () => {
      stopTimer();
      _isBreak = false;
      _remaining = getWorkMinutes() * 60;
      display.textContent = formatTime2(_remaining);
      label.textContent = "\u4E13\u6CE8\u65F6\u95F4";
      startBtn.textContent = "\u5F00\u59CB";
    });
    container.querySelector("#rh-work-min")?.addEventListener("change", (e) => {
      const val = parseInt(e.target.value);
      if (val > 0)
        setPref(PREF_KEYS.POMODORO_WORK, val);
      if (!_isRunning && !_isBreak) {
        _remaining = val * 60;
        display.textContent = formatTime2(_remaining);
      }
    });
    container.querySelector("#rh-break-min")?.addEventListener("change", (e) => {
      const val = parseInt(e.target.value);
      if (val > 0)
        setPref(PREF_KEYS.POMODORO_BREAK, val);
      if (!_isRunning && _isBreak) {
        _remaining = val * 60;
        display.textContent = formatTime2(_remaining);
      }
    });
  }
  function startTimer(display, label, btn, container) {
    _isRunning = true;
    _interval2 = setInterval(async () => {
      _remaining--;
      display.textContent = formatTime2(_remaining);
      if (_remaining <= 0) {
        stopTimer();
        if (!_isBreak) {
          await addSession(getWorkMinutes());
          _isBreak = true;
          _remaining = getBreakMinutes() * 60;
          label.textContent = "\u4F11\u606F\u65F6\u95F4";
          display.textContent = formatTime2(_remaining);
          btn.textContent = "\u5F00\u59CB";
          render2(container);
        } else {
          _isBreak = false;
          _remaining = getWorkMinutes() * 60;
          label.textContent = "\u4E13\u6CE8\u65F6\u95F4";
          display.textContent = formatTime2(_remaining);
          btn.textContent = "\u5F00\u59CB";
        }
      }
    }, 1e3);
  }
  function stopTimer() {
    _isRunning = false;
    if (_interval2) {
      clearInterval(_interval2);
      _interval2 = null;
    }
  }
  function formatTime2(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function destroy2() {
    stopTimer();
  }

  // src/data/polishPrompts.ts
  var POLISH_PROMPTS = [
    { id: 1, cat: "polish", title: "\u5B66\u672F\u6DA6\u8272\uFF08\u901A\u7528\uFF09", desc: "\u9002\u7528\u4E8E\u5927\u591A\u6570\u5B66\u672F\u6BB5\u843D\u7684\u6DA6\u8272", text: `Please polish the following academic text for clarity, coherence, and readability. Maintain the original meaning and technical accuracy. Fix any grammar, spelling, or punctuation errors. Improve sentence flow and word choice. Output the polished version only.

Text to polish:
[Paste your text here]` },
    { id: 2, cat: "polish", title: "\u6DF1\u5EA6\u6DA6\u8272\uFF08\u542B\u4FEE\u6539\u8BF4\u660E\uFF09", desc: "\u4E0D\u4EC5\u6DA6\u8272\uFF0C\u8FD8\u89E3\u91CA\u6BCF\u5904\u4FEE\u6539\u7684\u539F\u56E0", text: `Please polish the following academic text. For each change you make, provide:
1. The original sentence
2. The revised sentence
3. A brief explanation of why the change was made

Focus on: grammar, clarity, conciseness, academic tone, and natural flow.

Text to polish:
[Paste your text here]` },
    { id: 3, cat: "polish", title: "SCI \u671F\u520A\u7EA7\u522B\u6DA6\u8272", desc: "\u9488\u5BF9\u9AD8\u5F71\u54CD\u56E0\u5B50\u671F\u520A\u7684\u4E25\u683C\u6DA6\u8272\u6807\u51C6", text: `You are an expert scientific editor for top-tier SCI journals. Please thoroughly revise the following manuscript text to meet the highest publication standards:
1. Ensure precise and concise scientific language
2. Eliminate redundancy and wordiness
3. Strengthen logical flow
4. Use appropriate hedging language
5. Ensure consistency in terminology

Original text:
[Paste your text here]` },
    { id: 4, cat: "grammar", title: "\u8BED\u6CD5\u68C0\u67E5\u4E0E\u4FEE\u590D", desc: "\u4E13\u6CE8\u8BED\u6CD5\u9519\u8BEF\u7684\u68C0\u67E5\u548C\u4FEE\u6B63", text: `Please check the following academic text for grammar errors. For each error found:
1. Quote the original phrase
2. Explain the error type
3. Provide the correction

Then output the fully corrected version.

Text to check:
[Paste your text here]` },
    { id: 5, cat: "grammar", title: "\u51A0\u8BCD\u548C\u4ECB\u8BCD\u4FEE\u6B63", desc: "\u7279\u522B\u9488\u5BF9\u4E2D\u56FD\u5B66\u751F\u5E38\u89C1\u7684\u51A0\u8BCD\u4ECB\u8BCD\u9519\u8BEF", text: `Please review the following English text, focusing specifically on:
1. Article usage (a/an/the)
2. Preposition choice
3. Singular/plural noun agreement

For each correction, explain the grammar rule involved.

Text to review:
[Paste your text here]` },
    { id: 6, cat: "concise", title: "\u7CBE\u7B80\u538B\u7F29", desc: "\u5728\u4E0D\u4E22\u5931\u4FE1\u606F\u7684\u524D\u63D0\u4E0B\u538B\u7F29\u5B57\u6570", text: `Please condense the following text while preserving all key information. Target: reduce word count by 20-30% without losing meaning.

Original text:
[Paste your text here]` },
    { id: 7, cat: "concise", title: "\u6D88\u9664\u5197\u4F59\u8868\u8FBE", desc: "\u8BC6\u522B\u5E76\u5220\u9664\u4E0D\u5FC5\u8981\u7684\u4FEE\u9970\u548C\u91CD\u590D", text: `Please identify and eliminate redundant expressions in the following academic text.

Text:
[Paste your text here]` },
    { id: 8, cat: "academic", title: "\u5B66\u672F\u53E5\u5F0F\u5347\u7EA7", desc: "\u5C06\u666E\u901A\u8868\u8FBE\u66FF\u6362\u4E3A\u9AD8\u7EA7\u5B66\u672F\u8868\u8FBE", text: `Please upgrade the following text to use more sophisticated academic language. Replace common/vague expressions with precise, field-appropriate terminology.

Text to upgrade:
[Paste your text here]` },
    { id: 9, cat: "academic", title: "\u88AB\u52A8\u8BED\u6001\u8F6C\u6362", desc: "\u5C06\u4E3B\u52A8\u8BED\u6001\u8F6C\u4E3A\u5B66\u672F\u5E38\u7528\u7684\u88AB\u52A8\u8BED\u6001", text: `Please convert the following text to use appropriate academic passive voice where suitable.

Text:
[Paste your text here]` },
    { id: 10, cat: "structure", title: "\u6BB5\u843D\u903B\u8F91\u4F18\u5316", desc: "\u68C0\u67E5\u6BB5\u843D\u5185\u90E8\u7684\u903B\u8F91\u8FDE\u8D2F\u6027", text: `Please analyze the logical flow of the following paragraph(s). Check topic sentence clarity, supporting sentences relevance, transition smoothness. Suggest restructuring if needed.

Text:
[Paste your text here]` },
    { id: 11, cat: "structure", title: "Introduction \u6BB5\u843D\u91CD\u7EC4", desc: "\u6309\u7167\u6F0F\u6597\u7ED3\u6784\u91CD\u7EC4\u5F15\u8A00\u6BB5\u843D", text: `Please restructure the following Introduction paragraph(s) following the "funnel" structure:
1. Start broad (general context)
2. Narrow down (specific problem/gap)
3. State the purpose/objective
4. Briefly mention approach/methods

Text:
[Paste your text here]` },
    { id: 12, cat: "cn2en", title: "\u4E2D\u6587\u8BBA\u6587\u82F1\u8BD1\uFF08\u5B66\u672F\uFF09", desc: "\u5C06\u4E2D\u6587\u5B66\u672F\u6587\u672C\u7FFB\u8BD1\u4E3A\u5730\u9053\u82F1\u6587", text: `You are a professional academic translator. Please translate the following Chinese text into publication-ready English.

Chinese text:
[Paste your text here]` },
    { id: 13, cat: "cn2en", title: "\u9010\u53E5\u5BF9\u7167\u7FFB\u8BD1", desc: "\u4E2D\u82F1\u5BF9\u7167\uFF0C\u4FBF\u4E8E\u68C0\u67E5\u548C\u5B66\u4E60", text: `Please translate the following Chinese academic text into English, sentence by sentence with bilingual alignment.

Chinese text:
[Paste your text here]` },
    { id: 14, cat: "response", title: "\u5BA1\u7A3F\u610F\u89C1\u56DE\u590D\u6A21\u677F", desc: "\u751F\u6210\u89C4\u8303\u7684\u5BA1\u7A3F\u610F\u89C1\u56DE\u590D", text: `Please help me draft a professional response to the following reviewer comment.

Reviewer comment:
[Paste reviewer comment here]` },
    { id: 15, cat: "response", title: "Cover Letter \u751F\u6210", desc: "\u6839\u636E\u8BBA\u6587\u6807\u9898\u548C\u6458\u8981\u751F\u6210\u6295\u7A3F\u4FE1", text: `Please write a professional cover letter for journal submission.

Manuscript title: [Your title]
Target journal: [Journal name]
Key findings: [Brief description]` },
    { id: 16, cat: "thermo", title: "\u70ED\u7535\u6750\u6599\u8BBA\u6587 Introduction", desc: "\u4E13\u4E3A\u70ED\u7535\u6750\u6599\u7814\u7A76\u8BBE\u8BA1\u7684\u5F15\u8A00\u6A21\u677F", text: `Please help me write/polish an Introduction section for a thermoelectric materials paper.

Material system: [e.g., SnSe, Bi2Te3]
Key finding: [Your main result]` },
    { id: 17, cat: "cn_polish", title: "\u4E2D\u6587\u5B66\u672F\u6DA6\u8272\uFF08\u901A\u7528\uFF09", desc: "\u9002\u7528\u4E8E\u5927\u591A\u6570\u4E2D\u6587\u5B66\u672F\u6587\u672C\u7684\u6DA6\u8272", text: `\u8BF7\u5BF9\u4EE5\u4E0B\u4E2D\u6587\u5B66\u672F\u6587\u672C\u8FDB\u884C\u6DA6\u8272\uFF0C\u8981\u6C42\uFF1A\u4FEE\u6B63\u8BED\u6CD5\u548C\u6807\u70B9\u9519\u8BEF\uFF0C\u6539\u5584\u53E5\u5B50\u6D41\u7545\u5EA6\uFF0C\u4F7F\u7528\u89C4\u8303\u7684\u5B66\u672F\u4E66\u9762\u8BED\u3002

\u9700\u8981\u6DA6\u8272\u7684\u6587\u672C\uFF1A
[\u7C98\u8D34\u4F60\u7684\u6587\u672C]` },
    { id: 18, cat: "cn_polish", title: "\u4E2D\u6587\u6458\u8981\u6DA6\u8272", desc: "\u4E13\u95E8\u9488\u5BF9\u4E2D\u6587\u6458\u8981\u7684\u6DA6\u8272\u4F18\u5316", text: `\u8BF7\u5BF9\u4EE5\u4E0B\u4E2D\u6587\u5B66\u672F\u8BBA\u6587\u6458\u8981\u8FDB\u884C\u6DA6\u8272\uFF0C\u786E\u4FDD\u5305\u542B"\u76EE\u7684\u3001\u65B9\u6CD5\u3001\u7ED3\u679C\u3001\u7ED3\u8BBA"\u56DB\u8981\u7D20\u3002

\u539F\u59CB\u6458\u8981\uFF1A
[\u7C98\u8D34\u4F60\u7684\u6458\u8981]` },
    { id: 19, cat: "cn_polish", title: "\u4E2D\u6587\u8BBA\u6587\u6DF1\u5EA6\u6DA6\u8272", desc: "\u9010\u53E5\u6DA6\u8272\u5E76\u8BF4\u660E\u4FEE\u6539\u7406\u7531", text: `\u8BF7\u5BF9\u4EE5\u4E0B\u4E2D\u6587\u5B66\u672F\u6587\u672C\u8FDB\u884C\u6DF1\u5EA6\u6DA6\u8272\u3002\u5BF9\u4E8E\u6BCF\u5904\u4FEE\u6539\uFF0C\u8BF7\u63D0\u4F9B\u539F\u6587\u3001\u4FEE\u6539\u540E\u53E5\u5B50\u548C\u4FEE\u6539\u7406\u7531\u3002

\u6587\u672C\uFF1A
[\u7C98\u8D34\u4F60\u7684\u6587\u672C]` },
    { id: 20, cat: "cn_paper", title: "\u4E2D\u6587\u5F15\u8A00\u64B0\u5199", desc: "\u5E2E\u52A9\u64B0\u5199\u4E2D\u6587\u5B66\u672F\u8BBA\u6587\u5F15\u8A00", text: `\u8BF7\u5E2E\u6211\u64B0\u5199\u4E2D\u6587\u5B66\u672F\u8BBA\u6587\u7684\u5F15\u8A00\u90E8\u5206\u3002

\u7814\u7A76\u9886\u57DF\uFF1A[\u586B\u5199]
\u5177\u4F53\u8BFE\u9898\uFF1A[\u586B\u5199]
\u7814\u7A76\u76EE\u7684\uFF1A[\u586B\u5199]` },
    { id: 21, cat: "cn_paper", title: "\u4E2D\u6587\u7ED3\u8BBA\u64B0\u5199", desc: "\u5E2E\u52A9\u64B0\u5199\u4E2D\u6587\u5B66\u672F\u8BBA\u6587\u7ED3\u8BBA", text: `\u8BF7\u6839\u636E\u4EE5\u4E0B\u7814\u7A76\u5185\u5BB9\uFF0C\u64B0\u5199\u4E2D\u6587\u5B66\u672F\u8BBA\u6587\u7684\u7ED3\u8BBA\u90E8\u5206\u3002

\u7814\u7A76\u76EE\u7684\uFF1A[\u586B\u5199]
\u4E3B\u8981\u53D1\u73B0\uFF1A[\u586B\u5199]` },
    { id: 22, cat: "cn_paper", title: "\u4E2D\u6587\u8BBA\u6587\u9898\u76EE\u4F18\u5316", desc: "\u4F18\u5316\u5B66\u672F\u8BBA\u6587\u6807\u9898", text: `\u8BF7\u5E2E\u6211\u4F18\u5316\u4EE5\u4E0B\u4E2D\u6587\u5B66\u672F\u8BBA\u6587\u9898\u76EE\u3002

\u5F53\u524D\u9898\u76EE\uFF1A[\u586B\u5199]
\u7814\u7A76\u9886\u57DF\uFF1A[\u586B\u5199]
\u6838\u5FC3\u53D1\u73B0\uFF1A[\u586B\u5199]` },
    { id: 23, cat: "cn_paper", title: "\u4E2D\u82F1\u6587\u5BF9\u7167\u7FFB\u8BD1", desc: "\u4E2D\u6587\u5B66\u672F\u6587\u672C\u7FFB\u8BD1\u4E3A\u82F1\u6587\uFF08\u9010\u53E5\u5BF9\u7167\uFF09", text: `\u8BF7\u5C06\u4EE5\u4E0B\u4E2D\u6587\u5B66\u672F\u6587\u672C\u7FFB\u8BD1\u4E3A\u82F1\u6587\uFF0C\u9010\u53E5\u5BF9\u7167\u7FFB\u8BD1\u3002

\u4E2D\u6587\u6587\u672C\uFF1A
[\u7C98\u8D34\u4F60\u7684\u6587\u672C]` },
    { id: 24, cat: "polish", title: "\u65B9\u6CD5\u8BBA\u63CF\u8FF0\u6DA6\u8272", desc: "\u4E13\u95E8\u6DA6\u8272 Methods \u90E8\u5206\u7684\u5B9E\u9A8C\u63CF\u8FF0", text: `Please polish the following Methods section text.

Methods text:
[Paste your Methods text here]` },
    { id: 25, cat: "polish", title: "\u56FE\u8868\u8BF4\u660E\u6587\u5B57\u6DA6\u8272", desc: "\u6DA6\u8272 Figure Captions \u548C Table Notes", text: `Please polish the following figure captions and table descriptions.

Original captions:
[Paste your figure captions here]` },
    { id: 26, cat: "polish", title: "Discussion \u90E8\u5206\u6DA6\u8272", desc: "\u4E13\u95E8\u6DA6\u8272\u8BA8\u8BBA\u90E8\u5206\u7684\u5206\u6790\u548C\u89E3\u91CA", text: `Please polish the following Discussion section.

Discussion text:
[Paste your Discussion text here]` },
    { id: 27, cat: "response", title: "\u9010\u6761\u56DE\u590D\u5BA1\u7A3F\u610F\u89C1\uFF08\u6A21\u677F\uFF09", desc: "\u7ED3\u6784\u5316\u7684\u5BA1\u7A3F\u610F\u89C1\u9010\u6761\u56DE\u590D\u683C\u5F0F", text: `Please help me format a point-by-point response to the following reviewer comments.

Reviewer comments:
[Paste all reviewer comments here]` },
    { id: 28, cat: "response", title: "Cover Letter \u6DA6\u8272", desc: "\u4F18\u5316\u6295\u7A3F Cover Letter \u7684\u8868\u8FBE", text: `Please polish the following cover letter for a journal submission.

Cover letter:
[Paste your cover letter here]` }
  ];
  var POLISH_CATEGORIES = [
    { key: "all", label: "\u5168\u90E8" },
    { key: "polish", label: "\u82F1\u6587\u6DA6\u8272" },
    { key: "grammar", label: "\u8BED\u6CD5" },
    { key: "concise", label: "\u7CBE\u7B80" },
    { key: "academic", label: "\u5B66\u672F\u8868\u8FBE" },
    { key: "structure", label: "\u7ED3\u6784\u4F18\u5316" },
    { key: "cn2en", label: "\u4E2D\u8BD1\u82F1" },
    { key: "response", label: "\u6295\u7A3F\u56DE\u590D" },
    { key: "thermo", label: "\u70ED\u7535\u4E13\u7528" },
    { key: "cn_polish", label: "\u4E2D\u6587\u6DA6\u8272" },
    { key: "cn_paper", label: "\u4E2D\u6587\u8BBA\u6587" }
  ];

  // src/modules/writingAssistant.ts
  init_ai();
  async function getCustomPrompts() {
    return getJson("customPolishPrompts", []);
  }
  async function addCustomPrompt(prompt2) {
    const list = await getCustomPrompts();
    const record = { ...prompt2, id: Date.now() };
    list.push(record);
    await setJson("customPolishPrompts", list);
    return record;
  }
  async function removeCustomPrompt(id) {
    const list = await getCustomPrompts();
    await setJson(
      "customPolishPrompts",
      list.filter((p) => p.id !== id)
    );
  }
  async function addPolishHistory(item) {
    const history = await getJson("polishHistory", []);
    history.unshift({ ...item, id: Date.now(), timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    if (history.length > 20)
      history.length = 20;
    await setJson("polishHistory", history);
  }
  async function polishWithPrompt(promptText, userInput, onChunk) {
    const systemPrompt = promptText.replace(/\[Paste[^\]]*\]/g, "").replace(/\[粘贴[^\]]*\]/g, "");
    if (onChunk) {
      const { callAIStream: callAIStream2 } = await Promise.resolve().then(() => (init_ai(), ai_exports));
      return callAIStream2(systemPrompt, userInput, { temperature: 0.3, onChunk });
    }
    return callAI(systemPrompt, userInput, { temperature: 0.3 });
  }

  // src/ui/tabs/writingTab.ts
  init_ai();
  function render3(container) {
    const aiReady = isAIConfigured();
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">\u76F4\u63A5\u6DA6\u8272</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">\u8BF7\u5148\u5728\u8BBE\u7F6E\u9875\u9762\u914D\u7F6E API Key</div>' : ""}
      <div class="rh-flex-col">
        <select class="rh-select" id="rh-polish-style">
          <option value="academic">\u5B66\u672F\u6DA6\u8272</option>
          <option value="deep">\u6DF1\u5EA6\u6DA6\u8272\uFF08\u542B\u8BF4\u660E\uFF09</option>
          <option value="sci">SCI \u7EA7\u522B\u6DA6\u8272</option>
        </select>
        <textarea class="rh-textarea" id="rh-polish-input" placeholder="\u7C98\u8D34\u9700\u8981\u6DA6\u8272\u7684\u6587\u672C..." rows="4"></textarea>
        <button class="rh-btn rh-btn-primary" id="rh-polish-btn" ${!aiReady ? "disabled" : ""}>\u6DA6\u8272</button>
        <textarea class="rh-textarea" id="rh-polish-result" placeholder="\u6DA6\u8272\u7ED3\u679C\u5C06\u663E\u793A\u5728\u8FD9\u91CC..." rows="6" readonly></textarea>
      </div>
    </div>

    <div class="rh-section-header">\u63D0\u793A\u8BCD\u6A21\u677F</div>
    <div class="rh-cat-filters" id="rh-polish-cats">
      ${POLISH_CATEGORIES.map((c) => `
        <button class="rh-cat-btn ${c.key === "all" ? "active" : ""}" data-cat="${c.key}">${c.label}</button>
      `).join("")}
    </div>

    <div class="rh-scroll-list" id="rh-polish-list"></div>

    <div class="rh-mt-12">
      <button class="rh-btn" id="rh-add-prompt-btn">+ \u6DFB\u52A0\u81EA\u5B9A\u4E49\u63D0\u793A\u8BCD</button>
    </div>
    <div id="rh-custom-prompts"></div>
  `;
    renderPromptList(container, "all");
    container.querySelector("#rh-polish-cats")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".rh-cat-btn");
      if (!btn)
        return;
      container.querySelectorAll(".rh-cat-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderPromptList(container, btn.dataset.cat || "all");
    });
    container.querySelector("#rh-polish-btn")?.addEventListener("click", async () => {
      const input = container.querySelector("#rh-polish-input").value;
      const result = container.querySelector("#rh-polish-result");
      const style = container.querySelector("#rh-polish-style").value;
      if (!input.trim())
        return;
      result.value = "\u6DA6\u8272\u4E2D...";
      try {
        const text = await polishText(input, style);
        result.value = text;
        await addPolishHistory({ promptTitle: `\u76F4\u63A5\u6DA6\u8272(${style})`, inputText: input.slice(0, 100), result: text.slice(0, 200) });
      } catch (e) {
        result.value = `\u9519\u8BEF: ${e.message}`;
      }
    });
    container.querySelector("#rh-add-prompt-btn")?.addEventListener("click", async () => {
      const title = prompt("\u63D0\u793A\u8BCD\u6807\u9898:");
      if (!title)
        return;
      const text = prompt("\u63D0\u793A\u8BCD\u5185\u5BB9:");
      if (!text)
        return;
      await addCustomPrompt({ cat: "custom", title, desc: "\u81EA\u5B9A\u4E49\u63D0\u793A\u8BCD", text });
      renderCustomPrompts(container);
    });
    renderCustomPrompts(container);
  }
  function renderPromptList(container, cat) {
    const list = container.querySelector("#rh-polish-list");
    const filtered = cat === "all" ? POLISH_PROMPTS : POLISH_PROMPTS.filter((p) => p.cat === cat);
    list.innerHTML = filtered.map((p) => `
    <div class="rh-prompt-card" data-id="${p.id}" data-text="${encodeURIComponent(p.text)}">
      <div class="rh-prompt-title">${p.title}</div>
      <div class="rh-prompt-desc">${p.desc}</div>
    </div>
  `).join("");
    list.querySelectorAll(".rh-prompt-card").forEach((card) => {
      card.addEventListener("click", () => {
        const text = decodeURIComponent(card.dataset.text || "");
        const input = prompt("\u8F93\u5165\u8981\u5904\u7406\u7684\u6587\u672C:");
        if (!input)
          return;
        const result = container.querySelector("#rh-polish-result");
        const inputEl = container.querySelector("#rh-polish-input");
        inputEl.value = input;
        result.value = "\u5904\u7406\u4E2D...";
        polishWithPrompt(text, input).then((r) => {
          result.value = r;
        }).catch((e) => {
          result.value = `\u9519\u8BEF: ${e.message}`;
        });
      });
    });
  }
  async function renderCustomPrompts(container) {
    const el = container.querySelector("#rh-custom-prompts");
    const prompts = await getCustomPrompts();
    if (prompts.length === 0) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `
    <div class="rh-mt-8">
      <div class="rh-text-sm rh-mb-8" style="font-weight:600">\u81EA\u5B9A\u4E49\u63D0\u793A\u8BCD</div>
      ${prompts.map((p) => `
        <div class="rh-prompt-card" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div class="rh-prompt-title">${p.title}</div>
            <div class="rh-prompt-desc">${p.desc}</div>
          </div>
          <button class="rh-btn rh-btn-danger" data-del="${p.id}" style="font-size:11px;padding:2px 6px">\u5220\u9664</button>
        </div>
      `).join("")}
    </div>
  `;
    el.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.del);
        await removeCustomPrompt(id);
        renderCustomPrompts(container);
      });
    });
  }
  function destroy3() {
  }

  // src/ui/tabs/translateTab.ts
  init_ai();
  function render4(container) {
    const aiReady = isAIConfigured();
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">\u4E2D\u82F1\u4E92\u8BD1</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">\u8BF7\u5148\u5728\u8BBE\u7F6E\u9875\u9762\u914D\u7F6E API Key</div>' : ""}
      <div class="rh-flex rh-mb-8">
        <button class="rh-btn rh-cat-btn active" id="rh-dir-en2zh" data-dir="en2zh">\u82F1 \u2192 \u4E2D</button>
        <button class="rh-btn rh-cat-btn" id="rh-dir-zh2en" data-dir="zh2en">\u4E2D \u2192 \u82F1</button>
        <select class="rh-select" id="rh-trans-style">
          <option value="academic">\u5B66\u672F</option>
          <option value="natural">\u81EA\u7136</option>
          <option value="formal">\u6B63\u5F0F</option>
          <option value="simple">\u7B80\u6D01</option>
        </select>
      </div>
      <div class="rh-grid-2">
        <textarea class="rh-textarea" id="rh-trans-input" placeholder="\u8F93\u5165\u8981\u7FFB\u8BD1\u7684\u6587\u672C..." rows="8"></textarea>
        <textarea class="rh-textarea" id="rh-trans-output" placeholder="\u7FFB\u8BD1\u7ED3\u679C..." rows="8" readonly></textarea>
      </div>
      <div class="rh-mt-8">
        <button class="rh-btn rh-btn-primary" id="rh-trans-btn" ${!aiReady ? "disabled" : ""}>\u7FFB\u8BD1</button>
        <button class="rh-btn" id="rh-trans-copy" style="margin-left:6px">\u590D\u5236\u7ED3\u679C</button>
      </div>
    </div>
  `;
    let direction = "en2zh";
    container.querySelector("#rh-dir-en2zh")?.addEventListener("click", () => {
      direction = "en2zh";
      container.querySelector("#rh-dir-en2zh")?.classList.add("active");
      container.querySelector("#rh-dir-zh2en")?.classList.remove("active");
    });
    container.querySelector("#rh-dir-zh2en")?.addEventListener("click", () => {
      direction = "zh2en";
      container.querySelector("#rh-dir-zh2en")?.classList.add("active");
      container.querySelector("#rh-dir-en2zh")?.classList.remove("active");
    });
    container.querySelector("#rh-trans-btn")?.addEventListener("click", async () => {
      const input = container.querySelector("#rh-trans-input").value;
      const output = container.querySelector("#rh-trans-output");
      const style = container.querySelector("#rh-trans-style").value;
      if (!input.trim())
        return;
      output.value = "\u7FFB\u8BD1\u4E2D...";
      try {
        output.value = await translateText(input, direction, style);
      } catch (e) {
        output.value = `\u9519\u8BEF: ${e.message}`;
      }
    });
    container.querySelector("#rh-trans-copy")?.addEventListener("click", () => {
      const text = container.querySelector("#rh-trans-output").value;
      if (text)
        navigator.clipboard.writeText(text);
    });
  }
  function destroy4() {
  }

  // src/data/emailTemplates.ts
  var EMAIL_TEMPLATES = [
    { name: "\u6295\u7A3F\u72B6\u6001\u8BE2\u95EE", category: "\u6295\u7A3F\u6C9F\u901A", content: `Dear Editor,

I hope this email finds you well. I am writing to inquire about the current status of our manuscript entitled "[Title]" (Manuscript ID: XXX), which was submitted to [Journal Name] on [Date].

We have not yet received any feedback regarding the review process. Could you kindly provide an update on the expected timeline for the editorial decision?

Thank you for your time and consideration.

Best regards,
[Your Name]` },
    { name: "\u5BA1\u7A3F\u610F\u89C1\u56DE\u590D", category: "\u6295\u7A3F\u6C9F\u901A", content: `Dear Editor,

Thank you for the opportunity to revise our manuscript entitled "[Title]" (Manuscript ID: XXX). We are grateful for the constructive comments from the reviewers.

We have carefully addressed all the comments and suggestions. A detailed point-by-point response to each reviewer comment is attached.

Best regards,
[Your Name]` },
    { name: "\u8BE2\u95EE\u5BFC\u5E08\u8FDB\u5EA6", category: "\u5BFC\u5E08\u6C9F\u901A", content: `Dear Prof. [Name],

I hope you are doing well. I am writing to follow up on [specific topic].

I have completed [brief description], and would appreciate your feedback when you have time.

Best regards,
[Your Name]` },
    { name: "\u6C47\u62A5\u7814\u7A76\u8FDB\u5C55", category: "\u5BFC\u5E08\u6C9F\u901A", content: `Dear Prof. [Name],

I would like to update you on my recent research progress:

1. [Task 1]: [Progress]
2. [Task 2]: [Progress]

Plans for next week:
- [Planned tasks]

Best regards,
[Your Name]` },
    { name: "\u4F1A\u8BAE\u6CE8\u518C/\u6458\u8981\u63D0\u4EA4", category: "\u5B66\u672F\u4F1A\u8BAE", content: `Dear [Conference/Organizer],

I would like to register for [Conference Name] and submit an abstract for [oral/poster] presentation.

Title: [Your Title]
Authors: [Author list]

Abstract:
[Your abstract text]

Best regards,
[Your Name]` },
    { name: "\u8BF7\u6C42\u63A8\u8350\u4FE1", category: "\u5176\u4ED6", content: `Dear Prof. [Name],

I am applying for [position/program] and would be honored if you could provide a letter of recommendation.

The deadline is [Date]. I have attached my CV for your reference.

Best regards,
[Your Name]` },
    { name: "\u8054\u7CFB\u5408\u4F5C\u8005", category: "\u5176\u4ED6", content: `Dear Prof. [Name],

I am [Your Name], a researcher at [Your Institution], working on [research area].

I have read your recent publication "[Paper Title]" with great interest. I was wondering if there might be an opportunity for collaboration.

Best regards,
[Your Name]` },
    { name: "\u7533\u8BF7\u8BBF\u95EE\u5B66\u8005", category: "\u5B66\u672F\u4EA4\u6D41", content: `Dear Prof. [Name],

I am writing to inquire about the possibility of joining your research group as a visiting scholar for [duration].

My current research focuses on [brief description].

Best regards,
[Your Name]` },
    { name: "\u8BF7\u6C42\u5BA1\u7A3F", category: "\u5B66\u672F\u4EA4\u6D41", content: `Dear Prof. [Name],

I am writing to invite you to serve as a reviewer for a manuscript submitted to [Journal/Conference].

Manuscript Title: "[Title]"
Topic: [Brief description]

Best regards,
[Your Name]` },
    { name: "\u4F1A\u8BAE\u9080\u8BF7\u56DE\u590D\uFF08\u63A5\u53D7\uFF09", category: "\u5B66\u672F\u4F1A\u8BAE", content: `Dear [Organizer Name],

Thank you for inviting me to [Conference Name]. I am pleased to accept your invitation.

Please let me know the presentation details.

Best regards,
[Your Name]` },
    { name: "\u8BBA\u6587\u5408\u4F5C\u9080\u8BF7", category: "\u5B66\u672F\u4EA4\u6D41", content: `Dear Prof. [Name],

I am writing to propose a potential collaboration on [specific research topic].

I have been following your work on [their research area]. I believe a collaboration could lead to significant advances.

Best regards,
[Your Name]` }
  ];

  // src/modules/emailTemplates.ts
  async function getCustomTemplates() {
    return getJson("customEmailTemplates", []);
  }
  async function addCustomTemplate(tpl) {
    const list = await getCustomTemplates();
    const record = { ...tpl, id: Date.now() };
    list.push(record);
    await setJson("customEmailTemplates", list);
    return record;
  }
  async function removeCustomTemplate(id) {
    const list = await getCustomTemplates();
    await setJson(
      "customEmailTemplates",
      list.filter((t) => t.id !== id)
    );
  }
  function getEmailCategories() {
    const cats = new Set(EMAIL_TEMPLATES.map((t) => t.category));
    return Array.from(cats);
  }

  // src/ui/tabs/emailTab.ts
  init_ai();
  async function render5(container) {
    const aiReady = isAIConfigured();
    const categories = getEmailCategories();
    const customTemplates = await getCustomTemplates();
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">AI \u90AE\u4EF6\u751F\u6210</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">\u8BF7\u5148\u5728\u8BBE\u7F6E\u9875\u9762\u914D\u7F6E API Key</div>' : ""}
      <div class="rh-flex-col">
        <input class="rh-input" id="rh-email-scenario" placeholder="\u573A\u666F\uFF08\u5982\uFF1A\u6295\u7A3F\u72B6\u6001\u8BE2\u95EE\uFF09"/>
        <textarea class="rh-textarea" id="rh-email-info" placeholder="\u5173\u952E\u4FE1\u606F\uFF08\u5982\uFF1A\u8BBA\u6587\u6807\u9898\u3001\u671F\u520A\u540D\u3001\u6295\u7A3F\u65E5\u671F\uFF09" rows="2"></textarea>
        <button class="rh-btn rh-btn-primary" id="rh-email-gen" ${!aiReady ? "disabled" : ""}>AI \u751F\u6210\u90AE\u4EF6</button>
        <textarea class="rh-textarea" id="rh-email-result" placeholder="\u751F\u6210\u7ED3\u679C..." rows="6" readonly></textarea>
      </div>
    </div>

    ${categories.map((cat) => `
      <div class="rh-accordion open">
        <div class="rh-accordion-header">
          <span>${cat}</span>
          <span class="rh-accordion-arrow">\u25B6</span>
        </div>
        <div class="rh-accordion-body">
          ${EMAIL_TEMPLATES.filter((t) => t.category === cat).map((t) => `
            <div class="rh-prompt-card">
              <div class="rh-prompt-title">${t.name}</div>
              <div style="margin-top:6px">
                <div class="rh-code-block" style="max-height:120px;overflow-y:auto;font-size:11px;white-space:pre-wrap">${t.content.replace(/</g, "&lt;")}</div>
                <button class="rh-btn rh-mt-8 rh-copy-template" data-content="${encodeURIComponent(t.content)}">\u590D\u5236</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("")}

    ${customTemplates.length > 0 ? `
      <div class="rh-section-header rh-mt-12">\u81EA\u5B9A\u4E49\u6A21\u677F</div>
      ${customTemplates.map((t) => `
        <div class="rh-prompt-card">
          <div class="rh-flex" style="justify-content:space-between">
            <div class="rh-prompt-title">${t.name}</div>
            <button class="rh-btn rh-btn-danger" data-del="${t.id}" style="font-size:11px;padding:2px 6px">\u5220\u9664</button>
          </div>
          <div class="rh-code-block rh-mt-8" style="max-height:120px;overflow-y:auto;font-size:11px;white-space:pre-wrap">${t.content.replace(/</g, "&lt;")}</div>
        </div>
      `).join("")}
    ` : ""}

    <div class="rh-mt-12">
      <button class="rh-btn" id="rh-add-tpl-btn">+ \u6DFB\u52A0\u81EA\u5B9A\u4E49\u6A21\u677F</button>
    </div>
  `;
    container.querySelectorAll(".rh-accordion-header").forEach((header) => {
      header.addEventListener("click", () => {
        header.parentElement.classList.toggle("open");
      });
    });
    container.querySelectorAll(".rh-copy-template").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(decodeURIComponent(btn.dataset.content || ""));
        btn.textContent = "\u5DF2\u590D\u5236";
        setTimeout(() => btn.textContent = "\u590D\u5236", 1500);
      });
    });
    container.querySelector("#rh-email-gen")?.addEventListener("click", async () => {
      const scenario = container.querySelector("#rh-email-scenario").value;
      const info = container.querySelector("#rh-email-info").value;
      const result = container.querySelector("#rh-email-result");
      if (!info.trim())
        return;
      result.value = "\u751F\u6210\u4E2D...";
      try {
        result.value = await generateEmail(scenario, info);
      } catch (e) {
        result.value = `\u9519\u8BEF: ${e.message}`;
      }
    });
    container.querySelector("#rh-add-tpl-btn")?.addEventListener("click", async () => {
      const name = prompt("\u6A21\u677F\u540D\u79F0:");
      if (!name)
        return;
      const content = prompt("\u6A21\u677F\u5185\u5BB9:");
      if (!content)
        return;
      await addCustomTemplate({ name, category: "\u81EA\u5B9A\u4E49", content });
      render5(container);
    });
    container.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await removeCustomTemplate(parseInt(btn.dataset.del));
        render5(container);
      });
    });
  }
  function destroy5() {
  }

  // src/modules/submission.ts
  init_ai();
  var DEFAULT_CHECKLIST = [
    { text: "\u8BBA\u6587\u683C\u5F0F\u7B26\u5408\u76EE\u6807\u671F\u520A\u8981\u6C42", checked: false },
    { text: "\u6240\u6709\u4F5C\u8005\u5DF2\u786E\u8BA4\u6295\u7A3F", checked: false },
    { text: "Cover Letter \u5DF2\u51C6\u5907", checked: false },
    { text: "Highlights \u5DF2\u51C6\u5907", checked: false },
    { text: "Graphical Abstract \u5DF2\u51C6\u5907", checked: false },
    { text: "\u8865\u5145\u6750\u6599\u5DF2\u6574\u7406", checked: false },
    { text: "\u56FE\u7247\u5206\u8FA8\u7387\u7B26\u5408\u8981\u6C42", checked: false },
    { text: "\u53C2\u8003\u6587\u732E\u683C\u5F0F\u5DF2\u68C0\u67E5", checked: false },
    { text: "\u67E5\u91CD/\u8BED\u8A00\u68C0\u67E5\u5DF2\u5B8C\u6210", checked: false },
    { text: "\u4F26\u7406\u58F0\u660E/\u5229\u76CA\u51B2\u7A81\u5DF2\u58F0\u660E", checked: false }
  ];
  async function getChecklist() {
    const saved = await getJson("submissionChecklist", null);
    if (saved)
      return saved;
    return DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: i + 1 }));
  }
  async function updateChecklistItem(id, checked) {
    const list = await getChecklist();
    const item = list.find((i) => i.id === id);
    if (item) {
      item.checked = checked;
      await setJson("submissionChecklist", list);
    }
  }
  async function resetChecklist() {
    await setJson(
      "submissionChecklist",
      DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: i + 1 }))
    );
  }

  // src/ui/tabs/submissionTab.ts
  init_ai();
  async function render6(container) {
    const checklist = await getChecklist();
    const aiReady = isAIConfigured();
    const checkedCount = checklist.filter((i) => i.checked).length;
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">\u6295\u7A3F\u6E05\u5355 (${checkedCount}/${checklist.length})</div>
      <div class="rh-progress rh-mb-12">
        <div class="rh-progress-bar" style="width:${Math.round(checkedCount / checklist.length * 100)}%;background:#22c55e"></div>
      </div>
      <div id="rh-checklist">
        ${checklist.map((item) => `
          <div class="rh-checklist-item ${item.checked ? "checked" : ""}">
            <input type="checkbox" data-id="${item.id}" ${item.checked ? "checked" : ""}/>
            <label>${item.text}</label>
          </div>
        `).join("")}
      </div>
      <button class="rh-btn rh-mt-8" id="rh-reset-checklist">\u91CD\u7F6E\u6E05\u5355</button>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">AI \u671F\u520A\u63A8\u8350</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">\u8BF7\u5148\u5728\u8BBE\u7F6E\u9875\u9762\u914D\u7F6E API Key</div>' : ""}
      <div class="rh-flex-col">
        <input class="rh-input" id="rh-journal-title" placeholder="\u8BBA\u6587\u6807\u9898"/>
        <textarea class="rh-textarea" id="rh-journal-abstract" placeholder="\u6458\u8981\uFF08\u53EF\u9009\uFF09" rows="2"></textarea>
        <input class="rh-input" id="rh-journal-field" placeholder="\u7814\u7A76\u9886\u57DF\uFF08\u53EF\u9009\uFF09"/>
        <button class="rh-btn rh-btn-primary" id="rh-journal-btn" ${!aiReady ? "disabled" : ""}>\u63A8\u8350\u671F\u520A</button>
        <div id="rh-journal-result" class="rh-mt-8" style="font-size:12px;line-height:1.6"></div>
      </div>
    </div>
  `;
    container.querySelectorAll('#rh-checklist input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", async () => {
        const id = parseInt(cb.dataset.id);
        const checked = cb.checked;
        await updateChecklistItem(id, checked);
        render6(container);
      });
    });
    container.querySelector("#rh-reset-checklist")?.addEventListener("click", async () => {
      await resetChecklist();
      render6(container);
    });
    container.querySelector("#rh-journal-btn")?.addEventListener("click", async () => {
      const title = container.querySelector("#rh-journal-title").value;
      const abstract = container.querySelector("#rh-journal-abstract").value;
      const field = container.querySelector("#rh-journal-field").value;
      const result = container.querySelector("#rh-journal-result");
      if (!title.trim())
        return;
      result.textContent = "\u63A8\u8350\u4E2D...";
      try {
        const rec = await recommendJournals(title, abstract, field);
        result.innerHTML = `<div style="white-space:pre-wrap">${rec.replace(/</g, "&lt;")}</div>`;
      } catch (e) {
        result.textContent = `\u9519\u8BEF: ${e.message}`;
      }
    });
  }
  function destroy6() {
  }

  // src/data/plotTips.ts
  var PLOT_TIPS = [
    { category: "Origin \u7ED8\u56FE", title: "XRD \u56FE\u8C31\u7ED8\u5236", content: `<p><strong>\u6B65\u9AA4\uFF1A</strong></p><ol><li>\u5BFC\u5165\u6570\u636E\uFF1AFile \u2192 Import \u2192 ASCII</li><li>\u8BBE\u7F6E\u5750\u6807\u8F74\uFF1AX\u8F74\u4E3A 2\u03B8 (\xB0)\uFF0CY\u8F74\u4E3A Intensity (a.u.)</li><li>\u591A\u7EC4\u6570\u636E\u504F\u79FB\uFF1A\u9009\u4E2D\u66F2\u7EBF \u2192 Plot \u2192 Offset</li><li>\u6DFB\u52A0 PDF \u6807\u51C6\u5361\u7247\u5BF9\u6BD4</li><li>\u6807\u6CE8\u5CF0\u4F4D\uFF1ATools \u2192 Pick Peaks</li></ol>`, tools: ["Origin", "Jade"] },
    { category: "Origin \u7ED8\u56FE", title: "SEM/TEM \u5F62\u8C8C\u56FE\u6BD4\u4F8B\u5C3A", content: `<p><strong>\u5173\u952E\u70B9\uFF1A</strong></p><ul><li>\u4ECE\u539F\u59CB\u56FE\u7247\u83B7\u53D6\u6BD4\u4F8B\u5C3A\u4FE1\u606F</li><li>Origin \u4E2D\uFF1AImage \u2192 Resize \u8BBE\u7F6E\u5B9E\u9645\u5C3A\u5BF8</li><li>\u5BFC\u51FA\u65F6\u5206\u8FA8\u7387 \u2265 300 dpi</li></ul>`, tools: ["Origin", "ImageJ"] },
    { category: "Origin \u7ED8\u56FE", title: "\u70ED\u7535\u6027\u80FD ZT \u56FE", content: `<p><strong>\u6807\u51C6\u683C\u5F0F\uFF1A</strong></p><ul><li>X\u8F74\uFF1ATemperature (K)\uFF0CY\u8F74\uFF1AZT</li><li>\u591A\u7EC4\u6837\u54C1\u7528\u4E0D\u540C\u989C\u8272/\u6807\u8BB0\u533A\u5206</li><li>\u6DFB\u52A0\u8BEF\u5DEE\u68D2</li></ul>`, tools: ["Origin"] },
    { category: "Origin \u7ED8\u56FE", title: "Seebeck/\u7535\u963B\u7387/\u70ED\u5BFC\u7387\u4E09\u5408\u4E00\u56FE", content: `<p>\u521B\u5EFA 3 \u884C 1 \u5217\u7684 Graph Page\uFF0CX\u8F74\u5171\u4EAB Temperature (K)\uFF0C\u7EDF\u4E00\u914D\u8272\u65B9\u6848\u3002</p>`, tools: ["Origin"] },
    { category: "Python \u7ED8\u56FE", title: "Matplotlib \u57FA\u7840\u8BBE\u7F6E", content: `<pre><code>import matplotlib.pyplot as plt
plt.rcParams['font.family'] = 'Times New Roman'
plt.rcParams['font.size'] = 12
plt.rcParams['axes.linewidth'] = 1.5
plt.rcParams['figure.dpi'] = 300</code></pre>`, tools: ["Python", "Matplotlib"] },
    { category: "Python \u7ED8\u56FE", title: "\u79D1\u7814\u914D\u8272\u65B9\u6848", content: `<p>\u63A8\u8350\uFF1A<code>colors = ['#E64B35', '#4DBBD5', '#00A087', '#3C5488']</code></p><p>\u907F\u514D\uFF1A\u7EAF\u7EA2\u7EAF\u7EFF\uFF08\u8272\u76F2\u4E0D\u53CB\u597D\uFF09\uFF0Crainbow \u8272\u56FE</p>`, tools: ["Python"] },
    { category: "Python \u7ED8\u56FE", title: "XRD \u5806\u53E0\u56FE", content: `<pre><code>fig, ax = plt.subplots(figsize=(8, 6))
offset = 0
for name, data in datasets:
    ax.plot(data[:,0], data[:,1] + offset, label=name)
    offset += max(data[:,1]) * 0.3</code></pre>`, tools: ["Python"] },
    { category: "PPT / \u6587\u6863", title: "\u5B66\u672F\u6D77\u62A5\u8BBE\u8BA1\u8981\u70B9", content: `<ul><li>\u5C3A\u5BF8\uFF1AA0 \u6216 36\xD748 inch</li><li>\u5B57\u4F53\uFF1A\u6807\u9898 72-96pt\uFF0C\u6B63\u6587 24-32pt</li><li>\u914D\u8272\uFF1A\u4E0D\u8D85\u8FC7 3-4 \u79CD\u4E3B\u8272</li><li>\u56FE\u7247\u5206\u8FA8\u7387 \u2265 150 dpi</li></ul>`, tools: ["PowerPoint"] },
    { category: "PPT / \u6587\u6863", title: "\u7EC4\u4F1A PPT \u6A21\u677F\u7ED3\u6784", content: `<p>\u63A8\u8350 15-20 \u9875\uFF1A\u5C01\u9762\u2192\u76EE\u5F55\u2192\u80CC\u666F\u2192\u65B9\u6CD5\u2192\u7ED3\u679C\u2192\u8BA1\u5212\u2192\u81F4\u8C22</p>`, tools: ["PowerPoint"] },
    { category: "\u56FE\u7247\u5904\u7406", title: "SCI \u8BBA\u6587\u56FE\u7247\u5C3A\u5BF8\u6807\u51C6", content: `<ul><li>\u5355\u680F\u56FE\uFF1A\u5BBD 8.5 cm</li><li>\u53CC\u680F\u56FE\uFF1A\u5BBD 17.6 cm</li><li>\u5206\u8FA8\u7387\uFF1A\u7EBF\u56FE \u2265 600 dpi\uFF0C\u7167\u7247 \u2265 300 dpi</li><li>\u683C\u5F0F\uFF1ATIFF \u6216 EPS/PDF</li></ul>`, tools: ["Photoshop"] },
    { category: "\u56FE\u7247\u5904\u7406", title: "ImageJ \u56FE\u7247\u5904\u7406", content: `<ul><li>\u6BD4\u4F8B\u5C3A\u6807\u5B9A\uFF1AAnalyze \u2192 Set Scale</li><li>\u7C92\u5B50\u7EDF\u8BA1\uFF1AAnalyze \u2192 Analyze Particles</li><li>\u4EAE\u5EA6\u5BF9\u6BD4\u5EA6\uFF1AImage \u2192 Adjust \u2192 Brightness/Contrast</li></ul>`, tools: ["ImageJ"] },
    { category: "\u56FE\u8868\u89C4\u8303", title: "\u8BBA\u6587\u56FE\u8868 Checklist", content: `<ul><li>\u2610 \u5750\u6807\u8F74\u6807\u7B7E\u5B8C\u6574</li><li>\u2610 \u56FE\u4F8B\u6E05\u6670</li><li>\u2610 \u5B57\u4F53 \u2265 8pt</li><li>\u2610 \u989C\u8272\u533A\u5206\u660E\u786E</li><li>\u2610 \u5206\u8FA8\u7387\u7B26\u5408\u8981\u6C42</li></ul>`, tools: [] },
    { category: "Python \u7ED8\u56FE", title: "\u80FD\u5E26\u7ED3\u6784\u56FE", content: `<p>VASP + pymatgen \u6D41\u7A0B\uFF1A\u89E3\u6790 vasprun.xml\uFF0C\u8BBE\u7F6E\u9AD8\u5BF9\u79F0\u8DEF\u5F84\uFF0C\u6807\u6CE8\u8D39\u7C73\u80FD\u7EA7\u3002</p>`, tools: ["Python", "pymatgen"] },
    { category: "Python \u7ED8\u56FE", title: "\u6001\u5BC6\u5EA6\u56FE (DOS)", content: `<p>X\u8F74\uFF1AEnergy (eV)\uFF0CY\u8F74\uFF1ADOS (states/eV)\uFF0C\u8D39\u7C73\u80FD\u7EA7\u5BF9\u9F50\u5230 0 eV\u3002</p>`, tools: ["Python"] },
    { category: "COMSOL \u7ED8\u56FE", title: "COMSOL \u7ED3\u679C\u56FE\u5BFC\u51FA", content: `<p>Results \u2192 \u9009\u4E2D\u7ED8\u56FE \u2192 \u53F3\u952E \u2192 Image\uFF0C\u63A8\u8350 PNG \u6216 EPS \u683C\u5F0F\u3002</p>`, tools: ["COMSOL"] },
    { category: "LaTeX \u7ED8\u56FE", title: "TikZ \u5B66\u672F\u56FE\u8868\u793A\u4F8B", content: `<pre><code>\\begin{tikzpicture}
  \\draw[->] (0,0) -- (4,0) node[right] {x};
  \\draw[->] (0,0) -- (0,3) node[above] {y};
\\end{tikzpicture}</code></pre>`, tools: ["LaTeX", "TikZ"] },
    { category: "LaTeX \u7ED8\u56FE", title: "pgfplots \u6570\u636E\u7ED8\u56FE", content: `<pre><code>\\begin{axis}[xlabel={Temperature (K)}, ylabel={ZT}]
\\addplot table[x=temp, y=zt, col sep=comma]{data.csv};
\\end{axis}</code></pre>`, tools: ["LaTeX", "pgfplots"] },
    { category: "\u56FE\u8868\u9009\u62E9", title: "\u5E38\u89C1\u56FE\u8868\u7C7B\u578B\u9009\u62E9\u6307\u5357", content: `<table><tr><th>\u6570\u636E\u7C7B\u578B</th><th>\u63A8\u8350\u56FE\u8868</th></tr><tr><td>\u8D8B\u52BF\u53D8\u5316</td><td>\u6298\u7EBF\u56FE</td></tr><tr><td>\u5206\u7C7B\u6BD4\u8F83</td><td>\u67F1\u72B6\u56FE</td></tr><tr><td>\u5206\u5E03\u5173\u7CFB</td><td>\u6563\u70B9\u56FE</td></tr><tr><td>\u591A\u7EF4\u6570\u636E</td><td>\u70ED\u56FE</td></tr></table>`, tools: [] },
    { category: "Graphical Abstract", title: "Graphical Abstract \u5236\u4F5C\u8981\u70B9", content: `<ul><li>\u5C3A\u5BF8 530 \xD7 600 pixels</li><li>\u7B80\u6D01\uFF0C\u53EA\u5C55\u793A\u6838\u5FC3\u4FE1\u606F</li><li>\u914D\u8272\u4E0E\u8BBA\u6587\u4E00\u81F4</li><li>\u5236\u4F5C\u5DE5\u5177\uFF1APPT / Illustrator / Biorender</li></ul>`, tools: ["PowerPoint"] }
  ];

  // src/modules/plotTips.ts
  async function getCustomNotes() {
    return getJson("customPlotNotes", []);
  }
  async function addCustomNote(note) {
    const list = await getCustomNotes();
    const record = { ...note, id: Date.now() };
    list.push(record);
    await setJson("customPlotNotes", list);
    return record;
  }
  async function removeCustomNote(id) {
    const list = await getCustomNotes();
    await setJson(
      "customPlotNotes",
      list.filter((n) => n.id !== id)
    );
  }
  function getPlotCategories() {
    const cats = new Set(PLOT_TIPS.map((t) => t.category));
    return Array.from(cats);
  }

  // src/ui/tabs/plotTipsTab.ts
  init_ai();
  async function render7(container) {
    const categories = getPlotCategories();
    const customNotes = await getCustomNotes();
    const aiReady = isAIConfigured();
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">AI \u4F5C\u56FE\u4EE3\u7801\u751F\u6210</div>
      ${!aiReady ? '<div style="color:#ef4444;font-size:12px;margin-bottom:8px">\u8BF7\u5148\u5728\u8BBE\u7F6E\u9875\u9762\u914D\u7F6E API Key</div>' : ""}
      <div class="rh-flex-col">
        <input class="rh-input" id="rh-plot-desc" placeholder="\u63CF\u8FF0\u4F60\u60F3\u8981\u7684\u56FE\u8868..."/>
        <div class="rh-grid-2">
          <input class="rh-input" id="rh-plot-type" placeholder="\u56FE\u8868\u7C7B\u578B\uFF08\u53EF\u9009\uFF09"/>
          <select class="rh-select" id="rh-plot-lang">
            <option value="python">Python (matplotlib)</option>
            <option value="origin">Origin (LabTalk)</option>
          </select>
        </div>
        <button class="rh-btn rh-btn-primary" id="rh-plot-gen" ${!aiReady ? "disabled" : ""}>\u751F\u6210\u4EE3\u7801</button>
        <div id="rh-plot-result"></div>
      </div>
    </div>

    ${categories.map((cat) => `
      <div class="rh-accordion">
        <div class="rh-accordion-header">
          <span>${cat}</span>
          <span class="rh-accordion-arrow">\u25B6</span>
        </div>
        <div class="rh-accordion-body">
          ${PLOT_TIPS.filter((t) => t.category === cat).map((tip) => `
            <div class="rh-prompt-card">
              <div class="rh-prompt-title">${tip.title}</div>
              ${tip.tools.length > 0 ? `<div class="rh-mt-8">${tip.tools.map((t) => `<span class="rh-tag">${t}</span>`).join(" ")}</div>` : ""}
              <div class="rh-mt-8" style="font-size:12px;line-height:1.6">${tip.content}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("")}

    ${customNotes.length > 0 ? `
      <div class="rh-section-header rh-mt-12">\u81EA\u5B9A\u4E49\u7B14\u8BB0</div>
      ${customNotes.map((n) => `
        <div class="rh-prompt-card">
          <div class="rh-flex" style="justify-content:space-between">
            <div class="rh-prompt-title">${n.title}</div>
            <button class="rh-btn rh-btn-danger" data-del="${n.id}" style="font-size:11px;padding:2px 6px">\u5220\u9664</button>
          </div>
          <div class="rh-mt-8" style="font-size:12px">${n.content}</div>
        </div>
      `).join("")}
    ` : ""}

    <div class="rh-mt-12">
      <button class="rh-btn" id="rh-add-note-btn">+ \u6DFB\u52A0\u81EA\u5B9A\u4E49\u7B14\u8BB0</button>
    </div>
  `;
    container.querySelectorAll(".rh-accordion-header").forEach((header) => {
      header.addEventListener("click", () => {
        header.parentElement.classList.toggle("open");
      });
    });
    container.querySelector("#rh-plot-gen")?.addEventListener("click", async () => {
      const desc = container.querySelector("#rh-plot-desc").value;
      const type = container.querySelector("#rh-plot-type").value;
      const lang = container.querySelector("#rh-plot-lang").value;
      const result = container.querySelector("#rh-plot-result");
      if (!desc.trim())
        return;
      result.textContent = "\u751F\u6210\u4E2D...";
      try {
        const code = await generatePlotCode(desc, type, "", lang);
        const codeText = code.replace(/```[\w]*\n?/g, "").replace(/```/g, "").trim();
        result.innerHTML = `
        <div class="rh-code-block" style="position:relative">
          <button class="rh-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.textContent.replace('\u590D\u5236','').trim());this.textContent='\u5DF2\u590D\u5236';setTimeout(()=>this.textContent='\u590D\u5236',1500)">\u590D\u5236</button>
          ${codeText.replace(/</g, "&lt;")}
        </div>
      `;
      } catch (e) {
        result.textContent = `\u9519\u8BEF: ${e.message}`;
      }
    });
    container.querySelector("#rh-add-note-btn")?.addEventListener("click", async () => {
      const title = prompt("\u7B14\u8BB0\u6807\u9898:");
      if (!title)
        return;
      const content = prompt("\u7B14\u8BB0\u5185\u5BB9:");
      if (!content)
        return;
      await addCustomNote({ title, content, category: "\u81EA\u5B9A\u4E49" });
      render7(container);
    });
    container.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await removeCustomNote(parseInt(btn.dataset.del));
        render7(container);
      });
    });
  }
  function destroy7() {
  }

  // src/data/latexSnippets.ts
  var LATEX_SNIPPETS = [
    { name: "\u884C\u5185\u516C\u5F0F", category: "\u6570\u5B66\u516C\u5F0F", code: "$E = mc^2$" },
    { name: "\u884C\u95F4\u516C\u5F0F", category: "\u6570\u5B66\u516C\u5F0F", code: "$$\nE = mc^2\n$$" },
    { name: "\u591A\u884C\u5BF9\u9F50", category: "\u6570\u5B66\u516C\u5F0F", code: "\\begin{align}\na &= b + c \\\\\nd &= e + f\n\\end{align}" },
    { name: "\u4E0A\u4E0B\u6807", category: "\u6570\u5B66\u516C\u5F0F", code: "$x^{2}_{i}$" },
    { name: "\u5E0C\u814A\u5B57\u6BCD", category: "\u6570\u5B66\u516C\u5F0F", code: "$\\alpha \\beta \\gamma \\delta \\epsilon \\theta \\lambda \\mu \\sigma \\omega$" },
    { name: "\u6C42\u548C/\u79EF\u5206", category: "\u6570\u5B66\u516C\u5F0F", code: "$\\sum_{i=1}^{n} x_i$  $\\int_{0}^{\\infty} f(x)dx$" },
    { name: "\u5206\u6570", category: "\u6570\u5B66\u516C\u5F0F", code: "$\\frac{a}{b}$" },
    { name: "\u77E9\u9635", category: "\u6570\u5B66\u516C\u5F0F", code: "\\begin{bmatrix}\na & b \\\\\nc & d\n\\end{bmatrix}" },
    { name: "\u4E09\u7EBF\u8868", category: "\u8868\u683C", code: "\\begin{table}[htbp]\n\\centering\n\\caption{\u8868\u683C\u6807\u9898}\n\\label{tab:example}\n\\begin{tabular}{ccc}\n\\hline\n\u52171 & \u52172 & \u52173 \\\\\n\\hline\n\u6570\u636E1 & \u6570\u636E2 & \u6570\u636E3 \\\\\n\\hline\n\\end{tabular}\n\\end{table}" },
    { name: "\u56FE\u7247\u63D2\u5165", category: "\u56FE\u7247", code: "\\begin{figure}[htbp]\n\\centering\n\\includegraphics[width=0.8\\textwidth]{filename.eps}\n\\caption{\u56FE\u7247\u8BF4\u660E}\n\\label{fig:example}\n\\end{figure}" },
    { name: "\u5E76\u6392\u56FE\u7247", category: "\u56FE\u7247", code: "\\begin{figure}[htbp]\n\\centering\n\\begin{subfigure}{0.48\\textwidth}\n\\includegraphics[width=\\textwidth]{a.eps}\n\\caption{\u5B50\u56FEA}\n\\end{subfigure}\n\\hfill\n\\begin{subfigure}{0.48\\textwidth}\n\\includegraphics[width=\\textwidth]{b.eps}\n\\caption{\u5B50\u56FEB}\n\\end{subfigure}\n\\caption{\u603B\u8BF4\u660E}\n\\end{figure}" },
    { name: "\u53C2\u8003\u6587\u732E\u5F15\u7528", category: "\u5F15\u7528", code: "\u6587\u732E~\\cite{author2024}" },
    { name: "\u811A\u6CE8", category: "\u5F15\u7528", code: "\u6587\u5B57\u5185\u5BB9\\footnote{\u811A\u6CE8\u5185\u5BB9}" },
    { name: "\u5B9A\u7406\u73AF\u5883", category: "\u7ED3\u6784", code: "\\newtheorem{theorem}{\u5B9A\u7406}\n\\begin{theorem}\n\u5B9A\u7406\u5185\u5BB9...\n\\end{theorem}" },
    { name: "\u5217\u8868", category: "\u7ED3\u6784", code: "\\begin{itemize}\n\\item \u7B2C\u4E00\u9879\n\\item \u7B2C\u4E8C\u9879\n\\end{itemize}" },
    { name: "\u679A\u4E3E", category: "\u7ED3\u6784", code: "\\begin{enumerate}\n\\item \u7B2C\u4E00\u70B9\n\\item \u7B2C\u4E8C\u70B9\n\\end{enumerate}" },
    { name: "\u8D85\u94FE\u63A5", category: "\u5176\u4ED6", code: "\\usepackage{hyperref}\n\\href{https://example.com}{\u94FE\u63A5\u6587\u5B57}" },
    { name: "\u5316\u5B66\u5F0F", category: "\u5176\u4ED6", code: "\\usepackage{mhchem}\n\\ce{CO2}, \\ce{H2O}, \\ce{Bi2Te3}" },
    { name: "\u5355\u4F4D", category: "\u5176\u4ED6", code: "\\usepackage{siunitx}\n\\SI{300}{K}, \\SI{1.5}{eV}, \\SI{5}{W.m^{-1}.K^{-1}}" },
    { name: "\u7B97\u6CD5\u4F2A\u4EE3\u7801", category: "\u7B97\u6CD5", code: "\\usepackage{algorithm}\n\\usepackage{algpseudocode}\n\\begin{algorithm}\n\\caption{\u7B97\u6CD5\u540D\u79F0}\n\\begin{algorithmic}[1]\n\\State \u8F93\u5165: \u53C2\u6570 $x$\n\\State \u8F93\u51FA: \u7ED3\u679C $y$\n\\State $y \\gets 0$\n\\For{$i = 1$ to $n$}\n  \\State $y \\gets y + f(x_i)$\n\\EndFor\n\\State \\Return $y$\n\\end{algorithmic}\n\\end{algorithm}" },
    { name: "\u5316\u5B66\u65B9\u7A0B\u5F0F (mhchem)", category: "\u5316\u5B66", code: "\\usepackage{mhchem}\n\\ce{CO2 + H2O -> H2CO3}\n\\ce{Bi2Te3 <=> 2Bi + 3Te}" },
    { name: "natbib \u5F15\u7528", category: "\u53C2\u8003\u6587\u732E", code: "\\usepackage{numbib}\n\\cite{key}\n\\citet{key}\n\\citep{key}" },
    { name: "BibTeX \u6761\u76EE\u6A21\u677F", category: "\u53C2\u8003\u6587\u732E", code: "@article{key,\n  author  = {Author, A. and Author, B.},\n  title   = {Paper Title},\n  journal = {Journal Name},\n  year    = {2024},\n  volume  = {10},\n  pages   = {123--130},\n  doi     = {10.xxxx/xxxxx}\n}" },
    { name: "Beamer \u57FA\u672C\u6A21\u677F", category: "Beamer", code: "\\documentclass{beamer}\n\\usetheme{Madrid}\n\\title{\u62A5\u544A\u6807\u9898}\n\\author{\u4F5C\u8005}\n\\begin{document}\n\\begin{frame}\n\\titlepage\n\\end{frame}\n\\begin{frame}{Outline}\n\\tableofcontents\n\\end{frame}\n\\end{document}" }
  ];

  // src/modules/latexSnippets.ts
  async function getCustomSnippets() {
    return getJson("customSnippets", []);
  }
  async function addCustomSnippet(snippet) {
    const list = await getCustomSnippets();
    const record = { ...snippet, id: Date.now() };
    list.push(record);
    await setJson("customSnippets", list);
    return record;
  }
  async function removeCustomSnippet(id) {
    const list = await getCustomSnippets();
    await setJson(
      "customSnippets",
      list.filter((s) => s.id !== id)
    );
  }
  function getCategories() {
    const cats = new Set(LATEX_SNIPPETS.map((s) => s.category));
    return Array.from(cats);
  }

  // src/ui/tabs/latexTab.ts
  async function render8(container) {
    const categories = getCategories();
    const customSnippets = await getCustomSnippets();
    container.innerHTML = `
    <div class="rh-card">
      <input class="rh-input" id="rh-latex-search" placeholder="\u641C\u7D22 LaTeX \u7247\u6BB5..."/>
    </div>

    <div id="rh-latex-list">
      ${categories.map((cat) => `
        <div class="rh-accordion open">
          <div class="rh-accordion-header">
            <span>${cat}</span>
            <span class="rh-accordion-arrow">\u25B6</span>
          </div>
          <div class="rh-accordion-body">
            ${LATEX_SNIPPETS.filter((s) => s.category === cat).map((s) => `
              <div class="rh-prompt-card">
                <div class="rh-prompt-title">${s.name}</div>
                <div class="rh-code-block rh-mt-8" style="position:relative">
                  <button class="rh-copy-btn" data-copy="${encodeURIComponent(s.code)}">\u590D\u5236</button>
                  ${s.code.replace(/</g, "&lt;")}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>

    ${customSnippets.length > 0 ? `
      <div class="rh-section-header rh-mt-12">\u81EA\u5B9A\u4E49\u7247\u6BB5</div>
      ${customSnippets.map((s) => `
        <div class="rh-prompt-card">
          <div class="rh-flex" style="justify-content:space-between">
            <div class="rh-prompt-title">${s.name} <span class="rh-tag">${s.category}</span></div>
            <button class="rh-btn rh-btn-danger" data-del="${s.id}" style="font-size:11px;padding:2px 6px">\u5220\u9664</button>
          </div>
          <div class="rh-code-block rh-mt-8" style="position:relative">
            <button class="rh-copy-btn" data-copy="${encodeURIComponent(s.code)}">\u590D\u5236</button>
            ${s.code.replace(/</g, "&lt;")}
          </div>
        </div>
      `).join("")}
    ` : ""}

    <div class="rh-mt-12">
      <button class="rh-btn" id="rh-add-snippet-btn">+ \u6DFB\u52A0\u81EA\u5B9A\u4E49\u7247\u6BB5</button>
    </div>
  `;
    container.querySelectorAll(".rh-accordion-header").forEach((header) => {
      header.addEventListener("click", () => {
        header.parentElement.classList.toggle("open");
      });
    });
    container.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(decodeURIComponent(btn.dataset.copy));
        btn.textContent = "\u5DF2\u590D\u5236";
        setTimeout(() => btn.textContent = "\u590D\u5236", 1500);
      });
    });
    container.querySelector("#rh-latex-search")?.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      container.querySelectorAll(".rh-prompt-card").forEach((card) => {
        const text = card.textContent?.toLowerCase() || "";
        card.style.display = text.includes(query) ? "" : "none";
      });
    });
    container.querySelector("#rh-add-snippet-btn")?.addEventListener("click", async () => {
      const name = prompt("\u7247\u6BB5\u540D\u79F0:");
      if (!name)
        return;
      const category = prompt("\u5206\u7C7B:", "\u81EA\u5B9A\u4E49") || "\u81EA\u5B9A\u4E49";
      const code = prompt("LaTeX \u4EE3\u7801:");
      if (!code)
        return;
      await addCustomSnippet({ name, category, code });
      render8(container);
    });
    container.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await removeCustomSnippet(parseInt(btn.dataset.del));
        render8(container);
      });
    });
  }

  // src/modules/lifeTracker.ts
  function todayDate3() {
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
  async function getWaterData() {
    const data = await getJson("water", {});
    return data[todayDate3()] || { cups: 0, goal: 8 };
  }
  async function addCup() {
    const data = await getJson("water", {});
    const today = todayDate3();
    if (!data[today])
      data[today] = { cups: 0, goal: 8 };
    data[today].cups++;
    await setJson("water", data);
    return data[today];
  }
  async function removeCup() {
    const data = await getJson("water", {});
    const today = todayDate3();
    if (data[today] && data[today].cups > 0)
      data[today].cups--;
    await setJson("water", data);
    return data[today] || { cups: 0, goal: 8 };
  }
  async function setWaterGoal(goal) {
    const data = await getJson("water", {});
    const today = todayDate3();
    if (!data[today])
      data[today] = { cups: 0, goal: 8 };
    data[today].goal = goal;
    await setJson("water", data);
  }
  async function addMeal(name, mealType) {
    const meals = await getJson("meals", []);
    const record = { id: Date.now(), name, mealType, date: (/* @__PURE__ */ new Date()).toISOString() };
    meals.unshift(record);
    await setJson("meals", meals);
    return record;
  }
  async function getRecentMeals(count = 10) {
    const meals = await getJson("meals", []);
    return meals.slice(0, count);
  }

  // src/data/foods.ts
  var FOOD_DB = {
    "\u4E2D\u9910": {
      icon: "\u{1F35C}",
      items: [
        { name: "\u5BAB\u4FDD\u9E21\u4E01", type: "\u4E2D\u9910" },
        { name: "\u756A\u8304\u7092\u86CB", type: "\u4E2D\u9910" },
        { name: "\u7EA2\u70E7\u8089", type: "\u4E2D\u9910" },
        { name: "\u9EBB\u5A46\u8C46\u8150", type: "\u4E2D\u9910" },
        { name: "\u9C7C\u9999\u8089\u4E1D", type: "\u4E2D\u9910" },
        { name: "\u56DE\u9505\u8089", type: "\u4E2D\u9910" },
        { name: "\u6C34\u716E\u9C7C", type: "\u4E2D\u9910" },
        { name: "\u9178\u83DC\u9C7C", type: "\u4E2D\u9910" },
        { name: "\u7092\u996D", type: "\u4E2D\u9910" },
        { name: "\u997A\u5B50", type: "\u4E2D\u9910" },
        { name: "\u9762\u6761", type: "\u4E2D\u9910" },
        { name: "\u706B\u9505", type: "\u4E2D\u9910" },
        { name: "\u5317\u4EAC\u70E4\u9E2D", type: "\u4E2D\u9910" },
        { name: "\u4E1C\u5761\u8089", type: "\u4E2D\u9910" },
        { name: "\u7CD6\u918B\u6392\u9AA8", type: "\u4E2D\u9910" },
        { name: "\u8FA3\u5B50\u9E21", type: "\u4E2D\u9910" },
        { name: "\u6BDB\u8840\u65FA", type: "\u4E2D\u9910" },
        { name: "\u592B\u59BB\u80BA\u7247", type: "\u4E2D\u9910" },
        { name: "\u849C\u6CE5\u767D\u8089", type: "\u4E2D\u9910" },
        { name: "\u5E72\u7178\u8C46\u89D2", type: "\u4E2D\u9910" },
        { name: "\u5730\u4E09\u9C9C", type: "\u4E2D\u9910" },
        { name: "\u6E05\u84B8\u9C88\u9C7C", type: "\u4E2D\u9910" },
        { name: "\u767D\u5207\u9E21", type: "\u4E2D\u9910" },
        { name: "\u53E3\u6C34\u9E21", type: "\u4E2D\u9910" },
        { name: "\u70E4\u4E73\u732A", type: "\u4E2D\u9910" },
        { name: "\u4F5B\u8DF3\u5899", type: "\u4E2D\u9910" },
        { name: "\u72EE\u5B50\u5934", type: "\u4E2D\u9910" },
        { name: "\u626C\u5DDE\u7092\u996D", type: "\u4E2D\u9910" },
        { name: "\u80A0\u7C89", type: "\u4E2D\u9910" },
        { name: "\u867E\u997A", type: "\u4E2D\u9910" },
        { name: "\u70E7\u5356", type: "\u4E2D\u9910" },
        { name: "\u53C9\u70E7\u5305", type: "\u4E2D\u9910" },
        { name: "\u62C5\u62C5\u9762", type: "\u4E2D\u9910" },
        { name: "\u70B8\u9171\u9762", type: "\u4E2D\u9910" },
        { name: "\u5170\u5DDE\u62C9\u9762", type: "\u4E2D\u9910" },
        { name: "\u8FC7\u6865\u7C73\u7EBF", type: "\u4E2D\u9910" },
        { name: "\u87BA\u86F3\u7C89", type: "\u4E2D\u9910" },
        { name: "\u9178\u8FA3\u7C89", type: "\u4E2D\u9910" },
        { name: "\u714E\u997C\u679C\u5B50", type: "\u4E2D\u9910" },
        { name: "\u8089\u5939\u998D", type: "\u4E2D\u9910" },
        { name: "\u7F8A\u8089\u6CE1\u998D", type: "\u4E2D\u9910" },
        { name: "\u5C0F\u7B3C\u5305", type: "\u4E2D\u9910" },
        { name: "\u751F\u714E\u5305", type: "\u4E2D\u9910" },
        { name: "\u704C\u6C64\u5305", type: "\u4E2D\u9910" },
        { name: "\u6625\u5377", type: "\u4E2D\u9910" },
        { name: "\u9EBB\u56E2", type: "\u4E2D\u9910" },
        { name: "\u6CB9\u6761", type: "\u4E2D\u9910" },
        { name: "\u8C46\u6D46", type: "\u4E2D\u9910" },
        { name: "\u8C46\u8150\u8111", type: "\u4E2D\u9910" },
        { name: "\u76AE\u86CB\u7626\u8089\u7CA5", type: "\u4E2D\u9910" },
        { name: "\u5241\u6912\u9C7C\u5934", type: "\u4E2D\u9910" },
        { name: "\u5C0F\u7092\u9EC4\u725B\u8089", type: "\u4E2D\u9910" },
        { name: "\u918B\u6E9C\u767D\u83DC", type: "\u4E2D\u9910" },
        { name: "\u5E72\u9505\u82B1\u83DC", type: "\u4E2D\u9910" },
        { name: "\u624B\u6495\u5305\u83DC", type: "\u4E2D\u9910" },
        { name: "\u9178\u8FA3\u571F\u8C46\u4E1D", type: "\u4E2D\u9910" },
        { name: "\u9752\u6912\u8089\u4E1D", type: "\u4E2D\u9910" },
        { name: "\u6728\u987B\u8089", type: "\u4E2D\u9910" },
        { name: "\u4EAC\u9171\u8089\u4E1D", type: "\u4E2D\u9910" },
        { name: "\u9C7C\u9999\u8304\u5B50", type: "\u4E2D\u9910" },
        { name: "\u8682\u8681\u4E0A\u6811", type: "\u4E2D\u9910" },
        { name: "\u864E\u76AE\u9752\u6912", type: "\u4E2D\u9910" },
        { name: "\u62D4\u4E1D\u5730\u74DC", type: "\u4E2D\u9910" },
        { name: "\u9505\u5305\u8089", type: "\u4E2D\u9910" },
        { name: "\u5730\u9505\u9E21", type: "\u4E2D\u9910" },
        { name: "\u5C0F\u9E21\u7096\u8611\u83C7", type: "\u4E2D\u9910" },
        { name: "\u732A\u8089\u7096\u7C89\u6761", type: "\u4E2D\u9910" },
        { name: "\u94C1\u9505\u7096\u5927\u9E45", type: "\u4E2D\u9910" },
        { name: "\u4E1C\u5317\u4E71\u7096", type: "\u4E2D\u9910" },
        { name: "\u9178\u83DC\u767D\u8089", type: "\u4E2D\u9910" },
        { name: "\u9171\u9AA8\u67B6", type: "\u4E2D\u9910" },
        { name: "\u6E9C\u8089\u6BB5", type: "\u4E2D\u9910" },
        { name: "\u96EA\u8863\u8C46\u6C99", type: "\u4E2D\u9910" },
        { name: "\u677E\u4EC1\u7389\u7C73", type: "\u4E2D\u9910" },
        { name: "\u86CB\u9EC4\u7117\u5357\u74DC", type: "\u4E2D\u9910" },
        { name: "\u8471\u70E7\u6D77\u53C2", type: "\u4E2D\u9910" },
        { name: "\u6CB9\u7116\u5927\u867E", type: "\u4E2D\u9910" },
        { name: "\u6E05\u7092\u65F6\u852C", type: "\u4E2D\u9910" },
        { name: "\u4E0A\u6C64\u5A03\u5A03\u83DC", type: "\u4E2D\u9910" },
        { name: "\u849C\u84C9\u897F\u5170\u82B1", type: "\u4E2D\u9910" },
        { name: "\u869D\u6CB9\u751F\u83DC", type: "\u4E2D\u9910" },
        { name: "\u767D\u707C\u83DC\u5FC3", type: "\u4E2D\u9910" },
        { name: "\u6E05\u7092\u7A7A\u5FC3\u83DC", type: "\u4E2D\u9910" },
        { name: "\u5E72\u7178\u56DB\u5B63\u8C46", type: "\u4E2D\u9910" },
        { name: "\u7EA2\u70E7\u8304\u5B50", type: "\u4E2D\u9910" },
        { name: "\u9C7C\u9999\u674F\u9C8D\u83C7", type: "\u4E2D\u9910" },
        { name: "\u4E09\u676F\u9E21", type: "\u4E2D\u9910" },
        { name: "\u9189\u9E21", type: "\u4E2D\u9910" },
        { name: "\u76D0\u7117\u9E21", type: "\u4E2D\u9910" },
        { name: "\u8C49\u6CB9\u9E21", type: "\u4E2D\u9910" },
        { name: "\u8471\u6CB9\u9E21", type: "\u4E2D\u9910" },
        { name: "\u53EB\u82B1\u9E21", type: "\u4E2D\u9910" },
        { name: "\u5564\u9152\u9E2D", type: "\u4E2D\u9910" },
        { name: "\u59DC\u6BCD\u9E2D", type: "\u4E2D\u9910" },
        { name: "\u5364\u9E2D\u8116", type: "\u4E2D\u9910" },
        { name: "\u9171\u677F\u9E2D", type: "\u4E2D\u9910" },
        { name: "\u70E4\u9E2D\u67B6", type: "\u4E2D\u9910" },
        { name: "\u9E2D\u8840\u7C89\u4E1D\u6C64", type: "\u4E2D\u9910" },
        { name: "\u897F\u6E56\u725B\u8089\u7FB9", type: "\u4E2D\u9910" },
        { name: "\u9178\u8FA3\u6C64", type: "\u4E2D\u9910" },
        { name: "\u7389\u7C73\u6392\u9AA8\u6C64", type: "\u4E2D\u9910" },
        { name: "\u51AC\u74DC\u4E38\u5B50\u6C64", type: "\u4E2D\u9910" },
        { name: "\u756A\u8304\u86CB\u82B1\u6C64", type: "\u4E2D\u9910" },
        { name: "\u7D2B\u83DC\u86CB\u82B1\u6C64", type: "\u4E2D\u9910" },
        { name: "\u7599\u7629\u6C64", type: "\u4E2D\u9910" },
        { name: "\u80E1\u8FA3\u6C64", type: "\u4E2D\u9910" },
        { name: "\u7092\u997C", type: "\u4E2D\u9910" },
        { name: "\u7092\u6CB3\u7C89", type: "\u4E2D\u9910" },
        { name: "\u7172\u4ED4\u996D", type: "\u4E2D\u9910" },
        { name: "\u7AF9\u7B52\u996D", type: "\u4E2D\u9910" },
        { name: "\u7CEF\u7C73\u9E21", type: "\u4E2D\u9910" },
        { name: "\u8377\u53F6\u996D", type: "\u4E2D\u9910" },
        { name: "\u7CA2\u996D\u56E2", type: "\u4E2D\u9910" },
        { name: "\u996D\u56E2", type: "\u4E2D\u9910" },
        { name: "\u7C73\u7CD5", type: "\u4E2D\u9910" },
        { name: "\u53D1\u7CD5", type: "\u4E2D\u9910" },
        { name: "\u7A9D\u7A9D\u5934", type: "\u4E2D\u9910" },
        { name: "\u82B1\u5377", type: "\u4E2D\u9910" },
        { name: "\u9992\u5934", type: "\u4E2D\u9910" },
        { name: "\u5305\u5B50", type: "\u4E2D\u9910" },
        { name: "\u9984\u9968", type: "\u4E2D\u9910" },
        { name: "\u6284\u624B", type: "\u4E2D\u9910" },
        { name: "\u4E91\u541E", type: "\u4E2D\u9910" },
        { name: "\u70E7\u997C", type: "\u4E2D\u9910" },
        { name: "\u6CB9\u997C", type: "\u4E2D\u9910" },
        { name: "\u9EBB\u82B1", type: "\u4E2D\u9910" },
        { name: "\u86CB\u631E", type: "\u4E2D\u9910" },
        { name: "\u8001\u5A46\u997C", type: "\u4E2D\u9910" },
        { name: "\u51E4\u68A8\u9165", type: "\u4E2D\u9910" },
        { name: "\u86CB\u9EC4\u9165", type: "\u4E2D\u9910" },
        { name: "\u6708\u997C", type: "\u4E2D\u9910" },
        { name: "\u7CBD\u5B50", type: "\u4E2D\u9910" },
        { name: "\u6C64\u5706", type: "\u4E2D\u9910" },
        { name: "\u5E74\u7CD5", type: "\u4E2D\u9910" },
        { name: "\u516B\u5B9D\u996D", type: "\u4E2D\u9910" },
        { name: "\u7CD6\u4E0D\u7529", type: "\u4E2D\u9910" },
        { name: "\u53CC\u76AE\u5976", type: "\u4E2D\u9910" },
        { name: "\u59DC\u649E\u5976", type: "\u4E2D\u9910" },
        { name: "\u6768\u679D\u7518\u9732", type: "\u4E2D\u9910" },
        { name: "\u9F9F\u82D3\u818F", type: "\u4E2D\u9910" }
      ]
    },
    "\u897F\u9910": {
      icon: "\u{1F35D}",
      items: [
        { name: "\u610F\u5927\u5229\u9762", type: "\u897F\u9910" },
        { name: "\u62AB\u8428", type: "\u897F\u9910" },
        { name: "\u725B\u6392", type: "\u897F\u9910" },
        { name: "\u6C49\u5821", type: "\u897F\u9910" },
        { name: "\u85AF\u6761", type: "\u897F\u9910" },
        { name: "\u70B8\u9E21", type: "\u897F\u9910" },
        { name: "\u6C99\u62C9", type: "\u897F\u9910" },
        { name: "\u6D53\u6C64", type: "\u897F\u9910" },
        { name: "\u4E09\u660E\u6CBB", type: "\u897F\u9910" },
        { name: "\u70ED\u72D7", type: "\u897F\u9910" },
        { name: "\u70E4\u9E21\u7FC5", type: "\u897F\u9910" },
        { name: "\u70E4\u7F8A\u6392", type: "\u897F\u9910" },
        { name: "\u6CD5\u5F0F\u8717\u725B", type: "\u897F\u9910" },
        { name: "\u9E45\u809D", type: "\u897F\u9910" },
        { name: "\u9ED1\u677E\u9732\u70E9\u996D", type: "\u897F\u9910" },
        { name: "\u897F\u73ED\u7259\u6D77\u9C9C\u996D", type: "\u897F\u9910" },
        { name: "\u58A8\u9C7C\u996D", type: "\u897F\u9910" },
        { name: "\u8089\u9171\u5343\u5C42\u9762", type: "\u897F\u9910" },
        { name: "\u5976\u6CB9\u8611\u83C7\u6C64", type: "\u897F\u9910" },
        { name: "\u7F57\u5B8B\u6C64", type: "\u897F\u9910" },
        { name: "\u6D77\u9C9C\u6D53\u6C64", type: "\u897F\u9910" },
        { name: "\u51EF\u6492\u6C99\u62C9", type: "\u897F\u9910" },
        { name: "\u5E0C\u814A\u6C99\u62C9", type: "\u897F\u9910" },
        { name: "\u70E4\u852C\u83DC", type: "\u897F\u9910" },
        { name: "\u70E4\u571F\u8C46", type: "\u897F\u9910" },
        { name: "\u571F\u8C46\u6CE5", type: "\u897F\u9910" },
        { name: "\u5976\u916A\u901A\u5FC3\u7C89", type: "\u897F\u9910" },
        { name: "\u70B8\u9C7C\u85AF\u6761", type: "\u897F\u9910" },
        { name: "\u7267\u7F8A\u4EBA\u6D3E", type: "\u897F\u9910" },
        { name: "\u60E0\u7075\u987F\u725B\u6392", type: "\u897F\u9910" },
        { name: "T\u9AA8\u725B\u6392", type: "\u897F\u9910" },
        { name: "\u808B\u773C\u725B\u6392", type: "\u897F\u9910" },
        { name: "\u897F\u51B7\u725B\u6392", type: "\u897F\u9910" },
        { name: "\u70E4\u9F99\u867E", type: "\u897F\u9910" },
        { name: "\u849C\u9999\u9762\u5305", type: "\u897F\u9910" },
        { name: "\u5976\u6CB9\u7117\u751F\u869D", type: "\u897F\u9910" },
        { name: "\u7EA2\u9152\u7096\u725B\u8089", type: "\u897F\u9910" },
        { name: "\u666E\u7F57\u65FA\u65AF\u7096\u83DC", type: "\u897F\u9910" },
        { name: "\u9A6C\u8D5B\u9C7C\u6C64", type: "\u897F\u9910" },
        { name: "\u6CD5\u5F0F\u6D0B\u8471\u6C64", type: "\u897F\u9910" },
        { name: "\u53EF\u4E3D\u997C", type: "\u897F\u9910" },
        { name: "\u534E\u592B\u997C", type: "\u897F\u9910" },
        { name: "\u73ED\u5C3C\u8FEA\u514B\u86CB", type: "\u897F\u9910" },
        { name: "\u7F8E\u5F0F\u65E9\u9910", type: "\u897F\u9910" },
        { name: "\u82F1\u5F0F\u65E9\u9910", type: "\u897F\u9910" },
        { name: "\u6CD5\u5F0F\u5410\u53F8", type: "\u897F\u9910" },
        { name: "\u57F9\u6839\u714E\u86CB", type: "\u897F\u9910" },
        { name: "\u9999\u80A0", type: "\u897F\u9910" },
        { name: "\u8089\u4E38", type: "\u897F\u9910" },
        { name: "\u70E4\u6392\u9AA8", type: "\u897F\u9910" }
      ]
    },
    "\u65E5\u6599": {
      icon: "\u{1F363}",
      items: [
        { name: "\u5BFF\u53F8", type: "\u65E5\u6599" },
        { name: "\u523A\u8EAB", type: "\u65E5\u6599" },
        { name: "\u5929\u5987\u7F57", type: "\u65E5\u6599" },
        { name: "\u62C9\u9762", type: "\u65E5\u6599" },
        { name: "\u4E4C\u51AC\u9762", type: "\u65E5\u6599" },
        { name: "\u835E\u9EA6\u9762", type: "\u65E5\u6599" },
        { name: "\u65E5\u5F0F\u5496\u55B1\u996D", type: "\u65E5\u6599" },
        { name: "\u70B8\u732A\u6392", type: "\u65E5\u6599" },
        { name: "\u7167\u70E7\u9E21", type: "\u65E5\u6599" },
        { name: "\u5473\u589E\u6C64", type: "\u65E5\u6599" },
        { name: "\u8336\u7897\u84B8", type: "\u65E5\u6599" },
        { name: "\u7389\u5B50\u70E7", type: "\u65E5\u6599" },
        { name: "\u7AE0\u9C7C\u70E7", type: "\u65E5\u6599" },
        { name: "\u5927\u962A\u70E7", type: "\u65E5\u6599" },
        { name: "\u5FA1\u597D\u70E7", type: "\u65E5\u6599" },
        { name: "\u65E5\u5F0F\u714E\u997A", type: "\u65E5\u6599" },
        { name: "\u996D\u56E2", type: "\u65E5\u6599" },
        { name: "\u4EB2\u5B50\u4E3C", type: "\u65E5\u6599" },
        { name: "\u725B\u4E3C", type: "\u65E5\u6599" },
        { name: "\u9CD7\u9C7C\u996D", type: "\u65E5\u6599" },
        { name: "\u6D77\u9C9C\u4E3C", type: "\u65E5\u6599" },
        { name: "\u5BFF\u559C\u70E7", type: "\u65E5\u6599" },
        { name: "\u6DAE\u6DAE\u9505", type: "\u65E5\u6599" },
        { name: "\u5173\u4E1C\u716E", type: "\u65E5\u6599" },
        { name: "\u70E4\u4E32", type: "\u65E5\u6599" },
        { name: "\u70B8\u9E21\u5757", type: "\u65E5\u6599" },
        { name: "\u65E5\u5F0F\u70B8\u8C46\u8150", type: "\u65E5\u6599" },
        { name: "\u51B7\u5974", type: "\u65E5\u6599" },
        { name: "\u548C\u679C\u5B50", type: "\u65E5\u6599" },
        { name: "\u5927\u798F", type: "\u65E5\u6599" },
        { name: "\u94DC\u9523\u70E7", type: "\u65E5\u6599" }
      ]
    },
    "\u97E9\u6599": {
      icon: "\u{1F35B}",
      items: [
        { name: "\u6CE1\u83DC", type: "\u97E9\u6599" },
        { name: "\u77F3\u9505\u62CC\u996D", type: "\u97E9\u6599" },
        { name: "\u97E9\u5F0F\u70E4\u8089", type: "\u97E9\u6599" },
        { name: "\u70B8\u9E21", type: "\u97E9\u6599" },
        { name: "\u7092\u5E74\u7CD5", type: "\u97E9\u6599" },
        { name: "\u5927\u9171\u6C64", type: "\u97E9\u6599" },
        { name: "\u6CE1\u83DC\u6C64", type: "\u97E9\u6599" },
        { name: "\u90E8\u961F\u9505", type: "\u97E9\u6599" },
        { name: "\u53C2\u9E21\u6C64", type: "\u97E9\u6599" },
        { name: "\u51B7\u9762", type: "\u97E9\u6599" },
        { name: "\u97E9\u5F0F\u62CC\u9762", type: "\u97E9\u6599" },
        { name: "\u6D77\u9C9C\u8471\u997C", type: "\u97E9\u6599" },
        { name: "\u6CE1\u83DC\u997C", type: "\u97E9\u6599" },
        { name: "\u571F\u8C46\u997C", type: "\u97E9\u6599" },
        { name: "\u97E9\u5F0F\u7D2B\u83DC\u5305\u996D", type: "\u97E9\u6599" },
        { name: "\u97E9\u5F0F\u70B8\u9171\u9762", type: "\u97E9\u6599" },
        { name: "\u8FA3\u7092\u7AE0\u9C7C", type: "\u97E9\u6599" },
        { name: "\u70E4\u4E94\u82B1\u8089", type: "\u97E9\u6599" },
        { name: "\u70E4\u725B\u80A0", type: "\u97E9\u6599" },
        { name: "\u732A\u8E44", type: "\u97E9\u6599" }
      ]
    },
    "\u4E1C\u5357\u4E9A\u83DC": {
      icon: "\u{1F372}",
      items: [
        { name: "\u51AC\u9634\u529F\u6C64", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u7EFF\u5496\u55B1\u9E21", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u7EA2\u5496\u55B1\u9E2D", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u8292\u679C\u7CEF\u7C73\u996D", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u6CF0\u5F0F\u7092\u6CB3\u7C89", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u6CF0\u5F0F\u5976\u8336", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u8D8A\u5357\u6CB3\u7C89", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u8D8A\u5357\u6625\u5377", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u5370\u5C3C\u7092\u996D", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u5DF4\u4E1C\u725B\u8089", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u53FB\u6C99", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u6930\u6D46\u996D", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u6C99\u7239\u8089\u4E32", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u83E0\u841D\u996D", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u9752\u6728\u74DC\u6C99\u62C9", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u6CF0\u5F0F\u751F\u867E", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u5496\u55B1\u87F9", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u70E4\u9C7C", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u83F2\u5F0F\u70E4\u4E73\u732A", type: "\u4E1C\u5357\u4E9A\u83DC" },
        { name: "\u65B0\u52A0\u5761\u8FA3\u6912\u87F9", type: "\u4E1C\u5357\u4E9A\u83DC" }
      ]
    },
    "\u5370\u5EA6\u83DC": {
      icon: "\u{1F35B}",
      items: [
        { name: "\u9EC4\u6CB9\u9E21", type: "\u5370\u5EA6\u83DC" },
        { name: "\u83E0\u83DC\u829D\u58EB", type: "\u5370\u5EA6\u83DC" },
        { name: "\u5496\u55B1\u7F8A\u8089", type: "\u5370\u5EA6\u83DC" },
        { name: "\u5766\u5EA6\u91CC\u70E4\u9E21", type: "\u5370\u5EA6\u83DC" },
        { name: "\u5370\u5EA6\u70E4\u997C", type: "\u5370\u5EA6\u83DC" },
        { name: "\u739B\u838E\u62C9\u8336", type: "\u5370\u5EA6\u83DC" },
        { name: "\u8428\u83AB\u8428\u4E09\u89D2\u997A", type: "\u5370\u5EA6\u83DC" },
        { name: "\u9E21\u8089\u9999\u996D", type: "\u5370\u5EA6\u83DC" },
        { name: "\u6930\u5976\u5496\u55B1\u9C7C", type: "\u5370\u5EA6\u83DC" },
        { name: "\u6241\u8C46\u6C64", type: "\u5370\u5EA6\u83DC" },
        { name: "\u571F\u8C46\u82B1\u83DC", type: "\u5370\u5EA6\u83DC" },
        { name: "\u5370\u5EA6\u5976\u916A\u4E38", type: "\u5370\u5EA6\u83DC" },
        { name: "\u5370\u5EA6\u9178\u5976", type: "\u5370\u5EA6\u83DC" },
        { name: "\u8292\u679C\u62C9\u897F", type: "\u5370\u5EA6\u83DC" },
        { name: "\u73AB\u7470\u5976\u7403", type: "\u5370\u5EA6\u83DC" }
      ]
    },
    "\u58A8\u897F\u54E5\u83DC": {
      icon: "\u{1F32E}",
      items: [
        { name: "\u5854\u53EF", type: "\u58A8\u897F\u54E5\u83DC" },
        { name: "\u58A8\u897F\u54E5\u5377\u997C", type: "\u58A8\u897F\u54E5\u83DC" },
        { name: "\u7389\u7C73\u7247", type: "\u58A8\u897F\u54E5\u83DC" },
        { name: "\u9CC4\u68A8\u9171", type: "\u58A8\u897F\u54E5\u83DC" },
        { name: "\u58A8\u897F\u54E5\u7C73\u996D", type: "\u58A8\u897F\u54E5\u83DC" },
        { name: "\u9ED1\u8C46", type: "\u58A8\u897F\u54E5\u83DC" },
        { name: "\u5976\u916A\u9985\u997C", type: "\u58A8\u897F\u54E5\u83DC" },
        { name: "\u8FA3\u6912\u8089\u9171", type: "\u58A8\u897F\u54E5\u83DC" },
        { name: "\u70E4\u7389\u7C73", type: "\u58A8\u897F\u54E5\u83DC" },
        { name: "\u4ED9\u4EBA\u638C\u6C99\u62C9", type: "\u58A8\u897F\u54E5\u83DC" }
      ]
    },
    "\u751C\u70B9\u70D8\u7119": {
      icon: "\u{1F370}",
      items: [
        { name: "\u63D0\u62C9\u7C73\u82CF", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u829D\u58EB\u86CB\u7CD5", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u5DE7\u514B\u529B\u7194\u5CA9\u86CB\u7CD5", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u9A6C\u5361\u9F99", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u6CE1\u8299", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u66F2\u5947\u997C\u5E72", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u5E03\u6717\u5C3C", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u751C\u751C\u5708", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u86CB\u631E", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u5E03\u4E01", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u51B0\u6DC7\u6DCB", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u5976\u6614", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u534E\u592B\u997C", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u53EF\u9882", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u5410\u53F8", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u8089\u6842\u5377", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u8774\u8776\u9165", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u62FF\u7834\u4ED1\u86CB\u7CD5", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u6155\u65AF", type: "\u751C\u70B9\u70D8\u7119" },
        { name: "\u8349\u8393\u86CB\u7CD5", type: "\u751C\u70B9\u70D8\u7119" }
      ]
    },
    "\u996E\u54C1": {
      icon: "\u{1F964}",
      items: [
        { name: "\u5496\u5561", type: "\u996E\u54C1" },
        { name: "\u62FF\u94C1", type: "\u996E\u54C1" },
        { name: "\u5361\u5E03\u5947\u8BFA", type: "\u996E\u54C1" },
        { name: "\u7F8E\u5F0F\u5496\u5561", type: "\u996E\u54C1" },
        { name: "\u7EA2\u8336", type: "\u996E\u54C1" },
        { name: "\u7EFF\u8336", type: "\u996E\u54C1" },
        { name: "\u5976\u8336", type: "\u996E\u54C1" },
        { name: "\u679C\u6C41", type: "\u996E\u54C1" },
        { name: "\u53EF\u4E50", type: "\u996E\u54C1" },
        { name: "\u96EA\u78A7", type: "\u996E\u54C1" },
        { name: "\u9E21\u5C3E\u9152", type: "\u996E\u54C1" },
        { name: "\u5564\u9152", type: "\u996E\u54C1" },
        { name: "\u7EA2\u9152", type: "\u996E\u54C1" },
        { name: "\u9999\u69DF", type: "\u996E\u54C1" },
        { name: "\u5976\u6614", type: "\u996E\u54C1" },
        { name: "\u8C46\u5976", type: "\u996E\u54C1" },
        { name: "\u67E0\u6AAC\u6C34", type: "\u996E\u54C1" },
        { name: "\u8FD0\u52A8\u996E\u6599", type: "\u996E\u54C1" },
        { name: "\u80FD\u91CF\u996E\u6599", type: "\u996E\u54C1" },
        { name: "\u6930\u5B50\u6C34", type: "\u996E\u54C1" }
      ]
    }
  };

  // src/ui/tabs/lifeTab.ts
  async function render9(container) {
    const water = await getWaterData();
    const meals = await getRecentMeals(8);
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">\u4ECA\u65E5\u559D\u6C34</div>
      <div class="rh-text-center">
        <div class="rh-water-cups" id="rh-water-cups">
          ${Array.from(
      { length: Math.max(water.goal, water.cups) },
      (_, i) => `<span class="rh-water-cup" data-idx="${i}">${i < water.cups ? "\u{1F964}" : "\u{1F95B}"}</span>`
    ).join("")}
        </div>
        <div class="rh-mt-8" style="font-size:14px;font-weight:600">${water.cups} / ${water.goal} \u676F</div>
        <div class="rh-flex rh-mt-8" style="justify-content:center;gap:8px">
          <button class="rh-btn rh-btn-primary" id="rh-water-add">+ \u4E00\u676F</button>
          <button class="rh-btn" id="rh-water-remove">- \u4E00\u676F</button>
          <select class="rh-select" id="rh-water-goal">
            ${[6, 8, 10, 12].map((g) => `<option value="${g}" ${g === water.goal ? "selected" : ""}>\u76EE\u6807: ${g}\u676F</option>`).join("")}
          </select>
        </div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">\u4ECA\u5929\u5403\u4EC0\u4E48\uFF1F</div>
      <div class="rh-flex-col">
        <div class="rh-cat-filters" id="rh-food-cats">
          ${Object.entries(FOOD_DB).map(
      ([cat, data]) => `<button class="rh-cat-btn" data-cat="${cat}">${data.icon} ${cat}</button>`
    ).join("")}
          <button class="rh-cat-btn active" data-cat="random">\u968F\u673A\u63A8\u8350</button>
        </div>
        <div id="rh-food-result" class="rh-text-center" style="font-size:18px;padding:16px;min-height:60px">
          \u70B9\u51FB\u5206\u7C7B\u6216\u968F\u673A\u63A8\u8350
        </div>
        <div class="rh-flex" style="justify-content:center">
          <button class="rh-btn rh-btn-primary" id="rh-food-pick">\u968F\u673A\u63A8\u8350</button>
          <button class="rh-btn" id="rh-food-record" style="display:none">\u8BB0\u5F55\u8FD9\u9910</button>
        </div>
      </div>
    </div>

    ${meals.length > 0 ? `
      <div class="rh-card">
        <div class="rh-card-title">\u6700\u8FD1\u996E\u98DF\u8BB0\u5F55</div>
        ${meals.map((m) => `
          <div style="padding:4px 0;font-size:12px;color:#666;border-bottom:1px solid #f0f0f0">
            ${new Date(m.date).toLocaleDateString("zh-CN")} ${m.mealType} - ${m.name}
          </div>
        `).join("")}
      </div>
    ` : ""}
  `;
    let lastPick = "";
    container.querySelector("#rh-water-add")?.addEventListener("click", async () => {
      await addCup();
      render9(container);
    });
    container.querySelector("#rh-water-remove")?.addEventListener("click", async () => {
      await removeCup();
      render9(container);
    });
    container.querySelector("#rh-water-goal")?.addEventListener("change", async (e) => {
      await setWaterGoal(parseInt(e.target.value));
      render9(container);
    });
    container.querySelector("#rh-food-cats")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".rh-cat-btn");
      if (!btn)
        return;
      container.querySelectorAll("#rh-food-cats .rh-cat-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
    container.querySelector("#rh-food-pick")?.addEventListener("click", () => {
      const allItems = Object.values(FOOD_DB).flatMap((d) => d.items);
      const pick = allItems[Math.floor(Math.random() * allItems.length)];
      lastPick = pick.name;
      const result = container.querySelector("#rh-food-result");
      result.innerHTML = `<span style="font-size:24px;font-weight:700">${pick.name}</span><div class="rh-text-sm rh-mt-8">${pick.type}</div>`;
      container.querySelector("#rh-food-record").style.display = "";
    });
    container.querySelector("#rh-food-record")?.addEventListener("click", async () => {
      if (!lastPick)
        return;
      const mealType = prompt("\u9910\u6B21 (\u65E9\u9910/\u5348\u9910/\u665A\u9910/\u96F6\u98DF):", "\u5348\u9910") || "\u5348\u9910";
      await addMeal(lastPick, mealType);
      render9(container);
    });
  }
  function destroy8() {
  }

  // src/data/quotes.ts
  var QUOTES = [
    { text: "\u79D1\u5B66\u662F\u6C38\u65E0\u6B62\u5883\u7684\uFF0C\u5B83\u662F\u4E00\u4E2A\u6C38\u6052\u4E4B\u8C1C\u3002", author: "\u7231\u56E0\u65AF\u5766" },
    { text: "\u7814\u7A76\u8981\u6709\u6052\u5FC3\uFF0C\u6709\u5FD7\u8005\u4E8B\u7ADF\u6210\u3002", author: "\u94B1\u5B66\u68EE" },
    { text: "\u5728\u79D1\u5B66\u4E0A\u6CA1\u6709\u5E73\u5766\u7684\u5927\u9053\uFF0C\u53EA\u6709\u4E0D\u754F\u52B3\u82E6\u6CBF\u7740\u9661\u5CED\u5C71\u8DEF\u6500\u767B\u7684\u4EBA\uFF0C\u624D\u6709\u5E0C\u671B\u8FBE\u5230\u5149\u8F89\u7684\u9876\u70B9\u3002", author: "\u9A6C\u514B\u601D" },
    { text: "\u597D\u5947\u5FC3\u662F\u79D1\u5B66\u5DE5\u4F5C\u8005\u4EA7\u751F\u65E0\u7A77\u6BC5\u529B\u548C\u8010\u5FC3\u7684\u6E90\u6CC9\u3002", author: "\u7231\u56E0\u65AF\u5766" },
    { text: "\u4E00\u5207\u63A8\u7406\u90FD\u5FC5\u987B\u4ECE\u89C2\u5BDF\u4E0E\u5B9E\u9A8C\u4E2D\u5F97\u6765\u3002", author: "\u4F3D\u5229\u7565" },
    { text: "\u7EB8\u4E0A\u5F97\u6765\u7EC8\u89C9\u6D45\uFF0C\u7EDD\u77E5\u6B64\u4E8B\u8981\u8EAC\u884C\u3002", author: "\u9646\u6E38" },
    { text: "\u79D1\u5B66\u7684\u552F\u4E00\u76EE\u7684\u662F\u51CF\u8F7B\u4EBA\u7C7B\u751F\u5B58\u7684\u82E6\u96BE\uFF0C\u79D1\u5B66\u5BB6\u5E94\u4E3A\u5927\u591A\u6570\u4EBA\u7740\u60F3\u3002", author: "\u4F3D\u5229\u7565" },
    { text: "\u6CA1\u6709\u5927\u80C6\u7684\u731C\u6D4B\u5C31\u4F5C\u4E0D\u51FA\u4F1F\u5927\u7684\u53D1\u73B0\u3002", author: "\u725B\u987F" },
    { text: "\u5982\u679C\u8BF4\u6211\u770B\u5F97\u8FDC\uFF0C\u90A3\u662F\u56E0\u4E3A\u6211\u7AD9\u5728\u5DE8\u4EBA\u7684\u80A9\u4E0A\u3002", author: "\u725B\u987F" },
    { text: "\u5929\u624D\u5C31\u662F\u767E\u5206\u4E4B\u4E00\u7684\u7075\u611F\u52A0\u767E\u5206\u4E4B\u4E5D\u5341\u4E5D\u7684\u6C57\u6C34\u3002", author: "\u7231\u8FEA\u751F" }
  ];

  // src/modules/quotes.ts
  function getRandomQuote() {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }
  async function getInspirations() {
    return getJson("inspirations", []);
  }
  async function addInspiration(item) {
    const list = await getJson("inspirations", []);
    const record = {
      id: Date.now(),
      title: item.title,
      content: item.content,
      tags: item.tags || "",
      color: item.color || "#3b82f6",
      pinned: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    list.unshift(record);
    await setJson("inspirations", list);
    return record;
  }
  async function updateInspiration(id, updates) {
    const list = await getJson("inspirations", []);
    const idx = list.findIndex((i) => i.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      await setJson("inspirations", list);
    }
  }
  async function removeInspiration(id) {
    const list = await getJson("inspirations", []);
    await setJson(
      "inspirations",
      list.filter((i) => i.id !== id)
    );
  }

  // src/ui/tabs/quotesTab.ts
  async function render10(container) {
    const quote = getRandomQuote();
    const inspirations = await getInspirations();
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-quote" id="rh-quote-text">"${quote.text}"</div>
      <div class="rh-quote-author">\u2014\u2014 ${quote.author}</div>
      <div class="rh-text-center rh-mt-8">
        <button class="rh-btn" id="rh-quote-refresh">\u6362\u4E00\u6761</button>
      </div>
    </div>

    <div class="rh-section-header">\u7075\u611F\u677F</div>
    <div class="rh-mb-12">
      <button class="rh-btn rh-btn-primary" id="rh-add-insp">+ \u8BB0\u5F55\u7075\u611F</button>
    </div>

    <div id="rh-insp-list">
      ${inspirations.length === 0 ? '<div class="rh-text-sm rh-text-center" style="padding:20px;color:#999">\u6682\u65E0\u7075\u611F\u8BB0\u5F55</div>' : ""}
      ${sortInspirations(inspirations).map((insp) => `
        <div class="rh-card" style="border-left:4px solid ${insp.color}">
          <div class="rh-flex" style="justify-content:space-between">
            <div style="font-weight:600;font-size:14px">${insp.pinned ? "\u{1F4CC} " : ""}${insp.title}</div>
            <div class="rh-flex" style="gap:4px">
              <button class="rh-btn" data-pin="${insp.id}" style="font-size:11px;padding:2px 6px">${insp.pinned ? "\u53D6\u6D88\u7F6E\u9876" : "\u7F6E\u9876"}</button>
              <button class="rh-btn rh-btn-danger" data-del="${insp.id}" style="font-size:11px;padding:2px 6px">\u5220\u9664</button>
            </div>
          </div>
          ${insp.tags ? `<div class="rh-mt-8">${insp.tags.split(",").map((t) => `<span class="rh-tag">${t.trim()}</span>`).join(" ")}</div>` : ""}
          <div class="rh-mt-8" style="font-size:12px;color:#555;line-height:1.6">${insp.content}</div>
          <div class="rh-text-sm rh-mt-8">${new Date(insp.createdAt).toLocaleString("zh-CN")}</div>
        </div>
      `).join("")}
    </div>
  `;
    container.querySelector("#rh-quote-refresh")?.addEventListener("click", () => {
      const q = getRandomQuote();
      container.querySelector("#rh-quote-text").textContent = `"${q.text}"`;
      container.querySelector(".rh-quote-author").textContent = `\u2014\u2014 ${q.author}`;
    });
    container.querySelector("#rh-add-insp")?.addEventListener("click", async () => {
      const title = prompt("\u7075\u611F\u6807\u9898:");
      if (!title)
        return;
      const content = prompt("\u7075\u611F\u5185\u5BB9:");
      if (!content)
        return;
      const tags = prompt("\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF0C\u53EF\u9009\uFF09:") || "";
      const colors = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#a855f7", "#eab308"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      await addInspiration({ title, content, tags, color });
      render10(container);
    });
    container.querySelectorAll("[data-pin]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.pin);
        const insp = inspirations.find((i) => i.id === id);
        if (insp) {
          await updateInspiration(id, { pinned: !insp.pinned });
          render10(container);
        }
      });
    });
    container.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await removeInspiration(parseInt(btn.dataset.del));
        render10(container);
      });
    });
  }
  function sortInspirations(list) {
    return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  function destroy9() {
  }

  // src/ui/tabs/settingsTab.ts
  init_prefs();
  init_ai();
  async function render11(container) {
    const provider = getPref(PREF_KEYS.AI_PROVIDER) || "openai";
    const apiKey = getPref(PREF_KEYS.AI_API_KEY) || "";
    const baseUrl = getPref(PREF_KEYS.AI_BASE_URL) || "";
    const model = getPref(PREF_KEYS.AI_MODEL) || "gpt-4o-mini";
    container.innerHTML = `
    <div class="rh-card">
      <div class="rh-card-title">AI API \u914D\u7F6E</div>
      <div class="rh-flex-col">
        <div>
          <label class="rh-text-sm">\u63D0\u4F9B\u5546</label>
          <select class="rh-select" id="rh-set-provider" style="width:100%">
            <option value="openai" ${provider === "openai" ? "selected" : ""}>OpenAI</option>
            <option value="custom" ${provider === "custom" ? "selected" : ""}>\u81EA\u5B9A\u4E49 API</option>
          </select>
        </div>
        <div id="rh-base-url-row" style="display:${provider === "custom" ? "" : "none"}">
          <label class="rh-text-sm">Base URL</label>
          <input class="rh-input" id="rh-set-baseurl" value="${baseUrl}" placeholder="https://your-api.com/v1/chat/completions"/>
        </div>
        <div>
          <label class="rh-text-sm">API Key</label>
          <input class="rh-input" id="rh-set-apikey" type="password" value="${apiKey}" placeholder="sk-..."/>
        </div>
        <div>
          <label class="rh-text-sm">\u6A21\u578B</label>
          <input class="rh-input" id="rh-set-model" value="${model}" placeholder="gpt-4o-mini"/>
        </div>
        <div class="rh-flex">
          <button class="rh-btn rh-btn-primary" id="rh-set-save">\u4FDD\u5B58\u914D\u7F6E</button>
          <button class="rh-btn" id="rh-set-test" ${!isAIConfigured() ? "disabled" : ""}>\u6D4B\u8BD5\u8FDE\u63A5</button>
        </div>
        <div id="rh-set-status" class="rh-text-sm"></div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">\u6570\u636E\u7BA1\u7406</div>
      <div class="rh-flex-col">
        <div class="rh-flex">
          <button class="rh-btn" id="rh-export-btn">\u5BFC\u51FA\u6240\u6709\u6570\u636E</button>
          <button class="rh-btn" id="rh-import-btn">\u5BFC\u5165\u6570\u636E</button>
        </div>
        <textarea class="rh-textarea" id="rh-data-area" placeholder="\u5BFC\u51FA/\u5BFC\u5165\u6570\u636E\u5C06\u663E\u793A\u5728\u8FD9\u91CC..." rows="4" style="display:none"></textarea>
        <div class="rh-flex" id="rh-import-actions" style="display:none">
          <button class="rh-btn rh-btn-primary" id="rh-import-merge">\u5408\u5E76\u5BFC\u5165</button>
          <button class="rh-btn rh-btn-danger" id="rh-import-overwrite">\u8986\u76D6\u5BFC\u5165</button>
        </div>
      </div>
    </div>

    <div class="rh-card">
      <div class="rh-card-title">\u5173\u4E8E</div>
      <div class="rh-text-sm" style="line-height:1.8">
        <strong>ResearchHub</strong> v1.0.0<br/>
        \u79D1\u7814\u6548\u7387\u5DE5\u5177\u7BB1 \u2014 \u6253\u5361\u3001\u756A\u8304\u949F\u3001AI \u5199\u4F5C\u6DA6\u8272\u3001\u7FFB\u8BD1\u3001\u90AE\u4EF6\u6A21\u677F\u3001LaTeX \u7247\u6BB5\u7B49<br/>
        \u57FA\u4E8E Zotero 7 \u63D2\u4EF6\u67B6\u6784\u5F00\u53D1
      </div>
    </div>
  `;
    container.querySelector("#rh-set-provider")?.addEventListener("change", (e) => {
      const val = e.target.value;
      container.querySelector("#rh-base-url-row").style.display = val === "custom" ? "" : "none";
    });
    container.querySelector("#rh-set-save")?.addEventListener("click", () => {
      setPref(PREF_KEYS.AI_PROVIDER, container.querySelector("#rh-set-provider").value);
      setPref(PREF_KEYS.AI_BASE_URL, container.querySelector("#rh-set-baseurl").value);
      setPref(PREF_KEYS.AI_API_KEY, container.querySelector("#rh-set-apikey").value);
      setPref(PREF_KEYS.AI_MODEL, container.querySelector("#rh-set-model").value);
      const status = container.querySelector("#rh-set-status");
      status.textContent = "\u914D\u7F6E\u5DF2\u4FDD\u5B58";
      status.style.color = "#22c55e";
      setTimeout(() => {
        status.textContent = "";
      }, 2e3);
    });
    container.querySelector("#rh-set-test")?.addEventListener("click", async () => {
      const status = container.querySelector("#rh-set-status");
      status.textContent = "\u6D4B\u8BD5\u4E2D...";
      status.style.color = "#666";
      try {
        const result = await callAI("You are a test assistant.", 'Say "OK" in one word.', { maxTokens: 10, useCache: false });
        status.textContent = `\u8FDE\u63A5\u6210\u529F: ${result}`;
        status.style.color = "#22c55e";
      } catch (e) {
        status.textContent = `\u8FDE\u63A5\u5931\u8D25: ${e.message}`;
        status.style.color = "#ef4444";
      }
    });
    container.querySelector("#rh-export-btn")?.addEventListener("click", async () => {
      const data = await exportAll();
      const area = container.querySelector("#rh-data-area");
      area.style.display = "";
      area.value = data;
      area.select();
      navigator.clipboard.writeText(data);
      const btn = container.querySelector("#rh-export-btn");
      btn.textContent = "\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F";
      setTimeout(() => btn.textContent = "\u5BFC\u51FA\u6240\u6709\u6570\u636E", 2e3);
    });
    container.querySelector("#rh-import-btn")?.addEventListener("click", () => {
      const area = container.querySelector("#rh-data-area");
      area.style.display = "";
      area.value = "";
      area.placeholder = "\u5728\u6B64\u7C98\u8D34\u5BFC\u51FA\u7684 JSON \u6570\u636E...";
      container.querySelector("#rh-import-actions").style.display = "";
    });
    container.querySelector("#rh-import-merge")?.addEventListener("click", async () => {
      const area = container.querySelector("#rh-data-area");
      try {
        await importAll(area.value, "merge");
        alert("\u6570\u636E\u5408\u5E76\u5BFC\u5165\u6210\u529F\uFF01");
      } catch (e) {
        alert(`\u5BFC\u5165\u5931\u8D25: ${e.message}`);
      }
    });
    container.querySelector("#rh-import-overwrite")?.addEventListener("click", async () => {
      if (!confirm("\u8986\u76D6\u5BFC\u5165\u5C06\u66FF\u6362\u6240\u6709\u73B0\u6709\u6570\u636E\uFF0C\u786E\u5B9A\u7EE7\u7EED\uFF1F"))
        return;
      const area = container.querySelector("#rh-data-area");
      try {
        await importAll(area.value, "overwrite");
        alert("\u6570\u636E\u8986\u76D6\u5BFC\u5165\u6210\u529F\uFF01");
      } catch (e) {
        alert(`\u5BFC\u5165\u5931\u8D25: ${e.message}`);
      }
    });
  }
  function destroy10() {
  }

  // src/ui/mainDialog.ts
  var TABS = [
    { id: "checkin", label: "\u{1F4CB} \u6253\u5361", render, destroy },
    { id: "pomodoro", label: "\u{1F345} \u756A\u8304\u949F", render: render2, destroy: destroy2 },
    { id: "writing", label: "\u270F\uFE0F \u5199\u4F5C", render: render3, destroy: destroy3 },
    { id: "translate", label: "\u{1F30D} \u7FFB\u8BD1", render: render4, destroy: destroy4 },
    { id: "email", label: "\u2709\uFE0F \u90AE\u4EF6", render: render5, destroy: destroy5 },
    { id: "submission", label: "\u{1F4E4} \u6295\u7A3F", render: render6, destroy: destroy6 },
    { id: "plotTips", label: "\u{1F4CA} \u4F5C\u56FE", render: render7, destroy: destroy7 },
    { id: "latex", label: "\u{1F4DD} LaTeX", render: render8, destroy: render8 },
    { id: "life", label: "\u{1F4A7} \u751F\u6D3B", render: render9, destroy: destroy8 },
    { id: "quotes", label: "\u{1F4AD} \u540D\u8A00", render: render10, destroy: destroy9 },
    { id: "settings", label: "\u2699\uFE0F \u8BBE\u7F6E", render: render11, destroy: destroy10 }
  ];
  var _dialog = null;
  var _activeTab = "";
  var _activeDestroy = null;
  function isDialogOpen() {
    return _dialog !== null && !_dialog.closed;
  }
  function openDialog() {
    if (isDialogOpen()) {
      _dialog.focus();
      return;
    }
    const win = Zotero.getMainWindow();
    _dialog = win.openDialog(
      "chrome://researchhub/content/mainWindow.xhtml",
      "researchhub-dialog",
      "chrome,centerscreen,resizable,width=900,height=650"
    );
    _dialog.addEventListener("load", () => {
      initDialog(_dialog);
    });
  }
  function closeDialog() {
    if (_dialog && !_dialog.closed) {
      _dialog.close();
    }
  }
  function initDialog(win) {
    const doc = win.document;
    const tabBar = doc.getElementById("rh-tabbar");
    tabBar.innerHTML = "";
    for (const tab of TABS) {
      const btn = doc.createElement("button");
      btn.className = "rh-tab";
      btn.textContent = tab.label;
      btn.dataset.tab = tab.id;
      btn.addEventListener("click", () => switchTab(tab.id));
      tabBar.appendChild(btn);
    }
    const closeBtn = doc.getElementById("rh-close");
    closeBtn.addEventListener("click", () => closeDialog());
    switchTab("checkin");
    win.addEventListener("unload", () => {
      if (_activeDestroy)
        _activeDestroy();
      _dialog = null;
      _activeTab = "";
    });
  }
  function switchTab(tabId) {
    if (!_dialog || _dialog.closed)
      return;
    const doc = _dialog.document;
    const tab = TABS.find((t) => t.id === tabId);
    if (!tab)
      return;
    if (_activeDestroy) {
      _activeDestroy();
      _activeDestroy = null;
    }
    const buttons = doc.querySelectorAll(".rh-tab");
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    const content = doc.getElementById("rh-content");
    content.innerHTML = "";
    tab.render(content);
    _activeDestroy = tab.destroy;
    _activeTab = tabId;
  }

  // src/index.ts
  Zotero.ResearchHub = {
    onStartup({ id, version, rootURI }) {
      Zotero.debug("[ResearchHub] Plugin starting...");
      const doc = Zotero.getMainWindow().document;
      const toolsMenu = doc.getElementById("menu_ToolsPopup");
      if (toolsMenu) {
        const menuitem = doc.createXULElement ? doc.createXULElement("menuitem") : doc.createElement("menuitem");
        menuitem.id = "researchhub-menu-item";
        menuitem.setAttribute("label", "ResearchHub");
        menuitem.setAttribute("tooltiptext", "\u6253\u5F00 ResearchHub \u79D1\u7814\u5DE5\u5177\u7BB1");
        menuitem.addEventListener("command", () => openDialog());
        toolsMenu.appendChild(menuitem);
      }
      const keyset = doc.getElementById("mainKeyset") || doc.querySelector("keyset");
      if (keyset) {
        const key = doc.createXULElement ? doc.createXULElement("key") : doc.createElement("key");
        key.id = "researchhub-key";
        key.setAttribute("key", "R");
        key.setAttribute("modifiers", "accel,shift");
        key.setAttribute("oncommand", "");
        key.addEventListener("command", () => openDialog());
        keyset.appendChild(key);
      }
      Zotero.debug("[ResearchHub] Plugin started successfully");
    },
    onShutdown() {
      Zotero.debug("[ResearchHub] Plugin shutting down...");
      closeDialog();
      const doc = Zotero.getMainWindow()?.document;
      if (doc) {
        doc.getElementById("researchhub-menu-item")?.remove();
        doc.getElementById("researchhub-key")?.remove();
      }
    }
  };
})();
