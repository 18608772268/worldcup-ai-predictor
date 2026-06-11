import { sportteryCrawler } from '../src/crawler/sporttery.crawler';

async function main() {
  const matches = await sportteryCrawler.fetchMatches();
  console.log(`抓到 ${matches.length} 场比赛:\n`);
  for (const m of matches.slice(0, 15)) {
    console.log(`${m.homeTeam} vs ${m.awayTeam}`);
    console.log(`  联赛: ${m.league}, 时间: ${m.matchTime}`);
    console.log(`  胜平负: ${m.odds.win} / ${m.odds.draw} / ${m.odds.lose}`);
    console.log(`  让球 ${m.odds.handicapLine}: ${m.odds.handicapWin} / ${m.odds.handicapDraw} / ${m.odds.handicapLose}`);
    if (m.odds.scoreOdds) {
      const top3 = Object.entries(m.odds.scoreOdds).sort((a, b) => a[1] - b[1]).slice(0, 3);
      console.log(`  比分 Top3:`, top3.map(([k, v]) => `${k}=${v}`).join(', '));
    }
    console.log('');
  }
  process.exit(0);
}
main();
