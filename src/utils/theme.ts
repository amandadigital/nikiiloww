export type AccentColor = 'white' | 'rose' | 'pink' | 'blue' | 'purple' | 'green';
export type BgTheme = 'default' | 'midnight' | 'charcoal' | 'velvet';

export const ACCENT_CONFIG: Record<
  AccentColor,
  {
    name: string;
    hex: string;
    activeText: string;
    bgClass: string;
    hoverBgClass: string;
    borderClass: string;
    lightSubtleBg: string;
    ringClass: string;
    badgeBg: string;
    gradient: string;
  }
> = {
  white: {
    name: 'white',
    hex: '#ffffff',
    activeText: 'text-white',
    bgClass: 'bg-white text-black',
    hoverBgClass: 'hover:bg-gray-100',
    borderClass: 'border-white/40',
    lightSubtleBg: 'bg-white/15 text-white',
    ringClass: 'focus:ring-white/40 focus:border-white',
    badgeBg: 'bg-white text-black',
    gradient: 'from-white to-gray-200',
  },
  rose: {
    name: 'white',
    hex: '#ffffff',
    activeText: 'text-white',
    bgClass: 'bg-white text-black',
    hoverBgClass: 'hover:bg-gray-100',
    borderClass: 'border-white/40',
    lightSubtleBg: 'bg-white/15 text-white',
    ringClass: 'focus:ring-white/40 focus:border-white',
    badgeBg: 'bg-white text-black',
    gradient: 'from-white to-gray-200',
  },
  pink: {
    name: 'white',
    hex: '#ffffff',
    activeText: 'text-white',
    bgClass: 'bg-white text-black',
    hoverBgClass: 'hover:bg-gray-100',
    borderClass: 'border-white/40',
    lightSubtleBg: 'bg-white/15 text-white',
    ringClass: 'focus:ring-white/40 focus:border-white',
    badgeBg: 'bg-white text-black',
    gradient: 'from-white to-gray-200',
  },
  blue: {
    name: 'white',
    hex: '#ffffff',
    activeText: 'text-white',
    bgClass: 'bg-white text-black',
    hoverBgClass: 'hover:bg-gray-100',
    borderClass: 'border-white/40',
    lightSubtleBg: 'bg-white/15 text-white',
    ringClass: 'focus:ring-white/40 focus:border-white',
    badgeBg: 'bg-white text-black',
    gradient: 'from-white to-gray-200',
  },
  purple: {
    name: 'purple',
    hex: '#a855f7',
    activeText: 'text-purple-500 dark:text-purple-400',
    bgClass: 'bg-purple-500 text-white',
    hoverBgClass: 'hover:bg-purple-600',
    borderClass: 'border-purple-500/30',
    lightSubtleBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    ringClass: 'focus:ring-purple-500/40 focus:border-purple-500',
    badgeBg: 'bg-purple-500 text-white',
    gradient: 'from-purple-500 to-purple-600',
  },
  green: {
    name: 'green',
    hex: '#10b981',
    activeText: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-500 text-white',
    hoverBgClass: 'hover:bg-emerald-600',
    borderClass: 'border-emerald-500/30',
    lightSubtleBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    ringClass: 'focus:ring-emerald-500/40 focus:border-emerald-500',
    badgeBg: 'bg-emerald-500 text-white',
    gradient: 'from-emerald-500 to-emerald-600',
  },
};

export const BG_THEMES: {
  id: BgTheme;
  name: string;
  desc: string;
  previewClass: string;
  darkBg: string;
  darkSurface: string;
  darkBorder: string;
  lightBg: string;
  lightSurface: string;
  lightBorder: string;
}[] = [
  {
    id: 'default',
    name: 'default',
    desc: 'clean dark slate',
    previewClass: 'bg-[#0b0d11]',
    darkBg: '#0b0d11',
    darkSurface: '#181c24',
    darkBorder: '#262c38',
    lightBg: '#fbfbfa',
    lightSurface: '#ffffff',
    lightBorder: '#e5e7eb',
  },
  {
    id: 'midnight',
    name: 'midnight',
    desc: 'deep navy & stars',
    previewClass: 'bg-[#060913]',
    darkBg: '#060913',
    darkSurface: '#12182c',
    darkBorder: '#1e2642',
    lightBg: '#f0f4fc',
    lightSurface: '#ffffff',
    lightBorder: '#c7d5ea',
  },
  {
    id: 'charcoal',
    name: 'charcoal',
    desc: 'soft pitch black',
    previewClass: 'bg-[#101114]',
    darkBg: '#101114',
    darkSurface: '#1c1e24',
    darkBorder: '#272a33',
    lightBg: '#f4f4f5',
    lightSurface: '#ffffff',
    lightBorder: '#d4d4d8',
  },
  {
    id: 'velvet',
    name: 'velvet',
    desc: 'dark rose tint',
    previewClass: 'bg-[#12080f]',
    darkBg: '#12080f',
    darkSurface: '#22151e',
    darkBorder: '#381c30',
    lightBg: '#fff1f5',
    lightSurface: '#ffffff',
    lightBorder: '#fecdd3',
  },
];

export function getSavedAccentColor(): AccentColor {
  if (typeof window === 'undefined') return 'white';
  const saved = localStorage.getItem('naisuru_accent_color') as AccentColor;
  if (saved && ACCENT_CONFIG[saved]) {
    return saved;
  }
  return 'white'; // Default is white
}

export function saveAccentColor(color: AccentColor) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('naisuru_accent_color', color);
  document.documentElement.setAttribute('data-accent', color);
  const cfg = ACCENT_CONFIG[color];
  if (cfg) {
    document.documentElement.style.setProperty('--accent', cfg.hex);
    document.documentElement.style.setProperty('--user-msg-bg', '#000000');
  }
}

export function getSavedBgTheme(): BgTheme {
  if (typeof window === 'undefined') return 'default';
  const saved = localStorage.getItem('naisuru_bg_theme') as BgTheme;
  if (saved && BG_THEMES.some((b) => b.id === saved)) {
    return saved;
  }
  return 'default';
}

export function saveBgTheme(theme: BgTheme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('naisuru_bg_theme', theme);
  document.documentElement.setAttribute('data-bg-theme', theme);
  applySavedThemePreferences();
}

export function applySavedThemePreferences() {
  if (typeof window === 'undefined') return;
  const accent = getSavedAccentColor();
  const bgThemeId = getSavedBgTheme();

  document.documentElement.setAttribute('data-accent', accent);
  document.documentElement.setAttribute('data-bg-theme', bgThemeId);

  const accentCfg = ACCENT_CONFIG[accent] || ACCENT_CONFIG.white;
  document.documentElement.style.setProperty('--accent', accentCfg.hex);
  document.documentElement.style.setProperty('--user-msg-bg', '#000000');

  document.documentElement.classList.add('dark');
  const bgConfig = BG_THEMES.find((t) => t.id === bgThemeId) || BG_THEMES[0];
  document.documentElement.style.setProperty('--bg-primary', bgConfig.darkBg);
  document.documentElement.style.setProperty('--bg-surface', bgConfig.darkSurface);
  document.documentElement.style.setProperty('--border-color', bgConfig.darkBorder);
  document.documentElement.style.setProperty('--companion-msg-bg', bgConfig.darkSurface);
}
