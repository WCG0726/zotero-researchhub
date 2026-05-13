/**
 * Academic tier/rank system - ported from ResearchHub src/utils/rank.js
 */

export interface Tier {
  name: string;
  icon: string;
  color: string;
  minXP: number;
}

export const TIERS: Tier[] = [
  { name: "实习生", icon: "\u{1F331}", color: "#94a3b8", minXP: 0 },
  { name: "研究助理", icon: "\u{1F535}", color: "#3b82f6", minXP: 50 },
  { name: "初级研究员", icon: "\u{1F7E2}", color: "#22c55e", minXP: 150 },
  { name: "中级研究员", icon: "\u{1F7E1}", color: "#eab308", minXP: 350 },
  { name: "高级研究员", icon: "\u{1F7E0}", color: "#f97316", minXP: 700 },
  { name: "资深研究员", icon: "\u{1F534}", color: "#ef4444", minXP: 1200 },
  { name: "首席科学家", icon: "\u{1F7E3}", color: "#a855f7", minXP: 2000 },
  { name: "学术泰斗", icon: "⭐", color: "#f59e0b", minXP: 3500 },
];

export function calculateXP(data: {
  checkinDays?: number;
  maxStreak?: number;
  currentStreak?: number;
  pomodoroCount?: number;
  recordsCount?: number;
  litNotesCount?: number;
  experimentsCount?: number;
  milestonesCount?: number;
  meetingsCount?: number;
  inspirationsCount?: number;
}): number {
  const {
    checkinDays = 0,
    maxStreak = 0,
    currentStreak = 0,
    pomodoroCount = 0,
    recordsCount = 0,
    litNotesCount = 0,
    experimentsCount = 0,
    milestonesCount = 0,
    meetingsCount = 0,
    inspirationsCount = 0,
  } = data;

  return (
    currentStreak * 3 +
    maxStreak * 2 +
    checkinDays * 1 +
    pomodoroCount * 2 +
    recordsCount * 3 +
    litNotesCount * 4 +
    experimentsCount * 3 +
    milestonesCount * 5 +
    meetingsCount * 2 +
    inspirationsCount * 1
  );
}

export function getTier(xp: number): {
  tier: Tier;
  nextTier: Tier | null;
  progress: number;
  xp: number;
} {
  let tier = TIERS[0];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (xp >= TIERS[i].minXP) {
      tier = TIERS[i];
      break;
    }
  }

  const tierIndex = TIERS.indexOf(tier);
  const nextTier = tierIndex < TIERS.length - 1 ? TIERS[tierIndex + 1] : null;

  let progress = 1;
  if (nextTier) {
    const rangeXP = nextTier.minXP - tier.minXP;
    const earnedXP = xp - tier.minXP;
    progress = Math.min(1, earnedXP / rangeXP);
  }

  return { tier, nextTier, progress, xp };
}
