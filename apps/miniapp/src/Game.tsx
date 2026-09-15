import { useEffect, useRef, useState } from 'react';
import {
  matchingTurns,
  previewGame,
  physicalPoint,
  type Move,
  type BoardState,
  type BackgammonBoardState,
} from '@undergammon/game-engine';
import type { MatchResultProgression, MatchSnapshot } from '@undergammon/protocol';
import { connectMatch } from './realtime';
import { copy, rules, avatarEmoji, message, type Language } from './content';
import { api, platform, feedbackSound } from './platform';
import { BottomSheet, ProgressBar } from './ui';
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
  const [menu, setMenu] = useState(false);
  const [reactions, setReactions] = useState(false);
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [result, setResult] = useState<MatchResultProgression | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
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
  useEffect(() => {
    if (s?.status !== 'FINISHED') return;
    const reveal = setTimeout(() => setResultVisible(true), s.lastMoves.length * 250 + 300);
    void api<MatchResultProgression>(`/matches/${matchId}/result`)
      .then(setResult)
      .catch(() => setResult(null));
    return () => clearTimeout(reveal);
  }, [matchId, s?.status]);
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
    <section className="game game-screen">
      <div
        className={`player player-strip glass glass-regular ${s.game.activePlayer === opponent ? 'active-player' : ''}`}
      >
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
        <strong className={seconds < 10 ? 'urgent timer' : 'timer'}>
          {s.game.activePlayer === opponent ? `${seconds}s` : ''}
        </strong>
        <button
          className="icon-button subtle"
          aria-label="Match menu"
          onClick={() => setMenu(true)}
        >
          •••
        </button>
      </div>
      <div className="board-scene">
        <div className="board" aria-label={s.ruleset === 'LONG_NARDY' ? t.long : t.short}>
          {displayOrder.map((index, i) => {
            const physical = viewPhysical(index);
            const ownPoint = relative(physical);
            let owner = seat;
            let amount = board[seat][ownPoint] ?? 0;
            if (!amount) {
              owner = opponent;
              for (let p = 0; p < 24; p++)
                if (physicalPoint(s.game, opponent, p) === physical)
                  amount = board[opponent][p] ?? 0;
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
          <div className="off-tray">{board[opponent][24]}</div>
          {hasBar(board) ? (
            <button
              disabled={!next.some((m) => m.from === 'BAR')}
              className={selected === 'BAR' ? 'active' : ''}
              onClick={() => select('BAR')}
            >
              {t.bar} {board.bar[seat]}
            </button>
          ) : (
            <span className="structural-bar" aria-hidden="true" />
          )}
          <div className="dice">
            {s.game.diceRoll?.map((die, i) => (
              <Die key={i} value={die} used={draft.some((move) => move.die === die)} />
            ))}
            {s.game.diceRoll?.[0] === s.game.diceRoll?.[1] && (
              <span className="double-marks">
                {[0, 1, 2, 3].map((i) => (
                  <i className={draft.length > i ? 'used' : ''} key={i} />
                ))}
              </span>
            )}
          </div>
          <button
            className={next.some((m) => m.from === selected && m.to === 24) ? 'active' : ''}
            onClick={() => select(24)}
            disabled={!next.some((m) => m.from === selected && m.to === 24)}
          >
            {t.off} {board[seat][24]}/15
          </button>
        </div>
      </div>
      <div
        className={`player player-strip glass glass-regular ${s.game.activePlayer === seat ? 'active-player' : ''}`}
      >
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
        <strong className={seconds < 10 ? 'urgent timer' : 'timer'}>
          {s.game.activePlayer === seat ? `${seconds}s` : ''}
        </strong>
      </div>
      {!control ? (
        <div className="control-overlay glass glass-strong">
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
        <div className="action-dock glass glass-strong">
          <button
            className="icon-button"
            aria-label="Reactions"
            onClick={() => setReactions(!reactions)}
          >
            ☺
          </button>
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
          {reactions && (
            <div className="reaction-picker glass glass-strong">
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
          )}
        </div>
      ) : null}
      {s.status === 'FINISHED' && resultVisible && (
        <div className="result-sheet glass glass-strong">
          <span className="eyebrow">{message(language, s.finishReason ?? '')}</span>
          <h2>{s.winner === null ? t.uncounted : s.winner === seat ? t.win : t.loss}</h2>
          {s.game.rulesetId === 'backgammon' && s.game.result && (
            <p>{message(language, s.game.result.winClass)}</p>
          )}
          <p>{s.mode === 'RANKED' ? t.ranked : 'Unrated'}</p>
          {result && (
            <>
              <div className="result-values">
                {result.ratingDelta !== null && (
                  <strong className={result.ratingDelta >= 0 ? 'positive' : 'negative'}>
                    {result.ratingDelta >= 0 ? '+' : ''}
                    {result.ratingDelta} rating
                  </strong>
                )}
                <strong>+{result.xpGained} XP</strong>
              </div>
              {result.levelAfter > result.levelBefore && (
                <h3>
                  {t.level} {result.levelAfter}
                </h3>
              )}
              <ProgressBar
                label="XP"
                value={result.progressAfter.xpIntoLevel}
                max={result.progressAfter.xpRequiredForNextLevel}
              />
            </>
          )}
          <button className="primary" onClick={onClose}>
            {t.home}
          </button>
          {s.mode !== 'RANKED' && <button onClick={() => onRematch(s.id)}>{t.again}</button>}
        </div>
      )}
      {!online && <div className="reconnect-overlay glass glass-strong">{t.reconnecting}</div>}
      {menu && (
        <BottomSheet label="Match menu" onClose={() => setMenu(false)}>
          <h2>{s.ruleset === 'LONG_NARDY' ? t.long : t.short}</h2>
          <p>{s.mode}</p>
          <ol className="match-help">
            {rules[language][s.ruleset].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <button onClick={() => setMenu(false)}>{t.close}</button>
          {s.status === 'ACTIVE' && (
            <button
              className="danger-fill"
              onClick={() => {
                setMenu(false);
                setConfirmSurrender(true);
              }}
            >
              {t.surrender}
            </button>
          )}
        </BottomSheet>
      )}
      {confirmSurrender && (
        <BottomSheet label={t.surrender} onClose={() => setConfirmSurrender(false)}>
          <h2>{t.surrender}</h2>
          <p>{t.surrenderConfirm}</p>
          <button
            className="danger-fill"
            onClick={() => {
              transport.current?.send('SURRENDER');
              setConfirmSurrender(false);
            }}
          >
            {t.surrender}
          </button>
          <button onClick={() => setConfirmSurrender(false)}>{t.cancel}</button>
        </BottomSheet>
      )}
      {error && (
        <button className="error" onClick={() => setError('')}>
          {message(language, error)} ×
        </button>
      )}
    </section>
  );
}
function Die({ value, used }: { value: number; used: boolean }) {
  const pips: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span className={`die ${used ? 'consumed' : ''}`} aria-label={`Die ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i className={pips[value]?.includes(i) ? 'pip' : ''} key={i} />
      ))}
    </span>
  );
}
