import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WORLD_CUP_TEAMS_2026 = [
  { name: '阿根廷', nameEn: 'Argentina', country: '阿根廷', countryCode: 'ARG', fifaRanking: 1, coachName: '斯卡洛尼' },
  { name: '法国', nameEn: 'France', country: '法国', countryCode: 'FRA', fifaRanking: 2, coachName: '德尚' },
  { name: '西班牙', nameEn: 'Spain', country: '西班牙', countryCode: 'ESP', fifaRanking: 3, coachName: '德拉富恩特' },
  { name: '英格兰', nameEn: 'England', country: '英格兰', countryCode: 'ENG', fifaRanking: 4, coachName: '索斯盖特' },
  { name: '巴西', nameEn: 'Brazil', country: '巴西', countryCode: 'BRA', fifaRanking: 5, coachName: '多里瓦尔' },
  { name: '比利时', nameEn: 'Belgium', country: '比利时', countryCode: 'BEL', fifaRanking: 6, coachName: '特德斯科' },
  { name: '荷兰', nameEn: 'Netherlands', country: '荷兰', countryCode: 'NED', fifaRanking: 7, coachName: '科曼' },
  { name: '葡萄牙', nameEn: 'Portugal', country: '葡萄牙', countryCode: 'POR', fifaRanking: 8, coachName: '马丁内斯' },
  { name: '德国', nameEn: 'Germany', country: '德国', countryCode: 'GER', fifaRanking: 9, coachName: '纳格尔斯曼' },
  { name: '意大利', nameEn: 'Italy', country: '意大利', countryCode: 'ITA', fifaRanking: 10, coachName: '斯帕莱蒂' },
  { name: '克罗地亚', nameEn: 'Croatia', country: '克罗地亚', countryCode: 'CRO', fifaRanking: 11, coachName: '达利奇' },
  { name: '乌拉圭', nameEn: 'Uruguay', country: '乌拉圭', countryCode: 'URU', fifaRanking: 12, coachName: '比尔萨' },
  { name: '美国', nameEn: 'USA', country: '美国', countryCode: 'USA', fifaRanking: 13, coachName: '贝尔哈特' },
  { name: '墨西哥', nameEn: 'Mexico', country: '墨西哥', countryCode: 'MEX', fifaRanking: 14, coachName: '阿吉雷' },
  { name: '日本', nameEn: 'Japan', country: '日本', countryCode: 'JPN', fifaRanking: 15, coachName: '森保一' },
  { name: '韩国', nameEn: 'South Korea', country: '韩国', countryCode: 'KOR', fifaRanking: 16, coachName: '克林斯曼' },
  { name: '瑞士', nameEn: 'Switzerland', country: '瑞士', countryCode: 'SUI', fifaRanking: 17, coachName: '雅金' },
  { name: '丹麦', nameEn: 'Denmark', country: '丹麦', countryCode: 'DEN', fifaRanking: 18, coachName: '尤勒曼' },
  { name: '塞内加尔', nameEn: 'Senegal', country: '塞内加尔', countryCode: 'SEN', fifaRanking: 19, coachName: '西塞' },
  { name: '摩洛哥', nameEn: 'Morocco', country: '摩洛哥', countryCode: 'MAR', fifaRanking: 20, coachName: '雷格拉吉' },
  { name: '哥伦比亚', nameEn: 'Colombia', country: '哥伦比亚', countryCode: 'COL', fifaRanking: 21, coachName: '洛伦索' },
  { name: '波兰', nameEn: 'Poland', country: '波兰', countryCode: 'POL', fifaRanking: 22, coachName: '普罗别日' },
  { name: '澳大利亚', nameEn: 'Australia', country: '澳大利亚', countryCode: 'AUS', fifaRanking: 23, coachName: '阿诺德' },
  { name: '伊朗', nameEn: 'Iran', country: '伊朗', countryCode: 'IRN', fifaRanking: 24, coachName: '奎罗斯' },
  { name: '乌克兰', nameEn: 'Ukraine', country: '乌克兰', countryCode: 'UKR', fifaRanking: 25, coachName: '雷布罗夫' },
  { name: '奥地利', nameEn: 'Austria', country: '奥地利', countryCode: 'AUT', fifaRanking: 26, coachName: '朗尼克' },
  { name: '土耳其', nameEn: 'Turkiye', country: '土耳其', countryCode: 'TUR', fifaRanking: 27, coachName: '居内什' },
  { name: '厄瓜多尔', nameEn: 'Ecuador', country: '厄瓜多尔', countryCode: 'ECU', fifaRanking: 28, coachName: '阿尔法罗' },
  { name: '秘鲁', nameEn: 'Peru', country: '秘鲁', countryCode: 'PER', fifaRanking: 29, coachName: '奥雷利安' },
  { name: '智利', nameEn: 'Chile', country: '智利', countryCode: 'CHI', fifaRanking: 30, coachName: '加雷' },
  { name: '加拿大', nameEn: 'Canada', country: '加拿大', countryCode: 'CAN', fifaRanking: 31, coachName: '马什' },
  { name: '卡塔尔', nameEn: 'Qatar', country: '卡塔尔', countryCode: 'QAT', fifaRanking: 32, coachName: '洛佩兹' },
  { name: '沙特阿拉伯', nameEn: 'Saudi Arabia', country: '沙特阿拉伯', countryCode: 'KSA', fifaRanking: 33, coachName: '勒纳尔' },
  { name: '埃及', nameEn: 'Egypt', country: '埃及', countryCode: 'EGY', fifaRanking: 34, coachName: '加塞姆' },
  { name: '尼日利亚', nameEn: 'Nigeria', country: '尼日利亚', countryCode: 'NGA', fifaRanking: 35, coachName: '埃梅纳洛' },
  { name: '喀麦隆', nameEn: 'Cameroon', country: '喀麦隆', countryCode: 'CMR', fifaRanking: 36, coachName: '宋' },
  { name: '加纳', nameEn: 'Ghana', country: '加纳', countryCode: 'GHA', fifaRanking: 37, coachName: '奥托·阿多' },
  { name: '突尼斯', nameEn: 'Tunisia', country: '突尼斯', countryCode: 'TUN', fifaRanking: 38, coachName: '卡兹里' },
  { name: '阿尔及利亚', nameEn: 'Algeria', country: '阿尔及利亚', countryCode: 'ALG', fifaRanking: 39, coachName: '佩特科维奇' },
  { name: '科特迪瓦', nameEn: 'Ivory Coast', country: '科特迪瓦', countryCode: 'CIV', fifaRanking: 40, coachName: '法耶' },
  { name: '巴拿马', nameEn: 'Panama', country: '巴拿马', countryCode: 'PAN', fifaRanking: 41, coachName: '托马斯·克里斯蒂安森' },
  { name: '牙买加', nameEn: 'Jamaica', country: '牙买加', countryCode: 'JAM', fifaRanking: 42, coachName: '斯蒂芬·马尔多纳多' },
  { name: '哥斯达黎加', nameEn: 'Costa Rica', country: '哥斯达黎加', countryCode: 'CRC', fifaRanking: 43, coachName: '阿尔法罗' },
  { name: '南非', nameEn: 'South Africa', country: '南非', countryCode: 'RSA', fifaRanking: 44, coachName: '埃斯蒂维' },
  { name: '佛得角', nameEn: 'Cape Verde', country: '佛得角', countryCode: 'CPV', fifaRanking: 45, coachName: '佩德罗·莱特' },
  { name: '乌兹别克斯坦', nameEn: 'Uzbekistan', country: '乌兹别克斯坦', countryCode: 'UZB', fifaRanking: 46, coachName: '卡坦内茨' },
  { name: '约旦', nameEn: 'Jordan', country: '约旦', countryCode: 'JOR', fifaRanking: 47, coachName: '阿姆穆塔' },
  { name: '新西兰', nameEn: 'New Zealand', country: '新西兰', countryCode: 'NZL', fifaRanking: 48, coachName: '耶尔登' },
];

