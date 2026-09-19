import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  TELEGRAM_TOP_CHROME_FALLBACK,
  effectiveContentSafeTop,
  effectiveStableViewportHeight,
} from '../src/platform.js';

describe('effectiveContentSafeTop', () => {
  it('prefers a meaningful Telegram content safe area', () => {
    expect(effectiveContentSafeTop(true, 24, 96, 800)).toBe(96);
  });

  it.each([0, 40])('uses the Telegram chrome fallback for an insufficient %ipx inset', (top) => {
    expect(effectiveContentSafeTop(true, 24, top, 800)).toBe(TELEGRAM_TOP_CHROME_FALLBACK);
  });

  it('rejects an implausible transient inset after returning from Telegram UI', () => {
    expect(effectiveContentSafeTop(true, 24, 900, 800)).toBe(TELEGRAM_TOP_CHROME_FALLBACK);
  });

  it('does not add Telegram chrome spacing in a browser', () => {
    expect(effectiveContentSafeTop(false, 20, 0, 800)).toBe(20);
    expect(effectiveContentSafeTop(false, 0, 0, 800)).toBe(0);
  });
});

describe('effectiveStableViewportHeight', () => {
  it('uses a plausible Telegram stable viewport height', () => {
    expect(effectiveStableViewportHeight(720, 760)).toBe(720);
  });

  it.each([0, 2000, Number.NaN])('falls back from an invalid or stale %s height', (height) => {
    expect(effectiveStableViewportHeight(height, 760)).toBe(760);
  });
});

describe('content safe top consumers', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const stability = readFileSync(
    new URL('../src/styles/playtest-stability.css', import.meta.url),
    'utf8',
  );

  it('uses the canonical value for the app shell and game screen', () => {
    expect(css).toMatch(/\.app-shell\s*{[^}]*var\(--app-content-safe-top\)/s);
    expect(css).toMatch(/\.game-screen\s*{[^}]*var\(--app-content-safe-top\)/s);
  });

  it('preserves the canonical value in the compact-height game rules', () => {
    expect(css).toMatch(
      /@media \(max-height: 700px\)[\s\S]*?\.game-screen\s*{[^}]*padding-top:\s*calc\(4px \+ var\(--app-content-safe-top\)\)/,
    );
  });

  it('keeps focused challenge/search flows inside the app content box', () => {
    expect(stability).toMatch(
      /\.app-shell\.focused\s*{[^}]*height:\s*var\(--app-viewport-stable-height\)/s,
    );
    expect(stability).toMatch(/\.app-shell\.focused \.focused-flow\s*{[^}]*height:\s*100%/s);
  });
});
