import {
  physicalPoint,
  type BackgammonBoardState,
  type BoardState,
  type GameState,
  type Move,
  type PlayerId,
} from '@undergammon/game-engine';
import type { ResolvedMatchCosmetics } from './cosmetics';
import '../styles/board-themes.css';
import '../styles/dice-skins.css';

function hasBar(board: BoardState): board is BackgammonBoardState {
  return 'bar' in board;
}

export interface BoardPointPresentation {
  readonly index: number;
  readonly physical: number;
  readonly point: number;
  readonly owner: PlayerId;
  readonly amount: number;
}

// The local player's relative head/home side is always rendered on the lower
// half. This is presentation-only: the engine keeps one canonical orientation.
const displayOrder = [
  ...Array.from({ length: 12 }, (_, index) => 23 - index),
  ...Array.from({ length: 12 }, (_, index) => index),
];

/** Maps domain points into the viewer's fixed board geometry without changing game state. */
export function resolveBoardPointPresentation(
  game: GameState,
  board: BoardState | BackgammonBoardState,
  seat: PlayerId,
): readonly BoardPointPresentation[] {
  const opponent: PlayerId = seat === 'A' ? 'B' : 'A';
  return displayOrder.map((index) => {
    const physical = physicalPoint(game, seat, index);
    let owner = seat;
    let amount = board[seat][index] ?? 0;
    if (!amount) {
      owner = opponent;
      for (let point = 0; point < 24; point++) {
        if (physicalPoint(game, opponent, point) === physical) {
          amount = board[opponent][point] ?? 0;
          break;
        }
      }
    }
    return { index, physical, point: index, owner, amount };
  });
}

/**
 * Board regions are owned by authoritative physical seat identity. This stays
 * stable across rulesets while physicalPoint() handles viewer perspective.
 */
export function boardThemeOwnerForPhysicalPoint(physical: number): PlayerId {
  return physical < 12 ? 'A' : 'B';
}

export function resolveBoardThemePresentationClass(
  physical: number,
  seat: PlayerId,
  cosmetics: ResolvedMatchCosmetics,
): string {
  const owner = boardThemeOwnerForPhysicalPoint(physical);
  return owner === seat
    ? cosmetics.board.localTheme.presentation.className
    : cosmetics.board.opponentTheme.presentation.className;
}

export function resolveBoardThemeRegionClasses(
  game: GameState,
  seat: PlayerId,
  cosmetics: ResolvedMatchCosmetics,
): Readonly<{ top: string; bottom: string }> {
  const topAnchor = displayOrder[0] ?? 23;
  const bottomAnchor = displayOrder[12] ?? 0;
  return {
    top: resolveBoardThemePresentationClass(physicalPoint(game, seat, topAnchor), seat, cosmetics),
    bottom: resolveBoardThemePresentationClass(
      physicalPoint(game, seat, bottomAnchor),
      seat,
      cosmetics,
    ),
  };
}

export function resolveDicePresentationClasses(
  game: GameState,
  seat: PlayerId,
  cosmetics: ResolvedMatchCosmetics,
): readonly [string, string] {
  const classFor = (owner: PlayerId) =>
    owner === seat
      ? cosmetics.dice.localSkin.presentation.className
      : cosmetics.dice.opponentSkin.presentation.className;

  if (game.turnNumber === 1) return [classFor('A'), classFor('B')];
  if (game.activePlayer) {
    const activeClass = classFor(game.activePlayer);
    return [activeClass, activeClass];
  }
  return [classFor(seat), classFor(seat)];
}

