import { useEffect, useState } from 'react';
import type { CosmeticsInventory, Profile, ProfileFrameId } from '@undergammon/protocol';
import { api } from './platform';
import type { Language } from './content';
import { resolveProfileFrame } from './game/cosmetics';

const names: Record<ProfileFrameId, readonly [string, string]> = {
  default: ['Default', 'По умолчанию'],
  season0_tester_frame: ['Season 0 Tester', 'Тестер Сезона 0'],
  bronze_profile_frame: ['Bronze Frame', 'Бронзовая рамка'],
};

export function Cosmetics({
  language,
  onEquipment,
}: {
  language: Language;
  onEquipment: (cosmetics: Profile['cosmetics']) => void;
}) {
  const [inventory, setInventory] = useState<CosmeticsInventory | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    void api<CosmeticsInventory>('/cosmetics').then(setInventory);
  }, []);
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
      <div className="cosmetic-tabs" role="tablist">
        <button className="active">{language === 'ru' ? 'Рамки' : 'Frames'}</button>
      </div>
      <div className="cosmetic-grid" aria-busy={inventory === null}>
        {ids.map((id) => {
          const equipped = inventory?.equipped.profileFrame === id;
          return (
            <article className="cosmetic-card glass" key={id}>
              <span className={`cosmetic-preview ${resolveProfileFrame(id).className}`}>UG</span>
              <div>
                <h3>{names[id]![language === 'ru' ? 1 : 0]}</h3>
                {id === 'season0_tester_frame' && (
                  <small>{language === 'ru' ? 'Награда Сезона 0' : 'Season 0 reward'}</small>
                )}
              </div>
              <button disabled={equipped || pending !== null} onClick={() => void equip(id)}>
                {equipped
                  ? language === 'ru'
                    ? 'Используется'
                    : 'Equipped'
                  : pending === id
                    ? '…'
                    : language === 'ru'
                      ? 'Использовать'
                      : 'Equip'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
