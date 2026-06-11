import { NextRequest, NextResponse } from 'next/server';
import { NewsService } from '@/services/news.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 30);
  const teamId = searchParams.get('teamId') || undefined;
  const category = searchParams.get('category') || undefined;

  try {
    const data = await NewsService.listNews({ page, pageSize, teamId, category });
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