// 按 FIFA 排名计算 ELO（排名 1 ≈ 2200，排名 200 ≈ 1300）
function eloFromRanking(rank: number): number {
  return Math.round(2200 - (rank - 1) * 4.5);
}

async function main() {
  console.log('正在初始化种子数据...');

  for (const teamData of WORLD_CUP_TEAMS_2026) {
    const elo = eloFromRanking(teamData.fifaRanking);
    await prisma.team.upsert({
      where: { id: `seed-${teamData.countryCode}` },
      update: { ...teamData, eloRating: elo },
      create: {
        id: `seed-${teamData.countryCode}`,
        ...teamData,
        eloRating: elo,
        matchesPlayed: 20,
        wins: Math.floor(Math.random() * 5) + 10,
        draws: Math.floor(Math.random() * 5) + 3,
        losses: Math.floor(Math.random() * 5) + 2,
        goalsFor: Math.floor(Math.random() * 20) + 20,
        goalsAgainst: Math.floor(Math.random() * 15) + 10,
        winRate: 0.55,
        drawRate: 0.20,
        lossRate: 0.25,
        avgGoalsFor: 1.5,
        avgGoalsAgainst: 1.0,
      },
    });
  }

  // 重新计算胜率
  for (const t of WORLD_CUP_TEAMS_2026) {
    const team = await prisma.team.findUnique({ where: { id: `seed-${t.countryCode}` } });
    if (team) {
      const total = team.wins + team.draws + team.losses;
      await prisma.team.update({
        where: { id: team.id },
        data: {
          winRate: total ? team.wins / total : 0,
          drawRate: total ? team.draws / total : 0,
          lossRate: total ? team.losses / total : 0,
          avgGoalsFor: team.matchesPlayed ? team.goalsFor / team.matchesPlayed : 0,
          avgGoalsAgainst: team.matchesPlayed ? team.goalsAgainst / team.matchesPlayed : 0,
        },
      });
    }
  }

  const settings = [
    { key: 'system.model_version', value: '1.0.0', description: '模型版本' },
    { key: 'system.cron_sync', value: '*/5 * * * *', description: '同步竞彩网频率' },
    { key: 'system.cron_news', value: '*/15 * * * *', description: '新闻同步频率' },
    { key: 'system.mc_iterations', value: '100000', description: '蒙特卡洛模拟次数' },
    { key: 'system.ai_provider', value: 'minimax', description: 'AI模型提供商' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: s,
      create: s,
    });
  }

  console.log(`已创建 ${WORLD_CUP_TEAMS_2026.length} 支球队数据`);
  console.log('种子数据初始化完成');
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
