import { execSync } from 'child_process';
import { logger } from '../src/lib/logger';

async function main() {
  logger.info('初始化数据库...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
    execSync('npx ts-node -r tsconfig-paths/register --project tsconfig.cron.json prisma/seed.ts', { stdio: 'inherit' });
    logger.info('数据库初始化完成');
  } catch (e: any) {
    logger.error('数据库初始化失败', { error: e.message });
    process.exit(1);
  }
}
main();
