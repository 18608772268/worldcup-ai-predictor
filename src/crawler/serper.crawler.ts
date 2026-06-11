import axios from 'axios';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { safeNumber } from '@/utils/parser';
import { getFifaRanking, eloFromRanking } from '@/lib/fifa-ranking';
import * as cheerio from 'cheerio';

const SERPER_API_KEY = process.env.SERPER_API_KEY || 'f119658091742414faabf840bda7d9d21ab2a7e7';
const SERPER_BASE = 'https://google.serper.dev';

/**
 * 基于 Serper.dev (Google Search) 的真实数据抓取器
 * 通过 Google 搜索获取真实的比赛、新闻、赔率信息
 */
export class SerperCrawler {
  private apiKey: string;

  constructor() {
    this.apiKey = SERPER_API_KEY;
  }

  /**
   * 搜索 Google
   */
  private async search(query: string, num = 10): Promise<any> {
    try {
      const r = await axios.post(
        `${SERPER_BASE}/search`,
        { q: query, num, gl: 'cn', hl: 'zh-cn' },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      return r.data;
    } catch (e: any) {
      logger.warn('Serper 搜索失败', { query, error: e.message });
      return null;
    }
  }

  /**
   * 抓取真实比赛数据 - 通过 Google 搜索 + 直接抓取足球网站
   */
  async fetchMatches(): Promise<number> {
    logger.info('Serper: 抓取真实比赛数据...');

    let totalCount = 0;

    // 1. 通过 Google 搜索"今日比赛赔率"（中文）
    const queries = [
      '今日 足球 比赛 赔率 竞彩',
      '今天 足球 比赛 预测 比分',
      '今晚 足球 比赛 赔率 推荐',
      '近期 世界杯 比赛 赔率',
    ];

    for (const q of queries) {
      try {
        const result = await this.search(q, 20);
        if (!result || !result.organic) continue;

        for (const item of result.organic) {
          const text = item.title + ' ' + (item.snippet || '');
          // 1) 直接从这条结果里提取比赛 + 赔率
          const matches = this.extractMatchesWithOdds(text);
          for (const m of matches) {
            m.sourceUrl = item.link;
            const saved = await this.saveMatch(m);
            if (saved) totalCount++;
          }
        }
      } catch (e: any) {
        logger.warn('搜索失败', { query: q, error: e.message });
      }
    }

    // 2. 尝试直接抓取 FIFA 官方赛程
    try {
      const fifaMatches = await this.scrapeFifaFixtures();
      if (fifaMatches.length > 0) {
        totalCount += await this.saveMatchesBatch(fifaMatches, 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures');
      }
    } catch (e: any) {
      logger.warn('FIFA 抓取失败', { error: e.message });
    }

    // 3. 尝试抓取 ESPN 赛程
    try {
      const espnMatches = await this.scrapeEspnSchedule();
      if (espnMatches.length > 0) {
        totalCount += await this.saveMatchesBatch(espnMatches, 'https://www.espn.com/soccer/schedule/_/league/fifa.world');
      }
    } catch (e: any) {
      logger.warn('ESPN 抓取失败', { error: e.message });
    }

    // 4. 尝试抓取赔率聚合网站
    try {
      const oddsMatches = await this.scrapeOddsPortal();
      if (oddsMatches.length > 0) {
        totalCount += await this.saveMatchesBatch(oddsMatches, 'https://www.oddsportal.com/');
      }
    } catch (e: any) {
      logger.warn('OddsPortal 抓取失败', { error: e.message });
    }

    logger.info(`Serper: 抓取到 ${totalCount} 场比赛`);
    return totalCount;
  }

  /**
   * 从文本中同时提取比赛和赔率
   */
  private extractMatchesWithOdds(text: string): any[] {
    const matches: any[] = [];

    // 提取所有赔率组
    const oddsRegex = /(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})/g;
    const oddsGroups: { win: number; draw: number; lose: number; index: number }[] = [];
    let om: RegExpExecArray | null;
    while ((om = oddsRegex.exec(text))) {
      const win = safeNumber(om[1]);
      const draw = safeNumber(om[2]);
      const lose = safeNumber(om[3]);
      if (win >= 1.01 && draw >= 1.01 && lose >= 1.01 && win < 50 && draw < 50 && lose < 50) {
        oddsGroups.push({ win, draw, lose, index: om.index });
      }
    }

    if (oddsGroups.length === 0) return matches;

    // 提取所有比赛对阵
    const matchRegex = /([A-Z][a-zA-Z\s]{2,30}|[A-Z]{3,4})\s+(?:vs\.?|VS\.?|v\.?)\s+([A-Z][a-zA-Z\s]{2,30}|[A-Z]{3,4})/g;
    let mm: RegExpExecArray | null;
    while ((mm = matchRegex.exec(text))) {
      const home = mm[1].trim();
      const away = mm[2].trim();
      if (home === away || home.length < 2 || away.length < 2) continue;

      // 找到距离这场比赛最近的赔率组
      let nearestOdds: any = null;
      let minDist = Infinity;
      for (const og of oddsGroups) {
        const dist = Math.abs(og.index - mm.index);
        if (dist < minDist) {
          minDist = dist;
          nearestOdds = og;
        }
      }

      if (nearestOdds && minDist < 200) {
        const matchTime = new Date();
        matchTime.setDate(matchTime.getDate() + 1);
        matchTime.setHours(20, 0, 0, 0);

        matches.push({
          homeTeam: home,
          awayTeam: away,
          league: 'Football',
          matchTime: matchTime.toISOString(),
          odds: { win: nearestOdds.win, draw: nearestOdds.draw, lose: nearestOdds.lose },
        });
      }
    }

    return matches;
  }

  /**
   * 抓取 OddsPortal 等赔率聚合站
   */
  private async scrapeOddsPortal(): Promise<any[]> {
    try {
      const r = await axios.get('https://www.oddsportal.com/matches/soccer/', {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const $ = cheerio.load(r.data);
      const matches: any[] = [];

      $('[class*="match"], [class*="event"]').each((_, el) => {
        try {
          const $el = $(el);
          const teams = $el.find('[class*="team"]').map((i, t) => $(t).text().trim()).get();
          const odds = $el.find('[class*="odd"]').map((i, t) => $(t).text().trim()).get();

          if (teams.length >= 2 && odds.length >= 3) {
            const win = safeNumber(odds[0]);
            const draw = safeNumber(odds[1]);
            const lose = safeNumber(odds[2]);
            if (win >= 1.01 && draw >= 1.01 && lose >= 1.01) {
              const matchTime = new Date();
              matchTime.setDate(matchTime.getDate() + 1);
              matchTime.setHours(20, 0, 0, 0);
              matches.push({
                homeTeam: teams[0],
                awayTeam: teams[1],
                league: 'Football',
                matchTime: matchTime.toISOString(),
                odds: { win, draw, lose },
              });
            }
          }
        } catch {}
      });

      return matches;
    } catch (e: any) {
      return [];
    }
  }

  /**
   * 抓取 FIFA 官方赛程
   */
  private async scrapeFifaFixtures(): Promise<any[]> {
    try {
      const r = await axios.get('https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures', {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      return this.parseScheduleFromHtml(r.data, 'FIFA World Cup 2026');
    } catch (e: any) {
      return [];
    }
  }

  /**
   * 抓取 ESPN 赛程
   */
  private async scrapeEspnSchedule(): Promise<any[]> {
    try {
      const r = await axios.get('https://www.espn.com/soccer/schedule/_/league/fifa.world', {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      return this.parseScheduleFromHtml(r.data, 'FIFA World Cup 2026');
    } catch (e: any) {
      return [];
    }
  }

  /**
   * 从 HTML 提取赛程
   */
  private parseScheduleFromHtml(html: string, league: string): any[] {
    const $ = cheerio.load(html);
    const matches: any[] = [];

    // 多种可能的赛程项选择器
    const selectors = [
      '.match-card',
      '.fixture',
      '.match',
      '[data-match-id]',
      'tr.match',
      '.schedule-match',
    ];

    for (const sel of selectors) {
      $(sel).each((_, el) => {
        try {
          const $el = $(el);
          const teams = $el.find('.team-name, .team, [class*="team"]').map((i, t) => $(t).text().trim()).get();
          if (teams.length >= 2) {
            const matchTime = $el.find('.time, .date, [class*="time"], [class*="date"]').text().trim() || '';
            matches.push({
              homeTeam: teams[0],
              awayTeam: teams[1],
              league,
              matchTime: matchTime || new Date().toISOString(),
            });
          }
        } catch {}
      });
      if (matches.length > 0) break;
    }

    return matches;
  }

  /**
   * 批量保存比赛
   */
  private async saveMatchesBatch(matches: any[], sourceUrl: string): Promise<number> {
    let count = 0;
    for (const m of matches.slice(0, 20)) {
      try {
        // 尝试获取真实赔率
        const oddsQuery = `${m.homeTeam} vs ${m.awayTeam} odds`;
        const oddsResult = await this.search(oddsQuery, 3);
        let win: number, draw: number, lose: number;
        if (oddsResult?.organic) {
          const odds = this.extractOdds(oddsResult.organic);
          if (odds) {
            win = odds.win;
            draw = odds.draw;
            lose = odds.lose;
          }
        }
        if (!win || !draw || !lose) continue;

        const saved = await this.saveMatch({
          ...m,
          odds: { win, draw, lose },
          sourceUrl,
        });
        if (saved) count++;
      } catch {}
    }
    return count;
  }

  /**
   * 从文本中提取比赛
   */
  private extractMatchesFromText(text: string): any[] {
    const matches: any[] = [];

    // 1) 标准 "A vs B" 格式
    const re1 = /([A-Z]{2,4}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:vs\.?|VS\.?|v\.?)\s+([A-Z]{2,4}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g;
    let m: RegExpExecArray | null;
    while ((m = re1.exec(text))) {
      matches.push(this.makeMatch(m[1], m[2], text));
    }

    // 2) ESPN "·" 分隔符 "KOR · CZE"
    const re2 = /\b([A-Z]{3,4})\s*·\s*([A-Z]{3,4})\b/g;
    while ((m = re2.exec(text))) {
      matches.push(this.makeMatch(m[1], m[2], text));
    }

    return this.dedupeMatches(matches);
  }

  private makeMatch(home: string, away: string, text: string): any {
    home = home.trim();
    away = away.trim();
    if (home === away || home.length < 2 || away.length < 2) return null;

    let league = 'World Cup 2026';
    if (text.includes('Premier League') || text.includes('英超')) league = 'Premier League';
    else if (text.includes('Champions League') || text.includes('欧冠')) league = 'Champions League';
    else if (text.includes('La Liga') || text.includes('西甲')) league = 'La Liga';
    else if (text.includes('Serie A') || text.includes('意甲')) league = 'Serie A';
    else if (text.includes('Bundesliga') || text.includes('德甲')) league = 'Bundesliga';
    else if (text.includes('Ligue 1') || text.includes('法甲')) league = 'Ligue 1';

    const matchTime = new Date();
    matchTime.setDate(matchTime.getDate() + 1);
    matchTime.setHours(20, 0, 0, 0);

    return { homeTeam: home, awayTeam: away, league, matchTime: matchTime.toISOString() };
  }

  /**
   * 从搜索结果提取赔率
   */
  private extractOdds(organic: any[]): { win: number; draw: number; lose: number } | null {
    for (const item of organic) {
      const text = (item.title + ' ' + (item.snippet || '')).replace(/,/g, '.');
      // 匹配 "3.60 3.20 2.10" 或 "3.60/3.20/2.10" 格式
      // 排除 +140 / -200 美式赔率
      const patterns = [
        // "3.60 3.20 2.10" 空格分隔
        /(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})/,
        // "3.60/3.20/2.10" 斜线分隔
        /(\d+\.\d{2})\s*[\/\-]\s*(\d+\.\d{2})\s*[\/\-]\s*(\d+\.\d{2})/,
      ];

      for (const re of patterns) {
        const m = text.match(re);
        if (m) {
          const win = safeNumber(m[1]);
          const draw = safeNumber(m[2]);
          const lose = safeNumber(m[3]);
          // 1.01-100 范围才合理（排除年份、金额等）
          if (win >= 1.01 && draw >= 1.01 && lose >= 1.01 && win < 100 && draw < 100 && lose < 100) {
            // 排除明显不合理（赔率差异过大）
            if (Math.max(win, draw, lose) / Math.min(win, draw, lose) < 20) {
              return { win, draw, lose };
            }
          }
        }
      }

      // 3) 逗号分隔 "2.25, 3.71, 3.09" 或 "2.25 , 3.71 , 3.09"
      const commaRe = /(\d+\.\d{2})\s*,\s*(\d+\.\d{2})\s*,\s*(\d+\.\d{2})/;
      const cm = text.match(commaRe);
      if (cm) {
        const win = safeNumber(cm[1]);
        const draw = safeNumber(cm[2]);
        const lose = safeNumber(cm[3]);
        if (win >= 1.01 && draw >= 1.01 && lose >= 1.01 && win < 100 && draw < 100 && lose < 100) {
          if (Math.max(win, draw, lose) / Math.min(win, draw, lose) < 20) {
            return { win, draw, lose };
          }
        }
      }
    }
    return null;
  }

  private dedupeMatches(matches: any[]): any[] {
    const seen = new Set<string>();
    const result: any[] = [];
    for (const m of matches) {
      const key = `${m.homeTeam}-${m.awayTeam}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(m);
      }
    }
    return result;
  }

  /**
   * 抓取真实新闻 - 限定为 2026 世界杯相关
   */
  async fetchNews(): Promise<number> {
    logger.info('Serper: 抓取真实新闻...');

    // 只搜 2026 世界杯相关 - 中文搜索确保中文结果
    const queries = [
      '世界杯 2026 球队 伤停 受伤',
      '世界杯 2026 转会 签约',
      '世界杯 2026 主教练 战术',
      '世界杯 2026 阵容 大名单',
      '世界杯 2026 首发 主力',
      '世界杯 2026 球员 状态',
      '梅西 世界杯 2026',
      '姆巴佩 世界杯 2026',
      'C罗 世界杯 2026',
      '世界杯 2026 备战 训练',
      '世界杯 2026 小组赛 预测',
      '世界杯 2026 友谊赛',
    ];

    let totalCount = 0;
    for (const q of queries) {
      try {
        const result = await this.search(q, 20);
        if (!result || !result.organic) continue;

        for (const item of result.organic) {
          try {
            const article = this.parseNewsResult(item, q);
            if (article) {
              await prisma.newsItem.upsert({
                where: { url: article.url },
                update: {
                  title: article.title,
                  summary: article.summary,
                  publishedAt: new Date(article.publishedAt),
                },
                create: {
                  title: article.title,
                  summary: article.summary,
                  url: article.url,
                  source: article.source,
                  sourceType: 'serper',
                  language: 'zh',
                  publishedAt: new Date(article.publishedAt),
                  category: article.category,
                  importance: 5,
                },
              });
              totalCount++;
            }
          } catch (e: any) {
            // ignore
          }
        }
      } catch (e: any) {
        // ignore
      }
    }

    logger.info(`Serper: 抓取到 ${totalCount} 条新闻`);
    return totalCount;
  }

  private parseSearchResult(item: any, query: string): any | null {
    const title = item.title || '';
    const snippet = item.snippet || '';
    const link = item.link || '';

    // 尝试从标题中提取球队和比分
    // 匹配 "A vs B" 或 "A VS B" 或 "A:B"
    const teamMatch = title.match(/([一-龥A-Za-z\s]+)\s*(?:vs|VS|Vs|[:vs]+)\s*([一-龥A-Za-z\s]+)/);
    if (!teamMatch) return null;

    let homeTeam = teamMatch[1].trim();
    let awayTeam = teamMatch[2].trim();

    // 清理球队名（去掉赔率、比分等）
    homeTeam = homeTeam.replace(/\d+\.?\d*/g, '').replace(/[()（）【】\[\]]/g, '').trim().slice(0, 20);
    awayTeam = awayTeam.replace(/\d+\.?\d*/g, '').replace(/[()（）【】\[\]]/g, '').trim().slice(0, 20);

    if (!homeTeam || !awayTeam || homeTeam === awayTeam) return null;

    // 提取赔率（从 snippet 找数字）
    const oddsMatch = snippet.match(/(\d+\.\d+)\s*[\/\\\-]\s*(\d+\.\d+)\s*[\/\\\-]\s*(\d+\.\d+)/);
    let win: number, draw: number, lose: number;
    if (oddsMatch) {
      win = safeNumber(oddsMatch[1]);
      draw = safeNumber(oddsMatch[2]);
      lose = safeNumber(oddsMatch[3]);
    } else {
      // 找不到赔率，使用 ELO 计算合理赔率
      return null; // 没有真实赔率就不要保存
    }

    // 提取联赛
    const leagues = ['世界杯', '英超', '西甲', '德甲', '意甲', '法甲', '中超', '欧冠', '欧联', '亚冠', '世预赛', '欧洲杯', '美洲杯', '友谊赛', '英超联赛'];
    let league = '足球赛事';
    for (const l of leagues) {
      if (title.includes(l) || snippet.includes(l)) {
        league = l;
        break;
      }
    }

    // 提取比赛时间（默认明天）
    const matchTime = new Date();
    matchTime.setDate(matchTime.getDate() + 1);
    matchTime.setHours(20, 0, 0, 0);

    return {
      homeTeam,
      awayTeam,
      league,
      matchTime: matchTime.toISOString(),
      odds: { win, draw, lose },
      sourceUrl: link,
    };
  }

  private parseNewsResult(item: any, query: string): any | null {
    const title = item.title || '';
    const snippet = item.snippet || '';
    const link = item.link || '';

    if (!title || !link) return null;

    // 提取来源
    let source = 'Google News';
    try {
      const url = new URL(link);
      source = url.hostname.replace('www.', '');
    } catch {}

    // 分类
    const text = (title + snippet).toLowerCase();
    let category = 'general';
    if (text.includes('injury') || text.includes('受伤') || text.includes('伤情')) category = 'injury';
    else if (text.includes('transfer') || text.includes('转会')) category = 'transfer';
    else if (text.includes('suspend') || text.includes('停赛')) category = 'suspension';
    else if (text.includes('coach') || text.includes('主帅') || text.includes('教练')) category = 'manager';
    else if (text.includes('training')) category = 'training';
    else if (text.includes('lineup')) category = 'lineup';

    const publishedAt = item.date || new Date().toISOString();

    return {
      title: title.slice(0, 200),
      summary: snippet.slice(0, 500),
      url: link,
      source,
      publishedAt,
      category,
    };
  }

  private async saveMatch(info: any): Promise<boolean> {
    try {
      // 查找或创建球队
      const homeTeam = await this.upsertTeam(info.homeTeam);
      const awayTeam = await this.upsertTeam(info.awayTeam);
      if (!homeTeam || !awayTeam) return false;

      const matchTime = new Date(info.matchTime);
      if (isNaN(matchTime.getTime())) return false;

      const externalId = `serper-${info.homeTeam}-${info.awayTeam}-${matchTime.getTime()}`;

      const match = await prisma.match.upsert({
        where: { matchId: externalId },
        update: {
          oddsWin: info.odds.win,
          oddsDraw: info.odds.draw,
          oddsLose: info.odds.lose,
        },
        create: {
          matchId: externalId,
          league: info.league,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          matchTime,
          status: 'scheduled',
          oddsWin: info.odds.win,
          oddsDraw: info.odds.draw,
          oddsLose: info.odds.lose,
          sourceUrl: info.sourceUrl,
        },
      });

      // 保存赔率历史
      await prisma.oddsHistory.create({
        data: {
          matchId: match.id,
          bookmaker: 'serper',
          oddsWin: info.odds.win,
          oddsDraw: info.odds.draw,
          oddsLose: info.odds.lose,
        },
      });

      return true;
    } catch (e: any) {
      return false;
    }
  }

  private async upsertTeam(name: string) {
    if (!name || name.length < 2) return null;
    const existing = await prisma.team.findFirst({
      where: { OR: [{ name }, { nameEn: name }] },
    });
    if (existing) return existing;
    const rank = getFifaRanking(name);
    return prisma.team.create({
      data: {
        name,
        country: name,
        fifaRanking: rank,
        eloRating: eloFromRanking(rank),
        winRate: 0.30,
        drawRate: 0.25,
        lossRate: 0.45,
        avgGoalsFor: 1.0,
        avgGoalsAgainst: 1.6,
      },
    });
  }
}

export const serperCrawler = new SerperCrawler();
