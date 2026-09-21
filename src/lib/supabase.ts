import { createClient } from '@supabase/supabase-js';
import {
  ChatSession,
  Message,
  UserProfile,
  Post,
  NIKILOW_AVATAR,
  CompanionPersonality,
  ProfileDecorations,
} from '../types';
import { getPostRateLimitStatus, recordPostTimestamp } from '../utils/rateLimit';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://pbvistgowxkhoifafuky.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Register a new user with name, username, email, and password.
 */
export async function signUpUser({
  name,
  username,
  email,
  password,
}: {
  name: string;
  username: string;
  email: string;
  password: string;
}) {
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check if username is already taken in profiles table
  try {
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      throw new Error(`Username @${cleanUsername} is already taken. Please choose another.`);
    }
  } catch (err: unknown) {
    // If profiles table doesn't exist yet before user runs SQL script, proceed with auth signup
    const message = (err as Error)?.message || '';
    if (message.includes('already taken')) {
      throw err;
    }
  }

  // 2. Perform Supabase signup
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        name: name.trim(),
        username: cleanUsername,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    // 3. Upsert profile row
    try {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        avatar_url: '',
        bio: '',
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not auto-insert profile (run supabase_schema.sql):', e);
    }
  }

  return data;
}

/**
 * Login user using either username or email.
 */
