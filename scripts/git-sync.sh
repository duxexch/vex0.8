#!/usr/bin/env bash
# ==============================================================================
# 🚀 VEX Deals - Smart Git Commit & Push Automation Script
# 
# Usage:
#   bash ./scripts/git-sync.sh "Your commit message here"
#   OR
#   npm run git:sync -- "Your commit message here"
# ==============================================================================

set -e

# Change directory to project root
cd "$(dirname "$0")/.."

echo ""
echo "=============================================================================="
echo " 📦 VEX DEALS - SMART GIT SYNC & DEPLOYMENT"
echo "=============================================================================="
echo " 📅 Timestamp: $(date)"
echo " 📂 Working Dir: $(pwd)"
echo "=============================================================================="
echo ""

# 1. Check if git repository is initialized
if [ ! -d ".git" ]; then
  echo "⚠️ Git repository not initialized in this directory. Initializing..."
  git init
  git branch -M main
fi

# 2. Check for working tree changes
echo "🔍 [1/5] Checking git status..."
CHANGES=$(git status --porcelain)

if [ -z "$CHANGES" ]; then
  echo "   ℹ️ No changes detected to commit."
  echo "   Checking remote synchronization..."
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  if git remote | grep -q "origin"; then
    echo "   🚀 Pushing existing commits to origin/${CURRENT_BRANCH}..."
    git push origin "$CURRENT_BRANCH" || true
  fi
  echo "✅ Everything up to date!"
  exit 0
fi

echo "   📝 Found changes in working tree:"
git status -s

# 3. Optional Lint / Typecheck before commit
echo ""
echo "🩺 [2/5] Running TypeScript verification (tsc --noEmit)..."
if npm run lint; then
  echo "   ✅ TypeScript check passed cleanly."
else
  echo "   ❌ TypeScript check failed! Please fix compiler errors before pushing."
  exit 1
fi

# 4. Stage all relevant files
echo ""
echo "📁 [3/5] Staging modified and new files..."
git add -A

# 5. Determine commit message
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
  # Auto-generate a descriptive timestamped commit message if none provided
  DATE_STR=$(date +"%Y-%m-%d %H:%M:%S")
  COMMIT_MSG="feat(vex): automatic project update and enhancements [$DATE_STR]"
fi

echo ""
echo "✍️ [4/5] Committing changes with message:"
echo "   \"$COMMIT_MSG\""
git commit -m "$COMMIT_MSG"

# 6. Push to remote
echo ""
echo "🚀 [5/5] Pushing to remote repository..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

if git remote | grep -q "origin"; then
  echo "   Pushing to origin/$CURRENT_BRANCH..."
  git push origin "$CURRENT_BRANCH"
  echo ""
  echo "=============================================================================="
  echo " ✅ SYNC SUCCESSFUL: All changes committed & pushed to origin/$CURRENT_BRANCH"
  echo "=============================================================================="
else
  echo "   ℹ️ No remote 'origin' configured."
  echo "   To configure remote: git remote add origin <YOUR_GITHUB_REPO_URL>"
  echo "   Then push: git push -u origin $CURRENT_BRANCH"
  echo ""
  echo "=============================================================================="
  echo " ✅ LOCAL COMMIT COMPLETE (Remote push skipped)"
  echo "=============================================================================="
fi
