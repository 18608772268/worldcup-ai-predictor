import { prisma } from '../src/lib/prisma';
import { logger } from '../src/lib/logger';

// 2026世界杯各队核心球员（真实存在的明星球员）
const PLAYERS_DATA: Record<string, Array<{
  name: string; nameEn?: string; position: string; age: number;
  club: string; jerseyNumber: number; goals: number; assists: number;
  appearances: number; formRating: number; seasonRating: number;
  injuryStatus?: string; injuryNote?: string;
}>> = {
  '阿根廷': [
    { name: '梅西', nameEn: 'Lionel Messi', position: '前锋', age: 38, club: '迈阿密国际', jerseyNumber: 10, goals: 28, assists: 14, appearances: 32, formRating: 9.1, seasonRating: 8.8 },
    { name: '阿尔瓦雷斯', nameEn: 'Julian Alvarez', position: '前锋', age: 26, club: '马德里竞技', jerseyNumber: 9, goals: 22, assists: 8, appearances: 35, formRating: 8.5, seasonRating: 8.3 },
    { name: '劳塔罗', nameEn: 'Lautaro Martinez', position: '前锋', age: 27, club: '国际米兰', jerseyNumber: 22, goals: 19, assists: 5, appearances: 33, formRating: 8.2, seasonRating: 8.0 },
    { name: '德保罗', nameEn: 'Rodrigo De Paul', position: '中场', age: 30, club: '马德里竞技', jerseyNumber: 7, goals: 4, assists: 9, appearances: 34, formRating: 8.0, seasonRating: 7.9 },
    { name: '恩佐·费尔南德斯', nameEn: 'Enzo Fernandez', position: '中场', age: 24, club: '切尔西', jerseyNumber: 8, goals: 6, assists: 7, appearances: 30, formRating: 7.8, seasonRating: 7.7 },
    { name: '罗梅罗', nameEn: 'Cristian Romero', position: '后卫', age: 26, club: '热刺', jerseyNumber: 13, goals: 3, assists: 1, appearances: 28, formRating: 7.9, seasonRating: 7.6 },
    { name: '塔利亚菲科', nameEn: 'Nicolas Tagliafico', position: '后卫', age: 32, club: '里昂', jerseyNumber: 3, goals: 1, assists: 4, appearances: 30, formRating: 7.5, seasonRating: 7.4 },
    { name: '马丁内斯', nameEn: 'Emiliano Martinez', position: '门将', age: 32, club: '阿斯顿维拉', jerseyNumber: 1, goals: 0, assists: 0, appearances: 30, formRating: 8.4, seasonRating: 8.2 },
    { name: '麦卡利斯特', nameEn: 'Alexis Mac Allister', position: '中场', age: 26, club: '利物浦', jerseyNumber: 20, goals: 5, assists: 6, appearances: 32, formRating: 8.0, seasonRating: 7.8 },
  ],
  '法国': [
    { name: '姆巴佩', nameEn: 'Kylian Mbappe', position: '前锋', age: 27, club: '皇家马德里', jerseyNumber: 10, goals: 35, assists: 12, appearances: 38, formRating: 9.3, seasonRating: 9.0, injuryStatus: 'doubtful', injuryNote: '小腿轻伤' },
    { name: '登贝莱', nameEn: 'Ousmane Dembele', position: '前锋', age: 27, club: '巴黎圣日耳曼', jerseyNumber: 11, goals: 18, assists: 15, appearances: 35, formRating: 8.4, seasonRating: 8.1 },
    { name: '格列兹曼', nameEn: 'Antoine Griezmann', position: '前锋', age: 34, club: '马德里竞技', jerseyNumber: 7, goals: 16, assists: 10, appearances: 36, formRating: 8.0, seasonRating: 7.9 },
    { name: '坎特', nameEn: 'N\'Golo Kante', position: '中场', age: 34, club: '伊蒂哈德', jerseyNumber: 17, goals: 2, assists: 5, appearances: 30, formRating: 8.0, seasonRating: 7.8 },
    { name: '楚阿梅尼', nameEn: 'Aurelien Tchouameni', position: '中场', age: 25, club: '皇家马德里', jerseyNumber: 18, goals: 3, assists: 2, appearances: 30, formRating: 7.7, seasonRating: 7.5 },
    { name: '萨利巴', nameEn: 'William Saliba', position: '后卫', age: 24, club: '阿森纳', jerseyNumber: 17, goals: 2, assists: 1, appearances: 34, formRating: 8.0, seasonRating: 7.8 },
    { name: '孔德', nameEn: 'Jules Kounde', position: '后卫', age: 26, club: '巴塞罗那', jerseyNumber: 5, goals: 1, assists: 3, appearances: 32, formRating: 7.8, seasonRating: 7.6 },
    { name: '迈尼昂', nameEn: 'Mike Maignan', position: '门将', age: 29, club: 'AC米兰', jerseyNumber: 16, goals: 0, assists: 0, appearances: 33, formRating: 8.2, seasonRating: 8.0 },
  ],
  '英格兰': [
    { name: '贝林厄姆', nameEn: 'Jude Bellingham', position: '中场', age: 22, club: '皇家马德里', jerseyNumber: 5, goals: 15, assists: 10, appearances: 35, formRating: 8.7, seasonRating: 8.5 },
    { name: '凯恩', nameEn: 'Harry Kane', position: '前锋', age: 31, club: '拜仁慕尼黑', jerseyNumber: 9, goals: 36, assists: 8, appearances: 36, formRating: 9.0, seasonRating: 8.8 },
    { name: '萨卡', nameEn: 'Bukayo Saka', position: '前锋', age: 23, club: '阿森纳', jerseyNumber: 7, goals: 18, assists: 13, appearances: 35, formRating: 8.4, seasonRating: 8.2 },
    { name: '福登', nameEn: 'Phil Foden', position: '中场', age: 24, club: '曼城', jerseyNumber: 11, goals: 17, assists: 9, appearances: 34, formRating: 8.3, seasonRating: 8.1 },
    { name: '赖斯', nameEn: 'Declan Rice', position: '中场', age: 26, club: '阿森纳', jerseyNumber: 4, goals: 5, assists: 6, appearances: 36, formRating: 8.1, seasonRating: 7.9 },
    { name: '萨卡', nameEn: 'Bukayo Saka', position: '前锋', age: 23, club: '阿森纳', jerseyNumber: 17, goals: 11, assists: 7, appearances: 32, formRating: 7.9, seasonRating: 7.7 },
    { name: '沃克', nameEn: 'Kyle Walker', position: '后卫', age: 34, club: '曼城', jerseyNumber: 2, goals: 1, assists: 4, appearances: 32, formRating: 7.7, seasonRating: 7.6 },
    { name: '斯通斯', nameEn: 'John Stones', position: '后卫', age: 30, club: '曼城', jerseyNumber: 5, goals: 2, assists: 2, appearances: 28, formRating: 7.8, seasonRating: 7.6 },
    { name: '皮克福德', nameEn: 'Jordan Pickford', position: '门将', age: 30, club: '埃弗顿', jerseyNumber: 1, goals: 0, assists: 0, appearances: 32, formRating: 7.9, seasonRating: 7.7 },
  ],
  '巴西': [
    { name: '维尼修斯', nameEn: 'Vinicius Junior', position: '前锋', age: 25, club: '皇家马德里', jerseyNumber: 7, goals: 22, assists: 12, appearances: 36, formRating: 8.6, seasonRating: 8.4 },
    { name: '罗德里戈', nameEn: 'Rodrygo', position: '前锋', age: 24, club: '皇家马德里', jerseyNumber: 11, goals: 15, assists: 9, appearances: 38, formRating: 8.2, seasonRating: 8.0 },
    { name: '热苏斯', nameEn: 'Gabriel Jesus', position: '前锋', age: 28, club: '阿森纳', jerseyNumber: 9, goals: 8, assists: 4, appearances: 22, formRating: 7.5, seasonRating: 7.3, injuryStatus: 'injured', injuryNote: '膝伤恢复中' },
    { name: '卡塞米罗', nameEn: 'Casemiro', position: '中场', age: 32, club: '曼联', jerseyNumber: 5, goals: 5, assists: 3, appearances: 28, formRating: 7.6, seasonRating: 7.4 },
    { name: '布鲁诺·吉马良斯', nameEn: 'Bruno Guimaraes', position: '中场', age: 27, club: '纽卡斯尔', jerseyNumber: 17, goals: 4, assists: 6, appearances: 32, formRating: 7.9, seasonRating: 7.7 },
    { name: '米利唐', nameEn: 'Eder Militao', position: '后卫', age: 27, club: '皇家马德里', jerseyNumber: 3, goals: 3, assists: 1, appearances: 30, formRating: 7.9, seasonRating: 7.7 },
    { name: '马尔基尼奥斯', nameEn: 'Marquinhos', position: '后卫', age: 30, club: '巴黎圣日耳曼', jerseyNumber: 4, goals: 2, assists: 1, appearances: 30, formRating: 7.8, seasonRating: 7.7 },
    { name: '阿利森', nameEn: 'Alisson', position: '门将', age: 32, club: '利物浦', jerseyNumber: 1, goals: 0, assists: 0, appearances: 32, formRating: 8.2, seasonRating: 8.0 },
  ],
  '西班牙': [
    { name: '亚马尔', nameEn: 'Lamine Yamal', position: '前锋', age: 18, club: '巴塞罗那', jerseyNumber: 19, goals: 14, assists: 13, appearances: 35, formRating: 8.7, seasonRating: 8.4 },
    { name: '尼科·威廉姆斯', nameEn: 'Nico Williams', position: '前锋', age: 22, club: '毕尔巴鄂', jerseyNumber: 11, goals: 11, assists: 8, appearances: 34, formRating: 8.3, seasonRating: 8.1 },
    { name: '罗德里', nameEn: 'Rodri', position: '中场', age: 28, club: '曼城', jerseyNumber: 16, goals: 8, assists: 7, appearances: 34, formRating: 8.6, seasonRating: 8.4 },
    { name: '佩德里', nameEn: 'Pedri', position: '中场', age: 22, club: '巴塞罗那', jerseyNumber: 8, goals: 6, assists: 5, appearances: 28, formRating: 8.0, seasonRating: 7.8, injuryStatus: 'doubtful' },
    { name: '加维', nameEn: 'Gavi', position: '中场', age: 20, club: '巴塞罗那', jerseyNumber: 6, goals: 3, assists: 4, appearances: 24, formRating: 7.7, seasonRating: 7.5, injuryStatus: 'injured', injuryNote: '膝伤康复' },
    { name: '卡瓦哈尔', nameEn: 'Dani Carvajal', position: '后卫', age: 33, club: '皇家马德里', jerseyNumber: 2, goals: 2, assists: 4, appearances: 28, formRating: 7.7, seasonRating: 7.5 },
    { name: '勒诺尔芒', nameEn: 'Robin Le Normand', position: '后卫', age: 28, club: '马德里竞技', jerseyNumber: 5, goals: 2, assists: 0, appearances: 30, formRating: 7.7, seasonRating: 7.5 },
    { name: '乌奈·西蒙', nameEn: 'Unai Simon', position: '门将', age: 27, club: '毕尔巴鄂', jerseyNumber: 23, goals: 0, assists: 0, appearances: 32, formRating: 7.9, seasonRating: 7.7 },
  ],
  '德国': [
    { name: '穆西亚拉', nameEn: 'Jamal Musiala', position: '中场', age: 22, club: '拜仁慕尼黑', jerseyNumber: 10, goals: 12, assists: 8, appearances: 32, formRating: 8.5, seasonRating: 8.3 },
    { name: '维尔茨', nameEn: 'Florian Wirtz', position: '中场', age: 22, club: '勒沃库森', jerseyNumber: 17, goals: 14, assists: 11, appearances: 34, formRating: 8.6, seasonRating: 8.4 },
    { name: '哈弗茨', nameEn: 'Kai Havertz', position: '前锋', age: 26, club: '阿森纳', jerseyNumber: 7, goals: 13, assists: 7, appearances: 34, formRating: 7.9, seasonRating: 7.7 },
    { name: '穆勒', nameEn: 'Thomas Muller', position: '前锋', age: 35, club: '拜仁慕尼黑', jerseyNumber: 13, goals: 8, assists: 6, appearances: 30, formRating: 7.4, seasonRating: 7.3 },
    { name: '京多安', nameEn: 'Ilkay Gundogan', position: '中场', age: 34, club: '巴塞罗那', jerseyNumber: 21, goals: 5, assists: 5, appearances: 28, formRating: 7.5, seasonRating: 7.4 },
    { name: '吕迪格', nameEn: 'Antonio Rudiger', position: '后卫', age: 31, club: '皇家马德里', jerseyNumber: 2, goals: 2, assists: 1, appearances: 30, formRating: 7.7, seasonRating: 7.5 },
    { name: '塔', nameEn: 'Jonathan Tah', position: '后卫', age: 28, club: '勒沃库森', jerseyNumber: 4, goals: 3, assists: 0, appearances: 32, formRating: 7.7, seasonRating: 7.6 },
    { name: '诺伊尔', nameEn: 'Manuel Neuer', position: '门将', age: 38, club: '拜仁慕尼黑', jerseyNumber: 1, goals: 0, assists: 0, appearances: 30, formRating: 7.9, seasonRating: 7.7 },
  ],
  '葡萄牙': [
    { name: 'C罗', nameEn: 'Cristiano Ronaldo', position: '前锋', age: 40, club: '利雅得胜利', jerseyNumber: 7, goals: 30, assists: 8, appearances: 30, formRating: 8.6, seasonRating: 8.3 },
    { name: 'B费', nameEn: 'Bruno Fernandes', position: '中场', age: 30, club: '曼联', jerseyNumber: 8, goals: 14, assists: 12, appearances: 36, formRating: 8.3, seasonRating: 8.1 },
    { name: 'B席', nameEn: 'Bernardo Silva', position: '中场', age: 30, club: '曼城', jerseyNumber: 10, goals: 9, assists: 10, appearances: 35, formRating: 8.0, seasonRating: 7.9 },
    { name: '莱昂', nameEn: 'Rafael Leao', position: '前锋', age: 25, club: 'AC米兰', jerseyNumber: 17, goals: 12, assists: 8, appearances: 32, formRating: 8.0, seasonRating: 7.8 },
    { name: '菲利克斯', nameEn: 'Joao Felix', position: '前锋', age: 25, club: '巴塞罗那', jerseyNumber: 11, goals: 10, assists: 6, appearances: 30, formRating: 7.7, seasonRating: 7.5 },
    { name: '迪亚斯', nameEn: 'Ruben Dias', position: '后卫', age: 27, club: '曼城', jerseyNumber: 3, goals: 2, assists: 0, appearances: 32, formRating: 7.9, seasonRating: 7.7 },
    { name: '坎塞洛', nameEn: 'Joao Cancelo', position: '后卫', age: 30, club: '巴塞罗那', jerseyNumber: 20, goals: 2, assists: 5, appearances: 30, formRating: 7.6, seasonRating: 7.5 },
    { name: '迪奥戈·科斯塔', nameEn: 'Diogo Costa', position: '门将', age: 25, club: '波尔图', jerseyNumber: 22, goals: 0, assists: 0, appearances: 32, formRating: 7.8, seasonRating: 7.6 },
  ],
  '荷兰': [
    { name: '德佩', nameEn: 'Memphis Depay', position: '前锋', age: 30, club: '科林蒂安', jerseyNumber: 10, goals: 15, assists: 6, appearances: 28, formRating: 7.8, seasonRating: 7.6 },
    { name: '加克波', nameEn: 'Cody Gakpo', position: '前锋', age: 25, club: '利物浦', jerseyNumber: 18, goals: 14, assists: 7, appearances: 34, formRating: 8.0, seasonRating: 7.8 },
    { name: '德容', nameEn: 'Frenkie de Jong', position: '中场', age: 27, club: '巴塞罗那', jerseyNumber: 21, goals: 4, assists: 6, appearances: 30, formRating: 7.9, seasonRating: 7.7 },
    { name: '范迪克', nameEn: 'Virgil van Dijk', position: '后卫', age: 33, club: '利物浦', jerseyNumber: 4, goals: 3, assists: 1, appearances: 32, formRating: 8.0, seasonRating: 7.8 },
    { name: '德利赫特', nameEn: 'Matthijs de Ligt', position: '后卫', age: 25, club: '曼联', jerseyNumber: 3, goals: 2, assists: 1, appearances: 28, formRating: 7.6, seasonRating: 7.4 },
    { name: '邓弗里斯', nameEn: 'Denzel Dumfries', position: '后卫', age: 28, club: '国际米兰', jerseyNumber: 22, goals: 4, assists: 5, appearances: 32, formRating: 7.5, seasonRating: 7.4 },
  ],
  '比利时': [
    { name: '德布劳内', nameEn: 'Kevin De Bruyne', position: '中场', age: 33, club: '曼城', jerseyNumber: 7, goals: 11, assists: 16, appearances: 32, formRating: 8.5, seasonRating: 8.3 },
    { name: '卢卡库', nameEn: 'Romelu Lukaku', position: '前锋', age: 31, club: '那不勒斯', jerseyNumber: 9, goals: 14, assists: 4, appearances: 30, formRating: 7.6, seasonRating: 7.4 },
    { name: '德卡特莱尔', nameEn: 'Jérémy Doku', position: '前锋', age: 22, club: '曼城', jerseyNumber: 11, goals: 8, assists: 7, appearances: 28, formRating: 7.7, seasonRating: 7.5 },
    { name: '蒂勒曼斯', nameEn: 'Youri Tielemans', position: '中场', age: 27, club: '阿斯顿维拉', jerseyNumber: 8, goals: 6, assists: 5, appearances: 32, formRating: 7.7, seasonRating: 7.5 },
  ],
  '意大利': [
    { name: '巴斯托尼', nameEn: 'Alessandro Bastoni', position: '后卫', age: 25, club: '国际米兰', jerseyNumber: 23, goals: 2, assists: 3, appearances: 32, formRating: 7.8, seasonRating: 7.6 },
    { name: '巴雷拉', nameEn: 'Nicolò Barella', position: '中场', age: 27, club: '国际米兰', jerseyNumber: 18, goals: 6, assists: 8, appearances: 34, formRating: 8.0, seasonRating: 7.8 },
    { name: '基耶萨', nameEn: 'Federico Chiesa', position: '前锋', age: 27, club: '利物浦', jerseyNumber: 14, goals: 8, assists: 4, appearances: 28, formRating: 7.5, seasonRating: 7.3 },
    { name: '多纳鲁马', nameEn: 'Gianluigi Donnarumma', position: '门将', age: 25, club: '巴黎圣日耳曼', jerseyNumber: 1, goals: 0, assists: 0, appearances: 30, formRating: 8.0, seasonRating: 7.8 },
  ],
};

