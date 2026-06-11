export function formatOdds(odds: number | null | undefined): string {
  if (odds == null || isNaN(odds)) return '-';
  return odds.toFixed(2);
}

export function formatProbability(prob: number | null | undefined): string {
  if (prob == null || isNaN(prob)) return '-';
  return `${(prob * 100).toFixed(1)}%`;
}

export function formatScore(score: string | null | undefined): string {
  return score || '-';
}

export function riskColor(level: string): string {
  switch (level) {
    case 'low':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export function riskBadge(level: string): string {
  switch (level) {
    case 'low':
      return 'bg-green-100 text-green-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'high':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
