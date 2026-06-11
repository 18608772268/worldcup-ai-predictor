import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== 清理孤立数据 ===');

  // 查找所有比赛
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
  });

  let deleted = 0;
  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) {
      console.log(`删除孤立比赛: ${m.id}`);
      await prisma.prediction.deleteMany({ where: { matchId: m.id } });
      await prisma.oddsHistory.deleteMany({ where: { matchId: m.id } });
      await prisma.matchStats.deleteMany({ where: { matchId: m.id } });
      await prisma.match.delete({ where: { id: m.id } });
      deleted++;
    }
  }
  console.log(`删除 ${deleted} 场孤立比赛`);

  // 清理孤立的新闻 teamId
  const news = await prisma.newsItem.findMany({ include: { team: true } });
  let newsFixed = 0;
  for (const n of news) {
    if (n.teamId && !n.team) {
      await prisma.newsItem.update({ where: { id: n.id }, data: { teamId: null } });
      newsFixed++;
    }
  }
  console.log(`清理 ${newsFixed} 条孤立新闻`);

  // 清理孤立的球员 teamId
  const players = await prisma.player.findMany({ include: { team: true } });
  let playerFixed = 0;
  for (const p of players) {
    if (p.teamId && !p.team) {
      await prisma.player.update({ where: { id: p.id }, data: { teamId: null } });
      playerFixed++;
    }
  }
  console.log(`清理 ${playerFixed} 个孤立球员`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
