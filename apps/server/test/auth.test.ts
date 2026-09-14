import { signedInitData } from './helpers.js';
import { describe, it, expect } from 'vitest';
import { verifyTelegram } from '../src/auth.js';
import { ratingDelta, matchXp, levelFromXp, validateNickname } from '../src/policy.js';
describe('authentication and rewards', () => {
  it('validates signature, age, future timestamps and duplicate keys', () => {
    const token = '123456:testing-token-no-real-secret';
    const raw = signedInitData(123, token, 1000);
    expect(verifyTelegram(raw, token, 1010).subject).toBe('123');
    expect(() => verifyTelegram(raw + 'x', token, 1010)).toThrow();
    expect(() => verifyTelegram(raw, token, 1400)).toThrow();
    expect(() => verifyTelegram(raw, token, 900)).toThrow();
    expect(() => verifyTelegram(raw + '&user=x', token, 1010)).toThrow();
    expect(() => verifyTelegram(raw, 'different', 1010)).toThrow();
  });
  it('rates upsets more highly and calibrates faster', () => {
    expect(ratingDelta(1000, 1400, 20, true)).toBeGreaterThan(ratingDelta(1400, 1000, 20, true));
    expect(ratingDelta(1000, 1000, 0, true)).toBe(32);
    expect(ratingDelta(1000, 1000, 10, true)).toBe(16);
  });
  it('grants no XP for early or uncounted results', () => {
    for (const reason of ['NO_CONTEST', 'SURRENDER', 'TIMEOUT', 'ABANDON', 'START_TIMEOUT'])
      expect(matchXp('RANKED', reason, true)).toBe(0);
    expect(matchXp('RANKED', 'BEAR_OFF', true)).toBeGreaterThan(
      matchXp('RANKED', 'BEAR_OFF', false),
    );
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
  });
  it('moderates reserved and deceptive nicknames', () => {
    expect(() => validateNickname('ＡＤＭＩＮ')).toThrow();
    expect(() => validateNickname('https://ad.test')).toThrow();
    expect(validateNickname('Тихий Лис')).toBe('Тихий Лис');
  });
});
