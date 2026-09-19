import {
  ChatSession,
  ThemeMode,
  CompanionPersonality,
  DEFAULT_NIKILOW_NAME,
  DEFAULT_NIKILOW_AVATAR,
  DEFAULT_NIKILOW_PROMPT,
} from '../types';

const STORAGE_CHATS_KEY = 'nikilow_chats_v1';
const STORAGE_ACTIVE_CHAT_KEY = 'nikilow_active_chat_id';
const STORAGE_THEME_KEY = 'nikilow_theme_mode';
const STORAGE_PERSONALITY_KEY = 'nikilow_companion_personality_v1';

export function getChatStorageKey(userId?: string | null): string {
  return userId ? `nikilow_chats_user_${userId}` : STORAGE_CHATS_KEY;
}

export function getActiveChatStorageKey(userId?: string | null): string {
  return userId ? `nikilow_active_chat_user_${userId}` : STORAGE_ACTIVE_CHAT_KEY;
}

export function createNewSession(initialTitle?: string): ChatSession {
  const id = 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  return {
    id,
    title: (initialTitle || 'new conversation').toLowerCase(),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function loadSavedSessions(userId?: string | null): ChatSession[] {
  if (!userId) return [];
  try {
    const key = getChatStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((session) => ({
          ...session,
          messages: Array.isArray(session.messages)
            ? [...session.messages].sort((a, b) => {
                const diff = (a.createdAt || 0) - (b.createdAt || 0);
                if (diff !== 0) return diff;
                if (a.role === 'user' && b.role === 'assistant') return -1;
                if (a.role === 'assistant' && b.role === 'user') return 1;
                return (a.id || '').localeCompare(b.id || '');
              })
            : [],
        }));
      }
    }
  } catch (err) {
    console.warn('Failed to load saved chats from localStorage:', err);
  }
  return [];
}

export function saveSessions(sessions: ChatSession[], userId?: string | null): void {
  if (!userId) return; // Never persist chat history for logged-out / guest sessions
  try {
    const key = getChatStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Failed to save chats to localStorage:', err);
  }
}

export function loadActiveChatId(userId?: string | null): string | null {
  if (!userId) return null;
  try {
    const key = getActiveChatStorageKey(userId);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveActiveChatId(id: string, userId?: string | null): void {
  if (!userId) return;
  try {
    const key = getActiveChatStorageKey(userId);
    localStorage.setItem(key, id);
  } catch {
    // ignore
  }
}

export function clearSavedSessions(userId?: string | null): void {
  try {
    localStorage.removeItem(STORAGE_CHATS_KEY);
    localStorage.removeItem(STORAGE_ACTIVE_CHAT_KEY);
    localStorage.removeItem('nikilow_chats_guest');
    localStorage.removeItem('nikilow_active_chat_guest');
    localStorage.removeItem('nikilow_active_profile');

    if (userId) {
      localStorage.removeItem(`nikilow_chats_user_${userId}`);
      localStorage.removeItem(`nikilow_active_chat_user_${userId}`);
      localStorage.removeItem(`nikilow_user_profile_${userId}`);
      localStorage.removeItem(`nikilow_companion_personality_${userId}`);
      localStorage.removeItem(`nikilow_user_likes_${userId}`);
    }

    // Sweep any and all stored chat session keys to guarantee zero chat leakage between accounts or after logout
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('nikilow_chats_') ||
            k.startsWith('nikilow_active_chat_') ||
            k === 'nikilow_active_profile')
        ) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }

    localStorage.removeItem('nikilow_feed_posts_cache');
    localStorage.removeItem('nikilow_feed_posts_v2');
  } catch {
    // ignore
  }
}

export function loadSavedTheme(): ThemeMode {
  return 'dark'; // night mode only
}

export function saveTheme(_theme?: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_THEME_KEY, 'dark');
  } catch {
    // ignore
  }
}

export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  }).toLowerCase();
}

export function loadCompanionPersonality(): CompanionPersonality {
  try {
    const raw = localStorage.getItem(STORAGE_PERSONALITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.name === 'string') {
        let name = parsed.name.trim();
        let avatarUrl = parsed.avatarUrl;
        // Migrate legacy nikilow default to niki and update old default avatar
        if (!name || name.toLowerCase() === 'nikilow') {
          name = DEFAULT_NIKILOW_NAME;
        }
        if (!avatarUrl || avatarUrl === 'https://i.pinimg.com/736x/77/35/36/773536c9815a6c1a5b06c0ff654f98c3.jpg') {
          avatarUrl = DEFAULT_NIKILOW_AVATAR;
        }

        return {
          name,
          prompt: typeof parsed.prompt === 'string' && parsed.prompt.trim() ? parsed.prompt : DEFAULT_NIKILOW_PROMPT,
          avatarUrl,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to load companion personality:', err);
  }
  return {
    name: DEFAULT_NIKILOW_NAME,
    prompt: DEFAULT_NIKILOW_PROMPT,
    avatarUrl: DEFAULT_NIKILOW_AVATAR,
  };
}

export function saveCompanionPersonality(personality: CompanionPersonality): void {
  try {
    localStorage.setItem(STORAGE_PERSONALITY_KEY, JSON.stringify(personality));
  } catch (err) {
    console.warn('Failed to save companion personality:', err);
  }
}

export function resetCompanionPersonality(): CompanionPersonality {
  const defaultPersonality: CompanionPersonality = {
    name: DEFAULT_NIKILOW_NAME,
    prompt: DEFAULT_NIKILOW_PROMPT,
    avatarUrl: DEFAULT_NIKILOW_AVATAR,
  };
  saveCompanionPersonality(defaultPersonality);
  return defaultPersonality;
}
