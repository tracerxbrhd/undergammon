import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';

interface ErrorBody {
  code?: string;
}

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

async function cancelQueue(page: Page) {
  await page
    .evaluate(async () => {
      await fetch('/api/queue', { method: 'DELETE' });
    })
    .catch(() => undefined);
}

async function noContest(adminPage: Page, matchId: string) {
  const result = await adminPage.evaluate(async (id) => {
    const response = await fetch('/api/admin/no-contest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: id, reason: 'Dice Skin E2E cleanup' }),
    });
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    return { ok: response.ok, status: response.status, code: body?.code };
  }, matchId);
  if (!result.ok && result.code !== 'MATCH_ALREADY_FINISHED') {
    throw new Error(`Could not clean up E2E match: ${result.status} ${result.code ?? ''}`);
  }
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
  let matchId: string | null = null;
  let matchCleaned = false;

  try {
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

    const active = await ownerPage.evaluate(async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error(`Could not reload /api/me: ${response.status}`);
      return (await response.json()) as { activeMatchId: string | null };
    });
    expect(active.activeMatchId).toBeTruthy();
    matchId = active.activeMatchId;

    await expect(ownerPage.locator('.die')).toHaveCount(2);
    await expect(opponentPage.locator('.die')).toHaveCount(2);
    await expect(ownerPage.locator('.die').nth(0)).toHaveClass(/dice-skin-obsidian/);
    await expect(ownerPage.locator('.die').nth(1)).toHaveClass(/dice-skin-default/);
    await expect(opponentPage.locator('.die').nth(0)).toHaveClass(/dice-skin-default/);
    await expect(opponentPage.locator('.die').nth(1)).toHaveClass(/dice-skin-obsidian/);

    if (!matchId) throw new Error('Missing active match id for Dice Skin E2E cleanup');
    await noContest(adminPage, matchId);
    matchCleaned = true;
  } finally {
    if (matchId && !matchCleaned) {
      await noContest(adminPage, matchId).catch(() => undefined);
    }
    await Promise.all([cancelQueue(ownerPage), cancelQueue(opponentPage)]);
    await Promise.allSettled([
      adminContext.close(),
      ownerContext.close(),
      opponentContext.close(),
    ]);
  }
});
