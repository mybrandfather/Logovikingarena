// ─── AI Engine ────────────────────────────────────────────────────────────────
// Replaces all fake buildToolResult() calls with real AI responses.
// Keys come from Vite env vars:  VITE_ANTHROPIC_API_KEY  /  VITE_OPENAI_API_KEY

export type AIProvider = "anthropic" | "openai";

export interface AIToolResult {
  headline: string;
  summary: string;
  badge: string;
  score: string;
  blocks: { label: string; items: string[] }[];
}

// ─── Per-tool system prompts ──────────────────────────────────────────────────
function getSystemPrompt(slug: string, name: string): string {
  const base = `You are an expert AI assistant powering the "${name}" tool on Logoviking.com — a creator toolkit for YouTubers, TikTokers, Instagram creators, SEO marketers, and small businesses.

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no backticks, no preamble. Raw JSON only.

Shape:
{
  "headline": "punchy result title under 60 chars",
  "summary": "1-2 sentence summary",
  "badge": "short label e.g. 'AI output'",
  "score": "e.g. '91/100 click potential'",
  "blocks": [{ "label": "section name", "items": ["item1","item2","item3"] }]
}

Rules:
- Every item must reference the user's actual topic — never use placeholders like "your brand" or "your content"
- 3-5 blocks, 3-6 items each
- Results must be specific, actionable, and ready to use immediately`;

  const extras: Record<string, string> = {
    "all-in-one-creator-kit": `Produce 6 blocks:
1. "Title ideas" — 5 high-CTR titles (question/list/how-to/curiosity/story formats)
2. "Hashtags" — 10 hashtags mixed mega/mid/niche
3. "Thumbnail concepts" — 3 visual ideas with text overlay and composition notes
4. "Captions" — 3 options (punchy <50 chars, storytelling 3-4 lines, hook-first)
5. "SEO keywords" — 6 keywords with intent type
6. "Content angles" — 4 unique video/post angles`,

    "youtube": `1. "Video titles" — 5 high-CTR options mixing formats
2. "Thumbnail text" — 4 bold overlays under 4 words each
3. "Tags" — 12 YouTube tags (broad/specific/niche)
4. "Description opener" — 3 keyword-rich first sentences under 150 chars
5. "Hook scripts" — 3 opening 15-second hooks`,

    "tiktok": `1. "Hook lines" — 5 scroll-stopping openers (pattern interrupt/question/bold claim)
2. "Hashtag mix" — 10 tags: 3 mega (1B+), 4 mid (10M-100M), 3 niche (<1M)
3. "Captions" — 3 options (short punchy/storytelling/CTA-focused)
4. "Video structure" — hook/value/CTA breakdown for this topic
5. "Sound direction" — 3 audio style suggestions`,

    "instagram": `1. "Captions" — 3 options (short <50 chars/storytelling 3-4 lines/list format)
2. "Hashtags" — 12 tags: 4 broad/5 niche/3 community
3. "CTA ideas" — 4 endings that drive saves/shares/comments
4. "Story ideas" — 3 Instagram Story concepts
5. "Reel hook" — 3 first-frame visual concepts`,

    "seo": `1. "Meta titles" — 3 options under 60 chars, keyword-first
2. "Meta descriptions" — 2 options under 155 chars with CTA
3. "Target keywords" — 6 with type (head/long-tail/local) and intent
4. "Schema types" — specific schema markup to implement
5. "Content outline" — 5 H2 headings for a pillar article`,

    "pinterest": `1. "Pin titles" — 5 keyword-rich titles under 100 chars
2. "Descriptions" — 2 options 150-300 chars with keywords
3. "Board names" — 4 board suggestions
4. "Pinterest keywords" — 8 search keywords
5. "Visual concepts" — 3 vertical pin image ideas`,

    "logo-generator": `1. "Brand identity" — 4 identity recommendations (personality/voice/values/positioning)
2. "Color palette" — 4 specific hex colors with names and usage roles
3. "Typography" — 3 font pairing recommendations with actual font names
4. "Icon direction" — 3 logo mark concepts (abstract/lettermark/symbol)
5. "Tagline options" — 4 tagline variations (short/bold/descriptive/witty)`,

    "ai-image-generator": `1. "Optimized prompt" — 3 progressively detailed versions ready for Midjourney/DALL-E
2. "Style modifiers" — 6 specific keywords (lighting/camera/mood/medium/color/rendering)
3. "Negative prompts" — 5 things to exclude for cleaner results
4. "Aspect ratios" — best ratio per platform with reasoning
5. "Prompt variants" — 3 alternative interpretations of the concept`,
  };

  for (const [key, extra] of Object.entries(extras)) {
    if (slug === key || slug.includes(key.split("-")[0])) {
      return base + "\n\nTool-specific instructions:\n" + extra;
    }
  }
  return base + `\n\nFor "${name}", produce 4 relevant blocks with specific, actionable items.`;
}

