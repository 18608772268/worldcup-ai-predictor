import axios from 'axios';
const key = process.env.SERPER_API_KEY;
async function main() {
  try {
    const r = await axios.post('https://google.serper.dev/search',
      { q: 'test', num: 1 },
      { headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' }, timeout: 10000 });
    console.log('OK', r.status, JSON.stringify(r.data).slice(0, 200));
  } catch (e: any) {
    console.log('FAIL', e.response?.status, e.response?.data || e.message);
  }
}
main();
