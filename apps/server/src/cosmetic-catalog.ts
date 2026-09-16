import type { CosmeticId, CosmeticSlot } from '@undergammon/protocol';

export interface CosmeticDefinition {
  readonly id: CosmeticId;
  readonly slot: CosmeticSlot;
  readonly priceCoins?: number;
  readonly purchasable: boolean;
}

export type PurchasableCosmeticDefinition = CosmeticDefinition & { readonly priceCoins: number };

export const cosmeticDefinitions: readonly CosmeticDefinition[] = [
  { id: 'default', slot: 'PROFILE_FRAME', purchasable: false },
  { id: 'season0_tester_frame', slot: 'PROFILE_FRAME', purchasable: false },
  {
    id: 'bronze_profile_frame',
    slot: 'PROFILE_FRAME',
    priceCoins: 150,
    purchasable: true,
  },
  { id: 'default', slot: 'CHECKER_SET', purchasable: false },
  {
    id: 'marble_checker_set',
    slot: 'CHECKER_SET',
    priceCoins: 200,
    purchasable: true,
  },
  { id: 'default', slot: 'DICE_SKIN', purchasable: false },
  {
    id: 'obsidian_dice',
    slot: 'DICE_SKIN',
    priceCoins: 250,
    purchasable: true,
  },
  { id: 'default', slot: 'BOARD_THEME', purchasable: false },
  {
    id: 'midnight_board',
    slot: 'BOARD_THEME',
    priceCoins: 300,
    purchasable: true,
  },
];

export const purchasableCosmetics: readonly PurchasableCosmeticDefinition[] =
  cosmeticDefinitions.filter(
    (item): item is PurchasableCosmeticDefinition =>
      item.purchasable && item.priceCoins !== undefined,
  );

export function cosmeticKey(slot: CosmeticSlot, cosmeticId: string): string {
  return `${slot}:${cosmeticId}`;
}

export function cosmeticDefinition(slot: CosmeticSlot, cosmeticId: string) {
  return cosmeticDefinitions.find((item) => item.slot === slot && item.id === cosmeticId);
}

export function purchasableCosmeticDefinition(slot: CosmeticSlot, cosmeticId: string) {
  return purchasableCosmetics.find((item) => item.slot === slot && item.id === cosmeticId);
}

/** Compatibility path for a cached pre-PR2 client that did not send a slot. */
export function legacyPurchasableCosmeticDefinition(cosmeticId: string) {
  const matches = purchasableCosmetics.filter((item) => item.id === cosmeticId);
  if (matches.length > 1) throw new Error('COSMETIC_SLOT_REQUIRED');
  return matches[0];
}
