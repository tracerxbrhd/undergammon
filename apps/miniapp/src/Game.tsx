import { useEffect, useRef, useState } from 'react';
import {
  matchingTurns,
  previewGame,
  physicalPoint,
  type Move,
  type BoardState,
  type BackgammonBoardState,
} from '@undergammon/game-engine';
import type { MatchSnapshot } from '@undergammon/protocol';
import { connectMatch } from './realtime';
import { copy, avatarEmoji, message, type Language } from './content';
import { platform, feedbackSound } from './platform';
function hasBar(board: BoardState): board is BackgammonBoardState {
  return 'bar' in board;
}
export function Game({
  matchId,
  accountId,
  language,
  onClose,
  onRematch,
  onProfile,
}: {
  matchId: string;
  accountId: string;
  language: Language;
  onClose: () => void;
  onRematch: (id: string) => void;
  onProfile: (id: string) => void;
}) {
  const t = copy[language];
  const [s, setSnapshot] = useState<MatchSnapshot | null>(null);
  const [draft, setDraft] = useState<Move[]>([]);
  const [selected, setSelected] = useState<number | 'BAR' | null>(null);
  const [online, setOnline] = useState(false);
  const [control, setControl] = useState(true);
  const [error, setError] = useState('');
  const [reaction, setReaction] = useState('');
  const [now, setNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const [frame, setFrame] = useState<BoardState | BackgammonBoardState | null>(null);
  const [recent, setRecent] = useState<{ move: Move; player: 'A' | 'B' } | null>(null);
  const current = useRef<MatchSnapshot | null>(null);
  const transport = useRef<ReturnType<typeof connectMatch> | null>(null);
  useEffect(() => {
    const animations: ReturnType<typeof setTimeout>[] = [];
    const c = connectMatch(
      matchId,
      (event) => {
        if (event.type === 'SNAPSHOT') {
          setOffset(event.serverTime - Date.now());
          const old = current.current;
          if (old && old.stateVersion >= event.snapshot.stateVersion) return;
          const moves = event.snapshot.lastMoves;
          if (
            old &&
            old.game.activePlayer &&
            moves.length &&
            (old.game.turnNumber !== event.snapshot.game.turnNumber ||
              event.snapshot.game.phase === 'FINISHED') &&
            matchingTurns(old.game, moves).some((turn) => turn.length === moves.length)
          ) {
            const player = old.game.activePlayer;
            setFrame(old.game.board);
            moves.forEach((move, i) => {
              animations.push(
                setTimeout(
                  () => {
                    setFrame(previewGame(old.game, moves.slice(0, i + 1)));
                    setRecent({ move, player });
                  },
                  (i + 1) * 250,
                ),
              );
            });
            animations.push(
              setTimeout(
                () => {
                  setFrame(null);
                  setRecent(null);
                },
                moves.length * 250 + 250,
              ),
            );
          }
          current.current = event.snapshot;
          setSnapshot(event.snapshot);
          setDraft([]);
          setSelected(null);
        } else if (event.type === 'CONTROL_LOST') setControl(false);
        else if (event.type === 'ERROR') {
          setError(event.code);
          if (event.code === 'CONTROL_LOST') setControl(false);
        } else if (event.type === 'REACTION') {
          setReaction(event.reaction === 'WAVE' ? '👋' : event.reaction === 'NICE' ? '👏' : '🤝');
          setTimeout(() => setReaction(''), 2500);
        }
      },
      setOnline,
    );
    transport.current = c;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearInterval(interval);
      animations.forEach(clearTimeout);
      c.close();
    };
  }, [matchId]);
  if (!s)
    return (
      <section className="panel">
        <p>{t.reconnecting}</p>
        <button onClick={onClose}>{t.close}</button>
      </section>
    );
  const seat = s.players.A.accountId === accountId ? 'A' : 'B';
  const opponent = seat === 'A' ? 'B' : 'A';
  const yourTurn =
    s.game.activePlayer === seat &&
    s.status === 'ACTIVE' &&
    control &&
    online &&
    now + offset >= (s.turnStartsAt ?? 0);
  const canDraft = yourTurn && !frame && s.game.phase === 'AWAITING_MOVE';
  const candidates = canDraft ? matchingTurns(s.game, draft) : [];
  const next = candidates.flatMap((turn) => {
    const move = turn[draft.length];
    return move ? [move] : [];
  });
  const board = frame ?? (draft.length ? previewGame(s.game, draft) : s.game.board);
  const complete = candidates.some((turn) => turn.length === draft.length);
  const seconds = Math.max(
    0,
    Math.ceil(((s.turnDeadlineAt ?? s.joinDeadlineAt) - now - offset) / 1000),
  );
  const select = (point: number | 'BAR') => {
    const destination = next.find((m) => m.from === selected && m.to === point);
    if (destination) {
      setDraft([...draft, destination]);
      setSelected(null);
      platform.haptic();
      feedbackSound('move');
    } else if (next.some((m) => m.from === point)) setSelected(point);
  };
  const relative = (physical: number) => {
    for (let point = 0; point < 24; point++)
      if (physicalPoint(s.game, seat, point) === physical) return point;
    return 0;
  };
  const viewPhysical = (index: number) => physicalPoint(s.game, seat, index);
  const displayOrder = [
    ...Array.from({ length: 12 }, (_, i) => 11 - i),
    ...Array.from({ length: 12 }, (_, i) => 12 + i),
  ];
  return (
    <section className="game">
      <div className="player">
        <span className="avatar">{avatarEmoji[s.players[opponent].avatar]}</span>
        <div>
          <button
            className="identity-button"
            onClick={() => onProfile(s.players[opponent].accountId)}
          >
            {s.players[opponent].nickname}
          </button>
          <small>
            {s.players[opponent].preliminary ? '≈ ' : ''}
            {s.players[opponent].rating} ·{' '}
            {s.players[opponent].connected ? t.connected : t.reconnecting}
          </small>
        </div>
        <span className="reaction">{reaction}</span>
        <button className="subtle" onClick={onClose}>
          ⌂
        </button>
      </div>
      <div className="game-status">
        <span>
          {s.status === 'WAITING_FOR_PLAYERS' ? t.waiting : yourTurn ? t.turn : t.opponent}
        </span>
        <strong className={seconds < 10 ? 'urgent' : ''}>{seconds}s</strong>
      </div>
      <div className="board" aria-label={s.ruleset === 'LONG_NARDY' ? t.long : t.short}>
        {displayOrder.map((index, i) => {
          const physical = viewPhysical(index);
          const ownPoint = relative(physical);
          let owner = seat;
          let amount = board[seat][ownPoint] ?? 0;
          if (!amount) {
            owner = opponent;
            for (let p = 0; p < 24; p++)
              if (physicalPoint(s.game, opponent, p) === physical) amount = board[opponent][p] ?? 0;
          }
          const source = next.some((m) => m.from === ownPoint);
          const destination = next.some((m) => m.from === selected && m.to === ownPoint);
          return (
            <button
              key={index}
              className={`point ${i < 12 ? 'top' : 'bottom'} ${i % 2 ? 'dark' : 'light'} ${source ? 'source' : ''} ${destination ? 'destination' : ''} ${selected === ownPoint ? 'selected' : ''} ${recent && ((recent.move.to < 24 && physicalPoint(s.game, recent.player, recent.move.to) === physical) || (typeof recent.move.from === 'number' && physicalPoint(s.game, recent.player, recent.move.from) === physical)) ? 'recent' : ''}`}
              onClick={() => select(ownPoint)}
              disabled={!canDraft || (!source && !destination)}
              aria-label={`${ownPoint + 1}: ${amount}`}
            >
              <span className="point-number">{ownPoint + 1}</span>
              <span className="stack">
                {Array.from({ length: Math.min(amount, 5) }, (_, n) => (
                  <span key={n} className={`checker ${owner === seat ? 'own' : 'enemy'}`}>
                    {n === 4 && amount > 5 ? amount : ''}
                  </span>
                ))}
              </span>
              {destination && <span className="target">●</span>}
            </button>
          );
        })}
      </div>
      <div className="board-trays">
        {hasBar(board) && (
          <button
            disabled={!next.some((m) => m.from === 'BAR')}
            className={selected === 'BAR' ? 'active' : ''}
            onClick={() => select('BAR')}
          >
            {t.bar} {board.bar[seat]}
          </button>
        )}
        <div className="dice">
          {s.game.diceRoll?.map((die, i) => (
            <span key={i}>{['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][die]}</span>
          ))}
        </div>
        <button
          className={next.some((m) => m.from === selected && m.to === 24) ? 'active' : ''}
          onClick={() => select(24)}
          disabled={!next.some((m) => m.from === selected && m.to === 24)}
        >
          {t.off} {board[seat][24]}/15
        </button>
      </div>
      <div className="player">
        <span className="avatar">{avatarEmoji[s.players[seat].avatar]}</span>
        <div>
          <button className="identity-button" onClick={() => onProfile(s.players[seat].accountId)}>
            {s.players[seat].nickname}
          </button>
          <small>
            {s.players[seat].preliminary ? '≈ ' : ''}
            {s.players[seat].rating} · {online ? t.connected : t.reconnecting}
          </small>
        </div>
      </div>
      {!control ? (
        <div className="panel">
          <p>{t.controlLost}</p>
          <button
            onClick={() => {
              transport.current?.send('OPEN');
              setControl(true);
            }}
          >
            {t.takeover}
          </button>
        </div>
      ) : s.status === 'ACTIVE' ? (
        <>
          <div className="actions">
            <button
              onClick={() => {
                setDraft(draft.slice(0, -1));
                setSelected(null);
              }}
              disabled={!draft.length}
            >
              {t.undo}
            </button>
            {s.game.phase === 'WAITING_FOR_ROLL' ? (
              <button
                className="primary"
                disabled={!yourTurn}
                onClick={() => {
                  feedbackSound('roll');
                  transport.current?.send('ROLL');
                }}
              >
                {t.roll}
              </button>
            ) : (
              <button
                className="primary"
                disabled={!canDraft || !complete}
                onClick={() => transport.current?.send('TURN', { moves: draft })}
              >
                {t.confirm}
              </button>
            )}
          </div>
          <p className="hint">{t.help}</p>
          <div className="actions">
            <button
              className="subtle danger"
              onClick={() => {
                if (window.confirm(t.surrenderConfirm)) transport.current?.send('SURRENDER');
              }}
            >
              {t.surrender}
            </button>
            {(['WAVE', 'NICE', 'GG'] as const).map((r, i) => (
              <button
                key={r}
                disabled={!online}
                onClick={() => transport.current?.send('REACTION', { reaction: r })}
              >
                {['👋', '👏', '🤝'][i]}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {s.status === 'FINISHED' && (
        <div className="result panel">
          <span className="eyebrow">{message(language, s.finishReason ?? '')}</span>
          <h2>{s.winner === null ? t.uncounted : s.winner === seat ? t.win : t.loss}</h2>
          {s.game.rulesetId === 'backgammon' && s.game.result && (
            <p>{message(language, s.game.result.winClass)}</p>
          )}
          <button className="primary" onClick={onClose}>
            {t.home}
          </button>
          {s.mode !== 'RANKED' && <button onClick={() => onRematch(s.id)}>{t.again}</button>}
        </div>
      )}
      {error && (
        <button className="error" onClick={() => setError('')}>
          {message(language, error)} ×
        </button>
      )}
    </section>
  );
}
