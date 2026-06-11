import axios from 'axios';

const KEY = '24ff4b3612347457bde4140e9ea5d8a49005e51e';

async function search(q: string) {
  const r = await axios.post('https://google.serper.dev/search',
    { q, gl: 'cn', hl: 'zh-cn', num: 5 },
    { headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' } }
  );
  return r.data;
}

async function main() {
  console.log('=== 1. 球员 + recent form 2026 ===');
  const r1 = await search('Lionel Messi recent form goals assists 2026');
  for (const o of (r1.organic || []).slice(0, 3)) {
    console.log(`- ${o.title}`);
    console.log(`  ${o.snippet}`);
    console.log(`  ${o.link}`);
  }
  console.log('\n=== 2. 球员 + 伤停 ===');
  const r2 = await search('Kylian Mbappé injury news 2026');
  for (const o of (r2.organic || []).slice(0, 3)) {
    console.log(`- ${o.title}: ${o.snippet}`);
  }
  console.log('\n=== 3. 中文搜索 ===');
  const r3 = await search('梅西 2026 进球 助攻 状态');
  for (const o of (r3.organic || []).slice(0, 3)) {
    console.log(`- ${o.title}: ${o.snippet}`);
  }
}
main().catch(e => console.error(e.message));
