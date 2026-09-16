import { useEffect, useState } from 'react';
import type { CosmeticSlot, StoreProduct, StorePurchaseResult } from '@undergammon/protocol';
import { api, platform } from './platform';
import type { Language } from './content';
import { cosmeticDescription, cosmeticName, cosmeticSlotLabel } from './cosmetic-content';
import { EmptyStateIcon, RetryIcon } from './ui/icons';
import { CosmeticPreview } from './ui/CosmeticPreview';

interface Notice {
  readonly kind: 'success' | 'error';
  readonly text: string;
}

const storeSlots: readonly CosmeticSlot[] = ['PROFILE_FRAME', 'CHECKER_SET', 'DICE_SKIN'];

function productKey(product: Pick<StoreProduct, 'slot' | 'cosmeticId'>): string {
  return `${product.slot}:${product.cosmeticId}`;
}

export function Store({
  language,
  coins,
  onBalance,
}: {
  language: Language;
  coins: number;
  onBalance: (coins: number) => void;
}) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    void api<StoreProduct[]>(`/store?slots=${storeSlots.join(',')}`)
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const buy = async (product: StoreProduct) => {
    const key = productKey(product);
    setPending(key);
    setNotice(null);
    try {
      const result = await api<StorePurchaseResult>('/store/purchase', 'POST', {
        slot: product.slot,
        cosmeticId: product.cosmeticId,
      });
      onBalance(result.balance);
      setProducts((current) =>
        current.map((item) => (productKey(item) === key ? result.product : item)),
      );
      platform.haptic();
      setNotice({
        kind: 'success',
        text: language === 'ru' ? 'Покупка завершена' : 'Purchase complete',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error && error.message === 'INSUFFICIENT_COINS'
            ? language === 'ru'
              ? 'Недостаточно монет'
              : 'Insufficient Coins'
            : language === 'ru'
              ? 'Не удалось купить'
              : 'Purchase failed',
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <section aria-labelledby="store-title">
      <div className="page-title commerce-title">
        <div>
          <p className="eyebrow">SEASON 0</p>
          <h1 id="store-title">{language === 'ru' ? 'Магазин' : 'Store'}</h1>
        </div>
        <strong>
          {coins} {language === 'ru' ? 'Монет' : 'Coins'}
        </strong>
      </div>

      {loading ? (
        <div className="cosmetic-grid" aria-label={language === 'ru' ? 'Загрузка' : 'Loading'}>
          <CosmeticSkeleton />
          <CosmeticSkeleton />
        </div>
      ) : loadError ? (
        <div className="commerce-state-card" role="alert">
          <RetryIcon />
          <h3>{language === 'ru' ? 'Магазин недоступен' : 'Store unavailable'}</h3>
          <p>
            {language === 'ru'
              ? 'Не удалось загрузить каталог. Попробуйте ещё раз.'
              : 'The catalog could not be loaded. Try again.'}
          </p>
          <button onClick={() => setReloadKey((value) => value + 1)}>
            {language === 'ru' ? 'Повторить' : 'Retry'}
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="commerce-state-card">
          <EmptyStateIcon />
          <h3>{language === 'ru' ? 'Пока пусто' : 'Nothing here yet'}</h3>
          <p>
            {language === 'ru'
              ? 'Доступные предметы появятся здесь.'
              : 'Available items will appear here.'}
          </p>
        </div>
      ) : (
        storeSlots.map((slot) => {
          const items = products.filter((product) => product.slot === slot);
          if (!items.length) return null;
          return (
            <div className="cosmetic-section" key={slot}>
              <h2 className="section-label">{cosmeticSlotLabel(slot, language)}</h2>
              <div className="cosmetic-grid">
                {items.map((product) => {
                  const key = productKey(product);
                  return (
                    <article
                      className={`cosmetic-card polished-card ${product.owned ? 'owned' : ''}`}
                      key={key}
                    >
                      <CosmeticPreview slot={product.slot} cosmeticId={product.cosmeticId} />
                      <div className="cosmetic-card-copy">
                        <h3>{cosmeticName(product.slot, product.cosmeticId, language)}</h3>
                        <small>
                          {product.priceCoins} {language === 'ru' ? 'Монет' : 'Coins'}
                        </small>
                        <p>{cosmeticDescription(product.slot, product.cosmeticId, language)}</p>
                      </div>
                      {product.owned ? (
                        <button className="cosmetic-state owned" disabled>
                          {language === 'ru' ? 'Куплено' : 'Owned'}
                        </button>
                      ) : (
                        <button disabled={pending !== null} onClick={() => void buy(product)}>
                          {pending === key
                            ? language === 'ru'
                              ? 'Покупка…'
                              : 'Buying…'
                            : language === 'ru'
                              ? 'Купить'
                              : 'Buy'}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {notice && (
        <p className={`commerce-notice ${notice.kind}`} role="status">
          {notice.text}
        </p>
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