export function BoardScene({
  game,
  board,
  seat,
  next,
  selected,
  recent,
  draft,
  canDraft,
  cosmetics,
  boardLabel,
  barLabel,
  offLabel,
  onSelect,
}: {
  game: GameState;
  board: BoardState | BackgammonBoardState;
  seat: PlayerId;
  next: readonly Move[];
  selected: number | 'BAR' | null;
  recent: { readonly move: Move; readonly player: PlayerId } | null;
  draft: readonly Move[];
  canDraft: boolean;
  cosmetics: ResolvedMatchCosmetics;
  boardLabel: string;
  barLabel: string;
  offLabel: string;
  onSelect: (point: number | 'BAR') => void;
}) {
  const opponent: PlayerId = seat === 'A' ? 'B' : 'A';
  const points = resolveBoardPointPresentation(game, board, seat);
  const diceClasses = resolveDicePresentationClasses(game, seat, cosmetics);
  const boardThemeRegions = resolveBoardThemeRegionClasses(game, seat, cosmetics);
  const isDouble = game.diceRoll !== null && game.diceRoll[0] === game.diceRoll[1];
  return (
    <div
      className="board-scene"
      data-local-board-theme={cosmetics.board.localTheme.presentation.id}
      data-opponent-board-theme={cosmetics.board.opponentTheme.presentation.id}
    >
      <div className="board" aria-label={boardLabel}>
        <span
          className={`board-theme-region board-theme-region-top ${boardThemeRegions.top}`}
          aria-hidden="true"
        />
        <span className="board-theme-shared" aria-hidden="true" />
        <span
          className={`board-theme-region board-theme-region-bottom ${boardThemeRegions.bottom}`}
          aria-hidden="true"
        />
        {points.map(({ index, physical, point, owner, amount }, position) => {
          const source = next.some((move) => move.from === point);
          const destination = next.some((move) => move.from === selected && move.to === point);
          const checkerClass =
            owner === seat
              ? cosmetics.checkers.localSet.presentation.className
              : cosmetics.checkers.opponentSet.presentation.className;
          const boardThemeClass = resolveBoardThemePresentationClass(physical, seat, cosmetics);
          const isRecent =
            recent &&
            ((recent.move.to < 24 &&
              physicalPoint(game, recent.player, recent.move.to) === physical) ||
              (typeof recent.move.from === 'number' &&
                physicalPoint(game, recent.player, recent.move.from) === physical));
          return (
            <button
              key={index}
              className={`point ${boardThemeClass} ${position < 12 ? 'top' : 'bottom'} ${position % 2 ? 'dark' : 'light'} ${source ? 'source' : ''} ${destination ? 'destination' : ''} ${selected === point ? 'selected' : ''} ${isRecent ? 'recent' : ''}`}
              onClick={() => onSelect(point)}
              disabled={!canDraft || (!source && !destination)}
              aria-label={`${point + 1}: ${amount}`}
            >
              <span className="point-number">{point + 1}</span>
              <span className="stack">
                {Array.from({ length: Math.min(amount, 5) }, (_, checkerIndex) => (
                  <span
                    key={checkerIndex}
                    className={`checker ${owner === seat ? 'own' : 'enemy'} ${checkerClass}`}
                  >
                    {checkerIndex === 4 && amount > 5 ? amount : ''}
                  </span>
                ))}
              </span>
              {destination && <span className="target">●</span>}
            </button>
          );
        })}
      </div>
      <div className="board-trays">
        <div className="off-tray">{board[opponent][24]}</div>
        {hasBar(board) ? (
          <button
            disabled={!next.some((move) => move.from === 'BAR')}
            className={selected === 'BAR' ? 'active' : ''}
            onClick={() => onSelect('BAR')}
          >
            {barLabel} {board.bar[seat]}
          </button>
        ) : (
          <span className="structural-bar" aria-hidden="true" />
        )}
        <div className="dice">
          {game.diceRoll?.map((die, index) => (
            <Die
              key={index}
              value={die}
              used={!isDouble && draft.some((move) => move.die === die)}
              className={index === 0 ? diceClasses[0] : diceClasses[1]}
            />
          ))}
          {isDouble && (
            <span className="double-marks">
              {[0, 1, 2, 3].map((index) => (
                <i className={draft.length > index ? 'used' : ''} key={index} />
              ))}
            </span>
          )}
        </div>
        <button
          className={next.some((move) => move.from === selected && move.to === 24) ? 'active' : ''}
          onClick={() => onSelect(24)}
          disabled={!next.some((move) => move.from === selected && move.to === 24)}
        >
          {offLabel} {board[seat][24]}/15
        </button>
      </div>
    </div>
  );
}

function Die({ value, used, className }: { value: number; used: boolean; className: string }) {
  const pips: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span className={`die ${className} ${used ? 'consumed' : ''}`} aria-label={`Die ${value}`}>
      {Array.from({ length: 9 }, (_, index) => (
        <i className={pips[value]?.includes(index) ? 'pip' : ''} key={index} />
      ))}
    </span>
  );
}
