import { serperCrawler } from '../src/crawler/serper.crawler';

async function main() {
  const c: any = serperCrawler;

  console.log('=== 搜索 today football odds ===');
  const r = await c['search']('today football match odds betting', 10);
  if (r?.organic) {
    for (const item of r.organic.slice(0, 5)) {
      console.log('---');
      console.log('title:', item.title);
      console.log('snippet:', item.snippet);
      console.log('link:', item.link);
      const c2: any = c['extractMatchesWithOdds'](item.title + ' ' + (item.snippet || ''));
      console.log('提取到:', c2.length, '场');
    }
  }

  process.exit(0);
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
