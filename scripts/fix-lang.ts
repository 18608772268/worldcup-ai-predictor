import { prisma } from '../src/lib/prisma';

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

async function main() {
  console.log('=== 改名球队 ===');
  const teams = await prisma.team.findMany();
  let count = 0;
  for (const team of teams) {
    const cn = TEAM_CN_MAP[team.name] || TEAM_CN_MAP[team.nameEn || ''];
    if (cn && team.name !== cn) {
      const existing = await prisma.team.findFirst({ where: { name: cn, id: { not: team.id } } });
      if (existing) {
        await prisma.player.updateMany({ where: { teamId: team.id }, data: { teamId: existing.id } });
        await prisma.match.updateMany({ where: { homeTeamId: team.id }, data: { homeTeamId: existing.id } });
        await prisma.match.updateMany({ where: { awayTeamId: team.id }, data: { awayTeamId: existing.id } });
        await prisma.newsItem.updateMany({ where: { teamId: team.id }, data: { teamId: existing.id } });
        await prisma.matchStats.deleteMany({ where: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] } });
        await prisma.oddsHistory.deleteMany({ where: { match: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] } } });
        await prisma.team.delete({ where: { id: team.id } });
        console.log(`合并 ${team.name} -> ${cn}`);
      } else {
        await prisma.team.update({ where: { id: team.id }, data: { name: cn } });
        console.log(`改名 ${team.name} -> ${cn}`);
        count++;
      }
    }
  }
  console.log(`改名 ${count} 支球队`);

  console.log('\n=== 删除英文新闻 ===');
  const deleted = await prisma.newsItem.deleteMany({ where: { language: { not: 'zh' } } });
  console.log(`删除 ${deleted.count} 条英文新闻`);

  console.log('\n=== 删除所有比赛 ===');
  await prisma.prediction.deleteMany({});
  await prisma.oddsHistory.deleteMany({});
  await prisma.match.deleteMany({});
  console.log('已清空');

  await prisma.$disconnect();
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
