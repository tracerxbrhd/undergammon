import { useEffect, useRef, useState } from 'react';
import type { DailyRewardClaimResult, DailyRewardStatus } from '@undergammon/protocol';
import { copy, type Language } from './content';
import { api, platform } from './platform';
import { BottomSheet } from './ui';

export function rewardStepState(
  status: DailyRewardStatus,
  day: number,
): 'completed' | 'current' | 'future' {
  if (day === status.currentDay) return 'current';
  return day < status.currentDay ? 'completed' : 'future';
}

export function rewardCountdown(nextClaimAt: string, now: number): string {
  const remaining = Math.max(0, new Date(nextClaimAt).getTime() - now);
  const totalMinutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 99
    ? `${Math.ceil(totalMinutes / (24 * 60))}d`
    : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

interface DailyRewardProps {
  language: Language;
  onBalance: (balance: number) => void;
  onStaleClaim: () => Promise<void>;
}

export function DailyReward({ language, onBalance, onStaleClaim }: DailyRewardProps) {
  const t = copy[language];
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [received, setReceived] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const expirationRefresh = useRef<string | null>(null);

  const refreshStatus = async () => {
    try {
      setStatus(await api<DailyRewardStatus>('/daily-reward'));
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    if (!status?.claimedToday || !status.nextClaimAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status?.claimedToday, status?.nextClaimAt]);

  useEffect(() => {
    const next = status?.nextClaimAt;
    if (!status?.claimedToday || !next || new Date(next).getTime() > now) return;
    if (expirationRefresh.current === next) return;
    expirationRefresh.current = next;
    void refreshStatus();
  }, [now, status?.claimedToday, status?.nextClaimAt]);

  const claim = async () => {
    if (!status || status.claimedToday || claiming) return;
    setClaiming(true);
    try {
      const result = await api<DailyRewardClaimResult>('/daily-reward/claim', 'POST');
      setStatus(result.status);
      onBalance(result.balance);
      setReceived(result.rewardCoins);
      platform.haptic();
    } catch (error) {
      if (error instanceof Error && error.message === 'DAILY_REWARD_ALREADY_CLAIMED') {
        await refreshStatus();
        try {
          await onStaleClaim();
        } catch {
          // Reward state remains usable even if the optional profile balance refresh fails.
        }
      }
    } finally {
      setClaiming(false);
    }
  };

  const available = status?.claimedToday === false;
  const countdown =
    status?.claimedToday && status.nextClaimAt ? rewardCountdown(status.nextClaimAt, now) : null;
  const label = available
    ? t.dailyRewardAvailable
    : countdown
      ? `${t.dailyRewardClaimed}. ${t.nextReward} ${countdown}`
      : t.dailyRewardUnavailable;

  return (
    <div className={`daily-reward-control ${available ? 'available' : 'inactive'}`}>
      <button
        type="button"
        className="reward-trigger"
        aria-label={label}
        disabled={!available}
        onClick={() => {
          setReceived(null);
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M5 13h22v14H5zM4 9h24v6H4zM15 9h2v18M8 9c-1-4 5-5 8 0M24 9c1-4-5-5-8 0" />
        </svg>
        {available && <span className="reward-dot" />}
      </button>
      {countdown && <small className="reward-countdown">{countdown}</small>}
      {open && status && (
        <BottomSheet label={t.dailyReward} onClose={() => setOpen(false)}>
          <div className="daily-reward-sheet">
            <div className="reward-sheet-heading">
              <div>
                <p className="eyebrow">{t.rewardCycle}</p>
                <h2>{t.dailyReward}</h2>
              </div>
              <button className="sheet-close" onClick={() => setOpen(false)} aria-label={t.close}>
                ×
              </button>
            </div>
            <div className="reward-grid" aria-label={t.rewardCycle}>
              {status.rewards.map((reward) => {
                const state = rewardStepState(status, reward.day);
                const completed =
                  state === 'completed' || (state === 'current' && status.claimedToday);
                return (
                  <div
                    className={`reward-step ${state} ${completed ? 'is-completed' : ''}`}
                    aria-current={state === 'current' ? 'step' : undefined}
                    key={reward.day}
                  >
                    <small>
                      {t.day} {reward.day}
                    </small>
                    <strong>
                      {completed ? '✓ ' : ''}
                      {reward.coins}
                    </strong>
                    <span>{t.coins}</span>
                  </div>
                );
              })}
            </div>
            {received !== null && (
              <p className="reward-success" role="status">
                ✓ +{received} {t.coins}
              </p>
            )}
            <button
              className="primary reward-claim"
              disabled={claiming || status.claimedToday}
              onClick={() => void claim()}
            >
              {claiming
                ? t.claiming
                : status.claimedToday
                  ? t.claimed
                  : `${t.claim} ${status.rewards.find((reward) => reward.day === status.currentDay)?.coins ?? ''} ${t.coins}`}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
