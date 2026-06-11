import { prisma } from '../src/lib/prisma';
async function main() {
 const [teams, players, matches, preds, news, playerForm] = await Promise.all([
 prisma.team.count(),
 prisma.player.count(),
 prisma.match.count(),
 prisma.prediction.count(),
 prisma.newsItem.count(),
 prisma.player.count({ where: { formUpdatedAt: { not: null } } }),
 ]);
 console.log({ teams, players, matches, predictions: preds, news, playersWithForm: playerForm });
 const sample = await prisma.match.findFirst({ where: { prediction: { isNot: null } }, include: { homeTeam: true, awayTeam: true, prediction: true } });
 if (sample) console.log('sample match:', sample.homeTeam.name, 'vs', sample.awayTeam.name, '|', sample.prediction?.finalHomeWin?.toFixed(2), '/', sample.prediction?.finalDraw?.toFixed(2), '/', sample.prediction?.finalAwayWin?.toFixed(2));
 const inj = await prisma.player.count({ where: { injuryStatus: 'injured' } });
 console.log({ injuredPlayers: inj });
 await prisma.$disconnect();
}
main();
