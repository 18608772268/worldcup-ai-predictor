import { NextRequest, NextResponse } from 'next/server';
import { MatchService } from '@/services/match.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || undefined;
  const league = searchParams.get('league') || undefined;

  try {
    const data = await MatchService.listMatches({ page, pageSize, status, league });
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
