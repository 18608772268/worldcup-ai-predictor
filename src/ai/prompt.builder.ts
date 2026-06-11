export class PromptBuilder {
  static buildMatchAnalysisPrompt(context: {
    match: any;
    homeTeam: any;
    awayTeam: any;
    homePlayers: any[];
    awayPlayers: any[];
    homeNews: any[];
    awayNews: any[];
    features: any;
    odds: any;
    prediction: any;
  }): string {
    const { match, homeTeam, awayTeam, features, odds, prediction } = context;

    return `你是一名世界级足球比赛分析师。请基于以下真实数据分析这场比赛并给出预测。

## 比赛信息
- 联赛: ${match.league}
- 时间: ${match.matchTime}
- 主队: ${homeTeam.name} (FIFA排名 ${homeTeam.fifaRanking || 'N/A'}, ELO ${homeTeam.eloRating.toFixed(0)})
- 客队: ${awayTeam.name} (FIFA排名 ${awayTeam.fifaRanking || 'N/A'}, ELO ${awayTeam.eloRating.toFixed(0)})

## 主队近期状态
- 胜率: ${(homeTeam.winRate * 100).toFixed(1)}%
- 场均进球: ${homeTeam.avgGoalsFor.toFixed(2)}
- 场均失球: ${homeTeam.avgGoalsAgainst.toFixed(2)}

## 客队近期状态
- 胜率: ${(awayTeam.winRate * 100).toFixed(1)}%
- 场均进球: ${awayTeam.avgGoalsFor.toFixed(2)}
- 场均失球: ${awayTeam.avgGoalsAgainst.toFixed(2)}

## 伤停情况
- 主队伤停: ${features.homeInjuries} 人
- 客队伤停: ${features.awayInjuries} 人

## 当前赔率
- 胜: ${odds.win} | 平: ${odds.draw} | 负: ${odds.lose}
- 让球: ${odds.handicapLine} (${odds.handicapWin}/${odds.handicapDraw}/${odds.handicapLose})
- 大小球: ${odds.overUnderLine} (${odds.over}/${odds.under})

## 模型预测
- 胜平负: 主胜 ${(prediction.homeWin * 100).toFixed(1)}% | 平 ${(prediction.draw * 100).toFixed(1)}% | 客胜 ${(prediction.awayWin * 100).toFixed(1)}%
- 预期比分: ${prediction.homeXG.toFixed(2)} - ${prediction.awayXG.toFixed(2)}
- 大球2.5: ${(prediction.over25 * 100).toFixed(1)}%
- 双方进球: ${(prediction.bothYes * 100).toFixed(1)}%

## 新闻因素
主队新闻情感: ${features.homeNewsSentiment.toFixed(2)} | 客队: ${features.awayNewsSentiment.toFixed(2)}

请输出严格 JSON 格式:
{
  "predictedScore": "X-X",
  "predictedResult": "H/D/A",
  "halfFull": "WW/WD/WL/DW/DD/DL/LW/LD/LL",
  "analysis": "详细分析200字以内",
  "confidence": 0-100,
  "keyFactors": ["因素1", "因素2", "因素3"]
}`;
  }
}
