export interface TeamInfo {
  id: string;
  name: string;
  nameEn?: string;
  country: string;
  countryCode?: string;
  fifaRanking?: number;
  eloRating: number;
  stats: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    winRate: number;
    drawRate: number;
    lossRate: number;
    avgGoalsFor: number;
    avgGoalsAgainst: number;
  };
}
