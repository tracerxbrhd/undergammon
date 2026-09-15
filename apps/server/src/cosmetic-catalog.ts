import type { CosmeticSlot, ProfileFrameId } from '@undergammon/protocol';

export interface CosmeticDefinition {
  readonly id: ProfileFrameId;
  readonly slot: CosmeticSlot;
  readonly priceCoins?: number;
  readonly purchasable: boolean;
}

export const cosmeticDefinitions: readonly CosmeticDefinition[] = [
  { id: 'default', slot: 'PROFILE_FRAME', purchasable: false },
  { id: 'season0_tester_frame', slot: 'PROFILE_FRAME', purchasable: false },
  {
    id: 'bronze_profile_frame',
    slot: 'PROFILE_FRAME',
    priceCoins: 150,
    purchasable: true,
  },
];

export const purchasableCosmetics = cosmeticDefinitions.filter(
  (item): item is CosmeticDefinition & { priceCoins: number } =>
    item.purchasable && item.priceCoins !== undefined,
);

export function cosmeticDefinition(id: string) {
  return cosmeticDefinitions.find((item) => item.id === id);
}
