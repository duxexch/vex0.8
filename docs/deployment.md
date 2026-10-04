# 🚀 VEX Deals - Production Deployment & Operations Guide

This guide covers building, running, and deploying the VEX Deals application in production using Node.js, Docker, PM2, or Systemd.

---

## ⚡ Quick Production Run Script

To build and run the production server in a single command:

```bash
npm run prod
# OR
./start-production.sh
```

This automated script performs:
1. Dependency verification (`npm install`).
2. Directory preparation (`./data` for persistent storage).
3. Production build (`npm run build` using Vite & esbuild to generate `dist/server.cjs`).
4. Production server launch on port `3000`.

---

## 🐳 Docker & Docker Compose Deployment

### 1. Launch with Docker Compose (Recommended)
```bash
docker-compose up -d --build
```

### 2. View Logs
```bash
docker-compose logs -f
```

### 3. Persistent Data Storage
The host directory `./data` is mounted to `/app/data` inside the container to ensure persistent company directories, wallets, and compensation requests persist across container restarts.

---

## 🛠️ Linux Systemd Service Setup

Service file location: `/etc/systemd/system/vex.service`

```ini
[Unit]
Description=VEX Deals Production Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/vex-deals
ExecStart=/usr/bin/bash /var/www/vex-deals/start-production.sh
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable vex
sudo systemctl start vex
```

---

## 🩺 Production Health & Monitoring Endpoints

| Endpoint | Purpose | Access |
| :--- | :--- | :--- |
| `/api/health` | Health check & Gemini AI status | Public |
| `/robots.txt` | Dynamic robots.txt rules | Public |
| `/sitemap.xml` | Dynamic canonical XML sitemap | Public |
| `/admin` | Standalone Operations Console | PIN Protected (`7788`) |
