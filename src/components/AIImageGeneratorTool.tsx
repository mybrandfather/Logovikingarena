import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, Sparkles, ImageIcon, Copy, Check, Zap } from "lucide-react";
import { generateImage, runAITool, type AIProvider } from "../ai";

interface Props {
  aiProvider: AIProvider;
  setAiProvider: (p: AIProvider) => void;
  recordUse: (slug: string, q: string) => { allowed: boolean };
}

const STYLES = [
  { id: "photorealistic", label: "Photorealistic" },
  { id: "cinematic", label: "Cinematic" },
  { id: "digital-art", label: "Digital Art" },
  { id: "oil-painting", label: "Oil Painting" },
  { id: "watercolor", label: "Watercolor" },
  { id: "anime", label: "Anime" },
  { id: "3d-render", label: "3D Render" },
  { id: "minimalist", label: "Minimalist" },
  { id: "vintage", label: "Vintage" },
  { id: "neon-cyberpunk", label: "Cyberpunk" },
];

const RATIOS = [
  { id: "1:1",  label: "1:1",  desc: "Instagram / Profile",        w: 1024, h: 1024 },
  { id: "16:9", label: "16:9", desc: "YouTube Thumbnail",          w: 1280, h: 720  },
  { id: "9:16", label: "9:16", desc: "TikTok / Reels / Stories",  w: 720,  h: 1280 },
  { id: "4:3",  label: "4:3",  desc: "Blog / Pinterest",           w: 1024, h: 768  },
];

