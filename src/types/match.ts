export interface MatchOdds {
  win: number;
  draw: number;
  lose: number;
  handicapLine?: number;
  handicapWin?: number;
  handicapDraw?: number;
  handicapLose?: number;
  overUnderLine?: number;
  over?: number;
  under?: number;
  bothYes?: number;
  bothNo?: number;
  scoreOdds?: Record<string, number>;
  halfFullOdds?: Record<string, number>;
}

export interface MatchInfo {
  matchId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  odds: MatchOdds;
  sourceUrl?: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
