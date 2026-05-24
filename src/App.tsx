import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  Suspense,
  lazy,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

// Lazy-loaded heavy tools (only fetched when the user opens them)
const BackgroundRemoverTool = lazy(() => import("./components/BackgroundRemoverTool"));
const LogoGeneratorTool = lazy(() => import("./components/LogoGeneratorTool"));
const AIImageGeneratorTool = lazy(() => import("./components/AIImageGeneratorTool"));

import { runAITool, type AIProvider, type AIToolResult } from "./ai";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  Copy,
  Globe,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  LogOut,
  Mail,
  Camera,
  MapPin,
  Menu,
  Moon,
  Palette,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Target,
  Trash2,
  UserPlus,
  Video,
  WandSparkles,
  Wand2,
  X,
  Zap,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { cn } from "./utils/cn";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tier = "guest" | "free" | "premium";
type Theme = "light" | "dark";
type ColorTheme = "violet" | "rose" | "emerald" | "amber" | "cyan";
type LangCode = "en" | "es" | "pt" | "ar" | "ru" | "fr" | "de" | "zh" | "hi" | "ja" | "it" | "ko" | "tr" | "nl" | "id";
type ToolGroup =
  | "image"
  | "designer"
  | "youtube"
  | "tiktok"
  | "instagram"
  | "pinterest"
  | "seo"
  | "ai";

type Tool = {
  slug: string;
  name: string;
  category: ToolGroup;
  description: string;
  featured?: boolean;
  isNew?: boolean;
  isPremium?: boolean;
};



type HistoryEntry = { id: string; slug: string; query: string; createdAt: string };
type Project = { id: string; slug: string; title: string; summary: string; createdAt: string };
type Account = {
  name: string;
  email: string;
  tier: Tier;
  provider: "email" | "google" | "guest";
  authenticated: boolean;
};
type BlogSection = { id: string; title: string; paragraphs: string[] };
type BlogFaq = { question: string; answer: string };
type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: string;
  updatedAt: string;
  sections: BlogSection[];
  faqs: BlogFaq[];
  related: string[];
};
type SiteContextValue = {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  colorTheme: ColorTheme;
  setColorTheme: Dispatch<SetStateAction<ColorTheme>>;
  lang: LangCode;
  setLang: Dispatch<SetStateAction<LangCode>>;
  t: (key: string) => string;
  isRTL: boolean;
  account: Account;
  setAccount: Dispatch<SetStateAction<Account>>;
  favorites: string[];
  toggleFavorite: (slug: string) => void;
  history: HistoryEntry[];
  recordToolUse: (slug: string, query: string) => { allowed: boolean; remaining: number; limit: number };
  clearHistory: () => void;
  projects: Project[];
  saveProject: (p: Project) => void;
  deleteProject: (id: string) => void;
  aiProvider: AIProvider;
  setAiProvider: Dispatch<SetStateAction<AIProvider>>;
};

// ─── Constants ───────────────────────────────────────────────────────────────
const TOOL_LIMITS: Record<Tier, number> = { guest: 5, free: 25, premium: Infinity };
const siteName = "Logoviking";
const siteDomain = "https://logoviking.com";

// ─── Color themes ─────────────────────────────────────────────────────────────
// `accent` is the complementary color used for the second word of the "LogoViking" wordmark
const colorThemes: { id: ColorTheme; label: string; color: string; accent: string; textClass: string; bgClass: string; borderClass: string }[] = [
  { id: "violet",  label: "Violet",  color: "#7C3AED", accent: "#0EA5E9", textClass: "text-violet-600 dark:text-violet-400",  bgClass: "bg-violet-600 hover:bg-violet-700",  borderClass: "border-violet-400" },
  { id: "rose",    label: "Rose",    color: "#E11D48", accent: "#1E293B", textClass: "text-rose-600 dark:text-rose-400",      bgClass: "bg-rose-600 hover:bg-rose-700",      borderClass: "border-rose-400"   },
  { id: "emerald", label: "Emerald", color: "#059669", accent: "#0F172A", textClass: "text-emerald-600 dark:text-emerald-400",bgClass: "bg-emerald-600 hover:bg-emerald-700",borderClass: "border-emerald-400"},
  { id: "amber",   label: "Amber",   color: "#D97706", accent: "#1E293B", textClass: "text-amber-600 dark:text-amber-400",    bgClass: "bg-amber-500 hover:bg-amber-600",    borderClass: "border-amber-400"  },
  { id: "cyan",    label: "Cyan",    color: "#0891B2", accent: "#1E293B", textClass: "text-cyan-600 dark:text-cyan-400",      bgClass: "bg-cyan-600 hover:bg-cyan-700",      borderClass: "border-cyan-400"   },
];

// ─── Languages ───────────────────────────────────────────────────────────────
const languages: { code: LangCode; label: string; native: string; flag: string; rtl?: boolean }[] = [
  { code: "en", label: "English",    native: "English",    flag: "🇺🇸" },
  { code: "es", label: "Spanish",    native: "Español",    flag: "🇪🇸" },
  { code: "pt", label: "Portuguese", native: "Português",  flag: "🇧🇷" },
  { code: "fr", label: "French",     native: "Français",   flag: "🇫🇷" },
  { code: "de", label: "German",     native: "Deutsch",    flag: "🇩🇪" },
  { code: "it", label: "Italian",    native: "Italiano",   flag: "🇮🇹" },
  { code: "nl", label: "Dutch",      native: "Nederlands", flag: "🇳🇱" },
  { code: "ru", label: "Russian",    native: "Русский",    flag: "🇷🇺" },
  { code: "tr", label: "Turkish",    native: "Türkçe",     flag: "🇹🇷" },
  { code: "ar", label: "Arabic",     native: "العربية",    flag: "🇸🇦", rtl: true },
  { code: "hi", label: "Hindi",      native: "हिन्दी",      flag: "🇮🇳" },
  { code: "zh", label: "Chinese",    native: "中文",       flag: "🇨🇳" },
  { code: "ja", label: "Japanese",   native: "日本語",     flag: "🇯🇵" },
  { code: "ko", label: "Korean",     native: "한국어",     flag: "🇰🇷" },
  { code: "id", label: "Indonesian", native: "Indonesia",  flag: "🇮🇩" },
];

type Translations = Record<string, string>;