function buildUserPrompt(
  tool: { slug: string; name: string; category: string },
  input: string,
  extras?: Record<string, string>
): string {
  const parts = [`Tool: ${tool.name}`, `User input: "${input}"`];
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      if (v) parts.push(`${k}: ${v}`);
    }
  }
  return parts.join("\n");
}

function parseJSON(raw: string): AIToolResult {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    const p = JSON.parse(clean) as AIToolResult;
    if (!p.headline || !Array.isArray(p.blocks)) throw new Error("bad shape");
    return p;
  } catch {
    return {
      headline: "Result ready",
      summary: "AI returned an unexpected format. Try a more specific prompt.",
      badge: "AI output",
      score: "—",
      blocks: [{ label: "Response", items: [clean.slice(0, 400)] }],
    };
  }
}

async function callAnthropic(system: string, user: string, key: string): Promise<AIToolResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(e.error?.message ?? `Anthropic ${res.status}`);
  }
  const d = await res.json() as { content: { type: string; text: string }[] };
  return parseJSON(d.content.find(b => b.type === "text")?.text ?? "");
}

async function callOpenAI(system: string, user: string, key: string): Promise<AIToolResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(e.error?.message ?? `OpenAI ${res.status}`);
  }
  const d = await res.json() as { choices: { message: { content: string } }[] };
  return parseJSON(d.choices[0]?.message?.content ?? "");
}

export async function runAITool(
  tool: { slug: string; name: string; category: string },
  input: string,
  provider: AIProvider,
  extras?: Record<string, string>
): Promise<AIToolResult> {
  const ak = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  const ok = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const system = getSystemPrompt(tool.slug, tool.name);
  const user = buildUserPrompt(tool, input, extras);

  if (provider === "anthropic" && ak) return callAnthropic(system, user, ak);
  if (provider === "openai" && ok) return callOpenAI(system, user, ok);
  if (ak) return callAnthropic(system, user, ak);
  if (ok) return callOpenAI(system, user, ok);
  throw new Error("NO_KEY");
}

// ─── Logo AI ──────────────────────────────────────────────────────────────────
export interface LogoConcept {
  id: number;
  name: string;
  tagline: string;
  style: string;
  primaryColor: string;
  secondaryColor: string;
  bg: string;
  shape: "rounded" | "circle" | "shield" | "hexagon" | "diamond";
  initials: string;
  fontStyle: string;
  rationale: string;
}

export async function runLogoAI(
  prompt: string, industry: string, style: string, platform: string, provider: AIProvider
): Promise<[LogoConcept, LogoConcept]> {
  const ak = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  const ok = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

  const system = `You are a professional brand designer. Return ONLY raw JSON — no markdown, no backticks.

{
  "conceptA": {
    "name": "brand name from prompt (max 20 chars)",
    "tagline": "4-6 word tagline",
    "style": "style label e.g. Modern Gradient",
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "bg": "CSS gradient or solid e.g. linear-gradient(135deg,#7C3AED,#06B6D4)",
    "shape": "rounded|circle|shield|hexagon|diamond",
    "initials": "1-2 capital letters",
    "fontStyle": "font descriptor e.g. bold geometric sans",
    "rationale": "one sentence design logic"
  },
  "conceptB": { same fields, contrasting design }
}

Make concepts genuinely different — different color families, shapes, personalities.
Match colors to the brand vibe (dark+neon for gaming, warm+earthy for food, clean+blue for tech).`;

  const user = `Brand: "${prompt}"\nIndustry: ${industry}\nStyle: ${style}\nPlatform: ${platform}`;

  const call = async (key: string, isAnthropic: boolean): Promise<[LogoConcept, LogoConcept]> => {
    let raw = "";
    if (isAnthropic) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 900, system, messages: [{ role: "user", content: user }] }),
      });
      const d = await res.json() as { content: { type: string; text: string }[] };
      raw = d.content.find(b => b.type === "text")?.text ?? "";
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 900, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      const d = await res.json() as { choices: { message: { content: string } }[] };
      raw = d.choices[0]?.message?.content ?? "";
    }
    const p = JSON.parse(raw.replace(/```json|```/g, "").trim()) as { conceptA: LogoConcept; conceptB: LogoConcept };
    return [{ ...p.conceptA, id: 1 }, { ...p.conceptB, id: 2 }];
  };

  try {
    if (provider === "anthropic" && ak) return call(ak, true);
    if (provider === "openai" && ok) return call(ok, false);
    if (ak) return call(ak, true);
    if (ok) return call(ok, false);
    throw new Error("NO_KEY");
  } catch {
    // Graceful fallback
    const name = prompt.slice(0, 18).trim() || "Brand";
    const ini = name.slice(0, 2).toUpperCase();
    return [
      { id: 1, name, tagline: "Built for creators", style: "Modern Gradient", primaryColor: "#7C3AED", secondaryColor: "#06B6D4", bg: "linear-gradient(135deg,#7C3AED,#06B6D4)", shape: "rounded", initials: ini, fontStyle: "font-black tracking-tight", rationale: "Vibrant gradient communicates innovation." },
      { id: 2, name, tagline: "Stand out. Scale up.", style: "Bold Minimal", primaryColor: "#0F172A", secondaryColor: "#F59E0B", bg: "linear-gradient(135deg,#0F172A,#1E293B)", shape: "circle", initials: ini, fontStyle: "font-extrabold tracking-widest", rationale: "Dark base with amber accent signals authority." },
    ];
  }
}

