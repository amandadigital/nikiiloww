import type { CSSProperties } from 'react';
import {
  AvatarAnimationType,
  NameColorType,
  NameFontType,
  ProfileDecorations,
} from '../types';

export interface BackgroundPreset {
  id: string;
  name: string;
  type: 'image' | 'gradient';
  value: string;
  previewClass: string;
}

export const PROFILE_BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'deep_space',
    name: 'deep space',
    type: 'image',
    value: 'https://img.magnific.com/free-photo/abstract-geometric-background-shapes-texture_1194-301824.jpg?semt=ais_hybrid&w=740&q=80',
    previewClass: 'bg-cover bg-center',
  },
  {
    id: 'forest',
    name: 'forest',
    type: 'image',
    value: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJCTnj8_WtmvIFDluRKlNSPprMq4iNy27a6zfGfk9J36dVWYxnfc1LIxc&s=10',
    previewClass: 'bg-cover bg-center',
  },
  {
    id: 'rose_dusk',
    name: 'rose dusk',
    type: 'gradient',
    value: 'linear-gradient(135deg, #4c0519 0%, #2a0818 50%, #0b0207 100%)',
    previewClass: 'bg-gradient-to-br from-rose-950 via-rose-900 to-black',
  },
  {
    id: 'midnight_aura',
    name: 'midnight aura',
    type: 'gradient',
    value: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #030712 100%)',
    previewClass: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-black',
  },
  {
    id: 'emerald_glow',
    name: 'emerald glow',
    type: 'gradient',
    value: 'linear-gradient(135deg, #064e3b 0%, #022c22 60%, #021a14 100%)',
    previewClass: 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-black',
  },
];

export interface BackgroundColorOption {
  id: string;
  name: string;
  value: string;
  previewClass: string;
}

export const PROFILE_BACKGROUND_COLORS: BackgroundColorOption[] = [
  {
    id: 'green',
    name: 'green',
    value: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #047857 100%)',
    previewClass: 'bg-emerald-600',
  },
  {
    id: 'purple',
    name: 'purple',
    value: 'linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #6d28d9 100%)',
    previewClass: 'bg-purple-600',
  },
  {
    id: 'blue',
    name: 'blue',
    value: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)',
    previewClass: 'bg-blue-600',
  },
];

export const NAME_COLOR_MAP: Record<NameColorType, { textClass: string; colorCode: string }> = {
  default: {
    textClass: 'text-gray-900 dark:text-gray-100',
    colorCode: 'currentColor',
  },
  blue: {
    textClass: 'text-blue-500 dark:text-blue-400',
    colorCode: '#3b82f6',
  },
  green: {
    textClass: 'text-emerald-500 dark:text-emerald-400',
    colorCode: '#10b981',
  },
  pink: {
    textClass: 'text-pink-500 dark:text-pink-400',
    colorCode: '#ec4899',
  },
  purple: {
    textClass: 'text-purple-500 dark:text-purple-400',
    colorCode: '#a855f7',
  },
  brown: {
    textClass: 'text-amber-800 dark:text-amber-400',
    colorCode: '#92400e',
  },
};

export const NAME_FONT_MAP: Record<NameFontType, { fontClass: string; label: string }> = {
  default: {
    fontClass: 'font-sans',
    label: 'default',
  },
  sora: {
    fontClass: 'font-sora',
    label: 'sora',
  },
  manrope: {
    fontClass: 'font-manrope',
    label: 'manrope',
  },
  bricolage: {
    fontClass: 'font-bricolage',
    label: 'bricolage',
  },
  syne_mono: {
    fontClass: 'font-syne-mono',
    label: 'syne mono',
  },
  handdrawn: {
    fontClass: 'font-handdrawn tracking-wide font-normal',
    label: 'drawn',
  },
};

export function getDecoratedNameClasses(
  decorations?: ProfileDecorations,
  onCustomBg?: boolean
): string {
  if (!decorations) {
    return onCustomBg ? 'text-white drop-shadow-sm' : 'text-gray-900 dark:text-gray-100';
  }
  const isDefaultColor = !decorations.nameColor || decorations.nameColor === 'default';
  const color = isDefaultColor
    ? (onCustomBg ? 'text-white drop-shadow-sm' : NAME_COLOR_MAP.default.textClass)
    : (NAME_COLOR_MAP[decorations.nameColor]?.textClass || NAME_COLOR_MAP.default.textClass);

  const font = decorations.nameFont && NAME_FONT_MAP[decorations.nameFont]
    ? NAME_FONT_MAP[decorations.nameFont].fontClass
    : '';
  return `${color} ${font}`.trim();
}

export const DEFAULT_PULSE_COLOR = '#facc15';

export const PULSE_COLOR_PALETTE = [
  { id: 'yellow', name: 'Yellow Gold', color: '#facc15' },
  { id: 'cyan', name: 'Electric Cyan', color: '#06b6d4' },
  { id: 'emerald', name: 'Neon Green', color: '#10b981' },
  { id: 'pink', name: 'Vibrant Pink', color: '#ec4899' },
  { id: 'purple', name: 'Cosmic Purple', color: '#a855f7' },
  { id: 'orange', name: 'Solar Orange', color: '#f97316' },
  { id: 'crimson', name: 'Crimson Red', color: '#ef4444' },
  { id: 'white', name: 'Pure White', color: '#f8fafc' },
];

export function getBackgroundOpacity(decorations?: ProfileDecorations): number {
  if (!decorations || typeof decorations.backgroundOpacity !== 'number') {
    return 1.0;
  }
  return Math.min(1, Math.max(0.1, decorations.backgroundOpacity / 100));
}

export function getBackgroundStyle(decorations?: ProfileDecorations): CSSProperties {
  if (!decorations || !decorations.backgroundValue) return {};
  const val = decorations.backgroundValue;

  // Preset check
  const preset = PROFILE_BACKGROUND_PRESETS.find((p) => p.id === val || p.value === val);
  if (preset) {
    if (preset.type === 'image') {
      return {
        backgroundImage: `url(${preset.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {
      background: preset.value,
    };
  }

  // Color check
  const color = PROFILE_BACKGROUND_COLORS.find((c) => c.id === val);
  if (color) {
    return {
      background: color.value,
    };
  }

  // Direct image URL or gradient
  if (val.startsWith('http') || val.startsWith('data:image')) {
    return {
      backgroundImage: `url(${val})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (val.includes('gradient')) {
    return {
      background: val,
    };
  }

  return {};
}
