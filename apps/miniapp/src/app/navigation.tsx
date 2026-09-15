import type { ReactNode } from 'react';
import { CosmeticsIcon, PlayIcon, ProfileIcon, RankingsIcon, StoreIcon } from '../ui/icons';

export type PrimaryScreen = 'store' | 'cosmetics' | 'home' | 'leaders' | 'profile';
export type Screen = PrimaryScreen | 'history' | 'rules' | 'settings' | 'technical' | 'admin';

export interface PrimaryNavigationItem {
  readonly id: PrimaryScreen;
  readonly icon: ReactNode;
}

export const primaryNavigation: readonly PrimaryNavigationItem[] = [
  { id: 'store', icon: <StoreIcon /> },
  { id: 'cosmetics', icon: <CosmeticsIcon /> },
  { id: 'home', icon: <PlayIcon /> },
  { id: 'leaders', icon: <RankingsIcon /> },
  { id: 'profile', icon: <ProfileIcon /> },
];
