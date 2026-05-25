import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, Sparkles, Check, Copy, ChevronDown } from "lucide-react";
import { runLogoAI, type LogoConcept, type AIProvider } from "../ai";
interface Props {
  aiProvider: AIProvider;
  setAiProvider: (p: AIProvider) => void;
  tier: string;
  recordUse: (slug: string, q: string) => { allowed: boolean };
}

const INDUSTRIES = [
  "Creator / Content","Tech & SaaS","Fashion & Lifestyle","Food & Beverage","Health & Fitness",
  "Education","Finance","Real Estate","Gaming","Music & Arts","Travel","E-commerce",
  "Non-profit","Sports","Beauty"
];

const STYLES = [
  "Modern","Minimalist","Bold","Playful","Luxury","Vintage","Futuristic",
  "Handcrafted","Corporate","Retro"
];

const PLATFORMS = [
  "YouTube","TikTok","Instagram","LinkedIn","Discord","Twitch",
  "Twitter/X","Pinterest","Website / Universal","All Platforms"
];

const SIZES = [
  { label:"Square (800×800)", w:800, h:800 },
  { label:"YouTube banner (2560×1440)", w:2560, h:1440 },
  { label:"TikTok profile (320×320)", w:320, h:320 },
  { label:"LinkedIn (500×500)", w:500, h:500 },
  { label:"Favicon (192×192)", w:192, h:192 }
];

