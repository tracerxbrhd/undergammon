from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"expected text not found in {path}: {old[:160]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


# The Store now contains more than one product and Cosmetics more than one Default.
# Keep the existing Profile Frame browser test scoped to the card it actually exercises.
replace(
    "tests/browser/game.spec.ts",
    """  await expect(page.getByText('150 Coins', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Buy' }).click();
  await expect(page.getByRole('button', { name: 'Owned' })).toBeDisabled();
  await expect(storeBalance).toHaveText('50 Coins');
""",
    """  await expect(page.getByText('150 Coins', { exact: true })).toBeVisible();
  const bronzeProduct = page.locator('.cosmetic-card', { hasText: 'Bronze Frame' });
  await bronzeProduct.getByRole('button', { name: 'Buy', exact: true }).click();
  await expect(bronzeProduct.getByRole('button', { name: 'Owned', exact: true })).toBeDisabled();
  await expect(storeBalance).toHaveText('50 Coins');
""",
)
replace(
    "tests/browser/game.spec.ts",
    """  const defaultFrame = page.locator('.cosmetic-card', { hasText: 'Default' });
  await defaultFrame.getByRole('button', { name: 'Equip', exact: true }).click();
""",
    """  const defaultFrame = page.locator('.cosmetic-card', {
    hasText: 'Standard profile appearance.',
  });
  await defaultFrame.getByRole('button', { name: 'Equip', exact: true }).click();
""",
)

# Serialize purchases for one account before checking ownership. This turns a concurrent
# duplicate purchase into the domain error instead of relying on a later unique violation.
replace(
    "apps/server/src/cosmetics.ts",
    """  return transaction(pool, async (db) => {
    const owned = await rows(
      db,
      'SELECT 1 FROM cosmetic_ownership WHERE account_id=$1 AND slot=$2 AND cosmetic_id=$3',
""",
    """  return transaction(pool, async (db) => {
    await db.query('SELECT 1 FROM accounts WHERE id=$1 FOR UPDATE', [accountId]);
    const owned = await rows(
      db,
      'SELECT 1 FROM cosmetic_ownership WHERE account_id=$1 AND slot=$2 AND cosmetic_id=$3',
""",
)

# Economy/product documentation.
replace(
    "docs/product/10-economy-and-cosmetics.md",
    "Accepted product decisions from interview question 10. The Season 0 soft-currency economy, Daily Reward and first Profile Frame Store/equipment vertical slice are now implemented; broader cosmetic categories remain expansion scope.",
    "Accepted product decisions from interview question 10. The Season 0 soft-currency economy, Daily Reward and the multi-slot Profile Frame / Checker Set Store/equipment vertical slice are now implemented; broader cosmetic categories remain expansion scope.",
)
replace(
    "docs/product/10-economy-and-cosmetics.md",
    """Current content/contracts are intentionally narrow:

- functional cosmetic slot: `PROFILE_FRAME`;
- non-purchasable `Default` Profile Frame;
- Season 0 Tester Profile Frame, granted server-side for Season 0 participation;
- Bronze Profile Frame, purchasable for 150 Coins;
- Store purchase does not auto-equip;
- equipment is validated against backend ownership and slot compatibility;
- equipped Profile Frames are exposed through trusted profile/match contracts and rendered on identity surfaces.

Board Themes, Checker Sets, Dice Skins, Reaction Packs and a large cosmetic catalog remain future expansion work even though the Board Scene already has presentation boundaries for those slots.
""",
    """Current content/contracts are intentionally narrow:

- functional cosmetic slots: `PROFILE_FRAME` and `CHECKER_SET`;
- `DICE_SKIN` is reserved in the application contract for the next cosmetic expansion but has only `Default` content;
- non-purchasable `Default` Profile Frame and `Default` Checker Set;
- Season 0 Tester Profile Frame, granted server-side for Season 0 participation;
- Bronze Profile Frame, purchasable for 150 Coins;
- Marble Checker Set, purchasable for 200 Coins;
- Store purchase does not auto-equip;
- equipment is validated against backend ownership and slot compatibility;
- Store ownership, purchase ledger references and equipment use `(slot, cosmeticId)` identity;
- equipped Profile Frames and Checker Sets are exposed through trusted account/match contracts and resolved by owner identity.

Board Themes, non-default Dice Skins, Reaction Packs and a large cosmetic catalog remain future expansion work. The Board Scene already has presentation boundaries for these future slots without requiring gameplay or geometry changes.
""",
)
replace(
    "docs/product/10-economy-and-cosmetics.md",
    "Only Profile Frame is a functional ownership/equipment slot in the current Update 1 application contract/catalog.",
    "Profile Frame and Checker Set are functional ownership/equipment slots. Dice Skin is reserved in the current application contract with `Default` as its only accepted content until its dedicated expansion.",
)
replace(
    "docs/product/10-economy-and-cosmetics.md",
    "A future expanded match presentation combines cosmetics from both participants instead of rendering a fully local-only skin. The existing resolver/BoardScene boundary already preserves owner identity, but non-Profile-Frame slots currently resolve to `Default`.",
    "Match presentation combines owner-scoped cosmetics from both participants instead of treating cosmetics as a fully local-only skin. Profile Frames and Checker Sets resolve from trusted equipment; Board Theme and Dice Skin presentation still use `Default` until their dedicated expansions.",
)
replace(
    "docs/product/10-economy-and-cosmetics.md",
    "- Profile Frame belongs to its owner and is the currently implemented cosmetic presentation.\n- Future avatar/reaction cosmetics remain personalized to their owner and visible to the opponent only where the product contract permits.",
    "- Profile Frame belongs to its owner identity surface, while Checker Set belongs to the owner's physical checkers in a match.\n- Future avatar/reaction cosmetics remain personalized to their owner and visible to the opponent only where the product contract permits.",
)
replace(
    "docs/product/10-economy-and-cosmetics.md",
    "The implemented Store is a simple persistent server-owned catalog. The current purchasable product is the Bronze Profile Frame for 150 Coins.",
    "The implemented Store is a simple persistent server-owned catalog. Current purchasable products are the Bronze Profile Frame for 150 Coins and Marble Checker Set for 200 Coins.",
)
replace(
    "docs/product/10-economy-and-cosmetics.md",
    "As additional functional cosmetic slots are added, the catalog may be grouped into Boards, Checkers, Dice, Frames and Reactions. Those categories must not be documented as current completed Store content before they exist.",
    "The current Store groups implemented content into Profile Frames and Checker Sets. Boards, non-default Dice Skins and Reactions must not be documented as completed Store content before they exist.",
)

