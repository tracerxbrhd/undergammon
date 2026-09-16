import type { BoardThemeId } from '@undergammon/protocol';
import { resolveBoardTheme } from '../game/cosmetics';
import '../styles/board-themes.css';

export function BoardThemePreview({ cosmeticId }: { cosmeticId: BoardThemeId }) {
  const theme = resolveBoardTheme(cosmeticId);
  return (
    <span className={`board-theme-preview ${theme.className}`} aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <span className={index % 2 ? 'dark' : ''} key={`top-${index}`} />
      ))}
      <i />
      {Array.from({ length: 6 }, (_, index) => (
        <span className={`${index % 2 ? 'dark' : ''} bottom`} key={`bottom-${index}`} />
      ))}
    </span>
  );
}
