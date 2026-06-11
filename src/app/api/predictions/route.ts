import { NextRequest, NextResponse } from 'next/server';
import { PredictionService } from '@/services/prediction.service';
import { MatchService } from '@/services/match.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 30);

  try {
    const data = await PredictionService.listPredictions({ page, pageSize });
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const matchId = body.matchId;
    if (!matchId) return NextResponse.json({ success: false, error: 'matchId required' }, { status: 400 });
    const data = await MatchService.generatePrediction(matchId);
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