export async function signInUser({
  identifier,
  password,
}: {
  identifier: string;
  password: string;
}) {
  const trimmed = identifier.trim();
  let emailToUse = trimmed;

  // Check if identifier is an email (contains @ and .)
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  if (!isEmail) {
    // User entered a username! Look up email from profiles table
    const cleanUsername = trimmed.toLowerCase().replace(/^@/, '');
    
    // First try RPC function if created
    let foundEmail: string | null = null;
    try {
      const { data: rpcEmail, error: rpcErr } = await supabase.rpc('get_email_by_username', {
        username_input: cleanUsername,
      });
      if (!rpcErr && rpcEmail) {
        foundEmail = rpcEmail;
      }
    } catch {
      // ignore
    }

    if (!foundEmail) {
      // Fallback query directly from profiles
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (profileErr || !profileData?.email) {
        throw new Error(
          `No user found with username "@${cleanUsername}". You can also sign in with your email.`
        );
      }
      foundEmail = profileData.email;
    }

    emailToUse = foundEmail;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign out
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('Sign out notice:', error.message || error);
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Helper to safely extract companion personality from database rows, metadata, or API payloads
 */
export function parseCompanionPersonality(raw: any): CompanionPersonality | undefined {
  if (!raw) return undefined;

  if (
    raw.companion_personality &&
    typeof raw.companion_personality === 'object' &&
    raw.companion_personality.name
  ) {
    return {
      name: raw.companion_personality.name,
      prompt: raw.companion_personality.prompt || '',
      avatarUrl:
        raw.companion_personality.avatarUrl ||
        raw.companion_personality.avatar_url ||
        '',
      relationshipStatus:
        raw.companion_personality.relationshipStatus || 'dating_user',
      partnerName: raw.companion_personality.partnerName || '',
    };
  }

  if (raw.companion_name || raw.companion_prompt || raw.companion_avatar_url) {
    return {
      name: raw.companion_name || 'nikilow',
      prompt: raw.companion_prompt || '',
      avatarUrl: raw.companion_avatar_url || '',
      relationshipStatus: raw.companion_relationship_status || 'dating_user',
      partnerName: raw.companion_partner_name || '',
    };
  }

  return undefined;
}

/**
 * Fetch profile for a user
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const isUuid = UUID_REGEX.test(userId);

  // 1. Check server-side persistent profile store (fastest, guaranteed persistent across reloads)
  try {
    const srvRes = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`);
    if (srvRes.ok) {
      const srvData = await srvRes.json();
      if (srvData?.profile && (srvData.profile.name || srvData.profile.username)) {
        const isKodewt = srvData.profile.username?.toLowerCase() === 'kodewt';
        const companion = parseCompanionPersonality(srvData.profile);

        const profile: UserProfile = {
          id: srvData.profile.id || userId,
          name: srvData.profile.name || '',
          username: srvData.profile.username || '',
          email: srvData.profile.email || '',
          avatar_url: srvData.profile.avatar_url || '',
          bio: srvData.profile.bio || '',
          is_verified: isKodewt || srvData.profile.is_verified,
          decorations: srvData.profile.decorations || undefined,
          companion_personality: companion,
          companion_name: companion?.name,
          companion_prompt: companion?.prompt,
          companion_avatar_url: companion?.avatarUrl,
        };

        try {
          localStorage.setItem(`nikilow_user_profile_${userId}`, JSON.stringify(profile));
          localStorage.setItem('nikilow_active_profile', JSON.stringify(profile));
          if (companion) {
            localStorage.setItem(`nikilow_companion_personality_${userId}`, JSON.stringify(companion));
          }
        } catch {
          // ignore
        }

        return profile;
      }
    }
  } catch {
    // Server fetch notice - continue to Supabase
  }

  // 2. If valid UUID, query Supabase profiles table
  if (isUuid) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        const isKodewt = data.username?.toLowerCase() === 'kodewt';
        const companion = parseCompanionPersonality(data);

        const profile: UserProfile = {
          id: data.id,
          name: data.name || '',
          username: data.username || '',
          email: data.email || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          is_verified: isKodewt || data.is_verified,
          decorations: data.decorations || undefined,
          companion_personality: companion,
          companion_name: companion?.name,
          companion_prompt: companion?.prompt,
          companion_avatar_url: companion?.avatarUrl,
        };

        // Update local cache
        try {
          localStorage.setItem(`nikilow_user_profile_${userId}`, JSON.stringify(profile));
          localStorage.setItem('nikilow_active_profile', JSON.stringify(profile));
          if (companion) {
            localStorage.setItem(`nikilow_companion_personality_${userId}`, JSON.stringify(companion));
          }
        } catch {
          // ignore
        }

        return profile;
      }
    } catch (err) {
      console.warn('fetchUserProfile query notice:', err);
    }
  }

  // 3. Fallback to auth session metadata
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user;
    if (sessionUser && (sessionUser.id === userId || !isUuid)) {
      const meta = sessionUser.user_metadata || {};
      const companion = parseCompanionPersonality(meta);

        const profile: UserProfile = {
        id: sessionUser.id,
        name: meta.name || sessionUser.email?.split('@')[0] || 'Anonymous',
        username: meta.username || sessionUser.email?.split('@')[0] || 'user',
        email: sessionUser.email || '',
        avatar_url: meta.avatar_url || '',
        bio: meta.bio || '',
        is_verified: meta.username?.toLowerCase() === 'kodewt',
        decorations: meta.decorations || undefined,
        companion_personality: companion,
        companion_name: companion?.name,
        companion_prompt: companion?.prompt,
        companion_avatar_url: companion?.avatarUrl,
      };

      try {
        localStorage.setItem(`nikilow_user_profile_${userId}`, JSON.stringify(profile));
        localStorage.setItem('nikilow_active_profile', JSON.stringify(profile));
        if (companion) {
          localStorage.setItem(`nikilow_companion_personality_${userId}`, JSON.stringify(companion));
        }
      } catch {
        // ignore
      }

      return profile;
    }
  } catch (authErr) {
    console.warn('fetchUserProfile auth notice:', authErr);
  }

  // 4. Fallback to local storage cache
  try {
    const cached =
      localStorage.getItem(`nikilow_user_profile_${userId}`) ||
      localStorage.getItem('nikilow_active_profile');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.id === userId || !userId)) {
        return parsed as UserProfile;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Save companion personality to user's account across all layers:
 * 1. Supabase Auth user_metadata
 * 2. Supabase profiles table (companion_name, companion_prompt, companion_avatar_url, companion_personality)
 * 3. Server-side profile storage (/api/profile/personality)
 * 4. User-scoped LocalStorage cache
 */
export async function savePersonalityToAccount(
  userId: string,
  personality: CompanionPersonality
): Promise<boolean> {
  if (!userId) return false;

  // 1. Update Supabase Auth user_metadata
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      await supabase.auth.updateUser({
        data: {
          companion_personality: personality,
          companion_name: personality.name,
          companion_prompt: personality.prompt,
          companion_avatar_url: personality.avatarUrl,
          companion_relationship_status:
            personality.relationshipStatus || 'dating_user',
          companion_partner_name: personality.partnerName || '',
        },
      });
    }
  } catch (authErr) {
    console.warn('savePersonalityToAccount auth metadata notice:', authErr);
  }

  // 2. Persist to server persistent store (/api/profile/personality)
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const authToken = sessionData?.session?.access_token || '';

    await fetch('/api/profile?action=personality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        personality,
        authToken,
      }),
    });
  } catch (srvErr) {
    console.warn('savePersonalityToAccount server API notice:', srvErr);
  }

  // 3. Update Supabase profiles table directly if it exists
  const isUuid = UUID_REGEX.test(userId);
  if (isUuid) {
    try {
      await supabase
        .from('profiles')
        .update({
          companion_name: personality.name,
          companion_prompt: personality.prompt,
          companion_avatar_url: personality.avatarUrl,
          companion_personality: personality,
          companion_relationship_status:
            personality.relationshipStatus || 'dating_user',
          companion_partner_name: personality.partnerName || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (dbErr) {
      console.warn('savePersonalityToAccount database notice:', dbErr);
    }
  }

  // 4. Update local storage caches
  try {
    localStorage.setItem(
      `nikilow_companion_personality_${userId}`,
      JSON.stringify(personality)
    );
    localStorage.setItem(
      'nikilow_companion_personality_v1',
      JSON.stringify(personality)
    );

    const cachedProfileKey = `nikilow_user_profile_${userId}`;
    const prev = localStorage.getItem(cachedProfileKey);
    if (prev) {
      const parsed = JSON.parse(prev);
      const merged = {
        ...parsed,
        companion_personality: personality,
        companion_name: personality.name,
        companion_prompt: personality.prompt,
        companion_avatar_url: personality.avatarUrl,
      };
      localStorage.setItem(cachedProfileKey, JSON.stringify(merged));
      localStorage.setItem('nikilow_active_profile', JSON.stringify(merged));
    }
  } catch {
    // ignore
  }

  return true;
}

/**
 * Load companion personality from user's account (or user's cached personality)
 */
export async function loadPersonalityFromAccount(
  userId: string
): Promise<CompanionPersonality | null> {
  if (!userId) return null;

  // 1. Check user-scoped local storage cache
  try {
    const cached = localStorage.getItem(`nikilow_companion_personality_${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.name) return parsed as CompanionPersonality;
    }
  } catch {
    // ignore
  }

  // 2. Check profile
  try {
    const profile = await fetchUserProfile(userId);
    if (profile?.companion_personality) {
      return profile.companion_personality;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Update profile (persists to server storage, Supabase profiles table, auth metadata, and updates user's posts)
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    username?: string;
    avatar_url?: string;
    bio?: string;
    decorations?: ProfileDecorations;
  }
) {
  // 1. Get current authenticated user
  const { data: sessionData } = await supabase.auth.getSession();
  let authUser = sessionData?.session?.user;
  if (!authUser) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      authUser = authData?.user;
    } catch {
      // ignore
    }
  }

  const targetId = authUser?.id || userId;
  const authEmail = authUser?.email || '';
  const authToken = sessionData?.session?.access_token || '';
  const isUuid = UUID_REGEX.test(targetId);

  const safeUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) safeUpdates.name = updates.name.trim();
  if (updates.username !== undefined) {
    safeUpdates.username = updates.username.trim().toLowerCase().replace(/^@/, '');
  }
  if (updates.avatar_url !== undefined) {
    safeUpdates.avatar_url = updates.avatar_url;
  }
  if (updates.bio !== undefined) safeUpdates.bio = updates.bio.trim();
  if (updates.decorations !== undefined) {
    safeUpdates.decorations = updates.decorations;
  }

  // 2. Persist to server backend API immediately (guaranteed durable storage)
  try {
    await fetch('/api/profile?action=update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: targetId,
        profile: {
          ...safeUpdates,
          email: authEmail,
        },
        authToken,
      }),
    });
  } catch (srvErr) {
    console.warn('Server profile update notice:', srvErr);
  }

  // 3. Persist to profiles table in Supabase directly
  if (isUuid) {
    try {
      const { error: updateErr, data: updatedRows } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', targetId)
        .select('id');

      if (updateErr || !updatedRows || updatedRows.length === 0) {
        const insertPayload: Record<string, any> = {
          id: targetId,
          name: safeUpdates.name || 'User',
          username: safeUpdates.username || authEmail.split('@')[0] || 'user',
          avatar_url: safeUpdates.avatar_url || '',
          bio: safeUpdates.bio || '',
          updated_at: new Date().toISOString(),
        };
        if (authEmail) {
          insertPayload.email = authEmail;
        }

        await supabase
          .from('profiles')
          .upsert(insertPayload, { onConflict: 'id' });
      }
    } catch (dbErr) {
      console.warn('profiles table persistence notice:', dbErr);
    }
  }

  // 4. Update Supabase Auth user_metadata
  try {
    const metaUpdates: Record<string, string> = {};
    if (safeUpdates.name) metaUpdates.name = safeUpdates.name;
    if (safeUpdates.username) metaUpdates.username = safeUpdates.username;
    if (safeUpdates.bio !== undefined) metaUpdates.bio = safeUpdates.bio;
    if (safeUpdates.avatar_url && safeUpdates.avatar_url.length < 35000) {
      metaUpdates.avatar_url = safeUpdates.avatar_url;
    }

    if (authUser && Object.keys(metaUpdates).length > 0) {
      await supabase.auth.updateUser({
        data: metaUpdates,
      });
    }
  } catch (authErr) {
    console.warn('auth.updateUser warning:', authErr);
  }

  // 5. Sync author info to user's posts in Supabase
  if (isUuid) {
    try {
      const postUpdates: Record<string, any> = {};
      if (safeUpdates.name) postUpdates.author_name = safeUpdates.name;
      if (safeUpdates.username) postUpdates.author_username = safeUpdates.username;
      if (safeUpdates.avatar_url && safeUpdates.avatar_url.length < 35000) {
        postUpdates.author_avatar = safeUpdates.avatar_url;
      }
      if (safeUpdates.decorations) {
        postUpdates.decorations = safeUpdates.decorations;
      }

      if (Object.keys(postUpdates).length > 0) {
        await supabase
          .from('posts')
          .update(postUpdates)
          .eq('user_id', targetId);
      }
    } catch (postSyncErr) {
      console.warn('Sync profile to posts skipped:', postSyncErr);
    }
  }

  // 6. Always persist to localStorage cache for instant offline restore
  try {
    const cachedProfileKey = `nikilow_user_profile_${targetId}`;
    const prev = localStorage.getItem(cachedProfileKey);
    const parsed = prev ? JSON.parse(prev) : {};
    const merged = { ...parsed, id: targetId, ...safeUpdates };
    localStorage.setItem(cachedProfileKey, JSON.stringify(merged));
    localStorage.setItem('nikilow_active_profile', JSON.stringify(merged));
  } catch {
    // ignore
  }

  return safeUpdates;
}

export const updateProfile = updateUserProfile;

/**
 * Upload avatar file to Supabase storage bucket or return local Base64/data URL fallback
 */
export async function uploadAvatarImage(userId: string, file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
      });

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload failed, converting to data URL:', err);
  }

  // Fallback to reading file as base64 Data URL so avatar upload always works immediately
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Sync chats and messages to Supabase when user is logged in
 */
export async function syncChatToSupabase(chat: ChatSession, userId: string): Promise<boolean> {
  if (!chat || !userId) return false;
  try {
    // 1. Upsert chat record
    const { error: chatErr } = await supabase.from('chats').upsert(
      {
        id: chat.id,
        user_id: userId,
        title: chat.title || 'new conversation',
        created_at: new Date(chat.createdAt || Date.now()).toISOString(),
        updated_at: new Date(chat.updatedAt || Date.now()).toISOString(),
      },
      { onConflict: 'id' }
    );

    if (chatErr) {
      console.warn('Sync chat error (make sure fix-messages-sync.sql is run in Supabase):', chatErr.message || chatErr);
      return false;
    }

    // 2. Upsert messages
    if (chat.messages && chat.messages.length > 0) {
      let lastTime = 0;
      const msgRows = chat.messages
        .filter((m) => m && m.id && m.content)
        .map((m, idx) => {
          let ts = m.createdAt || Date.now() + idx * 10;
          if (ts <= lastTime) {
            ts = lastTime + 10;
          }
          lastTime = ts;
          return {
            id: m.id,
            chat_id: chat.id,
            user_id: userId,
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || '',
            created_at: new Date(ts).toISOString(),
          };
        });

      if (msgRows.length > 0) {
        // Attempt bulk upsert
        const { error: msgErr } = await supabase
          .from('messages')
          .upsert(msgRows, { onConflict: 'id' });

        if (msgErr) {
          console.warn('Bulk message upsert notice, trying individual rows:', msgErr.message || msgErr);
          // Fallback: upsert message rows individually
          for (const row of msgRows) {
            const { error: singleErr } = await supabase
              .from('messages')
              .upsert(row, { onConflict: 'id' });
            if (singleErr) {
              console.warn(`Message sync single error for ${row.id}:`, singleErr.message || singleErr);
            }
          }
        }
      }
    }
    return true;
  } catch (e: any) {
    console.warn('syncChatToSupabase failed:', e?.message || e);
    return false;
  }
}

/**
 * Load chats from Supabase for current user with high performance
 */
export async function loadChatsFromSupabase(userId: string): Promise<ChatSession[] | null> {
  if (!userId) return null;
  try {
    const { data: chatRows, error: chatErr } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (chatErr) {
      console.warn('loadChatsFromSupabase chats error:', chatErr.message || chatErr);
      return null;
    }

    if (!chatRows || chatRows.length === 0) {
      return null;
    }

    // Fetch all messages for these chats in a single batch query
    const chatIds = chatRows.map((c) => c.id);
    const { data: msgRows, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: true });

    if (msgErr) {
      console.warn('loadChatsFromSupabase messages error:', msgErr.message || msgErr);
    }

    // Group messages by chat_id
    const messagesByChat = new Map<string, Message[]>();
    for (const m of msgRows || []) {
      const list = messagesByChat.get(m.chat_id) || [];
      list.push({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
        createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
      });
      messagesByChat.set(m.chat_id, list);
    }

    const sessions: ChatSession[] = chatRows.map((c) => {
      const chatMsgs = (messagesByChat.get(c.id) || []).sort((a, b) => {
        const diff = (a.createdAt || 0) - (b.createdAt || 0);
        if (diff !== 0) return diff;
        if (a.role === 'user' && b.role === 'assistant') return -1;
        if (a.role === 'assistant' && b.role === 'user') return 1;
        return (a.id || '').localeCompare(b.id || '');
      });

      return {
        id: c.id,
        title: c.title || 'new conversation',
        messages: chatMsgs,
        createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
        updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now(),
      };
    });

    return sessions;
  } catch (err: any) {
    console.warn('loadChatsFromSupabase skipped:', err?.message || err);
    return null;
  }
}

/**
 * Delete a specific chat from Supabase
 */
export async function deleteChatFromSupabase(chatId: string, userId: string): Promise<void> {
  try {
    await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('deleteChatFromSupabase skipped:', err);
  }
}

/**
 * Clear all chats for a user from Supabase
 */
export async function clearAllChatsFromSupabase(userId: string): Promise<void> {
  try {
    await supabase
      .from('chats')
      .delete()
      .eq('user_id', userId);
  } catch (err) {
    console.warn('clearAllChatsFromSupabase skipped:', err);
  }
}

// ==============================================================================
// POSTS & LIKES LOGIC
// ==============================================================================

const LOCAL_STORAGE_POSTS_KEY = 'nikilow_feed_posts_v2';
const LOCAL_STORAGE_LIKES_KEY = 'nikilow_liked_posts_v2';

export const INITIAL_SEED_POSTS: Post[] = [];

function getStoredLocalPosts(): Post[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredLocalPosts(posts: Post[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_POSTS_KEY, JSON.stringify(posts));
  } catch {
    // ignore
  }
}

function getStoredUserLikes(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LIKES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredUserLikes(likes: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_LIKES_KEY, JSON.stringify(likes));
  } catch {
    // ignore
  }
}

/**
 * Resend verification email for signup
 */
export async function resendVerificationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
  });
  if (error) {
    throw error;
  }
}

/**
 * Fetch post IDs that a user has liked across all devices
 */
export async function fetchUserLikedPostIds(userId: string): Promise<string[]> {
  if (!userId) return [];

  // Instant local cache check for zero-latency like status
  let cachedLikes: string[] = [];
  try {
    const cached = localStorage.getItem(`nikilow_user_likes_${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        cachedLikes = parsed;
      }
    }
  } catch {}

  // 1. Try server endpoint
  try {
    const res = await fetch(`/api/posts?action=likes&userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.likedPostIds)) {
        saveStoredUserLikes(data.likedPostIds);
        try {
          localStorage.setItem(`nikilow_user_likes_${userId}`, JSON.stringify(data.likedPostIds));
        } catch {}
        return data.likedPostIds;
      }
    }
  } catch (apiErr) {
    console.warn('fetchUserLikedPostIds API notice:', apiErr);
  }

  // 2. Direct Supabase query
  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId);

    if (!error && data) {
      const ids = data.map((item: any) => item.post_id);
      saveStoredUserLikes(ids);
      try {
        localStorage.setItem(`nikilow_user_likes_${userId}`, JSON.stringify(ids));
      } catch {}
      return ids;
    }
  } catch (err) {
    console.warn('fetchUserLikedPostIds client notice:', err);
  }

  if (cachedLikes.length > 0) {
    return cachedLikes;
  }

  return getStoredUserLikes();
}

/**
 * Fetch all posts in reverse chronological order
 */
export async function fetchFeedPosts(currentUserId?: string): Promise<Post[]> {
  let userLikes: string[] = [];
  if (currentUserId) {
    userLikes = await fetchUserLikedPostIds(currentUserId);
  } else {
    // Unregistered users have no likes
    userLikes = [];
  }

  let dbPostsList: Post[] = [];

  // 1. Try fetching from /api/posts endpoint (reliable serverless function)
  try {
    const url = currentUserId
      ? `/api/posts?userId=${encodeURIComponent(currentUserId)}`
      : '/api/posts';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.posts)) {
        dbPostsList = data.posts.map((p: any) => ({
          ...p,
          isLiked: typeof p.isLiked === 'boolean' ? (p.isLiked || userLikes.includes(p.id)) : userLikes.includes(p.id),
          isVerified: p.isVerified || p.authorUsername?.toLowerCase() === 'kodewt',
          decorations: p.decorations || undefined,
        }));
      }
    }
  } catch (apiErr) {
    console.warn('fetchFeedPosts API fallback to direct client:', apiErr);
  }

  // 2. Fallback to direct client if API returned empty / failed
  if (dbPostsList.length === 0) {
    try {
      let dbPosts: any[] | null = null;
      const { data: joinedPosts, error: joinErr } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            avatar_url,
            is_verified,
            decorations
          )
        `)
        .order('created_at', { ascending: false });

      if (!joinErr && joinedPosts) {
        dbPosts = joinedPosts;
      } else {
        const { data: simplePosts } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        dbPosts = simplePosts;
      }

      if (dbPosts && dbPosts.length > 0) {
        dbPostsList = dbPosts.map((p) => {
          const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
          const authorUsername = profile?.username || p.author_username;
          const authorName = profile?.name || profile?.username || p.author_name || authorUsername;
          const authorAvatar = profile?.avatar_url || p.author_avatar || '';
          const isKodewt =
            authorUsername?.toLowerCase() === 'kodewt' ||
            authorUsername?.toLowerCase() === '@kodewt';
          const isVerified = Boolean(profile?.is_verified ?? p.is_verified) || isKodewt;
          const decorations = profile?.decorations || p.decorations || undefined;

          return {
            id: p.id,
            userId: p.user_id,
            authorName,
            authorUsername,
            authorAvatar,
            content: p.content,
            createdAt: new Date(p.created_at).getTime(),
            likesCount: p.likes_count || 0,
            isLiked: userLikes.includes(p.id),
            isVerified,
            decorations,
          };
        });
      }
    } catch (err) {
      console.warn('fetchFeedPosts client query notice:', err);
    }
  }

  // 3. Merge with local posts cache so user's recent posts are NEVER lost
  const localPosts = getStoredLocalPosts();
  const combinedMap = new Map<string, Post>();

  // Add DB posts first
  for (const p of dbPostsList) {
    combinedMap.set(p.id, p);
  }

  // Add any local posts that aren't yet in DB (or authored recently)
  for (const lp of localPosts) {
    if (!combinedMap.has(lp.id)) {
      combinedMap.set(lp.id, {
        ...lp,
        isLiked: userLikes.includes(lp.id),
        isVerified: lp.authorUsername.toLowerCase() === 'kodewt' || lp.isVerified,
      });
    }
  }

  return Array.from(combinedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Create a new post (max 300 chars)
 */
export async function createFeedPost(
  arg1: string | { content: string; userProfile: UserProfile; skipRateLimitCheck?: boolean },
  arg2?: UserProfile,
  skipRateLimitCheck: boolean = false
): Promise<Post> {
  const content = typeof arg1 === 'string' ? arg1 : arg1.content;
  const userProfile = typeof arg1 === 'string' ? arg2! : arg1.userProfile;
  const shouldSkipRateLimit =
    skipRateLimitCheck || (typeof arg1 === 'object' && Boolean(arg1.skipRateLimitCheck));

  const trimmed = (content || '').trim();
  if (!trimmed) {
    throw new Error('Post content cannot be empty');
  }
  if (trimmed.length > 300) {
    throw new Error('Post cannot exceed 300 characters');
  }

  // Enforce 5-minute rate limit for posting updates if not already verified by caller
  if (!shouldSkipRateLimit) {
    const rateLimit = getPostRateLimitStatus(userProfile.id);
    if (rateLimit.isRateLimited) {
      throw new Error(
        `Rate limit active: you can only post updates once every 5 minutes (wait ${rateLimit.formattedRemaining}).`
      );
    }
  }

  const postTime = Date.now();
  const isKodewt = userProfile.username.toLowerCase() === 'kodewt';
  const newPost: Post = {
    id: 'post_' + postTime + '_' + Math.random().toString(36).substring(2, 6),
    userId: userProfile.id,
    authorName: userProfile.name || userProfile.username,
    authorUsername: userProfile.username,
    authorAvatar: userProfile.avatar_url || '',
    content: trimmed,
    createdAt: postTime,
    likesCount: 0,
    isLiked: false,
    isVerified: isKodewt || Boolean(userProfile.is_verified),
    decorations: userProfile.decorations,
  };

  // 1. Try saving to server API endpoint (bypasses RLS issues via service role)
  let savedToBackend = false;
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: trimmed,
        userId: userProfile.id,
        authorName: newPost.authorName,
        authorUsername: newPost.authorUsername,
        authorAvatar: newPost.authorAvatar,
        isVerified: newPost.isVerified,
        decorations: userProfile.decorations,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.post?.id) {
        newPost.id = data.post.id;
        newPost.createdAt = data.post.createdAt || postTime;
        if (data.post.decorations) {
          newPost.decorations = data.post.decorations;
        }
        savedToBackend = true;
      }
    }
  } catch (apiErr) {
    console.warn('createFeedPost API call notice, attempting client fallback:', apiErr);
  }

  // 2. Fallback to direct client insert if API did not save
  if (!savedToBackend) {
    try {
      const insertRow: Record<string, any> = {
        user_id: userProfile.id,
        author_name: newPost.authorName,
        author_username: newPost.authorUsername,
        author_avatar: newPost.authorAvatar,
        content: newPost.content,
        likes_count: 0,
        is_verified: newPost.isVerified,
      };
      if (userProfile.decorations) {
        insertRow.decorations = userProfile.decorations;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert(insertRow)
        .select()
        .single();

      if (!error && data) {
        newPost.id = data.id;
        savedToBackend = true;
      }
    } catch (err) {
      console.warn('createFeedPost saved to local cache:', err);
    }
  }

  // Record rate limit timestamp only now that the post was initiated
  recordPostTimestamp(userProfile.id, postTime);

  // Always update local cache
  const localPosts = getStoredLocalPosts();
  saveStoredLocalPosts([newPost, ...localPosts.filter((p) => p.id !== newPost.id)]);

  return newPost;
}

/**
 * Toggle like on a post (Enforces 1 like per account, syncing across all devices)
 */
export async function togglePostLike(
  postId: string,
  userId?: string
): Promise<{ isLiked: boolean; newCount: number }> {
  if (!userId) {
    throw new Error('You must be logged in to like posts.');
  }

  // 1. Try server API endpoint (bypasses RLS issues via service role)
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_like',
        postId,
        userId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.success) {
        // Update user likes cache
        const currentLikes = getStoredUserLikes();
        const nextLikes = data.isLiked
          ? Array.from(new Set([...currentLikes, postId]))
          : currentLikes.filter((id) => id !== postId);
        saveStoredUserLikes(nextLikes);
        try {
          localStorage.setItem(`nikilow_user_likes_${userId}`, JSON.stringify(nextLikes));
        } catch {}

        // Update local posts cache
        const localPosts = getStoredLocalPosts();
        const updatedLocal = localPosts.map((p) =>
          p.id === postId ? { ...p, likesCount: data.likesCount, isLiked: data.isLiked } : p
        );
        saveStoredLocalPosts(updatedLocal);

        return { isLiked: data.isLiked, newCount: data.likesCount };
      }
    }
  } catch (err) {
    console.warn('togglePostLike API notice, attempting client fallback:', err);
  }

  // Fallback to direct client toggle
  const likes = getStoredUserLikes();
  const alreadyLiked = likes.includes(postId);
  const nextLiked = !alreadyLiked;

  let nextLikes: string[];
  if (alreadyLiked) {
    nextLikes = likes.filter((id) => id !== postId);
  } else {
    nextLikes = [...likes, postId];
  }
  saveStoredUserLikes(nextLikes);
  try {
    localStorage.setItem(`nikilow_user_likes_${userId}`, JSON.stringify(nextLikes));
  } catch {}

  // Update local posts cache
  const localPosts = getStoredLocalPosts();
  let calculatedCount = 0;
  const updatedLocal = localPosts.map((p) => {
    if (p.id === postId) {
      const count = Math.max(0, p.likesCount + (nextLiked ? 1 : -1));
      calculatedCount = count;
      return { ...p, likesCount: count, isLiked: nextLiked };
    }
    return p;
  });
  saveStoredLocalPosts(updatedLocal);

  // Try updating Supabase directly
  try {
    if (nextLiked) {
      await supabase.from('post_likes').upsert(
        {
          post_id: postId,
          user_id: userId,
        },
        { onConflict: 'post_id,user_id' }
      );
    } else {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
    }

    // Always fetch the exact, true count from post_likes table
    const { count } = await supabase
      .from('post_likes')
      .select('post_id', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (typeof count === 'number') {
      calculatedCount = count;
      await supabase
        .from('posts')
        .update({ likes_count: count })
        .eq('id', postId);

      // Keep local posts cache accurate
      const refreshedLocal = getStoredLocalPosts().map((p) =>
        p.id === postId ? { ...p, likesCount: count, isLiked: nextLiked } : p
      );
      saveStoredLocalPosts(refreshedLocal);
    }
  } catch (err) {
    console.warn('togglePostLike remote client notice:', err);
  }

  return { isLiked: nextLiked, newCount: calculatedCount };
}

