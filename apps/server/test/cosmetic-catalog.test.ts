import { describe, expect, it } from 'vitest';
import {
  cosmeticDefinition,
  cosmeticKey,
  purchasableCosmeticDefinition,
} from '../src/cosmetic-catalog.js';

describe('cosmetic catalog identity', () => {
  it('scopes repeated cosmetic ids by slot', () => {
    expect(cosmeticDefinition('PROFILE_FRAME', 'default')?.slot).toBe('PROFILE_FRAME');
    expect(cosmeticDefinition('CHECKER_SET', 'default')?.slot).toBe('CHECKER_SET');
    expect(cosmeticDefinition('DICE_SKIN', 'default')?.slot).toBe('DICE_SKIN');
    expect(cosmeticDefinition('BOARD_THEME', 'default')?.slot).toBe('BOARD_THEME');
    expect(cosmeticKey('PROFILE_FRAME', 'default')).not.toBe(cosmeticKey('CHECKER_SET', 'default'));
    expect(cosmeticKey('DICE_SKIN', 'default')).not.toBe(cosmeticKey('BOARD_THEME', 'default'));
  });

  it('requires the exact slot for purchasable checker content', () => {
    expect(purchasableCosmeticDefinition('CHECKER_SET', 'marble_checker_set')).toMatchObject({
      slot: 'CHECKER_SET',
      id: 'marble_checker_set',
      priceCoins: 200,
    });
    expect(purchasableCosmeticDefinition('PROFILE_FRAME', 'marble_checker_set')).toBeUndefined();
  });

  it('requires the exact slot for purchasable Dice Skin content', () => {
    expect(purchasableCosmeticDefinition('DICE_SKIN', 'obsidian_dice')).toMatchObject({
      slot: 'DICE_SKIN',
      id: 'obsidian_dice',
      priceCoins: 250,
    });
    expect(purchasableCosmeticDefinition('CHECKER_SET', 'obsidian_dice')).toBeUndefined();
  });

  it('requires the exact slot for purchasable Board Theme content', () => {
    expect(purchasableCosmeticDefinition('BOARD_THEME', 'midnight_board')).toMatchObject({
      slot: 'BOARD_THEME',
      id: 'midnight_board',
      priceCoins: 300,
    });
    expect(purchasableCosmeticDefinition('DICE_SKIN', 'midnight_board')).toBeUndefined();
  });
});
