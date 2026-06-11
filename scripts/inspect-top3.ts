import { prisma } from '../src/lib/prisma';
async function main() {
  const p = await prisma.prediction.findFirst({ select: { topScoresJson: true, aiPredictedScore: true } });
  console.log('main score:', p?.aiPredictedScore);
  console.log('top3:', JSON.parse(p?.topScoresJson || '[]').slice(0, 5));
  await prisma.$disconnect();
}
main();
