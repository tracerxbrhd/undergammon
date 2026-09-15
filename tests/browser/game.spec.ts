import { test, expect, type BrowserContext } from '@playwright/test';
import { createHmac } from 'node:crypto';
async function telegram(
  context: BrowserContext,
  id: number,
  contentSafeTop = 0,
  stableViewportHeight?: number,
) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id, language_code: 'en' }),
  });
  const data = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData')
    .update('123456:testing-token-no-real-secret')
    .digest();
  params.set('hash', createHmac('sha256', secret).update(data).digest('hex'));
  await context.route('https://telegram.org/**', (route) => route.abort());
  await context.addInitScript(
    ({ raw, contentSafeTop, stableViewportHeight }) => {
      const listeners = new Map<string, Set<() => void>>();
      Object.assign(window, {
        Telegram: {
          WebApp: {
            initData: raw,
            viewportStableHeight: stableViewportHeight ?? window.innerHeight,
            safeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 },
            contentSafeAreaInset: { top: contentSafeTop, right: 0, bottom: 0, left: 0 },
            ready() {},
            expand() {},
            openTelegramLink() {},
            onEvent(event: string, listener: () => void) {
              const eventListeners = listeners.get(event) ?? new Set();
              eventListeners.add(listener);
              listeners.set(event, eventListeners);
            },
            offEvent(event: string, listener: () => void) {
              listeners.get(event)?.delete(listener);
            },
            emit(event: string) {
              listeners.get(event)?.forEach((listener) => listener());
            },
          },
        },
      });
    },
    { raw: params.toString(), contentSafeTop, stableViewportHeight },
  );
}
test('public landing is responsive and provides Telegram entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Open in Telegram/ })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.screenshot({ path: 'test-results/landing.png', fullPage: true });
});
test('app shell follows Telegram content safe-area changes', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(context, Date.now(), 36);
  const page = await context.newPage();
  await page.goto('/');
  const header = page.locator('.app-shell > header');
  await expect(header).toBeVisible();
  await expect.poll(async () => (await header.boundingBox())?.y).toBe(88);

  await page.evaluate(() => {
    const webApp = (
      window as typeof window & {
        Telegram: {
          WebApp: {
            contentSafeAreaInset: { top: number };
            emit(event: string): void;
          };
        };
      }
    ).Telegram.WebApp;
    webApp.contentSafeAreaInset.top = 96;
    webApp.emit('contentSafeAreaChanged');
  });
  await expect.poll(async () => (await header.boundingBox())?.y).toBe(112);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.screenshot({ path: 'test-results/app-shell-safe-area.png', fullPage: true });
  await context.close();
});
test('daily reward completes from the compact Home affordance', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(context, Date.now());
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('button.primary', { hasText: 'Find a player' })).toBeVisible();
  const reward = page.getByRole('button', { name: 'Daily Reward available' });
  await expect(reward).toBeVisible();
  await reward.click();

  const sheet = page.getByRole('dialog', { name: 'Daily Reward' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.reward-step')).toHaveCount(7);
  await expect(sheet.locator('.reward-step.current')).toHaveCount(1);
  await expect(sheet.getByText('Day 7')).toBeVisible();

  const coinsBefore = Number(await page.locator('.identity-copy p b').textContent());
  const claim = sheet.getByRole('button', { name: /Claim 5 Coins/ });
  await page.route('**/api/daily-reward/claim', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  const click = claim.click();
  await expect(sheet.locator('.reward-claim')).toBeDisabled();
  await click;
  await expect(sheet.getByRole('status')).toHaveText('✓ +5 Coins');
  await expect(page.locator('.identity-copy p b')).toHaveText(String(coinsBefore + 5));
  await sheet.getByRole('button', { name: 'Close' }).click();

  const claimed = page.getByRole('button', { name: /Today's reward claimed/ });
  await expect(claimed).toBeDisabled();
  await expect(page.locator('.reward-countdown')).toHaveText(/^\d{2}:\d{2}$/);
  await claimed.click({ force: true });
  await expect(page.getByRole('dialog', { name: 'Daily Reward' })).toHaveCount(0);
  await context.close();
});
test('daily reward revalidates stale claims and countdown expiry with the server', async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(context, Date.now());
  const page = await context.newPage();
  const rewards = [5, 5, 10, 10, 15, 20, 35].map((coins, index) => ({
    day: index + 1,
    coins,
  }));
  const nextClaimAt = new Date(Date.now() + 500).toISOString();
  let statusRequests = 0;
  await page.route('**/api/daily-reward', async (route) => {
    statusRequests += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        statusRequests === 1
          ? {
              rewards,
              currentDay: 1,
              claimedToday: false,
              lastClaimDate: null,
              nextClaimAt: null,
            }
          : {
              rewards,
              currentDay: 1,
              claimedToday: true,
              lastClaimDate: '2026-09-15',
              nextClaimAt,
            },
      ),
    });
  });
  await page.route('**/api/daily-reward/claim', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'DAILY_REWARD_ALREADY_CLAIMED' }),
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Daily Reward available' }).click();
  await page
    .getByRole('dialog', { name: 'Daily Reward' })
    .getByRole('button', { name: /Claim/ })
    .click();
  await expect(page.getByRole('button', { name: /Today's reward claimed/ })).toBeDisabled();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect.poll(() => statusRequests).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole('button', { name: /Today's reward claimed/ })).toBeDisabled();
  await context.close();
});
test('player buys, equips, and removes a permanent profile frame', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(context, 900000001);
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('button.primary', { hasText: 'Find a player' })).toBeVisible();
  const me = await page.evaluate(async () => {
    const response = await fetch('/api/me');
    if (!response.ok)
      throw new Error(`Could not load /api/me: ${response.status} ${await response.text()}`);
    return (await response.json()) as { id: string };
  });
  expect(me.id).toBeTruthy();
  await page.evaluate(async (accountId) => {
    const response = await fetch('/api/admin/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationId: crypto.randomUUID(),
        target: accountId,
        action: 'COINS',
        reason: 'Cosmetics E2E seed',
        value: 200,
      }),
    });
    if (!response.ok)
      throw new Error(`Could not seed Coins: ${response.status} ${await response.text()}`);
  }, me.id);
  await page.reload();

  const navigation = page.getByRole('navigation', { name: 'Primary' });
  await expect(navigation.getByRole('button')).toHaveText([
    'Store',
    'Cosmetics',
    'Play',
    'Rankings',
    'Profile',
  ]);
  await expect(navigation.locator('.ui-icon')).toHaveCount(5);
  await navigation.getByRole('button', { name: /Store/ }).click();
  await expect(page.getByRole('heading', { name: 'Store' })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  const storeBalance = page.locator('.commerce-title > strong');
  await expect(storeBalance).toHaveText('200 Coins');
  await expect(page.getByText('150 Coins', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Buy' }).click();
  await expect(page.getByRole('button', { name: 'Owned' })).toBeDisabled();
  await expect(storeBalance).toHaveText('50 Coins');

  await navigation.getByRole('button', { name: /Cosmetics/ }).click();
  const bronzeFrame = page.locator('.cosmetic-card', { hasText: 'Bronze Frame' });
  await expect(bronzeFrame).toBeVisible();
  await bronzeFrame.getByRole('button', { name: 'Equip', exact: true }).click();
  const equippedBronze = bronzeFrame.getByRole('button', { name: 'Equipped', exact: true });
  await expect(equippedBronze).toBeDisabled();
  await navigation.getByRole('button', { name: /Profile/ }).click();
  await expect(page.locator('.profile-avatar')).toHaveClass(/profile-frame-bronze/);

  await navigation.getByRole('button', { name: /Cosmetics/ }).click();
  const defaultFrame = page.locator('.cosmetic-card', { hasText: 'Default' });
  await defaultFrame.getByRole('button', { name: 'Equip', exact: true }).click();
  await navigation.getByRole('button', { name: /Profile/ }).click();
  await expect(page.locator('.profile-avatar')).not.toHaveClass(/profile-frame-bronze/);
  await page.screenshot({ path: 'test-results/cosmetics-profile-default.png', fullPage: true });
  await context.close();
});
for (const ruleset of ['LONG_NARDY', 'BACKGAMMON'])
  test(`two authenticated players play and reconnect in a shorter stable viewport: ${ruleset}`, async ({
    browser,
  }) => {
    test.setTimeout(60000);
    const a = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const b = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const seed = Date.now();
    await telegram(a, seed, 36, 760);
    await telegram(b, seed + 1, 36, 760);
    const pa = await a.newPage(),
      pb = await b.newPage();
    const primaryFind = (page: typeof pa) =>
      page.locator('button.primary', { hasText: 'Find a player' });
    await Promise.all([pa.goto('/'), pb.goto('/')]);
    await expect(primaryFind(pa)).toBeVisible();
    const rulesetName = ruleset === 'LONG_NARDY' ? 'Long Nardy' : 'Backgammon';
    await pa.getByRole('button', { name: rulesetName, exact: true }).click();
    await pb.getByRole('button', { name: rulesetName, exact: true }).click();
    await primaryFind(pa).click();
    await primaryFind(pb).click();
    await expect(pa.locator('.board')).toBeVisible({ timeout: 15000 });
    await expect(pb.locator('.board')).toBeVisible({ timeout: 15000 });
    const gameScreen = pa.locator('.game-screen');
    await expect
      .poll(async () => await gameScreen.evaluate((element) => element.offsetTop))
      .toBe(84);
    await expect.poll(async () => (await gameScreen.boundingBox())?.height).toBe(760);
    await expect
      .poll(async () => (await gameScreen.locator('.player-strip').first().boundingBox())?.y)
      .toBe(164);
    await expect.poll(async () => (await gameScreen.boundingBox())?.y).toBe(84);
    await expect
      .poll(async () => {
        const box = await gameScreen.boundingBox();
        return box ? box.y + box.height : undefined;
      })
      .toBe(844);
    await expect
      .poll(async () => pa.evaluate(() => document.documentElement.scrollHeight))
      .toBe(844);
    await expect(pa.locator('body')).toHaveJSProperty('scrollWidth', 390);
    await pa.screenshot({ path: `test-results/game-${ruleset}.png`, fullPage: true });
    await expect
      .poll(
        async () =>
          (await pa.locator('.point.source').count()) + (await pb.locator('.point.source').count()),
      )
      .toBeGreaterThan(0);
    const active = (await pa.locator('.point.source').count()) ? pa : pb;
    for (let i = 0; i < 4; i++) {
      if (await active.getByRole('button', { name: 'Confirm turn' }).isEnabled()) break;
      await active.locator('.point.source').first().click();
      const target = active.locator('.point.destination').first();
      if (await target.count()) await target.click();
      else await active.getByRole('button', { name: /Bear off/ }).click();
    }
    await expect(active.getByRole('button', { name: 'Confirm turn' })).toBeEnabled();
    await active.getByRole('button', { name: 'Confirm turn' }).click();
    await expect
      .poll(
        async () =>
          (await pa.getByRole('button', { name: 'Roll dice' }).count()) +
          (await pb.getByRole('button', { name: 'Roll dice' }).count()),
      )
      .toBeGreaterThan(0);
    await expect(active.locator('.error')).toHaveCount(0);
    await pa.reload();
    await pa.getByRole('button', { name: 'Return to game' }).click();
    await expect(pa.locator('.board')).toBeVisible({ timeout: 15000 });
    await pa.getByRole('button', { name: 'Match menu' }).click();
    await pa.getByRole('button', { name: 'Surrender', exact: true }).click();
    await pa
      .getByRole('dialog', { name: 'Surrender' })
      .getByRole('button', { name: 'Surrender' })
      .click();
    await expect(pa.getByRole('heading', { name: 'You lost' })).toBeVisible();
    await expect(pb.getByRole('heading', { name: 'You won' })).toBeVisible();
    await pa.locator('.result-sheet').getByRole('button', { name: 'Play', exact: true }).click();
    await pa
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('button', { name: /Profile/ })
      .click();
    await expect(pa.locator('.profile-avatar.profile-frame-season0-tester')).toBeVisible();
    if (ruleset === 'LONG_NARDY')
      await pa.screenshot({
        path: 'test-results/season0-tester-profile-frame.png',
        fullPage: true,
      });
    await a.close();
    await b.close();
  });