const translations: Partial<Record<LangCode, Translations>> = {
  en: {
    // Nav
    "nav.home": "Home", "nav.tools": "Tools", "nav.categories": "Categories",
    "nav.blog": "Blog", "nav.pricing": "Pricing", "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard", "nav.login": "Login", "nav.signup": "Sign up",
    "nav.account": "Account", "nav.logout": "Logout",
    "nav.all": "All",
    // Hero
    "hero.badge": "60+ free creator tools, no signup needed",
    "hero.title1": "One platform.", "hero.title2": "Every creator tool.",
    "hero.subtitle": "Generate logos, AI images, YouTube titles, SEO metadata, hashtags, captions, and 60+ more tools — all free to try, no account required.",
    "hero.cta1": "Try the Creator Kit", "hero.cta2": "Logo Generator", "hero.cta3": "AI Image Gen",
    "hero.check1": "No signup to use tools", "hero.check2": "Free plan available", "hero.check3": "Premium from $19/mo",
    // Sections
    "section.newTools": "Just added", "section.categories": "Browse by workflow",
    "section.featured": "All-in-One Creator Kit", "section.featuredSub": "One topic → titles, hashtags, thumbnails, captions, and keywords.",
    "section.popularTools": "Popular tools", "section.allTools": "All Tools",
    "section.blog": "Guides and tutorials", "section.pricing": "Simple pricing",
    "section.pricingSub": "Start free. Upgrade when you need more power.",
    // Buttons
    "btn.viewAll": "View all", "btn.allTools": "All tools", "btn.openTool": "Open",
    "btn.generate": "Generate", "btn.generating": "Generating…",
    "btn.generateLogo": "Generate Logo Concepts", "btn.generatingLogo": "Generating 2 concepts…",
    "btn.generateImage": "Generate Image",
    "btn.download": "Download", "btn.copy": "Copy", "btn.export": "Export",
    "btn.save": "Save", "btn.upgrade": "Upgrade", "btn.back": "Back",
    "btn.readMore": "Read", "btn.explore": "Explore",
    "btn.createAccount": "Create free account", "btn.openDashboard": "Open dashboard",
    "btn.getStarted": "Get started", "btn.startFree": "Start free",
    "btn.upgradePro": "Upgrade to Pro", "btn.chooseBusiness": "Choose Business",
    "btn.saveChanges": "Save changes", "btn.sendMessage": "Send message",
    "btn.sendReset": "Send reset link", "btn.googleLogin": "Continue with Google",
    "btn.clearHistory": "Clear", "btn.deletePlan": "Delete",
    "btn.manageplan": "Manage plan", "btn.viewFullComparison": "View full comparison",
    // Labels
    "label.account": "Account", "label.guest": "Guest visitor",
    "label.recentlyUsed": "Recently used", "label.recommended": "Recommended",
    "label.noRecent": "No tools used yet.", "label.noFavorites": "No favorites yet.",
    "label.noProjects": "Premium saves appear here.",
    "label.noHistory": "No history yet. Try a tool to get started.",
    "label.topTools": "Top tools used", "label.noData": "No data yet.",
    "label.relatedTools": "Related tools", "label.readNext": "Read next",
    "label.popularTools": "Popular tools", "label.faqs": "FAQs",
    "label.tableOfContents": "Table of Contents", "label.relatedPosts": "Related posts",
    "label.subscription": "Subscription", "label.currentPlan": "Current plan",
    "label.status": "Status", "label.savedProjects": "Saved projects",
    "label.favorites": "Favorites", "label.recentHistory": "Recent history",
    "label.totalUses": "Total uses", "label.dailyLimit": "Daily limit",
    "label.plan": "Plan", "label.unlimited": "Unlimited",
    "label.tools": "tools", "label.new": "New", "label.pro": "Pro", "label.featured": "Featured",
    "label.input": "Input", "label.output": "Output",
    "label.topic": "Topic or query", "label.uploadImage": "Upload image",
    "label.optional": "(optional)",
    "label.themeColor": "Theme color", "label.mode": "Mode",
    "label.light": "Light", "label.dark": "Dark",
    "label.language": "Language",
    "label.advertisement": "Advertisement",
    "label.blogCategory": "Blog", "label.readingTime": "read",
    "label.updated": "Updated",
    "label.upgradeNote": "Guest/Free: Watermark and limits apply.",
    "label.upgradeLink": "Upgrade to remove ads and unlock unlimited usage.",
    "label.tagline": "Creator Toolkit",
    "label.footerDesc": "All-in-one creator, designer, and SEO toolkit for high-traffic publishing and passive income.",
    "label.footerProduct": "Product", "label.footerCategories": "Categories", "label.footerLegal": "Legal",
    "label.footerCopy": "Built for creators, SEO, and passive income.",
    "label.menu": "Menu",
    "label.name": "Name", "label.email": "Email", "label.password": "Password", "label.message": "Message",
    "label.industry": "Industry", "label.stylePreference": "Style preference", "label.primaryPlatform": "Primary platform",
    "label.brandPrompt": "Brand / Channel prompt",
    "label.brandPromptHint": "(be specific)",
    "label.promptCounter": "/400 — include brand name, colors, style, and vibe for best results",
    "label.aiLogoTitle": "AI Logo Generator",
    "label.aiLogoSub": "Describe your brand → get 2 logo concepts",
    "label.your2Concepts": "Your 2 Logo Concepts",
    "label.chooseConcept": "Choose the one that fits your brand best",
    "label.conceptSelected": "selected ✓",
    "label.downloadExport": "Download & Export",
    "label.downloadPng": "Download PNG", "label.downloadSvg": "Download SVG",
    "label.copyCss": "Copy CSS colors", "label.saveProject": "Save to projects",
    "label.upgradeHd": "Upgrade for HD export",
    "label.upgradeForFull": "Upgrade to Creator Pro",
    "label.upgradeForFullSub": "for HD PNG, vector SVG, all platform sizes, and saved projects.",
    "label.generatingLogo": "AI is generating your 2 logo concepts…",
    "label.analyzingPrompt": "Analyzing your brand prompt, industry, style, and platform",
    "label.describeImage": "Describe your image",
    "label.style": "Style", "label.aspectRatio": "Aspect Ratio",
    "label.generatedImage": "Generated Image",
    "label.imagePromptHint": "Describe your image above and click Generate",
    "label.upgradeResolution": "Upgrade for full resolution",
    "label.removeWatermark": "Remove watermark",
    "label.regenerate": "Regenerate",
    "label.settings": "Settings and preferences",
    "label.settingsSub": "Manage your profile and preferences.",
    "label.toggleTheme": "Toggle theme",
    "label.logout": "Logout",
    "label.savedSuccessfully": "Saved successfully.",
    "label.invalidForm": "Enter a valid name and email.",
    "label.contactSent": "Thanks! Your message is on its way (demo mode).",
    "label.invalidContact": "Enter a valid message without spam patterns.",
    "label.sendUs": "Send us a message",
    "label.resetSent": "Password reset link sent (demo mode).",
    "label.invalidAuth": "Use a valid email and a password with at least 8 characters.",
    "label.dailyLimitReached": "Daily limit reached. Upgrade to unlock unlimited usage.",
    "label.addTopic": "Add a topic or upload an image.",
    "label.keepConcise": "Keep input concise and spam-free.",
    "label.upgradeNow": "Upgrade now",
    "label.search": "Search tools…",
    "label.notFound": "Page not found",
    "label.notFoundSub": "Try browsing tools, categories, or blog posts instead.",
    "label.browseTools": "Browse tools",
    "label.welcomeBack": "Welcome back", "label.createFreeAccount": "Create free account",
    "label.resetPassword": "Reset your password",
    "label.minPassword": "Min. 8 characters",
    "label.forgotPassword": "Forgot password",
    "label.authTagline": "Logoviking — Creator Toolkit",
    "label.tier": "plan",
    "label.concept": "Concept",
    "label.upgradeCreatorPro": "Upgrade to Creator Pro",
    "label.upgradeCreatorProSub": "Unlimited usage, no ads, batch processing, and saved projects.",
  },
  es: {
    "nav.home": "Inicio", "nav.tools": "Herramientas", "nav.categories": "Categorías",
    "nav.blog": "Blog", "nav.pricing": "Precios", "nav.faq": "Preguntas",
    "nav.dashboard": "Panel", "nav.login": "Iniciar sesión", "nav.signup": "Registrarse",
    "nav.account": "Cuenta", "nav.logout": "Cerrar sesión", "nav.all": "Todo",
    "hero.badge": "Más de 60 herramientas gratuitas, sin registro",
    "hero.title1": "Una plataforma.", "hero.title2": "Todas las herramientas.",
    "hero.subtitle": "Genera logos, imágenes con IA, títulos de YouTube, metadatos SEO, hashtags, descripciones y más de 60 herramientas — todas gratuitas.",
    "hero.cta1": "Probar el Kit Creador", "hero.cta2": "Generador de Logos", "hero.cta3": "IA de Imágenes",
    "hero.check1": "Sin registro para usar herramientas", "hero.check2": "Plan gratuito disponible", "hero.check3": "Premium desde $19/mes",
    "section.newTools": "Recién agregado", "section.categories": "Explorar por flujo de trabajo",
    "section.featured": "Kit Todo en Uno para Creadores", "section.featuredSub": "Un tema → títulos, hashtags, miniaturas, descripciones y palabras clave.",
    "section.popularTools": "Herramientas populares", "section.allTools": "Todas las herramientas",
    "section.blog": "Guías y tutoriales", "section.pricing": "Precios simples",
    "section.pricingSub": "Empieza gratis. Mejora cuando necesites más.",
    "btn.viewAll": "Ver todo", "btn.allTools": "Todas las herramientas", "btn.openTool": "Abrir",
    "btn.generate": "Generar", "btn.generating": "Generando…",
    "btn.generateLogo": "Generar Conceptos de Logo", "btn.generatingLogo": "Generando 2 conceptos…",
    "btn.generateImage": "Generar Imagen",
    "btn.download": "Descargar", "btn.copy": "Copiar", "btn.export": "Exportar",
    "btn.save": "Guardar", "btn.upgrade": "Mejorar", "btn.back": "Volver",
    "btn.readMore": "Leer", "btn.explore": "Explorar",
    "btn.createAccount": "Crear cuenta gratuita", "btn.openDashboard": "Abrir panel",
    "btn.getStarted": "Comenzar", "btn.startFree": "Empezar gratis",
    "btn.upgradePro": "Mejorar a Pro", "btn.chooseBusiness": "Elegir Business",
    "btn.saveChanges": "Guardar cambios", "btn.sendMessage": "Enviar mensaje",
    "btn.sendReset": "Enviar enlace", "btn.googleLogin": "Continuar con Google",
    "btn.clearHistory": "Limpiar", "btn.deletePlan": "Eliminar",
    "btn.manageplan": "Gestionar plan", "btn.viewFullComparison": "Ver comparación",
    "label.account": "Cuenta", "label.guest": "Visitante invitado",
    "label.recentlyUsed": "Usadas recientemente", "label.recommended": "Recomendadas",
    "label.noRecent": "Aún no has usado herramientas.", "label.noFavorites": "Sin favoritos aún.",
    "label.noProjects": "Los guardados premium aparecen aquí.",
    "label.noHistory": "Sin historial. Prueba una herramienta.",
    "label.topTools": "Herramientas más usadas", "label.noData": "Sin datos aún.",
    "label.relatedTools": "Herramientas relacionadas", "label.readNext": "Leer después",
    "label.popularTools": "Herramientas populares", "label.faqs": "Preguntas frecuentes",
    "label.tableOfContents": "Tabla de contenidos", "label.relatedPosts": "Artículos relacionados",
    "label.subscription": "Suscripción", "label.currentPlan": "Plan actual",
    "label.status": "Estado", "label.savedProjects": "Proyectos guardados",
    "label.favorites": "Favoritos", "label.recentHistory": "Historial reciente",
    "label.totalUses": "Total de usos", "label.dailyLimit": "Límite diario",
    "label.plan": "Plan", "label.unlimited": "Ilimitado",
    "label.tools": "herramientas", "label.new": "Nuevo", "label.pro": "Pro", "label.featured": "Destacado",
    "label.input": "Entrada", "label.output": "Salida",
    "label.topic": "Tema o consulta", "label.uploadImage": "Subir imagen", "label.optional": "(opcional)",
    "label.themeColor": "Color del tema", "label.mode": "Modo",
    "label.light": "Claro", "label.dark": "Oscuro", "label.language": "Idioma",
    "label.advertisement": "Publicidad",
    "label.blogCategory": "Blog", "label.readingTime": "lectura", "label.updated": "Actualizado",
    "label.upgradeNote": "Invitado/Gratis: Se aplican límites y marcas de agua.",
    "label.upgradeLink": "Mejora para quitar anuncios y desbloquear uso ilimitado.",
    "label.tagline": "Kit para Creadores",
    "label.footerDesc": "Kit todo en uno para creadores, diseñadores y SEO.",
    "label.footerProduct": "Producto", "label.footerCategories": "Categorías", "label.footerLegal": "Legal",
    "label.footerCopy": "Creado para creadores, SEO e ingresos pasivos.",
    "label.menu": "Menú",
    "label.name": "Nombre", "label.email": "Correo", "label.password": "Contraseña", "label.message": "Mensaje",
    "label.industry": "Industria", "label.stylePreference": "Estilo preferido", "label.primaryPlatform": "Plataforma principal",
    "label.brandPrompt": "Descripción de marca / canal", "label.brandPromptHint": "(sé específico)",
    "label.promptCounter": "/400 — incluye nombre, colores, estilo y ambiente",
    "label.aiLogoTitle": "Generador de Logos con IA", "label.aiLogoSub": "Describe tu marca → obtén 2 conceptos de logo",
    "label.your2Concepts": "Tus 2 Conceptos de Logo", "label.chooseConcept": "Elige el que mejor se adapte",
    "label.conceptSelected": "seleccionado ✓", "label.downloadExport": "Descargar y Exportar",
    "label.downloadPng": "Descargar PNG", "label.downloadSvg": "Descargar SVG",
    "label.copyCss": "Copiar colores CSS", "label.saveProject": "Guardar en proyectos",
    "label.upgradeHd": "Mejorar para exportar en HD",
    "label.upgradeForFull": "Mejorar a Creator Pro",
    "label.upgradeForFullSub": "para PNG HD, SVG vectorial y todos los tamaños de plataforma.",
    "label.generatingLogo": "La IA está generando tus 2 conceptos…",
    "label.analyzingPrompt": "Analizando tu descripción, industria, estilo y plataforma",
    "label.describeImage": "Describe tu imagen", "label.style": "Estilo", "label.aspectRatio": "Relación de aspecto",
    "label.generatedImage": "Imagen Generada", "label.imagePromptHint": "Describe tu imagen arriba y haz clic en Generar",
    "label.upgradeResolution": "Mejorar para resolución completa", "label.removeWatermark": "Quitar marca de agua",
    "label.regenerate": "Regenerar", "label.settings": "Configuración y preferencias",
    "label.settingsSub": "Gestiona tu perfil y preferencias.",
    "label.toggleTheme": "Cambiar tema", "label.logout": "Cerrar sesión",
    "label.savedSuccessfully": "Guardado correctamente.", "label.invalidForm": "Ingresa un nombre y correo válidos.",
    "label.contactSent": "¡Gracias! Tu mensaje está en camino (modo demo).",
    "label.invalidContact": "Ingresa un mensaje válido sin patrones de spam.",
    "label.sendUs": "Envíanos un mensaje",
    "label.resetSent": "Enlace de restablecimiento enviado (modo demo).",
    "label.invalidAuth": "Usa un correo válido y una contraseña de al menos 8 caracteres.",
    "label.dailyLimitReached": "Límite diario alcanzado. Mejora para uso ilimitado.",
    "label.addTopic": "Agrega un tema o sube una imagen.", "label.keepConcise": "Mantén la entrada concisa y sin spam.",
    "label.upgradeNow": "Mejorar ahora", "label.search": "Buscar herramientas…",
    "label.notFound": "Página no encontrada", "label.notFoundSub": "Intenta explorar herramientas, categorías o artículos.",
    "label.browseTools": "Explorar herramientas",
    "label.welcomeBack": "Bienvenido de nuevo", "label.createFreeAccount": "Crear cuenta gratis",
    "label.resetPassword": "Restablecer contraseña", "label.minPassword": "Mín. 8 caracteres",
    "label.forgotPassword": "¿Olvidaste tu contraseña?", "label.authTagline": "Logoviking — Kit para Creadores",
    "label.tier": "plan", "label.concept": "Concepto",
    "label.upgradeCreatorPro": "Mejorar a Creator Pro",
    "label.upgradeCreatorProSub": "Uso ilimitado, sin anuncios, procesamiento por lotes y proyectos guardados.",
  },
  pt: {
    "nav.home": "Início", "nav.tools": "Ferramentas", "nav.categories": "Categorias",
    "nav.blog": "Blog", "nav.pricing": "Preços", "nav.faq": "Perguntas",
    "nav.dashboard": "Painel", "nav.login": "Entrar", "nav.signup": "Cadastrar",
    "nav.account": "Conta", "nav.logout": "Sair", "nav.all": "Todas",
    "hero.badge": "Mais de 60 ferramentas gratuitas, sem cadastro",
    "hero.title1": "Uma plataforma.", "hero.title2": "Todas as ferramentas.",
    "hero.subtitle": "Gere logos, imagens com IA, títulos para YouTube, metadados SEO, hashtags, legendas e mais de 60 ferramentas — todas gratuitas.",
    "hero.cta1": "Experimentar o Kit", "hero.cta2": "Gerador de Logos", "hero.cta3": "IA de Imagens",
    "hero.check1": "Sem cadastro para usar ferramentas", "hero.check2": "Plano gratuito disponível", "hero.check3": "Premium a partir de $19/mês",
    "section.newTools": "Recém adicionado", "section.categories": "Explorar por fluxo de trabalho",
    "section.featured": "Kit Completo para Criadores", "section.featuredSub": "Um tema → títulos, hashtags, miniaturas, legendas e palavras-chave.",
    "section.popularTools": "Ferramentas populares", "section.allTools": "Todas as ferramentas",
    "section.blog": "Guias e tutoriais", "section.pricing": "Preços simples",
    "section.pricingSub": "Comece grátis. Atualize quando precisar.",
    "btn.viewAll": "Ver tudo", "btn.allTools": "Todas as ferramentas", "btn.openTool": "Abrir",
    "btn.generate": "Gerar", "btn.generating": "Gerando…",
    "btn.generateLogo": "Gerar Conceitos de Logo", "btn.generatingLogo": "Gerando 2 conceitos…",
    "btn.generateImage": "Gerar Imagem",
    "btn.download": "Baixar", "btn.copy": "Copiar", "btn.export": "Exportar",
    "btn.save": "Salvar", "btn.upgrade": "Atualizar", "btn.back": "Voltar",
    "btn.readMore": "Ler", "btn.explore": "Explorar",
    "btn.createAccount": "Criar conta grátis", "btn.openDashboard": "Abrir painel",
    "btn.getStarted": "Começar", "btn.startFree": "Começar grátis",
    "btn.upgradePro": "Atualizar para Pro", "btn.chooseBusiness": "Escolher Business",
    "btn.saveChanges": "Salvar alterações", "btn.sendMessage": "Enviar mensagem",
    "btn.sendReset": "Enviar link", "btn.googleLogin": "Continuar com Google",
    "btn.clearHistory": "Limpar", "btn.deletePlan": "Excluir",
    "btn.manageplan": "Gerenciar plano", "btn.viewFullComparison": "Ver comparação",
    "label.account": "Conta", "label.guest": "Visitante",
    "label.recentlyUsed": "Usadas recentemente", "label.recommended": "Recomendadas",
    "label.noRecent": "Nenhuma ferramenta usada ainda.", "label.noFavorites": "Sem favoritos ainda.",
    "label.noProjects": "Salvamentos premium aparecem aqui.",
    "label.noHistory": "Sem histórico. Experimente uma ferramenta.",
    "label.topTools": "Ferramentas mais usadas", "label.noData": "Sem dados ainda.",
    "label.relatedTools": "Ferramentas relacionadas", "label.readNext": "Ler depois",
    "label.popularTools": "Ferramentas populares", "label.faqs": "Perguntas frequentes",
    "label.tableOfContents": "Sumário", "label.relatedPosts": "Artigos relacionados",
    "label.subscription": "Assinatura", "label.currentPlan": "Plano atual",
    "label.status": "Status", "label.savedProjects": "Projetos salvos",
    "label.favorites": "Favoritos", "label.recentHistory": "Histórico recente",
    "label.totalUses": "Total de usos", "label.dailyLimit": "Limite diário",
    "label.plan": "Plano", "label.unlimited": "Ilimitado",
    "label.tools": "ferramentas", "label.new": "Novo", "label.pro": "Pro", "label.featured": "Destaque",
    "label.input": "Entrada", "label.output": "Saída",
    "label.topic": "Tema ou consulta", "label.uploadImage": "Enviar imagem", "label.optional": "(opcional)",
    "label.themeColor": "Cor do tema", "label.mode": "Modo",
    "label.light": "Claro", "label.dark": "Escuro", "label.language": "Idioma",
    "label.advertisement": "Publicidade", "label.blogCategory": "Blog", "label.readingTime": "leitura", "label.updated": "Atualizado",
    "label.upgradeNote": "Visitante/Grátis: Limites e marcas d'água se aplicam.",
    "label.upgradeLink": "Atualize para remover anúncios e desbloquear uso ilimitado.",
    "label.tagline": "Kit para Criadores",
    "label.footerDesc": "Kit completo para criadores, designers e SEO.",
    "label.footerProduct": "Produto", "label.footerCategories": "Categorias", "label.footerLegal": "Legal",
    "label.footerCopy": "Criado para criadores, SEO e renda passiva.",
    "label.menu": "Menu",
    "label.name": "Nome", "label.email": "E-mail", "label.password": "Senha", "label.message": "Mensagem",
    "label.industry": "Indústria", "label.stylePreference": "Preferência de estilo", "label.primaryPlatform": "Plataforma principal",
    "label.brandPrompt": "Descrição da marca / canal", "label.brandPromptHint": "(seja específico)",
    "label.promptCounter": "/400 — inclua nome, cores, estilo e ambiente",
    "label.aiLogoTitle": "Gerador de Logos com IA", "label.aiLogoSub": "Descreva sua marca → obtenha 2 conceitos de logo",
    "label.your2Concepts": "Seus 2 Conceitos de Logo", "label.chooseConcept": "Escolha o que melhor representa sua marca",
    "label.conceptSelected": "selecionado ✓", "label.downloadExport": "Baixar e Exportar",
    "label.downloadPng": "Baixar PNG", "label.downloadSvg": "Baixar SVG",
    "label.copyCss": "Copiar cores CSS", "label.saveProject": "Salvar nos projetos",
    "label.upgradeHd": "Atualizar para exportar em HD",
    "label.upgradeForFull": "Atualizar para Creator Pro",
    "label.upgradeForFullSub": "para PNG HD, SVG vetorial e todos os tamanhos de plataforma.",
    "label.generatingLogo": "A IA está gerando seus 2 conceitos de logo…",
    "label.analyzingPrompt": "Analisando sua descrição, indústria, estilo e plataforma",
    "label.describeImage": "Descreva sua imagem", "label.style": "Estilo", "label.aspectRatio": "Proporção",
    "label.generatedImage": "Imagem Gerada", "label.imagePromptHint": "Descreva sua imagem acima e clique em Gerar",
    "label.upgradeResolution": "Atualizar para resolução completa", "label.removeWatermark": "Remover marca d'água",
    "label.regenerate": "Regenerar", "label.settings": "Configurações e preferências",
    "label.settingsSub": "Gerencie seu perfil e preferências.",
    "label.toggleTheme": "Alternar tema", "label.logout": "Sair",
    "label.savedSuccessfully": "Salvo com sucesso.", "label.invalidForm": "Insira um nome e e-mail válidos.",
    "label.contactSent": "Obrigado! Sua mensagem está a caminho (modo demo).",
    "label.invalidContact": "Insira uma mensagem válida sem padrões de spam.",
    "label.sendUs": "Envie-nos uma mensagem",
    "label.resetSent": "Link de redefinição enviado (modo demo).",
    "label.invalidAuth": "Use um e-mail válido e senha com pelo menos 8 caracteres.",
    "label.dailyLimitReached": "Limite diário atingido. Atualize para uso ilimitado.",
    "label.addTopic": "Adicione um tema ou envie uma imagem.", "label.keepConcise": "Mantenha a entrada concisa e sem spam.",
    "label.upgradeNow": "Atualizar agora", "label.search": "Buscar ferramentas…",
    "label.notFound": "Página não encontrada", "label.notFoundSub": "Tente explorar ferramentas, categorias ou artigos.",
    "label.browseTools": "Explorar ferramentas",
    "label.welcomeBack": "Bem-vindo de volta", "label.createFreeAccount": "Criar conta grátis",
    "label.resetPassword": "Redefinir senha", "label.minPassword": "Mín. 8 caracteres",
    "label.forgotPassword": "Esqueceu a senha?", "label.authTagline": "Logoviking — Kit para Criadores",
    "label.tier": "plano", "label.concept": "Conceito",
    "label.upgradeCreatorPro": "Atualizar para Creator Pro",
    "label.upgradeCreatorProSub": "Uso ilimitado, sem anúncios, processamento em lote e projetos salvos.",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.tools": "الأدوات", "nav.categories": "الفئات",
    "nav.blog": "المدونة", "nav.pricing": "الأسعار", "nav.faq": "الأسئلة",
    "nav.dashboard": "لوحة التحكم", "nav.login": "تسجيل الدخول", "nav.signup": "إنشاء حساب",
    "nav.account": "الحساب", "nav.logout": "تسجيل الخروج", "nav.all": "الكل",
    "hero.badge": "أكثر من 60 أداة مجانية، بدون تسجيل",
    "hero.title1": "منصة واحدة.", "hero.title2": "كل أدوات المبدعين.",
    "hero.subtitle": "أنشئ شعارات وصور ذكاء اصطناعي وعناوين يوتيوب وبيانات SEO وهاشتاقات وتسميات توضيحية وأكثر من 60 أداة — كلها مجانية.",
    "hero.cta1": "جرّب مجموعة الإبداع", "hero.cta2": "مولّد الشعارات", "hero.cta3": "مولّد الصور",
    "hero.check1": "لا تسجيل لاستخدام الأدوات", "hero.check2": "خطة مجانية متاحة", "hero.check3": "المميز من 19$/شهر",
    "section.newTools": "أضيف حديثاً", "section.categories": "تصفح حسب سير العمل",
    "section.featured": "مجموعة المبدع الشاملة", "section.featuredSub": "موضوع واحد → عناوين وهاشتاقات وصور مصغرة وتسميات وكلمات مفتاحية.",
    "section.popularTools": "الأدوات الأكثر شيوعاً", "section.allTools": "جميع الأدوات",
    "section.blog": "أدلة ودروس تعليمية", "section.pricing": "أسعار بسيطة",
    "section.pricingSub": "ابدأ مجاناً. قم بالترقية عند الحاجة.",
    "btn.viewAll": "عرض الكل", "btn.allTools": "جميع الأدوات", "btn.openTool": "فتح",
    "btn.generate": "إنشاء", "btn.generating": "جارٍ الإنشاء…",
    "btn.generateLogo": "إنشاء مفاهيم الشعار", "btn.generatingLogo": "إنشاء مفهومين…",
    "btn.generateImage": "إنشاء صورة",
    "btn.download": "تنزيل", "btn.copy": "نسخ", "btn.export": "تصدير",
    "btn.save": "حفظ", "btn.upgrade": "ترقية", "btn.back": "رجوع",
    "btn.readMore": "قراءة", "btn.explore": "استكشاف",
    "btn.createAccount": "إنشاء حساب مجاني", "btn.openDashboard": "فتح لوحة التحكم",
    "btn.getStarted": "ابدأ الآن", "btn.startFree": "ابدأ مجاناً",
    "btn.upgradePro": "الترقية إلى Pro", "btn.chooseBusiness": "اختيار Business",
    "btn.saveChanges": "حفظ التغييرات", "btn.sendMessage": "إرسال الرسالة",
    "btn.sendReset": "إرسال الرابط", "btn.googleLogin": "المتابعة مع Google",
    "btn.clearHistory": "مسح", "btn.deletePlan": "حذف",
    "btn.manageplan": "إدارة الخطة", "btn.viewFullComparison": "عرض المقارنة",
    "label.account": "الحساب", "label.guest": "زائر",
    "label.recentlyUsed": "المستخدمة مؤخراً", "label.recommended": "موصى بها",
    "label.noRecent": "لم تستخدم أي أداة بعد.", "label.noFavorites": "لا توجد مفضلات بعد.",
    "label.noProjects": "المشاريع المميزة تظهر هنا.",
    "label.noHistory": "لا يوجد سجل. جرّب أداة للبدء.",
    "label.topTools": "الأدوات الأكثر استخداماً", "label.noData": "لا توجد بيانات بعد.",
    "label.relatedTools": "أدوات ذات صلة", "label.readNext": "اقرأ لاحقاً",
    "label.popularTools": "الأدوات الشائعة", "label.faqs": "الأسئلة الشائعة",
    "label.tableOfContents": "جدول المحتويات", "label.relatedPosts": "مقالات ذات صلة",
    "label.subscription": "الاشتراك", "label.currentPlan": "الخطة الحالية",
    "label.status": "الحالة", "label.savedProjects": "المشاريع المحفوظة",
    "label.favorites": "المفضلة", "label.recentHistory": "السجل الأخير",
    "label.totalUses": "إجمالي الاستخدامات", "label.dailyLimit": "الحد اليومي",
    "label.plan": "الخطة", "label.unlimited": "غير محدود",
    "label.tools": "أدوات", "label.new": "جديد", "label.pro": "Pro", "label.featured": "مميز",
    "label.input": "المدخلات", "label.output": "المخرجات",
    "label.topic": "الموضوع أو الاستعلام", "label.uploadImage": "رفع صورة", "label.optional": "(اختياري)",
    "label.themeColor": "لون الثيم", "label.mode": "الوضع",
    "label.light": "فاتح", "label.dark": "داكن", "label.language": "اللغة",
    "label.advertisement": "إعلان", "label.blogCategory": "مدونة", "label.readingTime": "قراءة", "label.updated": "تحديث",
    "label.upgradeNote": "الزائر/المجاني: تُطبق القيود والعلامات المائية.",
    "label.upgradeLink": "قم بالترقية لإزالة الإعلانات وفتح الاستخدام غير المحدود.",
    "label.tagline": "مجموعة أدوات المبدع",
    "label.footerDesc": "مجموعة شاملة للمبدعين والمصممين وتحسين محركات البحث.",
    "label.footerProduct": "المنتج", "label.footerCategories": "الفئات", "label.footerLegal": "قانوني",
    "label.footerCopy": "مبني للمبدعين والـSEO والدخل السلبي.",
    "label.menu": "القائمة",
    "label.name": "الاسم", "label.email": "البريد الإلكتروني", "label.password": "كلمة المرور", "label.message": "الرسالة",
    "label.industry": "الصناعة", "label.stylePreference": "تفضيل الأسلوب", "label.primaryPlatform": "المنصة الأساسية",
    "label.brandPrompt": "وصف العلامة التجارية / القناة", "label.brandPromptHint": "(كن محدداً)",
    "label.promptCounter": "/400 — أدرج الاسم والألوان والأسلوب والأجواء",
    "label.aiLogoTitle": "مولّد الشعارات بالذكاء الاصطناعي", "label.aiLogoSub": "صف علامتك التجارية ← احصل على مفهومين للشعار",
    "label.your2Concepts": "مفهوماك للشعار", "label.chooseConcept": "اختر الأنسب لعلامتك",
    "label.conceptSelected": "محدد ✓", "label.downloadExport": "تنزيل وتصدير",
    "label.downloadPng": "تنزيل PNG", "label.downloadSvg": "تنزيل SVG",
    "label.copyCss": "نسخ ألوان CSS", "label.saveProject": "حفظ في المشاريع",
    "label.upgradeHd": "ترقية للتصدير بجودة عالية",
    "label.upgradeForFull": "الترقية إلى Creator Pro",
    "label.upgradeForFullSub": "للحصول على PNG عالي الجودة وSVG لجميع أحجام المنصات.",
    "label.generatingLogo": "الذكاء الاصطناعي يُنشئ مفهوميك للشعار…",
    "label.analyzingPrompt": "تحليل وصفك والصناعة والأسلوب والمنصة",
    "label.describeImage": "صف صورتك", "label.style": "الأسلوب", "label.aspectRatio": "نسبة العرض إلى الارتفاع",
    "label.generatedImage": "الصورة المُنشأة", "label.imagePromptHint": "صف صورتك أعلاه واضغط على إنشاء",
    "label.upgradeResolution": "ترقية للدقة الكاملة", "label.removeWatermark": "إزالة العلامة المائية",
    "label.regenerate": "إعادة الإنشاء", "label.settings": "الإعدادات والتفضيلات",
    "label.settingsSub": "إدارة ملفك الشخصي وتفضيلاتك.",
    "label.toggleTheme": "تبديل الثيم", "label.logout": "تسجيل الخروج",
    "label.savedSuccessfully": "تم الحفظ بنجاح.", "label.invalidForm": "أدخل اسماً وبريداً إلكترونياً صحيحين.",
    "label.contactSent": "شكراً! رسالتك في طريقها (وضع العرض).",
    "label.invalidContact": "أدخل رسالة صحيحة بدون أنماط بريد مزعج.",
    "label.sendUs": "أرسل لنا رسالة",
    "label.resetSent": "تم إرسال رابط إعادة التعيين (وضع العرض).",
    "label.invalidAuth": "استخدم بريداً صحيحاً وكلمة مرور لا تقل عن 8 أحرف.",
    "label.dailyLimitReached": "تم الوصول للحد اليومي. قم بالترقية للاستخدام غير المحدود.",
    "label.addTopic": "أضف موضوعاً أو ارفع صورة.", "label.keepConcise": "اجعل المدخل موجزاً وبدون بريد مزعج.",
    "label.upgradeNow": "ترقية الآن", "label.search": "البحث في الأدوات…",
    "label.notFound": "الصفحة غير موجودة", "label.notFoundSub": "حاول استعراض الأدوات أو الفئات أو المقالات.",
    "label.browseTools": "استعراض الأدوات",
    "label.welcomeBack": "مرحباً بعودتك", "label.createFreeAccount": "إنشاء حساب مجاني",
    "label.resetPassword": "إعادة تعيين كلمة المرور", "label.minPassword": "8 أحرف على الأقل",
    "label.forgotPassword": "نسيت كلمة المرور؟", "label.authTagline": "Logoviking — مجموعة أدوات المبدع",
    "label.tier": "خطة", "label.concept": "مفهوم",
    "label.upgradeCreatorPro": "الترقية إلى Creator Pro",
    "label.upgradeCreatorProSub": "استخدام غير محدود وبدون إعلانات ومعالجة جماعية ومشاريع محفوظة.",
  },
  ru: {
    "nav.home": "Главная", "nav.tools": "Инструменты", "nav.categories": "Категории",
    "nav.blog": "Блог", "nav.pricing": "Цены", "nav.faq": "Вопросы",
    "nav.dashboard": "Панель", "nav.login": "Войти", "nav.signup": "Регистрация",
    "nav.account": "Аккаунт", "nav.logout": "Выйти", "nav.all": "Все",
    "hero.badge": "60+ бесплатных инструментов, без регистрации",
    "hero.title1": "Одна платформа.", "hero.title2": "Все инструменты.",
    "hero.subtitle": "Создавайте логотипы, изображения AI, заголовки YouTube, SEO-метаданные, хэштеги, подписи и 60+ инструментов — всё бесплатно.",
    "hero.cta1": "Попробовать набор", "hero.cta2": "Генератор логотипов", "hero.cta3": "AI-изображения",
    "hero.check1": "Без регистрации", "hero.check2": "Бесплатный план", "hero.check3": "Премиум от $19/мес",
    "section.newTools": "Только добавлено", "section.categories": "Просмотр по рабочему процессу",
    "section.featured": "Полный набор для создателей", "section.featuredSub": "Одна тема → заголовки, хэштеги, миниатюры, подписи и ключевые слова.",
    "section.popularTools": "Популярные инструменты", "section.allTools": "Все инструменты",
    "section.blog": "Руководства и уроки", "section.pricing": "Простые цены",
    "section.pricingSub": "Начните бесплатно. Обновляйтесь по мере необходимости.",
    "btn.viewAll": "Смотреть все", "btn.allTools": "Все инструменты", "btn.openTool": "Открыть",
    "btn.generate": "Создать", "btn.generating": "Создание…",
    "btn.generateLogo": "Создать концепции логотипа", "btn.generatingLogo": "Создание 2 концепций…",
    "btn.generateImage": "Создать изображение",
    "btn.download": "Скачать", "btn.copy": "Копировать", "btn.export": "Экспорт",
    "btn.save": "Сохранить", "btn.upgrade": "Обновить", "btn.back": "Назад",
    "btn.readMore": "Читать", "btn.explore": "Изучить",
    "btn.createAccount": "Создать бесплатный аккаунт", "btn.openDashboard": "Открыть панель",
    "btn.getStarted": "Начать", "btn.startFree": "Начать бесплатно",
    "btn.upgradePro": "Обновить до Pro", "btn.chooseBusiness": "Выбрать Business",
    "btn.saveChanges": "Сохранить", "btn.sendMessage": "Отправить сообщение",
    "btn.sendReset": "Отправить ссылку", "btn.googleLogin": "Продолжить с Google",
    "btn.clearHistory": "Очистить", "btn.deletePlan": "Удалить",
    "btn.manageplan": "Управление планом", "btn.viewFullComparison": "Сравнение",
    "label.account": "Аккаунт", "label.guest": "Гость",
    "label.recentlyUsed": "Недавно использованные", "label.recommended": "Рекомендуемые",
    "label.noRecent": "Инструменты ещё не использовались.", "label.noFavorites": "Нет избранного.",
    "label.noProjects": "Премиум-сохранения появятся здесь.",
    "label.noHistory": "Нет истории. Попробуйте инструмент.",
    "label.topTools": "Самые используемые", "label.noData": "Нет данных.",
    "label.relatedTools": "Похожие инструменты", "label.readNext": "Читать далее",
    "label.popularTools": "Популярные инструменты", "label.faqs": "Вопросы и ответы",
    "label.tableOfContents": "Содержание", "label.relatedPosts": "Похожие статьи",
    "label.subscription": "Подписка", "label.currentPlan": "Текущий план",
    "label.status": "Статус", "label.savedProjects": "Сохранённые проекты",
    "label.favorites": "Избранное", "label.recentHistory": "Недавняя история",
    "label.totalUses": "Всего использований", "label.dailyLimit": "Дневной лимит",
    "label.plan": "План", "label.unlimited": "Безлимитно",
    "label.tools": "инструментов", "label.new": "Новый", "label.pro": "Pro", "label.featured": "Избранное",
    "label.input": "Ввод", "label.output": "Вывод",
    "label.topic": "Тема или запрос", "label.uploadImage": "Загрузить изображение", "label.optional": "(необязательно)",
    "label.themeColor": "Цвет темы", "label.mode": "Режим",
    "label.light": "Светлый", "label.dark": "Тёмный", "label.language": "Язык",
    "label.advertisement": "Реклама", "label.blogCategory": "Блог", "label.readingTime": "чтение", "label.updated": "Обновлено",
    "label.upgradeNote": "Гость/Бесплатно: применяются ограничения и водяные знаки.",
    "label.upgradeLink": "Обновитесь для отключения рекламы и безлимитного использования.",
    "label.tagline": "Инструменты для создателей",
    "label.footerDesc": "Универсальный набор для создателей, дизайнеров и SEO.",
    "label.footerProduct": "Продукт", "label.footerCategories": "Категории", "label.footerLegal": "Право",
    "label.footerCopy": "Создано для создателей, SEO и пассивного дохода.",
    "label.menu": "Меню",
    "label.name": "Имя", "label.email": "Email", "label.password": "Пароль", "label.message": "Сообщение",
    "label.industry": "Отрасль", "label.stylePreference": "Предпочтение стиля", "label.primaryPlatform": "Основная платформа",
    "label.brandPrompt": "Описание бренда / канала", "label.brandPromptHint": "(будьте конкретны)",
    "label.promptCounter": "/400 — укажите название, цвета, стиль и атмосферу",
    "label.aiLogoTitle": "AI-генератор логотипов", "label.aiLogoSub": "Опишите бренд → получите 2 концепции логотипа",
    "label.your2Concepts": "2 концепции вашего логотипа", "label.chooseConcept": "Выберите подходящую для вашего бренда",
    "label.conceptSelected": "выбрано ✓", "label.downloadExport": "Скачать и экспортировать",
    "label.downloadPng": "Скачать PNG", "label.downloadSvg": "Скачать SVG",
    "label.copyCss": "Скопировать цвета CSS", "label.saveProject": "Сохранить в проекты",
    "label.upgradeHd": "Обновить для HD-экспорта",
    "label.upgradeForFull": "Обновить до Creator Pro",
    "label.upgradeForFullSub": "для HD PNG, векторного SVG и всех размеров платформ.",
    "label.generatingLogo": "AI создаёт 2 концепции вашего логотипа…",
    "label.analyzingPrompt": "Анализируется описание, отрасль, стиль и платформа",
    "label.describeImage": "Опишите изображение", "label.style": "Стиль", "label.aspectRatio": "Соотношение сторон",
    "label.generatedImage": "Созданное изображение", "label.imagePromptHint": "Опишите изображение выше и нажмите «Создать»",
    "label.upgradeResolution": "Обновить для полного разрешения", "label.removeWatermark": "Убрать водяной знак",
    "label.regenerate": "Пересоздать", "label.settings": "Настройки и предпочтения",
    "label.settingsSub": "Управляйте профилем и предпочтениями.",
    "label.toggleTheme": "Переключить тему", "label.logout": "Выйти",
    "label.savedSuccessfully": "Успешно сохранено.", "label.invalidForm": "Введите действительное имя и email.",
    "label.contactSent": "Спасибо! Ваше сообщение отправлено (демо-режим).",
    "label.invalidContact": "Введите корректное сообщение без спама.",
    "label.sendUs": "Напишите нам",
    "label.resetSent": "Ссылка для сброса отправлена (демо-режим).",
    "label.invalidAuth": "Используйте действительный email и пароль не менее 8 символов.",
    "label.dailyLimitReached": "Дневной лимит достигнут. Обновитесь для безлимитного использования.",
    "label.addTopic": "Добавьте тему или загрузите изображение.", "label.keepConcise": "Сделайте ввод кратким и без спама.",
    "label.upgradeNow": "Обновить сейчас", "label.search": "Поиск инструментов…",
    "label.notFound": "Страница не найдена", "label.notFoundSub": "Попробуйте просмотреть инструменты, категории или статьи.",
    "label.browseTools": "Просмотреть инструменты",
    "label.welcomeBack": "Добро пожаловать", "label.createFreeAccount": "Создать бесплатный аккаунт",
    "label.resetPassword": "Сбросить пароль", "label.minPassword": "Мин. 8 символов",
    "label.forgotPassword": "Забыли пароль?", "label.authTagline": "Logoviking — инструменты для создателей",
    "label.tier": "план", "label.concept": "Концепция",
    "label.upgradeCreatorPro": "Обновить до Creator Pro",
    "label.upgradeCreatorProSub": "Безлимитное использование, без рекламы, пакетная обработка и сохранённые проекты.",
  },
  fr: {
    "nav.home": "Accueil", "nav.tools": "Outils", "nav.categories": "Catégories",
    "nav.blog": "Blog", "nav.pricing": "Tarifs", "nav.faq": "FAQ",
    "nav.dashboard": "Tableau de bord", "nav.login": "Connexion", "nav.signup": "S'inscrire",
    "nav.account": "Compte", "nav.logout": "Déconnexion", "nav.all": "Tout",
    "hero.badge": "Plus de 60 outils gratuits, sans inscription",
    "hero.title1": "Une plateforme.", "hero.title2": "Tous les outils.",
    "hero.subtitle": "Générez des logos, images IA, titres YouTube, métadonnées SEO, hashtags, légendes et plus de 60 outils — tous gratuits.",
    "hero.cta1": "Essayer le Kit", "hero.cta2": "Générateur de Logos", "hero.cta3": "IA Images",
    "hero.check1": "Sans inscription", "hero.check2": "Plan gratuit disponible", "hero.check3": "Premium dès 19$/mois",
    "section.newTools": "Tout juste ajouté", "section.categories": "Parcourir par flux de travail",
    "section.featured": "Kit Créateur Tout-en-Un", "section.featuredSub": "Un sujet → titres, hashtags, miniatures, légendes et mots-clés.",
    "section.popularTools": "Outils populaires", "section.allTools": "Tous les outils",
    "section.blog": "Guides et tutoriels", "section.pricing": "Tarifs simples",
    "section.pricingSub": "Commencez gratuitement. Passez à la version supérieure quand vous êtes prêt.",
    "btn.viewAll": "Voir tout", "btn.allTools": "Tous les outils", "btn.openTool": "Ouvrir",
    "btn.generate": "Générer", "btn.generating": "Génération…",
    "btn.generateLogo": "Générer des concepts de logo", "btn.generatingLogo": "Génération de 2 concepts…",
    "btn.generateImage": "Générer une image",
    "btn.download": "Télécharger", "btn.copy": "Copier", "btn.export": "Exporter",
    "btn.save": "Enregistrer", "btn.upgrade": "Mettre à niveau", "btn.back": "Retour",
    "btn.readMore": "Lire", "btn.explore": "Explorer",
    "btn.createAccount": "Créer un compte gratuit", "btn.openDashboard": "Ouvrir le tableau de bord",
    "btn.getStarted": "Commencer", "btn.startFree": "Commencer gratuitement",
    "btn.upgradePro": "Passer à Pro", "btn.chooseBusiness": "Choisir Business",
    "btn.saveChanges": "Enregistrer", "btn.sendMessage": "Envoyer le message",
    "btn.sendReset": "Envoyer le lien", "btn.googleLogin": "Continuer avec Google",
    "btn.clearHistory": "Effacer", "btn.deletePlan": "Supprimer",
    "btn.manageplan": "Gérer le plan", "btn.viewFullComparison": "Voir la comparaison",
    "label.account": "Compte", "label.guest": "Visiteur",
    "label.recentlyUsed": "Récemment utilisés", "label.recommended": "Recommandés",
    "label.noRecent": "Aucun outil utilisé pour l'instant.", "label.noFavorites": "Pas encore de favoris.",
    "label.noProjects": "Les sauvegardes premium apparaîtront ici.",
    "label.noHistory": "Pas d'historique. Essayez un outil.",
    "label.topTools": "Outils les plus utilisés", "label.noData": "Pas encore de données.",
    "label.relatedTools": "Outils connexes", "label.readNext": "À lire ensuite",
    "label.popularTools": "Outils populaires", "label.faqs": "FAQ",
    "label.tableOfContents": "Table des matières", "label.relatedPosts": "Articles connexes",
    "label.subscription": "Abonnement", "label.currentPlan": "Plan actuel",
    "label.status": "Statut", "label.savedProjects": "Projets enregistrés",
    "label.favorites": "Favoris", "label.recentHistory": "Historique récent",
    "label.totalUses": "Total d'utilisations", "label.dailyLimit": "Limite quotidienne",
    "label.plan": "Plan", "label.unlimited": "Illimité",
    "label.tools": "outils", "label.new": "Nouveau", "label.pro": "Pro", "label.featured": "En vedette",
    "label.input": "Entrée", "label.output": "Sortie",
    "label.topic": "Sujet ou requête", "label.uploadImage": "Télécharger une image", "label.optional": "(optionnel)",
    "label.themeColor": "Couleur du thème", "label.mode": "Mode",
    "label.light": "Clair", "label.dark": "Sombre", "label.language": "Langue",
    "label.advertisement": "Publicité", "label.blogCategory": "Blog", "label.readingTime": "lecture", "label.updated": "Mis à jour",
    "label.upgradeNote": "Invité/Gratuit : des limites et filigranes s'appliquent.",
    "label.upgradeLink": "Mettez à niveau pour supprimer les annonces et débloquer l'utilisation illimitée.",
    "label.tagline": "Boîte à outils Créateur",
    "label.footerDesc": "Boîte à outils tout-en-un pour créateurs, designers et SEO.",
    "label.footerProduct": "Produit", "label.footerCategories": "Catégories", "label.footerLegal": "Légal",
    "label.footerCopy": "Conçu pour les créateurs, le SEO et les revenus passifs.",
    "label.menu": "Menu",
    "label.name": "Nom", "label.email": "E-mail", "label.password": "Mot de passe", "label.message": "Message",
    "label.industry": "Industrie", "label.stylePreference": "Préférence de style", "label.primaryPlatform": "Plateforme principale",
    "label.brandPrompt": "Description de la marque / chaîne", "label.brandPromptHint": "(soyez précis)",
    "label.promptCounter": "/400 — incluez le nom, les couleurs, le style et l'ambiance",
    "label.aiLogoTitle": "Générateur de logos IA", "label.aiLogoSub": "Décrivez votre marque → obtenez 2 concepts de logo",
    "label.your2Concepts": "Vos 2 concepts de logo", "label.chooseConcept": "Choisissez celui qui correspond le mieux",
    "label.conceptSelected": "sélectionné ✓", "label.downloadExport": "Télécharger et exporter",
    "label.downloadPng": "Télécharger PNG", "label.downloadSvg": "Télécharger SVG",
    "label.copyCss": "Copier les couleurs CSS", "label.saveProject": "Enregistrer dans les projets",
    "label.upgradeHd": "Mettre à niveau pour l'export HD",
    "label.upgradeForFull": "Passer à Creator Pro",
    "label.upgradeForFullSub": "pour PNG HD, SVG vectoriel et toutes les tailles de plateformes.",
    "label.generatingLogo": "L'IA génère vos 2 concepts de logo…",
    "label.analyzingPrompt": "Analyse de votre description, industrie, style et plateforme",
    "label.describeImage": "Décrivez votre image", "label.style": "Style", "label.aspectRatio": "Rapport d'aspect",
    "label.generatedImage": "Image générée", "label.imagePromptHint": "Décrivez votre image ci-dessus et cliquez sur Générer",
    "label.upgradeResolution": "Mettre à niveau pour la résolution complète", "label.removeWatermark": "Supprimer le filigrane",
    "label.regenerate": "Régénérer", "label.settings": "Paramètres et préférences",
    "label.settingsSub": "Gérez votre profil et vos préférences.",
    "label.toggleTheme": "Changer de thème", "label.logout": "Déconnexion",
    "label.savedSuccessfully": "Enregistré avec succès.", "label.invalidForm": "Entrez un nom et un e-mail valides.",
    "label.contactSent": "Merci ! Votre message est en route (mode démo).",
    "label.invalidContact": "Entrez un message valide sans spam.",
    "label.sendUs": "Envoyez-nous un message",
    "label.resetSent": "Lien de réinitialisation envoyé (mode démo).",
    "label.invalidAuth": "Utilisez un e-mail valide et un mot de passe d'au moins 8 caractères.",
    "label.dailyLimitReached": "Limite quotidienne atteinte. Mettez à niveau pour un usage illimité.",
    "label.addTopic": "Ajoutez un sujet ou téléchargez une image.", "label.keepConcise": "Gardez la saisie concise et sans spam.",
    "label.upgradeNow": "Mettre à niveau maintenant", "label.search": "Rechercher des outils…",
    "label.notFound": "Page introuvable", "label.notFoundSub": "Essayez de parcourir les outils, catégories ou articles.",
    "label.browseTools": "Parcourir les outils",
    "label.welcomeBack": "Bon retour", "label.createFreeAccount": "Créer un compte gratuit",
    "label.resetPassword": "Réinitialiser le mot de passe", "label.minPassword": "Min. 8 caractères",
    "label.forgotPassword": "Mot de passe oublié ?", "label.authTagline": "Logoviking — Boîte à outils Créateur",
    "label.tier": "plan", "label.concept": "Concept",
    "label.upgradeCreatorPro": "Passer à Creator Pro",
    "label.upgradeCreatorProSub": "Utilisation illimitée, sans publicités, traitement par lots et projets sauvegardés.",
  },
  de: {
    "nav.home": "Startseite", "nav.tools": "Tools", "nav.categories": "Kategorien",
    "nav.blog": "Blog", "nav.pricing": "Preise", "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard", "nav.login": "Anmelden", "nav.signup": "Registrieren",
    "nav.account": "Konto", "nav.logout": "Abmelden", "nav.all": "Alle",
    "hero.badge": "60+ kostenlose Creator-Tools, keine Anmeldung erforderlich",
    "hero.title1": "Eine Plattform.", "hero.title2": "Jedes Creator-Tool.",
    "hero.subtitle": "Erstelle Logos, KI-Bilder, YouTube-Titel, SEO-Metadaten, Hashtags, Beschriftungen und 60+ weitere Tools — alles kostenlos.",
    "hero.cta1": "Creator-Kit ausprobieren", "hero.cta2": "Logo-Generator", "hero.cta3": "KI-Bilder",
    "hero.check1": "Keine Anmeldung erforderlich", "hero.check2": "Kostenloser Plan verfügbar", "hero.check3": "Premium ab $19/Monat",
    "section.newTools": "Neu hinzugefügt", "section.categories": "Nach Arbeitsablauf durchsuchen",
    "section.featured": "All-in-One Creator-Kit", "section.featuredSub": "Ein Thema → Titel, Hashtags, Thumbnails, Beschriftungen und Keywords.",
    "section.popularTools": "Beliebte Tools", "section.allTools": "Alle Tools",
    "section.blog": "Guides und Tutorials", "section.pricing": "Einfache Preise",
    "section.pricingSub": "Kostenlos starten. Upgrade wenn nötig.",
    "btn.viewAll": "Alle anzeigen", "btn.allTools": "Alle Tools", "btn.openTool": "Öffnen",
    "btn.generate": "Generieren", "btn.generating": "Generierung…",
    "btn.generateLogo": "Logo-Konzepte generieren", "btn.generatingLogo": "2 Konzepte werden generiert…",
    "btn.generateImage": "Bild generieren",
    "btn.download": "Herunterladen", "btn.copy": "Kopieren", "btn.export": "Exportieren",
    "btn.save": "Speichern", "btn.upgrade": "Upgrade", "btn.back": "Zurück",
    "btn.readMore": "Lesen", "btn.explore": "Erkunden",
    "btn.createAccount": "Kostenloses Konto erstellen", "btn.openDashboard": "Dashboard öffnen",
    "btn.getStarted": "Loslegen", "btn.startFree": "Kostenlos starten",
    "btn.upgradePro": "Auf Pro upgraden", "btn.chooseBusiness": "Business wählen",
    "btn.saveChanges": "Änderungen speichern", "btn.sendMessage": "Nachricht senden",
    "btn.sendReset": "Link senden", "btn.googleLogin": "Mit Google fortfahren",
    "btn.clearHistory": "Löschen", "btn.deletePlan": "Entfernen",
    "btn.manageplan": "Plan verwalten", "btn.viewFullComparison": "Vergleich ansehen",
    "label.account": "Konto", "label.guest": "Gastbesucher",
    "label.recentlyUsed": "Zuletzt verwendet", "label.recommended": "Empfohlen",
    "label.noRecent": "Noch keine Tools verwendet.", "label.noFavorites": "Noch keine Favoriten.",
    "label.noProjects": "Premium-Speicherstände erscheinen hier.",
    "label.noHistory": "Kein Verlauf. Probiere ein Tool aus.",
    "label.topTools": "Am häufigsten verwendete Tools", "label.noData": "Noch keine Daten.",
    "label.relatedTools": "Ähnliche Tools", "label.readNext": "Als Nächstes lesen",
    "label.popularTools": "Beliebte Tools", "label.faqs": "Häufige Fragen",
    "label.tableOfContents": "Inhaltsverzeichnis", "label.relatedPosts": "Ähnliche Beiträge",
    "label.subscription": "Abonnement", "label.currentPlan": "Aktueller Plan",
    "label.status": "Status", "label.savedProjects": "Gespeicherte Projekte",
    "label.favorites": "Favoriten", "label.recentHistory": "Letzter Verlauf",
    "label.totalUses": "Gesamtnutzungen", "label.dailyLimit": "Tageslimit",
    "label.plan": "Plan", "label.unlimited": "Unbegrenzt",
    "label.tools": "Tools", "label.new": "Neu", "label.pro": "Pro", "label.featured": "Empfohlen",
    "label.input": "Eingabe", "label.output": "Ausgabe",
    "label.topic": "Thema oder Suchanfrage", "label.uploadImage": "Bild hochladen", "label.optional": "(optional)",
    "label.themeColor": "Themenfarbe", "label.mode": "Modus",
    "label.light": "Hell", "label.dark": "Dunkel", "label.language": "Sprache",
    "label.advertisement": "Werbung", "label.blogCategory": "Blog", "label.readingTime": "Lesezeit", "label.updated": "Aktualisiert",
    "label.upgradeNote": "Gast/Kostenlos: Limits und Wasserzeichen werden angewendet.",
    "label.upgradeLink": "Upgrade für keine Werbung und unbegrenzte Nutzung.",
    "label.tagline": "Creator-Toolkit",
    "label.footerDesc": "All-in-One-Toolkit für Creator, Designer und SEO.",
    "label.footerProduct": "Produkt", "label.footerCategories": "Kategorien", "label.footerLegal": "Rechtliches",
    "label.footerCopy": "Für Creator, SEO und passives Einkommen entwickelt.",
    "label.menu": "Menü",
    "label.name": "Name", "label.email": "E-Mail", "label.password": "Passwort", "label.message": "Nachricht",
    "label.industry": "Branche", "label.stylePreference": "Stilpräferenz", "label.primaryPlatform": "Hauptplattform",
    "label.brandPrompt": "Marken-/Kanalbeschreibung", "label.brandPromptHint": "(sei spezifisch)",
    "label.promptCounter": "/400 — Name, Farben, Stil und Stimmung angeben",
    "label.aiLogoTitle": "KI-Logo-Generator", "label.aiLogoSub": "Beschreibe deine Marke → erhalte 2 Logo-Konzepte",
    "label.your2Concepts": "Deine 2 Logo-Konzepte", "label.chooseConcept": "Wähle das passende Konzept",
    "label.conceptSelected": "ausgewählt ✓", "label.downloadExport": "Herunterladen & Exportieren",
    "label.downloadPng": "PNG herunterladen", "label.downloadSvg": "SVG herunterladen",
    "label.copyCss": "CSS-Farben kopieren", "label.saveProject": "In Projekten speichern",
    "label.upgradeHd": "Upgrade für HD-Export",
    "label.upgradeForFull": "Auf Creator Pro upgraden",
    "label.upgradeForFullSub": "für HD-PNG, Vektor-SVG und alle Plattformgrößen.",
    "label.generatingLogo": "KI generiert deine 2 Logo-Konzepte…",
    "label.analyzingPrompt": "Beschreibung, Branche, Stil und Plattform werden analysiert",
    "label.describeImage": "Beschreibe dein Bild", "label.style": "Stil", "label.aspectRatio": "Seitenverhältnis",
    "label.generatedImage": "Generiertes Bild", "label.imagePromptHint": "Beschreibe dein Bild oben und klicke auf Generieren",
    "label.upgradeResolution": "Upgrade für volle Auflösung", "label.removeWatermark": "Wasserzeichen entfernen",
    "label.regenerate": "Neu generieren", "label.settings": "Einstellungen und Präferenzen",
    "label.settingsSub": "Verwalte dein Profil und deine Präferenzen.",
    "label.toggleTheme": "Theme wechseln", "label.logout": "Abmelden",
    "label.savedSuccessfully": "Erfolgreich gespeichert.", "label.invalidForm": "Gib einen gültigen Namen und eine E-Mail-Adresse ein.",
    "label.contactSent": "Danke! Deine Nachricht ist unterwegs (Demo-Modus).",
    "label.invalidContact": "Gib eine gültige Nachricht ohne Spam-Muster ein.",
    "label.sendUs": "Schreib uns",
    "label.resetSent": "Zurücksetz-Link gesendet (Demo-Modus).",
    "label.invalidAuth": "Verwende eine gültige E-Mail und ein Passwort mit mindestens 8 Zeichen.",
    "label.dailyLimitReached": "Tageslimit erreicht. Upgrade für unbegrenzte Nutzung.",
    "label.addTopic": "Füge ein Thema hinzu oder lade ein Bild hoch.", "label.keepConcise": "Halte die Eingabe prägnant und spam-frei.",
    "label.upgradeNow": "Jetzt upgraden", "label.search": "Tools suchen…",
    "label.notFound": "Seite nicht gefunden", "label.notFoundSub": "Versuche Tools, Kategorien oder Blogbeiträge zu durchsuchen.",
    "label.browseTools": "Tools durchsuchen",
    "label.welcomeBack": "Willkommen zurück", "label.createFreeAccount": "Kostenloses Konto erstellen",
    "label.resetPassword": "Passwort zurücksetzen", "label.minPassword": "Mind. 8 Zeichen",
    "label.forgotPassword": "Passwort vergessen?", "label.authTagline": "Logoviking — Creator-Toolkit",
    "label.tier": "Plan", "label.concept": "Konzept",
    "label.upgradeCreatorPro": "Auf Creator Pro upgraden",
    "label.upgradeCreatorProSub": "Unbegrenzte Nutzung, keine Werbung, Stapelverarbeitung und gespeicherte Projekte.",
  },
  it: {
    "nav.home": "Home", "nav.tools": "Strumenti", "nav.categories": "Categorie",
    "nav.blog": "Blog", "nav.pricing": "Prezzi", "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard", "nav.login": "Accedi", "nav.signup": "Registrati",
    "nav.account": "Account", "nav.logout": "Esci", "nav.all": "Tutti",
    "hero.badge": "60+ strumenti gratuiti per creator, senza registrazione",
    "hero.title1": "Una piattaforma.", "hero.title2": "Tutti gli strumenti per creator.",
    "hero.subtitle": "Genera loghi, immagini AI, titoli YouTube, metadati SEO, hashtag, didascalie e 60+ strumenti — tutto gratis.",
    "hero.cta1": "Prova il Creator Kit", "hero.cta2": "Generatore di Logo", "hero.cta3": "AI Image Gen",
    "hero.check1": "Nessuna registrazione richiesta", "hero.check2": "Piano gratuito disponibile", "hero.check3": "Premium da $19/mese",
    "section.newTools": "Appena aggiunti", "section.categories": "Sfoglia per flusso di lavoro",
    "section.featured": "Creator Kit Tutto in Uno", "section.featuredSub": "Un argomento → titoli, hashtag, miniature, didascalie e parole chiave.",
    "section.popularTools": "Strumenti popolari", "section.allTools": "Tutti gli strumenti",
    "section.blog": "Guide e tutorial", "section.pricing": "Prezzi semplici",
    "section.pricingSub": "Inizia gratis. Aggiorna quando serve di più.",
    "btn.viewAll": "Vedi tutto", "btn.allTools": "Tutti gli strumenti", "btn.openTool": "Apri",
    "btn.generate": "Genera", "btn.generating": "Generazione…",
    "btn.generateLogo": "Genera concetti di logo", "btn.generatingLogo": "Generando 2 concetti…",
    "btn.generateImage": "Genera immagine",
    "btn.download": "Scarica", "btn.copy": "Copia", "btn.export": "Esporta",
    "btn.save": "Salva", "btn.upgrade": "Aggiorna", "btn.back": "Indietro",
    "btn.readMore": "Leggi", "btn.explore": "Esplora",
    "btn.createAccount": "Crea account gratuito", "btn.openDashboard": "Apri dashboard",
    "btn.getStarted": "Inizia", "btn.startFree": "Inizia gratis",
    "btn.upgradePro": "Passa a Pro", "btn.chooseBusiness": "Scegli Business",
    "btn.saveChanges": "Salva modifiche", "btn.sendMessage": "Invia messaggio",
    "btn.sendReset": "Invia link", "btn.googleLogin": "Continua con Google",
    "btn.clearHistory": "Cancella", "btn.deletePlan": "Elimina",
    "btn.manageplan": "Gestisci piano", "btn.viewFullComparison": "Vedi confronto",
    "label.account": "Account", "label.guest": "Visitatore",
    "label.recentlyUsed": "Usati di recente", "label.recommended": "Consigliati",
    "label.noRecent": "Nessuno strumento usato.", "label.noFavorites": "Nessun preferito.",
    "label.noProjects": "I salvataggi Premium appariranno qui.",
    "label.noHistory": "Nessuna cronologia. Prova uno strumento.",
    "label.topTools": "Strumenti più usati", "label.noData": "Nessun dato.",
    "label.relatedTools": "Strumenti correlati", "label.readNext": "Leggi dopo",
    "label.popularTools": "Strumenti popolari", "label.faqs": "Domande frequenti",
    "label.tableOfContents": "Indice", "label.relatedPosts": "Articoli correlati",
    "label.subscription": "Abbonamento", "label.currentPlan": "Piano attuale",
    "label.status": "Stato", "label.savedProjects": "Progetti salvati",
    "label.favorites": "Preferiti", "label.recentHistory": "Cronologia recente",
    "label.totalUses": "Utilizzi totali", "label.dailyLimit": "Limite giornaliero",
    "label.plan": "Piano", "label.unlimited": "Illimitato",
    "label.tools": "strumenti", "label.new": "Nuovo", "label.pro": "Pro", "label.featured": "In evidenza",
    "label.input": "Input", "label.output": "Output",
    "label.topic": "Argomento o query", "label.uploadImage": "Carica immagine", "label.optional": "(opzionale)",
    "label.themeColor": "Colore tema", "label.mode": "Modalità",
    "label.light": "Chiaro", "label.dark": "Scuro", "label.language": "Lingua",
    "label.advertisement": "Pubblicità", "label.blogCategory": "Blog", "label.readingTime": "lettura", "label.updated": "Aggiornato",
    "label.upgradeNote": "Ospite/Gratuito: limiti e filigrana applicati.",
    "label.upgradeLink": "Aggiorna per rimuovere pubblicità e sbloccare uso illimitato.",
    "label.tagline": "Toolkit per Creator",
    "label.footerDesc": "Toolkit completo per creator, designer e SEO.",
    "label.footerProduct": "Prodotto", "label.footerCategories": "Categorie", "label.footerLegal": "Legale",
    "label.footerCopy": "Creato per creator, SEO e reddito passivo.",
    "label.menu": "Menu",
    "label.name": "Nome", "label.email": "Email", "label.password": "Password", "label.message": "Messaggio",
    "label.industry": "Settore", "label.stylePreference": "Preferenza di stile", "label.primaryPlatform": "Piattaforma principale",
    "label.brandPrompt": "Descrizione marchio/canale", "label.brandPromptHint": "(sii specifico)",
    "label.promptCounter": "/400 — includi nome, colori, stile e atmosfera",
    "label.aiLogoTitle": "Generatore Logo AI", "label.aiLogoSub": "Descrivi il tuo brand → ricevi 2 concetti di logo",
    "label.your2Concepts": "I tuoi 2 concetti di logo", "label.chooseConcept": "Scegli quello che si adatta al brand",
    "label.conceptSelected": "selezionato ✓", "label.downloadExport": "Scarica & esporta",
    "label.downloadPng": "Scarica PNG", "label.downloadSvg": "Scarica SVG",
    "label.copyCss": "Copia colori CSS", "label.saveProject": "Salva in progetti",
    "label.upgradeHd": "Aggiorna per export HD",
    "label.upgradeForFull": "Passa a Creator Pro",
    "label.upgradeForFullSub": "per PNG HD, SVG vettoriale e tutte le dimensioni delle piattaforme.",
    "label.generatingLogo": "L'AI sta generando i tuoi 2 concetti…",
    "label.analyzingPrompt": "Analizzando descrizione, settore, stile e piattaforma",
    "label.describeImage": "Descrivi la tua immagine", "label.style": "Stile", "label.aspectRatio": "Proporzioni",
    "label.generatedImage": "Immagine generata", "label.imagePromptHint": "Descrivi l'immagine sopra e clicca Genera",
    "label.upgradeResolution": "Aggiorna per risoluzione piena", "label.removeWatermark": "Rimuovi filigrana",
    "label.regenerate": "Rigenera", "label.settings": "Impostazioni e preferenze",
    "label.settingsSub": "Gestisci profilo e preferenze.",
    "label.toggleTheme": "Cambia tema", "label.logout": "Esci",
    "label.savedSuccessfully": "Salvato con successo.", "label.invalidForm": "Inserisci nome ed email validi.",
    "label.contactSent": "Grazie! Messaggio inviato (modalità demo).",
    "label.invalidContact": "Inserisci un messaggio valido senza spam.",
    "label.sendUs": "Inviaci un messaggio",
    "label.resetSent": "Link di reset inviato (modalità demo).",
    "label.invalidAuth": "Usa email valida e password di almeno 8 caratteri.",
    "label.dailyLimitReached": "Limite giornaliero raggiunto. Aggiorna per uso illimitato.",
    "label.addTopic": "Aggiungi un argomento o carica un'immagine.", "label.keepConcise": "Mantieni l'input conciso e senza spam.",
    "label.upgradeNow": "Aggiorna ora", "label.search": "Cerca strumenti…",
    "label.notFound": "Pagina non trovata", "label.notFoundSub": "Prova a sfogliare strumenti, categorie o blog.",
    "label.browseTools": "Sfoglia strumenti",
    "label.welcomeBack": "Bentornato", "label.createFreeAccount": "Crea account gratuito",
    "label.resetPassword": "Reimposta password", "label.minPassword": "Min. 8 caratteri",
    "label.forgotPassword": "Password dimenticata?", "label.authTagline": "Logoviking — Toolkit Creator",
    "label.tier": "piano", "label.concept": "Concetto",
    "label.upgradeCreatorPro": "Passa a Creator Pro",
    "label.upgradeCreatorProSub": "Uso illimitato, niente pubblicità, batch e progetti salvati.",
  },
  nl: {
    "nav.home": "Home", "nav.tools": "Tools", "nav.categories": "Categorieën",
    "nav.blog": "Blog", "nav.pricing": "Prijzen", "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard", "nav.login": "Inloggen", "nav.signup": "Registreren",
    "nav.account": "Account", "nav.logout": "Uitloggen", "nav.all": "Alle",
    "hero.badge": "60+ gratis creator-tools, geen registratie nodig",
    "hero.title1": "Eén platform.", "hero.title2": "Alle creator-tools.",
    "hero.subtitle": "Genereer logo's, AI-afbeeldingen, YouTube-titels, SEO-metadata, hashtags, bijschriften en 60+ andere tools — gratis.",
    "hero.cta1": "Probeer de Creator Kit", "hero.cta2": "Logo Generator", "hero.cta3": "AI Image Gen",
    "hero.check1": "Geen registratie nodig", "hero.check2": "Gratis abonnement", "hero.check3": "Premium vanaf $19/maand",
    "section.newTools": "Net toegevoegd", "section.categories": "Bladeren per workflow",
    "section.featured": "All-in-One Creator Kit",
    "section.featuredSub": "Eén onderwerp → titels, hashtags, thumbnails, bijschriften en zoekwoorden.",
    "section.popularTools": "Populaire tools", "section.allTools": "Alle tools",
    "section.blog": "Gidsen en tutorials", "section.pricing": "Eenvoudige prijzen",
    "btn.viewAll": "Bekijk alle", "btn.openTool": "Openen", "btn.generate": "Genereer",
    "btn.download": "Downloaden", "btn.copy": "Kopiëren", "btn.save": "Opslaan",
    "btn.upgrade": "Upgrade", "btn.back": "Terug", "btn.createAccount": "Maak gratis account",
    "btn.openDashboard": "Open dashboard", "btn.startFree": "Begin gratis",
    "btn.upgradePro": "Upgrade naar Pro", "btn.chooseBusiness": "Kies Business",
    "label.account": "Account", "label.guest": "Bezoeker", "label.recentlyUsed": "Recent gebruikt",
    "label.recommended": "Aanbevolen", "label.noRecent": "Nog geen tools gebruikt.",
    "label.favorites": "Favorieten", "label.search": "Zoek tools…", "label.menu": "Menu",
    "label.themeColor": "Thema kleur", "label.mode": "Modus", "label.light": "Licht",
    "label.dark": "Donker", "label.language": "Taal", "label.tagline": "Creator Toolkit",
    "label.footerProduct": "Product", "label.footerCategories": "Categorieën", "label.footerLegal": "Juridisch",
    "label.notFound": "Pagina niet gevonden", "label.browseTools": "Bladeren door tools",
    "label.welcomeBack": "Welkom terug", "label.createFreeAccount": "Maak gratis account",
    "label.forgotPassword": "Wachtwoord vergeten?", "label.tier": "plan",
  },

  tr: {
    "nav.home": "Ana Sayfa", "nav.tools": "Araçlar", "nav.categories": "Kategoriler",
    "nav.blog": "Blog", "nav.pricing": "Fiyatlar", "nav.faq": "SSS",
    "nav.dashboard": "Panel", "nav.login": "Giriş", "nav.signup": "Kayıt Ol",
    "nav.account": "Hesap", "nav.logout": "Çıkış", "nav.all": "Tümü",
    "hero.badge": "60+ ücretsiz içerik üretici aracı, kayıt gerektirmez",
    "hero.title1": "Tek platform.", "hero.title2": "Tüm üretici araçları.",
    "hero.subtitle": "Logolar, AI görselleri, YouTube başlıkları, SEO meta verileri, hashtag'ler, alt yazılar ve 60+ araç oluşturun — tamamen ücretsiz.",
    "hero.cta1": "Creator Kit'i Dene", "hero.cta2": "Logo Üreteci", "hero.cta3": "AI Görsel",
    "hero.check1": "Kayıt gerektirmez", "hero.check2": "Ücretsiz plan mevcut", "hero.check3": "Premium $19/aydan başlar",
    "section.newTools": "Yeni eklendi", "section.categories": "İş akışına göre keşfet",
    "section.featured": "All-in-One Creator Kit", "section.featuredSub": "Tek konu → başlıklar, hashtagler, thumbnaillar, alt yazılar, anahtar kelimeler.",
    "section.popularTools": "Popüler araçlar", "section.allTools": "Tüm araçlar",
    "section.blog": "Rehberler ve eğitimler", "section.pricing": "Basit fiyatlandırma",
    "btn.viewAll": "Tümünü gör", "btn.openTool": "Aç", "btn.generate": "Oluştur",
    "btn.download": "İndir", "btn.copy": "Kopyala", "btn.save": "Kaydet",
    "btn.upgrade": "Yükselt", "btn.back": "Geri", "btn.createAccount": "Ücretsiz hesap oluştur",
    "btn.openDashboard": "Paneli aç", "btn.startFree": "Ücretsiz başla",
    "btn.upgradePro": "Pro'ya yükselt", "btn.chooseBusiness": "Business seç",
    "label.account": "Hesap", "label.guest": "Misafir", "label.recentlyUsed": "Son kullanılanlar",
    "label.recommended": "Önerilenler", "label.noRecent": "Henüz araç kullanılmadı.",
    "label.favorites": "Favoriler", "label.search": "Araç ara…", "label.menu": "Menü",
    "label.themeColor": "Tema rengi", "label.mode": "Mod", "label.light": "Açık",
    "label.dark": "Koyu", "label.language": "Dil", "label.tagline": "Creator Toolkit",
  },
  id: {
    "nav.home": "Beranda", "nav.tools": "Alat", "nav.categories": "Kategori",
    "nav.blog": "Blog", "nav.pricing": "Harga", "nav.faq": "FAQ",
    "nav.dashboard": "Dasbor", "nav.login": "Masuk", "nav.signup": "Daftar",
    "nav.account": "Akun", "nav.logout": "Keluar", "nav.all": "Semua",
    "hero.badge": "60+ alat kreator gratis, tanpa pendaftaran",
    "hero.title1": "Satu platform.", "hero.title2": "Semua alat kreator.",
    "hero.subtitle": "Buat logo, gambar AI, judul YouTube, metadata SEO, hashtag, caption, dan 60+ alat lainnya — semua gratis.",
    "hero.cta1": "Coba Creator Kit", "hero.cta2": "Pembuat Logo", "hero.cta3": "Gambar AI",
    "hero.check1": "Tanpa pendaftaran", "hero.check2": "Paket gratis tersedia", "hero.check3": "Premium dari $19/bulan",
    "section.newTools": "Baru ditambahkan", "section.categories": "Telusuri berdasarkan alur kerja",
    "section.featured": "All-in-One Creator Kit", "section.featuredSub": "Satu topik menjadi judul, hashtag, thumbnail, caption, dan kata kunci.",
    "section.popularTools": "Alat populer", "section.allTools": "Semua alat",
    "section.blog": "Panduan dan tutorial", "section.pricing": "Harga sederhana",
    "btn.viewAll": "Lihat semua", "btn.openTool": "Buka", "btn.generate": "Buat",
    "btn.download": "Unduh", "btn.copy": "Salin", "btn.save": "Simpan",
    "btn.upgrade": "Tingkatkan", "btn.back": "Kembali",
    "btn.createAccount": "Buat akun gratis", "btn.openDashboard": "Buka dasbor",
    "btn.startFree": "Mulai gratis", "btn.upgradePro": "Tingkatkan ke Pro",
    "btn.chooseBusiness": "Pilih Business",
    "label.account": "Akun", "label.guest": "Tamu", "label.recentlyUsed": "Baru digunakan",
    "label.recommended": "Direkomendasikan", "label.noRecent": "Belum ada alat yang digunakan.",
    "label.favorites": "Favorit", "label.search": "Cari alat...", "label.menu": "Menu",
    "label.themeColor": "Warna tema", "label.mode": "Mode", "label.light": "Terang",
    "label.dark": "Gelap", "label.language": "Bahasa", "label.tagline": "Creator Toolkit",
    "label.notFound": "Halaman tidak ditemukan", "label.browseTools": "Telusuri alat",
    "label.welcomeBack": "Selamat datang kembali", "label.tier": "paket",
  },
  zh: {
    "nav.home": "首页", "nav.tools": "工具", "nav.categories": "分类",
    "nav.blog": "博客", "nav.pricing": "定价", "nav.faq": "常见问题",
    "nav.dashboard": "仪表板", "nav.login": "登录", "nav.signup": "注册",
    "nav.account": "账户", "nav.logout": "退出", "nav.all": "全部",
    "hero.badge": "60多种免费创作者工具,无需注册",
    "hero.title1": "一个平台。", "hero.title2": "所有创作者工具。",
    "hero.subtitle": "生成徽标、AI 图像、YouTube 标题、SEO 元数据、话题标签、字幕等 60 多种工具——全部免费。",
    "hero.cta1": "试用创作者套件", "hero.cta2": "徽标生成器", "hero.cta3": "AI 图像生成",
    "hero.check1": "无需注册", "hero.check2": "免费计划可用", "hero.check3": "高级版每月 $19 起",
    "section.newTools": "新增", "section.categories": "按工作流浏览",
    "section.featured": "一体化创作者套件", "section.featuredSub": "一个主题即可生成标题、话题标签、缩略图、字幕和关键词。",
    "section.popularTools": "热门工具", "section.allTools": "所有工具",
    "section.blog": "指南和教程", "section.pricing": "简单定价",
    "btn.viewAll": "查看全部", "btn.openTool": "打开", "btn.generate": "生成",
    "btn.download": "下载", "btn.copy": "复制", "btn.save": "保存",
    "btn.upgrade": "升级", "btn.back": "返回",
    "btn.createAccount": "创建免费账户", "btn.openDashboard": "打开仪表板",
    "btn.startFree": "免费开始", "btn.upgradePro": "升级到 Pro",
    "btn.chooseBusiness": "选择商业版",
    "label.account": "账户", "label.guest": "访客", "label.recentlyUsed": "最近使用",
    "label.recommended": "推荐", "label.noRecent": "尚未使用任何工具。",
    "label.favorites": "收藏", "label.search": "搜索工具…", "label.menu": "菜单",
    "label.themeColor": "主题颜色", "label.mode": "模式", "label.light": "浅色",
    "label.dark": "深色", "label.language": "语言", "label.tagline": "创作者工具包",
    "label.notFound": "未找到页面", "label.browseTools": "浏览工具",
    "label.welcomeBack": "欢迎回来", "label.tier": "套餐",
  },
  hi: {
    "nav.home": "होम", "nav.tools": "टूल्स", "nav.categories": "श्रेणियाँ",
    "nav.blog": "ब्लॉग", "nav.pricing": "मूल्य निर्धारण", "nav.faq": "सामान्य प्रश्न",
    "nav.dashboard": "डैशबोर्ड", "nav.login": "लॉगिन", "nav.signup": "साइन अप",
    "nav.account": "खाता", "nav.logout": "लॉगआउट", "nav.all": "सभी",
    "hero.badge": "60+ मुफ्त क्रिएटर टूल्स, साइन अप की जरूरत नहीं",
    "hero.title1": "एक प्लेटफॉर्म।", "hero.title2": "हर क्रिएटर टूल।",
    "hero.subtitle": "लोगो, AI इमेज, YouTube टाइटल, SEO मेटाडेटा, हैशटैग, कैप्शन और 60+ टूल्स बनाएं — सब मुफ्त।",
    "hero.cta1": "क्रिएटर किट आज़माएं", "hero.cta2": "लोगो जेनरेटर", "hero.cta3": "AI इमेज",
    "hero.check1": "साइन अप की जरूरत नहीं", "hero.check2": "मुफ्त प्लान उपलब्ध", "hero.check3": "प्रीमियम $19/महीना से",
    "section.newTools": "नया जोड़ा गया", "section.categories": "वर्कफ़्लो के अनुसार ब्राउज़ करें",
    "section.featured": "ऑल-इन-वन क्रिएटर किट",
    "section.popularTools": "लोकप्रिय टूल्स", "section.allTools": "सभी टूल्स",
    "section.blog": "गाइड और ट्यूटोरियल", "section.pricing": "सरल मूल्य निर्धारण",
    "btn.viewAll": "सभी देखें", "btn.openTool": "खोलें", "btn.generate": "बनाएं",
    "btn.download": "डाउनलोड", "btn.copy": "कॉपी", "btn.save": "सेव",
    "btn.upgrade": "अपग्रेड", "btn.back": "वापस",
    "btn.createAccount": "मुफ्त खाता बनाएं", "btn.openDashboard": "डैशबोर्ड खोलें",
    "btn.startFree": "मुफ्त शुरू करें", "btn.upgradePro": "Pro में अपग्रेड करें",
    "btn.chooseBusiness": "Business चुनें",
    "label.account": "खाता", "label.guest": "अतिथि", "label.recentlyUsed": "हाल ही में उपयोग",
    "label.recommended": "अनुशंसित", "label.noRecent": "अभी तक कोई टूल उपयोग नहीं।",
    "label.favorites": "पसंदीदा", "label.search": "टूल खोजें…", "label.menu": "मेनू",
    "label.themeColor": "थीम रंग", "label.mode": "मोड", "label.light": "लाइट",
    "label.dark": "डार्क", "label.language": "भाषा", "label.tagline": "क्रिएटर टूलकिट",
    "label.welcomeBack": "वापसी पर स्वागत है", "label.tier": "प्लान",
  },
  ja: {
    "nav.home": "ホーム", "nav.tools": "ツール", "nav.categories": "カテゴリー",
    "nav.blog": "ブログ", "nav.pricing": "料金", "nav.faq": "よくある質問",
    "nav.dashboard": "ダッシュボード", "nav.login": "ログイン", "nav.signup": "登録",
    "nav.account": "アカウント", "nav.logout": "ログアウト", "nav.all": "すべて",
    "hero.badge": "60以上の無料クリエイターツール、登録不要",
    "hero.title1": "1つのプラットフォーム。", "hero.title2": "すべてのクリエイターツール。",
    "hero.subtitle": "ロゴ、AI画像、YouTubeタイトル、SEOメタデータ、ハッシュタグ、キャプション、60以上のツールを作成 — すべて無料。",
    "hero.cta1": "Creator Kit を試す", "hero.cta2": "ロゴジェネレーター", "hero.cta3": "AI画像生成",
    "hero.check1": "登録不要", "hero.check2": "無料プランあり", "hero.check3": "プレミアム月額$19から",
    "section.newTools": "新着", "section.categories": "ワークフローで探す",
    "section.featured": "オールインワン Creator Kit",
    "section.popularTools": "人気ツール", "section.allTools": "すべてのツール",
    "section.blog": "ガイドとチュートリアル", "section.pricing": "シンプルな料金",
    "btn.viewAll": "すべて表示", "btn.openTool": "開く", "btn.generate": "生成",
    "btn.download": "ダウンロード", "btn.copy": "コピー", "btn.save": "保存",
    "btn.upgrade": "アップグレード", "btn.back": "戻る",
    "btn.createAccount": "無料アカウント作成", "btn.openDashboard": "ダッシュボードを開く",
    "btn.startFree": "無料で始める", "btn.upgradePro": "Proにアップグレード",
    "btn.chooseBusiness": "Businessを選択",
    "label.account": "アカウント", "label.guest": "ゲスト", "label.recentlyUsed": "最近使用",
    "label.recommended": "おすすめ", "label.noRecent": "まだツールを使用していません。",
    "label.favorites": "お気に入り", "label.search": "ツールを検索…", "label.menu": "メニュー",
    "label.themeColor": "テーマカラー", "label.mode": "モード", "label.light": "ライト",
    "label.dark": "ダーク", "label.language": "言語", "label.tagline": "クリエイターツールキット",
    "label.welcomeBack": "おかえりなさい", "label.tier": "プラン",
  },
  ko: {
    "nav.home": "홈", "nav.tools": "도구", "nav.categories": "카테고리",
    "nav.blog": "블로그", "nav.pricing": "가격", "nav.faq": "자주 묻는 질문",
    "nav.dashboard": "대시보드", "nav.login": "로그인", "nav.signup": "가입",
    "nav.account": "계정", "nav.logout": "로그아웃", "nav.all": "전체",
    "hero.badge": "60개 이상의 무료 크리에이터 도구, 가입 불필요",
    "hero.title1": "하나의 플랫폼.", "hero.title2": "모든 크리에이터 도구.",
    "hero.subtitle": "로고, AI 이미지, YouTube 제목, SEO 메타데이터, 해시태그, 캡션 등 60개 이상의 도구 — 모두 무료.",
    "hero.cta1": "Creator Kit 사용해보기", "hero.cta2": "로고 생성기", "hero.cta3": "AI 이미지",
    "hero.check1": "가입 불필요", "hero.check2": "무료 플랜 제공", "hero.check3": "Premium 월 $19부터",
    "section.newTools": "새로 추가됨", "section.categories": "워크플로별 탐색",
    "section.featured": "올인원 Creator Kit",
    "section.popularTools": "인기 도구", "section.allTools": "모든 도구",
    "section.blog": "가이드 및 튜토리얼", "section.pricing": "간단한 가격",
    "btn.viewAll": "모두 보기", "btn.openTool": "열기", "btn.generate": "생성",
    "btn.download": "다운로드", "btn.copy": "복사", "btn.save": "저장",
    "btn.upgrade": "업그레이드", "btn.back": "뒤로",
    "btn.createAccount": "무료 계정 만들기", "btn.openDashboard": "대시보드 열기",
    "btn.startFree": "무료로 시작", "btn.upgradePro": "Pro로 업그레이드",
    "btn.chooseBusiness": "Business 선택",
    "label.account": "계정", "label.guest": "방문자", "label.recentlyUsed": "최근 사용",
    "label.recommended": "추천", "label.noRecent": "아직 사용한 도구가 없습니다.",
    "label.favorites": "즐겨찾기", "label.search": "도구 검색…", "label.menu": "메뉴",
    "label.themeColor": "테마 색상", "label.mode": "모드", "label.light": "라이트",
    "label.dark": "다크", "label.language": "언어", "label.tagline": "크리에이터 툴킷",
    "label.welcomeBack": "다시 오신 것을 환영합니다", "label.tier": "플랜",
  },
};

