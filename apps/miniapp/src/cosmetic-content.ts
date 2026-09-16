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
  return language === 'ru' ? 'Кости' : 'Dice Skins';
}
