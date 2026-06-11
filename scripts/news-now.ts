import { newsCrawler } from '../src/crawler';
import { logger } from '../src/lib/logger';
import { prisma } from '../src/lib/prisma';

async function main() {
 logger.info('手动触发新闻抓取...');
 try {
 const count = await newsCrawler.crawlAll();
 logger.info(`已抓取 ${count} 条新闻`);
 } catch (e: any) {
 logger.error('新闻抓取失败', { error: e.message });
 process.exit(1);
 } finally {
 await prisma.$disconnect();
 }
}
main();
