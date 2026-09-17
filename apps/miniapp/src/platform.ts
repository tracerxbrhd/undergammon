interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  openTelegramLink(url: string): void;
  HapticFeedback?: { impactOccurred(style: 'light'): void };
  viewportStableHeight?: number;
  safeAreaInset?: TelegramInsets;
  contentSafeAreaInset?: TelegramInsets;
  onEvent?(
    event: 'viewportChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged' | 'activated',
    listener: () => void,
  ): void;
  offEvent?(
    event: 'viewportChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged' | 'activated',
    listener: () => void,
  ): void;
}
interface TelegramInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface LayoutInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlatformLayout {
  stableViewportHeight: number;
  safeArea: LayoutInsets;
  contentSafeArea: LayoutInsets;
}

export const TELEGRAM_TOP_CHROME_FALLBACK = 72;
const MAX_REPORTED_VIEWPORT_RATIO = 1.5;
const MAX_TOP_INSET_RATIO = 0.4;

export function effectiveStableViewportHeight(
  reportedHeight: number | undefined,
  fallbackHeight: number,
): number {
  const fallback = Number.isFinite(fallbackHeight) && fallbackHeight > 0 ? fallbackHeight : 1;
  if (
    reportedHeight === undefined ||
    !Number.isFinite(reportedHeight) ||
    reportedHeight <= 0 ||
    reportedHeight > Math.max(320, fallback * MAX_REPORTED_VIEWPORT_RATIO)
  ) {
    return fallback;
  }
  return reportedHeight;
}

export function effectiveContentSafeTop(
  isTelegram: boolean,
  safeAreaTop: number,
  contentSafeAreaTop: number,
  viewportHeight = Number.POSITIVE_INFINITY,
): number {
  const safeTop = Math.max(0, safeAreaTop);
  const contentTop = Math.max(0, contentSafeAreaTop);
  const maximumPlausibleTop = Number.isFinite(viewportHeight)
    ? Math.max(TELEGRAM_TOP_CHROME_FALLBACK, viewportHeight * MAX_TOP_INSET_RATIO)
    : Number.POSITIVE_INFINITY;
  const plausibleSafeTop = safeTop <= maximumPlausibleTop ? safeTop : 0;
  const plausibleContentTop = contentTop <= maximumPlausibleTop ? contentTop : 0;

  if (isTelegram && plausibleContentTop < TELEGRAM_TOP_CHROME_FALLBACK) {
    return Math.max(plausibleSafeTop, TELEGRAM_TOP_CHROME_FALLBACK);
  }

  return Math.max(plausibleSafeTop, plausibleContentTop);
}
declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}
export const platform = {
  initData: () => window.Telegram?.WebApp.initData ?? '',
  ready: () => {
    window.Telegram?.WebApp.ready();
    window.Telegram?.WebApp.expand();
  },
  share: (url: string) =>
    window.Telegram?.WebApp.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(url)}`,
    ),
  haptic: () => {
    if (localStorage.getItem('haptics') !== 'false')
      window.Telegram?.WebApp.HapticFeedback?.impactOccurred('light');
  },
  startParameter: () =>
    new URLSearchParams(window.Telegram?.WebApp.initData ?? '').get('start_param') ?? '',
  subscribeLayout: (listener: (value: PlatformLayout) => void) => {
    const webApp = window.Telegram?.WebApp;
    let previous = '';
    let lastStableViewportHeight = Math.max(1, window.innerHeight);
    let resumeFrame: number | null = null;
    let resumeTimer: number | null = null;
    const insets = (value?: TelegramInsets): LayoutInsets => ({
      top: value?.top ?? 0,
      right: value?.right ?? 0,
      bottom: value?.bottom ?? 0,
      left: value?.left ?? 0,
    });
    const update = () => {
      const fallbackViewportHeight =
        Number.isFinite(window.innerHeight) && window.innerHeight > 0
          ? window.innerHeight
          : lastStableViewportHeight;
      const stableViewportHeight = effectiveStableViewportHeight(
        webApp?.viewportStableHeight,
        fallbackViewportHeight,
      );
      lastStableViewportHeight = stableViewportHeight;
      const layout = {
        stableViewportHeight,
        safeArea: insets(webApp?.safeAreaInset),
        contentSafeArea: insets(webApp?.contentSafeAreaInset),
      };
      layout.contentSafeArea.top = effectiveContentSafeTop(
        Boolean(webApp),
        layout.safeArea.top,
        layout.contentSafeArea.top,
        stableViewportHeight,
      );
      const serialized = JSON.stringify(layout);
      if (serialized !== previous) {
        previous = serialized;
        listener(layout);
      }
    };
    const resync = () => {
      webApp?.expand();
      update();
      if (resumeFrame !== null) window.cancelAnimationFrame(resumeFrame);
      resumeFrame = window.requestAnimationFrame(() => {
        resumeFrame = null;
        update();
      });
      if (resumeTimer !== null) window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        resumeTimer = null;
        update();
      }, 120);
    };
    const onVisibilityChange = () => {
      if (!document.hidden) resync();
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', onVisibilityChange);
    webApp?.onEvent?.('viewportChanged', update);
    webApp?.onEvent?.('safeAreaChanged', update);
    webApp?.onEvent?.('contentSafeAreaChanged', update);
    webApp?.onEvent?.('activated', resync);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('focus', resync);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      webApp?.offEvent?.('viewportChanged', update);
      webApp?.offEvent?.('safeAreaChanged', update);
      webApp?.offEvent?.('contentSafeAreaChanged', update);
      webApp?.offEvent?.('activated', resync);
      if (resumeFrame !== null) window.cancelAnimationFrame(resumeFrame);
      if (resumeTimer !== null) window.clearTimeout(resumeTimer);
    };
  },
};
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const code =
      typeof result === 'object' && result !== null && 'code' in result
        ? String(result.code)
        : 'NETWORK_ERROR';
    throw new Error(code);
  }
  return result as T;
}
export function feedbackSound(kind: 'roll' | 'move' | 'finish') {
  if (localStorage.getItem('sound') === 'false') return;
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = kind === 'roll' ? 240 : kind === 'move' ? 440 : 660;
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    /* Audio is optional on WebViews that do not support it. */
  }
}
