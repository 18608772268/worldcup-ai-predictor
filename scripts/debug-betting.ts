import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../src/lib/logger';

async function main() {
  const sites = [
    'https://www.oddsportal.com/matches/soccer/',
    'https://www.sportytrader.com/en/odds/football/',
    'https://sports.williamhill.com/betting/en-gb/football/matches/competition/today/match-betting',
  ];

  for (const url of sites) {
    try {
      console.log(`\n=== 抓取 ${url} ===`);
      const r = await axios.get(url, {
        timeout: 25000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      console.log('状态:', r.status, '长度:', r.data.length);
      const $ = cheerio.load(r.data);

      // 找包含 team 文字的元素
      $('[class*="team"], [class*="participant"], [class*="event"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 3 && text.length < 100) {
          console.log('  team text:', text);
        }
      });
    } catch (e: any) {
      console.log('错误:', e.message);
    }
  }

  process.exit(0);
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
