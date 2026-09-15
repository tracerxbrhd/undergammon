import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TELEGRAM_TOP_CHROME_FALLBACK, effectiveContentSafeTop } from '../src/platform.js';

describe('effectiveContentSafeTop', () => {
  it('prefers a meaningful Telegram content safe area', () => {
    expect(effectiveContentSafeTop(true, 24, 96)).toBe(96);
  });

  it.each([0, 40])('uses the Telegram chrome fallback for an insufficient %ipx inset', (top) => {
    expect(effectiveContentSafeTop(true, 24, top)).toBe(TELEGRAM_TOP_CHROME_FALLBACK);
  });

  it('does not add Telegram chrome spacing in a browser', () => {
    expect(effectiveContentSafeTop(false, 20, 0)).toBe(20);
    expect(effectiveContentSafeTop(false, 0, 0)).toBe(0);
  });
});

describe('content safe top consumers', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

  it('uses the canonical value for the app shell and game screen', () => {
    expect(css).toMatch(/\.app-shell\s*{[^}]*var\(--app-content-safe-top\)/s);
    expect(css).toMatch(/\.game-screen\s*{[^}]*var\(--app-content-safe-top\)/s);
  });

  it('preserves the canonical value in the compact-height game rules', () => {
    expect(css).toMatch(
      /@media \(max-height: 700px\)[\s\S]*?\.game-screen\s*{[^}]*padding-top:\s*calc\(4px \+ var\(--app-content-safe-top\)\)/,
    );
  });
});
