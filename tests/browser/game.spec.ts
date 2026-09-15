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
  await expect.poll(async () => (await header.boundingBox())?.y).toBe(52);

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
    webApp.contentSafeAreaInset.top = 52;
    webApp.emit('contentSafeAreaChanged');
  });
  await expect.poll(async () => (await header.boundingBox())?.y).toBe(68);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.screenshot({ path: 'test-results/app-shell-safe-area.png', fullPage: true });
  await context.close();
});
for (const ruleset of ['LONG_NARDY', 'BACKGAMMON'])
  test(`two authenticated players play and reconnect in a shorter stable viewport: ${ruleset}`, async ({
    browser,
  }) => {
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
      .toBe(128);
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
    await a.close();
    await b.close();
  });
