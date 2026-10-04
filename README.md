# 🚀 VEX Deals - Production Loyalty, Compensation, Lottery & AI Sports Platform

[![CI/CD Pipeline](https://github.com/vexdeals/vex-deals-app/actions/workflows/ci.yml/badge.svg)](https://github.com/vexdeals/vex-deals-app/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38B2AC.svg)](https://tailwindcss.com/)

---

## 📌 Executive Overview

**VEX Deals** is a multi-domain Node.js + Express + React 19 + TypeScript production application powering betting loss compensation, wallet tracking, referral unfreezing, live lottery draws, and Gemini AI sports forecasting.

The platform operates across **5 production hostnames**:
1. `https://vex.deals` (Primary Canonical Platform)
2. `https://betjam.sbs` (Betjam Partner Portal)
3. `https://betongame.cloud` (BetOnGame Cloud Portal)
4. `https://1xbetservices.com` (1xBet Agency Services)
5. `https://vixo.uno` (Official 301 Permanent Alias Redirect to `vex.deals`)

---

## 🛠️ Architecture & Technology Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide Icons, Recharts, Motion (`motion/react`), Canvas-Confetti.
- **Backend**: Express.js, TypeScript (`tsx`), Socket.io (Real-time updates & heartbeats).
- **AI Engine**: Google GenAI (`@google/genai` v2.4.0) powered by Gemini 2.5 Flash for tactical match analysis.
- **Database & Storage**: Firebase Firestore & Auth + Local JSON persistent store (`/data/store.json`).
- **SEO & AI Search (GEO)**: Dynamic multi-domain `sitemap.xml`, `robots.txt` generator, Schema.org JSON-LD structured data, Host Header Injection Guard, and OpenGraph/Twitter pre-rendering.
- **Mobile Native**: Capacitor 7 Android (`deals.vex.app`) with automated APK build pipeline.

---

## 🌐 Multi-Domain Matrix & Classifications

| Domain | Classification | Indexable | Canonical Base | Role Description |
| :--- | :--- | :--- | :--- | :--- |
| `vex.deals` | Primary Domain | ✅ Yes | `https://vex.deals` | Main VEX Deals loyalty & compensation hub |
| `betjam.sbs` | Secondary Brand | ✅ Yes | `https://betjam.sbs` | Official Betjam partner cashback portal |
| `betongame.cloud` | Secondary Brand | ✅ Yes | `https://betongame.cloud` | BetOnGame cloud rewards & tracking portal |
| `1xbetservices.com` | Secondary Brand | ✅ Yes | `https://1xbetservices.com` | Verified 1xBet agency cashback & services |
| `vixo.uno` | 301 Redirect Alias | ❌ No | `https://vex.deals` | Legacy alias domain redirecting 301 permanently |

---

## 🚦 Getting Started

### 1. Prerequisites
- Node.js v20+
- npm v10+

### 2. Environment Setup
Copy the template and fill in optional keys:
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Testing & Automated Audits

### Run TypeScript Typecheck
```bash
npm run lint
```

### Run Automated SEO & Multi-Domain Audit Harness
```bash
npm run seo:audit
```

### Build Production Artifacts
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

---

## 📁 Repository Structure

```
.
├── .github/workflows/ci.yml     # Automated CI/CD pipeline
├── docs/                         # Architecture & SEO documentation
│   ├── seo.md                    # Technical SEO & AI Search guide
│   ├── domains.md                # Multi-domain matrix specification
│   ├── security.md               # Security & Host Guard policy
│   ├── content-strategy.md       # Content gap & search intent strategy
│   ├── growth-roadmap.md         # 30/60/90-day growth roadmap
│   └── deployment.md             # Production deployment & rollback
├── public/                       # Static public assets (manifest, icons)
├── scripts/                      # Build & audit scripts
│   └── seo-audit.ts              # Automated SEO test harness
├── server/                       # Express server modules
│   ├── seoEngine.ts              # Dynamic multi-domain SEO engine
│   ├── storage.ts                # Persistent storage engine
│   └── agentEngine.ts            # Agent background processing
├── src/                          # React client application
│   ├── components/               # React UI components
│   └── services/                 # Firebase & client services
├── index.html                    # Client entry HTML
├── server.ts                     # Main Express & Socket.io server
├── package.json                  # Dependencies and scripts
└── vite.config.ts                # Vite configuration
```

---

## 🛡️ Security & Operational Integrity

- **Host Header Sanitization**: Express middleware validates incoming `Host` / `X-Forwarded-Host` headers against the allowed domain whitelist to prevent Host Header Injection attacks.
- **No Hardcoded Secrets**: Credentials, private keys, and API tokens are managed strictly via environment variables.
- **Production Data Safeguard**: All storage migrations preserve user balances and transaction records without wiping persistent storage.
