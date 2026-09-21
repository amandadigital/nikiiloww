import { FC, useState, useRef, ChangeEvent } from 'react';
import { Upload, RotateCcw, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import {
  WALLPAPER_PRESETS,
  ChatWallpaperSettings,
  saveWallpaperSettings,
} from '../utils/wallpaper';

interface VisualisationSettingsProps {
  wallpaperSettings: ChatWallpaperSettings;
  onUpdateWallpaper: (settings: ChatWallpaperSettings) => void;
  onClose?: () => void;
}

export const VisualisationSettings: FC<VisualisationSettingsProps> = ({
  wallpaperSettings,
  onUpdateWallpaper,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPreset = (presetId: string) => {
    const updated: ChatWallpaperSettings = {
      ...wallpaperSettings,
      id: presetId,
    };
    onUpdateWallpaper(updated);
    saveWallpaperSettings(updated);
  };

  const handleOpacityChange = (val: number) => {
    const updated: ChatWallpaperSettings = {
      ...wallpaperSettings,
      opacity: val,
    };
    onUpdateWallpaper(updated);
    saveWallpaperSettings(updated);
  };

  const handleBlurChange = (val: number) => {
    const updated: ChatWallpaperSettings = {
      ...wallpaperSettings,
      blur: val,
    };
    onUpdateWallpaper(updated);
    saveWallpaperSettings(updated);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('image file is too large (max 8MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated: ChatWallpaperSettings = {
        ...wallpaperSettings,
        id: 'custom',
        customUrl: dataUrl,
      };
      onUpdateWallpaper(updated);
      saveWallpaperSettings(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    const resetSettings: ChatWallpaperSettings = {
      id: 'none',
      customUrl: undefined,
      opacity: 0.35,
      blur: 3,
    };
    onUpdateWallpaper(resetSettings);
    saveWallpaperSettings(resetSettings);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 select-none">
      {/* Introduction info */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white lowercase">
            chat wallpapers
          </h4>
          <p className="text-[11px] text-gray-400 font-mono">
            choose atmosphere or upload yours
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-mono transition"
        >
          <RotateCcw size={11} />
          <span>reset</span>
        </button>
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-2">
        {WALLPAPER_PRESETS.map((preset) => {
          const isSelected = wallpaperSettings.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`relative h-20 rounded-xl overflow-hidden border transition-all text-left p-1.5 flex flex-col justify-end group cursor-pointer ${
                isSelected
                  ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-xs'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {preset.isImage ? (
                <img
                  src={preset.thumbnail}
                  alt={preset.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`absolute inset-0 ${preset.thumbnail}`}
                  style={{ background: preset.bgStyle !== 'none' ? preset.bgStyle : undefined }}
                />
              )}
              <div className="absolute inset-0 bg-black/45" />

              <div className="relative z-10 flex items-center justify-between w-full">
                <span className="text-[10px] font-medium text-white tracking-tight truncate drop-shadow-xs">
                  {preset.name}
                </span>
                {isSelected && (
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <Check size={8} strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Upload Custom Wallpaper */}
      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 lowercase">
          custom wallpaper
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-medium transition cursor-pointer"
        >
          <Upload size={12} />
          <span>upload file</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Opacity & Blur Sliders */}
      {wallpaperSettings.id !== 'none' && (
        <div className="space-y-3 pt-1">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400 lowercase">
                opacity
              </span>
              <span className="font-mono text-gray-400 text-[11px]">
                {Math.round(wallpaperSettings.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={wallpaperSettings.opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400 lowercase">
                blur
              </span>
              <span className="font-mono text-gray-400 text-[11px]">
                {wallpaperSettings.blur}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              step="1"
              value={wallpaperSettings.blur}
              onChange={(e) => handleBlurChange(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
