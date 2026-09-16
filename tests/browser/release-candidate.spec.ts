import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';

interface EquippedCosmeticsShape {
  profileFrame: string;
  checkerSet?: string;
  diceSkin?: string;
  boardTheme?: string;
  reactionPack?: string;
}

interface MatchPlayerSnapshot {
  accountId: string;
  cosmetics?: EquippedCosmeticsShape;
}

interface MatchSnapshotShape {
  id: string;
  players: Record<'A' | 'B', MatchPlayerSnapshot>;
}

const products = [
  { name: 'Bronze Frame', slot: 'PROFILE_FRAME', id: 'bronze_profile_frame' },
  { name: 'Marble Checkers', slot: 'CHECKER_SET', id: 'marble_checker_set' },
  { name: 'Obsidian Dice', slot: 'DICE_SKIN', id: 'obsidian_dice' },
  { name: 'Midnight Board', slot: 'BOARD_THEME', id: 'midnight_board' },
  { name: 'Neon Reactions', slot: 'REACTION_PACK', id: 'neon_reactions' },
] as const;

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

async function expectCompactLayout(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.body.scrollWidth <= window.innerWidth))
    .toBe(true);
  const cardsFit = await page.locator('.cosmetic-card').evaluateAll((cards) =>
    cards.every((card) => {
      const rect = card.getBoundingClientRect();
      return rect.left >= -1 && rect.right <= window.innerWidth + 1;
    }),
  );
  expect(cardsFit).toBe(true);
}

test('Update 2 release candidate flow holds on a compact Telegram viewport', async ({ browser }) => {
  test.setTimeout(90000);
  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ownerContext = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const opponentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await telegram(adminContext, 900000001, '198.51.100.51');
  await telegram(ownerContext, 970000001, '198.51.100.52');
  await telegram(opponentContext, 970000002, '198.51.100.53');

  const adminPage = await adminContext.newPage();
  const ownerPage = await ownerContext.newPage();
  const opponentPage = await opponentContext.newPage();

  try {
    await Promise.all([adminPage.goto('/'), ownerPage.goto('/'), opponentPage.goto('/')]);
    await expect(ownerPage.locator('button.primary', { hasText: 'Find a player' })).toBeVisible();

    const owner = await ownerPage.evaluate(async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error(`Could not load owner /api/me: ${response.status}`);
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
          reason: 'Update 2 RC E2E seed',
          value: 1300,
        }),
      });
      if (!response.ok) throw new Error(`Could not seed Coins: ${response.status}`);
    }, owner.id);
    await ownerPage.reload();

    const navigation = ownerPage.getByRole('navigation', { name: 'Primary' });
    await navigation.getByRole('button', { name: /Store/ }).click();
    await expect(ownerPage.getByRole('heading', { name: 'Store' })).toBeVisible();
    await expectCompactLayout(ownerPage);

    for (const product of products) {
      const card = ownerPage.locator('.cosmetic-card', { hasText: product.name });
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: 'Buy', exact: true }).click();
      await expect(card.getByRole('button', { name: 'Owned', exact: true })).toBeDisabled();
    }
    await expect(ownerPage.locator('.commerce-title > strong')).toHaveText('50 Coins');
    await expectCompactLayout(ownerPage);

    await navigation.getByRole('button', { name: /Cosmetics/ }).click();
    await expect(ownerPage.getByRole('heading', { name: 'Cosmetics' })).toBeVisible();
    for (const product of products) {
      const card = ownerPage.locator('.cosmetic-card', { hasText: product.name });
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: 'Equip', exact: true }).click();
      await expect(card.getByRole('button', { name: 'Equipped', exact: true })).toBeDisabled();
    }
    await expectCompactLayout(ownerPage);

    await ownerPage.reload();
    const persisted = await ownerPage.evaluate(async () => {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error(`Could not reload owner /api/me: ${response.status}`);
      return (await response.json()) as { cosmetics: EquippedCosmeticsShape };
    });
    expect(persisted.cosmetics).toMatchObject({
      profileFrame: 'bronze_profile_frame',
      checkerSet: 'marble_checker_set',
      diceSkin: 'obsidian_dice',
      boardTheme: 'midnight_board',
      reactionPack: 'neon_reactions',
    });

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
    expect(ownerMatchPlayer?.cosmetics).toMatchObject(persisted.cosmetics);
    expect(opponentMatchPlayer?.cosmetics?.profileFrame ?? 'default').toBe('default');

    await Promise.all([enterActiveMatch(ownerPage), enterActiveMatch(opponentPage)]);
    await expect
      .poll(() => ownerPage.evaluate(() => document.body.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect(ownerPage.locator('.board-scene')).toHaveAttribute(
      'data-local-board-theme',
      'midnight_board',
    );
    await expect(ownerPage.locator('.player-strip.profile-frame-bronze')).toHaveCount(1);
    await expect(ownerPage.locator('.checker.own.checker-set-marble').first()).toBeVisible();

    await ownerPage.getByRole('button', { name: 'Reactions' }).click();
    const neonPicker = ownerPage.locator('.reaction-picker.reaction-pack-neon');
    await expect(neonPicker).toBeVisible();
    await neonPicker.getByRole('button', { name: 'HI!', exact: true }).click();
    await expect(opponentPage.locator('.reaction.reaction-pack-neon')).toHaveText('HI!');

    await ownerPage.getByRole('button', { name: 'Match menu' }).click();
    await ownerPage.getByRole('button', { name: 'Surrender', exact: true }).click();
    await ownerPage
      .getByRole('dialog', { name: 'Surrender' })
      .getByRole('button', { name: 'Surrender' })
      .click();
    await expect(ownerPage.getByRole('heading', { name: 'You lost' })).toBeVisible({
      timeout: 15000,
    });

    const historyContainsMatch = await ownerPage.evaluate(async (matchId) => {
      const response = await fetch('/api/history');
      if (!response.ok) throw new Error(`Could not load history: ${response.status}`);
      const history = (await response.json()) as { id: string }[];
      return history.some((entry) => entry.id === matchId);
    }, snapshot.id);
    expect(historyContainsMatch).toBe(true);
  } finally {
    await Promise.allSettled([adminContext.close(), ownerContext.close(), opponentContext.close()]);
  }
});