function translate(lang: LangCode, key: string): string {
  return translations[lang]?.[key] ?? translations.en?.[key] ?? key;
}

// ─── Category meta ────────────────────────────────────────────────────────────
const categoryMeta: Record<ToolGroup, { name: string; icon: LucideIcon; blurb: string; gradient: string; accent: string }> = {
  image:    { name: "Image Tools",      icon: ImageIcon,   blurb: "Compress, resize, convert, and optimize images for faster, sharper results.",      gradient: "from-sky-500 to-cyan-500",      accent: "sky"    },
  designer: { name: "Designer Tools",   icon: Palette,     blurb: "Build color palettes, gradients, font pairs, and mockups in minutes.",             gradient: "from-fuchsia-500 to-purple-500",accent: "fuchsia"},
  youtube:  { name: "YouTube Tools",    icon: Play,        blurb: "Titles, thumbnails, tags, scripts, and earnings to grow your channel.",            gradient: "from-rose-500 to-orange-400",   accent: "rose"   },
  tiktok:   { name: "TikTok Tools",     icon: Video,       blurb: "Hooks, captions, hashtags, and trend ideas for viral short-form content.",         gradient: "from-slate-700 to-zinc-600",    accent: "slate"  },
  instagram:{ name: "Instagram Tools",  icon: Camera,      blurb: "Bios, captions, reels, and engagement tools to grow your profile.",               gradient: "from-pink-500 to-fuchsia-500",  accent: "pink"   },
  pinterest:{ name: "Pinterest Tools",  icon: MapPin,      blurb: "SEO-rich pin titles, descriptions, and keywords for search-driven traffic.",       gradient: "from-red-500 to-rose-400",      accent: "red"    },
  seo:      { name: "SEO Tools",        icon: Target,      blurb: "Metadata, schema, sitemaps, robots, and technical SEO helpers.",                  gradient: "from-emerald-500 to-teal-400",  accent: "emerald"},
  ai:       { name: "AI Generators",    icon: Sparkles,    blurb: "Hooks, ideas, captions, scripts, and social copy — all from one prompt.",         gradient: "from-indigo-500 to-violet-500", accent: "indigo" },
};

