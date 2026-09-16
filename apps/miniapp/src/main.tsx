import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Profile, Ruleset } from '@undergammon/protocol';
import { api, platform } from './platform';
import { copy, rules, avatarEmoji, message, type Language } from './content';
import { Game } from './Game';
import { Tutorial } from './Tutorial';
import { PublicProfile } from './PublicProfile';
import { GlassSurface, ProgressBar, SegmentedControl, BottomSheet } from './ui';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  EmptyStateIcon,
  RetryIcon,
} from './ui/icons';
import { primaryNavigation, type Screen } from './app/navigation';
import { resolveProfileFrame } from './game/cosmetics';
import { DailyReward } from './DailyReward';
import { Store } from './Store';
import { Cosmetics } from './Cosmetics';
import './styles/tokens.css';
import './style.css';
import './styles/polish.css';
import './styles/checker-sets.css';

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
  avatar: string;
  rating: number;
  peak: number;
  position: string;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const rulesets: readonly Ruleset[] = ['LONG_NARDY', 'BACKGAMMON'];

function App() {
  const [publicId, setPublicId] = useState<string | null>(null),
    [me, setMe] = useState<Profile | null>(null);
  const [language, setLanguage] = useState<Language>('en'),
    [bot, setBot] = useState('UndergammonBot');
  const [screen, setScreen] = useState<Screen>('home'),
    [ruleset, setRuleset] = useState<Ruleset>(
      localStorage.getItem('ruleset') === 'BACKGAMMON' ? 'BACKGAMMON' : 'LONG_NARDY',
    );
  const [mode, setMode] = useState<'CASUAL' | 'RANKED'>('CASUAL'),
    [opponent, setOpponent] = useState<'FIND' | 'FRIEND'>('FIND');
  const [match, setMatch] = useState<string | null>(null),
    [queue, setQueue] = useState(false),
    [searchStarted, setSearchStarted] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null),
    [incoming, setIncoming] = useState(''),
    [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]),
    [historyState, setHistoryState] = useState<LoadState>('idle');
  const [ranks, setRanks] = useState<{ top: Rank[]; self: Rank | null }>({
    top: [],
    self: null,
  });
  const [rankState, setRankState] = useState<LoadState>('idle');
  const [nickname, setNickname] = useState(''),
    [edit, setEdit] = useState(false),
    [tutorial, setTutorial] = useState(false),
    [tick, setTick] = useState(Date.now());
  const t = copy[language];

  const run = (f: () => Promise<unknown>) =>
    void f().catch((e: unknown) => setError(e instanceof Error ? e.message : 'NETWORK_ERROR'));

  const refresh = async () => {
    const p = await api<Profile>('/me');
    setMe(p);
    setLanguage(p.language);
    return p;
  };

  const loadRanks = (selectedRuleset: Ruleset) => {
    setRankState('loading');
    void api<{ top: Rank[]; self: Rank | null }>('/leaderboard?ruleset=' + selectedRuleset)
      .then((value) => {
        setRanks(value);
        setRankState('ready');
      })
      .catch(() => setRankState('error'));
  };

  const loadHistory = () => {
    setHistoryState('loading');
    void api<HistoryRow[]>('/history')
      .then((value) => {
        setHistory(value);
        setHistoryState('ready');
      })
      .catch(() => setHistoryState('error'));
  };

  const nav = (next: Screen) => {
    setScreen(next);
    if (next === 'history') loadHistory();
    if (next === 'leaders') loadRanks(ruleset);
  };

  const patch = (value: unknown) =>
    run(async () => {
      const p = await api<Profile>('/profile', 'PATCH', value);
      setMe(p);
      setLanguage(p.language);
      setNickname(p.nickname);
    });

  useEffect(() => {
    platform.ready();
    return platform.subscribeLayout(({ stableViewportHeight, safeArea, contentSafeArea }) => {
      const root = document.documentElement.style;
      root.setProperty('--app-viewport-stable-height', `${stableViewportHeight}px`);
      for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
        const environmentInset = `env(safe-area-inset-${edge}, 0px)`;
        root.setProperty(`--app-safe-${edge}`, `max(${safeArea[edge]}px, ${environmentInset})`);
        const contentInset = contentSafeArea[edge] || safeArea[edge];
        root.setProperty(
          `--app-content-safe-${edge}`,
          `max(${contentInset}px, ${environmentInset})`,
        );
      }
    });
  }, []);

  useEffect(() => {
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
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [me?.id, queue, match]);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
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
  };

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

  if (!me)
    return (
      <main className="bootstrap">
        <div className="brand">
          UNDER<span>GAMMON</span>
        </div>
        <div className="skeleton" />
        <p>{t.reconnecting}</p>
      </main>
    );

  if (match)
    return (
      <Game
        matchId={match}
        accountId={me.id}
        language={language}
        onProfile={setPublicId}
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
    );

  const focused = queue || Boolean(challenge);
  const rating = me.ratings.find((r) => r.ruleset === ruleset);

  return (
    <main className={`app-shell ${focused ? 'focused' : ''}`}>
      {!focused && (
        <header>
          <div>
            <div className="brand">
              UNDER<span>GAMMON</span>
              <b>✦</b>
            </div>
            <p className="eyebrow">{t.beta}</p>
          </div>
          <span className="beta">S0</span>
        </header>
      )}

      {error && (
        <div className="connection-banner" role="alert">
          <span>{message(language, error)}</span>
          <button onClick={() => setError('')} aria-label={t.close}>
            <CloseIcon />
          </button>
        </div>
      )}

      {publicId && (
        <PublicProfile id={publicId} language={language} onClose={() => setPublicId(null)} />
      )}

      {incoming && (
        <BottomSheet label={t.waiting} onClose={() => setIncoming('')}>
          <h2>{language === 'ru' ? 'Вас пригласили в матч' : 'Match invitation'}</h2>
          <p>
            {language === 'ru'
              ? 'Правила матча появятся после принятия.'
              : 'Match details become available after acceptance.'}
          </p>
          <button
            className="primary"
            onClick={() =>
              run(async () => {
                const s = await api<{ id: string }>(`/challenges/${incoming}/accept`, 'POST', {});
                setIncoming('');
                setMatch(s.id);
              })
            }
          >
            {t.accept}
          </button>
          <button onClick={() => setIncoming('')}>{t.cancel}</button>
        </BottomSheet>
      )}

      {queue ? (
        <Focused
          title={t.searching}
          subtitle={`${mode === 'RANKED' ? t.ranked : t.casual} · ${ruleset === 'LONG_NARDY' ? t.long : t.short}`}
          detail={mode === 'RANKED' ? `${rating?.played ?? 0}<10 · ${rating?.rating ?? 1000}` : ''}
          time={Math.floor((tick - searchStarted) / 1000)}
          onCancel={() =>
            run(async () => {
              await api('/queue', 'DELETE');
              setQueue(false);
            })
          }
        />
      ) : challenge ? (
        <Focused
          title={t.waiting}
          subtitle={`${challenge.ruleset === 'LONG_NARDY' ? t.long : t.short} · Private · Unrated`}
          time={Math.max(0, Math.ceil((new Date(challenge.expires_at).getTime() - tick) / 1000))}
          countdown
          onPrimary={() =>
            platform.share(`https://t.me/${bot}?startapp=challenge_${challenge.token}`)
          }
          primary={t.share}
          onCancel={() =>
            run(async () => {
              await api('/challenges', 'DELETE');
              setChallenge(null);
            })
          }
        />
      ) : (
        <>
          <div className="page">
            {screen === 'store' && (
              <Store
                language={language}
                coins={me.coins}
                onBalance={(coins) =>
                  setMe((current) => (current ? { ...current, coins } : current))
                }
              />
            )}

            {screen === 'cosmetics' && (
              <Cosmetics
                language={language}
                onEquipment={(cosmetics) =>
                  setMe((current) => (current ? { ...current, cosmetics } : current))
                }
              />
            )}

            {screen === 'home' && (
              <>
                <div className="identity">
                  <span className="avatar large">{avatarEmoji[me.avatar]}</span>
                  <div className="identity-copy">
                    <h2>{me.nickname}</h2>
                    <p>
                      {t.level} {me.level} · <b>{me.coins}</b> {t.coins}
                    </p>
                  </div>
                  <DailyReward
                    language={language}
                    onBalance={(coins) =>
                      setMe((profile) => (profile ? { ...profile, coins } : profile))
                    }
                    onStaleClaim={async () => {
                      await refresh();
                    }}
                  />
                </div>

                <GlassSurface className="setup-card">
                  <SegmentedControl
                    label="Mode"
                    value={mode}
                    onChange={(v) => {
                      setMode(v);
                      if (v === 'RANKED') setOpponent('FIND');
                    }}
                    options={[
                      { value: 'CASUAL', label: t.casual },
                      { value: 'RANKED', label: t.ranked },
                    ]}
                  />
                  <div className="field-label">{language === 'ru' ? 'Правила' : 'Ruleset'}</div>
                  <SegmentedControl
                    label="Ruleset"
                    value={ruleset}
                    onChange={setRuleset}
                    options={rulesets.map((value) => ({
                      value,
                      label: value === 'LONG_NARDY' ? t.long : t.short,
                    }))}
                  />
                  {mode === 'CASUAL' && (
                    <>
                      <div className="field-label">
                        {language === 'ru' ? 'Соперник' : 'Opponent'}
                      </div>
                      <SegmentedControl
                        label="Opponent"
                        value={opponent}
                        onChange={setOpponent}
                        options={[
                          { value: 'FIND', label: t.find },
                          { value: 'FRIEND', label: t.friend },
                        ]}
                      />
                    </>
                  )}
                  <div className="rating-context">
                    <span>
                      {mode === 'RANKED'
                        ? (rating?.played ?? 0) < 10
                          ? language === 'ru'
                            ? `Калибровка ${rating?.played ?? 0}/10`
                            : `Calibration ${rating?.played ?? 0}/10`
                          : t.ranked
                        : language === 'ru'
                          ? 'Матч без рейтинга'
                          : 'Unrated match'}
                    </span>
                    <strong>
                      {rating?.played && rating.played < 10 ? '≈ ' : ''}
                      {rating?.rating ?? 1000}
                    </strong>
                  </div>
                  {me.activeMatchId ? (
                    <button className="primary" onClick={() => setMatch(me.activeMatchId)}>
                      {t.return}
                    </button>
                  ) : (
                    <button
                      className="primary"
                      onClick={() =>
                        run(async () => {
                          if (mode === 'CASUAL' && opponent === 'FRIEND') {
                            await invite();
                          } else {
                            await api('/queue', 'POST', { ruleset, mode });
                            setSearchStarted(Date.now());
                            setQueue(true);
                          }
                        })
                      }
                    >
                      {mode === 'RANKED'
                        ? language === 'ru'
                          ? 'Найти рейтинговый матч'
                          : 'Find ranked match'
                        : opponent === 'FRIEND'
                          ? language === 'ru'
                            ? 'Создать приглашение'
                            : 'Create challenge'
                          : t.find}
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() => {
                      setTutorial(true);
                      nav('rules');
                    }}
                  >
                    {t.tutorial} →
                  </button>
                </GlassSurface>
              </>
            )}

            {screen === 'leaders' && (
              <>
                <PageTitle title={t.leaders} />
                <SegmentedControl
                  label="Ruleset"
                  value={ruleset}
                  onChange={(selectedRuleset) => {
                    setRuleset(selectedRuleset);
                    loadRanks(selectedRuleset);
                  }}
                  options={rulesets.map((value) => ({
                    value,
                    label: value === 'LONG_NARDY' ? t.long : t.short,
                  }))}
                />

                {rankState === 'loading' || rankState === 'idle' ? (
                  <LeaderboardSkeleton />
                ) : rankState === 'error' ? (
                  <InlineState
                    title={language === 'ru' ? 'Рейтинг недоступен' : 'Rankings unavailable'}
                    text={
                      language === 'ru'
                        ? 'Не удалось загрузить таблицу лидеров.'
                        : 'The leaderboard could not be loaded.'
                    }
                    action={language === 'ru' ? 'Повторить' : 'Retry'}
                    onAction={() => loadRanks(ruleset)}
                    retry
                  />
                ) : (
                  <>
                    {ranks.top.length ? (
                      <div className="leader-list">
                        {ranks.top.map((rank, index) => (
                          <button
                            className={`leader-row ${index < 3 ? 'top-rank' : ''}`}
                            key={rank.id}
                            onClick={() => setPublicId(rank.id)}
                          >
                            <span className="rank-no">{rank.position}</span>
                            <span className="avatar">{avatarEmoji[rank.avatar]}</span>
                            <span className="row-main">{rank.nickname}</span>
                            <strong>{rank.rating}</strong>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <InlineState
                        title={language === 'ru' ? 'Пока нет игроков' : 'No ranked players yet'}
                        text={
                          language === 'ru'
                            ? 'Таблица появится после завершённых рейтинговых матчей.'
                            : 'The leaderboard will populate after ranked matches are completed.'
                        }
                      />
                    )}

                    <GlassSurface className="self-card">
                      {ranks.self ? (
                        <>
                          <span>
                            {language === 'ru' ? 'Ваша позиция' : 'Your position'} · #
                            {ranks.self.position}
                          </span>
                          <strong>{ranks.self.rating}</strong>
                        </>
                      ) : (
                        <>
                          <span>
                            {language === 'ru' ? 'Калибровка' : 'Calibration'}{' '}
                            {Math.min(10, rating?.played ?? 0)}/10
                          </span>
                          <strong>≈ {rating?.rating ?? 1000}</strong>
                        </>
                      )}
                    </GlassSurface>
                  </>
                )}
              </>
            )}

            {screen === 'profile' && (
              <>
                <div className="profile-hero">
                  <span
                    className={`avatar profile-avatar ${resolveProfileFrame(me.cosmetics.profileFrame).className}`}
                  >
                    {avatarEmoji[me.avatar]}
                  </span>
                  <h1>{me.nickname}</h1>
                  <p>
                    {t.level} {me.level} · {me.totalXp} XP · {me.coins} {t.coins}
                  </p>
                  <ProgressBar
                    label="XP"
                    value={me.levelProgress.xpIntoLevel}
                    max={me.levelProgress.xpRequiredForNextLevel}
                  />
                  <small>
                    {me.levelProgress.xpIntoLevel} / {me.levelProgress.xpRequiredForNextLevel} XP
                  </small>
                </div>
                <div className="rating-grid">
                  {me.ratings.map((r) => (
                    <GlassSurface key={r.ruleset}>
                      <small>{r.ruleset === 'LONG_NARDY' ? t.long : t.short}</small>
                      <strong>
                        {r.played < 10 ? '≈ ' : ''}
                        {r.rating}
                      </strong>
                      <span>
                        {language === 'ru' ? 'Пик' : 'Peak'} {r.peak} · {Math.min(r.played, 10)}/10
                      </span>
                    </GlassSurface>
                  ))}
                </div>
                <div className="menu-list">
                  <Menu label={t.history} onClick={() => nav('history')} />
                  <Menu
                    label={language === 'ru' ? 'Обучение и правила' : 'Learn & Rules'}
                    onClick={() => nav('rules')}
                  />
                  <Menu label={t.settings} onClick={() => nav('settings')} />
                  <Menu
                    label={language === 'ru' ? 'Редактировать профиль' : 'Edit profile'}
                    onClick={() => setEdit(true)}
                  />
                  <Menu
                    label={
                      language === 'ru' ? 'Техническая информация' : 'Technical / Account info'
                    }
                    onClick={() => nav('technical')}
                  />
                  {me.admin && <Menu label={t.admin} onClick={() => nav('admin')} />}
                </div>
                {edit && (
                  <BottomSheet label={t.profile} onClose={() => setEdit(false)}>
                    <h2>{language === 'ru' ? 'Редактировать профиль' : 'Edit profile'}</h2>
                    <div className="avatar-options">
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
                    <small>
                      {language === 'ru'
                        ? 'Никнейм можно менять раз в 7 дней.'
                        : 'Nickname can be changed once every 7 days.'}
                    </small>
                    <button
                      className="primary"
                      onClick={() => {
                        patch({ nickname });
                        setEdit(false);
                      }}
                    >
                      {t.save}
                    </button>
                  </BottomSheet>
                )}
              </>
            )}

            {screen === 'history' && (
              <>
                <Back title={t.history} onBack={() => nav('profile')} />
                {historyState === 'loading' || historyState === 'idle' ? (
                  <HistorySkeleton />
                ) : historyState === 'error' ? (
                  <InlineState
                    title={language === 'ru' ? 'История недоступна' : 'History unavailable'}
                    text={
                      language === 'ru'
                        ? 'Не удалось загрузить историю матчей.'
                        : 'Your match history could not be loaded.'
                    }
                    action={language === 'ru' ? 'Повторить' : 'Retry'}
                    onAction={loadHistory}
                    retry
                  />
                ) : history.length === 0 ? (
                  <Empty
                    text={
                      language === 'ru' ? 'Завершённых матчей пока нет' : 'No completed matches yet'
                    }
                    detail={
                      language === 'ru'
                        ? 'Завершённые игры появятся здесь.'
                        : 'Your completed games will appear here.'
                    }
                    action={language === 'ru' ? 'Играть' : 'Play a match'}
                    onAction={() => nav('home')}
                  />
                ) : (
                  history.map((h) => (
                    <article className="history-row" key={h.id}>
                      <span className={`result-mark ${h.result.toLowerCase()}`}>
                        {h.result === 'WIN' ? t.win : h.result === 'LOSS' ? t.loss : t.uncounted}
                      </span>
                      <button
                        className="identity-button"
                        onClick={() => setPublicId(h.opponent_id)}
                      >
                        {h.opponent}
                      </button>
                      <span>
                        {h.ruleset === 'LONG_NARDY' ? t.long : t.short} ·{' '}
                        {h.mode === 'RANKED'
                          ? t.ranked
                          : h.mode === 'PRIVATE'
                            ? 'Private · Unrated'
                            : t.casual}
                      </span>
                      <small>
                        {new Date(h.finished_at).toLocaleString(language)}
                        {h.finish_reason !== 'BEAR_OFF'
                          ? ` · ${message(language, h.finish_reason)}`
                          : ''}
                      </small>
                      {h.rating_before !== null && h.rating_after !== null && (
                        <strong
                          className={
                            h.rating_after - h.rating_before >= 0 ? 'positive' : 'negative'
                          }
                        >
                          {h.rating_after - h.rating_before >= 0 ? '+' : ''}
                          {h.rating_after - h.rating_before}
                        </strong>
                      )}
                    </article>
                  ))
                )}
              </>
            )}

            {screen === 'rules' && (
              <>
                <Back
                  title={language === 'ru' ? 'Обучение и правила' : 'Learn & Rules'}
                  onBack={() => {
                    const destination = tutorial ? 'home' : 'profile';
                    setTutorial(false);
                    nav(destination);
                  }}
                />
                <SegmentedControl
                  label="Ruleset"
                  value={ruleset}
                  onChange={setRuleset}
                  options={rulesets.map((value) => ({
                    value,
                    label: value === 'LONG_NARDY' ? t.long : t.short,
                  }))}
                />
                <GlassSurface className="learn-card">
                  <h2>{ruleset === 'LONG_NARDY' ? t.long : t.short}</h2>
                  <h3>{t.tutorial}</h3>
                  <Tutorial key={ruleset} ruleset={ruleset} language={language} />
                  <h3>{language === 'ru' ? 'Справочник правил' : 'Rules Reference'}</h3>
                  <ol>
                    {rules[language][ruleset].map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ol>
                  <button
                    className="primary"
                    onClick={() => {
                      setTutorial(false);
                      nav('home');
                    }}
                  >
                    {t.start}
                  </button>
                </GlassSurface>
              </>
            )}

            {screen === 'settings' && (
              <Settings
                me={me}
                language={language}
                patch={patch}
                onBack={() => nav('profile')}
                onDeleted={() => {
                  setMe(null);
                  setError('ACCOUNT_DISABLED');
                }}
              />
            )}

            {screen === 'technical' && (
              <>
                <Back
                  title={language === 'ru' ? 'Аккаунт' : 'Account info'}
                  onBack={() => nav('profile')}
                />
                <GlassSurface>
                  <p>{language === 'ru' ? 'Внутренний ID аккаунта' : 'Internal account ID'}</p>
                  <code>{me.id}</code>
                  <p>{t.beta}</p>
                </GlassSurface>
              </>
            )}

            {screen === 'admin' && me.admin && (
              <>
                <Back title="Admin" onBack={() => nav('profile')} />
                <Admin />
              </>
            )}
          </div>

          <nav className="bottom-nav glass glass-strong" aria-label="Primary">
            {primaryNavigation.map((item) => (
              <button
                key={item.id}
                className={`${screen === item.id ? 'active' : ''} ${item.id === 'home' ? 'play-tab' : ''}`}
                onClick={() => nav(item.id)}
              >
                <i>{item.icon}</i>
                <span>{t[item.id]}</span>
              </button>
            ))}
          </nav>
        </>
      )}
    </main>
  );
}

function PageTitle({ title }: { title: string }) {
  return (
    <div className="page-title">
      <p className="eyebrow">SEASON 0</p>
      <h1>{title}</h1>
    </div>
  );
}

function Back({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="secondary-head">
      <button onClick={onBack} aria-label="Back">
        <ChevronLeftIcon />
      </button>
      <h1>{title}</h1>
    </div>
  );
}

function Menu({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}>
      <span>{label}</span>
      <b aria-hidden="true">
        <ChevronRightIcon />
      </b>
    </button>
  );
}

function Empty({
  text,
  detail,
  action,
  onAction,
}: {
  text: string;
  detail?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <GlassSurface className="empty polished-empty">
      <EmptyStateIcon />
      <h3>{text}</h3>
      {detail && <p>{detail}</p>}
      {action && onAction && (
        <button className="primary" onClick={onAction}>
          {action}
        </button>
      )}
    </GlassSurface>
  );
}

function InlineState({
  title,
  text,
  action,
  onAction,
  retry = false,
}: {
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
  retry?: boolean;
}) {
  return (
    <div className="commerce-state-card">
      {retry ? <RetryIcon /> : <EmptyStateIcon />}
      <h3>{title}</h3>
      <p>{text}</p>
      {action && onAction && <button onClick={onAction}>{action}</button>}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="leader-list leader-skeleton" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <div className="leader-skeleton-row" key={index}>
          <i />
          <span />
          <b />
          <strong />
        </div>
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="history-skeleton" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div className="history-skeleton-row" key={index}>
          <span />
          <strong />
          <i />
        </div>
      ))}
    </div>
  );
}

