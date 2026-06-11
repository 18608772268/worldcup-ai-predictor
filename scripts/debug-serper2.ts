import { serperCrawler } from '../src/crawler/serper.crawler';

async function main() {
  const c: any = serperCrawler;

  console.log('=== 测试 FIFA 抓取 ===');
  const fifa = await c['scrapeFifaFixtures']();
  console.log('FIFA 比赛数:', fifa.length);
  if (fifa.length > 0) console.log('示例:', fifa[0]);

  console.log('\n=== 测试 ESPN 抓取 ===');
  const espn = await c['scrapeEspnSchedule']();
  console.log('ESPN 比赛数:', espn.length);
  if (espn.length > 0) console.log('示例:', espn[0]);

  console.log('\n=== 测试赔率搜索 KOR vs CZE ===');
  const r1 = await c['search']('KOR vs CZE odds', 3);
  const o1 = c['extractOdds'](r1?.organic || []);
  console.log('KOR vs CZE 赔率:', o1);

  console.log('\n=== 测试赔率搜索 USA vs PAR ===');
  const r2 = await c['search']('USA vs PAR odds', 3);
  const o2 = c['extractOdds'](r2?.organic || []);
  console.log('USA vs PAR 赔率:', o2);

  console.log('\n=== 测试赔率搜索 "Argentina Brazil odds" ===');
  const r3 = await c['search']('Argentina Brazil odds betting', 3);
  console.log('搜索结果数:', r3?.organic?.length || 0);
  for (const item of r3?.organic?.slice(0, 3) || []) {
    console.log('title:', item.title);
    console.log('snippet:', item.snippet);
  }
  const o3 = c['extractOdds'](r3?.organic || []);
  console.log('赔率:', o3);

  process.exit(0);
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
