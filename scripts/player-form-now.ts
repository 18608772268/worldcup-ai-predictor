import { PlayerFormCrawler } from '../src/crawler/player-form.crawler';
import { logger } from '../src/lib/logger';
import { prisma } from '../src/lib/prisma';

async function main() {
 const limit = Number(process.argv[2] ||30);
 logger.info(`手动触发球员近期表现抓取, limit=${limit}...`);
 try {
 const count = await PlayerFormCrawler.fetchAll(limit);
 logger.info(`已更新 ${count} 名球员`);
 } catch (e: any) {
 logger.error('球员抓取失败', { error: e.message });
 process.exit(1);
 } finally {
 await prisma.$disconnect();
 }
}
main();
