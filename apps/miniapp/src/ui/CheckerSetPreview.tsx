import type { CheckerSetId } from '@undergammon/protocol';
import { resolveCheckerSet } from '../game/cosmetics';

export function CheckerSetPreview({ cosmeticId }: { cosmeticId: CheckerSetId }) {
  const presentation = resolveCheckerSet(cosmeticId);
  return (
    <span className="checker-set-preview" aria-hidden="true">
      <i className={`checker-preview own ${presentation.className}`} />
      <i className={`checker-preview enemy ${presentation.className}`} />
    </span>
  );
}
