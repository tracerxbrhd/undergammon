import { useEffect, useState } from 'react';
import {
  checkerSetIdSchema,
  profileFrameIdSchema,
  type CosmeticId,
  type CosmeticSlot,
  type CosmeticsInventory,
  type Profile,
} from '@undergammon/protocol';
import { api, platform } from './platform';
import type { Language } from './content';
import { cosmeticDescription, cosmeticName, cosmeticSlotLabel } from './cosmetic-content';
import { RetryIcon } from './ui/icons';
import { CosmeticPreview } from './ui/CosmeticPreview';

interface CosmeticItem {
  readonly slot: CosmeticSlot;
  readonly cosmeticId: CosmeticId;
}

function itemKey(item: CosmeticItem): string {
  return `${item.slot}:${item.cosmeticId}`;
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

  const equip = async (item: CosmeticItem) => {
    const key = itemKey(item);
    setPending(key);
    try {
      const equipped = await api<Profile['cosmetics']>('/cosmetics/equipment', 'PUT', item);
      setInventory((current) => (current ? { ...current, equipped } : current));
      onEquipment(equipped);
      platform.haptic();
    } finally {
      setPending(null);
    }
  };

  const ownedIds = (slot: CosmeticSlot): string[] =>
    inventory?.owned.filter((item) => item.slot === slot).map((item) => item.cosmeticId) ?? [];

  const frameItems: CosmeticItem[] = inventory
    ? [
        { slot: 'PROFILE_FRAME', cosmeticId: 'default' },
        ...ownedIds('PROFILE_FRAME').flatMap((id) => {
          const parsed = profileFrameIdSchema.safeParse(id);
          return parsed.success && parsed.data !== 'default'
            ? [{ slot: 'PROFILE_FRAME' as const, cosmeticId: parsed.data }]
            : [];
        }),
      ]
    : [];
  const checkerItems: CosmeticItem[] = inventory
    ? [
        { slot: 'CHECKER_SET', cosmeticId: 'default' },
        ...ownedIds('CHECKER_SET').flatMap((id) => {
          const parsed = checkerSetIdSchema.safeParse(id);
          return parsed.success && parsed.data !== 'default'
            ? [{ slot: 'CHECKER_SET' as const, cosmeticId: parsed.data }]
            : [];
        }),
      ]
    : [];

  const equippedId = (slot: CosmeticSlot): CosmeticId => {
    if (!inventory) return 'default';
    if (slot === 'PROFILE_FRAME') return inventory.equipped.profileFrame;
    if (slot === 'CHECKER_SET') return inventory.equipped.checkerSet ?? 'default';
    return inventory.equipped.diceSkin ?? 'default';
  };

  const renderSection = (slot: CosmeticSlot, items: readonly CosmeticItem[]) => (
    <div className="cosmetic-section" key={slot}>
      <h2 className="section-label">{cosmeticSlotLabel(slot, language)}</h2>
      <div className="cosmetic-grid">
        {items.map((item) => {
          const key = itemKey(item);
          const equipped = equippedId(slot) === item.cosmeticId;
          return (
            <article
              className={`cosmetic-card polished-card owned ${equipped ? 'equipped' : ''}`}
              key={key}
            >
              <CosmeticPreview slot={slot} cosmeticId={item.cosmeticId} />
              <div className="cosmetic-card-copy">
                <h3>{cosmeticName(slot, item.cosmeticId, language)}</h3>
                <p>{cosmeticDescription(slot, item.cosmeticId, language)}</p>
              </div>
              {equipped ? (
                <button className="cosmetic-state equipped" disabled>
                  {language === 'ru' ? 'Выбрано' : 'Equipped'}
                </button>
              ) : (
                <button disabled={pending !== null} onClick={() => void equip(item)}>
                  {pending === key
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
    </div>
  );

  return (
    <section aria-labelledby="cosmetics-title">
      <div className="page-title">
        <p className="eyebrow">SEASON 0</p>
        <h1 id="cosmetics-title">{language === 'ru' ? 'Экипировка' : 'Cosmetics'}</h1>
      </div>

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
      ) : (
        <>
          {renderSection('PROFILE_FRAME', frameItems)}
          {renderSection('CHECKER_SET', checkerItems)}
        </>
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
