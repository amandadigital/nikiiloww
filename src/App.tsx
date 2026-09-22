import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { FeedView } from './components/FeedView';
import { SearchView } from './components/SearchView';
import { ProfileView } from './components/ProfileView';
import { MoreView } from './components/MoreView';
import { AppleNavBar } from './components/AppleNavBar';
import { DesktopNav } from './components/DesktopNav';
import { EditProfileModal } from './components/EditProfileModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { IntroAnimation } from './components/IntroAnimation';
import { VisualisationModal } from './components/VisualisationModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PanelLeftOpen } from 'lucide-react';
import {
  ActiveTab,
  ChatSession,
  Message,
  Post,
  ThemeMode,
  UserProfile,
  CompanionPersonality,
  DEFAULT_NIKILOW_PERSONALITY,
} from './types';
import {
  loadSavedSessions,
  saveSessions,
  loadActiveChatId,
  saveActiveChatId,
  clearSavedSessions,
  clearAllChatLocalStorage,
  loadSavedTheme,
  saveTheme,
  createNewSession,
  loadCompanionPersonality,
  saveCompanionPersonality,
  resetCompanionPersonality,
} from './utils/storage';
import {
  getPostRateLimitStatus,
  recordPostTimestamp,
} from './utils/rateLimit';
import {
  getSavedAccentColor,
  saveAccentColor,
  getSavedBgTheme,
  saveBgTheme,
  applySavedThemePreferences,
  AccentColor,
  BgTheme,
} from './utils/theme';
import {
  loadWallpaperSettings,
  saveWallpaperSettings,
  ChatWallpaperSettings,
} from './utils/wallpaper';
import {
  supabase,
  fetchUserProfile,
  syncChatToSupabase,
  loadChatsFromSupabase,
  deleteChatFromSupabase,
  clearAllChatsFromSupabase,
  fetchFeedPosts,
  createFeedPost,
  deleteFeedPost,
  togglePostLike,
  fetchProfileByUsername,
  savePersonalityToAccount,
  loadPersonalityFromAccount,
} from './lib/supabase';

