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
    expect(cosmeticKey('PROFILE_FRAME', 'default')).not.toBe(cosmeticKey('CHECKER_SET', 'default'));
  });

  it('requires the exact slot for purchasable checker content', () => {
    expect(purchasableCosmeticDefinition('CHECKER_SET', 'marble_checker_set')).toMatchObject({
      slot: 'CHECKER_SET',
      id: 'marble_checker_set',
      priceCoins: 200,
    });
    expect(purchasableCosmeticDefinition('PROFILE_FRAME', 'marble_checker_set')).toBeUndefined();
  });
});
