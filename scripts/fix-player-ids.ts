import { prisma } from '../src/lib/prisma';
import { logger } from '../src/lib/logger';

async function main() {
  // 把球员 ID 从 seed-阿根廷-10 改成 seed-ARG-10 这种英文 ID
  const players = await prisma.player.findMany();
  let count = 0;
  for (const p of players) {
    if (!p.teamId || !p.jerseyNumber) continue;
    const newId = `${p.teamId}-${p.jerseyNumber}`;
    if (newId === p.id) continue;
    try {
      // 检查新 ID 是否存在
      const existing = await prisma.player.findUnique({ where: { id: newId } });
      if (existing) {
        // 如果新 ID 已存在，删除旧 ID
        await prisma.playerHistory.updateMany({ where: { playerId: p.id }, data: { playerId: newId } });
        await prisma.newsItem.updateMany({ where: { playerId: p.id }, data: { playerId: newId } });
        await prisma.player.delete({ where: { id: p.id } });
      } else {
        // 重新创建并迁移
        await prisma.playerHistory.updateMany({ where: { playerId: p.id }, data: { playerId: newId } });
        await prisma.newsItem.updateMany({ where: { playerId: p.id }, data: { playerId: newId } });
        await prisma.player.delete({ where: { id: p.id } });
        await prisma.player.create({
          data: {
            id: newId,
            name: p.name,
            nameEn: p.nameEn,
            position: p.position,
            age: p.age,
            nationality: p.nationality,
            teamId: p.teamId,
            club: p.club,
            jerseyNumber: p.jerseyNumber,
            height: p.height,
            weight: p.weight,
            preferredFoot: p.preferredFoot,
            injuryStatus: p.injuryStatus,
            injuryNote: p.injuryNote,
            suspensionNote: p.suspensionNote,
            goals: p.goals,
            assists: p.assists,
            appearances: p.appearances,
            minutesPlayed: p.minutesPlayed,
            yellowCards: p.yellowCards,
            redCards: p.redCards,
            formRating: p.formRating,
            seasonRating: p.seasonRating,
          },
        });
      }
      count++;
    } catch (e: any) {
      logger.warn(`球员ID修改失败: ${p.name}`, { error: e.message });
    }
  }
  logger.info(`修改了 ${count} 个球员ID`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
