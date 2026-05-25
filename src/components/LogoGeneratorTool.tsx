import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, Sparkles, Check, Copy, ChevronDown, Zap, ImageIcon } from "lucide-react";
import { runLogoAI, generateLogoImage, type LogoConcept, type AIProvider } from "../ai";

interface Props {
  aiProvider: AIProvider;
  setAiProvider: (p: AIProvider) => void;
  tier: string;
  recordUse: (slug: string, q: string) => { allowed: boolean };
}

const INDUSTRIES = ["Creator / Content","Tech & SaaS","Fashion & Lifestyle","Food & Beverage","Health & Fitness","Education","Finance","Real Estate","Gaming","Music & Arts","Travel","E-commerce","Non-profit","Sports","Beauty"];
const STYLES = ["Modern","Minimalist","Bold","Playful","Luxury","Vintage","Futuristic","Handcrafted","Corporate","Retro"];
const PLATFORMS = ["YouTube","TikTok","Instagram","LinkedIn","Discord","Twitch","Twitter/X","Pinterest","Website / Universal","All Platforms"];

const EXPORT_SIZES = [
  { label: "Square (1024×1024)",          w: 1024, h: 1024 },
  { label: "Instagram profile (800×800)", w: 800,  h: 800  },
  { label: "YouTube banner (2560×1440)",  w: 2560, h: 1440 },
  { label: "TikTok profile (320×320)",    w: 320,  h: 320  },
  { label: "Favicon (192×192)",           w: 192,  h: 192  },
];

interface LogoResult {
  concept: LogoConcept;
  imageUrl: string;
  loaded: boolean;
}

async function downloadFromUrl(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  } catch {
    window.open(url, "_blank");
  }
}

