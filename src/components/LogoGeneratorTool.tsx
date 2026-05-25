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

function downloadLogo(concept: LogoConcept, exportSize: number) {
  const canvas = document.createElement("canvas");
  canvas.width = exportSize;
  canvas.height = exportSize;

  const ctx = canvas.getContext("2d")!;
  const size = exportSize;

  const cx = size / 2;
  const cy = size / 2;
  const rs = size * 0.42;
  const r = size * 0.12;

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

  ctx.beginPath();

  switch (concept.shape) {
    case "circle":
      ctx.arc(cx, cy, rs, 0, Math.PI * 2);
      break