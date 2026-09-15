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
    event: 'viewportChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged',
    listener: () => void,
  ): void;
  offEvent?(
    event: 'viewportChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged',
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
    const insets = (value?: TelegramInsets): LayoutInsets => ({
      top: value?.top ?? 0,
      right: value?.right ?? 0,
      bottom: value?.bottom ?? 0,
      left: value?.left ?? 0,
    });
    const update = () => {
      const layout = {
        stableViewportHeight: webApp?.viewportStableHeight ?? window.innerHeight,
        safeArea: insets(webApp?.safeAreaInset),
        contentSafeArea: insets(webApp?.contentSafeAreaInset),
      };
      const serialized = JSON.stringify(layout);
      if (serialized !== previous) {
        previous = serialized;
        listener(layout);
      }
    };
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
