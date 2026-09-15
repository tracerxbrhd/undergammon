export function ratingDelta(rating: number, opponent: number, played: number, won: boolean) {
  const expected = 1 / (1 + 10 ** ((opponent - rating) / 400));
  return Math.round((played < 10 ? 64 : 32) * ((won ? 1 : 0) - expected));
}
export function levelFromXp(xp: number) {
  return Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
}
export function levelProgressFromXp(xp: number) {
  const level = levelFromXp(xp);
  const levelStartTotalXp = 50 * level * (level - 1);
  const nextLevelTotalXp = 50 * level * (level + 1);
  return {
    levelStartTotalXp,
    nextLevelTotalXp,
    xpIntoLevel: xp - levelStartTotalXp,
    xpRequiredForNextLevel: nextLevelTotalXp - levelStartTotalXp,
  };
}
export function matchXp(mode: string, reason: string, won: boolean) {
  return reason === 'BEAR_OFF' ? Math.round((won ? 100 : 40) * (mode === 'PRIVATE' ? 0.5 : 1)) : 0;
}
export function rankedCoins(streak: number) {
  return 20 + ({ 3: 30, 5: 70, 10: 200 }[streak] ?? 0);
}
export function ratingWindow(seconds: number) {
  return seconds < 10
    ? 100
    : seconds < 20
      ? 250
      : seconds < 30
        ? 500
        : seconds < 45
          ? 800
          : Infinity;
}
export const adjectives = ['Quiet', 'Silver', 'Brave', 'Amber'] as const;
export const nouns = ['Fox', 'Falcon', 'Otter', 'Lynx'] as const;
export const avatars = ['fox', 'falcon', 'otter', 'lynx'] as const;
export function validateNickname(value: string) {
  const name = value.normalize('NFKC').trim();
  if (
    !/^[\p{L}\p{N} _-]{3,24}$/u.test(name) ||
    /(admin|moderator|support|undergammon|админ|модератор|поддержк|fuck|shit|nazi|hitler|хуй|пизд|бляд)/iu.test(
      name,
    )
  )
    throw new Error('INVALID_NICKNAME');
  return name;
}
