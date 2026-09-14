import { it, expect } from 'vitest';
import { initialGame, openGame, legalTurns } from '@undergammon/game-engine';
import { commandSchema } from '../src/index.js';
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
