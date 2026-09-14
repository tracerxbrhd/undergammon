import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Profile, Ruleset } from '@undergammon/protocol';
import { api, platform } from './platform';
import { copy, rules, avatarEmoji, message, type Language } from './content';
import { Game } from './Game';
import { Tutorial } from './Tutorial';
import { PublicProfile } from './PublicProfile';
import './style.css';
interface Challenge {
  token: string;
  ruleset: Ruleset;
  status: string;
  expires_at: string;
  match_id: string | null;
}
interface HistoryRow {
  opponent_id: string;
  id: string;
  ruleset: Ruleset;
  mode: string;
  finish_reason: string;
  finished_at: string;
  result: string;
  opponent: string;
  rating_before: number | null;
  rating_after: number | null;
}
interface Rank {
  id: string;
  nickname: string;
  rating: number;
  position: string;
}
function App() {
  const [publicId, setPublicId] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [bot, setBot] = useState('UndergammonBot');
  const [screen, setScreen] = useState('home');
  const [ruleset, setRuleset] = useState<Ruleset>(
    localStorage.getItem('ruleset') === 'BACKGAMMON' ? 'BACKGAMMON' : 'LONG_NARDY',
  );
  const [mode, setMode] = useState<'CASUAL' | 'RANKED'>('CASUAL');
  const [match, setMatch] = useState<string | null>(null);
  const [queue, setQueue] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [incoming, setIncoming] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [ranks, setRanks] = useState<{ top: Rank[]; self: Rank | null }>({ top: [], self: null });
  const [nickname, setNickname] = useState('');
  const [tutorial, setTutorial] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const t = copy[language];
  const run = (f: () => Promise<unknown>) => {
    void f().catch((e: unknown) => setError(e instanceof Error ? e.message : 'NETWORK_ERROR'));
  };
  const refresh = async () => {
    const p = await api<Profile>('/me');
    setMe(p);
    setLanguage(p.language);
    return p;
  };
  useEffect(() => {
    platform.ready();
    run(async () => {
      const c = await api<{ botUsername: string }>('/config');
      setBot(c.botUsername);
      if (platform.initData()) {
        const p = await api<Profile>('/auth', 'POST', { initData: platform.initData() });
        setMe(p);
        setLanguage(p.language);
        setNickname(p.nickname);
        const start = platform.startParameter();
        if (start.startsWith('challenge_')) setIncoming(start.slice(10));
        else if (start.startsWith('match_')) setMatch(start.slice(6));
      }
    });
  }, []);
  useEffect(() => {
    localStorage.setItem('ruleset', ruleset);
  }, [ruleset]);
  useEffect(() => {
    if (!me || match) return;
    const poll = () =>
      run(async () => {
        const p = await refresh();
        if (queue) {
          await api('/queue');
          if (p.activeMatchId) {
            setQueue(false);
            setMatch(p.activeMatchId);
          }
        }
        const c = await api<Challenge | null>('/challenges');
        setChallenge(c?.status === 'OPEN' ? c : null);
        if (c?.status === 'ACCEPTED' && p.activeMatchId) setMatch(p.activeMatchId);
        const invites = await api<{ token: string }[]>('/rematches');
        if (invites[0]) setIncoming(invites[0].token);
      });
    poll();
    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, [me?.id, queue, match]);
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const invite = async () => {
    const c = await api<{ token: string; expiresAt: number }>('/challenges', 'POST', { ruleset });
    setChallenge({
      token: c.token,
      ruleset,
      status: 'OPEN',
      expires_at: new Date(c.expiresAt).toISOString(),
      match_id: null,
    });
    platform.share(`https://t.me/${bot}?startapp=challenge_${c.token}`);
  };
  const nav = (next: string) => {
    setScreen(next);
    if (next === 'history') run(async () => setHistory(await api<HistoryRow[]>('/history')));
    if (next === 'leaders') run(async () => setRanks(await api('/leaderboard?ruleset=' + ruleset)));
  };
  const patch = (value: unknown) =>
    run(async () => {
      const p = await api<Profile>('/profile', 'PATCH', value);
      setMe(p);
      setLanguage(p.language);
    });
  if (!platform.initData())
    return (
      <main className="landing">
        <div className="brand">
          UNDER<span>GAMMON</span>
          <b>✦</b>
        </div>
        <div className="landing-art" aria-hidden="true">
          <span>●</span>
          <span>⚄</span>
          <span>●</span>
        </div>
        <p className="eyebrow">{t.beta}</p>
        <h1>{t.tagline}</h1>
        <p>{t.description}</p>
        <a className="primary" href={`https://t.me/${bot}?startapp`}>
          {t.open} ↗
        </a>
        <button className="subtle" onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}>
          RU / EN
        </button>
      </main>
    );
  return (
    <main>
      <header>
        <div className="brand">
          UNDER<span>GAMMON</span>
          <b>✦</b>
        </div>
        <span className="beta">S0</span>
      </header>
      <p className="eyebrow">{t.beta}</p>
      {error && (
        <div className="error" role="alert">
          {message(language, error)}
          <button onClick={() => setError('')}>×</button>
          {error === 'ACCOUNT_DISABLED' && (
            <button
              onClick={() =>
                run(async () => {
                  setMe(
                    await api('/auth', 'POST', { initData: platform.initData(), restore: true }),
                  );
                  setError('');
                })
              }
            >
              {t.restore}
            </button>
          )}
        </div>
      )}
      {publicId && (
        <PublicProfile id={publicId} language={language} onClose={() => setPublicId(null)} />
      )}
      {!me ? (
        <p>{t.reconnecting}</p>
      ) : match ? (
        <Game
          onProfile={setPublicId}
          matchId={match}
          accountId={me.id}
          language={language}
          onClose={() => {
            setMatch(null);
            run(refresh);
          }}
          onRematch={(id) =>
            run(async () => {
              const c = await api<{ token: string }>(`/matches/${id}/rematch`, 'POST', {});
              setMatch(null);
              setChallenge({
                token: c.token,
                ruleset,
                status: 'OPEN',
                expires_at: new Date(Date.now() + 600000).toISOString(),
                match_id: null,
              });
            })
          }
        />
      ) : (
        <>
          <nav>
            {(['home', 'profile', 'history', 'leaders', 'rules', 'settings'] as const).map(
              (key) => (
                <button
                  className={screen === key ? 'active' : ''}
                  key={key}
                  onClick={() => nav(key)}
                >
                  {t[key]}
                </button>
              ),
            )}
            {me.admin && <button onClick={() => nav('admin')}>{t.admin}</button>}
          </nav>
          {incoming && (
            <section className="panel">
              <p>{t.waiting}</p>
              <button
                className="primary"
                onClick={() =>
                  run(async () => {
                    const s = await api<{ id: string }>(
                      `/challenges/${incoming}/accept`,
                      'POST',
                      {},
                    );
                    setIncoming('');
                    setMatch(s.id);
                  })
                }
              >
                {t.accept}
              </button>
              <button onClick={() => setIncoming('')}>{t.cancel}</button>
            </section>
          )}
          {screen === 'home' && (
            <>
              <div className="welcome">
                <span className="avatar large">{avatarEmoji[me.avatar]}</span>
                <div>
                  <h2>{me.nickname}</h2>
                  <p>
                    {t.level} {me.level} · {me.coins} {t.coins}
                  </p>
                </div>
              </div>
              {me.activeMatchId ? (
                <section className="panel">
                  <button className="primary" onClick={() => setMatch(me.activeMatchId)}>
                    {t.return} →
                  </button>
                </section>
              ) : queue ? (
                <section className="panel">
                  <div className="pulse">◌</div>
                  <h2>{t.searching}</h2>
                  <button
                    onClick={() =>
                      run(async () => {
                        await api('/queue', 'DELETE');
                        setQueue(false);
                      })
                    }
                  >
                    {t.cancel}
                  </button>
                </section>
              ) : challenge ? (
                <section className="panel">
                  <h2>{t.waiting}</h2>
                  <p>
                    {Math.max(
                      0,
                      Math.ceil((new Date(challenge.expires_at).getTime() - tick) / 1000),
                    )}
                    s
                  </p>
                  <button
                    className="primary"
                    onClick={() =>
                      platform.share(`https://t.me/${bot}?startapp=challenge_${challenge.token}`)
                    }
                  >
                    {t.share}
                  </button>
                  <button
                    onClick={() =>
                      run(async () => {
                        await api('/challenges', 'DELETE');
                        setChallenge(null);
                      })
                    }
                  >
                    {t.cancel}
                  </button>
                </section>
              ) : (
                <section className="panel setup">
                  <div className="segmented">
                    <button
                      className={mode === 'CASUAL' ? 'active' : ''}
                      onClick={() => setMode('CASUAL')}
                    >
                      {t.casual}
                    </button>
                    <button
                      className={mode === 'RANKED' ? 'active' : ''}
                      onClick={() => setMode('RANKED')}
                    >
                      {t.ranked}
                    </button>
                  </div>
                  <label>
                    <span>{t.play}</span>
                    <select value={ruleset} onChange={(e) => setRuleset(e.target.value as Ruleset)}>
                      <option value="LONG_NARDY">{t.long}</option>
                      <option value="BACKGAMMON">{t.short}</option>
                    </select>
                  </label>
                  <p className="rating">
                    {(me.ratings.find((r) => r.ruleset === ruleset)?.played ?? 0) < 10 ? '≈ ' : ''}
                    {me.ratings.find((r) => r.ruleset === ruleset)?.rating ?? 1000}
                    <small>{mode === 'RANKED' ? t.ranked : t.casual}</small>
                  </p>
                  <button
                    className="primary"
                    onClick={() =>
                      run(async () => {
                        await api('/queue', 'POST', { ruleset, mode });
                        setQueue(true);
                      })
                    }
                  >
                    {t.find} →
                  </button>
                  {mode === 'CASUAL' && <button onClick={() => run(invite)}>{t.friend} ↗</button>}
                  <button
                    className="subtle"
                    onClick={() => {
                      setTutorial(true);
                      setScreen('rules');
                    }}
                  >
                    {t.tutorial}
                  </button>
                </section>
              )}
            </>
          )}
          {screen === 'profile' && (
            <section className="panel">
              <span className="avatar large">{avatarEmoji[me.avatar]}</span>
              <h2>{me.nickname}</h2>
              <p>
                {t.level} {me.level} · {me.totalXp} XP · {me.coins} {t.coins}
              </p>
              <div className="actions">
                {Object.entries(avatarEmoji).map(([id, emoji]) => (
                  <button key={id} onClick={() => patch({ avatar: id })}>
                    {emoji}
                  </button>
                ))}
              </div>
              <label>
                {t.nickname}
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={24}
                />
              </label>
              <button onClick={() => patch({ nickname })}>{t.save}</button>
              {me.ratings.map((r) => (
                <p key={r.ruleset}>
                  {r.ruleset === 'LONG_NARDY' ? t.long : t.short}: {r.played < 10 ? '≈ ' : ''}
                  {r.rating} · {Math.min(10, r.played)}/10
                </p>
              ))}
              <small>{me.id}</small>
            </section>
          )}
          {screen === 'history' && (
            <section className="panel">
              <h2>{t.history}</h2>
              {history.map((h) => (
                <article className="history-row" key={h.id}>
                  <strong>
                    {h.result === 'WIN' ? t.win : h.result === 'LOSS' ? t.loss : t.uncounted}
                  </strong>
                  <span>
                    <button className="identity-button" onClick={() => setPublicId(h.opponent_id)}>
                      {h.opponent}
                    </button>{' '}
                    · {h.ruleset === 'LONG_NARDY' ? t.long : t.short}
                  </span>
                  <small>
                    {new Date(h.finished_at).toLocaleString(language)} · {h.finish_reason}
                  </small>
                  {h.rating_before !== null && (
                    <span>
                      {h.rating_before} → {h.rating_after}
                    </span>
                  )}
                </article>
              ))}
              <button
                onClick={() =>
                  run(async () =>
                    setHistory([
                      ...history,
                      ...(await api<HistoryRow[]>('/history?offset=' + history.length)),
                    ]),
                  )
                }
              >
                {t.more}
              </button>
            </section>
          )}
          {screen === 'leaders' && (
            <section className="panel">
              <h2>
                {t.leaders} · {ruleset === 'LONG_NARDY' ? t.long : t.short}
              </h2>
              <div className="segmented">
                {(['LONG_NARDY', 'BACKGAMMON'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() =>
                      run(async () => {
                        setRuleset(r);
                        setRanks(await api('/leaderboard?ruleset=' + r));
                      })
                    }
                  >
                    {r === 'LONG_NARDY' ? t.long : t.short}
                  </button>
                ))}
              </div>
              {ranks.top.map((r) => (
                <p className="rank" key={r.id}>
                  <span>
                    {r.position}.{' '}
                    <button className="identity-button" onClick={() => setPublicId(r.id)}>
                      {r.nickname}
                    </button>
                  </span>
                  <strong>{r.rating}</strong>
                </p>
              ))}
              {ranks.self && (
                <p className="rank active">
                  #{ranks.self.position} · {me.nickname} · {ranks.self.rating}
                </p>
              )}
            </section>
          )}
          {screen === 'rules' && (
            <section className="panel">
              <h2>{tutorial ? t.tutorial : t.rules}</h2>
              <div className="segmented">
                <button onClick={() => setRuleset('LONG_NARDY')}>{t.long}</button>
                <button onClick={() => setRuleset('BACKGAMMON')}>{t.short}</button>
              </div>
              <Tutorial key={ruleset} ruleset={ruleset} language={language} />
              <ol>
                {rules[language][ruleset].map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ol>
              <p>{t.help}</p>
              <button
                className="primary"
                onClick={() => {
                  localStorage.setItem('tutorial_' + ruleset, 'read');
                  setTutorial(false);
                  setScreen('home');
                }}
              >
                {t.start}
              </button>
            </section>
          )}
          {screen === 'settings' && (
            <section className="panel">
              <h2>{t.settings}</h2>
              <label>
                {t.language}
                <select value={language} onChange={(e) => patch({ language: e.target.value })}>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </label>
              {(['sound', 'haptics'] as const).map((key) => (
                <label key={key}>
                  {t[key]}
                  <input
                    type="checkbox"
                    defaultChecked={localStorage.getItem(key) !== 'false'}
                    onChange={(e) => localStorage.setItem(key, String(e.target.checked))}
                  />
                </label>
              ))}
              <label>
                {t.mute}
                <input
                  type="checkbox"
                  checked={me.muteOpponentReactions}
                  onChange={(e) => patch({ muteOpponentReactions: e.target.checked })}
                />
              </label>
              <button
                className="danger"
                onClick={() => {
                  if (window.confirm(t.deleteConfirm))
                    run(async () => {
                      await api('/account/delete', 'POST', {});
                      setMe(null);
                      setError('ACCOUNT_DISABLED');
                    });
                }}
              >
                {t.delete}
              </button>
            </section>
          )}
          {screen === 'admin' && me.admin && <Admin />}
        </>
      )}
    </main>
  );
}
function Admin() {
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('COINS');
  const [value, setValue] = useState(0);
  const [ruleset, setRuleset] = useState('LONG_NARDY');
  const [output, setOutput] = useState('');
  const execute = async (path: string, method = 'GET', body?: unknown) => {
    try {
      setOutput(JSON.stringify(await api(path, method, body), null, 2));
    } catch (e) {
      setOutput(String(e));
    }
  };
  return (
    <section className="panel">
      <h2>Admin</h2>
      <input
        placeholder="Account UUID / Telegram ID"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={() => void execute('/admin/account?query=' + encodeURIComponent(query))}>
        Find
      </button>
      <input
        placeholder="Target account UUID"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      <select value={action} onChange={(e) => setAction(e.target.value)}>
        {['COINS', 'RATING_DELTA', 'RATING_SET', 'SUSPEND', 'BAN', 'UNBAN', 'RESET_NICKNAME'].map(
          (a) => (
            <option key={a}>{a}</option>
          ),
        )}
      </select>
      <select value={ruleset} onChange={(e) => setRuleset(e.target.value)}>
        <option>LONG_NARDY</option>
        <option>BACKGAMMON</option>
      </select>
      <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
      <input
        placeholder="Required reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button
        onClick={() =>
          void execute('/admin/adjust', 'POST', {
            operationId: crypto.randomUUID(),
            target,
            action,
            value,
            ruleset,
            reason,
          })
        }
      >
        Apply adjustment
      </button>
      <button onClick={() => void execute('/admin/audit')}>Audit log</button>
      <pre>{output}</pre>
    </section>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
