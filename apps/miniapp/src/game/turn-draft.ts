import type { Move } from '@undergammon/game-engine';

export type BoardSelection = number | 'BAR' | null;

export interface DraftPointIntent {
  readonly selected: BoardSelection;
  readonly move: Move | null;
}

/**
 * Resolves a board tap without mutating the authoritative game state.
 *
 * Tapping the currently selected source cancels that selection. A destination
 * keeps priority over another source when a point can represent both; the
 * player can always deselect first and then choose the alternate source.
 */
export function resolveDraftPointIntent(
  next: readonly Move[],
  selected: BoardSelection,
  point: number | 'BAR',
): DraftPointIntent {
  if (point === selected) return { selected: null, move: null };

  const destination =
    selected === null
      ? undefined
      : next.find((move) => move.from === selected && move.to === point);
  if (destination) return { selected: null, move: destination };

  if (next.some((move) => move.from === point)) return { selected: point, move: null };

  return { selected, move: null };
}