function Focused({
  title,
  subtitle,
  detail = '',
  time,
  onCancel,
  countdown = false,
  onPrimary,
  primary,
}: {
  title: string;
  subtitle: string;
  detail?: string;
  time: number;
  onCancel: () => void;
  countdown?: boolean;
  onPrimary?: () => void;
  primary?: string;
}) {
  return (
    <section className="focused-flow">
      <div className="brand">
        UNDER<span>GAMMON</span>
      </div>
      <div className="search-orbit">
        <i />
        <i />
        <i />
      </div>
      <p className="eyebrow">{subtitle}</p>
      <h1>{title}</h1>
      {detail && <p>{detail}</p>}
      <strong className="focus-time">
        {countdown ? '' : '+ '}
        {Math.floor(time / 60)
          .toString()
          .padStart(2, '0')}
        :{(time % 60).toString().padStart(2, '0')}
      </strong>
      {onPrimary && (
        <button className="primary" onClick={onPrimary}>
          {primary}
        </button>
      )}
      <button onClick={onCancel}>{copy.en.cancel}</button>
    </section>
  );
}

function Settings({
  me,
  language,
  patch,
  onBack,
  onDeleted,
}: {
  me: Profile;
  language: Language;
  patch: (x: unknown) => void;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const t = copy[language];
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Back title={t.settings} onBack={onBack} />
      <GlassSurface className="settings">
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
          {language === 'ru' ? 'Реакции соперника' : 'Opponent reactions'}
          <input
            type="checkbox"
            checked={!me.muteOpponentReactions}
            onChange={(e) => patch({ muteOpponentReactions: !e.target.checked })}
          />
        </label>
      </GlassSurface>
      <button className="danger-row" onClick={() => setConfirm(true)}>
        {t.delete}
      </button>
      {confirm && (
        <BottomSheet label={t.delete} onClose={() => setConfirm(false)}>
          <h2>{t.delete}</h2>
          <p>{t.deleteConfirm}</p>
          <button
            className="danger-fill"
            onClick={() => void api('/account/delete', 'POST', {}).then(onDeleted)}
          >
            {t.delete}
          </button>
          <button onClick={() => setConfirm(false)}>{t.cancel}</button>
        </BottomSheet>
      )}
    </>
  );
}

