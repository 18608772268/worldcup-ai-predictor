import { prisma } from '../src/lib/prisma';

/**
 * 删除所有假历史战绩
 * 这些都是 seed-players.ts 随机生成的数据，不是真实比赛
 */
async function main() {
  console.log('=== 删除所有假历史战绩 ===');
  const deleted = await prisma.teamHistory.deleteMany({});
  console.log(`已删除 ${deleted.count} 条假历史战绩`);

  // 验证
  const remaining = await prisma.teamHistory.count();
  console.log(`剩余真实历史战绩: ${remaining} 条`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
