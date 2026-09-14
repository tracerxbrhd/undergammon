import { useState } from 'react';
import {
  initialGame,
  openGame,
  matchingTurns,
  commitTurn,
  type Move,
} from '@undergammon/game-engine';
import type { Ruleset } from '@undergammon/protocol';
import { copy, type Language } from './content';
export function Tutorial({ ruleset, language }: { ruleset: Ruleset; language: Language }) {
  const t = copy[language];
  const [draft, setDraft] = useState<Move[]>([]);
  const [done, setDone] = useState(false);
  const initial = initialGame(ruleset);
  const own = Array.from({ length: 25 }, () => 0);
  own[18] = 1;
  own[22] = 1;
  own[24] = 13;
  const opponent = Array.from({ length: 25 }, (_, i) => (i === 0 ? 15 : 0));
  const position =
    initial.rulesetId === 'backgammon'
      ? { ...initial, board: { A: own, B: opponent, bar: initial.board.bar } }
      : { ...initial, board: { A: own, B: opponent } };
  const game = openGame(position, [6, 2]);
  const turns = matchingTurns(game, draft);
  const next = [
    ...new Map(
      turns.flatMap((turn) => {
        const m = turn[draft.length];
        return m ? [[`${m.from}:${m.to}:${m.die}`, m] as const] : [];
      }),
    ).values(),
  ];
  return (
    <div className="tutorial">
      <h3>{t.tutorial} · ⚅ ⚁</h3>
      <p>
        {language === 'ru'
          ? 'Выведите последние две шашки из пунктов 19 и 23. Выберите движение, затем подтвердите полный ход.'
          : 'Bear off the last two checkers from points 19 and 23. Choose each move, then confirm the complete turn.'}
      </p>
      {done ? (
        <p>{t.win} ✓</p>
      ) : (
        <>
          <div className="actions">
            {next.map((m) => (
              <button key={`${m.from}:${m.die}`} onClick={() => setDraft([...draft, m])}>
                {typeof m.from === 'number' ? m.from + 1 : m.from} →{' '}
                {m.to === 24 ? t.off : m.to + 1} · {m.die}
              </button>
            ))}
          </div>
          <p>
            {draft
              .map(
                (m) =>
                  `${typeof m.from === 'number' ? m.from + 1 : m.from} → ${m.to === 24 ? t.off : m.to + 1}`,
              )
              .join(' / ')}
          </p>
          <div className="actions">
            <button onClick={() => setDraft(draft.slice(0, -1))} disabled={!draft.length}>
              {t.undo}
            </button>
            <button
              className="primary"
              disabled={!turns.some((turn) => turn.length === draft.length)}
              onClick={() => {
                const result = commitTurn(game, draft);
                setDone(result.phase === 'FINISHED');
                localStorage.setItem('tutorial_' + ruleset, 'complete');
              }}
            >
              {t.confirm}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
