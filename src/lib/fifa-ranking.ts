// 非 48 强种子球队的真实 FIFA 排名（2026 年初近似值）
// 用 sporttery 抓到的中文名匹配
const KNOWN_RANKINGS: Record<string, number> = {
  库拉索: 86,
  海地: 86,
  伊拉克: 58,
  捷克: 32,
  波黑: 62,
  巴拉圭: 49,
  苏格兰: 38,
  阿尔及利亚: 39,
  挪威: 33,
};

/** FIFA 排名 → ELO（rank 1 = 2200, rank 200 = 1300） */
export function eloFromRanking(rank: number): number {
  return Math.round(2200 - (rank - 1) * 4.5);
}

export function getFifaRanking(name: string): number {
  return KNOWN_RANKINGS[name] ?? 86; // 未知队按弱队
}
