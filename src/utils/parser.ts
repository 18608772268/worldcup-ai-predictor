import * as cheerio from 'cheerio';

export function parseHtml(html: string): cheerio.CheerioAPI {
  return cheerio.load(html);
}

export function extractText(html: string, selector: string): string | null {
  const $ = parseHtml(html);
  const el = $(selector).first();
  return el.length ? el.text().trim() : null;
}

export function safeNumber(val: any, fallback: number = 0): number {
  if (val == null) return fallback;
  const n = parseFloat(String(val).replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? fallback : n;
}

export function safeInt(val: any, fallback: number = 0): number {
  if (val == null) return fallback;
  const n = parseInt(String(val).replace(/[^\d\-]/g, ''), 10);
  return isNaN(n) ? fallback : n;
}
