import { test, expect, type BrowserContext, type Page } from '@playwright/test';
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

async function enterActiveMatch(page: Page) {
  await page.reload();
  const board = page.locator('.board');
  const resume = page.getByRole('button', { name: 'Return to game' });
  await expect
    .poll(
      async () => {
        if (await board.isVisible()) return true;
        if (await resume.isVisible()) {
          await resume.click({ force: true, timeout: 500 }).catch(() => undefined);
        }
        return board.isVisible();
      },
      { timeout: 15000, intervals: [100, 250, 500] },
    )
    .toBe(true);
}

test('session takeover transfers authoritative control between devices', async ({ browser }) => {
  test.setTimeout(90000);
  const firstContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const secondContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const opponentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(firstContext, 950000001, '198.51.100.41');
  await telegram(secondContext, 950000001, '198.51.100.42');
  await telegram(opponentContext, 950000002, '198.51.100.43');

  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  const opponent = await opponentContext.newPage();

  try {
    await Promise.all([first.goto('/'), opponent.goto('/')]);
    await expect(first.locator('button.primary', { hasText: 'Find a player' })).toBeVisible();
    await expect(opponent.locator('button.primary', { hasText: 'Find a player' })).toBeVisible();

    const challenge = await first.evaluate(async () => {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleset: 'BACKGAMMON' }),
      });
      if (!response.ok) throw new Error(`Could not create challenge: ${response.status}`);
      return (await response.json()) as { token: string };
    });
    await opponent.evaluate(async (token) => {
      const response = await fetch(`/api/challenges/${token}/accept`, { method: 'POST' });
      if (!response.ok) throw new Error(`Could not accept challenge: ${response.status}`);
    }, challenge.token);

    await Promise.all([enterActiveMatch(first), enterActiveMatch(opponent)]);
    await expect(first.locator('.control-overlay')).toHaveCount(0);

    await second.goto('/');
    await enterActiveMatch(second);

    const firstControl = first.locator('.control-overlay');
    await expect(firstControl).toBeVisible({ timeout: 15000 });
    await expect(firstControl).toContainText('Game continued on another device');
    const takeover = firstControl.getByRole('button', { name: 'Continue on this device' });
    await expect(takeover).toBeEnabled();

    await takeover.click();
    await expect(firstControl).toHaveCount(0, { timeout: 15000 });
    await expect(first.locator('.action-dock')).toBeVisible();

    const secondControl = second.locator('.control-overlay');
    await expect(secondControl).toBeVisible({ timeout: 15000 });
    await expect(secondControl).toContainText('Game continued on another device');

    await first.getByRole('button', { name: 'Match menu' }).click();
    await first.getByRole('button', { name: 'Surrender', exact: true }).click();
    await first
      .getByRole('dialog', { name: 'Surrender' })
      .getByRole('button', { name: 'Surrender' })
      .click();
    await expect(first.getByRole('heading', { name: 'You lost' })).toBeVisible({ timeout: 15000 });
  } finally {
    await Promise.allSettled([
      firstContext.close(),
      secondContext.close(),
      opponentContext.close(),
    ]);
  }
});
