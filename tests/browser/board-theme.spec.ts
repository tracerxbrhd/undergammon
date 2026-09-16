import { test, expect, type BrowserContext } from '@playwright/test';
import { createHmac } from 'node:crypto';

interface MatchPlayerSnapshot {
  accountId: string;
  cosmetics?: { boardTheme?: string };
}

interface MatchSnapshotShape {
  id: string;
  players: Record<'A' | 'B', MatchPlayerSnapshot>;
}

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

test('Midnight Board persists and is captured in a new match snapshot', async ({ browser }) => {
  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const opponentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(adminContext, 900000001, '198.51.100.20');
  await telegram(ownerContext, 920000001, '198.51.100.21');
  await telegram(opponentContext, 920000002, '198.51.100.22');

  const adminPage = await adminContext.newPage();
  const ownerPage = await ownerContext.newPage();
  const opponentPage = await opponentContext.newPage();

  try {
    await Promise.all([adminPage.goto('/'), ownerPage.goto('/'), opponentPage.goto('/')]);
    await expect(ownerPage.locator('button.primary', { hasText: 'Find a player' })).toBeVisible();

    const owner = await ownerPage.evaluate(async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error(`Could not load /api/me: ${response.status}`);
      return (await response.json()) as { id: string };
    });
    const opponent = await opponentPage.evaluate(async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error(`Could not load opponent /api/me: ${response.status}`);
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
          reason: 'Board Theme E2E seed',
          value: 350,
        }),
      });
      if (!response.ok) throw new Error(`Could not seed Coins: ${response.status}`);
    }, owner.id);
    await ownerPage.reload();

    const navigation = ownerPage.getByRole('navigation', { name: 'Primary' });
    await navigation.getByRole('button', { name: /Store/ }).click();
    const storeBalance = ownerPage.locator('.commerce-title > strong');
    await expect(storeBalance).toHaveText('350 Coins');

    const midnightProduct = ownerPage.locator('.cosmetic-card', { hasText: 'Midnight Board' });
    await expect(midnightProduct).toBeVisible();
    await expect(midnightProduct.getByText('300 Coins', { exact: true })).toBeVisible();
    await midnightProduct.getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(
      midnightProduct.getByRole('button', { name: 'Owned', exact: true }),
    ).toBeDisabled();
    await expect(storeBalance).toHaveText('50 Coins');

    await navigation.getByRole('button', { name: /Cosmetics/ }).click();
    const midnightOwned = ownerPage.locator('.cosmetic-card', { hasText: 'Midnight Board' });
    await expect(midnightOwned).toBeVisible();
    await midnightOwned.getByRole('button', { name: 'Equip', exact: true }).click();
    await expect(
      midnightOwned.getByRole('button', { name: 'Equipped', exact: true }),
    ).toBeDisabled();

    await ownerPage.reload();
    const persisted = await ownerPage.evaluate(async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error(`Could not reload /api/me: ${response.status}`);
      return (await response.json()) as { cosmetics: { boardTheme?: string } };
    });
    expect(persisted.cosmetics.boardTheme).toBe('midnight_board');

    const challenge = await ownerPage.evaluate(async () => {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleset: 'BACKGAMMON' }),
      });
      if (!response.ok) throw new Error(`Could not create challenge: ${response.status}`);
      return (await response.json()) as { token: string };
    });
    const snapshot = await opponentPage.evaluate(async (token) => {
      const response = await fetch(`/api/challenges/${token}/accept`, { method: 'POST' });
      if (!response.ok) throw new Error(`Could not accept challenge: ${response.status}`);
      return (await response.json()) as MatchSnapshotShape;
    }, challenge.token);

    const ownerMatchPlayer = Object.values(snapshot.players).find(
      (player) => player.accountId === owner.id,
    );
    const opponentMatchPlayer = Object.values(snapshot.players).find(
      (player) => player.accountId === opponent.id,
    );
    expect(ownerMatchPlayer?.cosmetics?.boardTheme).toBe('midnight_board');
    expect(opponentMatchPlayer?.cosmetics?.boardTheme).toBeUndefined();

    const reloadedSnapshot = await ownerPage.evaluate(async (matchId) => {
      const response = await fetch(`/api/matches/${matchId}`);
      if (!response.ok) throw new Error(`Could not reload match: ${response.status}`);
      return (await response.json()) as MatchSnapshotShape;
    }, snapshot.id);
    const reloadedOwner = Object.values(reloadedSnapshot.players).find(
      (player) => player.accountId === owner.id,
    );
    expect(reloadedOwner?.cosmetics?.boardTheme).toBe('midnight_board');
  } finally {
    await Promise.allSettled([adminContext.close(), ownerContext.close(), opponentContext.close()]);
  }
});
