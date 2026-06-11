import { serperCrawler } from '../src/crawler/serper.crawler';
import { logger } from '../src/lib/logger';

async function main() {
  // 测试单次搜索
  const c: any = serperCrawler;
  console.log('=== 测试单次搜索 ===');
  const r1 = await c['search']('FIFA World Cup 2026 fixtures', 5);
  console.log('搜索结果 organic 数量:', r1?.organic?.length || 0);
  if (r1?.organic) {
    for (const item of r1.organic.slice(0, 3)) {
      console.log('---');
      console.log('title:', item.title);
      console.log('snippet:', item.snippet);
      const matches = c['extractMatchesFromText'](item.title + ' ' + (item.snippet || ''));
      console.log('提取到比赛:', matches.length, '场');
      if (matches.length > 0) {
        console.log('  示例:', matches[0]);
      }
    }
  }

  console.log('\n=== 测试赔率提取 ===');
  const r2 = await c['search']('Argentina vs France odds', 5);
  if (r2?.organic) {
    const odds = c['extractOdds'](r2.organic);
    console.log('提取的赔率:', odds);
  }

  process.exit(0);
}

main().catch((e) => { console.error('错误:', e.message); process.exit(1); });
