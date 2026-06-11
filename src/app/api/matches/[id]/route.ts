import { NextRequest, NextResponse } from 'next/server';
import { MatchService } from '@/services/match.service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await MatchService.getMatchDetail(params.id);
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
