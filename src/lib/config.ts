export const config = {
  sporttery: {
    baseUrl: process.env.SPORTTERY_BASE_URL || 'https://www.sporttery.cn',
    jcUrl: process.env.SPORTTERY_JC_URL || 'https://www.sporttery.cn/jc/jsq/zqhhgg/',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || '',
    baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
    model: process.env.MINIMAX_MODEL || 'MiniMax-M3',
    timeout: 60000,
  },
  news: {
    rssFeeds: (process.env.NEWS_RSS_FEEDS || '').split(',').filter(Boolean),
  },
  scheduler: {
    syncCron: process.env.SYNC_CRON || '*/5 * * * *',
    predictCron: process.env.PREDICT_CRON || '*/5 * * * *',
    newsCron: process.env.NEWS_CRON || '*/15 * * * *',
  },
  prediction: {
    monteCarloIterations: 100000,
    eloKFactor: 32,
    eloHomeAdvantage: 100,
  },
};

export type AppConfig = typeof config;
