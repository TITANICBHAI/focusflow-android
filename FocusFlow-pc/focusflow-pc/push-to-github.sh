#!/bin/bash
# FocusFlow PC — GitHub Push Script
# Run this script with your GitHub Personal Access Token:
#   GITHUB_TOKEN=ghp_xxx bash push-to-github.sh

GITHUB_TOKEN=${GITHUB_TOKEN:-$1}
GITHUB_USER=${GITHUB_USER:-"TITANICBHAI"}
REPO_NAME="focusflow-pc"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Usage: GITHUB_TOKEN=ghp_xxx bash push-to-github.sh"
  echo "  or: bash push-to-github.sh ghp_xxx"
  exit 1
fi

echo "Creating GitHub repo $GITHUB_USER/$REPO_NAME..."

# Create repo
CREATE_RESP=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"FocusFlow PC — Electron desktop app ported from Android\",\"private\":false,\"auto_init\":false}")

echo "$CREATE_RESP" | grep -q '"full_name"' && echo "✓ Repo created" || echo "Repo may already exist, continuing..."

# Init and push
git init
git remote add origin "https://$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git" 2>/dev/null || git remote set-url origin "https://$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git"
git add .
git -c user.email="build@focusflow.app" -c user.name="FocusFlow Build" commit -m "feat: complete FocusFlow PC desktop app

Full Electron + React + TypeScript + Tailwind CSS + SQLite desktop port.
Includes GitHub Actions workflow to build Windows .exe on every push."

git branch -M main
git push -u origin main
echo "✓ Pushed to https://github.com/$GITHUB_USER/$REPO_NAME"
echo "  GitHub Actions will build the .exe automatically!"