// ─── Logo Generation via Pollinations Flux (free, no key needed) ──────────────
// Builds a highly specific logo prompt and returns a Pollinations image URL.
// Generates ONLY the icon/symbol — NO text in the prompt.
// Text (brand name + tagline) is overlaid by CSS in LogoGeneratorTool.
// This avoids Flux hallucinating/misspelling letters entirely.
export function generateLogoImage(
  industry: string,
  style: string,
  primaryColor: string,
  secondaryColor: string,
  shape: string,
  seed?: number
): string {
  const styleMap: Record<string, string> = {
    "Modern": "modern clean geometric vector icon",
    "Minimalist": "minimalist single-line flat icon",
    "Bold": "bold strong solid icon mark",
    "Playful": "playful colorful fun icon",
    "Luxury": "luxury elegant premium symbol",
    "Vintage": "vintage ornate classic emblem",
    "Futuristic": "futuristic neon glowing tech icon",
    "Handcrafted": "handcrafted organic artisan symbol",
    "Corporate": "corporate professional clean mark",
    "Retro": "retro bold graphic icon",
  };

  const shapeMap: Record<string, string> = {
    "circle": "inside a perfect circle",
    "rounded": "inside a rounded square",
    "hexagon": "inside a hexagon",
    "shield": "shield shaped crest",
    "diamond": "inside a diamond shape",
  };

  const industryIconMap: Record<string, string> = {
    "Creator / Content": "camera, play button, or star burst",
    "Tech & SaaS": "circuit node, lightning bolt, or abstract network",
    "Fashion & Lifestyle": "crown, diamond, or leaf",
    "Food & Beverage": "fork, leaf, or flame",
    "Health & Fitness": "pulse line, leaf, or dumbbell",
    "Education": "open book, torch, or graduation cap",
    "Finance": "upward arrow, coin, or graph",
    "Real Estate": "house outline or city skyline",
    "Gaming": "controller, joystick, or pixel sword",
    "Music & Arts": "music note, brush, or soundwave",
    "Travel": "compass, plane, or mountain peak",
    "E-commerce": "shopping bag, tag, or cart",
    "Non-profit": "hands, heart, or globe",
    "Sports": "lightning bolt, trophy, or flame",
    "Beauty": "flower, diamond, or mirror",
  };

  const styleDesc = styleMap[style] ?? "modern clean vector icon";
  const shapeDesc = shapeMap[shape] ?? "inside a rounded shape";
  const iconHint = industryIconMap[industry] ?? "abstract geometric symbol";

  const prompt = [
    `${styleDesc} logo mark symbol`,
    `${shapeDesc}`,
    `inspired by ${iconHint}`,
    `primary color ${primaryColor} secondary color ${secondaryColor}`,
    `pure white background`,
    `NO letters NO text NO words NO typography`,
    `centered composition, vector flat design`,
    `professional logo icon only, sharp clean edges`,
    `isolated symbol on white background`,
    `high contrast professional brand mark`,
  ].join(", ");

  const encoded = encodeURIComponent(prompt);
  const s = seed ?? Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${s}&nologo=true&model=flux&enhance=true`;
}

// ─── Image Generation via Pollinations (free, no key needed) ─────────────────
export async function generateImage(prompt: string, style: string, ratio: string): Promise<string> {
  const w = ratio === "16:9" ? 1280 : ratio === "9:16" ? 720 : ratio === "4:3" ? 1024 : 1024;
  const h = ratio === "16:9" ? 720 : ratio === "9:16" ? 1280 : ratio === "4:3" ? 768 : 1024;
  const fullPrompt = `${prompt}, ${style}, high quality, detailed, professional`;
  const encoded = encodeURIComponent(fullPrompt);
  const seed = Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
}
