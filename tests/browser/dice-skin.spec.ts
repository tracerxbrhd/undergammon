import { test, expect, type BrowserContext } from '@playwright/test';
import { createHmac } from 'node:crypto';

async function telegram(context: BrowserContext, id: number) {
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

test('Obsidian Dice purchase, equip, and owner-aware match presentation', async ({ browser }) => {
  test.setTimeout(60000);
  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const opponentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(adminContext, 900000001);
  await telegram(ownerContext, 910000001);
  await telegram(opponentContext, 910000002);

  const adminPage = await adminContext.newPage();
  const ownerPage = await ownerContext.newPage();
  const opponentPage = await opponentContext.newPage();
  await Promise.all([adminPage.goto('/'), ownerPage.goto('/'), opponentPage.goto('/')]);
  await expect(ownerPage.locator('button.primary', { hasText: 'Find a player' })).toBeVisible();
  await expect(opponentPage.locator('button.primary', { hasText: 'Find a player' })).toBeVisible();

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

  const ownerNavigation = ownerPage.getByRole('navigation', { name: 'Primary' });
  await ownerNavigation.getByRole('button', { name: /Store/ }).click();
  const obsidianProduct = ownerPage.locator('.cosmetic-card', { hasText: 'Obsidian Dice' });
  await expect(obsidianProduct).toBeVisible();
  await expect(obsidianProduct.getByText('250 Coins', { exact: true })).toBeVisible();
  await obsidianProduct.getByRole('button', { name: 'Buy', exact: true }).click();
  await expect(obsidianProduct.getByRole('button', { name: 'Owned', exact: true })).toBeDisabled();

  await ownerNavigation.getByRole('button', { name: /Cosmetics/ }).click();
  const obsidianOwned = ownerPage.locator('.cosmetic-card', { hasText: 'Obsidian Dice' });
  await obsidianOwned.getByRole('button', { name: 'Equip', exact: true }).click();
  await expect(obsidianOwned.getByRole('button', { name: 'Equipped', exact: true })).toBeDisabled();

  await ownerNavigation.getByRole('button', { name: /Play/ }).click();
  await Promise.all([
    ownerPage.locator('button.primary', { hasText: 'Find a player' }).click(),
    opponentPage.locator('button.primary', { hasText: 'Find a player' }).click(),
  ]);
  await expect(ownerPage.locator('.board')).toBeVisible({ timeout: 15000 });
  await expect(opponentPage.locator('.board')).toBeVisible({ timeout: 15000 });
  await expect(ownerPage.locator('.die')).toHaveCount(2);
  await expect(opponentPage.locator('.die')).toHaveCount(2);

  await expect(ownerPage.locator('.die').nth(0)).toHaveClass(/dice-skin-obsidian/);
  await expect(ownerPage.locator('.die').nth(1)).toHaveClass(/dice-skin-default/);
  await expect(opponentPage.locator('.die').nth(0)).toHaveClass(/dice-skin-default/);
  await expect(opponentPage.locator('.die').nth(1)).toHaveClass(/dice-skin-obsidian/);

  await adminContext.close();
  await ownerContext.close();
  await opponentContext.close();
});
