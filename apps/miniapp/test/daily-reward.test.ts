import { describe, expect, it } from 'vitest';
import type { DailyRewardStatus } from '@undergammon/protocol';
import { rewardCountdown, rewardStepState } from '../src/DailyReward';

const status = (claimedToday: boolean, currentDay = 3): DailyRewardStatus => ({
  rewards: [5, 5, 10, 10, 15, 20, 35].map((coins, index) => ({ day: index + 1, coins })),
  currentDay,
  claimedToday,
  lastClaimDate: claimedToday ? '2026-09-15' : '2026-09-14',
  nextClaimAt: claimedToday ? '2026-09-16T00:00:00.000Z' : null,
});

describe('Daily Reward presentation', () => {
  it('marks only prior cycle steps complete and the server-selected step current', () => {
    const available = status(false);
    expect(available.rewards.map(({ day }) => rewardStepState(available, day))).toEqual([
      'completed',
      'completed',
      'current',
      'future',
      'future',
      'future',
      'future',
    ]);
    expect(rewardStepState(status(false, 1), 7)).toBe('future');
  });

  it('formats the backend next-claim timestamp without deciding eligibility', () => {
    expect(rewardCountdown('2026-09-16T00:00:00.000Z', Date.parse('2026-09-15T17:18:01Z'))).toBe(
      '06:42',
    );
    expect(rewardCountdown('2026-09-16T00:00:00.000Z', Date.parse('2026-09-16T00:00:00Z'))).toBe(
      '00:00',
    );
  });
});
