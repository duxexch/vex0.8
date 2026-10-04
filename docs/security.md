# 🔒 VEX Deals - Security, Hardening & Compliance Policy

This document outlines the security controls, authentication mechanisms, host header safeguards, rate limiting, and secret management policies in the VEX Deals codebase.

---

## 🛡️ Key Security Features

### 1. Host Header Injection Defense
The server sanitizes incoming `Host` and `X-Forwarded-Host` headers against an explicit domain whitelist (`vex.deals`, `betjam.sbs`, `betongame.cloud`, `1xbetservices.com`, `vixo.uno`). Arbitrary host headers cannot tamper with canonical URLs, Open Graph tags, or sitemap entries.

### 2. Standalone Admin Console Protection (`/admin`)
- Accessible via `/admin` or `#admin`.
- Protected by Master PIN authentication (Default: `7788`, configurable via Admin Settings).
- Injects `<meta name="robots" content="noindex, nofollow" />` so search engines never index or cache administrative operations.
- Excluded from all XML sitemaps and dis-allowed in `robots.txt`.

### 3. In-Memory Rate Limiting
API endpoints under `/api/` are rate-limited to 120 requests per minute per IP address to prevent brute-force attacks, DDoS attempts, and automated credential stuffing.

### 4. HTTP Security Headers
The server sets strict security headers on all responses:
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy`

---

## 🔑 Secret & Credential Policy

1. **Zero Hardcoded Secrets**: Secrets such as `GEMINI_API_KEY` and `TELEGRAM_BOT_TOKEN` are supplied strictly via environment variables or configured dynamically in the encrypted Admin Console.
2. **`.gitignore` Enforcement**: `.env`, `.env.production`, `node_modules/`, and build artifacts are strictly ignored.
3. **Secret Scan Harness**: Secret scanning is executed prior to Git commits (`npm run seo:audit` & `npm run git:sync`).
