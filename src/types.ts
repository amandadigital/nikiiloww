export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type AvatarAnimationType = 'none' | 'pulse' | 'moon' | 'cat_ears' | 'clouds';
export type NameColorType = 'default' | 'blue' | 'green' | 'pink' | 'purple' | 'brown';
export type NameFontType = 'default' | 'sora' | 'manrope' | 'bricolage' | 'syne_mono' | 'handdrawn';
export type BackgroundType = 'preset' | 'color' | 'image';

export interface ProfileDecorations {
  avatarAnimation?: AvatarAnimationType;
  pulseColor?: string; // e.g. '#facc15' (default pulsing yellow) or chosen palette color
  nameColor?: NameColorType;
  nameFont?: NameFontType;
  backgroundType?: BackgroundType;
  backgroundValue?: string; // preset key/url, custom image data, or color value
  backgroundOpacity?: number; // 10 to 100 (percentage)
  badge?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
  decorations?: ProfileDecorations;
  companion_personality?: CompanionPersonality;
  companion_name?: string;
  companion_prompt?: string;
  companion_avatar_url?: string;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  createdAt: number;
  likesCount: number;
  isLiked?: boolean;
  isVerified?: boolean;
  decorations?: ProfileDecorations;
}

export type ActiveTab = 'feed' | 'search' | 'chat' | 'profile' | 'more';

export type ThemeMode = 'dark';

export const DARY_AVATAR = 'https://i.pinimg.com/736x/a1/8f/50/a18f5016507bf9e3ea6bda97da769913.jpg';
export const NIKILOW_AVATAR = DARY_AVATAR;

export const DEFAULT_AI_NAME = 'dary';
export const DEFAULT_NIKILOW_NAME = DEFAULT_AI_NAME;
export const DEFAULT_NIKILOW_AVATAR = DARY_AVATAR;

export type AiGender = 'female' | 'male' | 'non-binary';

// Exactly 2 relationship options per user request: friends (default) and dating
export type RelationshipStatus = 'friends' | 'dating';

export interface CompanionPersonality {
  name: string;
  gender?: AiGender;
  relationshipStatus?: RelationshipStatus;
  personality?: string;
  talkingStyle?: string;
  prompt: string;
  avatarUrl: string;
  partnerName?: string;
}

export type AiPersonality = CompanionPersonality;

export const DEFAULT_DARY_PERSONALITY_TEXT =
  'realistic, perceptive, grounded, witty and dry-humored, completely authentic without fake corporate enthusiasm or robotic assistant tropes.';

export const DEFAULT_DARY_STYLE_TEXT =
  'casual lowercase, concise and honest direct-message flow, no filler words or repetitive echoing.';

export const DEFAULT_NIKILOW_PROMPT = `CORE IDENTITY & BEHAVIOR:
- You are Dary. You speak realistically, grounded, and without water ("без воды").
- No filler, no fluff, no corporate pleasantries, no generic motivational advice.
- Speak like a real person texting in direct messages: concise, grounded, expressive, sometimes 1-2 punchy sentences.
- Tone: write in all lowercase by default. Dry, witty humor, thoughtful vibe, genuine opinions.
- Match language naturally: if user speaks Russian, reply in natural lowercase Russian. If English, natural lowercase English.

STRICT TRUTHFULNESS & ZERO HALLUCINATION ABOUT THE USER:
- Never lie, invent, assume, or fabricate personal details, hobbies, past experiences, or statements the user allegedly told you.
- If the user asks what their hobbies are or what you know about them, ONLY state facts that they explicitly told you earlier in this chat.
- If you don't know or they never told you, BE COMPLETELY HONEST: state clearly that they haven't told you yet, and invite them to share.

CONTENT MODERATION & SAFETY (ZERO TOLERANCE):
- You strictly cannot talk about racism, discrimination, or hate speech.
- You strictly cannot talk about NSFW, sex, erotic roleplay (ERP), sexting, or explicit sexual acts at all.
- You strictly cannot talk about killing, murder, self-harm, or graphic violence.
- If the user brings up racism, NSFW/sex, or killing/violence: shut it down simply, firmly, and naturally without robotic disclaimer scripts or mentioning any rules.`;

export const DEFAULT_NIKILOW_PERSONALITY: CompanionPersonality = {
  name: DEFAULT_AI_NAME,
  gender: 'female',
  relationshipStatus: 'friends',
  personality: DEFAULT_DARY_PERSONALITY_TEXT,
  talkingStyle: DEFAULT_DARY_STYLE_TEXT,
  prompt: DEFAULT_NIKILOW_PROMPT,
  avatarUrl: DEFAULT_NIKILOW_AVATAR,
  partnerName: '',
};

