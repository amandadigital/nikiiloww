import { FC, useState, useRef, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Check,
  AlertCircle,
  Sparkles,
  User,
  Palette,
  Moon,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import {
  UserProfile,
  ProfileDecorations,
  AvatarAnimationType,
  NameColorType,
  NameFontType,
} from '../types';
import { updateProfile } from '../lib/supabase';
import { VerifiedBadge } from './VerifiedBadge';
import { DecoratedAvatar } from './DecoratedAvatar';
import { DecoratedName } from './DecoratedName';
import {
  PROFILE_BACKGROUND_PRESETS,
  PROFILE_BACKGROUND_COLORS,
  NAME_COLOR_MAP,
  NAME_FONT_MAP,
  DEFAULT_PULSE_COLOR,
  PULSE_COLOR_PALETTE,
  getBackgroundOpacity,
  getBackgroundStyle,
} from '../utils/decorations';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const EditProfileModal: FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
}) => {
  // Navigation tabs: 'info' vs 'deco'
  const [activeSection, setActiveSection] = useState<'info' | 'deco'>('info');

  // Info fields
  const [name, setName] = useState(userProfile.name || '');
  const [username, setUsername] = useState(userProfile.username || '');
  const [bio, setBio] = useState(userProfile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatar_url || '');

  // Deco fields
  const existingDeco: ProfileDecorations = userProfile.decorations || {};
  const [avatarAnimation, setAvatarAnimation] = useState<AvatarAnimationType>(
    existingDeco.avatarAnimation || 'none'
  );
  const [pulseColor, setPulseColor] = useState<string>(
    existingDeco.pulseColor || DEFAULT_PULSE_COLOR
  );
  const [nameColor, setNameColor] = useState<NameColorType>(
    existingDeco.nameColor || 'default'
  );
  const [nameFont, setNameFont] = useState<NameFontType>(
    existingDeco.nameFont || 'default'
  );
  const [backgroundType, setBackgroundType] = useState<'preset' | 'color'>(
    existingDeco.backgroundType || 'preset'
  );
  const [backgroundValue, setBackgroundValue] = useState<string>(
    existingDeco.backgroundValue || ''
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(
    typeof existingDeco.backgroundOpacity === 'number'
      ? existingDeco.backgroundOpacity
      : 100
  );
  // Check if current user is an authentic verified user
  const isVerifiedAccount =
    Boolean(userProfile.is_verified) ||
    userProfile.username.toLowerCase() === 'kodewt';

  // Only verified users have the ability to enable and show the verified badge
  const [badge, setBadge] = useState<boolean>(() => {
    return isVerifiedAccount && existingDeco.badge !== false;
  });

  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentUsernameLower = username.toLowerCase().replace(/^@/, '');
  const isUserVerifiedNow =
    isVerifiedAccount || currentUsernameLower === 'kodewt';

  const currentDecorations: ProfileDecorations = {
    avatarAnimation,
    pulseColor,
    nameColor,
    nameFont,
    backgroundType,
    backgroundValue,
    backgroundOpacity,
    badge: isUserVerifiedNow ? badge : false,
  };

  const handleAvatarFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('image must be less than 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const rawUrl = event.target.result as string;
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 160;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/jpeg', 0.8);
              setAvatarUrl(compressed);
              setError(null);
              return;
            }
          } catch {
            // fallback
          }
          if (rawUrl.length < 50000) {
            setAvatarUrl(rawUrl);
          }
          setError(null);
        };
        img.onerror = () => {
          if (rawUrl.length < 50000) {
            setAvatarUrl(rawUrl);
          }
          setError(null);
        };
        img.src = rawUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();

    const trimmedUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (!trimmedUsername) {
      setError('username cannot be empty');
      return;
    }

    const updatedProfile: UserProfile = {
      ...userProfile,
      name: name.trim() || trimmedUsername,
      username: trimmedUsername,
      bio: bio.trim(),
      avatar_url: avatarUrl,
      is_verified: trimmedUsername === 'kodewt' || userProfile.is_verified,
      decorations: currentDecorations,
    };

    // Instant visual update & close modal
    onProfileUpdated(updatedProfile);
    onClose();

    // Persist to backend and storage
    updateProfile(userProfile.id, {
      name: name.trim() || trimmedUsername,
      username: trimmedUsername,
      bio: bio.trim(),
      avatar_url: avatarUrl,
      decorations: currentDecorations,
    } as any).catch((err) => {
      console.warn('Profile background update notice:', err);
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-[#151922] border border-gray-200/90 dark:border-gray-800/90 rounded-3xl shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800/80">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">
              edit profile
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab navigation: info vs deco */}
          <div className="px-5 pt-3 pb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('info')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSection === 'info'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <User size={13} />
              <span>info</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('deco')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSection === 'deco'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <Sparkles size={13} />
              <span>deco</span>
            </button>
          </div>

          {/* Form scrollable area */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION 1: INFO */}
            {activeSection === 'info' && (
              <div className="space-y-4">
                {/* Avatar file upload (pure upload, no URL input) */}
                <div className="flex flex-col items-center justify-center gap-2 pt-1 pb-2">
                  <div className="relative group cursor-pointer">
                    <DecoratedAvatar
                      src={avatarUrl}
                      name={name || username}
                      animation={avatarAnimation}
                      size="xl"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 rounded-full bg-gray-900/85 hover:bg-gray-900 text-white shadow-md cursor-pointer transition-transform hover:scale-105"
                      title="upload photo"
                    >
                      <Camera size={14} />
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-pink-500 hover:underline font-medium cursor-pointer"
                  >
                    upload new photo
                  </button>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    display name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="your name"
                    maxLength={40}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#181d26] border border-gray-200/90 dark:border-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                {/* Username */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      username
                    </label>
                    {isUserVerifiedNow && (
                      <span className="flex items-center gap-1 text-[11px] text-pink-500 font-medium">
                        <VerifiedBadge size="sm" />
                        <span>verified badge</span>
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs text-gray-400">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      maxLength={30}
                      required
                      className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#181d26] border border-gray-200/90 dark:border-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="write something about yourself..."
                    maxLength={160}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#181d26] border border-gray-200/90 dark:border-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-pink-500 resize-none"
                  />
                  <span className="text-[10px] text-gray-400 float-right">
                    {bio.length}/160
                  </span>
                </div>
              </div>
            )}

            {/* SECTION 2: DECO */}
            {activeSection === 'deco' && (
              <div className="space-y-5">
                {/* Live Preview Card (Chosen background fully replaces gray) */}
                <div
                  className={`p-4 rounded-2xl relative overflow-hidden transition-all duration-300 ${
                    backgroundValue
                      ? 'border border-white/20 text-white shadow-md'
                      : 'bg-white dark:bg-[#181d26] border border-gray-200 dark:border-gray-800'
                  }`}
                  style={backgroundValue ? getBackgroundStyle(currentDecorations) : undefined}
                >
                  {/* Subtle dimming only if opacity is explicitly reduced below 100% */}
                  {backgroundValue && backgroundOpacity < 100 && (
                    <div
                      className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300"
                      style={{ opacity: 1 - backgroundOpacity / 100 }}
                    />
                  )}

                  {/* Foreground Content */}
                  <div className="relative z-10 flex items-center gap-3.5 text-white">
                    <DecoratedAvatar
                      src={avatarUrl}
                      name={name || username}
                      animation={avatarAnimation}
                      pulseColor={pulseColor}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <DecoratedName
                          name={name || 'your name'}
                          decorations={currentDecorations}
                          onCustomBg={Boolean(backgroundValue)}
                          className="text-base font-bold drop-shadow-sm"
                        />
                        {isUserVerifiedNow && badge && <VerifiedBadge size="sm" />}
                      </div>
                      <p className="text-xs text-white/80 font-mono mt-0.5">
                        @{username || 'username'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1. Avatar Animation Section (3-second animations) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      avatar animation (3s loop)
                    </label>
                    <span className="text-[10px] font-mono text-gray-400">
                      duration: 3s
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* None */}
                    <button
                      type="button"
                      onClick={() => setAvatarAnimation('none')}
                      className={`p-2.5 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer border ${
                        avatarAnimation === 'none'
                          ? 'bg-pink-500/15 border-pink-500 text-pink-600 dark:text-pink-400 font-semibold'
                          : 'bg-gray-50 dark:bg-[#181d26] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-bold">Ø</span>
                      <span>none</span>
                    </button>

                    {/* Color Ring (Static non-pulsing accent) */}
                    <button
                      type="button"
                      onClick={() => setAvatarAnimation('pulse')}
                      className={`p-2.5 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer border ${
                        avatarAnimation === 'pulse' || avatarAnimation === 'moon'
                          ? 'bg-amber-500/15 border-amber-400 text-amber-500 font-semibold shadow-xs'
                          : 'bg-gray-50 dark:bg-[#181d26] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        <span
                          className="w-3.5 h-3.5 rounded-full border-2"
                          style={{
                            borderColor: pulseColor,
                            backgroundColor: `${pulseColor}22`,
                            boxShadow: `0 0 6px ${pulseColor}66`,
                          }}
                        />
                      </div>
                      <span>color ring</span>
                    </button>

                    {/* Cat ears */}
                    <button
                      type="button"
                      onClick={() => setAvatarAnimation('cat_ears')}
                      className={`p-2.5 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer border ${
                        avatarAnimation === 'cat_ears'
                          ? 'bg-pink-500/15 border-pink-400 text-pink-500 font-semibold shadow-xs'
                          : 'bg-gray-50 dark:bg-[#181d26] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-base leading-none">🐱</span>
                      <span>cat ears</span>
                    </button>

                    {/* Clouds */}
                    <button
                      type="button"
                      onClick={() => setAvatarAnimation('clouds')}
                      className={`p-2.5 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer border ${
                        avatarAnimation === 'clouds'
                          ? 'bg-sky-500/15 border-sky-400 text-sky-500 font-semibold shadow-xs'
                          : 'bg-gray-50 dark:bg-[#181d26] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <Cloud size={16} className="text-sky-400 fill-sky-400/30" />
                      <span>clouds</span>
                    </button>
                  </div>

                  {/* Pulse Color Palette Picker when pulsing animation is active */}
                  {(avatarAnimation === 'pulse' || avatarAnimation === 'moon') && (
                    <div className="mt-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-[#12161f] border border-gray-200/80 dark:border-gray-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <Palette size={13} className="text-amber-500" />
                          <span>pulse color palette</span>
                        </span>
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold"
                          style={{
                            color: pulseColor,
                            borderColor: `${pulseColor}66`,
                            backgroundColor: `${pulseColor}15`,
                          }}
                        >
                          {PULSE_COLOR_PALETTE.find((p) => p.color === pulseColor)?.name || pulseColor}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {PULSE_COLOR_PALETTE.map((p) => {
                          const isSelected = pulseColor === p.color;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPulseColor(p.color)}
                              title={p.name}
                              className={`h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border relative ${
                                isSelected
                                  ? 'ring-2 ring-pink-500 scale-105 border-white shadow-md'
                                  : 'border-transparent hover:scale-105 opacity-85 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: p.color }}
                            >
                              {isSelected && (
                                <Check
                                  size={14}
                                  className={p.id === 'yellow' || p.id === 'white' ? 'text-black' : 'text-white'}
                                  strokeWidth={3}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Name Customization: Color & Font */}
                <div className="space-y-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-[#12161f] border border-gray-200/80 dark:border-gray-800/80">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    name color & font
                  </label>

                  {/* Colors */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      color
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {(['default', 'blue', 'green', 'pink', 'purple', 'brown'] as NameColorType[]).map((c) => {
                        const isSelected = nameColor === c;
                        const meta = NAME_COLOR_MAP[c];
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNameColor(c)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-white dark:bg-[#1e2430] border-pink-500 shadow-xs ring-1 ring-pink-500/50 font-bold'
                                : 'bg-white/80 dark:bg-[#181d26] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: meta.colorCode === 'currentColor' ? '#888' : meta.colorCode,
                              }}
                            />
                            <span className={meta.textClass}>{c}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="space-y-1.5 pt-1 border-t border-gray-200/60 dark:border-gray-800/60">
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      font
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {(
                        [
                          'default',
                          'sora',
                          'manrope',
                          'bricolage',
                          'syne_mono',
                          'handdrawn',
                        ] as NameFontType[]
                      ).map((f) => {
                        const isSelected = nameFont === f;
                        const meta = NAME_FONT_MAP[f];
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setNameFont(f)}
                            className={`px-2.5 py-2 rounded-xl text-xs text-left transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-white dark:bg-[#1e2430] border-pink-500 shadow-xs ring-1 ring-pink-500/50 font-semibold'
                                : 'bg-white/80 dark:bg-[#181d26] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                            }`}
                          >
                            <span className={`block truncate ${meta.fontClass}`}>
                              {meta.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Background: Presets & Colors */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      background
                    </label>
                    {backgroundValue && (
                      <button
                        type="button"
                        onClick={() => {
                          setBackgroundValue('');
                        }}
                        className="text-[11px] text-pink-500 hover:underline cursor-pointer"
                      >
                        clear background
                      </button>
                    )}
                  </div>

                  {/* Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      presets
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PROFILE_BACKGROUND_PRESETS.map((preset) => {
                        const isSelected = backgroundValue === preset.id || backgroundValue === preset.value;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setBackgroundType('preset');
                              setBackgroundValue(preset.id);
                            }}
                            className={`relative h-14 rounded-xl overflow-hidden text-left p-2 flex flex-col justify-end transition-all cursor-pointer border ${
                              isSelected
                                ? 'ring-2 ring-pink-500 border-transparent shadow-md'
                                : 'border-gray-200 dark:border-gray-800 hover:opacity-90'
                            }`}
                          >
                            {/* Preset background visual */}
                            {preset.type === 'image' ? (
                              <img
                                src={preset.value}
                                alt={preset.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 w-full h-full"
                                style={{ background: preset.value }}
                              />
                            )}
                            <div className="absolute inset-0 bg-black/45" />

                            <div className="relative z-10 flex items-center justify-between w-full">
                              <span className="text-[10px] font-semibold text-white drop-shadow-sm truncate">
                                {preset.name}
                              </span>
                              {isSelected && (
                                <CheckCircle2 size={12} className="text-pink-400 shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      solid & gradient colors
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {PROFILE_BACKGROUND_COLORS.map((col) => {
                        const isSelected = backgroundValue === col.id;
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => {
                              setBackgroundType('color');
                              setBackgroundValue(col.id);
                            }}
                            className={`h-10 rounded-xl overflow-hidden p-2 flex items-center justify-between text-white text-xs font-semibold transition-all cursor-pointer border ${
                              isSelected
                                ? 'ring-2 ring-pink-500 border-white shadow-md'
                                : 'border-transparent hover:opacity-90'
                            }`}
                            style={{ background: col.value }}
                          >
                            <span>{col.name}</span>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manage Opacity of Background */}
                  {backgroundValue && (
                    <div className="mt-2.5 p-3.5 rounded-2xl bg-gray-50 dark:bg-[#12161f] border border-gray-200/80 dark:border-gray-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                          background opacity
                        </label>
                        <span className="text-xs font-mono font-bold text-pink-500">
                          {backgroundOpacity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={backgroundOpacity}
                        onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                        className="w-full accent-pink-500 cursor-pointer h-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>10% (subtle)</span>
                        <span>50%</span>
                        <span>100% (vibrant)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Verified Badge Toggle - strictly available only to verified accounts */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                    isUserVerifiedNow
                      ? 'bg-gray-50 dark:bg-[#12161f] border-gray-200/80 dark:border-gray-800/80'
                      : 'bg-gray-100/60 dark:bg-[#10131a]/60 border-gray-200/60 dark:border-gray-800/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-500 flex items-center justify-center shrink-0">
                      <VerifiedBadge size="md" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                          verified badge
                        </span>
                        {!isUserVerifiedNow && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            verified accounts only
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {isUserVerifiedNow
                          ? 'display verified badge next to your name across your profile & feed posts'
                          : 'only verified accounts have the ability to make the verified badge seen for everyone'}
                      </p>
                    </div>
                  </div>

                  {isUserVerifiedNow ? (
                    <button
                      type="button"
                      onClick={() => setBadge(!badge)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        badge ? 'bg-pink-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      role="switch"
                      aria-checked={badge}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          badge ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 px-2.5 py-1 rounded-lg bg-gray-200/70 dark:bg-gray-800/70 select-none">
                      locked
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                save changes
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