const categories = Object.entries(categoryMeta).map(([slug, meta]) => ({ slug: slug as ToolGroup, ...meta }));

// ─── Tools list ───────────────────────────────────────────────────────────────
const tools: Tool[] = [
  // Featured
  { slug: "all-in-one-creator-kit", name: "All-in-One Creator Kit", category: "ai", description: "One topic → titles, hashtags, thumbnails, captions, keywords, and content ideas. Your fastest path to publish-ready assets.", featured: true },
  // Logo Generator

  // Image
  { slug: "compress-image",         name: "Compress Image",          category: "image",   description: "Shrink image file sizes without losing quality for faster pages." },
  { slug: "resize-image",           name: "Resize Image",            category: "image",   description: "Resize images to exact dimensions for any platform or use case." },
  { slug: "bulk-resize",            name: "Bulk Resize",             category: "image",   description: "Resize multiple images at once in a single workflow.", isPremium: true },
  { slug: "crop-image",             name: "Crop Image",              category: "image",   description: "Crop images to a precise area or aspect ratio." },
  { slug: "rotate-image",           name: "Rotate Image",            category: "image",   description: "Rotate or flip any image quickly." },
  { slug: "convert-png-to-jpg",     name: "PNG to JPG",              category: "image",   description: "Convert PNG files to JPG instantly." },
  { slug: "convert-jpg-to-png",     name: "JPG to PNG",              category: "image",   description: "Convert JPG files to PNG with transparency support." },
  { slug: "webp-converter",         name: "WebP Converter",          category: "image",   description: "Convert images to modern WebP format for better web performance." },
  { slug: "avif-converter",         name: "AVIF Converter",          category: "image",   description: "Convert images to AVIF for the smallest possible file sizes." },
  { slug: "pdf-to-image",           name: "PDF to Image",            category: "image",   description: "Extract pages from PDFs as image files." },
  { slug: "image-to-pdf",           name: "Image to PDF",            category: "image",   description: "Merge images into a single PDF document." },
  { slug: "watermark-tool",         name: "Watermark Tool",          category: "image",   description: "Add a custom watermark to your images." },
  { slug: "meme-creator",           name: "Meme Creator",            category: "image",   description: "Create viral memes with text overlays." },
  { slug: "background-remover",     name: "AI Background Remover",   category: "image",   description: "Remove image backgrounds with AI — 100% in your browser, nothing uploaded.", isNew: true },
  { slug: "blur-background",        name: "Blur Background",         category: "image",   description: "Blur image backgrounds for a professional portrait look." },
  { slug: "color-picker",           name: "Color Picker",            category: "image",   description: "Pick and copy exact color codes from any image." },
  { slug: "image-upscaler",         name: "Image Upscaler",          category: "image",   description: "Upscale images with AI-enhanced detail." },
  { slug: "ai-smart-image-optimizer",name:"AI Smart Optimizer",      category: "image",   description: "AI-powered image optimization for quality and speed." },
  // Designer
  { slug: "color-palette-generator",name: "Color Palette Generator", category: "designer",description: "Generate beautiful, harmonious color palettes instantly." },
  { slug: "gradient-generator",     name: "Gradient Generator",      category: "designer",description: "Create CSS gradients visually and copy the code." },
  { slug: "font-pair-generator",    name: "Font Pair Generator",     category: "designer",description: "Find the perfect font pairing for your brand or project." },
  { slug: "svg-converter",          name: "SVG Converter",           category: "designer",description: "Convert images to scalable SVG format." },
  { slug: "qr-code-generator",      name: "QR Code Generator",       category: "designer",description: "Generate branded QR codes for links and content." },
  { slug: "mockup-generator",       name: "Mockup Generator",        category: "designer",description: "Create device and product mockups for your brand." },
  { slug: "logo-size-generator",    name: "Logo Size Guide",         category: "designer",description: "Get the correct logo dimensions for every platform." },
  { slug: "social-media-size-generator",name:"Social Media Sizes",   category: "designer",description: "Lookup the right size for every social media format." },
  // YouTube
  { slug: "youtube-money-calculator",name:"YouTube Calculator",      category: "youtube", description: "Estimate your YouTube earnings from views and RPM." },
  { slug: "thumbnail-downloader",   name: "Thumbnail Downloader",    category: "youtube", description: "Download YouTube video thumbnails in full quality." },
  { slug: "thumbnail-generator",    name: "Thumbnail Generator",     category: "youtube", description: "Generate click-worthy YouTube thumbnail ideas." },
  { slug: "thumbnail-text-generator",name:"Thumbnail Text",          category: "youtube", description: "Generate bold thumbnail text that increases CTR." },
  { slug: "channel-name-generator", name: "Channel Name Generator",  category: "youtube", description: "Generate catchy, brandable YouTube channel names." },
  { slug: "video-title-generator",  name: "Video Title Generator",   category: "youtube", description: "Generate SEO-friendly, high-CTR YouTube video titles." },
  { slug: "tag-generator",          name: "Tag Generator",           category: "youtube", description: "Generate relevant YouTube tags for better discoverability." },
  { slug: "description-generator",  name: "Description Generator",   category: "youtube", description: "Write keyword-rich YouTube video descriptions fast." },
  { slug: "script-idea-generator",  name: "Script Idea Generator",   category: "youtube", description: "Generate structured video script ideas by topic." },
  { slug: "video-topic-generator",  name: "Video Topic Generator",   category: "youtube", description: "Discover trending video topics for your niche." },
  { slug: "video-seo-generator",    name: "Video SEO Generator",     category: "youtube", description: "Full SEO package: title, description, tags, and chapters." },
  // TikTok
  { slug: "tiktok-earnings-calculator",name:"TikTok Calculator",     category: "tiktok",  description: "Estimate your TikTok earnings by followers and views." },
  { slug: "tiktok-hashtag-generator",name:"Hashtag Generator",       category: "tiktok",  description: "Generate trending TikTok hashtags for more reach." },
  { slug: "tiktok-caption-generator",name:"Caption Generator",       category: "tiktok",  description: "Write engaging TikTok captions that drive action." },
  { slug: "trend-idea-generator",   name: "Trend Idea Generator",    category: "tiktok",  description: "Discover what TikTok trends to jump on next." },
  { slug: "username-generator",     name: "Username Generator",      category: "tiktok",  description: "Generate catchy, available TikTok usernames." },
  // Instagram
  { slug: "instagram-earnings-calculator",name:"Instagram Calculator",category:"instagram",description: "Estimate Instagram earnings for influencer and brand deals." },
  { slug: "engagement-calculator",  name: "Engagement Calculator",   category: "instagram",description: "Calculate your Instagram engagement rate instantly." },
  { slug: "bio-generator",          name: "Bio Generator",           category: "instagram",description: "Write a compelling Instagram bio in seconds." },
  { slug: "instagram-caption-generator",name:"Caption Generator",    category: "instagram",description: "Generate captions that drive saves, shares, and comments." },
  { slug: "instagram-hashtag-generator",name:"Hashtag Generator",    category: "instagram",description: "Find the best Instagram hashtags for your niche." },
  { slug: "reel-idea-generator",    name: "Reel Idea Generator",     category: "instagram",description: "Generate Reel ideas that are built for virality." },
  // Pinterest
  { slug: "pinterest-title-generator",name:"Pin Title Generator",    category: "pinterest",description: "Write SEO-rich Pinterest pin titles that rank." },
  { slug: "pinterest-description-generator",name:"Pin Description",  category: "pinterest",description: "Write keyword-focused Pinterest descriptions." },
  { slug: "pin-idea-generator",     name: "Pin Idea Generator",      category: "pinterest",description: "Generate Pinterest content ideas for your niche." },
  { slug: "keyword-generator",      name: "Pinterest Keywords",      category: "pinterest",description: "Find the best keywords for Pinterest search traffic." },
  // SEO
  { slug: "keyword-density-checker",name:"Keyword Density Checker",  category: "seo",     description: "Analyze keyword density in your content for SEO." },
  { slug: "seo-title-generator",    name: "SEO Title Generator",     category: "seo",     description: "Generate click-worthy, SEO-optimized page titles." },
  { slug: "meta-generator",         name: "Meta Generator",          category: "seo",     description: "Generate meta titles and descriptions for any page." },
  { slug: "sitemap-generator",      name: "Sitemap Generator",       category: "seo",     description: "Generate an XML sitemap for your website." },
  { slug: "robots-generator",       name: "Robots.txt Generator",    category: "seo",     description: "Generate a robots.txt file for crawl control." },
  { slug: "open-graph-generator",   name: "Open Graph Generator",    category: "seo",     description: "Generate Open Graph meta tags for social sharing." },
  { slug: "schema-generator",       name: "Schema Generator",        category: "seo",     description: "Generate JSON-LD schema markup for rich results." },
  { slug: "faq-generator",          name: "FAQ Generator",           category: "seo",     description: "Generate SEO-structured FAQ sections with schema." },
  // AI
  { slug: "content-idea-generator", name: "Content Idea Generator",  category: "ai",      description: "Generate 10+ content ideas from one topic input." },
  { slug: "viral-hook-generator",   name: "Viral Hook Generator",    category: "ai",      description: "Generate opening hooks that stop the scroll." },
  { slug: "blog-topic-generator",   name: "Blog Topic Generator",    category: "ai",      description: "Generate SEO-friendly blog topics for your niche." },
  { slug: "ai-thumbnail-generator", name: "AI Thumbnail Generator",  category: "ai",      description: "Generate thumbnail concepts that increase CTR." },
  { slug: "ai-post-generator",      name: "AI Post Generator",       category: "ai",      description: "Generate complete social posts from a single idea." },
  { slug: "social-post-generator",  name: "Social Post Generator",   category: "ai",      description: "Generate platform-specific social posts at scale." },
  { slug: "video-hook-generator",   name: "Video Hook Generator",    category: "ai",      description: "Generate the first 5 seconds that keep viewers watching." },
];

