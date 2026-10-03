# VEX Deals - AI Agent Master Prompt & Execution Guide

If you are an AI coding agent or developer taking over, modifying, or deploying this project, read this file to understand the architecture, terminal commands, Android APK compilation, and Git automation workflows.

---

## 🚀 Quick Start Prompt for AI Agents
> "You are managing the VEX Deals Loyalty, Compensation, Lottery, and AI Sports Forecasting Platform. This project is a full-stack Node.js + Express + TypeScript + Vite React application featuring real-time Socket.io communication, Gemini AI tactical match analysis, Firebase Firestore/Auth, Firebase Cloud Messaging (FCM), Capacitor Android support, and a built-in Docker background notification worker (`server.ts`).
> Your goal is to ensure the app builds cleanly via `npm run build`, passes type checks via `npm run lint`, starts successfully via `npm start`, and can be synchronized to Android APK via `npm run apk:build`."

---

## 🛠️ Project Architecture & Stack
- **Frontend**: React 19 / 18, Vite 6, Tailwind CSS v4, Lucide React, Recharts, Motion (from `motion/react`), Canvas-Confetti.
- **Backend**: Node.js, Express, TypeScript, Socket.io (real-time communication & auto-reconnection), `@google/genai` (v2.4.0).
- **Database & Storage**: Firebase Firestore & Auth (`firebase-applet-config.json`, `firestore.rules`).
- **Push Notifications**: Firebase Cloud Messaging (FCM) + Background Notification Worker (`server.ts`).
- **Mobile Native**: Capacitor 7+ Android (`capacitor.config.json`, `deals.vex.app`).
- **Production Server**: Bundled CommonJS bundle `dist/server.cjs` via `esbuild`.

---

## 💻 Essential Terminal Commands

### 1. Installation & Preparation
```bash
npm install
```

### 2. Development Mode (Hot Reloading Web + Server)
```bash
npm run dev
```
*(Starts Express server with Vite middleware on port 3000 at `http://localhost:3000`)*

### 3. Type Checking & Code Verification
```bash
npm run lint
```
*(Runs `tsc --noEmit` to verify all TypeScript interfaces, JSX syntax, and imports)*

### 4. Full Production Build (Web + Server Bundle)
```bash
npm run build
```
*(Compiles Vite client assets into `dist/` and bundles `server.ts` into `dist/server.cjs` via esbuild)*

### 5. Production Start (Node Server)
```bash
npm start
# OR
npm run prod
```
*(Runs `node dist/server.cjs` on port 3000 with the background notification daemon)*

---

## 📱 Android APK Local Build Workflow (Capacitor)

The project is pre-configured with Capacitor (`capacitor.config.json` with appId `deals.vex.app`).

### Prerequisites on Local Machine:
- **Node.js** (v18+ or v20+)
- **Java Development Kit (JDK 17 or JDK 21)**
- **Android SDK & Command-line Tools / Android Studio**

### Step-by-Step Commands:

1. **One-Command Automated APK Build (Debug)**:
   ```bash
   npm run apk:build
   # OR
   bash ./scripts/build-apk.sh debug
   ```
   *Generated Output*: `android/app/build/outputs/apk/debug/app-debug.apk`

2. **Build Release APK**:
   ```bash
   npm run apk:build:release
   # OR
   bash ./scripts/build-apk.sh release
   ```
   *Generated Output*: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

3. **Sync Web Assets Only to Android**:
   ```bash
   npm run apk:sync
   ```
   *(Builds frontend and syncs `dist/` to `android/app/src/main/assets/public`)*

4. **Open in Android Studio (Visual Debugger & Device Emulator)**:
   ```bash
   npm run apk:open
   ```

5. **Direct USB Install to Connected Phone / Emulator via ADB**:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## 🔄 Smart Git Commit & Push Workflow

We provide an automated synchronization script `./scripts/git-sync.sh`:

### 1. Commit and Push with Custom Message:
```bash
npm run git:sync -- "feat: add 30-min lottery push alert and celebrate animation"
# OR
bash ./scripts/git-sync.sh "feat: add 30-min lottery push alert and celebrate animation"
```

### 2. Auto-Timestamped Commit & Push:
```bash
npm run git:sync
```

### What `git-sync.sh` does automatically:
1. Runs `npm run lint` (`tsc --noEmit`) to ensure zero build errors before committing.
2. Stages all changed and untracked files (`git add -A`).
3. Formats commit message.
4. Detects current active branch (e.g., `main`).
5. Pushes to `origin/<current-branch>`.

---

## 🐳 Docker Deployment
The project includes a production `Dockerfile` and `docker-compose.yml`.
```bash
# Build Docker image
docker build -t vex-deals .

# Run Docker container
docker run -d -p 3000:3000 --name vex-app -e GEMINI_API_KEY=your_key vex-deals
```

---

## 📁 Key File Locations & Directories
- `/src/components/LotteryTab.tsx`: Main Lottery UI, ticket selector, draws, countdown timer, and alert triggers.
- `/src/components/lottery/LotteryPrizeCards.tsx`: Glassmorphism prize tier cards with rule details modal.
- `/src/components/lottery/LotteryWinningsHistory.tsx`: User won prize history, digital receipts, and golden celebration confetti.
- `/src/components/lottery/LotteryTierAlertsModal.tsx`: Customized 30-min pre-draw alerts per prize tier via Firebase Cloud Messaging (FCM).
- `/src/services/lotteryService.ts`: Core state management, ticket cryptosecurity, localStorage & Firestore sync.
- `/server.ts`: Full-stack Express backend, Socket.io, Gemini AI analysis, and Docker background notification worker.
- `/scripts/build-apk.sh`: Automated local Android APK build script.
- `/scripts/git-sync.sh`: Automated Git lint, stage, commit & push script.
- `/capacitor.config.json`: Mobile app manifest configuration.
