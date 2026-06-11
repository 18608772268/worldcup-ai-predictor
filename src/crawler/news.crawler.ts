import Parser from 'rss-parser';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { NewsArticle } from '@/types/news';

export class NewsCrawler {
  private rssParser: Parser;
  private defaultFeeds: string[];

  constructor() {
    this.rssParser = new Parser({
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    });
    this.defaultFeeds = [
      'https://rsshub.app/qq-sports/news',
      'https://rsshub.app/sina/sports/global',
      'https://rsshub.app/163/sports',
      'https://rsshub.app/sohu/sports',
    ];
  }

  async crawlAll(): Promise<number> {
    let count = 0;
    const feeds = config.news.rssFeeds.length > 0 ? config.news.rssFeeds : this.defaultFeeds;
    for (const url of feeds) {
      try {
        const c = await this.crawlRSS(url);
        count += c;
      } catch (e: any) {
        logger.warn('RSS抓取失败', { url, error: e.message });
      }
    }

    // 同时通过 Serper 抓取中文足球新闻
    try {
      const { serperCrawler } = await import('./serper.crawler');
      count += await serperCrawler.fetchNews();
    } catch (e: any) {
      logger.warn('Serper 新闻抓取失败', { error: e.message });
    }

    return count;
  }

  async crawlRSS(feedUrl: string): Promise<number> {
    const feed = await this.rssParser.parseURL(feedUrl);
    let count = 0;
    for (const item of feed.items || []) {
      if (!item.link || !item.title) continue;
      try {
        const article: NewsArticle = {
          title: item.title,
          summary: item.contentSnippet || item.content,
          content: item.content,
          url: item.link,
          source: feed.title || feedUrl,
          sourceType: 'rss',
          language: 'en',
          publishedAt: item.pubDate || new Date().toISOString(),
          imageUrl: this.extractImage(item),
        };

        article.category = this.classifyNews(article.title + ' ' + (article.summary || ''));
        article.importance = this.scoreImportance(article);

        await this.saveArticle(article);
        count++;
      } catch (e: any) {
        logger.debug('新闻保存失败', { url: item.link, error: e.message });
      }
    }
    logger.info('RSS抓取完成', { feed: feedUrl, count });
    return count;
  }

  private extractImage(item: any): string | undefined {
    if (item.enclosure?.url) return item.enclosure.url;
    if (item['media:content']?.$?.url) return item['media:content'].$.url;
    const match = (item.content || '').match(/<img[^>]+src=["']([^"']+)["']/);
    return match?.[1];
  }

  private classifyNews(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('injury') || t.includes('injured')) return 'injury';
    if (t.includes('suspend') || t.includes('ban')) return 'suspension';
    if (t.includes('transfer') || t.includes('sign')) return 'transfer';
    if (t.includes('coach') || t.includes('manager')) return 'manager';
    if (t.includes('training')) return 'training';
    if (t.includes('lineup')) return 'lineup';
    return 'general';
  }

  private scoreImportance(article: NewsArticle): number {
    let score = 5;
    if (article.category === 'injury') score += 3;
    if (article.category === 'suspension') score += 2;
    if (article.category === 'manager') score += 2;
    if (article.title.toLowerCase().includes('world cup')) score += 2;
    return Math.min(10, score);
  }

  private async saveArticle(article: NewsArticle) {
    const teams = await prisma.team.findMany({
      where: { OR: [{ name: { contains: article.title.split(' ')[0] } }] },
    });
    const teamId = teams[0]?.id;

    await prisma.newsItem.upsert({
      where: { url: article.url },
      update: {
        title: article.title,
        summary: article.summary,
        content: article.content,
        publishedAt: new Date(article.publishedAt),
        category: article.category,
        importance: article.importance,
        imageUrl: article.imageUrl,
        teamId,
      },
      create: {
        title: article.title,
        summary: article.summary,
        content: article.content,
        url: article.url,
        source: article.source,
        sourceType: article.sourceType,
        language: article.language,
        publishedAt: new Date(article.publishedAt),
        category: article.category,
        importance: article.importance,
        imageUrl: article.imageUrl,
        teamId,
      },
    });
  }
}

export const newsCrawler = new NewsCrawler();
