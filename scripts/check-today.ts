import { prisma } from '../src/lib/prisma';
async function main() {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const todayMatches = await prisma.match.findMany({
    where: { matchTime: { gte: today, lt: tomorrow } },
    include: { homeTeam: true, awayTeam: true, prediction: true },
  });
  console.log(`今天(${today.toISOString().slice(0,10)})的比赛 ${todayMatches.length} 场:`);
  for (const m of todayMatches) {
    console.log(`  ${m.homeTeam.name} vs ${m.awayTeam.name} | ${m.matchTime.toISOString()} | 预测:${m.prediction?.aiPredictedScore || '无'}`);
  }
  await prisma.$disconnect();
}
main();
