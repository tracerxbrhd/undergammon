import type { PlayerId } from '@undergammon/game-engine';

export type DefaultCosmeticId = 'default';

interface CosmeticPresentation {
  readonly id: DefaultCosmeticId;
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

function withOwner<T extends CosmeticPresentation>(
  ownerSeat: PlayerId,
  presentation: T,
): PlayerCosmeticPresentation<T> {
  return { ownerSeat, presentation };
}

/**
 * Resolves trusted match presentation into the fixed cosmetic specifications that
 * rendering components may consume. There is no ownership contract yet, so every
 * slot deliberately resolves to the existing Default presentation.
 */
export function resolveMatchCosmetics({
  localSeat,
}: {
  readonly localSeat: PlayerId;
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
      localFrame: withOwner(localSeat, defaultPresentations.profileFrame),
      opponentFrame: withOwner(opponentSeat, defaultPresentations.profileFrame),
    },
    reactions: {
      localPack: withOwner(localSeat, defaultPresentations.reactionPack),
    },
  };
}
