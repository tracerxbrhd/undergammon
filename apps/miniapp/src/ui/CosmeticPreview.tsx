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
  if (slot === 'PROFILE_FRAME') {
    const parsed = profileFrameIdSchema.safeParse(cosmeticId);
    if (parsed.success) return <ProfileFramePreview cosmeticId={parsed.data} />;
  }
  if (slot === 'CHECKER_SET') {
    const parsed = checkerSetIdSchema.safeParse(cosmeticId);
    if (parsed.success) return <CheckerSetPreview cosmeticId={parsed.data} />;
  }
  if (slot === 'DICE_SKIN') {
    const parsed = diceSkinIdSchema.safeParse(cosmeticId);
    if (parsed.success) return <DiceSkinPreview cosmeticId={parsed.data} />;
  }
  return (
    <span className="cosmetic-preview" aria-hidden="true">
      ?
    </span>
  );
}
