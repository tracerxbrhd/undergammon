import type { PlayerId } from '@undergammon/game-engine';
import type {
  BoardThemeId,
  CheckerSetId,
  DiceSkinId,
  EquippedCosmetics,
  ProfileFrameId,
  Reaction,
  ReactionPackId,
} from '@undergammon/protocol';

export type DefaultCosmeticId = 'default';

interface CosmeticPresentation {
  readonly id: string;
  readonly className: string;
}

export interface ReactionVisual {
  readonly content: string;
}

export type BoardThemePresentation = CosmeticPresentation;
export type CheckerSetPresentation = CosmeticPresentation;
export type DiceSkinPresentation = CosmeticPresentation;
export type ProfileFramePresentation = CosmeticPresentation;
export type ReactionPackPresentation = CosmeticPresentation & { readonly id: ReactionPackId };

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
    readonly opponentPack: PlayerCosmeticPresentation<ReactionPackPresentation>;
  };
}

const defaultPresentations = {
  boardTheme: { id: 'default', className: 'board-theme-default' },
  checkerSet: { id: 'default', className: 'checker-set-default' },
  diceSkin: { id: 'default', className: 'dice-skin-default' },
  profileFrame: { id: 'default', className: 'profile-frame-default' },
  reactionPack: { id: 'default', className: 'reaction-pack-default' },
} as const;

const boardThemes: Record<BoardThemeId, BoardThemePresentation> = {
  default: defaultPresentations.boardTheme,
  midnight_board: {
    id: 'midnight_board',
    className: 'board-theme-midnight',
  },
};

const checkerSets: Record<CheckerSetId, CheckerSetPresentation> = {
  default: defaultPresentations.checkerSet,
  marble_checker_set: {
    id: 'marble_checker_set',
    className: 'checker-set-marble',
  },
};

const diceSkins: Record<DiceSkinId, DiceSkinPresentation> = {
  default: defaultPresentations.diceSkin,
  obsidian_dice: {
    id: 'obsidian_dice',
    className: 'dice-skin-obsidian',
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

const reactionPacks: Record<ReactionPackId, ReactionPackPresentation> = {
  default: defaultPresentations.reactionPack,
  neon_reactions: {
    id: 'neon_reactions',
    className: 'reaction-pack-neon',
  },
};

const reactionVisuals: Record<ReactionPackId, Record<Reaction, ReactionVisual>> = {
  default: {
    WAVE: { content: '👋' },
    NICE: { content: '👏' },
    GG: { content: '🤝' },
  },
  neon_reactions: {
    WAVE: { content: 'HI!' },
    NICE: { content: 'NICE!' },
    GG: { content: 'GG!' },
  },
};

export function resolveBoardTheme(id: BoardThemeId): BoardThemePresentation {
  return boardThemes[id];
}

export function resolveCheckerSet(id: CheckerSetId): CheckerSetPresentation {
  return checkerSets[id];
}

export function resolveDiceSkin(id: DiceSkinId): DiceSkinPresentation {
  return diceSkins[id];
}

export function resolveProfileFrame(id: ProfileFrameId): ProfileFramePresentation {
  return profileFrames[id];
}

export function resolveReactionPack(id: ReactionPackId): ReactionPackPresentation {
  return reactionPacks[id];
}

export function resolveReactionVisual(packId: ReactionPackId, reaction: Reaction): ReactionVisual {
  return reactionVisuals[packId][reaction];
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
      localTheme: withOwner(
        localSeat,
        resolveBoardTheme(players?.[localSeat]?.cosmetics?.boardTheme ?? 'default'),
      ),
      opponentTheme: withOwner(
        opponentSeat,
        resolveBoardTheme(players?.[opponentSeat]?.cosmetics?.boardTheme ?? 'default'),
      ),
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
      localSkin: withOwner(
        localSeat,
        resolveDiceSkin(players?.[localSeat]?.cosmetics?.diceSkin ?? 'default'),
      ),
      opponentSkin: withOwner(
        opponentSeat,
        resolveDiceSkin(players?.[opponentSeat]?.cosmetics?.diceSkin ?? 'default'),
      ),
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
      localPack: withOwner(
        localSeat,
        resolveReactionPack(players?.[localSeat]?.cosmetics?.reactionPack ?? 'default'),
      ),
      opponentPack: withOwner(
        opponentSeat,
        resolveReactionPack(players?.[opponentSeat]?.cosmetics?.reactionPack ?? 'default'),
      ),
    },
  };
}