# Board Scene cosmetic architecture documentation.
replace(
    "docs/product/22-board-scene-cosmetics-architecture.md",
    "Status: accepted UX/UI v2 architecture baseline; initial resolver/BoardScene integration and trusted Profile Frame presentation are implemented.",
    "Status: accepted UX/UI v2 architecture baseline; resolver/BoardScene integration plus trusted Profile Frame and Checker Set presentation are implemented.",
)
replace(
    "docs/product/22-board-scene-cosmetics-architecture.md",
    "Update 1 has since implemented Store, permanent ownership and equipment for the `PROFILE_FRAME` slot. The same rendering boundary remains important for slots that are not yet functional content: Board Theme, Checker Set, Dice Skin and Reaction Pack currently fall back to `Default`.",
    "Update 1 implemented Store, permanent ownership and equipment for `PROFILE_FRAME`; PR 2 extends the same model to `CHECKER_SET` and reserves `DICE_SKIN` in the application contract. Board Theme, non-default Dice Skin and Reaction Pack content still fall back to `Default`.",
)
replace(
    "docs/product/22-board-scene-cosmetics-architecture.md",
    "The owner-aware Checker Set hooks exist in BoardScene, but current presentation remains `Default` because no functional Checker Set ownership/equipment contract is exposed yet.",
    "The owner-aware Checker Set hooks in BoardScene now consume trusted equipment. `Default` is the fallback and `marble_checker_set` is the first non-default implementation; neither changes checker geometry, stack behavior or hitboxes.",
)
replace(
    "docs/product/22-board-scene-cosmetics-architecture.md",
    "Profile Frame belongs to the owning player identity surface. This is the currently functional cosmetic slot: trusted equipped Profile Frames are resolved for local/opponent identity and are also presented on profile/public-profile surfaces.",
    "Profile Frame belongs to the owning player identity surface, while Checker Set belongs to that player's checkers in a match. Both are functional trusted cosmetic slots; Profile Frames are also presented on profile/public-profile surfaces.",
)
replace(
    "docs/product/22-board-scene-cosmetics-architecture.md",
    """Current implementation status:

- `profile.localFrame` / `profile.opponentFrame`: resolve trusted equipped Profile Frames;
- `board.localTheme` / `board.opponentTheme`: `Default`;
- `checkers.localSet` / `checkers.opponentSet`: `Default`;
- `dice.localSkin` / `dice.opponentSkin`: `Default`;
- `reactions.localPack`: `Default`.
""",
    """Current implementation status:

- `profile.localFrame` / `profile.opponentFrame`: resolve trusted equipped Profile Frames;
- `checkers.localSet` / `checkers.opponentSet`: resolve each owner's trusted Checker Set independently, with `Default` fallback;
- `board.localTheme` / `board.opponentTheme`: `Default`;
- `dice.localSkin` / `dice.opponentSkin`: `Default`;
- `reactions.localPack`: `Default`.
""",
)
replace(
    "docs/product/22-board-scene-cosmetics-architecture.md",
    "Cosmetic ownership/equipment is functional for Profile Frames and the backend is authoritative for what an account owns and has equipped.",
    "Cosmetic ownership/equipment is functional for Profile Frames and Checker Sets, and the backend is authoritative for what an account owns and has equipped.",
)
replace(
    "docs/product/22-board-scene-cosmetics-architecture.md",
    "Match/profile presentation uses server-trusted equipment data. Future Board Theme, Checker Set, Dice Skin or Reaction Pack contracts must preserve the same trust boundary.",
    "Match/profile presentation uses server-trusted equipment data. Future Board Theme, non-default Dice Skin or Reaction Pack contracts must preserve the same trust boundary.",
)
replace(
    "docs/product/22-board-scene-cosmetics-architecture.md",
    """Store screens, Profile Frame purchasing, permanent ownership/equipment persistence and backend ownership tables are no longer future requirements: Update 1 implemented that vertical slice.

This Board Scene architecture still does not require prematurely implementing:

- non-default Board Themes;
- non-default Checker Sets;
- non-default Dice Skins;
""",
    """Store screens, Profile Frame purchasing, permanent ownership/equipment persistence and backend ownership tables are no longer future requirements: Update 1 implemented that vertical slice. PR 2 extends it to Checker Sets without changing Board Scene geometry.

This Board Scene architecture still does not require prematurely implementing:

- non-default Board Themes;
- non-default Dice Skins;
""",
)

