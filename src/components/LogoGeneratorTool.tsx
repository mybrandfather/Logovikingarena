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
const STYLES     = ["Modern","Minimalist","Bold","Playful","Luxury","Vintage","Futuristic","Handcrafted","Corporate","Retro"];
const PLATFORMS  = ["YouTube","TikTok","Instagram","LinkedIn","Discord","Twitch","Twitter/X","Pinterest","Website / Universal","All Platforms"];
const EXPORT_SIZES = [
  { label:"Square (1024×1024)",          w:1024, h:1024 },
  { label:"Instagram profile (800×800)", w:800,  h:800  },
  { label:"YouTube banner (2560×1440)",  w:2560, h:1440 },
  { label:"TikTok profile (320×320)",    w:320,  h:320  },
  { label:"Favicon (192×192)",           w:192,  h:192  },
];

interface LogoResult {
  concept: LogoConcept;
  iconUrl: string;   // Flux image — icon only, no text
  iconLoaded: boolean;
}

// Composite: draw Flux icon + brand name + tagline onto a canvas and download
async function downloadComposite(result: LogoResult, w: number, h: number) {
  const { concept, iconUrl } = result;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Draw icon in top 65% of canvas
  const iconH = Math.round(h * 0.62);
  const iconY = Math.round(h * 0.04);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej();
      img.src = iconUrl;
    });
    ctx.drawImage(img, Math.round((w - iconH) / 2), iconY, iconH, iconH);
  } catch {
    // If image load fails, draw a colored circle placeholder
    ctx.fillStyle = concept.primaryColor;
    ctx.beginPath();
    ctx.arc(w / 2, iconY + iconH / 2, iconH / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brand name
  const nameSize = Math.round(h * 0.072);
  ctx.fillStyle = "#0f172a";
  ctx.font = `900 ${nameSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(concept.name, w / 2, iconY + iconH + nameSize * 0.9);

  // Tagline
  const tagSize = Math.round(h * 0.036);
  ctx.font = `500 ${tagSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "#64748b";
  ctx.fillText(concept.tagline, w / 2, iconY + iconH + nameSize * 1.9);

  // Color accent line
  const lineY = iconY + iconH + nameSize * 2.7;
  const lineW = Math.round(w * 0.15);
  const grad = ctx.createLinearGradient(w / 2 - lineW, lineY, w / 2 + lineW, lineY);
  grad.addColorStop(0, concept.primaryColor);
  grad.addColorStop(1, concept.secondaryColor);
  ctx.fillStyle = grad;
  ctx.fillRect(w / 2 - lineW, lineY, lineW * 2, Math.max(2, Math.round(h * 0.005)));

  const filename = `${concept.name.toLowerCase().replace(/\s+/g, "-")}-logo-${w}x${h}.png`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
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
  const [downloading, setDownloading]   = useState(false);
  const [imgErrors, setImgErrors]       = useState<[boolean, boolean]>([false, false]);

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
    setErr(""); setLoading(true); setResults(null); setImgErrors([false, false]);
    try {
      // Step 1: AI designs the brand (colors, shape, tagline, rationale)
      const concepts = await runLogoAI(prompt, industry, style, platform, aiProvider);
      if (!Array.isArray(concepts) || concepts.length < 2) {
        setErr("Generation failed — please try again. The free AI is sometimes busy."); return;
      }

      // Step 2: Generate icon images (NO text) via Flux — parallel
      const [urlA, urlB] = [
        generateLogoImage(industry, style, concepts[0].primaryColor, concepts[0].secondaryColor, concepts[0].shape, undefined, concepts[0].iconPrompt),
        generateLogoImage(industry, style, concepts[1].primaryColor, concepts[1].secondaryColor, concepts[1].shape, undefined, concepts[1].iconPrompt),
      ];

      setResults([
        { concept: concepts[0], iconUrl: urlA, iconLoaded: false },
        { concept: concepts[1], iconUrl: urlB, iconLoaded: false },
      ]);
      setChosen(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "AI error";
      setErr(msg.includes("NO_KEY")
        ? "Add VITE_ANTHROPIC_API_KEY or VITE_OPENAI_API_KEY to your Vercel environment variables."
        : msg);
    } finally { setLoading(false); }
  };

  const regenerateOne = async (idx: 0 | 1) => {
    if (!results) return;
    setRegenerating(idx);
    setImgErrors(prev => {
      const next = [...prev] as [boolean, boolean];
      next[idx] = false;
      return next;
    });
    const c = results[idx].concept;
    const newUrl = generateLogoImage(industry, style, c.primaryColor, c.secondaryColor, c.shape, Math.floor(Math.random() * 999999), c.iconPrompt);
    setResults(prev => {
      if (!prev) return prev;
      const u = [...prev] as [LogoResult, LogoResult];
      u[idx] = { ...u[idx], iconUrl: newUrl, iconLoaded: false };
      return u;
    });
    setRegenerating(null);
  };

  const markLoaded = (idx: 0 | 1) => {
    setResults(prev => {
      if (!prev) return prev;
      const u = [...prev] as [LogoResult, LogoResult];
      u[idx] = { ...u[idx], iconLoaded: true };
      return u;
    });
  };

  const copyColors = () => {
    if (!chosenResult) return;
    navigator.clipboard.writeText(`Primary: ${chosenResult.concept.primaryColor}\nSecondary: ${chosenResult.concept.secondaryColor}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!chosenResult) return;
    setDownloading(true);
    try { await downloadComposite(chosenResult, exportW, exportH); }
    finally { setDownloading(false); }
  };

  return (
    <div className="space-y-5">


      {/* ── Input form ── */}
      <form onSubmit={run} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">AI Logo Generator</p>
          <h3 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">Describe your brand → get 2 real AI logo concepts</h3>
          <p className="mt-1 text-xs text-gray-400">AI designs brand strategy · Flux renders the icon · Text overlaid perfectly · Free to download</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Brand name or description *</label>
          <input value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder='e.g. LogoViking — a creator toolkit for YouTubers and designers'
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white"/>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {([
            { label:"Industry", val:industry, set:setIndustry, opts:INDUSTRIES },
            { label:"Style",    val:style,    set:setStyle,    opts:STYLES    },
            { label:"Platform", val:platform, set:setPlatform, opts:PLATFORMS },
          ] as const).map(({ label, val, set, opts }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
              <select value={val} onChange={e => (set as (v:string)=>void)(e.target.value)}
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
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">AI is designing your brand strategy…</p>
            <p className="text-xs text-violet-500 mt-0.5">Then Flux renders the icon. Text is overlaid in perfect spelling. Usually 10–20 seconds.</p>
          </div>
        )}
      </form>

      {/* ── Results ── */}
      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Pick your favourite concept</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((r, i) => (
                <motion.div key={i} initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i * 0.08 }}
                  onClick={() => setChosen(i as 0|1)}
                  className={`cursor-pointer rounded-2xl border-2 bg-white overflow-hidden transition-all dark:bg-gray-900 ${chosen===i ? "border-violet-500 shadow-lg shadow-violet-500/10" : "border-gray-200 hover:border-violet-200 dark:border-gray-700"}`}>

                  {/* Logo preview — icon + overlaid text */}
                  <div className="relative flex flex-col items-center justify-center bg-white dark:bg-gray-950 p-6 gap-3"
                    style={{ minHeight: 260 }}>

                    {/* Icon area */}
                    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
                      {!r.iconLoaded && !imgErrors[i] && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-100 dark:bg-gray-800">
                          <RefreshCw size={18} className="animate-spin text-violet-400"/>
                          <p className="text-[10px] text-gray-400">Rendering icon…</p>
                        </div>
                      )}
                      {imgErrors[i] ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-red-50 dark:bg-red-950/30 p-2 text-center">
                          <ImageIcon className="h-6 w-6 text-red-400 mx-auto" />
                          <p className="text-[10px] font-semibold text-red-500">Failed to load</p>
                          <button
                            onClick={e => { e.stopPropagation(); regenerateOne(i as 0|1); }}
                            className="mt-1 rounded bg-red-500 hover:bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        <img
                          src={r.iconUrl}
                          alt={`Logo icon ${i+1}`}
                          onLoad={() => markLoaded(i as 0|1)}
                          onError={() => {
                            setImgErrors(prev => {
                              const next = [...prev] as [boolean, boolean];
                              next[i] = true;
                              return next;
                            });
                          }}
                          className={`w-full h-full object-contain rounded-2xl transition-opacity duration-500 ${r.iconLoaded ? "opacity-100" : "opacity-0"}`}
                          style={{ background: "white" }}
                        />
                      )}
                    </div>

                    {/* Brand name — always perfectly spelled */}
                    <div className="text-center space-y-1">
                      <p className="text-xl font-black tracking-tight text-gray-900 dark:text-white leading-none"
                        style={{ color: r.concept.primaryColor }}>{r.concept.name}</p>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide">{r.concept.tagline}</p>
                      {/* Color accent bar */}
                      <div className="mx-auto mt-1 h-0.5 w-12 rounded-full"
                        style={{ background: `linear-gradient(90deg, ${r.concept.primaryColor}, ${r.concept.secondaryColor})` }}/>
                    </div>

                    {/* Chosen badge */}
                    {chosen === i && (
                      <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 shadow">
                        <Check size={12} className="text-white"/>
                      </div>
                    )}

                    {/* Regenerate icon button */}
                    <button
                      onClick={e => { e.stopPropagation(); regenerateOne(i as 0|1); }}
                      disabled={regenerating !== null}
                      className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/50 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-black/70 backdrop-blur-sm disabled:opacity-50">
                      <RefreshCw size={10} className={regenerating===i ? "animate-spin" : ""}/>
                      New icon
                    </button>
                  </div>

                  {/* Concept info */}
                  <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{r.concept.style}</p>
                      <div className="flex gap-1.5">
                        <span className="h-3.5 w-3.5 rounded-full border border-gray-200 dark:border-gray-700" style={{ background: r.concept.primaryColor }}/>
                        <span className="h-3.5 w-3.5 rounded-full border border-gray-200 dark:border-gray-700" style={{ background: r.concept.secondaryColor }}/>
                        <span className="text-[10px] font-mono text-gray-400">{r.concept.primaryColor}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{r.concept.rationale}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Download panel ── */}
            {chosenResult && (
              <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 space-y-4">

                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Download your logo</p>

                <div className="flex flex-wrap gap-6">
                  {/* Colors */}
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
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Size & format</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="relative" ref={sizesRef}>
                        <button onClick={() => setShowSizes(v => !v)}
                          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                          {EXPORT_SIZES.find(s => s.w===exportW && s.h===exportH)?.label ?? "Select size"} <ChevronDown size={11}/>
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
                      <button onClick={handleDownload} disabled={!chosenResult.iconLoaded || downloading}
                        className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {downloading ? <><RefreshCw size={12} className="animate-spin"/> Building…</> : <><Download size={13}/> Download PNG</>}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-400">Downloads icon + brand name + tagline composited onto white background</p>
                    {tier !== "premium" && <p className="mt-1 text-[11px] text-gray-400">Upgrade to Pro for SVG vector export</p>}
                  </div>
                </div>

                {/* Brand brief */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 grid gap-2 sm:grid-cols-2 text-xs">
                  <div><span className="font-semibold text-gray-700 dark:text-gray-300">Name: </span><span className="text-gray-500">{chosenResult.concept.name}</span></div>
                  <div><span className="font-semibold text-gray-700 dark:text-gray-300">Style: </span><span className="text-gray-500">{chosenResult.concept.style}</span></div>
                  <div><span className="font-semibold text-gray-700 dark:text-gray-300">Tagline: </span><span className="text-gray-500">"{chosenResult.concept.tagline}"</span></div>
                  <div><span className="font-semibold text-gray-700 dark:text-gray-300">Font direction: </span><span className="text-gray-500">{chosenResult.concept.fontStyle}</span></div>
                  <div className="sm:col-span-2 italic text-gray-400">{chosenResult.concept.rationale}</div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!results && !loading && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-gray-800/40 space-y-2">
          <ImageIcon size={32} className="mx-auto text-gray-300 dark:text-gray-600"/>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Your logo concepts will appear here</p>
          <p className="text-xs text-gray-400">AI icon + perfect text overlay · No spelling errors · Free download</p>
        </div>
      )}
    </div>
  );
}
