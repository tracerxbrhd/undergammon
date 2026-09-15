import { useEffect, useState } from 'react';
import type { CosmeticsInventory, Profile, ProfileFrameId } from '@undergammon/protocol';
import { api, platform } from './platform';
import type { Language } from './content';
import { EmptyStateIcon, RetryIcon } from './ui/icons';
import { ProfileFramePreview } from './ui/ProfileFramePreview';

const names: Record<ProfileFrameId, readonly [string, string]> = {
  default: ['Default', 'По умолчанию'],
  season0_tester_frame: ['Season 0 Tester', 'Тестер Сезона 0'],
  bronze_profile_frame: ['Bronze Frame', 'Бронзовая рамка'],
};

function description(id: ProfileFrameId, language: Language): string {
  if (id === 'season0_tester_frame') {
    return language === 'ru' ? 'Награда участника Сезона 0.' : 'Season 0 participant reward.';
  }
  if (id === 'bronze_profile_frame') {
    return language === 'ru' ? 'Постоянная рамка из Магазина.' : 'Permanent Store profile frame.';
  }
  return language === 'ru' ? 'Стандартный вид профиля.' : 'Standard profile appearance.';
}

export function Cosmetics({
  language,
  onEquipment,
}: {
  language: Language;
  onEquipment: (cosmetics: Profile['cosmetics']) => void;
}) {
  const [inventory, setInventory] = useState<CosmeticsInventory | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setInventory(null);
    setLoadError(false);
    void api<CosmeticsInventory>('/cosmetics')
      .then((value) => {
        if (active) setInventory(value);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const ids: ProfileFrameId[] = inventory
    ? [
        'default',
        ...inventory.owned
          .map((item) => item.cosmeticId)
          .filter((id): id is ProfileFrameId => id in names),
      ]
    : [];

  const equip = async (cosmeticId: ProfileFrameId) => {
    setPending(cosmeticId);
    try {
      const equipped = await api<Profile['cosmetics']>('/cosmetics/equipment', 'PUT', {
        slot: 'PROFILE_FRAME',
        cosmeticId,
      });
      setInventory((current) => (current ? { ...current, equipped } : current));
      onEquipment(equipped);
      platform.haptic();
    } finally {
      setPending(null);
    }
  };

  return (
    <section aria-labelledby="cosmetics-title">
      <div className="page-title">
        <p className="eyebrow">SEASON 0</p>
        <h1 id="cosmetics-title">{language === 'ru' ? 'Экипировка' : 'Cosmetics'}</h1>
      </div>
      <h2 className="section-label">{language === 'ru' ? 'Рамки профиля' : 'Profile Frames'}</h2>

      {loadError ? (
        <div className="commerce-state-card" role="alert">
          <RetryIcon />
          <h3>{language === 'ru' ? 'Коллекция недоступна' : 'Collection unavailable'}</h3>
          <p>
            {language === 'ru'
              ? 'Не удалось загрузить экипировку. Попробуйте ещё раз.'
              : 'Your cosmetics could not be loaded. Try again.'}
          </p>
          <button onClick={() => setReloadKey((value) => value + 1)}>
            {language === 'ru' ? 'Повторить' : 'Retry'}
          </button>
        </div>
      ) : inventory === null ? (
        <div className="cosmetic-grid" aria-label={language === 'ru' ? 'Загрузка' : 'Loading'}>
          <CosmeticSkeleton />
          <CosmeticSkeleton />
        </div>
      ) : ids.length === 0 ? (
        <div className="commerce-state-card">
          <EmptyStateIcon />
          <h3>{language === 'ru' ? 'Коллекция пуста' : 'Collection is empty'}</h3>
        </div>
      ) : (
        <div className="cosmetic-grid">
          {ids.map((id) => {
            const equipped = inventory.equipped.profileFrame === id;
            return (
              <article
                className={`cosmetic-card polished-card owned ${equipped ? 'equipped' : ''}`}
                key={id}
              >
                <ProfileFramePreview cosmeticId={id} />
                <div className="cosmetic-card-copy">
                  <h3>{names[id]![language === 'ru' ? 1 : 0]}</h3>
                  <p>{description(id, language)}</p>
                </div>
                {equipped ? (
                  <span className="cosmetic-state equipped">
                    {language === 'ru' ? 'Выбрано' : 'Equipped'}
                  </span>
                ) : (
                  <button disabled={pending !== null} onClick={() => void equip(id)}>
                    {pending === id
                      ? language === 'ru'
                        ? 'Выбор…'
                        : 'Equipping…'
                      : language === 'ru'
                        ? 'Выбрать'
                        : 'Equip'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CosmeticSkeleton() {
  return (
    <div className="cosmetic-skeleton" aria-hidden="true">
      <span />
      <div />
      <i />
    </div>
  );
}