export default function App() {
  // Navigation active tab: 'feed' | 'search' | 'chat' | 'profile' | 'more'
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');

  // Welcome Intro Animation state (plays on entering the website)
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(() => false);

  // Accent & Background color themes (default: rose)
  // Accent color, theme & wallpaper state
  const [theme, setTheme] = useState<ThemeMode>(() => loadSavedTheme());
  const [accentColor, setAccentColor] = useState<AccentColor>(() => getSavedAccentColor());
  const [bgTheme, setBgTheme] = useState<BgTheme>(() => getSavedBgTheme());

  // Chat Wallpaper settings & Modal state
  const [wallpaperSettings, setWallpaperSettings] = useState<ChatWallpaperSettings>(() =>
    loadWallpaperSettings()
  );
  const [isVisualisationOpen, setIsVisualisationOpen] = useState<boolean>(false);

  // Initialize and synchronize saved theme preferences
  useEffect(() => {
    applySavedThemePreferences();
  }, [theme, accentColor, bgTheme]);

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  const handleAccentChange = useCallback((col: AccentColor) => {
    setAccentColor(col);
    saveAccentColor(col);
    applySavedThemePreferences();
  }, []);

  const handleBgThemeChange = useCallback((themeName: BgTheme) => {
    setBgTheme(themeName);
    saveBgTheme(themeName);
    applySavedThemePreferences();
  }, []);

  const handleWallpaperUpdate = useCallback((newSettings: ChatWallpaperSettings) => {
    setWallpaperSettings(newSettings);
    saveWallpaperSettings(newSettings);
  }, []);

  // URL route path tracking (supports direct /admin navigation)
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  }, []);

  // Viewing a specific profile (when clicking a mention or user avatar)
  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);

  // Desktop side navigation menu visibility state (can be hidden or shown at any moment)
  const [isDesktopNavOpen, setIsDesktopNavOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('naisuru_desktop_nav_open') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleDesktopNav = useCallback(() => {
    setIsDesktopNavOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('naisuru_desktop_nav_open', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleTheme = () => {
    // Night mode is permanent
    setTheme('dark');
  };

  // User Profile & Authentication state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Companion personality state (Nikilow by default, customizable via menu)
  const [personality, setPersonality] = useState<CompanionPersonality>(() =>
    loadCompanionPersonality()
  );

  const handleSavePersonality = useCallback(
    (updated: CompanionPersonality) => {
      // 1. Instant local persistence and state update (zero lag)
      saveCompanionPersonality(updated);
      setPersonality(updated);

      if (userProfile?.id) {
        setUserProfile((prev) =>
          prev
            ? {
                ...prev,
                companion_personality: updated,
                companion_name: updated.name,
                companion_prompt: updated.prompt,
                companion_avatar_url: updated.avatarUrl,
              }
            : null
        );
        // 2. Sync to cloud account in background
        savePersonalityToAccount(userProfile.id, updated).catch((err) => {
          console.warn('Background personality sync notice:', err);
        });
      }
    },
    [userProfile?.id]
  );

  const handleResetPersonality = useCallback(async () => {
    const reset = resetCompanionPersonality();
    setPersonality(reset);

    if (userProfile?.id) {
      await savePersonalityToAccount(userProfile.id, reset);
      setUserProfile((prev) =>
        prev
          ? {
                ...prev,
                companion_personality: reset,
                companion_name: reset.name,
                companion_prompt: reset.prompt,
                companion_avatar_url: reset.avatarUrl,
              }
          : null
      );
    }
  }, [userProfile?.id]);

  // Posts Feed State
  const [posts, setPosts] = useState<Post[]>([]);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Sessions state: fresh default session, populated per-user upon auth verification
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    return [createNewSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || '';
  });

  // Mobile sidebar (drawer) state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Streaming status & abort controller
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const likingPostsRef = useRef<Set<string>>(new Set());
  const currentUserIdRef = useRef<string | null | undefined>(undefined);

  // Stop streaming helper
  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Load Feed Posts on mount
  const refreshPosts = useCallback(async () => {
    try {
      setIsRefreshingFeed(true);
      const fetched = await fetchFeedPosts(userProfile?.id);
      setPosts(fetched);
    } catch (err) {
      console.warn('Refresh feed posts notice:', err);
    } finally {
      setIsRefreshingFeed(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  // Handle user authentication transitions (sign in, sign out, account switch)
  const handleAuthUserSwitch = useCallback(
    async (sessionUser: { id: string } | null) => {
      const newUserId = sessionUser?.id || null;
      const prevUserId = currentUserIdRef.current;

      // Skip redundant executions if user ID is strictly unchanged
      if (prevUserId !== undefined && prevUserId === newUserId) {
        return;
      }

      currentUserIdRef.current = newUserId;
      handleStopStreaming();

      if (!newUserId) {
        // ================= USER LOGGED OUT =================
        // Per user request: once logged out, chats are cleared so they cannot be accessed
        clearSavedSessions(prevUserId || undefined);
        setUserProfile(null);
        setViewedProfile(null);

        // Reset conversation to a clean, fresh empty chat
        const fresh = createNewSession();
        setSessions([fresh]);
        setActiveSessionId(fresh.id);

        // Reset companion personality back to default
        const defaultPersonality = resetCompanionPersonality();
        setPersonality(defaultPersonality);
        saveCompanionPersonality(defaultPersonality);
        return;
      }

      // ================= USER LOGGED IN =================
      // 1. Wipe previous user's chats and state immediately so they never bleed into this account
      const cleanSession = createNewSession();
      setSessions([cleanSession]);
      setActiveSessionId(cleanSession.id);
      clearSavedSessions(prevUserId || undefined);

      // 2. Fetch profile
      const profile = await fetchUserProfile(newUserId);
      if (profile) {
        setUserProfile(profile);
      }

      // 3. Restore companion personality saved to this account
      const accountPersonality =
        profile?.companion_personality ||
        (await loadPersonalityFromAccount(newUserId));
      if (accountPersonality) {
        setPersonality(accountPersonality);
        saveCompanionPersonality(accountPersonality);
      } else {
        const defaultP = resetCompanionPersonality();
        setPersonality(defaultP);
        saveCompanionPersonality(defaultP);
      }

      // 4. Load chats EXCLUSIVELY for this account from Supabase
      const cloudChats = await loadChatsFromSupabase(newUserId);
      if (cloudChats && cloudChats.length > 0) {
        const sorted = [...cloudChats].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setSessions(sorted);
        saveSessions(sorted, newUserId);
        setActiveSessionId(sorted[0].id);
      } else {
        // Check offline cache exclusively for this specific user if any
        const cachedUserChats = loadSavedSessions(newUserId);
        if (cachedUserChats.length > 0) {
          setSessions(cachedUserChats);
          setActiveSessionId(cachedUserChats[0].id);
        } else {
          // Account has no chats yet: start fresh with a clean session for this user
          const fresh = [createNewSession()];
          setSessions(fresh);
          saveSessions(fresh, newUserId);
          setActiveSessionId(fresh[0].id);
        }
      }
    },
    [handleStopStreaming]
  );

  // Sync profile, personality & chats on Supabase auth change
  useEffect(() => {
    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthUserSwitch(session?.user || null);
    });

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        await handleAuthUserSwitch(null);
      } else {
        await handleAuthUserSwitch(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleAuthUserSwitch]);

  // Ensure activeSessionId stays synchronized with valid sessions
  useEffect(() => {
    if (sessions.length > 0 && (!activeSessionId || !sessions.some((s) => s.id === activeSessionId))) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Save sessions to localStorage whenever they change (strictly scoped to logged-in user)
  useEffect(() => {
    if (sessions.length > 0 && userProfile?.id) {
      saveSessions(sessions, userProfile.id);
    }
  }, [sessions, userProfile?.id]);

  // Save active session id (strictly scoped to logged-in user)
  useEffect(() => {
    if (activeSessionId && userProfile?.id) {
      saveActiveChatId(activeSessionId, userProfile.id);
    }
  }, [activeSessionId, userProfile?.id]);

  // Find active session
  const activeSession = useMemo(() => {
    return (
      sessions.find((s) => s.id === activeSessionId) ||
      sessions[0] ||
      createNewSession()
    );
  }, [sessions, activeSessionId]);

  // Navigation handlers
  const handleTabChange = (tab: ActiveTab) => {
    // If switching to profile directly via bottom bar, show current user's profile
    if (tab === 'profile') {
      setViewedProfile(null);
    }
    setActiveTab(tab);
  };

  // Open/Close Menu drawer
  const handleOpenMenu = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleOpenClearModal = useCallback(() => {
    setIsClearModalOpen(true);
  }, []);

  const handleOpenAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  // View user profile (e.g. from @mentions or clicking user avatar)
  const handleViewProfile = async (username: string) => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');

    // Companion profile view is disabled as personality is dynamic and customizable
    if (clean === 'niki' || clean === 'nikilow' || clean === personality.name.toLowerCase()) {
      return;
    }

    // If it's @misiori or @kodewt (creator & boyfriend)
    if (clean === 'misiori' || clean === 'kodewt') {
      if (userProfile?.username.toLowerCase() === 'misiori' || userProfile?.username.toLowerCase() === 'kodewt') {
        setViewedProfile(userProfile);
      } else {
        const found = await fetchProfileByUsername(clean);
        setViewedProfile(
          found || {
            id: 'misiori_creator',
            name: 'misiori',
            username: 'misiori',
            email: 'misiori@naisuru.app',
            avatar_url:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
            bio: '',
            is_verified: true,
            created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
            updated_at: new Date().toISOString(),
          }
        );
      }
      setActiveTab('profile');
      return;
    }

    // If it's the current user
    if (userProfile && userProfile.username.toLowerCase() === clean) {
      setViewedProfile(null);
      setActiveTab('profile');
      return;
    }

    // Lookup in Supabase or local posts
    const foundProfile = await fetchProfileByUsername(clean);
    if (foundProfile) {
      setViewedProfile(foundProfile);
    } else {
      // Find author from posts as fallback
      const matchingPost = posts.find(
        (p) => p.authorUsername.toLowerCase() === clean
      );
      setViewedProfile({
        id: matchingPost?.userId || `user_${clean}`,
        name: matchingPost?.authorName || clean,
        username: clean,
        email: `${clean}@community.local`,
        avatar_url: matchingPost?.authorAvatar || '',
        bio: '',
        is_verified: clean === 'kodewt' || clean === 'misiori',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setActiveTab('profile');
  };

  // Back button handler when viewing another user's profile
  const handleBackFromProfile = () => {
    setViewedProfile(null);
  };

  // Add post handler (max 300 chars) - instant optimistic update with 5-minute rate limit
  const handleAddPost = async (content: string) => {
    if (!userProfile) {
      setIsAuthModalOpen(true);
      throw new Error('Please sign in to publish posts.');
    }

    const trimmed = content.trim();
    if (!trimmed) return;

    // Check 5-minute rate limit for posting updates
    const userPosts = posts.filter(
      (p) =>
        p.userId === userProfile.id ||
        p.authorUsername.toLowerCase() === userProfile.username.toLowerCase()
    );
    const rateLimit = getPostRateLimitStatus(userProfile.id, userPosts);
    if (rateLimit.isRateLimited) {
      throw new Error(
        `Rate limit active: you can only post updates once every 5 minutes (wait ${rateLimit.formattedRemaining}).`
      );
    }

    const now = Date.now();
    const tempId = 'post_' + now + '_' + Math.random().toString(36).substring(2, 6);
    const isSpecialVerified =
      userProfile.username.toLowerCase() === 'kodewt' ||
      userProfile.username.toLowerCase() === 'misiori';
    const isVerifiedUser = isSpecialVerified || Boolean(userProfile.is_verified);
    const sanitizedDeco = userProfile.decorations
      ? {
          ...userProfile.decorations,
          badge: isVerifiedUser ? userProfile.decorations.badge !== false : false,
        }
      : undefined;

    const optimisticPost: Post = {
      id: tempId,
      userId: userProfile.id,
      authorName: userProfile.name || userProfile.username,
      authorUsername: userProfile.username,
      authorAvatar: userProfile.avatar_url || '',
      content: trimmed,
      createdAt: now,
      likesCount: 0,
      isLiked: false,
      isVerified: isVerifiedUser,
      decorations: sanitizedDeco,
    };

    // 1. Instant visual display
    setPosts((prev) => [optimisticPost, ...prev]);

    // 2. Background database persistence
    try {
      const savedPost = await createFeedPost(
        { content: trimmed, userProfile, skipRateLimitCheck: true },
        undefined,
        true
      );
      if (savedPost) {
        setPosts((prev) =>
          prev.map((p) => (p.id === tempId ? { ...savedPost, isLiked: false } : p))
        );
      }
    } catch (err) {
      // Revert optimistic post on failure
      setPosts((prev) => prev.filter((p) => p.id !== tempId));
      console.error('Failed to sync post to database:', err);
      throw err;
    }
  };

  // Delete post handler - instant removal
  const handleDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await deleteFeedPost(postId, userProfile?.id);
    } catch (err) {
      console.warn('Failed to delete post from remote:', err);
    }
  };

  // Like post handler - unregistered users cannot like and are forced to log in
  const handleLikePost = async (postId: string) => {
    if (!userProfile) {
      setIsAuthModalOpen(true);
      return;
    }

    // Prevent concurrent duplicate clicks on the same post
    if (likingPostsRef.current.has(postId)) {
      return;
    }
    likingPostsRef.current.add(postId);

    const post = posts.find((p) => p.id === postId);
    if (!post) {
      likingPostsRef.current.delete(postId);
      return;
    }

    // Instant optimistic toggle
    const willBeLiked = !post.isLiked;
    const newLikesCount = willBeLiked
      ? (post.likesCount || 0) + 1
      : Math.max(0, (post.likesCount || 0) - 1);

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: willBeLiked, likesCount: newLikesCount }
          : p
      )
    );

    try {
      const result = await togglePostLike(postId, userProfile.id);
      if (result && typeof result.newCount === 'number') {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: result.isLiked, likesCount: result.newCount }
              : p
          )
        );
      }
    } catch (err) {
      console.warn('togglePostLike error:', err);
    } finally {
      likingPostsRef.current.delete(postId);
    }
  };

  // Profile updated handler
  const handleProfileUpdated = (updated: UserProfile) => {
    setUserProfile(updated);
    if (viewedProfile?.id === updated.id) {
      setViewedProfile(updated);
    }

    // Also update any posts authored by this user by ID so username change cascades instantly
    setPosts((prev) =>
      prev.map((p) => {
        if (p.userId === updated.id) {
          return {
            ...p,
            authorName: updated.name || updated.username,
            authorUsername: updated.username,
            authorAvatar: updated.avatar_url,
            isVerified:
              updated.username.toLowerCase() === 'kodewt' ||
              updated.username.toLowerCase() === 'misiori' ||
              Boolean(updated.is_verified),
            decorations: updated.decorations,
          };
        }
        return p;
      })
    );
  };

  // Sign out handler
  const handleSignOut = async () => {
    handleStopStreaming();
    clearAllChatLocalStorage();
    await supabase.auth.signOut();
    await handleAuthUserSwitch(null);
  };

  // Chat Sessions handlers
  const handleNewSession = () => {
    handleStopStreaming();
    const newSession = createNewSession();
    setSessions((prev) => {
      const next = [newSession, ...prev];
      if (userProfile?.id) {
        saveSessions(next, userProfile.id);
      }
      return next;
    });
    setActiveSessionId(newSession.id);
    setActiveTab('chat');
  };

  const handleSelectSession = (id: string) => {
    handleStopStreaming();
    setActiveSessionId(id);
    setActiveTab('chat');
  };

  const handleDeleteSession = (id: string) => {
    if (userProfile?.id) {
      deleteChatFromSupabase(id, userProfile.id).catch((err) => {
        console.warn('deleteChatFromSupabase notice:', err);
      });
    }
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = createNewSession();
        setActiveSessionId(fresh.id);
        if (userProfile?.id) {
          saveSessions([fresh], userProfile.id);
        }
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
      }
      if (userProfile?.id) {
        saveSessions(remaining, userProfile.id);
      }
      return remaining;
    });
  };

  const handleClearAllConfirm = () => {
    handleStopStreaming();
    if (userProfile?.id) {
      clearAllChatsFromSupabase(userProfile.id).catch((err) => {
        console.warn('clearAllChatsFromSupabase notice:', err);
      });
    }
    clearSavedSessions(userProfile?.id);
    const fresh = createNewSession();
    setSessions([fresh]);
    if (userProfile?.id) {
      saveSessions([fresh], userProfile.id);
    }
    setActiveSessionId(fresh.id);
    setIsClearModalOpen(false);
  };

  // Send message to Nikilow
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const cleanUserText = text.trim();
    const currentSessionId = activeSession.id;
    const userTimestamp = Date.now();
    const assistantTimestamp = userTimestamp + 50;

    const userMessage: Message = {
      id: 'msg_u_' + userTimestamp + '_' + Math.random().toString(36).substring(2, 6),
      role: 'user',
      content: cleanUserText,
      createdAt: userTimestamp,
    };

    const assistantPlaceholderId =
      'msg_a_' + assistantTimestamp + '_' + Math.random().toString(36).substring(2, 6);
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      createdAt: assistantTimestamp,
    };

    // Keep the most recent 20 messages for high-speed prompt processing and memory continuity
    const existingMessages = activeSession.messages || [];
    const recentHistory = existingMessages.slice(-20);
    const conversationHistory = [
      ...recentHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: cleanUserText },
    ];

    // Atomically update sessions state and persist to localStorage
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === currentSessionId);
      let next: ChatSession[];
      if (exists) {
        next = prev.map((s) => {
          if (s.id === currentSessionId) {
            const isFirst = s.messages.length === 0;
            return {
              ...s,
              title: isFirst ? cleanUserText.slice(0, 32) : s.title,
              updatedAt: Date.now(),
              messages: [...s.messages, userMessage, assistantMessage],
            };
          }
          return s;
        });
      } else {
        const freshSession: ChatSession = {
          ...activeSession,
          id: currentSessionId,
          title: cleanUserText.slice(0, 32),
          updatedAt: Date.now(),
          messages: [...existingMessages, userMessage, assistantMessage],
        };
        next = [freshSession, ...prev];
      }
      saveSessions(next, userProfile?.id);
      return next;
    });

    setActiveSessionId(currentSessionId);

    // Immediately sync user message to Supabase so it persists across devices right away
    if (userProfile?.id) {
      const immediateChat: ChatSession = {
        ...activeSession,
        id: currentSessionId,
        title: activeSession.messages.length === 0 ? cleanUserText.slice(0, 32) : activeSession.title,
        updatedAt: Date.now(),
        messages: [...existingMessages, userMessage],
      };
      syncChatToSupabase(immediateChat, userProfile.id).catch((err) => {
        console.warn('Immediate chat sync notice:', err);
      });
    }

    // Build concise cross-chat context so companion retains long-term memory without token bloat
    const otherSessions = sessions.filter((s) => s.id !== currentSessionId);
    const crossChatNotes: string[] = [];
    for (const s of otherSessions.slice(0, 5)) {
      if (s.messages.length > 0) {
        const exchanges = s.messages.slice(-4).map((m) => {
          const roleLabel = m.role === 'user' ? 'User' : (personality?.name || 'Nikilow');
          return `${roleLabel}: ${m.content.trim().slice(0, 120)}`;
        });
        if (exchanges.length > 0) {
          crossChatNotes.push(
            `[Chat "${s.title || 'Untitled'}"]:\n${exchanges.join('\n')}`
          );
        }
      }
    }
    const crossChatContext = crossChatNotes.slice(0, 5).join('\n\n');

    // Extract community usernames from loaded posts so companion recognizes anybody on the platform
    const communityUsernames = Array.from(
      new Set(
        posts
          .map((p) => p.authorUsername?.trim())
          .filter((u): u is string => Boolean(u && u.length > 0))
      )
    );

    setIsStreaming(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const requestPayload = {
        messages: conversationHistory,
        userProfile: userProfile
          ? {
              name: userProfile.name,
              username: userProfile.username,
              bio: userProfile.bio,
            }
          : { name: 'Friend', username: 'guest' },
        crossChatContext: crossChatContext || undefined,
        customPersonality: personality,
        communityUsernames,
      };

      let response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal,
      });

      // If server returned 404 for /api/chat, fall back to /api/chat/stream
      if (response.status === 404) {
        response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
          signal: abortController.signal,
        });
      }

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response stream body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');

          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              const errTxt = parsed.error;
              accumulatedText = accumulatedText
                ? `${accumulatedText}\n\n${errTxt}`
                : errTxt;
            } else if (parsed.text) {
              accumulatedText += parsed.text;
            }

            setSessions((prev) =>
              prev.map((s) => {
                if (s.id === currentSessionId) {
                  return {
                    ...s,
                    updatedAt: Date.now(),
                    messages: s.messages.map((m) =>
                      m.id === assistantPlaceholderId
                        ? { ...m, content: accumulatedText }
                        : m
                    ),
                  };
                }
                return s;
              })
            );
          } catch {
            // ignore non-json SSE frames
          }
        }
      }

      // Persist completed conversation state to localStorage and Supabase
      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: s.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, content: accumulatedText || m.content }
                  : m
              ),
            };
          }
          return s;
        });
        if (userProfile?.id) {
          saveSessions(updated, userProfile.id);
        }

        // Sync to Supabase if logged in
        if (userProfile?.id && accumulatedText) {
          const currentChat = updated.find((s) => s.id === currentSessionId);
          if (currentChat) {
            syncChatToSupabase(currentChat, userProfile.id);
          }
        }

        return updated;
      });
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        console.warn('Chat request notice:', error.message || error);
        setSessions((prev) => {
          const updated = prev.map((s) => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        content:
                          m.content ||
                          "I had a quick connection glitch for a moment. Tap retry or send your message again.",
                      }
                    : m
                ),
              };
            }
            return s;
          });
          if (userProfile?.id) {
            saveSessions(updated, userProfile.id);
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      setSessions((prev) => {
        if (userProfile?.id) {
          saveSessions(prev, userProfile.id);
        }
        return prev;
      });
    }
  };

  // Quick retry handler for last message
  const handleRetry = () => {
    if (isStreaming) return;
    const msgs = activeSession.messages;
    if (msgs.length === 0) return;

    let lastUserText = '';
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserText = msgs[i].content;
        break;
      }
    }
    if (!lastUserText) return;

    // Remove the trailing assistant message that failed or glitched
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === activeSession.id) {
          const lastM = s.messages[s.messages.length - 1];
          const newMsgs =
            lastM && lastM.role === 'assistant'
              ? s.messages.slice(0, -1)
              : s.messages;
          return {
            ...s,
            messages: newMsgs,
          };
        }
        return s;
      });
      if (userProfile?.id) {
        saveSessions(updated, userProfile.id);
      }
      return updated;
    });

    setTimeout(() => {
      handleSendMessage(lastUserText);
    }, 40);
  };

  // Render Admin Moderation Portal if path is /admin
  if (currentPath === '/admin') {
    return (
      <div className={`min-h-screen w-full ${theme === 'dark' ? 'dark' : ''}`}>
        <AdminPanel
          onBackToApp={() => {
            navigateTo('/');
            refreshPosts();
          }}
          onViewProfile={(username) => {
            navigateTo('/');
            handleViewProfile(username);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-gray-900 dark:text-gray-100 font-sans selection:bg-white/30 relative transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Side navigation menu on computers (toggleable sections sidebar) */}
      <DesktopNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userProfile={userProfile}
        accentColor={accentColor}
        personality={personality}
        isOpen={isDesktopNavOpen}
        onToggle={toggleDesktopNav}
      />

      {/* Floating button to restore side navigation on computers when hidden */}
      {!isDesktopNavOpen && (
        <button
          type="button"
          onClick={toggleDesktopNav}
          className="fixed top-1/2 -translate-y-1/2 left-0 z-40 hidden md:flex items-center justify-center p-2.5 rounded-r-xl bg-[#0d1017]/90 hover:bg-[#151924] backdrop-blur-md border border-l-0 border-gray-800/90 text-gray-300 hover:text-white hover:border-white/40 shadow-lg transition-all hover-jump-sm cursor-pointer"
          title="show sections"
          aria-label="Show navigation sections"
        >
          <PanelLeftOpen size={16} className="text-white" />
        </button>
      )}

      {/* Slide-in menu & chat history drawer */}
      <Sidebar
        sessions={userProfile ? sessions : []}
        activeId={activeSession.id}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleOpenClearModal}
        isOpen={isSidebarOpen}
        onCloseMobile={handleCloseSidebar}
        userProfile={userProfile}
        onOpenProfile={() => {
          setViewedProfile(null);
          setActiveTab('profile');
        }}
        onOpenAuth={handleOpenAuthModal}
        onSignOut={handleSignOut}
        personality={personality}
        onSavePersonality={handleSavePersonality}
        onResetPersonality={handleResetPersonality}
        wallpaperSettings={wallpaperSettings}
        onUpdateWallpaper={handleWallpaperUpdate}
      />

      {/* Main Content Area switched by Apple Nav Bar */}
      <main
        className="flex-1 flex flex-col h-full overflow-hidden relative"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab + (activeTab === 'profile' && viewedProfile ? `_${viewedProfile.username}` : '')}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            className="flex-1 flex flex-col h-full overflow-hidden relative"
          >
            {activeTab === 'feed' && (
              <FeedView
                posts={posts}
                userProfile={userProfile}
                onAddPost={handleAddPost}
                onLikePost={handleLikePost}
                onDeletePost={handleDeletePost}
                onViewProfile={handleViewProfile}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onRefreshFeed={refreshPosts}
                isRefreshing={isRefreshingFeed}
                onOpenMenu={handleOpenMenu}
              />
            )}

            {activeTab === 'search' && (
              <SearchView
                onOpenUserProfile={handleViewProfile}
                onOpenChatWithCompanion={() => setActiveTab('chat')}
                posts={posts}
                currentUserProfile={userProfile}
              />
            )}

            {activeTab === 'chat' && (
              <ChatArea
                messages={activeSession.messages}
                isStreaming={isStreaming}
                onSendMessage={handleSendMessage}
                onStopStreaming={handleStopStreaming}
                onOpenMenu={handleOpenMenu}
                onNewChat={handleNewSession}
                userProfile={userProfile}
                onOpenProfile={() => setActiveTab('profile')}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                personality={personality}
                onMentionClick={handleViewProfile}
                wallpaperSettings={wallpaperSettings}
                onOpenVisualisation={() => setIsVisualisationOpen(true)}
                accentColor={accentColor}
                onRetry={handleRetry}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                currentUser={userProfile}
                viewedUser={viewedProfile}
                posts={posts}
                onBack={viewedProfile ? handleBackFromProfile : undefined}
                onEditProfile={() => setIsEditProfileOpen(true)}
                onSignOut={handleSignOut}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onAddPost={handleAddPost}
                onLikePost={handleLikePost}
                onDeletePost={handleDeletePost}
                onViewProfile={handleViewProfile}
                onOpenMenu={handleOpenMenu}
              />
            )}

            {activeTab === 'more' && (
              <MoreView
                accentColor={accentColor}
                onSelectAccentColor={handleAccentChange}
                bgTheme={bgTheme}
                onSelectBgTheme={handleBgThemeChange}
                onOpenUserProfile={handleViewProfile}
                onReplayIntro={() => setHasSeenIntro(false)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Apple-style Bottom Navigation Bar (Both Desktop & Mobile) */}
        <AppleNavBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          userProfile={userProfile}
          accentColor={accentColor}
        />
      </main>

      {/* Visualisation / Chat Wallpaper Modal */}
      <VisualisationModal
        isOpen={isVisualisationOpen}
        onClose={() => setIsVisualisationOpen(false)}
        wallpaperSettings={wallpaperSettings}
        onUpdateWallpaper={handleWallpaperUpdate}
      />

      {/* Offline Status Toast Indicator */}
      <OfflineIndicator />

      {/* Welcome Animated Intro (Welcome to naisuru -> small circle -> app emerges) */}
      {!hasSeenIntro && (
        <IntroAnimation onComplete={() => setHasSeenIntro(true)} />
      )}

      {/* Edit Profile Modal */}
      {userProfile && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          userProfile={userProfile}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(profile) => {
          setUserProfile(profile);
          // If @kodewt, refresh posts to reflect status
          refreshPosts();
        }}
      />

      {/* Clear all conversations confirmation modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="clear all conversations?"
        message={`all your past chats with ${personality.name.toLowerCase()} will be permanently deleted from this device. this action cannot be undone.`}
        confirmLabel="clear everything"
        cancelLabel="keep conversations"
        danger={true}
        onConfirm={handleClearAllConfirm}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
}
