import type { PlayerId } from '@undergammon/game-engine';
import type { CheckerSetId, EquippedCosmetics, ProfileFrameId } from '@undergammon/protocol';

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

const checkerSets: Record<CheckerSetId, CheckerSetPresentation> = {
  default: defaultPresentations.checkerSet,
  marble_checker_set: {
    id: 'marble_checker_set',
    className: 'checker-set-marble',
  },
};

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

export function resolveCheckerSet(id: CheckerSetId): CheckerSetPresentation {
  return checkerSets[id];
}

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
 * Resolves trusted match presentation into fixed application-controlled cosmetic
 * specifications. Missing fields deliberately fall back to Default so legacy
 * match snapshots remain renderable.
 */
export function resolveMatchCosmetics({
  localSeat,
  players,
}: {
  readonly localSeat: PlayerId;
  readonly players?: Partial<Record<PlayerId, { cosmetics?: Partial<EquippedCosmetics> }>>;
}): ResolvedMatchCosmetics {
  const opponentSeat: PlayerId = localSeat === 'A' ? 'B' : 'A';
  return {
    board: {
      localTheme: withOwner(localSeat, defaultPresentations.boardTheme),
      opponentTheme: withOwner(opponentSeat, defaultPresentations.boardTheme),
    },
    checkers: {
      localSet: withOwner(
        localSeat,
        resolveCheckerSet(players?.[localSeat]?.cosmetics?.checkerSet ?? 'default'),
      ),
      opponentSet: withOwner(
        opponentSeat,
        resolveCheckerSet(players?.[opponentSeat]?.cosmetics?.checkerSet ?? 'default'),
      ),
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
