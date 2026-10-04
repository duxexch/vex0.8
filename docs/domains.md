# 🌐 VEX Deals - Multi-Domain Architecture Matrix

This document defines the multi-domain strategy, host resolution rules, brand classifications, and canonicalization policies across all 5 domains in the VEX Deals network.

---

## 📋 Multi-Domain Classification Matrix

| Domain | Role | Indexable | Canonical Base | Redirect Target | Primary Brand / Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `vex.deals` | **Primary Domain** | YES | `https://vex.deals` | N/A | Flagship platform for VEX Deals loyalty, loss compensation, wallet tracking, and AI sports forecasting. |
| `betjam.sbs` | **Secondary Brand** | YES | `https://betjam.sbs` | N/A | Dedicated Betjam Agency Partner Portal & Royal Cashback Hub (Code: `VEDO2002`). |
| `betongame.cloud` | **Secondary Brand** | YES | `https://betongame.cloud` | N/A | Dedicated BetOnGame Gaming Partner Portal & Loss Recovery Hub. |
| `1xbetservices.com` | **Secondary Brand** | YES | `https://1xbetservices.com` | N/A | Dedicated 1xBet Verified Agency Services & Instant Cashback Hub. |
| `vixo.uno` | **Alias / Redirect** | NO | `https://vex.deals` | `https://vex.deals` | Alias domain issuing a permanent 301 redirect to `https://vex.deals`. |

---

## 🔒 Host Header Security & Sanitization

To prevent **Host Header Injection Attacks** (where an attacker crafts a malicious `Host: attacker.com` header to manipulate generated canonical links or sitemap URLs):

1. The server resolves the incoming host using `resolveCleanHost(req)` in `server/seoEngine.ts`.
2. Hostnames are sanitized (stripping ports, stripping `www.`, and converting to lowercase).
3. If the host is not in the allowed whitelist, the server defaults safely to `vex.deals`.
4. If the host is `vixo.uno` or an alias role, the server immediately returns a `301 Permanent Redirect` to `https://vex.deals`.

---

## 🤖 Dynamic Robots & Sitemap Strategy

Each active domain serves its own domain-matched XML sitemap and robots.txt file:
- Requests to `https://betjam.sbs/sitemap.xml` return sitemap entries prefixed with `https://betjam.sbs/`.
- Requests to `https://1xbetservices.com/robots.txt` output `Sitemap: https://1xbetservices.com/sitemap.xml`.
- Non-indexable alias domain `vixo.uno` outputs `Disallow: /` in `/robots.txt`.