function LogoCanvas({ concept, size = 200 }: { concept: LogoConcept; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Background
    if (concept.bg.startsWith("linear-gradient")) {
      const match = concept.bg.match(/#[0-9a-fA-F]{3,6}/g) ?? [
        concept.primaryColor,
        concept.secondaryColor
      ];
      const grd = ctx.createLinearGradient(0, 0, size, size);
      grd.addColorStop(0, match[0]);
      grd.addColorStop(1, match[1] ?? match[0]);
      ctx.fillStyle = grd;
    } else {
      ctx.fillStyle = concept.primaryColor;
    }

    const r = size * 0.12;
    const cx = size / 2;
    const cy = size / 2;
    const rs = size * 0.42;

    ctx.beginPath();

    switch (concept.shape) {
      case "circle":
        ctx.arc(cx, cy, rs, 0, Math.PI * 2);
        break;

      case "hexagon":
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const x = cx + rs * Math.cos(a);
          const y = cy + rs * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case "diamond":
        ctx.moveTo(cx, cy - rs);
        ctx.lineTo(cx + rs * 0.75, cy);
        ctx.lineTo(cx, cy + rs);
        ctx.lineTo(cx - rs * 0.75, cy);
        ctx.closePath();
        break;

      case "shield":
        ctx.moveTo(cx, cy - rs);
        ctx.lineTo(cx + rs, cy - rs * 0.3);
        ctx.lineTo(cx + rs, cy + rs * 0.2);
        ctx.quadraticCurveTo(cx + rs, cy + rs, cx, cy + rs);
        ctx.quadraticCurveTo(cx - rs, cy + rs, cx - rs, cy + rs * 0.2);
        ctx.lineTo(cx - rs, cy - rs * 0.3);
        ctx.closePath();
        break;

      default:
        ctx.roundRect(cx - rs, cy - rs, rs * 2, rs * 2, r);
    }

    ctx.fill();

    // Text
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(size * 0.32)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = size * 0.04;
    ctx.fillText(concept.initials, cx, cy + size * 0.02);
    ctx.shadowBlur = 0;
  }, [concept, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: concept.shape === "circle" ? "50%" : "12px"
      }}
    />
  );
}
function downloadLogo(concept: LogoConcept, exportW: number, exportH: number) {
  const canvas = document.createElement("canvas");
  canvas.width = exportW;
  canvas.height = exportH;

  const ctx = canvas.getContext("2d")!;
  const size = Math.min(exportW, exportH);

  const cx = exportW / 2;
  const cy = exportH / 2;
  const rs = size * 0.42;
  const r = size * 0.12;

  if (concept.bg.startsWith("linear-gradient")) {
    const match = concept.bg.match(/#[0-9a-fA-F]{3,6}/g) ?? [
      concept.primaryColor,
      concept.secondaryColor
    ];
    const grd = ctx.createLinearGradient(0, 0, exportW, exportH);
    grd.addColorStop(0, match[0]);
    grd.addColorStop(1, match[1] ?? match[0]);
    ctx.fillStyle = grd;
  } else {
    ctx.fillStyle = concept.primaryColor;
  }

  ctx.beginPath();

  switch (concept.shape) {
    case "circle":
      ctx.arc(cx, cy, rs, 0, Math.PI * 2);
      break;

    case "hexagon":
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + rs * Math.cos(a);
        const y = cy + rs * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;

    case "diamond":
      ctx.moveTo(cx, cy - rs);
      ctx.lineTo(cx + rs * 0.75, cy);
      ctx.lineTo(cx, cy + rs);
      ctx.lineTo(cx - rs * 0.75, cy);
      ctx.closePath();
      break;

    case "shield":
      ctx.moveTo(cx, cy - rs);
      ctx.lineTo(cx + rs, cy - rs * 0.3);
      ctx.lineTo(cx + rs, cy + rs * 0.2);
      ctx.quadraticCurveTo(cx + rs, cy + rs, cx, cy + rs);
      ctx.quadraticCurveTo(cx - rs, cy + rs, cx - rs, cy + rs * 0.2);
      ctx.lineTo(cx - rs, cy - rs * 0.3);
      ctx.closePath();
      break;

    default:
      ctx.roundRect(cx - rs, cy - rs, rs * 2, rs * 2, r);
  }

  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.round(size * 0.32)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = size * 0.04;
  ctx.fillText(concept.initials, cx, cy + size * 0.02);
  ctx.shadowBlur = 0;

  const link = document.createElement("a");
  link.download = `${concept.name.toLowerCase().replace(/\s+/g, "-")}-logo-${exportW}x${exportH}px.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function LogoGeneratorTool({
  aiProvider,
  setAiProvider,
  tier,
  recordUse
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [industry, setIndustry] = useState("Creator / Content");
  const [style, setStyle] = useState("Modern");
  const [platform, setPlatform] = useState("YouTube");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [concepts, setConcepts] = useState<LogoConcept[] | null>(null);

  // FIXED: use index instead of concept.id
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  const [copied, setCopied] = useState(false);
  const [exportSize, setExportSize] = useState(800);
  const [showSizes, setShowSizes] = useState(false);
  const sizeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSizes) return;
    const handler = (e: MouseEvent) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target as Node)) {
        setShowSizes(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSizes]);

  const chosenConcept =
    concepts && chosenIndex !== null ? concepts[chosenIndex] : null;
  const run = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setErr("Describe your brand or enter your channel/business name.");
      return;
    }

    const u = recordUse("logo-generator", prompt);
    if (!u.allowed) {
      setErr("Daily limit reached. Upgrade to Pro for unlimited generations.");
      return;
    }

    setErr("");
    setLoading(true);
    setConcepts(null);
    setChosenIndex(null);

    try {
      const result = await runLogoAI(prompt, industry, style, platform, aiProvider);
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("AI returned an empty or invalid response. Check your API key in Vercel environment variables.");
      }
      setConcepts(result);
      setChosenIndex(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "AI error";
      setErr(
        msg.includes("NO_KEY")
          ? "Add VITE_ANTHROPIC_API_KEY or VITE_OPENAI_API_KEY to your Vercel environment variables."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const copyColors = () => {
    if (!chosenConcept) return;

    navigator.clipboard.writeText(
      `Primary: ${chosenConcept.primaryColor}\nSecondary: ${chosenConcept.secondaryColor}`
    );

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">

      {/* MODEL SELECTOR */}
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            AI Model
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose which AI generates your logo concepts
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setAiProvider("anthropic")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              aiProvider === "anthropic"
                ? "bg-violet-600 text-white shadow-sm"
                : "border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            <Sparkles size={14} /> Claude
          </button>

          <button
            onClick={() => setAiProvider("openai")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              aiProvider === "openai"
                ? "bg-violet-600 text-white shadow-sm"
                : "border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            <span className="font-bold text-xs">GPT</span> GPT-4o
          </button>
        </div>
      </div>
      {/* INPUT FORM */}
      <form
        onSubmit={run}
        className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            AI Logo Generator
          </p>
          <h3 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
            Describe your brand → get 2 AI logo concepts
          </h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Brand name or description *
          </label>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. TechNova — a modern SaaS brand for developers"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[{ label: "Industry", val: industry, set: setIndustry, opts: INDUSTRIES },
            { label: "Style", val: style, set: setStyle, opts: STYLES },
            { label: "Platform", val: platform, set: setPlatform, opts: PLATFORMS }
          ].map(({ label, val, set, opts }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {label}
              </label>
              <select
                value={val}
                onChange={(e) => set(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {opts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {err && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <RefreshCw size={15} className="animate-spin" /> Generating concepts…
            </>
          ) : (
            <>
              <Sparkles size={15} /> Generate logo concepts
            </>
          )}
        </button>
      </form>
      {/* RESULTS */}
      <AnimatePresence>
        {concepts && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Pick your favourite concept
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {concepts.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setChosenIndex(i)}
                  className={`cursor-pointer rounded-2xl border-2 bg-white p-5 transition-all dark:bg-gray-900 ${
                    chosenIndex === i
                      ? "border-violet-500 shadow-lg shadow-violet-500/10"
                      : "border-gray-200 hover:border-violet-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <LogoCanvas concept={c} size={80} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                          {c.name}
                        </p>

                        {chosenIndex === i && (
                          <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600">
                            <Check size={11} className="text-white" />
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {c.tagline}
                      </p>

                      <p className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                        {c.style}
                      </p>

                      <div className="mt-2 flex gap-1.5">
                        <span
                          className="h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700"
                          style={{ background: c.primaryColor }}
                        />
                        <span
                          className="h-4 w-4 rounded-full border border-gray-200 dark:border-gray-700"
                          style={{ background: c.secondaryColor }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                        {c.rationale}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {/* CHOSEN CONCEPT PANEL */}
            {chosenConcept && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-start gap-6">

                  {/* Preview */}
                  <div className="flex flex-col items-center gap-3">
                    <LogoCanvas concept={chosenConcept} size={140} />
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {chosenConcept.name}
                    </p>
                    <p className="text-xs text-gray-400 text-center max-w-[140px]">
                      {chosenConcept.tagline}
                    </p>
                  </div>

                  {/* Colors + Download */}
                  <div className="flex-1 min-w-[200px] space-y-4">

                    {/* Colors */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                        Colors
                      </p>

                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          {[chosenConcept.primaryColor, chosenConcept.secondaryColor].map((col, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                              <span
                                className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                                style={{ background: col }}
                              />
                              <span className="text-[10px] text-gray-400 font-mono">{col}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={copyColors}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {copied ? (
                            <>
                              <Check size={11} className="text-green-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> Copy hex
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Download */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                        Download
                      </p>

                      <div className="flex flex-wrap gap-2">

                        {/* Size dropdown */}
                        <div className="relative" ref={sizeDropdownRef}>
                          <button
                            onClick={() => setShowSizes((v) => !v)}
                            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            {SIZES.find((s) => s.w === exportSize)?.label || "Select size"}
                            <ChevronDown size={11} />
                          </button>

                          {showSizes && (
                            <div className="absolute left-0 top-9 z-20 w-56 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                              {SIZES.map((s) => (
                                <button
                                  key={s.w}
                                  onClick={() => {
                                    setExportSize(s.w);
                                    setShowSizes(false);
                                  }}
                                  className="flex w-full items-center justify-between px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 first:rounded-t-xl last:rounded-b-xl"
                                >
                                  {s.label}
                                  <span className="text-gray-400">
                                    {s.w}×{s.h}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Download button */}
                        <button
                          onClick={() => {
                            const sizeObj = SIZES.find((s) => s.w === exportSize) ?? SIZES[0];
                            downloadLogo(chosenConcept, sizeObj.w, sizeObj.h);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700"
                        >
                          <Download size={13} /> Download PNG
                        </button>
                      </div>

                      {tier !== "premium" && (
                        <p className="mt-2 text-xs text-gray-400">
                          Upgrade to Pro for SVG export and batch sizes
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
