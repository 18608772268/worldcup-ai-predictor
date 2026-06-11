# World Cup AI Predictor Pro

世界杯AI智能预测分析系统 - 真实数据驱动的AI预测平台

## 技术栈

- **前端**: Next.js 14, TypeScript, TailwindCSS, ECharts
- **数据库**: PostgreSQL (Neon 免费层) + Prisma
- **AI**: Minimax M3
- **爬虫**: Axios + Cheerio + Playwright + Serper.dev
- **调度**: GitHub Actions (无服务器定时)

## 本地开发

```bash
npm install
npx playwright install chromium

# 1. 复制环境变量并填入 Neon 连接串
cp .env.example .env
# 编辑 .env, 填 DATABASE_URL + SERPER_API_KEY

# 2. 初始化数据库
npm run db:generate
npm run db:push
npm run db:seed

# 3. 启动 (前端 + cron)
npm run dev
```

访问 <http://localhost:3000>

## 部署

详细步骤见下方"部署到 Vercel"。

## 定时任务 (GitHub Actions)

| 任务 | 频率 | Workflow |
| --- | --- | --- |
| 同步赛程 + 生成预测 | 每 30 分钟 | `.github/workflows/cron.yml` |
| 抓新闻 | 每 2 小时 | 同上 |
| 球员近期表现 | 每 6 小时 | 同上 |
| 一次性初始化数据库 | 手动 | `.github/workflows/seed.yml` |

## 部署到 Vercel + Neon + GitHub Actions

### 1. 创建 Neon Postgres

1. 打开 <https://console.neon.tech> 注册
2. 创建项目 (区域选离你最近的, 例如 AWS Singapore)
3. 在 Dashboard → Connection Details 拷贝 **Pooled connection string**

   形如: `postgresql://USER:PASS@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

4. 备用: **Direct connection** 也拷贝一份 (db push 用)

### 2. 上传代码到 GitHub

```bash
cd worldcup-ai-predictor
git init
git add .
git commit -m "init"
# 在 GitHub 创建新 repo (空), 然后:
git remote add origin https://github.com/你的用户名/你的repo.git
git push -u origin main
```

### 3. 在 Vercel 部署

1. 打开 <https://vercel.com/new>
2. Import 你的 GitHub repo
3. **Environment Variables** 填:
   - `DATABASE_URL` = Neon Pooled URL
   - `DIRECT_URL` = Neon Direct URL (可选, db push 用)
   - `SERPER_API_KEY` = 你的 Serper key
   - `MINIMAX_API_KEY` / `MINIMAX_BASE_URL` / `MINIMAX_MODEL` (可选)
   - `SPORTTERY_BASE_URL` / `SPORTTERY_JC_URL` (默认即可)
   - `NEWS_RSS_FEEDS` (默认空)
   - `NODE_ENV` = `production`
4. **Build Command** 留默认 (`prisma generate && next build`)
5. 点击 Deploy

部署完成后你会得到 `https://xxx.vercel.app`, 但**此时数据库是空的**。

### 4. 初始化数据库 (一次)

1. 打开 GitHub repo → Actions → "Seed (一次性初始化数据库)"
2. 点击 **Run workflow**
3. 等 1-2 分钟, 完成后到 Vercel 刷新页面就有数据了

> 注: Seed workflow 需要在 repo **Settings → Secrets and variables → Actions** 配:
>
> - `DATABASE_URL` (Neon Pooled)
> - `SERPER_API_KEY`
>
> 其他变量是可选, 不配也能跑 (跳过 AI 分析)。

### 5. GitHub Actions Secrets

必须配的:

- `DATABASE_URL` — Neon Pooled URL
- `SERPER_API_KEY`

可选:

- `MINIMAX_API_KEY` / `MINIMAX_BASE_URL` / `MINIMAX_MODEL`
- `SPORTTERY_BASE_URL` / `SPORTTERY_JC_URL`
- `NEWS_RSS_FEEDS`

### 6. 验证

- Vercel 首页有数据 → ✅
- Actions → Cron Jobs 看到绿勾 → ✅
- 等 30 分钟看 Vercel 数据是否更新 → ✅

### 7. 自定义域名 (可选)

Vercel → Project → Settings → Domains → 添加你的域名。
