# 📊 VEX Deals - Observability, Logging & Monitoring Specification

## 1. Overview
This document specifies the operational logging, error monitoring, uptime verification, and crawler monitoring architecture for VEX Deals across all 5 production domains.

---

## 2. Health Check Endpoint

### GET `/health`
Returns the application health status, uptime, database connectivity, and timestamp.

**Response Structure:**
```json
{
  "status": "ok",
  "timestamp": "2026-10-04T00:00:00.000Z",
  "uptime": 86400,
  "domainsConfigured": 5,
  "environment": "production"
}
```

---

## 3. Crawler & Traffic Observability

The Express server (`server.ts` & `seoEngine.ts`) records crawler requests for `sitemap.xml`, `robots.txt`, and HTML routes.

### Monitored Bot User Agents:
- **Googlebot**: Standard web indexing
- **Google-Extended**: Gemini / Google AI Search
- **Bingbot**: Bing search & Copilot
- **OAI-SearchBot / ChatGPT-User**: ChatGPT Search
- **PerplexityBot**: Perplexity AI engine
- **ClaudeBot**: Anthropic Claude search

---

## 4. Rate Limiting & Security Monitoring

An in-memory sliding window rate limiter protects `/api/*` endpoints (limit: 120 requests/min per IP). Requests exceeding this limit return HTTP `429 Too Many Requests`.

---

## 5. Rollback & Alerting Strategy

If error rates exceed 1% or health checks fail 3 consecutive times:
1. Trigger automatic traffic failover.
2. Rollback deployment to the previous verified release tag using `npm run start`.
3. Verify database data integrity in `/data/store.json` and Firestore before resuming writes.
