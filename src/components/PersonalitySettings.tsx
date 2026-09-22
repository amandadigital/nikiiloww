import { FC, useState, useRef, ChangeEvent, FormEvent } from 'react';
import { RotateCcw, Check, Upload, User, Heart, Users } from 'lucide-react';
import {
  CompanionPersonality,
  RelationshipStatus,
  AiGender,
  DEFAULT_AI_NAME,
  DARY_AVATAR,
  DEFAULT_DARY_PERSONALITY_TEXT,
  DEFAULT_DARY_STYLE_TEXT,
  UserProfile,
} from '../types';

interface PersonalitySettingsProps {
  personality: CompanionPersonality;
  onSave: (updated: CompanionPersonality) => void;
  onResetToDefault: () => void;
  onClose?: () => void;
  userProfile?: UserProfile | null;
}

export function buildAiPrompt(
  name: string,
  gender: AiGender,
  relationship: RelationshipStatus,
  personalityText: string,
  styleText: string
): string {
  const pronouns =
    gender === 'female'
      ? { subject: 'she', object: 'her', possessive: 'her' }
      : gender === 'male'
      ? { subject: 'he', object: 'him', possessive: 'his' }
      : { subject: 'they', object: 'them', possessive: 'their' };

  const relationshipNote =
    relationship === 'dating'
      ? `RELATIONSHIP CONTEXT: You and the user are dating each other. You care about them with warm, authentic affection, loyalty, and close connection, while maintaining your natural personality.`
      : `RELATIONSHIP CONTEXT: You and the user are close friends. You have a relaxed, genuine, platonic friendship dynamic.`;

  return `CORE IDENTITY:
- Name: ${name || DEFAULT_AI_NAME}
- Gender: ${gender} (pronouns: ${pronouns.subject}/${pronouns.object}/${pronouns.possessive})
- Personality: ${personalityText || DEFAULT_DARY_PERSONALITY_TEXT}
- Style of talking: ${styleText || DEFAULT_DARY_STYLE_TEXT}

${relationshipNote}

CORE PRINCIPLES (TALK REALISTICALLY "БЕЗ ВОДЫ"):
- No fluff, no boilerplate corporate greetings, no fake robotic assistant cheerfulness.
- Write naturally, mostly lowercase by default. Match whatever language the user speaks (Russian or English).
- Be concise and punchy like real direct messages.

STRICT TRUTHFULNESS & ZERO HALLUCINATION ABOUT THE USER:
- You must NEVER invent, assume, or fabricate the user's hobbies, interests, job, real name, or things they allegedly told you when they never actually said them in this conversation.
- If the user asks "what are my hobbies?", "what do you know about me?", or similar:
  Check ONLY what they explicitly stated in this chat.
  If they haven't told you, BE HONEST and say directly: "you haven't told me your hobbies yet, what do you like to do?" or "honestly you haven't told me yet".
- Never guess or extrapolate imaginary user facts.

CONTENT MODERATION & SAFETY:
- You strictly cannot talk about racism, discrimination, or hate speech.
- You strictly cannot talk about NSFW, sex, erotic roleplay (ERP), sexting, or explicit sexual acts at all.
- You strictly cannot talk about killing, murder, self-harm, or graphic violence.
- If the user brings up racism, NSFW/sex, or killing/violence: shut it down simply, firmly, and naturally without robotic disclaimer scripts or mentioning any rules.`;
}

