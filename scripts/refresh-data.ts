import { prisma } from '../src/lib/prisma';
import { serperCrawler } from '../src/crawler/serper.crawler';
import { MatchService } from '../src/services/match.service';
import { logger } from '../src/lib/logger';

/**
 * 球队名中英文映射（更新已抓取的比赛球队名为中文）
 */
const TEAM_CN_MAP: Record<string, string> = {
  'Argentina': '阿根廷',
  'France': '法国',
  'Spain': '西班牙',
  'England': '英格兰',
  'Brazil': '巴西',
  'Belgium': '比利时',
  'Netherlands': '荷兰',
  'Portugal': '葡萄牙',
  'Germany': '德国',
  'Italy': '意大利',
  'Croatia': '克罗地亚',
  'Uruguay': '乌拉圭',
  'USA': '美国',
  'Mexico': '墨西哥',
  'Japan': '日本',
  'Korea Republic': '韩国',
  'Switzerland': '瑞士',
  'Denmark': '丹麦',
  'Senegal': '塞内加尔',
  'Morocco': '摩洛哥',
  'Colombia': '哥伦比亚',
  'Poland': '波兰',
  'Australia': '澳大利亚',
  'Iran': '伊朗',
  'Ukraine': '乌克兰',
  'Austria': '奥地利',
  'Turkiye': '土耳其',
  'Ecuador': '厄瓜多尔',
  'Peru': '秘鲁',
  'Chile': '智利',
  'Canada': '加拿大',
  'Qatar': '卡塔尔',
  'Saudi Arabia': '沙特阿拉伯',
  'Egypt': '埃及',
  'Nigeria': '尼日利亚',
  'Cameroon': '喀麦隆',
  'Ghana': '加纳',
  'Tunisia': '突尼斯',
  'Algeria': '阿尔及利亚',
  'Ivory Coast': '科特迪瓦',
  'Panama': '巴拿马',
  'Jamaica': '牙买加',
  'Costa Rica': '哥斯达黎加',
  'South Africa': '南非',
  'Cape Verde': '佛得角',
  'Uzbekistan': '乌兹别克斯坦',
  'Jordan': '约旦',
  'New Zealand': '新西兰',
  'Czechia': '捷克',
  'Paraguay': '巴拉圭',
  'Türkiye': '土耳其',
};

async function refreshTeamNames() {
  // 查找所有需要改名的球队
  const teams = await prisma.team.findMany();
  let count = 0;

  for (const team of teams) {
    const cn = TEAM_CN_MAP[team.name] || TEAM_CN_MAP[team.nameEn || ''];
    if (cn && team.name !== cn) {
      // 检查是否已存在中文名球队
      const existingCn = await prisma.team.findFirst({ where: { name: cn } });
      if (existingCn && existingCn.id !== team.id) {
        // 合并：迁移关联到中文球队，删除英文球队
        await prisma.player.updateMany({ where: { teamId: team.id }, data: { teamId: existingCn.id } });
        await prisma.match.updateMany({ where: { homeTeamId: team.id }, data: { homeTeamId: existingCn.id } });
        await prisma.match.updateMany({ where: { awayTeamId: team.id }, data: { awayTeamId: existingCn.id } });
        await prisma.newsItem.updateMany({ where: { teamId: team.id }, data: { teamId: existingCn.id } });
        await prisma.matchStats.deleteMany({ where: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] } });
        await prisma.oddsHistory.deleteMany({ where: { match: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] } } });
        await prisma.team.delete({ where: { id: team.id } });
        logger.info(`合并: ${team.name} -> ${cn}`);
      } else {
        await prisma.team.update({ where: { id: team.id }, data: { name: cn } });
        count++;
        logger.info(`改名: ${team.name} -> ${cn}`);
      }
    }
  }
  return count;
}

async function main() {
  logger.info('========== 刷新数据 ==========');

  // 1. 重新执行 seed（创建/更新中文球队）
  const { execSync } = await import('child_process');
  execSync('npx ts-node -r tsconfig-paths/register --project tsconfig.cron.json prisma/seed.ts', { stdio: 'inherit' });

  // 2. 把已存在的英文字段球队名改成中文
  const renamed = await refreshTeamNames();
  logger.info(`重命名 ${renamed} 支球队为中文`);

  // 3. 删除英文新闻，抓中文新闻
  await prisma.newsItem.deleteMany({ where: { language: { not: 'zh' } } });
  logger.info('已删除英文新闻');

  // 4. 通过 Serper 抓取中文新闻
  const newsCount = await serperCrawler.fetchNews();
  logger.info(`抓取中文新闻 ${newsCount} 条`);

  // 5. 删除已有的英文字段比赛（重新抓）
  await prisma.prediction.deleteMany({});
  await prisma.oddsHistory.deleteMany({});
  await prisma.match.deleteMany({});
  logger.info('已清空比赛数据');

  // 6. 重新抓取比赛
  const matchCount = await serperCrawler.fetchMatches();
  logger.info(`抓取比赛 ${matchCount} 场`);

  // 7. 重新执行球队名替换（针对新抓取的比赛）
  await refreshTeamNames();

  // 8. 重新生成预测
  const predCount = await MatchService.batchPredict();
  logger.info(`生成预测 ${predCount} 场`);

  // 9. 最终统计
  const totalMatches = await prisma.match.count();
  const totalPreds = await prisma.prediction.count();
  const totalNews = await prisma.newsItem.count();
  const totalTeams = await prisma.team.count();
  logger.info('========== 完成 ==========');
  logger.info(`比赛=${totalMatches}, 预测=${totalPreds}, 新闻=${totalNews}, 球队=${totalTeams}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error('错误:', e.message); process.exit(1); });
