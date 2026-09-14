import { useEffect, useState } from 'react';
import { api } from './platform';
import { copy, avatarEmoji, message, type Language } from './content';
interface PublicData {
  nickname: string;
  avatar: string;
  level: number;
  stats: { played: number; wins: number };
  ratings: { ruleset: string; rating: number; peak: number; played: number }[];
}
export function PublicProfile({
  id,
  language,
  onClose,
}: {
  id: string;
  language: Language;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<PublicData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void api<PublicData>('/profiles/' + id)
      .then(setProfile)
      .catch(() => setError('ERROR'));
  }, [id]);
  const t = copy[language];
  return (
    <div className="modal-backdrop">
      <section
        className="panel profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t.profile}
      >
        <button className="subtle" onClick={onClose}>
          {t.close} ×
        </button>
        {profile ? (
          <>
            <span className="avatar large">{avatarEmoji[profile.avatar]}</span>
            <h2>{profile.nickname}</h2>
            <p>
              {t.level} {profile.level}
            </p>
            <p>
              {language === 'ru' ? 'Матчей' : 'Matches'}: {profile.stats.played} ·{' '}
              {language === 'ru' ? 'Побед' : 'Wins'}: {profile.stats.wins}
            </p>
            {profile.ratings.map((r) => (
              <p key={r.ruleset}>
                {r.ruleset === 'LONG_NARDY' ? t.long : t.short}: {r.played < 10 ? '≈ ' : ''}
                {r.rating} · {language === 'ru' ? 'Пик' : 'Peak'} {r.peak}
              </p>
            ))}
          </>
        ) : (
          <p>{error ? message(language, error) : t.reconnecting}</p>
        )}
      </section>
    </div>
  );
}
