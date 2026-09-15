import { useEffect, useState } from 'react';
import type { StoreProduct, StorePurchaseResult } from '@undergammon/protocol';
import { api, platform } from './platform';
import type { Language } from './content';
import { resolveProfileFrame } from './game/cosmetics';

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
  const [notice, setNotice] = useState('');
  useEffect(() => {
    void api<StoreProduct[]>('/store').then(setProducts);
  }, []);
  const buy = async (cosmeticId: string) => {
    setPending(cosmeticId);
    setNotice('');
    try {
      const result = await api<StorePurchaseResult>('/store/purchase', 'POST', { cosmeticId });
      onBalance(result.balance);
      setProducts((current) =>
        current.map((product) => (product.cosmeticId === cosmeticId ? result.product : product)),
      );
      platform.haptic();
      setNotice(language === 'ru' ? 'Покупка завершена' : 'Purchase complete');
    } catch (error) {
      setNotice(
        error instanceof Error && error.message === 'INSUFFICIENT_COINS'
          ? language === 'ru'
            ? 'Недостаточно монет'
            : 'Insufficient Coins'
          : language === 'ru'
            ? 'Не удалось купить'
            : 'Purchase failed',
      );
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
      <h2 className="section-label">{language === 'ru' ? 'Рамки' : 'Frames'}</h2>
      <div className="cosmetic-grid">
        {products.map((product) => (
          <article className="cosmetic-card glass" key={product.cosmeticId}>
            <span
              className={`cosmetic-preview ${resolveProfileFrame(product.cosmeticId).className}`}
            >
              UG
            </span>
            <div>
              <h3>{language === 'ru' ? 'Бронзовая рамка' : 'Bronze Frame'}</h3>
              <small>
                {product.priceCoins} {language === 'ru' ? 'Монет' : 'Coins'}
              </small>
            </div>
            <button
              disabled={product.owned || pending !== null}
              onClick={() => void buy(product.cosmeticId)}
            >
              {product.owned
                ? language === 'ru'
                  ? 'Куплено'
                  : 'Owned'
                : pending === product.cosmeticId
                  ? '…'
                  : language === 'ru'
                    ? 'Купить'
                    : 'Buy'}
            </button>
          </article>
        ))}
      </div>
      {notice && (
        <p className="commerce-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