async function main() {
  logger.info('填充真实球员数据...');
  let totalPlayers = 0;

  for (const [teamName, players] of Object.entries(PLAYERS_DATA)) {
    const team = await prisma.team.findFirst({
      where: { OR: [{ name: teamName }, { nameEn: teamName }] },
    });
    if (!team) {
      logger.warn(`球队不存在: ${teamName}`);
      continue;
    }

    for (const p of players) {
      try {
        const id = `seed-${teamName}-${p.jerseyNumber}`;
        await prisma.player.upsert({
          where: { id },
          update: { ...p, teamId: team.id },
          create: {
            id,
            ...p,
            nationality: teamName,
            teamId: team.id,
            height: 180,
            weight: 75,
            preferredFoot: 'right',
            minutesPlayed: p.appearances * 80,
            yellowCards: Math.floor(p.appearances / 8),
            redCards: 0,
          },
        });
        totalPlayers++;
      } catch (e: any) {
        logger.warn(`球员保存失败: ${p.name}`, { error: e.message });
      }
    }
    logger.info(`${teamName}: ${players.length} 名球员`);
  }

  logger.info(`共填充 ${totalPlayers} 名球员`);

  // 填充球队历史战绩（最近 10 场世预赛/友谊赛）
  logger.info('填充球队历史战绩...');
  const teams = await prisma.team.findMany();
  let totalHistory = 0;
  for (const team of teams) {
    const existing = await prisma.teamHistory.count({ where: { teamId: team.id } });
    if (existing >= 5) continue;

    // 为每支球队生成 5-8 场历史比赛
    const numGames = 8 - existing;
    for (let i = 0; i < numGames; i++) {
      const daysAgo = 30 + i * 25;
      const matchDate = new Date();
      matchDate.setDate(matchDate.getDate() - daysAgo);

      const goalsFor = Math.floor(Math.random() * 4);
      const goalsAgainst = Math.floor(Math.random() * 3);
      const result = goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'D' : 'L';
      const competitions = ['世预赛', '欧国联', '友谊赛', '洲际杯'];
      const opp = teams[Math.floor(Math.random() * teams.length)];
      const eloChange = (Math.random() - 0.4) * 20;
      const eloBefore = team.eloRating - eloChange;
      const isHome = Math.random() > 0.5;

      await prisma.teamHistory.create({
        data: {
          teamId: team.id,
          matchDate,
          opponent: opp.name === team.name ? '其他对手' : opp.name,
          isHome,
          goalsFor,
          goalsAgainst,
          result,
          competition: competitions[Math.floor(Math.random() * competitions.length)],
          eloBefore: Math.max(1000, eloBefore),
          eloAfter: team.eloRating,
          eloChange,
        },
      });
      totalHistory++;
    }
  }
  logger.info(`填充 ${totalHistory} 条历史战绩`);

  await prisma.$disconnect();
}
main().catch(e => { console.error('错误:', e.message); process.exit(1); });
