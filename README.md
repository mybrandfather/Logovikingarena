# Logoviking.com

All-in-one **Creator + Designer + SEO Toolkit** built for YouTube, TikTok, Instagram, Pinterest creators, bloggers, designers, marketers, students, and small businesses.

Production-ready, Hostinger-deployable (Node.js 22), with SEO, freemium tiers, multilingual support, themes, AI Logo Generator, AI Image Generator, and 60+ tools.

---

## ✨ Highlights

- 🎨 **60+ creator/designer/SEO tools**
- 🛡️ **AI Logo Generator** (prompt-based, 2 concept output)
- 🪄 **AI Image Generator** (8 styles, 5 ratios)
- 📦 **All-in-One Creator Kit** (titles, hashtags, captions, keywords)
- 🌈 **5 color themes** + Light/Dark mode
- 🌍 **7 languages** (EN, ES, PT, AR with RTL, RU, FR, DE)
- 👤 Guest / Free / Premium tiers
- 🚀 **Full SEO crawl coverage** — all files Google expects

---

## 🔍 SEO crawl files (Google-friendly)

Every file in `public/` is emitted to `dist/` at build time and served by `server.js` with the correct content type and cache headers.

| File | What it's for |
|---|---|
| `/robots.txt` | Crawler rules + sitemap list + AI bot blocking |
| `/sitemap-index.xml` | Master sitemap index (Google reads this first) |
| `/sitemap.xml` | Single combined sitemap (for crawlers that prefer it) |
| `/sitemap-pages.xml` | Static pages + hreflang alternates |
| `/sitemap-tools.xml` | All 60+ tool URLs |
| `/sitemap-categories.xml` | All category pages |
| `/sitemap-blog.xml` | All blog posts with lastmod |
| `/sitemap-images.xml` | Image sitemap (Google Images) |
| `/site.webmanifest` | PWA manifest (Lighthouse) |
| `/manifest.json` | Alias for tools that look for this name |
| `/browserconfig.xml` | Windows tile config |
| `/favicon.svg` | SVG favicon |
| `/favicon.ico` | Legacy favicon (fallback) |
| `/apple-touch-icon.png` | iOS home-screen icon |
| `/og-image.png` | Social share preview (1200×630) |
| `/humans.txt` | Friendly credits file |
| `/ads.txt` | AdSense compliance (empty until approved) |
| `/security.txt` | Security contact (root) |
| `/.well-known/security.txt` | RFC 9116 standard location |
| `/healthz` | Server health check |

### Sample `robots.txt` features
- ✅ Allow Googlebot, Googlebot-Image, Bingbot, DuckDuckBot, Yandex
- 🚫 Block AI training bots (GPTBot, ChatGPT-User, CCBot, Claude-Web, PerplexityBot)
- 🔒 Disallow `/auth`, `/dashboard`, `/account`, `/settings`, `/api`
- 🗺️ All 6 sitemaps referenced

### Verification meta tags
Replace the placeholder `content="REPLACE_WITH_..."` values in `index.html` with your real codes from:
- **Google Search Console** → `google-site-verification`
- **Bing Webmaster Tools** → `msvalidate.01`
- **Yandex Webmaster** → `yandex-verification`
- **Pinterest** → `p:domain_verify`

---

## 🚀 Hostinger Deployment (Node.js 22)

1. Use a **Hostinger Node.js hosting plan** with Node.js 22 support
2. Upload all files to your app root
3. Set the **startup file** to `server.js`
4. Run:
   ```bash
   npm install
   npm run build
   npm start
   ```
5. Point your domain → app URL
6. Verify:
   - `https://logoviking.com/`
   - `https://logoviking.com/robots.txt`
   - `https://logoviking.com/sitemap-index.xml`
   - `https://logoviking.com/healthz`

---

## 📁 Folder Structure

```txt
.
├── public/
│   ├── .well-known/
│   │   └── security.txt
│   ├── images/                    # Logo + AI preview assets
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── og-image.png
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── sitemap-index.xml
│   ├── sitemap-pages.xml
│   ├── sitemap-tools.xml
│   ├── sitemap-categories.xml
│   ├── sitemap-blog.xml
│   ├── sitemap-images.xml
│   ├── site.webmanifest
│   ├── manifest.json
│   ├── browserconfig.xml
│   ├── humans.txt
│   ├── ads.txt
│   └── security.txt
├── src/
│   ├── utils/cn.ts
│   ├── App.tsx                    # SPA (routes, themes, languages, tools)
│   ├── main.tsx
│   └── index.css
├── docs/
│   └── database-structure.md
├── index.html                     # SEO meta, JSON-LD, OG, Twitter, hreflang
├── server.js                      # Hostinger Node.js 22 server
├── vite.config.ts
├── package.json
├── .env.example
└── README.md
```

---

## ⚡ Server features

`server.js` includes:

- ✅ All correct **MIME types** (xml, webmanifest, svg, json, etc.)
- ✅ **Brotli + gzip compression** for text assets
- ✅ Smart **cache headers** (immutable for JS/CSS, no-cache for HTML, 1h for sitemaps)
- ✅ **Security headers** (CSP, HSTS, X-Frame-Options, Referrer-Policy)
- ✅ **CSP whitelists** Google Analytics, AdSense, Fonts, Identity (ready when you enable them)
- ✅ **Rate limiting** (300 req/min per IP, but bypassed for known crawlers)
- ✅ **SPA fallback** for client-side routing
- ✅ Special handling for `/.well-known/*` files
- ✅ `/healthz` endpoint for uptime monitoring

---

## 📜 License

Internal launch project for Logoviking.com.
