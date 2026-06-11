import { NextRequest, NextResponse } from 'next/server';
import { PlayerService } from '@/services/player.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 30);
  const teamId = searchParams.get('teamId') || undefined;
  const position = searchParams.get('position') || undefined;
  const search = searchParams.get('search') || undefined;

  try {
    const data = await PlayerService.listPlayers({ page, pageSize, teamId, position, search });
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
