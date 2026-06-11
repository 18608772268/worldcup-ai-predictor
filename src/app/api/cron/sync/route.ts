import { NextRequest, NextResponse } from 'next/server';
import { CrawlerService } from '@/crawler';
import { MatchService } from '@/services/match.service';

export async function POST(_req: NextRequest) {
  try {
    const t0 = Date.now();
    const syncResult = await CrawlerService.runFullSync();
    const predicted = await MatchService.batchPredict();
    return NextResponse.json({
      success: true,
      data: { ...syncResult, predictions: predicted, duration: Date.now() - t0 },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  return POST(_req);
}