export default function LogoGeneratorTool({ aiProvider, setAiProvider, tier, recordUse }: Props) {
  const [prompt, setPrompt]       = useState("");
  const [industry, setIndustry]   = useState("Creator / Content");
  const [style, setStyle]         = useState("Modern");
  const [platform, setPlatform]   = useState("All Platforms");
  const [err, setErr]             = useState("");
  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState<[LogoResult, LogoResult] | null>(null);
  const [chosen, setChosen]       = useState<0 | 1>(0);
  const [copied, setCopied]       = useState(false);
  const [exportW, setExportW]     = useState(1024);
  const [exportH, setExportH]     = useState(1024);
  const [showSizes, setShowSizes] = useState(false);
  const [regenerating, setRegenerating] = useState<0 | 1 | null>(null);

  // Close sizes dropdown on outside click
  const sizesRef = useRef<HTMLDivElement>(null);
  const handleOutside = useCallback((e: MouseEvent) => {
    if (sizesRef.current && !sizesRef.current.contains(e.target as Node)) setShowSizes(false);
  }, []);
  useEffect(() => {
    if (showSizes) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showSizes, handleOutside]);

  const chosenResult = results?.[chosen] ?? null;

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) { setErr("Enter your brand name or description."); return; }
    const u = recordUse("logo-generator", prompt);
    if (!u.allowed) { setErr("Daily limit reached. Upgrade to Pro for unlimited generations."); return; }
    setErr(""); setLoading(true); setResults(null);

    try {
      // Step 1: Get brand concepts from AI (colors, tagline, shape, rationale)
      const concepts = await runLogoAI(prompt, industry, style, platform, aiProvider);
      if (!Array.isArray(concepts) || concepts.length < 2) {
        setErr("AI returned an unexpected response. Check your API key has credits and try again."); return;
      }

      // Step 2: Generate real logo images via Flux for both concepts (parallel)
      const [urlA, urlB] = await Promise.all([
        generateLogoImage(concepts[0].name, industry, style, concepts[0].primaryColor, concepts[0].secondaryColor, concepts[0].shape, concepts[0].tagline),
        generateLogoImage(concepts[1].name, industry, style, concepts[1].primaryColor, concepts[1].secondaryColor, concepts[1].shape, concepts[1].tagline),
      ]);

      setResults([
        { concept: concepts[0], imageUrl: urlA, loaded: false },
        { concept: concepts[1], imageUrl: urlB, loaded: false },
      ]);
      setChosen(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "AI error";
      setErr(msg.includes("NO_KEY")
        ? "Add VITE_ANTHROPIC_API_KEY or VITE_OPENAI_API_KEY to your Vercel environment variables."
        : msg);
    } finally { setLoading(false); }
  };

  // Regenerate just one logo image with a new seed
  const regenerateOne = async (idx: 0 | 1) => {
    if (!results) return;
    setRegenerating(idx);
    try {
      const c = results[idx].concept;
      const newUrl = generateLogoImage(c.name, industry, style, c.primaryColor, c.secondaryColor, c.shape, c.tagline, Math.floor(Math.random() * 999999));
      setResults(prev => {
        if (!prev) return prev;
        const updated = [...prev] as [LogoResult, LogoResult];
        updated[idx] = { ...updated[idx], imageUrl: newUrl, loaded: false };
        return updated;
      });
    } finally { setRegenerating(null); }
  };

  const markLoaded = (idx: 0 | 1) => {
    setResults(prev => {
      if (!prev) return prev;
      const updated = [...prev] as [LogoResult, LogoResult];
      updated[idx] = { ...updated[idx], loaded: true };
      return updated;
    });
  };

  const copyColors = () => {
    if (!chosenResult) return;
    navigator.clipboard.writeText(`Primary: ${chosenResult.concept.primaryColor}\nSecondary: ${chosenResult.concept.secondaryColor}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">

      {/* ── Model selector ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex-1 min-w-[160px]">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">AI Model</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Picks colors, fonts & brand direction</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAiProvider("anthropic")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${aiProvider === "anthropic" ? "bg-violet-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:border-violet-300 dark:border-gray-700 dark:text-gray-400"}`}>
            <Sparkles size={13}/> Claude
          </button>
          <button onClick={() => setAiProvider("openai")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${aiProvider === "openai" ? "bg-violet-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:border-violet-300 dark:border-gray-700 dark:text-gray-400"}`}>
            <Zap size={13}/> GPT-4o
          </button>
        </div>
      </div>

      {/* ── Input form ── */}
      <form onSubmit={run} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">AI Logo Generator</p>
          <h3 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">Describe your brand → get 2 real AI logo images</h3>
          <p className="mt-1 text-xs text-gray-400">AI designs the brand strategy · Flux generates the actual logo images · Free to download</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Brand name or description *</label>
          <input value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder='e.g. LogoViking — a creator toolkit for YouTubers and designers'
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white"/>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {([
            { label: "Industry", val: industry, set: setIndustry, opts: INDUSTRIES },
            { label: "Style",    val: style,    set: setStyle,    opts: STYLES    },
            { label: "Platform", val: platform, set: setPlatform, opts: PLATFORMS },
          ] as const).map(({ label, val, set, opts }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
              <select value={val} onChange={e => (set as (v: string) => void)(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        {err && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{err}</p>}

        <button type="submit" disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {loading
            ? <><RefreshCw size={15} className="animate-spin"/> Generating logos…</>
            : <><Sparkles size={15}/> Generate logo concepts</>}
        </button>

        {loading && (
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 px-4 py-3 border border-violet-100 dark:border-violet-900">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Step 1 of 2 — AI is designing your brand strategy…</p>
            <p className="text-xs text-violet-500 mt-0.5">Then Flux will render 2 real logo images. Usually 10–20 seconds total.</p>
          </div>
        )}
      </form>

      {/* ── Results ── */}
      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Pick your favourite concept</p>

            {/* Concept cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                  onClick={() => setChosen(i as 0 | 1)}
                  className={`cursor-pointer rounded-2xl border-2 bg-white overflow-hidden transition-all dark:bg-gray-900 ${chosen === i ? "border-violet-500 shadow-lg shadow-violet-500/10" : "border-gray-200 hover:border-violet-200 dark:border-gray-700"}`}>

                  {/* Logo image */}
                  <div className="relative bg-gray-100 dark:bg-gray-800" style={{ aspectRatio: "1/1" }}>
                    {!r.loaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={20} className="animate-spin text-violet-400"/>
                        <p className="text-xs text-gray-400">Rendering logo…</p>
                      </div>
                    )}
                    <img
                      src={r.imageUrl}
                      alt={`Logo concept ${i + 1}`}
                      onLoad={() => markLoaded(i as 0 | 1)}
                      className={`w-full h-full object-contain transition-opacity duration-500 ${r.loaded ? "opacity-100" : "opacity-0"}`}
                    />
                    {chosen === i && (
                      <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 shadow">
                        <Check size={12} className="text-white"/>
                      </div>
                    )}
                    {/* Regenerate button */}
                    <button
                      onClick={e => { e.stopPropagation(); regenerateOne(i as 0 | 1); }}
                      disabled={regenerating !== null}
                      className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/60 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/80 backdrop-blur-sm disabled:opacity-50">
                      <RefreshCw size={11} className={regenerating === i ? "animate-spin" : ""}/>
                      New variation
                    </button>
                  </div>

                  {/* Concept info */}
                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900 dark:text-white">{r.concept.name}</p>
                      <p className="text-xs font-medium text-violet-600 dark:text-violet-400">{r.concept.style}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">"{r.concept.tagline}"</p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm" style={{ background: r.concept.primaryColor }}/>
                      <span className="h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm" style={{ background: r.concept.secondaryColor }}/>
                      <span className="text-[10px] font-mono text-gray-400">{r.concept.primaryColor} · {r.concept.secondaryColor}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{r.concept.rationale}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Download panel for chosen concept ── */}
            {chosenResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 space-y-4">

                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Selected concept — download</p>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Color swatches */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Brand colors</p>
                    <div className="flex items-center gap-3">
                      {[chosenResult.concept.primaryColor, chosenResult.concept.secondaryColor].map((col, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" style={{ background: col }}/>
                          <span className="text-[10px] font-mono text-gray-400">{col}</span>
                        </div>
                      ))}
                      <button onClick={copyColors}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                        {copied ? <><Check size={11} className="text-green-500"/> Copied</> : <><Copy size={11}/> Copy hex</>}
                      </button>
                    </div>
                  </div>

                  {/* Download controls */}
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Download size</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="relative" ref={sizesRef}>
                        <button onClick={() => setShowSizes(v => !v)}
                          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                          {EXPORT_SIZES.find(s => s.w === exportW && s.h === exportH)?.label ?? "Select size"} <ChevronDown size={11}/>
                        </button>
                        {showSizes && (
                          <div className="absolute left-0 top-10 z-20 w-56 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                            {EXPORT_SIZES.map(s => (
                              <button key={`${s.w}x${s.h}`}
                                onClick={() => { setExportW(s.w); setExportH(s.h); setShowSizes(false); }}
                                className="flex w-full items-center justify-between px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 first:rounded-t-xl last:rounded-b-xl">
                                {s.label} <span className="text-gray-400">{s.w}×{s.h}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => downloadFromUrl(
                          chosenResult.imageUrl,
                          `${chosenResult.concept.name.toLowerCase().replace(/\s+/g, "-")}-logo-${exportW}x${exportH}.png`
                        )}
                        disabled={!chosenResult.loaded}
                        className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download size={13}/> Download PNG
                      </button>
                    </div>
                    {tier !== "premium" && (
                      <p className="mt-2 text-xs text-gray-400">Upgrade to Pro for SVG vector export and brand kit</p>
                    )}
                  </div>
                </div>

                {/* Brand brief */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Brand brief</p>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-gray-600 dark:text-gray-400">
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">Name: </span>{chosenResult.concept.name}</div>
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">Style: </span>{chosenResult.concept.style}</div>
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">Tagline: </span>"{chosenResult.concept.tagline}"</div>
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">Font: </span>{chosenResult.concept.fontStyle}</div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">{chosenResult.concept.rationale}</p>
                </div>

              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!results && !loading && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-gray-800/40 space-y-2">
          <ImageIcon size={32} className="mx-auto text-gray-300 dark:text-gray-600"/>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Your logo concepts will appear here</p>
          <p className="text-xs text-gray-400">AI designs the brand · Flux renders real logo images · Free to download</p>
        </div>
      )}
    </div>
  );
}
