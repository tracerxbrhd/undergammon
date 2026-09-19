import { describe, expect, it } from 'vitest';
import type { Move } from '@undergammon/game-engine';
import { resolveDraftPointIntent } from '../src/game/turn-draft';

const moves = [
  { from: 0, to: 5, die: 5 },
  { from: 5, to: 11, die: 6 },
] satisfies readonly Move[];

describe('turn draft point selection', () => {
  it('selects a legal source and lets the player tap it again to cancel', () => {
    expect(resolveDraftPointIntent(moves, null, 0)).toEqual({ selected: 0, move: null });
    expect(resolveDraftPointIntent(moves, 0, 0)).toEqual({ selected: null, move: null });
  });

  it('commits the selected source when a tapped point is its legal destination', () => {
    expect(resolveDraftPointIntent(moves, 0, 5)).toEqual({
      selected: null,
      move: { from: 0, to: 5, die: 5 },
    });
  });

  it('allows an alternate source after the current selection is cancelled', () => {
    const cancelled = resolveDraftPointIntent(moves, 0, 0);
    expect(resolveDraftPointIntent(moves, cancelled.selected, 5)).toEqual({
      selected: 5,
      move: null,
    });
  });
});
