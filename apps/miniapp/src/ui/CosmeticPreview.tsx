import {
  boardThemeIdSchema,
  checkerSetIdSchema,
  diceSkinIdSchema,
  profileFrameIdSchema,
  reactionPackIdSchema,
  type CosmeticSlot,
} from '@undergammon/protocol';
import { BoardThemePreview } from './BoardThemePreview';
import { CheckerSetPreview } from './CheckerSetPreview';
import { DiceSkinPreview } from './DiceSkinPreview';
import { ProfileFramePreview } from './ProfileFramePreview';
import { ReactionPackPreview } from './ReactionPackPreview';

export function CosmeticPreview({ slot, cosmeticId }: { slot: CosmeticSlot; cosmeticId: string }) {
  switch (slot) {
    case 'PROFILE_FRAME': {
      const parsed = profileFrameIdSchema.safeParse(cosmeticId);
      if (parsed.success) return <ProfileFramePreview cosmeticId={parsed.data} />;
      break;
    }
    case 'CHECKER_SET': {
      const parsed = checkerSetIdSchema.safeParse(cosmeticId);
      if (parsed.success) return <CheckerSetPreview cosmeticId={parsed.data} />;
      break;
    }
    case 'DICE_SKIN': {
      const parsed = diceSkinIdSchema.safeParse(cosmeticId);
      if (parsed.success) return <DiceSkinPreview cosmeticId={parsed.data} />;
      break;
    }
    case 'BOARD_THEME': {
      const parsed = boardThemeIdSchema.safeParse(cosmeticId);
      if (parsed.success) return <BoardThemePreview cosmeticId={parsed.data} />;
      break;
    }
    case 'REACTION_PACK': {
      const parsed = reactionPackIdSchema.safeParse(cosmeticId);
      if (parsed.success) return <ReactionPackPreview cosmeticId={parsed.data} />;
      break;
    }
    default: {
      const unsupportedSlot: never = slot;
      throw new Error(`Unsupported cosmetic slot: ${unsupportedSlot}`);
    }
  }
  return (
    <span className="cosmetic-preview" aria-hidden="true">
      ?
    </span>
  );
}