const featuredTool = tools[0];
const topTools = ["all-in-one-creator-kit","background-remover","thumbnail-generator","seo-title-generator","compress-image","viral-hook-generator","youtube-money-calculator","color-palette-generator","gradient-generator"];

// ─── Blog data ────────────────────────────────────────────────────────────────
const blogPosts: BlogPost[] = [
  { slug:"best-free-image-compressor-tools",title:"Best Free Image Compressor Tools",excerpt:"Compress images without killing quality — a practical workflow guide.",category:"Image Tools",readingTime:"6 min",updatedAt:"2026-05-01",sections:[{id:"why",title:"Why compression matters",paragraphs:["Heavy images are one of the fastest ways to hurt page speed, rankings, and ad revenue.","A compression-first workflow helps every creator ship faster and rank higher."]},{id:"how",title:"How to compress like a pro",paragraphs:["Resize first, then compress. Pick WebP or AVIF when browser support allows.","Logoviking's image tools let you do all of this in one workflow without switching apps."]}],faqs:[{question:"Does compression hurt quality?",answer:"Good compression keeps images sharp while removing unnecessary bytes."},{question:"Which format is best for the web?",answer:"WebP and AVIF are both excellent choices for modern browsers."}],related:["how-to-compress-images","youtube-thumbnail-secrets","beginner-seo-guide"]},
  { slug:"how-much-youtubers-earn",title:"How Much Do YouTubers Earn?",excerpt:"RPM, ad revenue, brand deals, and realistic income ranges for every channel size.",category:"YouTube Tools",readingTime:"7 min",updatedAt:"2026-04-22",sections:[{id:"streams",title:"Revenue streams",paragraphs:["Most creators earn from ads, sponsorships, affiliates, and digital products together.","Relying on one stream creates fragility. Diversification is the sustainable path."]},{id:"calc",title:"How to estimate your earnings",paragraphs:["Use the Logoviking YouTube Money Calculator to get a directional range based on your niche, views, and RPM.","Then layer in sponsorship and affiliate potential for a complete picture."]}],faqs:[{question:"Is YouTube income predictable?",answer:"It becomes more predictable when you track RPM, views, and secondary income consistently."},{question:"Can small channels earn?",answer:"Yes — affiliates, services, and targeted sponsorships work even at small scale."}],related:["youtube-thumbnail-secrets","ai-content-creation-guide","instagram-growth-guide"]},
  { slug:"instagram-growth-guide",title:"Instagram Growth Guide 2026",excerpt:"A practical system for bios, captions, reels, and engagement that actually works.",category:"Instagram Tools",readingTime:"5 min",updatedAt:"2026-04-15",sections:[{id:"profile",title:"Start with a strong profile",paragraphs:["Your bio should make the value obvious within 3 seconds of landing on your page.","Use a clear niche statement, a CTA, and a link strategy that supports your offer."]},{id:"content",title:"Build a consistent content system",paragraphs:["Mix reels, carousels, and stories around one clear topic cluster.","Use the Logoviking caption and hashtag generators to ship more without sacrificing quality."]}],faqs:[{question:"What matters most on Instagram?",answer:"Clarity, consistency, and content that earns saves or shares."},{question:"How often should I post?",answer:"Post often enough to stay visible — but every post should serve a clear purpose."}],related:["tiktok-growth-tips","ai-content-creation-guide","beginner-seo-guide"]},
  { slug:"tiktok-growth-tips",title:"TikTok Growth Tips That Actually Work",excerpt:"Hook strategy, captions, and trend research for repeatable short-form traffic.",category:"TikTok Tools",readingTime:"6 min",updatedAt:"2026-04-10",sections:[{id:"hook",title:"Lead with the hook",paragraphs:["The first second decides whether someone stays or scrolls. Make it count.","Use direct outcomes, tension, or a curiosity gap to earn the first 3 seconds."]},{id:"system",title:"Build a repeatable system",paragraphs:["Trending formats work best when they reinforce your niche, not replace it.","Use the Logoviking hook generator and caption tools to keep quality high while posting more."]}],faqs:[{question:"Do hashtags matter on TikTok?",answer:"Less than the hook and retention — but they still help discoverability."},{question:"How do I find video ideas?",answer:"Use a trend and content idea workflow that matches your audience's intent."}],related:["instagram-growth-guide","viral-hook-generator","content-idea-generator"]},
  { slug:"beginner-seo-guide",title:"Beginner SEO Guide",excerpt:"Learn technical SEO, on-page structure, and keyword-led publishing without the jargon.",category:"SEO Tools",readingTime:"8 min",updatedAt:"2026-04-03",sections:[{id:"what",title:"What SEO actually is",paragraphs:["SEO helps the right people find your content through search engines.","The goal isn't just rankings — it's traffic that converts into revenue."]},{id:"first",title:"What to build first",paragraphs:["Clear titles, fast pages, internal links, and content that answers a real search question.","Then add schema, canonical URLs, and a sitemap as you scale."]}],faqs:[{question:"How long does SEO take?",answer:"Usually months — but it compounds when the content and links stay consistent."},{question:"Do I need technical skills?",answer:"Good tooling makes the workflow much easier without needing to code."}],related:["how-to-compress-images","youtube-thumbnail-secrets","ai-content-creation-guide"]},
  { slug:"how-to-compress-images",title:"How To Compress Images Step by Step",excerpt:"A simple guide to shrinking files without losing the quality you need.",category:"Image Tools",readingTime:"4 min",updatedAt:"2026-03-25",sections:[{id:"step1",title:"Step 1: Resize first",paragraphs:["Always resize to the correct output dimensions before compressing.","This protects quality and makes compression far more effective."]},{id:"step2",title:"Step 2: Choose the right format",paragraphs:["WebP and AVIF both beat JPG and PNG for most web images.","Use Logoviking's converter tools to switch formats in seconds."]}],faqs:[{question:"What's the best image format?",answer:"WebP or AVIF for most web use cases when compatibility allows."},{question:"How much can you compress?",answer:"Often 40-80% file reduction is possible without visible quality loss."}],related:["best-free-image-compressor-tools","youtube-thumbnail-secrets","beginner-seo-guide"]},
  { slug:"youtube-thumbnail-secrets",title:"YouTube Thumbnail Secrets",excerpt:"Composition, text hierarchy, and curiosity strategy for higher click-through rates.",category:"YouTube Tools",readingTime:"5 min",updatedAt:"2026-03-12",sections:[{id:"clarity",title:"Clarity first",paragraphs:["A thumbnail has one job: make the viewer instantly understand the payoff.","Keep it simple enough to read as a tiny preview on mobile."]},{id:"text",title:"Less text, more impact",paragraphs:["Short, bold text wins more often than long copy at thumbnail size.","The Logoviking thumbnail text generator is built for this exact constraint."]}],faqs:[{question:"How many words on a thumbnail?",answer:"Usually 3-5. Less is almost always more at small sizes."},{question:"Should thumbnails be busy?",answer:"No — clear focal points win far more often than cluttered layouts."}],related:["how-much-youtubers-earn","thumbnail-generator","video-title-generator"]},
  { slug:"ai-content-creation-guide",title:"AI Content Creation Guide",excerpt:"Build a faster publishing workflow using AI as a planning and drafting engine.",category:"AI Generators",readingTime:"7 min",updatedAt:"2026-03-01",sections:[{id:"role",title:"What AI should do",paragraphs:["AI speeds up idea generation, structure, and first drafts.","Human strategy, editing, and judgment still separate good content from average."]},{id:"workflow",title:"Build your workflow",paragraphs:["Use one tool to generate ideas, another to refine hooks, and a third to distribute.","That stack is faster than jumping between disconnected apps — which is exactly what Logoviking solves."]}],faqs:[{question:"Can AI write everything?",answer:"It can help a lot, but human editing still matters for quality and trust."},{question:"Is AI good for SEO?",answer:"Yes — when it accelerates your publishing workflow without replacing judgment."}],related:["beginner-seo-guide","viral-hook-generator","blog-topic-generator"]},
  { slug:"how-to-create-a-logo-with-ai",title:"How to Create a Logo With AI in 2026",excerpt:"A step-by-step guide to generating professional logo concepts using AI tools — no design skills needed.",category:"Logo Tools",readingTime:"6 min",updatedAt:"2026-05-10",sections:[{id:"why",title:"Why AI logo tools have changed the game",paragraphs:["Professional logo design used to cost $500–$5,000 from a freelancer or agency. AI tools have made it possible to generate multiple professional concepts in seconds.","The key is knowing what to ask for — brand personality, industry context, platform requirements — and iterating from there."]},{id:"how",title:"How to use the Logoviking Logo Generator",paragraphs:["Start with your brand name and a short description of what you do. The more specific you are about your industry and audience, the better the output.","After generating two concepts, download the one that fits and use the color palette and font recommendations to build out a full brand identity."]}],faqs:[{question:"Can I use an AI logo commercially?",answer:"Yes. Logos generated on Logoviking are yours to use without restriction."},{question:"What format should I download?",answer:"PNG at 800×800 works for most uses. Download at 512×512 for favicon and app icon use."}],related:["ai-content-creation-guide","beginner-seo-guide","youtube-thumbnail-secrets"]},
  { slug:"ai-image-generation-guide",title:"AI Image Generation: The Complete Creator Guide",excerpt:"How to generate stunning images for thumbnails, posts, and ads using AI — free and fast.",category:"AI Generators",readingTime:"7 min",updatedAt:"2026-05-15",sections:[{id:"what",title:"What AI image generation is actually good for",paragraphs:["AI image generators like Flux and DALL-E are now good enough to produce thumbnail backgrounds, social media graphics, product mockups, and creative illustrations in seconds.","The trick is prompt engineering — the difference between a generic output and a stunning one is usually 10-15 additional words describing style, lighting, and composition."]},{id:"prompt",title:"Writing prompts that actually work",paragraphs:["Start with the subject, then add style, then add technical qualifiers. Example: 'A sleek silver laptop on a minimalist white desk, cinematic lighting, shot on Sony A7, 4K, ultra-detailed' generates very different results than just 'laptop'.","Logoviking's AI Image Generator has a built-in prompt optimizer — paste your rough idea and it outputs three progressively better versions you can use directly in Midjourney, DALL-E, or our built-in generator."]}],faqs:[{question:"Is the image generator really free?",answer:"Yes. The built-in generator uses Flux via Pollinations.ai which is free with no usage caps."},{question:"Who owns the generated images?",answer:"You do. Images generated are yours to use for commercial or personal projects."}],related:["how-to-create-a-logo-with-ai","ai-content-creation-guide","youtube-thumbnail-secrets"]},
  { slug:"youtube-thumbnail-secrets",title:"YouTube Thumbnail Secrets That Actually Drive Clicks",excerpt:"The data-backed thumbnail tactics that top creators use to hit 8-12% click-through rates.",category:"YouTube Tools",readingTime:"5 min",updatedAt:"2026-04-20",sections:[{id:"why",title:"Why thumbnails matter more than titles",paragraphs:["YouTube's algorithm surfaces your video, but your thumbnail is what actually makes someone click. A 2-3% CTR sends a video into decline. An 8-12% CTR triggers explosive distribution.","The difference is almost always the thumbnail — not the content, not the title, not even the topic."]},{id:"formula",title:"The 3-element thumbnail formula",paragraphs:["Every high-performing thumbnail has three things: a face with an emotion, a bold 3-4 word text overlay, and a contrasting color scheme that pops on a dark background.","Use Logoviking's thumbnail generator to test variations before filming — just enter your topic and get 3 visual concept briefs to brief your designer or create yourself."]}],faqs:[{question:"What thumbnail size does YouTube recommend?",answer:"1280×720px at a minimum, 2560×1440px for high-res. Always 16:9 aspect ratio."},{question:"Should I always use my face?",answer:"Faces with strong emotions typically outperform faceless thumbnails by 20-40% in most niches. Test both."}],related:["youtube-thumbnail-generator","all-in-one-creator-kit","beginner-seo-guide"]},
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const faqGroups = [
  { title:"Getting Started", questions:[{q:"Do I need an account to use Logoviking?",a:"No. Guests can try all tools with daily limits and no signup required."},{q:"What does signing up unlock?",a:"Free accounts get higher limits, saved history, and the ability to favorite tools."},{q:"Can I use Google to sign in?",a:"Yes. Google login is available on the auth page."},{q:"What is premium?",a:"Premium removes ads, unlocks unlimited usage, and enables batch processing and saved projects."}] },
  { title:"Tools", questions:[{q:"How many tools are available?",a:"Over 60 tools across image, designer, YouTube, TikTok, Instagram, Pinterest, SEO, AI, logo, and image generation."},{q:"Can I generate logos for social media?",a:"Yes. The Logo Generator supports YouTube, TikTok, Instagram, LinkedIn, Discord, Twitch, and more."},{q:"Can I generate AI images?",a:"Yes. The AI Image Generator creates images from text prompts with style and ratio options."},{q:"Do tools work on mobile?",a:"Yes. Every tool is fully responsive and designed for mobile-first use."},{q:"What is the All-in-One Creator Kit?",a:"It generates titles, hashtags, thumbnail ideas, captions, keywords, and content ideas from one topic."}] },
  { title:"Pricing", questions:[{q:"What's included in the free plan?",a:"Free users get daily limits, saved history, and favorites — no credit card required."},{q:"How much is Creator Pro?",a:"Creator Pro is $19/month and removes ads, unlimited usage, and batch processing."},{q:"Is there a Business plan?",a:"Yes. Business is $49/month and is designed for teams and agencies."},{q:"Can I cancel anytime?",a:"Yes. Subscriptions can be changed or canceled at any time."}] },
  { title:"Privacy & Security", questions:[{q:"What data do you store?",a:"Only the data needed for login, preferences, favorites, history, and analytics."},{q:"Do you sell personal data?",a:"Never. We do not sell or share personal data with third parties."},{q:"Are uploads private?",a:"Yes. Uploaded images are processed locally in this demo and not stored permanently."},{q:"Do you use cookies?",a:"Yes — for authentication, preferences, and optional analytics."}] },
];

// ─── Trust pages ──────────────────────────────────────────────────────────────
const trustPages: Record<string,{title:string;description:string;sections:{heading:string;paragraphs:string[]}[]}> = {
  about:{title:"About Us",description:"Learn why Logoviking exists and who it's for.",sections:[{heading:"What we build",paragraphs:["Logoviking is a creator-first SaaS toolkit combining image tools, social growth, SEO, logo generation, and AI image generation into one platform.","We keep workflows simple so teams move from idea to traffic without juggling apps."]},{heading:"Who it's for",paragraphs:["YouTubers, TikTok creators, Instagram and Pinterest creators, bloggers, designers, marketers, students, and small businesses.","If you need traffic and trust, this platform is built for you."]}]},
  contact:{title:"Contact",description:"Reach the Logoviking team for support, partnerships, and business inquiries.",sections:[{heading:"How to reach us",paragraphs:["Use the contact form below for support, media requests, and affiliate questions.","We typically respond within 1–2 business days."]},{heading:"Business inquiries",paragraphs:["For sponsorships, licensing, and partnerships, include your company name and goals.","We keep things simple and professional."]}]},
  privacy:{title:"Privacy Policy",description:"How Logoviking handles your account data, usage, and privacy.",sections:[{heading:"What we collect",paragraphs:["We store data needed for login, history, favorites, saved projects, and support.","Guest usage stays minimal until you choose to create an account."]},{heading:"Ad & analytics data",paragraphs:["Ad partners may receive page-level data to support monetization.","We never sell personal data."]}]},
  terms:{title:"Terms of Service",description:"The terms that govern Logoviking accounts, tools, and subscriptions.",sections:[{heading:"Acceptable use",paragraphs:["Don't abuse tools, submit harmful content, or attempt to bypass rate limits.","Premium access is for higher productivity, not policy violations."]},{heading:"Subscriptions",paragraphs:["Plans can be upgraded or downgraded at any time.","Billing is handled securely by the payment processor."]}]},
  disclaimer:{title:"Disclaimer",description:"Important output guidance and responsibility notes.",sections:[{heading:"Output quality",paragraphs:["Generated content is a starting point — always review before publishing.","We don't guarantee rankings, earnings, or platform growth."]},{heading:"Creative responsibility",paragraphs:["You're responsible for verifying accuracy and ownership of published content.","Always review sensitive or regulated claims."]}]},
  cookies:{title:"Cookie Policy",description:"How Logoviking uses cookies and browser storage.",sections:[{heading:"Why cookies help",paragraphs:["Cookies keep you signed in, save dark mode, and remember favorites.","They also support analytics and premium preferences."]},{heading:"Your controls",paragraphs:["You can clear browser storage at any time.","Disabling cookies limits some personalization features."]}]},
  "affiliate-disclosure":{title:"Affiliate Disclosure",description:"How affiliate links and partner placements appear on Logoviking.",sections:[{heading:"How partnerships work",paragraphs:["Some content may include affiliate links or sponsor placements.","This helps support free access and keeps the toolkit growing."]},{heading:"Editorial integrity",paragraphs:["Affiliate relationships don't change our core recommendations.","We aim to keep every recommendation genuinely useful."]}]},
  dmca:{title:"DMCA",description:"Submit a copyright or takedown request.",sections:[{heading:"Submit a notice",paragraphs:["Include the URL, your rights claim, and contact information.","A complete request helps us review quickly."]},{heading:"How we respond",paragraphs:["We review takedown requests in good faith.","We'll reach out if more information is needed."]}]},
};

const pricingPlans = [
  { name:"Free",        price:"$0",  period:"forever", description:"Perfect for discovering tools and light usage.", badge:"",          features:["5 daily uses (guest), 25 (free account)","Access to all 60+ tools","Save history & favorites","Basic outputs","Ads visible"],                                      featured:false },
  { name:"Creator Pro", price:"$19", period:"/month",   description:"For creators who publish regularly and need more.",badge:"Most popular",features:["Unlimited usage","No ads","Batch processing","Saved projects","Priority tools","All platforms"],                                                        featured:true  },
  { name:"Business",    price:"$49", period:"/month",   description:"For teams, agencies, and high-volume creators.", badge:"",          features:["Everything in Creator Pro","Team-ready workflow","Higher batch limits","Analytics-ready exports","Priority support","Custom usage reports"],               featured:false },
];

// navLinks kept as slugs for reference only — nav uses t() keys now
const _navLinks = [["Home","/"],["Tools","/tools"],["Categories","/categories"],["Blog","/blog"],["Pricing","/pricing"],["FAQ","/faq"]];
void _navLinks;
const trustLinks = [["About","/about"],["Contact","/contact"],["Privacy","/privacy"],["Terms","/terms"],["Disclaimer","/disclaimer"],["Cookies","/cookies"],["Affiliate","/affiliate-disclosure"],["DMCA","/dmca"]];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanText(s:string){return s.replace(/\s+/g," ").trim()}
function isSpammy(s:string){return (s.match(/https?:\/\//gi)??[]).length>3||/(.)\1{12,}/.test(s)}
function getDailyKey(){return new Date().toISOString().slice(0,10)}
function safeFullUrl(p="/"){if(typeof window==="undefined")return`${siteDomain}${p}`;return new URL(p,window.location.origin).toString()}
function scrollTop(){if(typeof window!=="undefined")window.scrollTo({top:0,behavior:"smooth"})}
function getToolBySlug(slug?:string){return tools.find(t=>t.slug===slug)}
function getBlogBySlug(slug?:string){return blogPosts.find(b=>b.slug===slug)}
function filterUnique<T>(a:T[]){return Array.from(new Set(a))}


// ─── Local storage hook ───────────────────────────────────────────────────────
function useLocalStorage<T>(key:string,def:T){
  const [val,setVal]=useState<T>(()=>{
    if(typeof window==="undefined")return def;
    try{const r=window.localStorage.getItem(key);return r?(JSON.parse(r) as T):def}catch{return def}
  });
  useEffect(()=>{try{window.localStorage.setItem(key,JSON.stringify(val))}catch{}},[key,val]);
  return[val,setVal]as const;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const SiteContext=createContext<SiteContextValue|null>(null);
function useSite(){const c=useContext(SiteContext);if(!c)throw new Error("useSite");return c}

function SiteProvider({children}:{children:ReactNode}){
  const prefersDark=typeof window!=="undefined"&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  const[theme,setTheme]=useLocalStorage<Theme>("lv-theme",prefersDark?"dark":"light");
  const[colorTheme,setColorTheme]=useLocalStorage<ColorTheme>("lv-color-theme","violet");
  const[lang,setLang]=useLocalStorage<LangCode>("lv-lang","en");
  const[account,setAccount]=useLocalStorage<Account>("lv-account",{name:"Guest",email:"",tier:"guest",provider:"guest",authenticated:false});
  const[favorites,setFavorites]=useLocalStorage<string[]>("lv-favs",[]);
  const[projects,setProjects]=useLocalStorage<Project[]>("lv-projects",[]);
  const[usage,setUsage]=useLocalStorage<{date:string;count:number;history:HistoryEntry[]}>("lv-usage",{date:getDailyKey(),count:0,history:[]});
  const[aiProvider,setAiProvider]=useLocalStorage<AIProvider>("lv-ai-provider","anthropic");

  const isRTL=languages.find(l=>l.code===lang)?.rtl??false;

  useEffect(()=>{document.documentElement.classList.toggle("dark",theme==="dark")},[theme]);
  useEffect(()=>{if(usage.date!==getDailyKey())setUsage({date:getDailyKey(),count:0,history:[]})},[usage.date,setUsage]);
  useEffect(()=>{
    const t=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
    document.documentElement.style.setProperty("--color-primary",t.color);
  },[colorTheme]);
  useEffect(()=>{
    document.documentElement.setAttribute("dir",isRTL?"rtl":"ltr");
    document.documentElement.setAttribute("lang",lang);
  },[lang,isRTL]);

  const t=(key:string)=>translate(lang,key);

  const toggleFavorite=(slug:string)=>setFavorites(f=>f.includes(slug)?f.filter(x=>x!==slug):[slug,...f]);
  const recordToolUse=(slug:string,query:string)=>{
    const limit=TOOL_LIMITS[account.tier];
    if(usage.count>=limit)return{allowed:false,remaining:0,limit};
    const h:HistoryEntry[]=[{id:`${slug}-${Date.now()}`,slug,query:cleanText(query),createdAt:new Date().toISOString()},...usage.history].slice(0,120);
    setUsage({date:getDailyKey(),count:usage.count+1,history:h});
    return{allowed:true,remaining:Math.max(0,limit-(usage.count+1)),limit};
  };
  const clearHistory=()=>setUsage({date:getDailyKey(),count:0,history:[]});
  const saveProject=(p:Project)=>setProjects(ps=>[p,...ps.filter(x=>x.id!==p.id)].slice(0,30));
  const deleteProject=(id:string)=>setProjects(ps=>ps.filter(p=>p.id!==id));

  return<SiteContext.Provider value={{theme,setTheme,colorTheme,setColorTheme,lang,setLang,t,isRTL,account,setAccount,favorites,toggleFavorite,history:usage.history,recordToolUse,clearHistory,projects,saveProject,deleteProject,aiProvider,setAiProvider}}>{children}</SiteContext.Provider>;
}

// ─── SEO Manager ──────────────────────────────────────────────────────────────
function SeoHead({title,description,canonical,noIndex}:{title:string;description:string;canonical?:string;noIndex?:boolean}){
  const loc=useLocation();
  useEffect(()=>{
    const full=title.includes(siteName)?title:`${title} | ${siteName}`;
    document.title=full;
    const set=(sel:string,attr:"name"|"property",val:string)=>{
      let el=document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${sel}"]`);
      if(!el){el=document.createElement("meta");el.setAttribute(attr,sel);document.head.appendChild(el)}
      el.setAttribute("content",val);
    };
    const lnk=(rel:string,href:string)=>{
      let el=document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if(!el){el=document.createElement("link");el.setAttribute("rel",rel);document.head.appendChild(el)}
      el.setAttribute("href",href);
    };
    const url=safeFullUrl(canonical??loc.pathname);
    set("description","name",description);
    set("robots","name",noIndex?"noindex,nofollow":"index,follow");
    set("og:title","property",full);
    set("og:description","property",description);
    set("og:url","property",url);
    set("twitter:title","name",full);
    set("twitter:description","name",description);
    set("twitter:card","name","summary_large_image");
    lnk("canonical",url);
  },[title,description,canonical,loc.pathname,noIndex]);
  return null;
}

// ─── App shell ────────────────────────────────────────────────────────────────
export default function App(){
  return<SiteProvider><Shell/></SiteProvider>;
}

function Shell(){
  const loc=useLocation();
  const[menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>setMenuOpen(false),[loc.pathname]);
  useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"})},[loc.pathname]);
  // Lock body scroll when the mobile drawer is open
  useEffect(()=>{
    if(menuOpen){
      const prev=document.body.style.overflow;
      document.body.style.overflow="hidden";
      return()=>{document.body.style.overflow=prev;};
    }
  },[menuOpen]);
  return(
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen}/>
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen}/>
      <main className="min-h-[70vh]">
        <Routes>
          <Route path="/"                element={<HomePage/>}/>
          <Route path="/tools"           element={<ToolsPage/>}/>
          <Route path="/tools/:slug"     element={<ToolPage/>}/>
          <Route path="/categories"      element={<CategoriesPage/>}/>
          <Route path="/categories/:slug"element={<CategoryPage/>}/>
          <Route path="/blog"            element={<BlogIndex/>}/>
          <Route path="/blog/:slug"      element={<BlogPostPage/>}/>
          <Route path="/faq"             element={<FaqPage/>}/>
          <Route path="/pricing"         element={<PricingPage/>}/>
          <Route path="/subscription"    element={<Navigate to="/pricing" replace/>}/>
          <Route path="/dashboard"       element={<Dashboard/>}/>
          <Route path="/account"         element={<AccountPage/>}/>
          <Route path="/settings"        element={<AccountPage/>}/>
          <Route path="/auth/:mode"      element={<AuthPage/>}/>
          <Route path="/:page"           element={<TrustPage/>}/>
          <Route path="*"                element={<NotFound/>}/>
        </Routes>
      </main>
      <Footer/>
      <BackToTop/>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({menuOpen,setMenuOpen}:{menuOpen:boolean;setMenuOpen:(v:boolean)=>void}){
  const{theme,setTheme,colorTheme,setColorTheme,lang,setLang,t,account,aiProvider,setAiProvider}=useSite();
  const nav=useNavigate();
  const loc=useLocation();
  const[q,setQ]=useState("");
  const[themeOpen,setThemeOpen]=useState(false);
  const[langOpen,setLangOpen]=useState(false);

  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const currentLang=languages.find(l=>l.code===lang)??languages[0];
  useEffect(()=>{const p=new URLSearchParams(loc.search);setQ(p.get("q")??"");},[loc.search]);
  // NOTE: No document click-outside listener — modals have their own backdrop
  // that handles clicking outside. Adding a document listener caused mobile
  // scroll-touches to be treated as "outside" clicks and close the modal.
  // Close on Escape
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){setThemeOpen(false);setLangOpen(false);}};
    document.addEventListener("keydown",onKey);
    return()=>document.removeEventListener("keydown",onKey);
  },[]);
  // Lock body scroll whenever a modal is open (any device — prevents background scroll)
  useEffect(()=>{
    if(themeOpen||langOpen){
      const prev=document.body.style.overflow;
      document.body.style.overflow="hidden";
      return()=>{document.body.style.overflow=prev;};
    }
  },[themeOpen,langOpen]);

  return(
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
        {/* Logo — helmet icon + two-color LogoViking wordmark */}
        <Link to="/" className="group flex shrink-0 items-center gap-1.5 sm:gap-2.5" aria-label="Logoviking — home">
          <img
            src="/images/logoviking-helmet-logo.png"
            alt=""
            width={56}
            height={56}
            className="h-10 w-10 object-contain transition-transform group-hover:scale-105 sm:h-12 sm:w-12 lg:h-14 lg:w-14"
            loading="eager"
          />
          <div className="flex flex-col leading-none">
            <p className="font-black tracking-tight text-base sm:text-lg lg:text-xl">
              <span style={{color:ct.color}}>Logo</span>
              <span className="text-gray-900 dark:text-white">Viking</span>
            </p>
            <p className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.18em] sm:block" style={{color:ct.accent}}>
              Creator Toolkit
            </p>
          </div>
        </Link>

        {/* Nav (desktop only) */}
        <nav className="hidden items-center gap-1 lg:flex ml-2">
          {([["nav.home","/"],["nav.tools","/tools"],["nav.categories","/categories"],["nav.blog","/blog"],["nav.pricing","/pricing"],["nav.faq","/faq"]] as [string,string][]).map(([key,h])=>(
            <Link key={h} to={h} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors",loc.pathname===h?"text-white":"text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white")} style={loc.pathname===h?{background:ct.color}:{}}>{t(key)}</Link>
          ))}
        </nav>

        {/* Search (tablet/desktop only) */}
        <form onSubmit={e=>{e.preventDefault();nav(`/tools?q=${encodeURIComponent(q.trim())}`)}} className="ml-auto hidden min-w-0 flex-1 max-w-xs items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60 md:flex">
          <Search className="h-4 w-4 shrink-0 text-gray-400"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t("label.search")} className="min-w-0 w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 dark:text-white"/>
        </form>

        {/* Actions — push to right on mobile when search is hidden */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:ml-0">
          {/* 5-color theme picker */}
          <div className="relative">
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation();setLangOpen(false);setThemeOpen(v=>!v);}}
              className="flex h-9 min-w-[36px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 sm:px-2.5"
              aria-label="Choose color theme"
              aria-expanded={themeOpen}
              title="Choose theme color"
            >
              <span className="h-4 w-4 rounded-full shadow-sm ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800" style={{background:ct.color}}/>
              <span className="hidden text-xs font-semibold text-gray-600 dark:text-gray-300 sm:block">{ct.label}</span>
            </button>
          </div>

          {/* Language picker — button only; modal is rendered at root */}
          <div>
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation();setThemeOpen(false);setLangOpen(v=>!v);}}
              className="flex h-9 min-w-[36px] items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-2 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 sm:gap-1.5 sm:px-2.5"
              aria-label="Select language"
              aria-expanded={langOpen}
              title={t("label.language")}
            >
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span className="hidden text-xs font-semibold text-gray-600 dark:text-gray-300 sm:block">{currentLang.code.toUpperCase()}</span>
            </button>
          </div>

          {/* ─── Centered modal: Theme picker (portaled to body) ─────────── */}
          {typeof document!=="undefined"&&createPortal(
          <AnimatePresence>
            {themeOpen&&(
              <motion.div
                key="theme-modal"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                transition={{duration:0.15}}
                // Only close if the press started AND ended on the backdrop itself
                // (prevents accidental close when scrolling/dragging inside the modal).
                onPointerDown={(e)=>{(e.currentTarget as HTMLDivElement).dataset.startedOnBackdrop=(e.target===e.currentTarget)?"true":"false";}}
                onClick={(e)=>{if(e.target===e.currentTarget&&(e.currentTarget as HTMLDivElement).dataset.startedOnBackdrop==="true")setThemeOpen(false);}}
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
                role="dialog" aria-modal="true" aria-label={t("label.themeColor")}
              >
                <motion.div
                  initial={{opacity:0,scale:0.92,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92,y:10}}
                  transition={{type:"spring",stiffness:320,damping:28}}
                  onClick={(e)=>e.stopPropagation()}
                  onPointerDown={(e)=>e.stopPropagation()}
                  className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <span className="h-5 w-5 rounded-full shadow" style={{background:ct.color}}/>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{t("label.themeColor")}</p>
                    </div>
                    <button type="button" onClick={()=>setThemeOpen(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close"><X size={18}/></button>
                  </div>
                  <div className="p-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t("label.themeColor")}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {colorThemes.map(c=>(
                        <button
                          key={c.id}
                          type="button"
                          onClick={()=>{setColorTheme(c.id);setThemeOpen(false);}}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all active:scale-95",
                            colorTheme===c.id?"bg-gray-100 dark:bg-gray-800":"hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                          title={c.label}
                          aria-label={c.label}
                        >
                          <span className={cn("h-8 w-8 rounded-full shadow",colorTheme===c.id?"ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900":"")} style={{background:c.color}}/>
                          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{c.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t("label.mode")}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={()=>setTheme("light")} className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95",theme==="light"?"text-white":"border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300")} style={theme==="light"?{background:ct.color}:{}}>
                          <Sun size={15}/> {t("label.light")}
                        </button>
                        <button type="button" onClick={()=>setTheme("dark")} className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95",theme==="dark"?"text-white":"border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300")} style={theme==="dark"?{background:ct.color}:{}}>
                          <Moon size={15}/> {t("label.dark")}
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">AI Provider</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button type="button" onClick={()=>setAiProvider("anthropic")} className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all",aiProvider==="anthropic"?"text-white":"border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300")} style={aiProvider==="anthropic"?{background:ct.color}:{}}>
                          <Sparkles size={13}/> Claude
                        </button>
                        <button type="button" onClick={()=>setAiProvider("openai")} className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all",aiProvider==="openai"?"text-white":"border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300")} style={aiProvider==="openai"?{background:ct.color}:{}}>
                          <Zap size={13}/> GPT-4o
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body)}

          {/* ─── Centered modal: Language picker (portaled to body) ──────── */}
          {typeof document!=="undefined"&&createPortal(
          <AnimatePresence>
            {langOpen&&(
              <motion.div
                key="lang-modal"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                transition={{duration:0.15}}
                // Only close if the press started AND ended on the backdrop itself
                onPointerDown={(e)=>{(e.currentTarget as HTMLDivElement).dataset.startedOnBackdrop=(e.target===e.currentTarget)?"true":"false";}}
                onClick={(e)=>{if(e.target===e.currentTarget&&(e.currentTarget as HTMLDivElement).dataset.startedOnBackdrop==="true")setLangOpen(false);}}
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
                role="dialog" aria-modal="true" aria-label={t("label.language")}
              >
                <motion.div
                  initial={{opacity:0,scale:0.92,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92,y:10}}
                  transition={{type:"spring",stiffness:320,damping:28}}
                  onClick={(e)=>e.stopPropagation()}
                  onPointerDown={(e)=>e.stopPropagation()}
                  className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                  style={{maxHeight:"min(85vh, 640px)"}}
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{currentLang.flag}</span>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{t("label.language")}</p>
                    </div>
                    <button type="button" onClick={()=>setLangOpen(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close"><X size={18}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto overscroll-contain p-2" style={{WebkitOverflowScrolling:"touch",touchAction:"pan-y"}}>
                    <div className="space-y-0.5">
                      {languages.map(l=>(
                        <button
                          key={l.code}
                          type="button"
                          onClick={()=>{setLang(l.code);setLangOpen(false);}}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all active:scale-[0.98]",
                            lang===l.code?"text-white":"text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                          )}
                          style={lang===l.code?{background:ct.color}:{}}
                        >
                          <span className="shrink-0 text-xl leading-none">{l.flag}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold leading-tight">{l.native}</p>
                            <p className={cn("truncate text-xs leading-tight",lang===l.code?"text-white/75":"text-gray-400")}>{l.label}</p>
                          </div>
                          {lang===l.code&&<Check size={16} className="shrink-0"/>}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body)}

          <Link to={account.authenticated?"/dashboard":"/auth/login"} className="hidden items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-sm sm:flex" style={{background:ct.color}}>
            {account.authenticated?<><LayoutDashboard size={15}/> <span className="hidden md:inline">{t("nav.dashboard")}</span></>:<><LogIn size={15}/> <span className="hidden md:inline">{t("nav.login")}</span></>}
          </Link>
          <button type="button" onClick={()=>setMenuOpen(!menuOpen)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 lg:hidden" aria-label="Menu" aria-expanded={menuOpen}>
            {menuOpen?<X size={18}/>:<Menu size={18}/>}
          </button>
        </div>
      </div>

      {/* Category rail */}
      <div className="border-t border-gray-100 dark:border-gray-800/60">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 [&::-webkit-scrollbar]:hidden">
          <Link to="/tools" className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
            <LayoutGrid size={13}/> {t("nav.all")}
          </Link>
          {categories.map(c=>{const Icon=c.icon;return(
            <Link key={c.slug} to={`/categories/${c.slug}`} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
              <Icon size={13}/>{c.name}
            </Link>
          )})}
        </div>
      </div>
    </header>
  );
}

function MobileMenu({menuOpen,setMenuOpen}:{menuOpen:boolean;setMenuOpen:(v:boolean)=>void}){
  const{account,t,lang,setLang,colorTheme}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const navKeys:[string,string][]=[["nav.home","/"],["nav.tools","/tools"],["nav.categories","/categories"],["nav.blog","/blog"],["nav.pricing","/pricing"],["nav.faq","/faq"],["nav.dashboard","/dashboard"]];
  return(
    <AnimatePresence>
      {menuOpen&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 lg:hidden" onClick={()=>setMenuOpen(false)}>
          <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"/>
          <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",stiffness:300,damping:30}} className="absolute right-0 top-0 flex h-full w-[min(85vw,320px)] flex-col overflow-y-auto overscroll-contain bg-white shadow-2xl dark:bg-gray-900" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <p className="font-bold text-gray-900 dark:text-white">{t("label.menu")}</p>
              <button onClick={()=>setMenuOpen(false)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18}/></button>
            </div>
            <nav className="p-4 space-y-1">
              {navKeys.map(([key,h])=>(
                <Link key={h} to={h} className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">{t(key)}</Link>
              ))}
            </nav>
            {/* Language switcher in mobile */}
            <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800">
              <p className="pt-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t("label.language")}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {languages.map(l=>(
                  <button key={l.code} onClick={()=>setLang(l.code)} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",lang===l.code?"text-white":"text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800")} style={lang===l.code?{background:ct.color}:{}}>
                    <span>{l.flag}</span>
                    <span className="text-xs">{l.native}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800 mt-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("label.account")}</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{account.authenticated?account.name:t("label.guest")}</p>
                <p className="text-xs capitalize" style={{color:ct.color}}>{account.tier} {t("label.tier")}</p>
                <Link to={account.authenticated?"/dashboard":"/auth/login"} className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white" style={{background:ct.color}}>
                  {account.authenticated?<><LayoutDashboard size={15}/> {t("nav.dashboard")}</>:<><LogIn size={15}/> {t("nav.login")}</>}
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function Breadcrumb({items}:{items:{label:string;href?:string}[]}){
  const nav=useNavigate();
  const{t}=useSite();
  return(
    <div className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
      <button onClick={()=>window.history.length>1?nav(-1):nav("/")} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
        <ArrowLeft size={13}/> {t("btn.back")}
      </button>
      {items.map((item,i)=>(
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={13} className="text-gray-300 dark:text-gray-600"/>
          {item.href?<Link to={item.href} className="hover:text-gray-900 dark:hover:text-white">{item.label}</Link>:<span className="font-medium text-gray-700 dark:text-gray-200">{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

function PageWrap({children,className}:{children:ReactNode;className?:string}){
  return<div className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12",className)}>{children}</div>;
}

function SectionTitle({eyebrow,title,subtitle,center}:{eyebrow?:string;title:string;subtitle?:string;center?:boolean}){
  return(
    <div className={cn("max-w-2xl space-y-2",center&&"mx-auto text-center")}>
      {eyebrow&&<p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">{eyebrow}</p>}
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{title}</h2>
      {subtitle&&<p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">{subtitle}</p>}
    </div>
  );
}

function Badge({children,variant="gray"}:{children:ReactNode;variant?:"gray"|"violet"|"emerald"|"rose"|"amber"}){
  const styles={gray:"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",violet:"bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",emerald:"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",rose:"bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",amber:"bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"};
  return<span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",styles[variant])}>{children}</span>;
}

function AdSlot({placement}:{placement:string}){
  const{account}=useSite();
  if(account.tier==="premium")return null;
  return(
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-4 text-center dark:border-gray-700 dark:bg-gray-900/60">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Advertisement · {placement}</p>
      <div className="mt-2 h-16 rounded-xl bg-gray-50 dark:bg-gray-800/60"/>
    </div>
  );
}

// ─── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({tool}:{tool:Tool}){
  const{favorites,toggleFavorite}=useSite();
  const meta=categoryMeta[tool.category];
  const Icon=meta.icon;
  const isFav=favorites.includes(tool.slug);
  return(
    <motion.div whileHover={{y:-3}} transition={{type:"spring",stiffness:300,damping:25}} className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",meta.gradient)}>
          <Icon size={18}/>
        </div>
        <div className="flex items-center gap-1.5">
          {tool.isNew&&<Badge variant="emerald">{useSite().t("label.new")}</Badge>}
          {tool.isPremium&&<Badge variant="amber">{useSite().t("label.pro")}</Badge>}
          {tool.featured&&<Badge variant="violet">{useSite().t("label.featured")}</Badge>}
          <button onClick={()=>toggleFavorite(tool.slug)} className={cn("rounded-lg p-1.5 transition-colors",isFav?"text-violet-600 dark:text-violet-400":"text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400")} aria-label="Favorite">
            <Bookmark size={15} fill={isFav?"currentColor":"none"}/>
          </button>
        </div>
      </div>
      <div className="mt-3 flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white">{tool.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">{tool.description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">{meta.name}</span>
        <Link to={`/tools/${tool.slug}`} className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
          {useSite().t("btn.openTool")} <ArrowRight size={13}/>
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Removed tools: Logo Generator + AI Image Generator ─────────────────────
// These tools were removed. If users land on /tools/logo-generator or
// /tools/ai-image-generator, they'll see the standard "tool not found" page.
//
// ─── Workbench ────────────────────────────────────────────────────────────────
function Workbench({tool}:{tool:Tool}){
  const{account,recordToolUse,saveProject,aiProvider}=useSite();
  const[input,setInput]=useState("Creator growth, SEO, and launch-ready content");
  const[imageName,setImageName]=useState("");
  const[preview,setPreview]=useState<string|null>(null);
  const[err,setErr]=useState("");
  const[result,setResult]=useState<AIToolResult|null>(null);
  const[generating,setGenerating]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{return()=>{if(preview)URL.revokeObjectURL(preview)}},[preview]);

  const limit=TOOL_LIMITS[account.tier];
  const limitLabel=limit===Infinity?"Unlimited":`${limit}/day`;
  const allowImage=tool.category==="image"||tool.slug==="all-in-one-creator-kit";

  const onFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return;
    setImageName(f.name);
    if(preview)URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  };

  const run=async(e:React.FormEvent)=>{
    e.preventDefault();
    const norm=cleanText(input);
    if(!norm&&!imageName){setErr("Add a topic or upload an image.");return}
    if(norm.length>800||isSpammy(norm)){setErr("Keep input concise and spam-free.");return}
    const u=recordToolUse(tool.slug,norm||imageName);
    if(!u.allowed){setErr("Daily limit reached. Upgrade to unlock unlimited usage.");return}
    setErr("");setGenerating(true);
    try{
      const r=await runAITool(tool,norm||imageName,aiProvider,imageName?{File:imageName}:undefined);
      setResult(r);
    }catch(e:unknown){
      const msg=e instanceof Error?e.message:"AI error";
      if(msg.includes("NO_KEY")){setErr("Add VITE_ANTHROPIC_API_KEY or VITE_OPENAI_API_KEY to your Vercel environment variables.");}
      else{setErr(msg);}
    }finally{setGenerating(false);}
  };

  const suspenseFallback=(label:string)=>(
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <RefreshCw size={20} className="mx-auto mb-3 animate-spin text-violet-400"/>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">Loading {label}…</p>
      <p className="mt-1 text-xs text-gray-400">Preparing the AI tool</p>
    </div>
  );

  if(tool.slug==="background-remover"){
    return(<Suspense fallback={suspenseFallback("Background Remover")}><BackgroundRemoverTool/></Suspense>);
  }

  if(tool.slug==="logo-generator"){
    return(
      <Suspense fallback={suspenseFallback("Logo Generator")}>
        <LogoGeneratorTool aiProvider={aiProvider} tier={account.tier} recordUse={recordToolUse}/>
      </Suspense>
    );
  }

  if(tool.slug==="ai-image-generator"){
    return(
      <Suspense fallback={suspenseFallback("AI Image Generator")}>
        <AIImageGeneratorTool aiProvider={aiProvider} recordUse={recordToolUse}/>
      </Suspense>
    );
  }

  return(
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Input panel */}
      <form onSubmit={run} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Input</p>
            <h3 className="mt-0.5 font-semibold text-gray-900 dark:text-white">{tool.name}</h3>
          </div>
          <Badge variant="gray">{limitLabel}</Badge>
        </div>



        {/* Default input */}
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Topic or query
          <textarea value={input} onChange={e=>setInput(e.target.value)} rows={4} placeholder={`Enter a topic for ${tool.name.toLowerCase()}…`} className="mt-1.5 block w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/>
        </label>

        {/* Upload */}
        {allowImage&&(
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Upload image <span className="text-gray-400">(optional)</span></p>
            <div className="mt-1.5 flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-3 dark:border-gray-700">
              <button type="button" onClick={()=>fileRef.current?.click()} className="shrink-0 flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                <ImageIcon size={14}/> Browse
              </button>
              <p className="text-xs text-gray-400">{imageName||"PNG, JPG, WebP up to 20MB"}</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden"/>
            </div>
            {preview&&<img src={preview} alt="Preview" className="mt-2 h-24 w-full rounded-xl object-cover"/>}
          </div>
        )}

        {err&&<p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{err}</p>}

        <div className="flex flex-wrap items-center gap-2.5">
          <button type="submit" disabled={generating} className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all bg-violet-600 hover:bg-violet-700 shadow-violet-500/20",generating&&"opacity-75 cursor-not-allowed")}>
            {generating?<RefreshCw size={15} className="animate-spin"/>:<WandSparkles size={15}/>}
            {generating?"Generating…":"Generate"}
          </button>
          {account.tier==="premium"&&(
            <button type="button" onClick={()=>saveProject({id:`${tool.slug}-${Date.now()}`,slug:tool.slug,title:`${tool.name} — ${(input||"project").slice(0,32)}`,summary:result?.headline??"",createdAt:new Date().toISOString()})} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              <Plus size={14}/> Save
            </button>
          )}
          {account.tier!=="premium"&&(
            <Link to="/pricing" className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
              <Zap size={13}/> Upgrade
            </Link>
          )}
        </div>
      </form>

      {/* Output panel */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 min-h-[200px]">
          {generating&&(
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <RefreshCw size={24} className="animate-spin text-violet-400"/>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">AI is generating…</p>
              <p className="text-xs text-gray-400">Usually 2–5 seconds</p>
            </div>
          )}
          {!generating&&!result&&(
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <Sparkles size={22} className="text-gray-300 dark:text-gray-600"/>
              <p className="text-sm font-medium text-gray-400">Enter a topic and click Generate</p>
              <p className="text-xs text-gray-400">Powered by real AI — Claude or GPT-4o</p>
            </div>
          )}
          {!generating&&result&&(
            <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Output</p>
                <h4 className="mt-0.5 font-semibold text-gray-900 dark:text-white">{result.headline}</h4>
              </div>
              <Badge variant="gray">{result.score}</Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{result.summary}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {result.blocks.map(block=>(
                <div key={block.label} className="rounded-xl bg-gray-50 p-3.5 dark:bg-gray-800/60">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{block.label}</p>
                  <ul className="mt-2 space-y-1.5">
                    {block.items.map(item=>(
                      <li key={item} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Check size={12} className="mt-0.5 shrink-0 text-emerald-500"/>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {account.tier!=="premium"&&(
              <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/20">
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  <strong>Free plan:</strong> Upgrade to Pro to remove ads and unlock unlimited usage. <Link to="/pricing" className="underline">View plans →</Link>
                </p>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={()=>navigator.clipboard.writeText(result.blocks.map(b=>b.label+":\n"+b.items.join("\n")).join("\n\n"))} className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-gray-900"><Copy size={13}/> Copy all</button>
            </div>
            </>
          )}
        </div>
        <AdSlot placement="After results"/>
      </div>
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
function HomePage(){
  const{account,t,colorTheme}=useSite();
  const{history}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const recentSlugs=filterUnique(history.map(h=>h.slug)).slice(0,4);
  const recentTools=recentSlugs.map(getToolBySlug).filter(Boolean) as Tool[];
  const newTools=tools.filter(tool=>tool.isNew);

  return(
    <>
      <SeoHead title={`${siteName} — Creator + Designer + SEO Toolkit`} description="All-in-one creator toolkit for YouTube, TikTok, Instagram, SEO, logo generation, and AI image creation."/>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 text-white">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:"radial-gradient(circle at 1px 1px,rgba(255,255,255,0.06) 1px,transparent 0)",backgroundSize:"28px 28px"}}/>
        <div className="absolute top-0 left-1/4 h-80 w-80 rounded-full blur-3xl" style={{background:`${ct.color}33`}}/>
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl"/>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 items-center">
            <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.6}} className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-violet-200 backdrop-blur-sm">
                <Sparkles size={14} className="text-violet-300"/> {t("hero.badge")}
              </div>
              <h1 className="text-4xl font-bold tracking-tight leading-tight sm:text-5xl xl:text-6xl">
                {t("hero.title1")}<br/>
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">{t("hero.title2")}</span>
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
                {t("hero.subtitle")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/tools/all-in-one-creator-kit" className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-900 shadow-lg hover:bg-gray-50">
                  <WandSparkles size={16}/> {t("hero.cta1")}
                </Link>
                <Link to="/tools/background-remover" className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/15">
                  <Wand2 size={16}/> Background Remover
                </Link>
                <Link to="/tools" className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 backdrop-blur hover:bg-violet-500/20">
                  <LayoutGrid size={16}/> All Tools
                </Link>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400"/> {t("hero.check1")}</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400"/> {t("hero.check2")}</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400"/> {t("hero.check3")}</span>
              </div>
            </motion.div>

            {/* Hero card */}
            <motion.div initial={{opacity:0,scale:0.96,y:16}} animate={{opacity:1,scale:1,y:0}} transition={{duration:0.7,delay:0.15}}>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl shadow-violet-950/50">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-rose-400"/><div className="h-3 w-3 rounded-full bg-amber-400"/><div className="h-3 w-3 rounded-full bg-emerald-400"/>
                  <span className="ml-3 text-xs text-slate-400">All-in-One Creator Kit</span>
                </div>
                <div className="p-5 grid gap-3 sm:grid-cols-2">
                  {[{l:"Title",v:"Creator growth sprint for your topic"},{l:"Hashtags",v:"#creator #seo #growth #content"},{l:"Thumbnail",v:"High contrast, one promise, bold text"},{l:"Caption",v:"Here's the shortcut most creators miss."},{l:"Keywords",v:"creator, growth, seo, viral, tools"},{l:"Content idea",v:"Teach, compare, and simplify the workflow"},].map(item=>(
                    <div key={item.l} className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{item.l}</p>
                      <p className="mt-1 text-sm text-white">{item.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <PageWrap>
        {/* New tools */}
        {newTools.length>0&&(
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Badge variant="emerald">New</Badge><h2 className="font-bold text-gray-900 dark:text-white">Just added</h2></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {newTools.map(t=><ToolCard key={t.slug} tool={t}/>)}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <SectionTitle eyebrow="Categories" title="Browse by workflow"/>
            <Link to="/categories" className="flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">View all <ArrowRight size={15}/></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map(c=>{const Icon=c.icon;return(
              <Link key={c.slug} to={`/categories/${c.slug}`} className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",c.gradient)}><Icon size={16}/></div>
                <div><p className="text-sm font-semibold text-gray-900 dark:text-white">{c.name}</p><p className="text-xs text-gray-400">{tools.filter(t=>t.category===c.slug).length} tools</p></div>
              </Link>
            )})}
          </div>
        </section>

        {/* Featured tool */}
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <SectionTitle eyebrow={t("label.featured")} title={t("section.featured")} subtitle={t("section.featuredSub")}/>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 dark:border-violet-800 dark:bg-violet-950/10">
            <Workbench tool={featuredTool}/>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            {account.tier!=="premium"&&<AdSlot placement="Above tools"/>}
            {/* Popular tools */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <SectionTitle title={t("section.popularTools")}/>
                <Link to="/tools" className="flex items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-400">{t("btn.allTools")} <ArrowRight size={15}/></Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {topTools.slice(0,9).map(slug=>{const tool=getToolBySlug(slug);return tool?<ToolCard key={slug} tool={tool}/>:null})}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Account */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">{t("label.account")}</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">{account.authenticated?account.name:t("label.guest")}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{account.tier} {t("label.tier")}</p>
              <Link to={account.authenticated?"/dashboard":"/auth/signup"} className="mt-4 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white" style={{background:ct.color}}>
                {account.authenticated?<><LayoutDashboard size={15}/> {t("btn.openDashboard")}</>:<><UserPlus size={15}/> {t("btn.createAccount")}</>}
              </Link>
            </div>
            {/* Recently used */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">{t("label.recentlyUsed")}</p>
              <div className="mt-3 space-y-2">
                {recentTools.length?recentTools.map(tool=>(
                  <Link key={tool.slug} to={`/tools/${tool.slug}`} className="flex items-center gap-2 rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className={cn("h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br flex items-center justify-center text-white",categoryMeta[tool.category].gradient)}>{(() => { const I = categoryMeta[tool.category].icon; return <I size={13}/>; })()}</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{tool.name}</p>
                  </Link>
                )):<p className="text-sm text-gray-400 dark:text-gray-500">{t("label.noRecent")}</p>}
              </div>
            </div>
            <AdSlot placement="Sidebar"/>
          </aside>
        </div>

        {/* Blog preview */}
        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <SectionTitle eyebrow={t("nav.blog")} title={t("section.blog")}/>
            <Link to="/blog" className="flex items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-400">{t("btn.viewAll")} <ArrowRight size={15}/></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {blogPosts.slice(0,4).map(p=>(
              <Link key={p.slug} to={`/blog/${p.slug}`} className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
                <Badge variant="violet">{p.category}</Badge>
                <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{p.title}</h3>
                <p className="mt-1.5 text-xs text-gray-400 line-clamp-2">{p.excerpt}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{p.readingTime}</span><span className="flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400">Read <ArrowRight size={11}/></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Pricing preview */}
        <section className="mt-10">
          <div className="mb-5"><SectionTitle eyebrow="Pricing" title="Simple, transparent plans" subtitle="Try every tool free. Upgrade when you need more." center/></div>
          <div className="grid gap-4 lg:grid-cols-3">
            {pricingPlans.map(plan=>(
              <div key={plan.name} className={cn("relative rounded-2xl border p-6 shadow-sm",plan.featured?"border-violet-300 bg-violet-50/60 dark:border-violet-700 dark:bg-violet-950/20":"border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900")}>
                {plan.badge&&<div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge variant="violet">{plan.badge}</Badge></div>}
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{plan.name}</p>
                <div className="mt-2 flex items-end gap-1"><span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span><span className="pb-1 text-sm text-gray-400">{plan.period}</span></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map(f=><li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"><Check size={14} className="mt-0.5 shrink-0 text-emerald-500"/>{f}</li>)}
                </ul>
                <Link to="/pricing" className={cn("mt-5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold",plan.featured?"bg-violet-600 text-white hover:bg-violet-700":"border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800")}>
                  Get started <ArrowRight size={14}/>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </PageWrap>
    </>
  );
}

function ToolsPage(){
  const[params]=useSearchParams();
  const q=cleanText(params.get("q")??"");
  const filtered=useMemo(()=>{
    const term=q.toLowerCase();
    return tools.filter(t=>!term||t.name.toLowerCase().includes(term)||t.description.toLowerCase().includes(term)||t.category.includes(term));
  },[q]);
  return(
    <>
      <SeoHead title="Tools" description="Browse 60+ creator, image, SEO, logo, and AI tools."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Tools"}]}/>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <SectionTitle title="All Tools" subtitle={`${filtered.length} tools available${q?` for "${q}"`:""}}`}/>
          {q&&<Badge variant="violet">Filtered: {q}</Badge>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(t=><ToolCard key={t.slug} tool={t}/>)}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2"><AdSlot placement="Below tools"/><AdSlot placement="Above tools"/></div>
      </PageWrap>
    </>
  );
}

function CategoriesPage(){
  return(
    <>
      <SeoHead title="Categories" description="Browse creator tools by category."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Categories"}]}/>
        <SectionTitle title="Browse Categories" subtitle="Pick a workflow and explore the tools built for it."/>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map(c=>{const Icon=c.icon;const count=tools.filter(t=>t.category===c.slug).length;return(
            <Link key={c.slug} to={`/categories/${c.slug}`} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white",c.gradient)}><Icon size={22}/></div>
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{c.name}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{c.blurb}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="gray">{count} tools</Badge>
                <span className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">Explore <ArrowRight size={13}/></span>
              </div>
            </Link>
          )})}
        </div>
      </PageWrap>
    </>
  );
}

function CategoryPage(){
  const{slug}=useParams();
  const cat=categories.find(c=>c.slug===slug);
  const catTools=tools.filter(t=>t.category===slug);
  if(!cat)return<NotFound/>;
  const Icon=cat.icon;
  return(
    <>
      <SeoHead title={cat.name} description={cat.blurb}/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Categories",href:"/categories"},{label:cat.name}]}/>
        <div className="mb-6 flex items-center gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",cat.gradient)}><Icon size={26}/></div>
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cat.name}</h1><p className="text-sm text-gray-500 dark:text-gray-400">{catTools.length} tools · {cat.blurb}</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catTools.map(t=><ToolCard key={t.slug} tool={t}/>)}
        </div>
        <div className="mt-6"><AdSlot placement="After category tools"/></div>
      </PageWrap>
    </>
  );
}

function ToolPage(){
  const{slug}=useParams();
  const tool=getToolBySlug(slug);
  if(!tool)return<NotFound/>;
  const meta=categoryMeta[tool.category];
  const Icon=meta.icon;
  const related=tools.filter(t=>t.slug!==tool.slug&&t.category===tool.category).slice(0,5);
  const blogs=blogPosts.slice(0,3);
  const faqs=faqGroups.flatMap(g=>g.questions).slice(0,5);
  return(
    <>
      <SeoHead title={tool.name} description={tool.description}/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Tools",href:"/tools"},{label:meta.name,href:`/categories/${tool.category}`},{label:tool.name}]}/>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white",meta.gradient)}><Icon size={22}/></div>
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tool.name}</h1><p className="text-sm text-gray-500 dark:text-gray-400">{tool.description}</p></div>
          <div className="flex gap-2 ml-auto">{tool.isNew&&<Badge variant="emerald">New</Badge>}{tool.featured&&<Badge variant="violet">Featured</Badge>}</div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <Workbench tool={tool}/>
            <div className="grid gap-4 sm:grid-cols-2"><AdSlot placement="Sidebar"/><AdSlot placement="After results"/></div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Related tools</p>
              <div className="space-y-2">
                {related.map(t=>{const RI=categoryMeta[t.category].icon;return(<Link key={t.slug} to={`/tools/${t.slug}`} className="flex items-center gap-2.5 rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"><div className={cn("h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br flex items-center justify-center text-white",categoryMeta[t.category].gradient)}><RI size={13}/></div><p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p></Link>);})}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Read next</p>
              <div className="space-y-2">
                {blogs.map(b=><Link key={b.slug} to={`/blog/${b.slug}`} className="block rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"><p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{b.title}</p><p className="text-xs text-gray-400">{b.readingTime}</p></Link>)}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">FAQs</p>
              <div className="space-y-1">
                {faqs.map(f=><details key={f.q} className="group rounded-xl border border-gray-100 dark:border-gray-800"><summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200">{f.q}</summary><p className="px-3 pb-3 text-xs text-gray-500 dark:text-gray-400">{f.a}</p></details>)}
              </div>
            </div>
          </aside>
        </div>
      </PageWrap>
    </>
  );
}

function BlogIndex(){
  return(
    <>
      <SeoHead title="Blog" description="Guides for creators, designers, and SEO-focused publishers."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Blog"}]}/>
        <SectionTitle title="Blog" subtitle="SEO-ready guides with table of contents, FAQs, and schema."/>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {blogPosts.map(p=>(
            <Link key={p.slug} to={`/blog/${p.slug}`} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
              <Badge variant="violet">{p.category}</Badge>
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{p.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-3">{p.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400"><span>{p.readingTime}</span><span>{p.updatedAt}</span></div>
            </Link>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2"><AdSlot placement="Blog sidebar"/><AdSlot placement="Below blog"/></div>
      </PageWrap>
    </>
  );
}

function BlogPostPage(){
  const{slug}=useParams();
  const post=getBlogBySlug(slug);
  if(!post)return<NotFound/>;
  return(
    <>
      <SeoHead title={post.title} description={post.excerpt}/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Blog",href:"/blog"},{label:post.title}]}/>
        <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
          <article className="space-y-8">
            <div>
              <Badge variant="violet">{post.category}</Badge>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{post.title}</h1>
              <div className="mt-2 flex gap-4 text-sm text-gray-400"><span>{post.readingTime}</span><span>Updated {post.updatedAt}</span></div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Table of Contents</p>
              <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                {post.sections.map(s=><li key={s.id}><a href={`#${s.id}`} className="hover:text-violet-600 dark:hover:text-violet-400">{s.title}</a></li>)}
                <li><a href="#faqs" className="hover:text-violet-600 dark:hover:text-violet-400">FAQs</a></li>
              </ul>
            </div>
            {post.sections.map((s,i)=>(
              <section key={s.id} id={s.id} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{s.title}</h2>
                {s.paragraphs.map(p=><p key={p} className="text-sm leading-7 text-gray-600 dark:text-gray-400">{p}</p>)}
                {i===0&&<AdSlot placement="Between blog sections"/>}
              </section>
            ))}
            <section id="faqs">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">FAQs</h2>
              <div className="mt-4 space-y-2">
                {post.faqs.map(f=><details key={f.question} className="rounded-2xl border border-gray-200 dark:border-gray-800"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{f.question}</summary><p className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">{f.answer}</p></details>)}
              </div>
            </section>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Related posts</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {post.related.map(slug=>{const r=getBlogBySlug(slug);return r?<Link key={slug} to={`/blog/${slug}`} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 hover:border-violet-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">{r.title}</Link>:null})}
              </div>
            </div>
          </article>
          <aside className="space-y-4">
            <AdSlot placement="Blog sidebar"/>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Popular tools</p>
              <div className="space-y-2">
                {topTools.slice(0,5).map(slug=>{const t=getToolBySlug(slug);return t?<Link key={t.slug} to={`/tools/${t.slug}`} className="block rounded-xl p-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">{t.name}</Link>:null})}
              </div>
            </div>
          </aside>
        </div>
      </PageWrap>
    </>
  );
}

function FaqPage(){
  return(
    <>
      <SeoHead title="FAQ" description="Answers to common questions about Logoviking accounts, tools, pricing, and privacy."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"FAQ"}]}/>
        <SectionTitle title="Frequently Asked Questions" subtitle="Everything you need to know before you subscribe." center/>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {faqGroups.map(group=>(
            <div key={group.title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="font-bold text-gray-900 dark:text-white">{group.title}</h2>
              <div className="mt-3 space-y-1.5">
                {group.questions.map(({q,a})=>(
                  <details key={q} className="rounded-xl border border-gray-100 dark:border-gray-800">
                    <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200">{q}</summary>
                    <p className="px-3 pb-3 text-sm text-gray-500 dark:text-gray-400">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageWrap>
    </>
  );
}

function PricingPage(){
  const{account,setAccount}=useSite();
  return(
    <>
      <SeoHead title="Pricing" description="Free, Creator Pro, and Business plans for the Logoviking toolkit."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Pricing"}]}/>
        <SectionTitle title="Simple pricing" subtitle="Start free. Upgrade when you need more power." center/>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map(plan=>(
            <div key={plan.name} className={cn("relative rounded-2xl border p-6",plan.featured?"border-violet-300 bg-violet-50/60 shadow-lg shadow-violet-500/10 dark:border-violet-700 dark:bg-violet-950/20":"border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900")}>
              {plan.badge&&<div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge variant="violet">{plan.badge}</Badge></div>}
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{plan.name}</p>
              <div className="mt-3 flex items-end gap-1"><span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span><span className="pb-1 text-sm text-gray-400">{plan.period}</span></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map(f=><li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"><Check size={15} className="mt-0.5 shrink-0 text-emerald-500"/>{f}</li>)}
              </ul>
              <button type="button" onClick={()=>setAccount(a=>({...a,authenticated:true,tier:plan.name==="Free"?"free":plan.name==="Creator Pro"?"premium":"premium",name:a.name||"Creator",email:a.email||"hello@logoviking.com",provider:a.provider==="guest"?"email":a.provider}))} className={cn("mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",plan.featured?"bg-violet-600 text-white shadow-md shadow-violet-500/25 hover:bg-violet-700":"border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800")}>
                {plan.name==="Free"?"Start free":plan.featured?"Upgrade to Pro":"Choose Business"} <ArrowRight size={15}/>
              </button>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Current plan: <span className="capitalize text-violet-600 dark:text-violet-400">{account.tier}</span></p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link to="/auth/login" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200">Login</Link>
            <Link to="/auth/signup" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Create account</Link>
          </div>
        </div>
      </PageWrap>
    </>
  );
}

function Dashboard(){
  const{account,history,favorites,projects,clearHistory,deleteProject}=useSite();
  const favTools=tools.filter(t=>favorites.includes(t.slug));
  const topUsed=useMemo(()=>{const m=new Map<string,number>();history.forEach(h=>m.set(h.slug,(m.get(h.slug)??0)+1));return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6);},[history]);
  const lim=TOOL_LIMITS[account.tier];
  return(
    <>
      <SeoHead title="Dashboard" description="Your usage, favorites, history, and saved projects."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Dashboard"}]}/>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <SectionTitle title={`Hey, ${account.authenticated?account.name:"Guest"} 👋`} subtitle="Track your usage, favorites, and saved projects."/>
          <Link to="/account" className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><Settings size={14}/> Settings</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-400 uppercase tracking-widest">Plan</p><p className="mt-1 text-xl font-bold capitalize text-gray-900 dark:text-white">{account.tier}</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-400 uppercase tracking-widest">Total uses</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{history.length}</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-400 uppercase tracking-widest">Daily limit</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{lim===Infinity?"Unlimited":`${lim}/day`}</p></div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-4"><p className="font-semibold text-gray-900 dark:text-white">Recent history</p><button onClick={clearHistory} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 size={13}/> Clear</button></div>
              <div className="space-y-2">
                {history.slice(0,8).map(h=>{const t=getToolBySlug(h.slug);return(<div key={h.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800"><div><p className="text-sm font-medium text-gray-900 dark:text-white">{t?.name??h.slug}</p><p className="text-xs text-gray-400">{h.query||"—"}</p></div><p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</p></div>)})}
                {!history.length&&<p className="text-sm text-gray-400">No history yet. Try a tool to get started.</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <p className="font-semibold text-gray-900 dark:text-white mb-3">Favorites</p>
                <div className="space-y-2">{favTools.length?favTools.map(t=><Link key={t.slug} to={`/tools/${t.slug}`} className="block rounded-xl border border-gray-100 px-3 py-2.5 text-sm font-medium text-gray-900 hover:border-violet-200 dark:border-gray-800 dark:text-white">{t.name}</Link>):<p className="text-sm text-gray-400">No favorites yet.</p>}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <p className="font-semibold text-gray-900 dark:text-white mb-3">Saved projects</p>
                <div className="space-y-2">{projects.length?projects.map(p=><div key={p.id} className="rounded-xl border border-gray-100 px-3 py-2.5 dark:border-gray-800"><p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p><button onClick={()=>deleteProject(p.id)} className="mt-1 flex items-center gap-1 text-xs text-red-400 hover:text-red-500"><Trash2 size={11}/> Delete</button></div>):<p className="text-sm text-gray-400">{account.tier==="premium"?"No projects yet.":"Upgrade to save projects."}</p>}</div>
              </div>
            </div>
          </div>
          <aside className="space-y-4">
            <AdSlot placement="Dashboard sidebar"/>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Top tools used</p>
              <div className="space-y-2">{topUsed.map(([slug,count])=>{const t=getToolBySlug(slug);return t?<Link key={slug} to={`/tools/${slug}`} className="flex items-center justify-between rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"><p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p><Badge variant="gray">×{count}</Badge></Link>:null})}
              {!topUsed.length&&<p className="text-sm text-gray-400">No data yet.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Upgrade to Creator Pro</p>
              <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">Unlimited usage, no ads, batch processing, and saved projects.</p>
              <Link to="/pricing" className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700"><Zap size={14}/> Upgrade now</Link>
            </div>
          </aside>
        </div>
      </PageWrap>
    </>
  );
}

function AccountPage(){
  const{account,setAccount,theme,setTheme}=useSite();
  const[name,setName]=useState(account.name);
  const[email,setEmail]=useState(account.email);
  const[msg,setMsg]=useState("");
  const save=(e:React.FormEvent)=>{
    e.preventDefault();
    if(!email.includes("@")||name.trim().length<2){setMsg("Enter a valid name and email.");return}
    setAccount(a=>({...a,name:cleanText(name),email:cleanText(email),authenticated:true,provider:a.provider==="guest"?"email":a.provider}));
    setMsg("Saved successfully.");
  };
  return(
    <>
      <SeoHead title="Account Settings" description="Manage your Logoviking account, theme, and preferences."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Account"}]}/>
        <SectionTitle title="Account Settings" subtitle="Manage your profile and preferences."/>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_280px]">
          <form onSubmit={save} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name<input value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><Settings size={15}/> Save changes</button>
              <button type="button" onClick={()=>setTheme(theme==="dark"?"light":"dark")} className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">{theme==="dark"?<Sun size={15}/>:<Moon size={15}/>} Toggle theme</button>
              <button type="button" onClick={()=>setAccount(a=>({...a,authenticated:false,tier:"guest",provider:"guest"}))} className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><LogOut size={15}/> Logout</button>
            </div>
            {msg&&<p className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">{msg}</p>}
          </form>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Status</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">{account.name}</p>
              <p className="text-sm text-gray-500">{account.email}</p>
              <p className="text-sm capitalize text-violet-600 dark:text-violet-400">{account.tier} plan</p>
              <Link to="/pricing" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><Zap size={14}/> Manage plan</Link>
            </div>
          </aside>
        </div>
      </PageWrap>
    </>
  );
}

function AuthPage(){
  const{mode}=useParams();
  const nav=useNavigate();
  const{setAccount}=useSite();
  const m=mode??"login";
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[msg,setMsg]=useState("");
  const submit=(e:React.FormEvent)=>{
    e.preventDefault();
    if(m!=="google"&&(!email.includes("@")||pass.length<8)){setMsg("Enter a valid email and a password with at least 8 characters.");return}
    if(m==="forgot"){setMsg("Password reset link sent (demo mode).");return}
    setAccount({name:cleanText(name)||email.split("@")[0]||"Creator",email:cleanText(email)||"creator@logoviking.com",tier:"free",provider:m==="google"?"google":"email",authenticated:true});
    nav("/dashboard");
  };
  return(
    <>
      <SeoHead title={m==="signup"?"Create Account":m==="forgot"?"Reset Password":"Login"} description="Logoviking account access." noIndex/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Auth"},{label:m==="signup"?"Signup":m==="forgot"?"Forgot Password":m==="google"?"Google":"Login"}]}/>
        <div className="mx-auto max-w-sm">
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600"><Shield size={22} className="text-white"/></div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{m==="signup"?"Create free account":m==="forgot"?"Reset your password":m==="google"?"Continue with Google":"Welcome back"}</h1>
              <p className="mt-1 text-sm text-gray-400">{siteName} — Creator Toolkit</p>
            </div>
            <form onSubmit={submit} className="space-y-3">
              {m==="signup"&&<label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>}
              {m!=="google"&&<label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>}
              {m!=="google"&&m!=="forgot"&&<label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Password<input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Min. 8 characters" className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>}
              {msg&&<p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{msg}</p>}
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700">
                {m==="signup"?<><UserPlus size={15}/> Create account</>:m==="forgot"?<><Mail size={15}/> Send reset link</>:m==="google"?<><Globe size={15}/> Continue with Google</>:<><LogIn size={15}/> Sign in</>}
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-400">
              <Link to="/auth/login" className="hover:text-violet-600 dark:hover:text-violet-400">Login</Link>·
              <Link to="/auth/signup" className="hover:text-violet-600 dark:hover:text-violet-400">Sign up</Link>·
              <Link to="/auth/forgot" className="hover:text-violet-600 dark:hover:text-violet-400">Forgot password</Link>·
              <Link to="/auth/google" className="hover:text-violet-600 dark:hover:text-violet-400">Google login</Link>
            </div>
          </div>
        </div>
      </PageWrap>
    </>
  );
}

function TrustPage(){
  const{page}=useParams();
  const content=trustPages[page??"about"];
  if(!content)return<NotFound/>;
  return(
    <>
      <SeoHead title={content.title} description={content.description}/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:content.title}]}/>
        <SectionTitle title={content.title} subtitle={content.description}/>
        <div className="mt-6 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          {content.sections.map(s=>(
            <section key={s.heading} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{s.heading}</h2>
              {s.paragraphs.map(p=><p key={p} className="text-sm leading-7 text-gray-600 dark:text-gray-400">{p}</p>)}
            </section>
          ))}
        </div>
        {page==="contact"&&<ContactForm/>}
      </PageWrap>
    </>
  );
}

function ContactForm(){
  const[form,setForm]=useState({name:"",email:"",message:""});
  const[note,setNote]=useState("");
  const submit=(e:React.FormEvent)=>{e.preventDefault();if(form.message.length<12||!form.email.includes("@")||isSpammy(form.message)){setNote("Enter a valid message without spam patterns.");return}setNote("Thanks! Your message is on its way (demo mode).");};
  return(
    <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Send us a message</h3>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name<input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email<input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Message<textarea rows={4} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} className="mt-1 block w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
        {note&&<p className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm dark:bg-gray-800">{note}</p>}
        <button type="submit" className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Send message <ArrowRight size={15}/></button>
      </form>
    </div>
  );
}

function NotFound(){
  const{t,colorTheme}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  return(
    <>
      <SeoHead title="Not Found" description="Page not found." noIndex/>
      <PageWrap className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"><Search size={28} className="text-gray-400"/></div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("label.notFound")}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("label.notFoundSub")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{background:ct.color}}><Home size={15}/> {t("nav.home")}</Link>
          <Link to="/tools" className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"><LayoutGrid size={15}/> {t("label.browseTools")}</Link>
        </div>
      </PageWrap>
    </>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer(){
  const{t,colorTheme}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const footerNavKeys:[string,string][]=[["nav.home","/"],["nav.tools","/tools"],["nav.categories","/categories"],["nav.blog","/blog"],["nav.pricing","/pricing"],["nav.faq","/faq"],["nav.dashboard","/dashboard"]];
  return(
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/images/logoviking-helmet-logo.png"
                alt="Logoviking logo"
                className="h-16 w-16 object-contain"
                loading="lazy"
              />
              <div><p className="font-bold text-gray-900 dark:text-white">Logoviking</p><p className="text-xs" style={{color:ct.color}}>{t("label.tagline")}</p></div>
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t("label.footerDesc")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">{t("label.footerProduct")}</p>
            <div className="space-y-2">{footerNavKeys.map(([key,h])=><Link key={h} to={h} className="block text-sm text-gray-600 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400">{t(key)}</Link>)}</div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">{t("label.footerCategories")}</p>
            <div className="space-y-2">{categories.map(c=><Link key={c.slug} to={`/categories/${c.slug}`} className="block text-sm text-gray-600 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400">{c.name}</Link>)}</div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">{t("label.footerLegal")}</p>
            <div className="space-y-2">{trustLinks.map(([l,h])=><Link key={l} to={h} className="block text-sm text-gray-600 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400">{l}</Link>)}</div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 text-xs text-gray-400 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Logoviking.com — {t("label.footerCopy")}</p>
          <div className="flex gap-4">
            <Link to="/auth/login" className="hover:text-violet-600">{t("nav.login")}</Link>
            <Link to="/pricing" className="hover:text-violet-600">{t("nav.pricing")}</Link>
            <Link to="/tools" className="hover:text-violet-600">{t("nav.tools")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Back to top ──────────────────────────────────────────────────────────────
function BackToTop(){
  const{colorTheme}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const[show,setShow]=useState(false);
  useEffect(()=>{const h=()=>setShow(window.scrollY>600);window.addEventListener("scroll",h,{passive:true});h();return()=>window.removeEventListener("scroll",h);},[]);
  if(!show)return null;
  return(
    <button onClick={scrollTop} className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg" style={{background:ct.color}} aria-label="Back to top">
      <ArrowUpRight size={18} className="-rotate-45"/>
    </button>
  );
}