function Admin() {
  const [query, setQuery] = useState(''),
    [target, setTarget] = useState(''),
    [reason, setReason] = useState(''),
    [action, setAction] = useState('COINS'),
    [value, setValue] = useState(0),
    [ruleset, setRuleset] = useState('LONG_NARDY'),
    [output, setOutput] = useState('');
  const execute = async (path: string, method = 'GET', body?: unknown) => {
    try {
      setOutput(JSON.stringify(await api(path, method, body), null, 2));
    } catch (e) {
      setOutput(String(e));
    }
  };
  return (
    <GlassSurface className="admin">
      <h2>Account lookup</h2>
      <input
        placeholder="Account UUID / Telegram ID"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={() => void execute('/admin/account?query=' + encodeURIComponent(query))}>
        Inspect
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
        placeholder="Mandatory reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button
        className="danger-fill"
        disabled={!target || !reason}
        onClick={() => {
          if (window.confirm(`Apply ${action}?`))
            void execute('/admin/adjust', 'POST', {
              operationId: crypto.randomUUID(),
              target,
              action,
              value,
              ruleset,
              reason,
            });
        }}
      >
        Confirm action
      </button>
      <button onClick={() => void execute('/admin/audit')}>Audit log</button>
      <pre>{output}</pre>
    </GlassSurface>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
