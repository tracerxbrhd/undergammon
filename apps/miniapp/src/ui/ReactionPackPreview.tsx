import type { Reaction, ReactionPackId } from '@undergammon/protocol';
import { resolveReactionPack, resolveReactionVisual } from '../game/cosmetics';
import '../styles/reaction-packs.css';

const reactions: readonly Reaction[] = ['WAVE', 'NICE', 'GG'];

export function ReactionPackPreview({ cosmeticId }: { cosmeticId: ReactionPackId }) {
  const presentation = resolveReactionPack(cosmeticId);
  return (
    <span
      className={`reaction-pack-preview ${presentation.className}`}
      aria-hidden="true"
      data-reaction-pack={presentation.id}
    >
      {reactions.map((reaction) => (
        <span key={reaction}>{resolveReactionVisual(cosmeticId, reaction).content}</span>
      ))}
    </span>
  );
}
