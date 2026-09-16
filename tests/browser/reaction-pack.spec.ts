import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';

interface MatchPlayerSnapshot {
  accountId: string;
  cosmetics?: { reactionPack?: string };
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

async function enterActiveMatch(page: Page) {
  await page.reload();
  await page.getByRole('button', { name: 'Return to game' }).click();
  await expect(page.locator('.board')).toBeVisible({ timeout: 15000 });
}

test('Neon Reactions persist, snapshot and render from the sender pack', async ({ browser }) => {
  test.setTimeout(60000);
  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const opponentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(adminContext, 900000001, '198.51.100.30');
  await telegram(ownerContext, 930000001, '198.51.100.31');
  await telegram(opponentContext, 930000002, '198.51.100.32');

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
          reason: 'Reaction Pack E2E seed',
          value: 400,
        }),
      });
      if (!response.ok) throw new Error(`Could not seed Coins: ${response.status}`);
    }, owner.id);
    await ownerPage.reload();

    const navigation = ownerPage.getByRole('navigation', { name: 'Primary' });
    await navigation.getByRole('button', { name: /Store/ }).click();
    const storeBalance = ownerPage.locator('.commerce-title > strong');
    await expect(storeBalance).toHaveText('400 Coins');

    const neonProduct = ownerPage.locator('.cosmetic-card', { hasText: 'Neon Reactions' });
    await expect(neonProduct).toBeVisible();
    await expect(neonProduct.getByText('350 Coins', { exact: true })).toBeVisible();
    await neonProduct.getByRole('button', { name: 'Buy', exact: true }).click();
    await expect(neonProduct.getByRole('button', { name: 'Owned', exact: true })).toBeDisabled();
    await expect(storeBalance).toHaveText('50 Coins');

    await navigation.getByRole('button', { name: /Cosmetics/ }).click();
    const neonOwned = ownerPage.locator('.cosmetic-card', { hasText: 'Neon Reactions' });
    await expect(neonOwned).toBeVisible();
    await neonOwned.getByRole('button', { name: 'Equip', exact: true }).click();
    await expect(neonOwned.getByRole('button', { name: 'Equipped', exact: true })).toBeDisabled();

    await ownerPage.reload();
    const persisted = await ownerPage.evaluate(async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error(`Could not reload /api/me: ${response.status}`);
      return (await response.json()) as { cosmetics: { reactionPack?: string } };
    });
    expect(persisted.cosmetics.reactionPack).toBe('neon_reactions');

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
    expect(ownerMatchPlayer?.cosmetics?.reactionPack).toBe('neon_reactions');
    expect(opponentMatchPlayer?.cosmetics?.reactionPack).toBeUndefined();

    await Promise.all([enterActiveMatch(ownerPage), enterActiveMatch(opponentPage)]);
    await ownerPage.getByRole('button', { name: 'Reactions' }).click();
    const neonPicker = ownerPage.locator('.reaction-picker.reaction-pack-neon');
    await expect(neonPicker).toBeVisible();
    await neonPicker.getByRole('button', { name: 'HI!', exact: true }).click();

    const received = opponentPage.locator('.reaction.reaction-pack-neon');
    await expect(received).toHaveText('HI!');
    await expect(received).toBeVisible();
    await expect(received).toHaveCount(0, { timeout: 4000 });
  } finally {
    await Promise.allSettled([adminContext.close(), ownerContext.close(), opponentContext.close()]);
  }
});