# Repository implementation status.
replace(
    "IMPLEMENTATION_STATUS.md",
    "Snapshot: 2026-09-15.",
    "Snapshot: 2026-09-16.",
)
replace(
    "IMPLEMENTATION_STATUS.md",
    """- Store purchase flow with Bronze Profile Frame purchasable for Coins;
- purchase without auto-equip, plus `Store -> purchase -> Cosmetics -> equip -> Profile -> Default` flow;
- Profile/public-profile and match identity presentation of equipped Profile Frames;
""",
    """- Store purchase flow with Bronze Profile Frame and Marble Checker Set purchasable for Coins;
- multi-slot cosmetic identity using `(slot, cosmeticId)` across Store ownership, purchase references and equipment;
- purchase without auto-equip, plus independent Profile Frame / Checker Set equipment and `Default` fallback;
- Profile/public-profile and match identity presentation of equipped Profile Frames;
- owner-aware match presentation of equipped Checker Sets, including different sets for both participants;
""",
)
replace(
    "IMPLEMENTATION_STATUS.md",
    """- Cosmetics are intentionally narrow at the current application/protocol/UI boundary: `PROFILE_FRAME` is the functional slot. Board Themes, Checker Sets, Dice Skins and richer cosmetic categories are not implemented content yet.
- `resolveMatchCosmetics` / `ResolvedMatchCosmetics` and BoardScene owner-aware hooks exist, but Board Theme, Checker Set and Dice Skin resolution currently falls back to `Default`; Profile Frame is the implemented trusted cosmetic presentation.
""",
    """- Cosmetics remain intentionally narrow: `PROFILE_FRAME` and `CHECKER_SET` are functional slots. `DICE_SKIN` is reserved in the application contract but has only `Default`; Board Themes and Reaction Packs are not implemented content yet.
- `resolveMatchCosmetics` / `ResolvedMatchCosmetics` and BoardScene owner-aware hooks resolve trusted Profile Frames and per-owner Checker Sets. Board Theme and Dice Skin presentation currently fall back to `Default`.
""",
)
replace(
    "IMPLEMENTATION_STATUS.md",
    "- broad Board Theme / Checker Set / Dice Skin catalog expansion beyond the current Profile Frame vertical slice.",
    "- broad Board Theme / Dice Skin / Reaction Pack catalog expansion and a larger Checker Set catalog beyond the current focused vertical slice.",
)
replace(
    "IMPLEMENTATION_STATUS.md",
    "There is no known documentation-level reason to treat real Telegram setup, production deployment, Daily Reward, Store, permanent Season 0 cosmetic ownership or the Update 1 cosmetic flow as future release blockers: those capabilities exist and have been exercised in production.",
    "There is no known documentation-level reason to treat real Telegram setup, production deployment, Daily Reward, Store or permanent Season 0 cosmetic ownership as future release blockers. Profile Frame functionality is production-verified; PR 2 adds the multi-slot Checker Set vertical slice pending deployment/real-device verification after merge.",
)

print("PR 2 finalization patches applied")
