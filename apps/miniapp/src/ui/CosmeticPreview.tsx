import {
  checkerSetIdSchema,
  diceSkinIdSchema,
  profileFrameIdSchema,
  type CosmeticSlot,
} from '@undergammon/protocol';
import { CheckerSetPreview } from './CheckerSetPreview';
import { DiceSkinPreview } from './DiceSkinPreview';
import { ProfileFramePreview } from './ProfileFramePreview';

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
