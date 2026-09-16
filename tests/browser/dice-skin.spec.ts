import { test, expect, type BrowserContext } from '@playwright/test';
import { createHmac } from 'node:crypto';

async function telegram(context: BrowserContext, id: number, forwardedFor: string) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id, language_code: 'en' }),
  });
  const data = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData')
    .update('123456:testing-token-no-real-secret')
    .digest();
  params.set('hash', createHmac('sha256', secret).update(data).digest('hex'));
  await context.setExtraHTTPHeaders({ 'X-Forwarded-For': forwardedFor });
  await context.route('https://telegram.org/**', (route) => route.abort());
  await context.addInitScript((raw) => {
    Object.assign(window, {
      Telegram: {
        WebApp: {
          initData: raw,
          viewportStableHeight: window.innerHeight,
          safeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 },
          contentSafeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 },
          ready() {},
          expand() {},
          openTelegramLink() {},
          onEvent() {},
          offEvent() {},
        },
      },
    });
  }, params.toString());
}

test('Obsidian Dice purchase and equipment persist through reload', async ({ browser }) => {
  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(adminContext, 900000001, '198.51.100.10');
  await telegram(ownerContext, 910000001, '198.51.100.11');

  const adminPage = await adminContext.newPage();
  const ownerPage = await ownerContext.newPage();

  try {
    await Promise.all([adminPage.goto('/'), ownerPage.goto('/')]);
    await expect(ownerPage.locator('button.primary', { hasText: 'Find a player' })).toBeVisible();

    const owner = await ownerPage.evaluate(async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error(`Could not load /api/me: ${response.status}`);
      return (await response.json()) as { id: string };
    });
    await adminPage.evaluate(async (accountId) => {
      const response = await fetch('/api/admin/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: crypto.randomUUID(),
          target: accountId,
          action: 'COINS',
          reason: 'Dice Skin E2E seed',
          value: 300,
        }),
      });
      if (!response.ok) throw new Error(`Could not seed Coins: ${response.status}`);
    }, owner.id);
    await ownerPage.reload();

    const navigation = ownerPage.getByRole('navigation', { name: 'Primary' });
    await navigation.getByRole('button', { name: /Store/ }).click();
    const storeBalance = ownerPage.locator('.commerce-title > strong');
    await expect(storeBalance).toHaveText('300 Coins');

    const obsidianProduct = ownerPage.locator('.cosmetic-card', { hasText: 'Obsidian Dice' });
    await expect(obsidianProduct).toBeVisible();
    await expect(obsidianProduct.getByText('250 Coins', { exact: true })).toBeVisible();
    await obsidianProduct.getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(
      obsidianProduct.getByRole('button', { name: 'Owned', exact: true }),
    ).toBeDisabled();
    await expect(storeBalance).toHaveText('50 Coins');

    await navigation.getByRole('button', { name: /Cosmetics/ }).click();
    const obsidianOwned = ownerPage.locator('.cosmetic-card', { hasText: 'Obsidian Dice' });
    await expect(obsidianOwned).toBeVisible();
    await obsidianOwned.getByRole('button', { name: 'Equip', exact: true }).click();
    await expect(
      obsidianOwned.getByRole('button', { name: 'Equipped', exact: true }),
    ).toBeDisabled();

    await ownerPage.reload();
    const reloadedNavigation = ownerPage.getByRole('navigation', { name: 'Primary' });
    await reloadedNavigation.getByRole('button', { name: /Cosmetics/ }).click();
    const reloadedObsidian = ownerPage.locator('.cosmetic-card', { hasText: 'Obsidian Dice' });
    await expect(
      reloadedObsidian.getByRole('button', { name: 'Equipped', exact: true }),
    ).toBeDisabled();

    const persisted = await ownerPage.evaluate(async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error(`Could not reload /api/me: ${response.status}`);
      return (await response.json()) as { cosmetics: { diceSkin?: string } };
    });
    expect(persisted.cosmetics.diceSkin).toBe('obsidian_dice');
  } finally {
    await Promise.allSettled([adminContext.close(), ownerContext.close()]);
  }
});
