export type PrimaryScreen = 'store' | 'cosmetics' | 'home' | 'leaders' | 'profile';
export type Screen = PrimaryScreen | 'history' | 'rules' | 'settings' | 'technical' | 'admin';
export const primaryNavigation: readonly { id: PrimaryScreen; icon: string }[] = [
  { id: 'store', icon: '□' },
  { id: 'cosmetics', icon: '◇' },
  { id: 'home', icon: '●' },
  { id: 'leaders', icon: '◆' },
  { id: 'profile', icon: '◉' },
];
