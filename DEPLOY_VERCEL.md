# 🚀 Deploy Logoviking to Vercel via GitHub

## Step 1 — Push to GitHub

```bash
git add .
git commit -m "feat: real AI tools, logo generator, image generator"
git push origin main
```

Vercel auto-deploys on every push. Done.

---

## Step 2 — Add API Keys in Vercel (REQUIRED for AI tools to work)

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these (at least one AI key is required):

| Name | Value | Required |
|------|-------|----------|
| `VITE_ANTHROPIC_API_KEY` | `sk-ant-api03-...` | For Claude AI |
| `VITE_OPENAI_API_KEY` | `sk-proj-...` | For GPT-4o |

After adding keys → click **Redeploy** (or push a new commit).

**Get keys:**
- Anthropic: https://console.anthropic.com/settings/keys
- OpenAI: https://platform.openai.com/api-keys

**⚠️ Set spending limits** on both dashboards before going live — this protects you if traffic spikes.

---

## Step 3 — Optional extras

| Variable | Where to get it | What it enables |
|----------|----------------|-----------------|
| `VITE_GA_MEASUREMENT_ID` | Google Analytics → Admin → Data streams | Traffic analytics |
| `VITE_ADSENSE_PUBLISHER_ID` | AdSense → Sites → ads.txt | Ad revenue (free plan) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers | Real payments |

---

## What's working now

✅ **AI Image Generator** — Free, no API key needed. Powered by Flux via Pollinations.ai  
✅ **Logo Generator** — AI-powered brand concepts with real colors, fonts, rationale. Requires API key.  
✅ **Background Remover** — Real on-device AI (~30MB model). No API key, 100% browser.  
✅ **60+ text tools** — All powered by real Claude/GPT-4o. Requires API key.  
✅ **AI Provider toggle** — Users can switch between Claude and GPT-4o in the theme picker.  
✅ **15 languages** — Full translations  
✅ **SEO** — Sitemaps, robots.txt, OG tags, schema markup all configured  
✅ **Vercel** — Clean URLs, security headers, caching, SPA routing  

---

## Cost estimate

| Plan | AI calls/day | Cost/day |
|------|-------------|----------|
| Free tier users (25 uses/day × 100 users) | 2,500 | ~$0.25 with Claude Haiku |
| Premium users (unlimited) | depends on usage | ~$0.001 per call |
| Image generator | Free | $0 — uses Pollinations.ai |

At $9.99/month Pro plan, you break even at ~2 paying subscribers.

---

## After deploying — verify checklist

- [ ] Visit `/tools/logo-generator` → enter a brand name → concepts appear
- [ ] Visit `/tools/ai-image-generator` → enter a prompt → image generates
- [ ] Visit `/tools/background-remover` → upload a photo → background removed
- [ ] Visit `/tools/all-in-one-creator-kit` → enter a topic → real AI results appear
- [ ] Visit `/robots.txt` → returns plain text
- [ ] Visit `/sitemap-index.xml` → returns XML with 4 child sitemaps
- [ ] Theme picker → AI Provider section shows Claude / GPT-4o toggle
- [ ] Open DevTools → no console errors
