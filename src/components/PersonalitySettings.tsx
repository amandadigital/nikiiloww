import { FC, useState, useRef, ChangeEvent, FormEvent } from 'react';
import {
  RotateCcw,
  Check,
  Upload,
  Image as ImageIcon,
  User,
  HelpCircle,
  Heart,
  Users,
  Sparkles,
} from 'lucide-react';
import {
  CompanionPersonality,
  RelationshipStatus,
  DEFAULT_NIKILOW_NAME,
  DEFAULT_NIKILOW_AVATAR,
  DEFAULT_NIKILOW_PROMPT,
  UserProfile,
} from '../types';

interface PersonalitySettingsProps {
  personality: CompanionPersonality;
  onSave: (updated: CompanionPersonality) => void;
  onResetToDefault: () => void;
  onClose?: () => void;
  userProfile?: UserProfile | null;
}

export const PersonalitySettings: FC<PersonalitySettingsProps> = ({
  personality,
  onSave,
  onClose,
  userProfile,
}) => {
  // Local detached form state - does NOT update global personality while writing
  const [name, setName] = useState(personality.name || DEFAULT_NIKILOW_NAME);
  const [prompt, setPrompt] = useState(personality.prompt || '');
  const [avatarUrl, setAvatarUrl] = useState(personality.avatarUrl || DEFAULT_NIKILOW_AVATAR);
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>(
    personality.relationshipStatus || 'dating_user'
  );
  const [partnerName, setPartnerName] = useState(personality.partnerName || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress and handle image file upload locally into form state
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback('please select an image file');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 360;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(compressedDataUrl);
          setFeedback('image selected. click save personality to apply.');
          setTimeout(() => setFeedback(null), 3000);
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        setIsUploading(false);
        setFeedback('could not read image');
        setTimeout(() => setFeedback(null), 3000);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsUploading(false);
      setFeedback('failed to upload file');
      setTimeout(() => setFeedback(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();

    const cleanName = name.trim() || DEFAULT_NIKILOW_NAME;
    const cleanPrompt = prompt.trim();
    const cleanAvatar = avatarUrl.trim() || DEFAULT_NIKILOW_AVATAR;

    // Apply and save personality across all devices on account
    onSave({
      name: cleanName,
      prompt: cleanPrompt,
      avatarUrl: cleanAvatar,
      relationshipStatus,
      partnerName: partnerName.trim(),
    });

    setFeedback(
      userProfile
        ? 'personality saved across all devices on your account'
        : 'personality saved'
    );

    setTimeout(() => {
      setFeedback(null);
      if (onClose) onClose();
    }, 1200);
  };

  const handleRollback = () => {
    setName(DEFAULT_NIKILOW_NAME);
    setPrompt(DEFAULT_NIKILOW_PROMPT);
    setAvatarUrl(DEFAULT_NIKILOW_AVATAR);
    setRelationshipStatus('dating_user');
    setPartnerName('');
    setFeedback('reverted inputs to niki defaults. click save personality to apply.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-5 space-y-4 select-none">
      {/* Header */}
      <div className="pb-2 border-b border-gray-100 dark:border-gray-800/80">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
          companion personality
        </h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
          write freely. changes only apply when you click save personality.
        </p>
      </div>

      {feedback && (
        <div className="px-3.5 py-2 text-xs font-medium rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-800/60 flex items-center gap-2">
          <Check size={14} className="shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Setup */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            companion avatar
          </label>
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 shadow-xs bg-gray-100 dark:bg-gray-800">
                <img
                  src={avatarUrl || DEFAULT_NIKILOW_AVATAR}
                  alt={name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_NIKILOW_AVATAR;
                  }}
                />
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-[#181d26] hover:bg-gray-200 dark:hover:bg-[#202734] border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload size={13} />
                  <span>{isUploading ? 'uploading...' : 'upload photo'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => setShowUrlInput((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/60 text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ImageIcon size={13} />
                  <span>image url</span>
                </button>
              </div>
            </div>
          </div>

          {showUrlInput && (
            <div className="pt-1">
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-pink-500"
              />
            </div>
          )}
        </div>

        {/* Companion Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            companion name
          </label>
          <div className="relative">
            <User
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. niki, alice, eva"
              maxLength={32}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-pink-500"
            />
          </div>
        </div>

        {/* Relationship & Boyfriend setting */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-gray-50 dark:bg-[#12161f] border border-gray-200/80 dark:border-gray-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Heart size={14} className="text-rose-500 fill-rose-500/20" />
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                relationship & boyfriend
              </label>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
              {relationshipStatus === 'dating_user'
                ? `dating @${userProfile?.username || 'you'}`
                : relationshipStatus === 'custom'
                ? `dating ${partnerName || 'custom'}`
                : relationshipStatus === 'friends'
                ? 'friends'
                : 'single'}
            </span>
          </div>

          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
            Choose who she dates. You can set her boyfriend to be the profile talking right now, or customize who she or any companion you create is dating.
          </p>

          {/* Relationship mode choices */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setRelationshipStatus('dating_user')}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer border ${
                relationshipStatus === 'dating_user'
                  ? 'bg-rose-500/15 border-rose-500/60 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold'
                  : 'bg-white dark:bg-[#161a22] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <Heart
                size={14}
                className={
                  relationshipStatus === 'dating_user'
                    ? 'fill-rose-500 text-rose-500'
                    : ''
                }
              />
              <span className="text-[11px]">date me</span>
              <span className="text-[9px] opacity-70">
                @{userProfile?.username || 'current'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRelationshipStatus('custom')}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer border ${
                relationshipStatus === 'custom'
                  ? 'bg-rose-500/15 border-rose-500/60 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold'
                  : 'bg-white dark:bg-[#161a22] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <User size={14} />
              <span className="text-[11px]">custom</span>
              <span className="text-[9px] opacity-70">specific user</span>
            </button>

            <button
              type="button"
              onClick={() => setRelationshipStatus('friends')}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer border ${
                relationshipStatus === 'friends'
                  ? 'bg-rose-500/15 border-rose-500/60 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold'
                  : 'bg-white dark:bg-[#161a22] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <Users size={14} />
              <span className="text-[11px]">friends</span>
              <span className="text-[9px] opacity-70">platonic</span>
            </button>

            <button
              type="button"
              onClick={() => setRelationshipStatus('single')}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer border ${
                relationshipStatus === 'single'
                  ? 'bg-rose-500/15 border-rose-500/60 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold'
                  : 'bg-white dark:bg-[#161a22] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <Sparkles size={14} />
              <span className="text-[11px]">single</span>
              <span className="text-[9px] opacity-70">independent</span>
            </button>
          </div>

          {/* Details & contextual options based on selected status */}
          {relationshipStatus === 'dating_user' && (
            <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <Heart
                size={14}
                className="shrink-0 mt-0.5 fill-rose-500 text-rose-500"
              />
              <div className="space-y-0.5">
                <div className="font-semibold text-[11px] text-rose-600 dark:text-rose-300">
                  Boyfriend: @{userProfile?.username || 'your profile'} (Profile talking right now)
                </div>
                <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  She will recognize you as her boyfriend, treating you with girlfriend affection, warmth, loyalty, and sweet romantic nicknames.
                </p>
              </div>
            </div>
          )}

          {relationshipStatus === 'custom' && (
            <div className="mt-2 space-y-1">
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300">
                Partner / Boyfriend Username or Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g. @misiori or @alex"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-rose-500"
                />
              </div>
              <p className="text-[10px] text-gray-400">
                She will stay loyal to this specific partner. If that user talks to her, she treats them as her boyfriend.
              </p>
            </div>
          )}

          {relationshipStatus !== 'dating_user' && userProfile?.username && (
            <button
              type="button"
              onClick={() => setRelationshipStatus('dating_user')}
              className="w-full mt-1.5 py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Heart size={12} className="fill-rose-500 text-rose-500" />
              <span>Make my profile (@{userProfile.username}) her boyfriend</span>
            </button>
          )}
        </div>

        {/* Prompt / Instructions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              personality prompt / instructions
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-mono">
                {prompt.length} chars
              </span>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={8}
            placeholder="describe how your companion should speak, behave, tone, opinions, or specific rules..."
            className="w-full p-3 text-xs font-mono leading-relaxed bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-pink-500 resize-none"
          />

          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <HelpCircle size={12} className="shrink-0" />
            <span>
              shortcut: press ⌘+enter or ctrl+enter to save anytime.
            </span>
          </p>
        </div>

        {/* Actions row */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Roll back button */}
          <button
            type="button"
            onClick={handleRollback}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Restore original Niki defaults"
          >
            <RotateCcw size={13} />
            <span>roll back to niki</span>
          </button>

          {/* Save button */}
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            <Check size={14} />
            <span>save personality</span>
          </button>
        </div>
      </form>
    </div>
  );
};