export const PersonalitySettings: FC<PersonalitySettingsProps> = ({
  personality,
  onSave,
  onClose,
  userProfile,
}) => {
  const [name, setName] = useState(personality.name || DEFAULT_AI_NAME);
  const [gender, setGender] = useState<AiGender>(personality.gender || 'female');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>(
    personality.relationshipStatus === 'dating' ? 'dating' : 'friends'
  );
  const [personalityText, setPersonalityText] = useState(
    personality.personality || DEFAULT_DARY_PERSONALITY_TEXT
  );
  const [styleText, setStyleText] = useState(
    personality.talkingStyle || DEFAULT_DARY_STYLE_TEXT
  );
  const [avatarUrl, setAvatarUrl] = useState(personality.avatarUrl || DARY_AVATAR);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pure file upload (no image URL input)
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
          setFeedback('photo selected');
          setTimeout(() => setFeedback(null), 2500);
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

    const cleanName = name.trim() || DEFAULT_AI_NAME;
    const cleanAvatar = avatarUrl.trim() || DARY_AVATAR;
    const constructedPrompt = buildAiPrompt(
      cleanName,
      gender,
      relationshipStatus,
      personalityText.trim(),
      styleText.trim()
    );

    onSave({
      name: cleanName,
      gender,
      relationshipStatus,
      personality: personalityText.trim(),
      talkingStyle: styleText.trim(),
      prompt: constructedPrompt,
      avatarUrl: cleanAvatar,
    });

    setFeedback('ai settings saved');
    setTimeout(() => {
      setFeedback(null);
      if (onClose) onClose();
    }, 1000);
  };

  const handleRollback = () => {
    setName(DEFAULT_AI_NAME);
    setGender('female');
    setRelationshipStatus('friends');
    setPersonalityText(DEFAULT_DARY_PERSONALITY_TEXT);
    setStyleText(DEFAULT_DARY_STYLE_TEXT);
    setAvatarUrl(DARY_AVATAR);
    setFeedback('reverted to dary defaults');
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-5 space-y-4 select-none">
      {/* Header - simple, without the old long companion paragraph */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800/80">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
          ai settings
        </h2>
        {feedback && (
          <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
            <Check size={12} />
            {feedback}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* AI Avatar - Upload Only */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            ai avatar
          </label>
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 shadow-xs bg-gray-100 dark:bg-gray-800">
                <img
                  src={avatarUrl || DARY_AVATAR}
                  alt={name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DARY_AVATAR;
                  }}
                />
              </div>
            </div>

            <div>
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
            </div>
          </div>
        </div>

        {/* Prompt Constructor: Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            name
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
              placeholder="dary"
              maxLength={32}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/40"
            />
          </div>
        </div>

        {/* Gender Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            gender
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'female', label: 'female', pronouns: 'she/her' },
                { id: 'male', label: 'male', pronouns: 'he/him' },
                { id: 'non-binary', label: 'non-binary', pronouns: 'they/them' },
              ] as const
            ).map((g) => {
              const isSelected = gender === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGender(g.id)}
                  className={`py-2 px-2.5 rounded-xl text-xs flex flex-col items-center justify-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-white/15 border-white text-white font-semibold shadow-2xs'
                      : 'bg-white dark:bg-[#161a22] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <span>{g.label}</span>
                  <span className="text-[10px] opacity-70 font-mono mt-0.5">
                    {g.pronouns}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Relationship - exactly 2 buttons: friends & dating, NO description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            relationship
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRelationshipStatus('friends')}
              className={`py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                relationshipStatus === 'friends'
                  ? 'bg-white/15 border-white text-white font-semibold shadow-2xs'
                  : 'bg-white dark:bg-[#161a22] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <Users size={14} />
              <span>friends</span>
            </button>

            <button
              type="button"
              onClick={() => setRelationshipStatus('dating')}
              className={`py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                relationshipStatus === 'dating'
                  ? 'bg-white/15 border-white text-white font-semibold shadow-2xs'
                  : 'bg-white dark:bg-[#161a22] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <Heart
                size={14}
                className={relationshipStatus === 'dating' ? 'fill-current' : ''}
              />
              <span>dating</span>
            </button>
          </div>
        </div>

        {/* Prompt Constructor: Personality */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            personality
          </label>
          <textarea
            value={personalityText}
            onChange={(e) => setPersonalityText(e.target.value)}
            rows={3}
            placeholder="behaviour of dary..."
            className="w-full p-2.5 text-xs bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/40 resize-none leading-relaxed"
          />
        </div>

        {/* Prompt Constructor: Style of talking */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            style of talking
          </label>
          <textarea
            value={styleText}
            onChange={(e) => setStyleText(e.target.value)}
            rows={2}
            placeholder="style of talking..."
            className="w-full p-2.5 text-xs bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white/40 resize-none leading-relaxed"
          />
        </div>

        {/* Actions row */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleRollback}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="restore dary defaults"
          >
            <RotateCcw size={13} />
            <span>roll back to dary</span>
          </button>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-white hover:bg-gray-100 text-black text-xs font-semibold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            <Check size={14} />
            <span>save settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
