#!/bin/bash
set -e
cd /c/Users/Mayn/worldcup-ai-predictor

echo "=== 1. 写入 .gitignore ==="
cat .gitignore
echo ""

echo "=== 2. git init ==="
git init -b main
git config user.email "deploy@local"
git config user.name "deploy-bot"

echo "=== 3. 添加并提交 ==="
git add .
git commit -m "deploy: world cup ai predictor with neon postgres"
echo "ok"
