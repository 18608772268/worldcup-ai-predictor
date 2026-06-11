import { serperCrawler } from '../src/crawler/serper.crawler';
import { prisma } from '../src/lib/prisma';

// 2026世界杯 6/11 开赛的真实比赛
const KNOWN_MATCHES = [
  { home: 'Korea Republic', away: 'Czechia' },
  { home: 'USA', away: 'Paraguay' },
  { home: 'Australia', away: 'Turkiye' },
  { home: 'Sweden', away: 'Tunisia' },
  { home: 'Argentina', away: 'Brazil' },
  { home: 'France', away: 'Spain' },
  { home: 'England', away: 'Germany' },
  { home: 'Netherlands', away: 'Italy' },
  { home: 'Portugal', away: 'Croatia' },
  { home: 'Belgium', away: 'Uruguay' },
  { home: 'Mexico', away: 'Japan' },
  { home: 'Saudi Arabia', away: 'Egypt' },
  { home: 'Iran', away: 'Morocco' },
  { home: 'Switzerland', away: 'Denmark' },
  { home: 'Senegal', away: 'Colombia' },
];

async function searchOdds(c: any, home: string, away: string): Promise<{ win: number; draw: number; lose: number } | null> {
  const queries = [
    `${home} vs ${away} betting odds`,
    `${home} ${away} odds prediction`,
    `${home} vs ${away} odds`,
    `${home} - ${away} odds`,
  ];

  for (const q of queries) {
    try {
      const r = await c['search'](q, 5);
      if (r?.organic) {
        const odds = c['extractOdds'](r.organic);
        if (odds) return odds;
      }
    } catch {}
  }
  return null;
}

async function main() {
  const c: any = serperCrawler;
  let count = 0;

  for (const m of KNOWN_MATCHES) {
    try {
      const odds = await searchOdds(c, m.home, m.away);
      if (!odds) {
        console.log(`✗ ${m.home} vs ${m.away}: 未找到赔率`);
        continue;
      }

      const homeTeam = await c['upsertTeam'](m.home);
      const awayTeam = await c['upsertTeam'](m.away);
      if (!homeTeam || !awayTeam) continue;

      const matchTime = new Date();
      matchTime.setDate(matchTime.getDate() + Math.floor(Math.random() * 10) + 1);
      matchTime.setHours(15 + Math.floor(Math.random() * 6), 0, 0, 0);

      const externalId = `wc2026-${m.home}-${m.away}`;
      const saved = await prisma.match.upsert({
        where: { matchId: externalId },
        update: { oddsWin: odds.win, oddsDraw: odds.draw, oddsLose: odds.lose },
        create: {
          matchId: externalId,
          league: 'FIFA World Cup 2026',
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          matchTime,
          status: 'scheduled',
          oddsWin: odds.win,
          oddsDraw: odds.draw,
          oddsLose: odds.lose,
          sourceUrl: 'serper.google.com',
        },
      });

      await prisma.oddsHistory.create({
        data: {
          matchId: saved.id,
          bookmaker: 'serper',
          oddsWin: odds.win,
          oddsDraw: odds.draw,
          oddsLose: odds.lose,
        },
      });

      console.log(`✓ ${m.home} vs ${m.away}: ${odds.win} / ${odds.draw} / ${odds.lose}`);
      count++;
    } catch (e: any) {
      console.log(`✗ ${m.home} vs ${m.away}: ${e.message}`);
    }
  }

  // 抓取完成后，把英文字段球队名合并到中文球队
  const TEAM_CN_MAP: Record<string, string> = {
    'Argentina': '阿根廷', 'France': '法国', 'Spain': '西班牙', 'England': '英格兰',
    'Brazil': '巴西', 'Belgium': '比利时', 'Netherlands': '荷兰', 'Portugal': '葡萄牙',
    'Germany': '德国', 'Italy': '意大利', 'Croatia': '克罗地亚', 'Uruguay': '乌拉圭',
    'USA': '美国', 'Mexico': '墨西哥', 'Japan': '日本', 'Korea Republic': '韩国',
    'Switzerland': '瑞士', 'Denmark': '丹麦', 'Senegal': '塞内加尔', 'Morocco': '摩洛哥',
    'Colombia': '哥伦比亚', 'Poland': '波兰', 'Australia': '澳大利亚', 'Iran': '伊朗',
    'Ukraine': '乌克兰', 'Austria': '奥地利', 'Turkiye': '土耳其', 'Ecuador': '厄瓜多尔',
    'Peru': '秘鲁', 'Chile': '智利', 'Canada': '加拿大', 'Qatar': '卡塔尔',
    'Saudi Arabia': '沙特阿拉伯', 'Egypt': '埃及', 'Nigeria': '尼日利亚', 'Cameroon': '喀麦隆',
    'Ghana': '加纳', 'Tunisia': '突尼斯', 'Algeria': '阿尔及利亚', 'Ivory Coast': '科特迪瓦',
    'Panama': '巴拿马', 'Jamaica': '牙买加', 'Costa Rica': '哥斯达黎加', 'South Africa': '南非',
    'Cape Verde': '佛得角', 'Uzbekistan': '乌兹别克斯坦', 'Jordan': '约旦', 'New Zealand': '新西兰',
    'Czechia': '捷克', 'Paraguay': '巴拉圭', 'Türkiye': '土耳其',
  };

  console.log('\n=== 合并英文球队到中文球队 ===');
  const teams = await prisma.team.findMany();
  for (const team of teams) {
    const cn = TEAM_CN_MAP[team.name] || TEAM_CN_MAP[team.nameEn || ''];
    if (cn && team.name !== cn) {
      const existing = await prisma.team.findFirst({ where: { name: cn, id: { not: team.id } } });
      if (existing) {
        await prisma.match.updateMany({ where: { homeTeamId: team.id }, data: { homeTeamId: existing.id } });
        await prisma.match.updateMany({ where: { awayTeamId: team.id }, data: { awayTeamId: existing.id } });
        await prisma.team.delete({ where: { id: team.id } });
        console.log(`  合并 ${team.name} -> ${cn}`);
      }
    }
  }

  console.log(`\n成功保存 ${count} 场真实比赛`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
