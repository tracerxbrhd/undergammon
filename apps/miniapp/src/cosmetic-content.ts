import type { CosmeticSlot } from '@undergammon/protocol';
import type { Language } from './content';

interface CosmeticCopy {
  readonly name: readonly [english: string, russian: string];
  readonly description: readonly [english: string, russian: string];
}

const copy: Readonly<Record<string, CosmeticCopy>> = {
  'PROFILE_FRAME:default': {
    name: ['Default', 'По умолчанию'],
    description: ['Standard profile appearance.', 'Стандартный вид профиля.'],
  },
  'PROFILE_FRAME:season0_tester_frame': {
    name: ['Season 0 Tester', 'Тестер Сезона 0'],
    description: ['Season 0 participant reward.', 'Награда участника Сезона 0.'],
  },
  'PROFILE_FRAME:bronze_profile_frame': {
    name: ['Bronze Frame', 'Бронзовая рамка'],
    description: ['Permanent Store profile frame.', 'Постоянная рамка из Магазина.'],
  },
  'CHECKER_SET:default': {
    name: ['Default Checkers', 'Стандартные шашки'],
    description: ['Standard competitive checker appearance.', 'Стандартный вид игровых шашек.'],
  },
  'CHECKER_SET:marble_checker_set': {
    name: ['Marble Checkers', 'Мраморные шашки'],
    description: [
      'Polished light and graphite marble checker set.',
      'Набор шашек из светлого и графитового мрамора.',
    ],
  },
  'DICE_SKIN:default': {
    name: ['Default Dice', 'Стандартные кости'],
    description: ['Standard high-contrast dice appearance.', 'Стандартный контрастный вид костей.'],
  },
  'DICE_SKIN:obsidian_dice': {
    name: ['Obsidian Dice', 'Обсидиановые кости'],
    description: [
      'Smoked obsidian body with high-contrast ivory pips.',
      'Дымчатый обсидиан с контрастными светлыми точками.',
    ],
  },
  'BOARD_THEME:default': {
    name: ['Default Board', 'Стандартная доска'],
    description: ['Warm classic board presentation.', 'Классическое тёплое оформление доски.'],
  },
  'BOARD_THEME:midnight_board': {
    name: ['Midnight Board', 'Полуночная доска'],
    description: [
      'Cool midnight slate with high-contrast points for hybrid matches.',
      'Холодная полуночная палитра с контрастными пунктами для гибридных матчей.',
    ],
  },
  'REACTION_PACK:default': {
    name: ['Default Reactions', 'Стандартные реакции'],
    description: [
      'Classic emoji reactions for matches.',
      'Классические эмодзи-реакции для матчей.',
    ],
  },
  'REACTION_PACK:neon_reactions': {
    name: ['Neon Reactions', 'Неоновые реакции'],
    description: [
      'Compact neon-styled HI, NICE and GG match reactions.',
      'Компактные неоновые реакции HI, NICE и GG для матчей.',
    ],
  },
};

function key(slot: CosmeticSlot, cosmeticId: string): string {
  return `${slot}:${cosmeticId}`;
}

export function cosmeticName(slot: CosmeticSlot, cosmeticId: string, language: Language): string {
  const value = copy[key(slot, cosmeticId)];
  return value?.name[language === 'ru' ? 1 : 0] ?? cosmeticId;
}

export function cosmeticDescription(
  slot: CosmeticSlot,
  cosmeticId: string,
  language: Language,
): string {
  const value = copy[key(slot, cosmeticId)];
  return value?.description[language === 'ru' ? 1 : 0] ?? '';
}

export function cosmeticSlotLabel(slot: CosmeticSlot, language: Language): string {
  if (slot === 'PROFILE_FRAME') return language === 'ru' ? 'Рамки профиля' : 'Profile Frames';
  if (slot === 'CHECKER_SET') return language === 'ru' ? 'Наборы шашек' : 'Checker Sets';
  if (slot === 'DICE_SKIN') return language === 'ru' ? 'Кости' : 'Dice Skins';
  if (slot === 'BOARD_THEME') return language === 'ru' ? 'Темы доски' : 'Board Themes';
  if (slot === 'REACTION_PACK') return language === 'ru' ? 'Наборы реакций' : 'Reaction Packs';
  const unsupportedSlot: never = slot;
  throw new Error(`Unsupported cosmetic slot: ${unsupportedSlot}`);
}
