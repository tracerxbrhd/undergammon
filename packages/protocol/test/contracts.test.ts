import { describe, expect, it } from 'vitest';
import { initialGame, openGame, legalTurns } from '@undergammon/game-engine';
import {
  boardThemeIdSchema,
  commandSchema,
  cosmeticSlotSchema,
  reactionPackIdSchema,
  reactionSchema,
} from '../src/index.js';

it('accepts every shared engine opening turn as a strict wire command', () => {
  for (const ruleset of ['LONG_NARDY', 'BACKGAMMON'] as const)
    for (const moves of legalTurns(openGame(initialGame(ruleset), [6, 2]))) {
      expect(() =>
        commandSchema.parse({
          protocolVersion: 1,
          commandId: '00000000-0000-4000-8000-000000000001',
          matchId: '00000000-0000-4000-8000-000000000002',
          stateVersion: 1,
          type: 'TURN',
          moves,
        }),
      ).not.toThrow();
    }
});

describe('cosmetic contracts', () => {
  it('accepts only trusted Board Theme slot and ids', () => {
    expect(cosmeticSlotSchema.parse('BOARD_THEME')).toBe('BOARD_THEME');
    expect(boardThemeIdSchema.parse('midnight_board')).toBe('midnight_board');
    expect(boardThemeIdSchema.safeParse('remote_css').success).toBe(false);
  });

  it('accepts only trusted Reaction Pack slot, ids and semantic reactions', () => {
    expect(cosmeticSlotSchema.parse('REACTION_PACK')).toBe('REACTION_PACK');
    expect(reactionPackIdSchema.parse('neon_reactions')).toBe('neon_reactions');
    expect(reactionPackIdSchema.safeParse('https://example.test/pack.json').success).toBe(false);
    expect(reactionSchema.parse('WAVE')).toBe('WAVE');
    expect(reactionSchema.safeParse('<script>').success).toBe(false);
  });
});
