import type { PlayerId } from '@undergammon/game-engine';
import type { EquippedCosmetics, ProfileFrameId } from '@undergammon/protocol';

export type DefaultCosmeticId = 'default';

interface CosmeticPresentation {
  readonly id: string;
  readonly className: string;
}

export type BoardThemePresentation = CosmeticPresentation;
export type CheckerSetPresentation = CosmeticPresentation;
export type DiceSkinPresentation = CosmeticPresentation;
export type ProfileFramePresentation = CosmeticPresentation;
export type ReactionPackPresentation = CosmeticPresentation;

export interface PlayerCosmeticPresentation<T extends CosmeticPresentation> {
  readonly ownerSeat: PlayerId;
  readonly presentation: T;
}

export interface ResolvedMatchCosmetics {
  readonly board: {
    readonly localTheme: PlayerCosmeticPresentation<BoardThemePresentation>;
    readonly opponentTheme: PlayerCosmeticPresentation<BoardThemePresentation>;
  };
  readonly checkers: {
    readonly localSet: PlayerCosmeticPresentation<CheckerSetPresentation>;
    readonly opponentSet: PlayerCosmeticPresentation<CheckerSetPresentation>;
  };
  readonly dice: {
    readonly localSkin: PlayerCosmeticPresentation<DiceSkinPresentation>;
    readonly opponentSkin: PlayerCosmeticPresentation<DiceSkinPresentation>;
  };
  readonly profile: {
    readonly localFrame: PlayerCosmeticPresentation<ProfileFramePresentation>;
    readonly opponentFrame: PlayerCosmeticPresentation<ProfileFramePresentation>;
  };
  readonly reactions: {
    readonly localPack: PlayerCosmeticPresentation<ReactionPackPresentation>;
  };
}

const defaultPresentations = {
  boardTheme: { id: 'default', className: 'board-theme-default' },
  checkerSet: { id: 'default', className: 'checker-set-default' },
  diceSkin: { id: 'default', className: 'dice-skin-default' },
  profileFrame: { id: 'default', className: 'profile-frame-default' },
  reactionPack: { id: 'default', className: 'reaction-pack-default' },
} as const;

const profileFrames: Record<ProfileFrameId, ProfileFramePresentation> = {
  default: defaultPresentations.profileFrame,
  season0_tester_frame: {
    id: 'season0_tester_frame',
    className: 'profile-frame-season0-tester',
  },
  bronze_profile_frame: {
    id: 'bronze_profile_frame',
    className: 'profile-frame-bronze',
  },
};

export function resolveProfileFrame(id: ProfileFrameId): ProfileFramePresentation {
  return profileFrames[id];
}

function withOwner<T extends CosmeticPresentation>(
  ownerSeat: PlayerId,
  presentation: T,
): PlayerCosmeticPresentation<T> {
  return { ownerSeat, presentation };
}

/**
 * Resolves trusted match presentation into the fixed cosmetic specifications that
 * rendering components may consume. Profile Frames use trusted snapshot data;
 * slots without a server contract deliberately remain Default.
 */
export function resolveMatchCosmetics({
  localSeat,
  players,
}: {
  readonly localSeat: PlayerId;
  readonly players?: Partial<Record<PlayerId, { cosmetics?: EquippedCosmetics }>>;
}): ResolvedMatchCosmetics {
  const opponentSeat: PlayerId = localSeat === 'A' ? 'B' : 'A';
  return {
    board: {
      localTheme: withOwner(localSeat, defaultPresentations.boardTheme),
      opponentTheme: withOwner(opponentSeat, defaultPresentations.boardTheme),
    },
    checkers: {
      localSet: withOwner(localSeat, defaultPresentations.checkerSet),
      opponentSet: withOwner(opponentSeat, defaultPresentations.checkerSet),
    },
    dice: {
      localSkin: withOwner(localSeat, defaultPresentations.diceSkin),
      opponentSkin: withOwner(opponentSeat, defaultPresentations.diceSkin),
    },
    profile: {
      localFrame: withOwner(
        localSeat,
        resolveProfileFrame(players?.[localSeat]?.cosmetics?.profileFrame ?? 'default'),
      ),
      opponentFrame: withOwner(
        opponentSeat,
        resolveProfileFrame(players?.[opponentSeat]?.cosmetics?.profileFrame ?? 'default'),
      ),
    },
    reactions: {
      localPack: withOwner(localSeat, defaultPresentations.reactionPack),
    },
  };
}
