import { useEffect, useState } from 'react';
import type { PublicProfile as PublicData } from '@undergammon/protocol';
import { api } from './platform';
import { copy, avatarEmoji, type Language } from './content';
import { BottomSheet } from './ui';
import { CloseIcon, RetryIcon } from './ui/icons';
import { ProfileFramePreview } from './ui/ProfileFramePreview';

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
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const t = copy[language];

  useEffect(() => {
    let active = true;
    setProfile(null);
    setError(false);
    void api<PublicData>('/profiles/' + id)
      .then((value) => {
        if (active) setProfile(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const winRate = profile?.stats.played
    ? Math.round((profile.stats.wins / profile.stats.played) * 100)
    : 0;

  return (
    <BottomSheet onClose={onClose} label={t.profile}>
      <div className="public-profile-sheet">
        <button className="subtle public-profile-close" onClick={onClose} aria-label={t.close}>
          <CloseIcon />
        </button>
        {profile ? (
          <>
            <div className="public-profile-identity">
              <ProfileFramePreview cosmeticId={profile.cosmetics.profileFrame} variant="hero">
                {avatarEmoji[profile.avatar]}
              </ProfileFramePreview>
              <h2>{profile.nickname}</h2>
              <p>
                {t.level} {profile.level}
              </p>
            </div>

            <div className="public-profile-ratings">
              {profile.ratings.map((rating) => (
                <div className="public-profile-rating" key={rating.ruleset}>
                  <small>{rating.ruleset === 'LONG_NARDY' ? t.long : t.short}</small>
                  <strong>
                    {rating.played < 10 ? '≈ ' : ''}
                    {rating.rating}
                  </strong>
                  <span>
                    {language === 'ru' ? 'Пик' : 'Peak'} {rating.peak}
                    {rating.played < 10
                      ? ` · ${language === 'ru' ? 'Калибровка' : 'Calibration'} ${Math.min(10, rating.played)}/10`
                      : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="public-profile-stats">
              <div className="public-profile-stat">
                <strong>{profile.stats.played}</strong>
                <span>{language === 'ru' ? 'Матчей' : 'Matches'}</span>
              </div>
              <div className="public-profile-stat">
                <strong>{profile.stats.wins}</strong>
                <span>{language === 'ru' ? 'Побед' : 'Wins'}</span>
              </div>
              <div className="public-profile-stat">
                <strong>{winRate}%</strong>
                <span>{language === 'ru' ? 'Побед' : 'Win rate'}</span>
              </div>
            </div>
          </>
        ) : error ? (
          <div className="commerce-state-card" role="alert">
            <RetryIcon />
            <h3>{language === 'ru' ? 'Профиль недоступен' : 'Profile unavailable'}</h3>
            <p>
              {language === 'ru'
                ? 'Не удалось загрузить профиль игрока.'
                : 'The player profile could not be loaded.'}
            </p>
            <button onClick={() => setReloadKey((value) => value + 1)}>
              {language === 'ru' ? 'Повторить' : 'Retry'}
            </button>
          </div>
        ) : (
          <div className="commerce-state-card" aria-live="polite">
            <div className="search-orbit" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <p>{t.reconnecting}</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
