export interface WallpaperPreset {
  id: string;
  name: string;
  thumbnail: string;
  bgStyle: string;
  isImage?: boolean;
}

export interface ChatWallpaperSettings {
  id: string;
  customUrl?: string;
  opacity: number; // 0.1 to 1.0
  blur: number; // 0 to 12px
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'none',
    name: 'clean',
    thumbnail: 'bg-[#0e1117]',
    bgStyle: 'none',
  },
  {
    id: 'rose_dusk',
    name: 'rose dusk',
    thumbnail: 'bg-gradient-to-tr from-[#2b0c16] via-[#160b1e] to-[#0d0f1a]',
    bgStyle: 'radial-gradient(ellipse at top right, rgba(244,63,94,0.18), transparent 60%), radial-gradient(ellipse at bottom left, rgba(168,85,247,0.14), transparent 60%)',
  },
  {
    id: 'midnight_aura',
    name: 'midnight aura',
    thumbnail: 'bg-gradient-to-tr from-[#051124] via-[#091830] to-[#040812]',
    bgStyle: 'radial-gradient(ellipse at 50% 20%, rgba(59,130,246,0.18), transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(14,165,233,0.12), transparent 60%)',
  },
  {
    id: 'emerald_night',
    name: 'emerald glow',
    thumbnail: 'bg-gradient-to-tr from-[#051f16] via-[#081813] to-[#040d0a]',
    bgStyle: 'radial-gradient(ellipse at center, rgba(16,185,129,0.16), transparent 70%), radial-gradient(circle at 10% 90%, rgba(5,150,105,0.1), transparent 50%)',
  },
  {
    id: 'cyber_noir',
    name: 'rainy city',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=75',
    bgStyle: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80',
    isImage: true,
  },
  {
    id: 'tokyo_cafe',
    name: 'neon cafe',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=75',
    bgStyle: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&q=80',
    isImage: true,
  },
  {
    id: 'space_cosmos',
    name: 'deep cosmos',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=300&q=75',
    bgStyle: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&q=80',
    isImage: true,
  },
];

export const DEFAULT_WALLPAPER_SETTINGS: ChatWallpaperSettings = {
  id: 'none',
  opacity: 0.35,
  blur: 3,
};

export function getSavedWallpaperSettings(): ChatWallpaperSettings {
  if (typeof window === 'undefined') return DEFAULT_WALLPAPER_SETTINGS;
  try {
    const raw = localStorage.getItem('naisuru_chat_wallpaper');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_WALLPAPER_SETTINGS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to parse saved wallpaper settings', e);
  }
  return DEFAULT_WALLPAPER_SETTINGS;
}

export const loadWallpaperSettings = getSavedWallpaperSettings;

export function saveWallpaperSettings(settings: ChatWallpaperSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('naisuru_chat_wallpaper', JSON.stringify(settings));
}
