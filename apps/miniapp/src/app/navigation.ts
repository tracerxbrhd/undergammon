export type PrimaryScreen = 'leaders' | 'home' | 'profile';
export type Screen = PrimaryScreen | 'history' | 'rules' | 'settings' | 'technical' | 'admin';
export const primaryNavigation: readonly { id: PrimaryScreen; icon: string }[] = [
  { id: 'leaders', icon: '◆' },
  { id: 'home', icon: '●' },
  { id: 'profile', icon: '◉' },
];
