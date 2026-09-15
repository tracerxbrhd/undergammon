import { useEffect, useState } from 'react';
import type { StoreProduct, StorePurchaseResult } from '@undergammon/protocol';
import { api, platform } from './platform';
import type { Language } from './content';
import { EmptyStateIcon, RetryIcon } from './ui/icons';
import { ProfileFramePreview } from './ui/ProfileFramePreview';

interface Notice {
  readonly kind: 'success' | 'error';
  readonly text: string;
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
    void api<StoreProduct[]>('/store')
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

  const buy = async (cosmeticId: string) => {
    setPending(cosmeticId);
    setNotice(null);
    try {
      const result = await api<StorePurchaseResult>('/store/purchase', 'POST', { cosmeticId });
      onBalance(result.balance);
      setProducts((current) =>
        current.map((product) => (product.cosmeticId === cosmeticId ? result.product : product)),
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
      <h2 className="section-label">{language === 'ru' ? 'Рамки профиля' : 'Profile Frames'}</h2>

      {loading ? (
        <div className="cosmetic-grid" aria-label={language === 'ru' ? 'Загрузка' : 'Loading'}>
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
        <div className="cosmetic-grid">
          {products.map((product) => (
            <article
              className={`cosmetic-card polished-card ${product.owned ? 'owned' : ''}`}
              key={product.cosmeticId}
            >
              <ProfileFramePreview cosmeticId={product.cosmeticId} />
              <div className="cosmetic-card-copy">
                <h3>{language === 'ru' ? 'Бронзовая рамка' : 'Bronze Frame'}</h3>
                <small>
                  {product.priceCoins} {language === 'ru' ? 'Монет' : 'Coins'}
                </small>
                <p>
                  {language === 'ru'
                    ? 'Постоянная рамка профиля.'
                    : 'Permanent profile frame.'}
                </p>
              </div>
              {product.owned ? (
                <button className="cosmetic-state owned" disabled>
                  {language === 'ru' ? 'Куплено' : 'Owned'}
                </button>
              ) : (
                <button disabled={pending !== null} onClick={() => void buy(product.cosmeticId)}>
                  {pending === product.cosmeticId
                    ? language === 'ru'
                      ? 'Покупка…'
                      : 'Buying…'
                    : language === 'ru'
                      ? 'Купить'
                      : 'Buy'}
                </button>
              )}
            </article>
          ))}
        </div>
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
