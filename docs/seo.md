# 🚀 VEX Deals - SEO & AI-Search Architecture Guide

This document provides a comprehensive overview of the technical SEO, AI-search discoverability (Generative Engine Optimization - GEO), multi-domain canonicalization, structured data, crawler access rules, and automated test harness in the **VEX Deals** production web application.

---

## 🛠️ Architecture Overview

The VEX Deals application uses a full-stack Node.js + Express + React + Vite + TypeScript architecture that serves 5 domains. The server dynamically pre-renders SEO metadata, Open Graph cards, Twitter Cards, Schema.org JSON-LD structured data, dynamic `robots.txt`, and XML sitemaps based on the incoming `Host` header.

### Key Capabilities:
1. **Dynamic Multi-Domain Handling**: Whitelists allowed hosts (`vex.deals`, `betjam.sbs`, `betongame.cloud`, `1xbetservices.com`, `vixo.uno`) to prevent Host Header Injection attacks while serving domain-tailored metadata.
2. **Server-Side Meta Pre-Rendering**: Pre-renders `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph, and Twitter Cards directly into the HTML response before sending to crawlers.
3. **Dynamic XML Sitemap (`/sitemap.xml`)**: Returns schema-compliant XML sitemaps with zero `#` hash fragments and zero private `/admin` routes.
4. **Dynamic Robots.txt (`/robots.txt`)**: Explicitly allows search crawlers (`Googlebot`, `Bingbot`) and AI search agents (`Google-Extended`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Applebot`), while blocking private routes (`/admin`, `/api/`).
5. **Admin Route Protection**: Forces `<meta name="robots" content="noindex, nofollow" />` on all admin endpoints (`/admin`).
6. **Domain Redirect Alias**: Issues a 301 Permanent Redirect for alias domain requests (`vixo.uno` -> `https://vex.deals`).

---

## 🤖 AI Search & Generative Engine Optimization (GEO)

To maximize eligibility for AI answer engines (ChatGPT Search, Perplexity, Gemini, Bing Copilot):

1. **Factual Clarity & Structure**: Every major section provides direct, explicit definitions ("What is VEX Deals?", "How does loss compensation work?", "How to unfreeze balance?").
2. **Structured Data (Schema.org JSON-LD)**: Every public page embeds valid JSON-LD graph objects containing `SoftwareApplication`, `WebSite`, `Organization`, and `FAQPage`.
3. **No Deceptive Cloaking / No Fake Prompts**: Content is human-first, defensible, and structured for fast factual extraction.
4. **AI Crawler Access**: `OAI-SearchBot`, `Google-Extended`, `PerplexityBot`, `ClaudeBot`, and `ChatGPT-User` are explicitly allowed in `robots.txt`.

---

## 🗺️ Canonical URL & Route Mapping

| Clean Route | Purpose | Indexable | Canonical URL Example |
| :--- | :--- | :--- | :--- |
| `/` | Main Homepage & Overview | YES | `https://vex.deals/` |
| `/companies` | Verified Partners & Bonus Codes | YES | `https://vex.deals/companies` |
| `/wallets` | Digital Balance & Wallet Tracking | YES | `https://vex.deals/wallets` |
| `/ai-sports` | Gemini AI Sports Predictions | YES | `https://vex.deals/ai-sports` |
| `/referrals` | Referral Program & Rewards (10%) | YES | `https://vex.deals/referrals` |
| `/transfers` | Anti-Collusion P2P Transfers | YES | `https://vex.deals/transfers` |
| `/activity` | Cashback Requests & Activity Log | YES | `https://vex.deals/activity` |
| `/unlucky-wall` | Loss Slips & Solidarity Pool | YES | `https://vex.deals/unlucky-wall` |
| `/lottery` | Daily & Weekly Mega Draw | YES | `https://vex.deals/lottery` |
| `/responsible-gaming` | Responsible Gaming Policy (18+) | YES | `https://vex.deals/responsible-gaming` |
| `/legal` | Terms of Service & Privacy | YES | `https://vex.deals/legal` |
| `/admin` | Operations Console | NO (`noindex`) | Hidden from crawlers |

---

## 🧪 Running Automated SEO Tests

Run the automated SEO validation suite locally or in CI/CD:

```bash
npm run seo:audit
```

This script verifies:
- Multi-domain matrix entries
- Robots.txt syntax and crawler rules
- XML Sitemap schema validity (zero `#` hashes, zero `/admin`)
- Host header sanitization and 301 alias redirect
- Title, meta description, and canonical link injection
