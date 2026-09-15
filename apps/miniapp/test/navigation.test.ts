import { describe, expect, it } from 'vitest';
import { primaryNavigation } from '../src/app/navigation';

describe('primary navigation', () => {
  it('keeps the five accepted destinations in product order with Play centered', () => {
    expect(primaryNavigation.map((item) => item.id)).toEqual([
      'store',
      'cosmetics',
      'home',
      'leaders',
      'profile',
    ]);
  });
});
