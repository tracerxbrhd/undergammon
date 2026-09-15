interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  openTelegramLink(url: string): void;
  HapticFeedback?: { impactOccurred(style: 'light'): void };
  viewportStableHeight?: number;
  safeAreaInset?: { bottom?: number };
  contentSafeAreaInset?: { bottom?: number };
  onEvent?(
    event: 'viewportChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged',
    listener: () => void,
  ): void;
  offEvent?(
    event: 'viewportChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged',
    listener: () => void,
  ): void;
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
  subscribeViewport: (listener: (value: { height: number; safeBottom: number }) => void) => {
    const webApp = window.Telegram?.WebApp;
    const update = () =>
      listener({
        height: webApp?.viewportStableHeight ?? window.innerHeight,
        safeBottom: Math.max(
          webApp?.safeAreaInset?.bottom ?? 0,
          webApp?.contentSafeAreaInset?.bottom ?? 0,
        ),
      });
    update();
    window.addEventListener('resize', update);
    webApp?.onEvent?.('viewportChanged', update);
    webApp?.onEvent?.('safeAreaChanged', update);
    webApp?.onEvent?.('contentSafeAreaChanged', update);
    return () => {
      window.removeEventListener('resize', update);
      webApp?.offEvent?.('viewportChanged', update);
      webApp?.offEvent?.('safeAreaChanged', update);
      webApp?.offEvent?.('contentSafeAreaChanged', update);
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