/**
 * Delete a post by id
 */
export async function deleteFeedPost(postId: string, userId?: string): Promise<boolean> {
  // 1. Remove from local cache
  const localPosts = getStoredLocalPosts();
  const filtered = localPosts.filter((p) => p.id !== postId);
  saveStoredLocalPosts(filtered);

  // 2. Remove via server API (service role)
  try {
    await fetch('/api/posts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, userId }),
    });
  } catch (err) {
    console.warn('deleteFeedPost API call notice:', err);
  }

  // 3. Remove from Supabase client if connected
  try {
    let query = supabase.from('posts').delete().eq('id', postId);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { error } = await query;
    if (error) {
      console.warn('deleteFeedPost error:', error);
    }
    return true;
  } catch (err) {
    console.warn('deleteFeedPost remote skipped:', err);
    return true;
  }
}

/**
 * Fetch profile by username (for mention clicks and viewing someone else's profile)
 */
export async function fetchProfileByUsername(
  username: string
): Promise<UserProfile | null> {
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

  // Companion profile view is disabled as personality is customizable
  if (cleanUsername === 'nikilow' || cleanUsername === 'niki' || cleanUsername === 'dary') {
    return null;
  }

  // Synthetic default for kodewt if not yet registered in db
  if (cleanUsername === 'kodewt') {
    // First try fetching actual profile from db
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', 'kodewt')
        .maybeSingle();

      if (data) {
        return {
          id: data.id,
          name: data.name || 'kodewt',
          username: 'kodewt',
          email: data.email || 'kodewt@developer.com',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          is_verified: true,
          decorations: data.decorations || undefined,
        };
      }
    } catch {
      // ignore
    }

    return {
      id: 'kodewt_dev',
      name: 'kodewt',
      username: 'kodewt',
      email: 'kodewt@developer.com',
      avatar_url: '',
      bio: '',
      is_verified: true,
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name || cleanUsername,
        username: data.username,
        email: data.email || '',
        avatar_url: data.avatar_url || '',
        bio: data.bio || '',
        is_verified: cleanUsername === 'kodewt' || data.is_verified,
        decorations: data.decorations || undefined,
      };
    }
  } catch (err) {
    console.warn('fetchProfileByUsername query skipped:', err);
  }

  // If not found in DB, return a graceful placeholder profile
  return {
    id: 'user_' + cleanUsername,
    name: cleanUsername,
    username: cleanUsername,
    email: `${cleanUsername}@user.net`,
    avatar_url: '',
    bio: '',
    is_verified: cleanUsername === 'kodewt',
  };
}

