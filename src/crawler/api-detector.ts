import axios from 'axios';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

export class ApiDetector {
  private static detectedApis: Map<string, string> = new Map();

  static async detect(): Promise<Map<string, string>> {
    if (this.detectedApis.size > 0) return this.detectedApis;

    logger.info('开始自动检测竞彩网API...');
    const html = await this.fetch(config.sporttery.jcUrl);
    const apis = this.extractApisFromHtml(html);
    this.detectedApis = apis;
    return apis;
  }

  private static async fetch(url: string): Promise<string> {
    const r = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': config.sporttery.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
  }

  private static extractApisFromHtml(html: string): Map<string, string> {
    const result = new Map<string, string>();
    const patterns = [
      /['"`](https?:\/\/[^'"`\s]*sporttery[^'"`\s]*\.json)['"`]/g,
      /['"`](https?:\/\/[^'"`\s]*sporttery[^'"`\s]*api[^'"`\s]*)['"`]/g,
      /['"`](https?:\/\/[^'"`\s]*webapi[^'"`\s]*)['"`]/g,
      /url\s*[:=]\s*['"`](https?:\/\/[^'"`\s]*sporttery[^'"`\s]*)['"`]/g,
    ];
    for (const p of patterns) {
      let m: RegExpExecArray | null;
      while ((m = p.exec(html))) {
        const url = m[1];
        if (url.includes('jc') || url.includes('zq') || url.includes('jsq')) {
          result.set(this.categorizeApi(url), url);
        }
      }
    }
    return result;
  }

  private static categorizeApi(url: string): string {
    if (url.includes('zqhhgg')) return 'football-hunhe-gg';
    if (url.includes('jsq')) return 'football-jsq';
    if (url.includes('zqjsq')) return 'football-jc-score';
    if (url.includes('zqspf')) return 'football-spf';
    if (url.includes('zqrqspf')) return 'football-rqspf';
    return 'unknown';
  }
}
