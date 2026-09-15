import type { ReactNode } from 'react';
import type { ProfileFrameId } from '@undergammon/protocol';
import { resolveProfileFrame } from '../game/cosmetics';
import { ProfileIcon } from './icons';

export function ProfileFramePreview({
  cosmeticId,
  children,
  variant = 'card',
}: {
  cosmeticId: ProfileFrameId;
  children?: ReactNode;
  variant?: 'card' | 'hero';
}) {
  return (
    <span
      className={`profile-frame-preview profile-frame-preview-${variant} ${resolveProfileFrame(cosmeticId).className}`}
      aria-hidden="true"
    >
      <span className="profile-frame-preview-avatar">
        {children ?? <ProfileIcon />}
      </span>
    </span>
  );
}
