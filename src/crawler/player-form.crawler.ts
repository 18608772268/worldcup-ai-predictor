import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const SERPER_URL = 'https://google.serper.dev/search';
const SERPER_KEY = process.env.SERPER_API_KEY || '';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

async function serperSearch(q: string, lang: 'en' | 'cn' = 'en'): Promise<SearchResult[]> {
  try {
    const r = await axios.post(
      SERPER_URL,
      { q, gl: 'us', hl: lang === 'cn' ? 'zh-cn' : 'en', num: 5 },
      { headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' } }
    );
    return r.data?.organic || [];
  } catch (e: any) {
    logger.warn('Serper 球员搜索失败', { q, error: e.message });
    return [];
  }
}

/**
 * 从 snippet 抓数字
 * 例: "18 场 14 球 7 助" / "13 goals 6 assists" / "Games: 17, Goals: 13"
 */
function extractNumbers(snippet: string): { goals?: number; assists?: number; apps?: number } {
  const out: any = {};
  // 中文
  const cn = snippet.match(/(\d+)\s*场\s*(\d+)?\s*球\s*(\d+)?\s*助?/);
  if (cn) {
    out.apps = Number(cn[1]);
    if (cn[2]) out.goals = Number(cn[2]);
    if (cn[3]) out.assists = Number(cn[3]);
  }
  // 英文
  const enGoals = snippet.match(/(\d+)\s*goals?/i);
  const enAssists = snippet.match(/(\d+)\s*assists?/i);
  const enGames = snippet.match(/(\d+)\s*games?\s*played/i);
  if (enGoals) out.goals = Number(enGoals[1]);
  if (enAssists) out.assists = Number(enAssists[1]);
  if (enGames) out.apps = Number(enGames[1]);
  return out;
}

function detectInjury(snippet: string): { injured: boolean; note?: string } {
  const t = snippet.toLowerCase();
  if (/injury|injured|out for|sidelined|doubt|miss.*match|受伤|伤停|缺席|伤情/.test(snippet)) {
    return { injured: true, note: snippet.slice(0, 200) };
  }
  return { injured: false };
}

export class PlayerFormCrawler {
  /**
   * 抓取单个球员的近期表现
   */
  static async fetchPlayerForm(playerId: string): Promise<boolean> {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return false;

    const nameEn = player.nameEn || player.name;
    const nameCn = player.name;

    // 并行搜：中文（球员页） + 英文 stats + 英文 injury
    const [statsCn, injCn, statsEn, injEn] = await Promise.all([
      serperSearch(`${nameCn} 2026 进球 助攻 状态 数据`, 'cn'),
      serperSearch(`${nameCn} 受伤 伤停 2026`, 'cn'),
      serperSearch(`${nameEn} 2026 stats goals assists`),
      serperSearch(`${nameEn} injury news 2026`),
    ]);

    // 摘要优先中文
    const snippets = [
      ...statsCn.slice(0, 2).map(r => r.snippet),
      ...injCn.slice(0, 1).map(r => r.snippet),
      ...statsEn.slice(0, 1).map(r => r.snippet),
    ].filter(Boolean);
    const summary = snippets.slice(0, 3).join(' | ') || '暂无近期表现数据';
    const sourceUrl = statsEn[0]?.link || statsCn[0]?.link || null;

    // 提取数字（更新 goals/assists/appearances）
    const allSnippets = snippets.join(' ');
    const nums = extractNumbers(allSnippets);

    // 伤停 - 优先用中文搜索结果
    const cnInjSnippets = [...injCn, ...statsCn].map(r => r.snippet).join(' ');
    const allInjSnippets = [...injCn, ...injEn, ...statsCn].map(r => r.snippet).join(' ');
    const injury = detectInjury(allInjSnippets);
    const injuryStatus = injury.injured ? 'injured' : player.injuryStatus;
    // 优先用中文 note，英文 note 翻译成"详见英文新闻"占位
    const injuryNote = injury.injured
      ? (cnInjSnippets ? cnInjSnippets.slice(0, 200) : (injury.note || '参见新闻详情'))
      : player.injuryNote;

    // formRating：从数字推算（进球效率）
    let formRating = player.formRating;
    if (nums.goals !== undefined && nums.apps !== undefined && nums.apps > 0) {
      const goalsPerGame = nums.goals / nums.apps;
      const assistsPerGame = (nums.assists || 0) / nums.apps;
      // 0.3 球/场 = 6.5 分，0.5 球/场 = 7.5，0.8 球/场 = 8.5
      formRating = Math.min(9.5, Math.max(5.0, 5.5 + goalsPerGame * 4 + assistsPerGame * 2));
      if (injury.injured) formRating = Math.max(4.5, formRating - 1.0);
    } else if (injury.injured && formRating > 6) {
      formRating = Math.max(4.5, formRating - 1.0);
    }

    await prisma.player.update({
      where: { id: playerId },
      data: {
        recentFormSummary: summary,
        formSourceUrl: sourceUrl,
        formUpdatedAt: new Date(),
        goals: nums.goals ?? player.goals,
        assists: nums.assists ?? player.assists,
        appearances: nums.apps ?? player.appearances,
        injuryStatus: injury.injured ? 'injured' : (player.injuryStatus === 'injured' ? null : player.injuryStatus),
        injuryNote: injury.injured ? injuryNote : player.injuryNote,
        formRating,
      },
    });

    logger.info('球员近期表现已更新', { playerId, name: player.name, formRating, injured: injury.injured, source: sourceUrl });
    return true;
  }

  /**
   * 批量抓取所有球员
   */
  static async fetchAll(limit = 80): Promise<number> {
    // 只抓取种子球队的核心球员（按 formRating 降序），跳过 7 天内已抓过的
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const players = await prisma.player.findMany({
      where: {
        nameEn: { not: null },
        OR: [{ formUpdatedAt: null }, { formUpdatedAt: { lt: sevenDaysAgo } }],
      },
      orderBy: { formRating: 'desc' },
      take: limit,
    });
    let count = 0;
    for (const p of players) {
      const ok = await this.fetchPlayerForm(p.id);
      if (ok) count++;
      // 限速：每 200ms 一个
      await new Promise(r => setTimeout(r, 200));
    }
    logger.info(`球员近期表现抓取完成: ${count}/${players.length}`);
    return count;
  }
}
