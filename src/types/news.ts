export interface NewsArticle {
  title: string;
  summary?: string;
  content?: string;
  url: string;
  source: string;
  sourceType: 'rss' | 'scrape' | 'api';
  language: string;
  publishedAt: string;
  category?: string;
  sentiment?: number;
  importance?: number;
  imageUrl?: string;
}
