from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"expected text not found in {path}: {old[:160]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


replace(
    "apps/server/src/app.ts",
    "  app.get('/api/store', async (req) => storeProducts(pool, await identity(req)));\n",
    """  app.get('/api/store', async (req) => {
    const accountId = await identity(req);
    const query = z.object({ slots: z.string().optional() }).strict().parse(req.query);
    const slots =
      query.slots === undefined
        ? (['PROFILE_FRAME'] as const)
        : z.array(cosmeticSlotSchema).min(1).parse(query.slots.split(','));
    return storeProducts(pool, accountId, slots);
  });
""",
)

replace(
    "apps/server/src/cosmetics.ts",
    """export async function storeProducts(db: Db | pg.Pool, accountId: string): Promise<StoreProduct[]> {
""",
    """export async function storeProducts(
  db: Db | pg.Pool,
  accountId: string,
  slots: readonly CosmeticSlot[] = ['PROFILE_FRAME', 'CHECKER_SET', 'DICE_SKIN'],
): Promise<StoreProduct[]> {
""",
)
replace(
    "apps/server/src/cosmetics.ts",
    """  return purchasableCosmetics.map((item) => ({
    cosmeticId: item.id,
    slot: item.slot,
    priceCoins: item.priceCoins,
    owned: owned.has(cosmeticKey(item.slot, item.id)),
  }));
""",
    """  return purchasableCosmetics
    .filter((item) => slots.includes(item.slot))
    .map((item) => ({
      cosmeticId: item.id,
      slot: item.slot,
      priceCoins: item.priceCoins,
      owned: owned.has(cosmeticKey(item.slot, item.id)),
    }));
""",
)

replace(
    "apps/miniapp/src/Store.tsx",
    """    void api<StoreProduct[]>('/store')
""",
    """    void api<StoreProduct[]>(`/store?slots=${storeSlots.join(',')}`)
""",
)

replace(
    "apps/server/test/integration.test.ts",
    """    expect(await storeProducts(pool, user(0))).toEqual([
      {
        cosmeticId: 'bronze_profile_frame',
        slot: 'PROFILE_FRAME',
        priceCoins: 150,
        owned: false,
      },
      {
        cosmeticId: 'marble_checker_set',
        slot: 'CHECKER_SET',
        priceCoins: 200,
        owned: false,
      },
    ]);

    const purchased = await purchaseCosmetic(pool, user(0), 'bronze_profile_frame');
""",
    """    expect(await storeProducts(pool, user(0))).toEqual([
      {
        cosmeticId: 'bronze_profile_frame',
        slot: 'PROFILE_FRAME',
        priceCoins: 150,
        owned: false,
      },
      {
        cosmeticId: 'marble_checker_set',
        slot: 'CHECKER_SET',
        priceCoins: 200,
        owned: false,
      },
    ]);
    expect(await storeProducts(pool, user(0), ['PROFILE_FRAME'])).toEqual([
      {
        cosmeticId: 'bronze_profile_frame',
        slot: 'PROFILE_FRAME',
        priceCoins: 150,
        owned: false,
      },
    ]);

    const purchased = await purchaseCosmetic(pool, user(0), 'bronze_profile_frame');
""",
)

print("PR 2 rollout compatibility patches applied")
