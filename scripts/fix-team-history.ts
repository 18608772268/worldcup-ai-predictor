import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== 清理并重建球队历史战绩 ===');

  // 删除所有历史
  await prisma.teamHistory.deleteMany({});
  console.log('已清空历史');

  const teams = await prisma.team.findMany();
  console.log(`球队数: ${teams.length}`);

  let totalHistory = 0;

  for (const team of teams) {
    // 为每支球队生成 8 场历史战绩，opponent 严格排除自己
    const otherTeams = teams.filter((t) => t.id !== team.id);

    for (let i = 0; i < 8; i++) {
      const daysAgo = 30 + i * 25;
      const matchDate = new Date();
      matchDate.setDate(matchDate.getDate() - daysAgo);

      // 随机选一支不是自己的球队
      const opp = otherTeams[Math.floor(Math.random() * otherTeams.length)];

      // 根据 ELO 差生成合理比分
      const eloDiff = team.eloRating - opp.eloRating;
      const winProb = 1 / (1 + Math.pow(10, -eloDiff / 400));
      const rand = Math.random();
      const baseGoals = 1.3;

      let goalsFor: number, goalsAgainst: number, result: string;
      if (rand < winProb * 0.7) {
        // 胜
        goalsFor = 1 + Math.floor(Math.random() * 3);
        goalsAgainst = Math.max(0, goalsFor - 1 - Math.floor(Math.random() * 2));
        result = 'W';
      } else if (rand < winProb * 0.7 + 0.25) {
        // 平
        const g = Math.floor(Math.random() * 3);
        goalsFor = g;
        goalsAgainst = g;
        result = 'D';
      } else {
        // 负
        goalsAgainst = 1 + Math.floor(Math.random() * 3);
        goalsFor = Math.max(0, goalsAgainst - 1 - Math.floor(Math.random() * 2));
        result = 'L';
      }

      const competitions = ['世预赛', '欧国联', '友谊赛', '洲际杯', '欧洲杯预选赛'];
      const eloChange = (Math.random() - 0.4) * 20;
      const eloAfter = team.eloRating;
      const eloBefore = Math.max(1000, eloAfter - eloChange);
      const isHome = Math.random() > 0.5;

      await prisma.teamHistory.create({
        data: {
          teamId: team.id,
          matchDate,
          opponent: opp.name,
          isHome,
          goalsFor,
          goalsAgainst,
          result,
          competition: competitions[Math.floor(Math.random() * competitions.length)],
          eloBefore,
          eloAfter,
          eloChange,
        },
      });
      totalHistory++;
    }
  }

  console.log(`重建 ${totalHistory} 条历史战绩`);

  // 验证一些样本
  const sample = await prisma.teamHistory.findMany({
    where: { teamId: 'seed-ARG' },
    orderBy: { matchDate: 'desc' },
    take: 5,
  });
  console.log('\n阿根廷历史样本:');
  for (const h of sample) {
    console.log(`  ${h.matchDate.toISOString().slice(0, 10)} ${h.isHome ? '主' : '客'} vs ${h.opponent} ${h.goalsFor}-${h.goalsAgainst} (${h.result})`);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
