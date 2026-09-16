import type { DiceSkinId } from '@undergammon/protocol';
import { resolveDiceSkin } from '../game/cosmetics';
import '../styles/dice-skins.css';

const pips: Readonly<Record<number, readonly number[]>> = {
  2: [0, 8],
  5: [0, 2, 4, 6, 8],
};

function PreviewDie({ value, className }: { value: 2 | 5; className: string }) {
  return (
    <i className={`die-preview ${className}`}>
      {Array.from({ length: 9 }, (_, index) => (
        <span className={pips[value]?.includes(index) ? 'pip' : ''} key={index} />
      ))}
    </i>
  );
}

export function DiceSkinPreview({ cosmeticId }: { cosmeticId: DiceSkinId }) {
  const presentation = resolveDiceSkin(cosmeticId);
  return (
    <span className="dice-skin-preview" aria-hidden="true">
      <PreviewDie value={5} className={presentation.className} />
      <PreviewDie value={2} className={presentation.className} />
    </span>
  );
}
