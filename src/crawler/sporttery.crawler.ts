import axios, { AxiosInstance } from 'axios';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { safeNumber } from '@/utils/parser';
import type { MatchInfo } from '@/types/match';

const SPORTTERY_API = 'https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry';
const SPORTTERY_PAGE = 'https://www.sporttery.cn/jc/jsq/zqhhgg/';

export class SportteryCrawler {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.sporttery.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': config.sporttery.userAgent,
        Accept: 'application/json,text/plain,*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        Referer: SPORTTERY_PAGE,
        Origin: config.sporttery.baseUrl,
      },
    });
  }

  /**
   * 抓取竞彩网所有比赛
   */
  async fetchMatches(): Promise<MatchInfo[]> {
    logger.info('开始抓取竞彩网真实数据...');

    try {
      const r = await this.client.get(SPORTTERY_API, {
        params: { channel: 'wap' },
        timeout: 30000,
      });

      const data = r.data;
      if (!data || !data.value || !data.value.matchInfoList) {
        logger.warn('竞彩网 API 返回数据为空');
        return [];
      }

      const allMatches: MatchInfo[] = [];
      for (const dayGroup of data.value.matchInfoList) {
        for (const m of dayGroup.subMatchList || []) {
          const parsed = this.parseMatch(m);
          if (parsed) allMatches.push(parsed);
        }
      }

      logger.info(`竞彩网 API 抓取到 ${allMatches.length} 场比赛`);
      return allMatches;
    } catch (e: any) {
      logger.error('竞彩网 API 抓取失败', { error: e.message, status: e.response?.status });
      return [];
    }
  }

  /**
   * 解析单场比赛
   */
  private parseMatch(m: any): MatchInfo | null {
    if (!m || !m.homeTeamAllName || !m.awayTeamAllName) return null;

    // 胜平负
    const had = m.had || {};
    const hhad = m.hhad || {};
    const crs = m.crs || {};
    const ttg = m.ttg || {};
    const hafu = m.hafu || {};

    // 比分赔率
    const scoreOdds: Record<string, number> = {};
    for (const key of Object.keys(crs)) {
      // 匹配 s00s00, s01s02 等格式
      const m2 = key.match(/^s(\d+)s(\d+)$/);
      if (m2) {
        const v = safeNumber(crs[key]);
        if (v > 0) {
          scoreOdds[`${m2[1]}-${m2[2]}`] = v;
        }
      }
    }

    // 半全场赔率
    const halfFullOdds: Record<string, number> = {};
    for (const key of Object.keys(hafu)) {
      // 匹配 hh, hd, ha, dh, dd, da, ah, ad, aa
      const m2 = key.match(/^([hda])([hda])$/);
      if (m2) {
        const v = safeNumber(hafu[key]);
        if (v > 0) {
          const map: Record<string, string> = { h: '胜', d: '平', a: '负' };
          halfFullOdds[`${map[m2[1]]}${map[m2[2]]}`] = v;
        }
      }
    }

    // 总进球赔率 (s00, s01, ... s07+)
    const totalGoalsOdds: Record<string, number> = {};
    for (let i = 0; i <= 7; i++) {
      const key = `s${i}`;
      if (ttg[key]) {
        totalGoalsOdds[i.toString()] = safeNumber(ttg[key]);
      }
    }
    if (ttg.s7plus) {
      totalGoalsOdds['7+'] = safeNumber(ttg.s7plus);
    }

    // 比赛时间
    const matchTime = `${m.businessDate || ''} ${m.matchTime || ''}`.trim();

    return {
      matchId: String(m.matchId || m.matchNum || ''),
      league: m.leagueAllName || m.leagueAbbName || '竞彩足球',
      homeTeam: m.homeTeamAllName,
      awayTeam: m.awayTeamAllName,
      matchTime,
      status: m.matchStatus || 'scheduled',
      homeScore: m.homeScore != null ? safeNumber(m.homeScore) : undefined,
      awayScore: m.awayScore != null ? safeNumber(m.awayScore) : undefined,
      odds: {
        win: safeNumber(had.h),
        draw: safeNumber(had.d),
        lose: safeNumber(had.a),
        handicapLine: safeNumber(hhad.goalLine),
        handicapWin: safeNumber(hhad.h),
        handicapDraw: safeNumber(hhad.d),
        handicapLose: safeNumber(hhad.a),
        overUnderLine: undefined,
        over: undefined,
        under: undefined,
        bothYes: undefined,
        bothNo: undefined,
        scoreOdds: Object.keys(scoreOdds).length > 0 ? scoreOdds : undefined,
        halfFullOdds: Object.keys(halfFullOdds).length > 0 ? halfFullOdds : undefined,
      },
      sourceUrl: SPORTTERY_PAGE,
    };
  }
}

export const sportteryCrawler = new SportteryCrawler();
