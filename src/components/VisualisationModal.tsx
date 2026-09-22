import { FC, useState, useRef, ChangeEvent } from 'react';
import { X, Upload, RotateCcw, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import {
  WALLPAPER_PRESETS,
  ChatWallpaperSettings,
  saveWallpaperSettings,
} from '../utils/wallpaper';

interface VisualisationModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallpaperSettings: ChatWallpaperSettings;
  onUpdateWallpaper: (settings: ChatWallpaperSettings) => void;
}

export const VisualisationModal: FC<VisualisationModalProps> = ({
  isOpen,
  onClose,
  wallpaperSettings,
  onUpdateWallpaper,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#121620] border border-gray-200 dark:border-gray-800 p-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white lowercase tracking-tight">
                chat visualisation
              </h3>
              <p className="text-[11px] text-gray-400 font-mono">
                wallpapers & atmosphere
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">
          {/* Preset grid */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2.5 block lowercase">
              choose preset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPER_PRESETS.map((preset) => {
                const isSelected = wallpaperSettings.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`relative h-20 rounded-xl overflow-hidden border transition-all text-left p-2 flex flex-col justify-end group ${
                      isSelected
                        ? 'border-white ring-2 ring-white/30 shadow-xs'
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
                    <div className="absolute inset-0 bg-black/40" />

                    <div className="relative z-10 flex items-center justify-between w-full">
                      <span className="text-[11px] font-medium text-white tracking-tight truncate drop-shadow-xs">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                          <Check size={9} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Upload */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 lowercase">
              upload custom image
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-800 dark:text-gray-200 text-xs font-medium transition cursor-pointer"
            >
              <Upload size={12} />
              <span>upload image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Sliders: Opacity & Blur */}
          {wallpaperSettings.id !== 'none' && (
            <div className="space-y-3.5 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-600 dark:text-gray-400 lowercase">
                    opacity
                  </span>
                  <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
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
                  className="w-full accent-white h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-600 dark:text-gray-400 lowercase">
                    blur
                  </span>
                  <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
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
                  className="w-full accent-white h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-mono transition"
          >
            <RotateCcw size={12} />
            <span>reset default</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-black text-xs font-semibold transition"
          >
            done
          </button>
        </div>
      </div>
    </div>
  );
};
