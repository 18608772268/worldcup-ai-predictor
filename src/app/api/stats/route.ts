import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [matches, predictions, teams, players, news, todayMatches] = await Promise.all([
      prisma.match.count(),
      prisma.prediction.count(),
      prisma.team.count(),
      prisma.player.count(),
      prisma.newsItem.count(),
      prisma.match.count({
        where: { matchTime: { gte: today, lt: tomorrow } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { matches, predictions, teams, players, news, todayMatches },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