export default function AIImageGeneratorTool({ aiProvider, setAiProvider, recordUse }: Props) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [ratio, setRatio] = useState("1:1");
  const [err, setErr] = useState("");
  const [loadingImg, setLoadingImg] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [optimizedPrompts, setOptimizedPrompts] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [variations, setVariations] = useState<string[]>([]);
  const [activeVariant, setActiveVariant] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const selectedStyle = STYLES.find(s => s.id === style) ?? STYLES[0];
  const selectedRatio = RATIOS.find(r => r.id === ratio) ?? RATIOS[0];
  const currentUrl = variations[activeVariant] ?? imageUrl;

  const optimizePrompt = async () => {
    if (!prompt.trim()) { setErr("Enter a description first."); return; }
    setLoadingPrompts(true); setErr("");
    try {
      const result = await runAITool(
        { slug: "ai-image-generator", name: "AI Image Generator", category: "image" },
        prompt, aiProvider, { Style: style, Ratio: ratio }
      );
      const promptBlock = result.blocks.find(b => b.label.toLowerCase().includes("prompt"));
      setOptimizedPrompts(promptBlock?.items ?? result.blocks[0]?.items ?? []);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "AI error"); }
    finally { setLoadingPrompts(false); }
  };

  const generate = async (usePrompt?: string) => {
    const p = usePrompt ?? prompt;
    if (!p.trim()) { setErr("Describe what you want to generate."); return; }
    const u = recordUse("ai-image-generator", p);
    if (!u.allowed) { setErr("Daily limit reached. Upgrade to Pro for unlimited generations."); return; }
    setErr(""); setLoadingImg(true); setImgLoaded(false); setImgError(false); setVariations([]); setActiveVariant(0);
    try {
      const url = await generateImage(p, selectedStyle.label, ratio);
      setImageUrl(url);
      setRetryCount(0);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Image generation failed — please try again."); }
    finally { setLoadingImg(false); }
  };

  const retryGenerate = async () => {
    if (!prompt.trim() && !imageUrl) return;
    setImgError(false); setImgLoaded(false); setLoadingImg(true);
    try {
      const url = await generateImage(prompt || "abstract art", selectedStyle.label, ratio);
      setImageUrl(url);
      setRetryCount(c => c + 1);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Retry failed — please try again."); }
    finally { setLoadingImg(false); }
  };

  const generateVariations = async () => {
    if (!prompt.trim()) return;
    setLoadingImg(true);
    try {
      const urls = await Promise.all([generateImage(prompt, selectedStyle.label, ratio), generateImage(prompt, selectedStyle.label, ratio)]);
      setVariations(urls);
    } catch { /**/ } finally { setLoadingImg(false); }
  };

  const downloadImage = async () => {
    if (!currentUrl) return;
    try {
      const res = await fetch(currentUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `logoviking-ai-image-${Date.now()}.png`;
      a.click();
    } catch { window.open(currentUrl, "_blank"); }
  };

  const copyPrompt = (p: string, i: number) => {
    navigator.clipboard.writeText(p);
    setCopied(i); setTimeout(() => setCopied(null), 2000);
    setPrompt(p);
  };

  return (
    <div className="space-y-5">

      {/* ── Model + Ratio selectors (top bar) ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 space-y-4">
        {/* Model */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[140px]">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">AI Model</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Prompt optimizer uses this model</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAiProvider("anthropic")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${aiProvider === "anthropic" ? "bg-violet-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400"}`}>
              <Sparkles size={14}/> Claude
            </button>
            <button onClick={() => setAiProvider("openai")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${aiProvider === "openai" ? "bg-violet-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400"}`}>
              <Zap size={14}/> GPT-4o
            </button>
          </div>
        </div>

        {/* Aspect ratio */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Aspect Ratio</p>
          <div className="grid grid-cols-4 gap-2">
            {RATIOS.map(r => (
              <button key={r.id} onClick={() => setRatio(r.id)}
                className={`flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-all ${ratio === r.id ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40" : "border-gray-200 hover:border-violet-200 dark:border-gray-700"}`}>
                <span className={`text-sm font-bold ${ratio === r.id ? "text-violet-700 dark:text-violet-300" : "text-gray-700 dark:text-gray-300"}`}>{r.label}</span>
                <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Prompt + Style ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">AI Image Generator</p>
          <h3 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">Turn words into images — free, no API key needed</h3>
          <p className="mt-1 text-xs text-gray-400">Powered by Flux · No watermark · Instant download</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Describe your image *</label>
          <textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. A futuristic city at sunset with flying cars and neon lights, ultra-detailed"
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"/>
        </div>
        {/* Style pills */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Style</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <button key={s.id} onClick={() => setStyle(s.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${style === s.id ? "bg-violet-600 text-white" : "border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:text-gray-400"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {err && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{err}</p>}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => generate()} disabled={loadingImg}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {loadingImg ? <><RefreshCw size={15} className="animate-spin"/> Generating…</> : <><ImageIcon size={15}/> Generate image</>}
          </button>
          <button onClick={optimizePrompt} disabled={loadingPrompts}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50">
            {loadingPrompts ? <><RefreshCw size={13} className="animate-spin"/> Optimizing…</> : <><Sparkles size={13}/> Optimize prompt with AI</>}
          </button>
        </div>
      </div>

      {/* ── Optimized prompts ── */}
      <AnimatePresence>
        {optimizedPrompts.length > 0 && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/20 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">AI-optimized prompts — click Use to generate</p>
            {optimizedPrompts.map((p, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-white p-3 dark:bg-gray-900 border border-violet-100 dark:border-violet-900">
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{p}</p>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => copyPrompt(p, i)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700">
                    {copied === i ? <Check size={11} className="text-green-500"/> : <Copy size={11}/>}
                  </button>
                  <button onClick={() => { setPrompt(p); generate(p); }} className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700">
                    <Zap size={11}/> Use
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Image output ── */}
      <AnimatePresence>
        {(loadingImg || currentUrl) && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-gray-900">
            <div className="relative bg-gray-100 dark:bg-gray-800" style={{aspectRatio: ratio.replace(":", "/")}}>
              {loadingImg && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={28} className="animate-spin text-violet-400"/>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Generating your image…</p>
                  <p className="text-xs text-gray-400">Usually 5–20 seconds · Free AI is sometimes busy</p>
                </div>
              )}
              {currentUrl && !imgError && (
                <img src={currentUrl} alt="AI generated"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => { setImgError(true); setImgLoaded(false); }}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}/>
              )}
              {currentUrl && !imgLoaded && !loadingImg && !imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={20} className="animate-spin text-violet-300"/>
                  <p className="text-xs text-gray-400">Loading image…</p>
                </div>
              )}
              {imgError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <ImageIcon size={32} className="text-gray-300 dark:text-gray-600"/>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Image failed to load — the free AI is sometimes busy</p>
                  <p className="text-xs text-gray-400 mb-1">This is normal. Just click retry and it will work.</p>
                  <button onClick={retryGenerate} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
                    <RefreshCw size={13}/> Try again
                  </button>
                </div>
              )}
            </div>
            {currentUrl && imgLoaded && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{selectedStyle.label} · {ratio} · {selectedRatio.w}×{selectedRatio.h}px</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{prompt.slice(0,60)}{prompt.length>60?"…":""}</p>
                </div>
                <div className="flex gap-2">
                  {variations.length === 0 && (
                    <button onClick={generateVariations} disabled={loadingImg} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                      <RefreshCw size={12}/> Variations
                    </button>
                  )}
                  <button onClick={() => generate()} disabled={loadingImg} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                    <RefreshCw size={12}/> Regenerate
                  </button>
                  <button onClick={downloadImage} className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">
                    <Download size={12}/> Download
                  </button>
                </div>
              </div>
            )}
            {variations.length > 0 && (
              <div className="flex gap-2 px-5 pb-4">
                {[imageUrl, ...variations].map((url, i) => (
                  <button key={i} onClick={() => setActiveVariant(i)} className={`relative h-14 w-14 overflow-hidden rounded-lg border-2 transition-all ${activeVariant===i?"border-violet-500":"border-transparent opacity-60 hover:opacity-100"}`}>
                    <img src={url??""} alt="" className="h-full w-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!imageUrl && !loadingImg && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/40">
          <ImageIcon size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600"/>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Your generated image will appear here</p>
          <p className="mt-1 text-xs text-gray-400">Powered by Flux · Free · No watermark</p>
        </div>
      )}
    </div>
  );
}
