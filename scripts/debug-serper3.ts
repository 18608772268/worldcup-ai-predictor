import { serperCrawler } from '../src/crawler/serper.crawler';

async function main() {
  const c: any = serperCrawler;

  // 直接搜索具体的比赛赔率
  const matchups = [
    ['Korea Republic', 'Czechia'],
    ['USA', 'Paraguay'],
    ['Australia', 'Turkiye'],
    ['Sweden', 'Tunisia'],
    ['Argentina', 'Brazil'],
    ['France', 'Spain'],
    ['England', 'Germany'],
  ];

  console.log('=== 测试具体比赛赔率搜索 ===\n');

  for (const [home, away] of matchups) {
    const q = `${home} vs ${away} odds betting`;
    const r = await c['search'](q, 5);
    if (r?.organic) {
      const odds = c['extractOdds'](r.organic);
      console.log(`${home} vs ${away}: ${odds ? `win=${odds.win} draw=${odds.draw} lose=${odds.lose}` : '未找到赔率'}`);
    }
  }

  process.exit(0);
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
