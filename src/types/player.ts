export interface PlayerInfo {
  id: string;
  name: string;
  position: string;
  age?: number;
  team?: string;
  club?: string;
  injuryStatus?: string;
  injuryNote?: string;
  stats: {
    goals: number;
    assists: number;
    appearances: number;
    formRating: number;
  };
}
