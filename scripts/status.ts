import { prisma } from '../src/lib/prisma';
async function main() {
  const total = await prisma.match.count();
  const withPred = await prisma.prediction.count();
  const noPred = await prisma.match.count({ where: { prediction: null } });
  const news = await prisma.newsItem.count();
  const teams = await prisma.team.count();
  const players = await prisma.player.count();
  console.log({ totalMatches: total, predictions: withPred, noPred, news, teams, players });
  await prisma.$disconnect();
}
main();
