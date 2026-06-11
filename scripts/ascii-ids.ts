import { prisma } from '../src/lib/prisma';

// 中文球队名 -> ASCII ID
const CN_TO_ASCII: Record<string, string> = {
  '捷克': 'CZE',
  '波黑': 'BIH',
  '巴拉圭': 'PRY',
  '海地': 'HTI',
  '苏格兰': 'SCO',
  '库拉索': 'CUW',
  '瑞典': 'SWE',
  '伊拉克': 'IRQ',
  '挪威': 'NOR',
  '刚果(金)': 'COD',
};

async function main() {
  console.log('=== 转换中文 ID 为英文 ID ===');
  let count = 0;

  for (const [cnName, asciiCode] of Object.entries(CN_TO_ASCII)) {
    const oldId = `seed-${cnName}`;
    const newId = `seed-${asciiCode}`;

    const exists = await prisma.team.findUnique({ where: { id: oldId } });
    if (!exists) {
      console.log(`  ${oldId} 不存在，跳过`);
      continue;
    }

    // 检查新 ID 是否已存在
    const newExists = await prisma.team.findUnique({ where: { id: newId } });
    if (newExists) {
      // 合并
      console.log(`  合并 ${oldId} -> ${newId}`);
      await prisma.match.updateMany({ where: { homeTeamId: oldId }, data: { homeTeamId: newId } });
      await prisma.match.updateMany({ where: { awayTeamId: oldId }, data: { awayTeamId: newId } });
      await prisma.player.updateMany({ where: { teamId: oldId }, data: { teamId: newId } });
      await prisma.teamHistory.updateMany({ where: { teamId: oldId }, data: { teamId: newId } });
      await prisma.newsItem.updateMany({ where: { teamId: oldId }, data: { teamId: newId } });
      await prisma.team.delete({ where: { id: oldId } });
    } else {
      console.log(`  改名 ${oldId} -> ${newId}`);
      // 先创建新
      await prisma.team.create({
        data: {
          id: newId,
          name: exists.name,
          nameEn: exists.nameEn,
          country: exists.country,
          countryCode: asciiCode,
          eloRating: exists.eloRating,
          fifaRanking: exists.fifaRanking,
          matchesPlayed: exists.matchesPlayed,
          wins: exists.wins,
          draws: exists.draws,
          losses: exists.losses,
          goalsFor: exists.goalsFor,
          goalsAgainst: exists.goalsAgainst,
          winRate: exists.winRate,
          drawRate: exists.drawRate,
          lossRate: exists.lossRate,
          avgGoalsFor: exists.avgGoalsFor,
          avgGoalsAgainst: exists.avgGoalsAgainst,
        },
      });
      await prisma.match.updateMany({ where: { homeTeamId: oldId }, data: { homeTeamId: newId } });
      await prisma.match.updateMany({ where: { awayTeamId: oldId }, data: { awayTeamId: newId } });
      await prisma.player.updateMany({ where: { teamId: oldId }, data: { teamId: newId } });
      await prisma.teamHistory.updateMany({ where: { teamId: oldId }, data: { teamId: newId } });
      await prisma.newsItem.updateMany({ where: { teamId: oldId }, data: { teamId: newId } });
      await prisma.team.delete({ where: { id: oldId } });
    }
    count++;
  }

  console.log(`\n处理 ${count} 支球队`);

  // 验证
  const sample = await prisma.team.findMany({
    where: { id: { startsWith: 'seed-' } },
    orderBy: { fifaRanking: 'asc' },
    take: 15,
  });
  console.log('\nFIFA 排名前 15:');
  for (const t of sample) {
    console.log(`  #${t.fifaRanking} ${t.name} (${t.id})`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
