import { FC, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  MessageSquare,
  Sparkles,
  Trash2,
  Moon,
  Sun,
  X,
  Search,
  User,
  LogIn,
  LogOut,
  Lock,
  Palette,
  Heart,
} from 'lucide-react';
import {
  ChatSession,
  ThemeMode,
  UserProfile,
  CompanionPersonality,
  DEFAULT_NIKILOW_AVATAR,
} from '../types';
import { formatTimeAgo } from '../utils/storage';
import { ChatWallpaperSettings } from '../utils/wallpaper';
import { VerifiedBadge } from './VerifiedBadge';
import { PersonalitySettings } from './PersonalitySettings';
import { VisualisationSettings } from './VisualisationSettings';

interface SidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  userProfile: UserProfile | null;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onSignOut?: () => void;
  personality: CompanionPersonality;
  onSavePersonality: (updated: CompanionPersonality) => void;
  onResetPersonality: () => void;
  initialTab?: 'chats' | 'personality' | 'visualisation';
  wallpaperSettings?: ChatWallpaperSettings;
  onUpdateWallpaper?: (settings: ChatWallpaperSettings) => void;
}

export const Sidebar: FC<SidebarProps> = ({
  sessions,
  activeId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAll,
  theme,
  onToggleTheme,
  isOpen,
  onCloseMobile,
  userProfile,
  onOpenProfile,
  onOpenAuth,
  onSignOut,
  personality,
  onSavePersonality,
  onResetPersonality,
  initialTab = 'chats',
  wallpaperSettings,
  onUpdateWallpaper,
}) => {
  const [menuTab, setMenuTab] = useState<'chats' | 'personality' | 'visualisation'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Sync menuTab if initialTab changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setMenuTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCloseMobile]);

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = s.title.toLowerCase().includes(q);
    const messageMatch = s.messages.some((m) =>
      m.content.toLowerCase().includes(q)
    );
    return titleMatch || messageMatch;
  });

  const rawUser = userProfile?.username?.trim().replace(/^@+/, '').toLowerCase() || '';
  const rawName = userProfile?.name?.trim().toLowerCase() || '';

  const isDatingThisUser = Boolean(
    personality.relationshipStatus === 'dating_user' ||
    (personality.relationshipStatus === 'custom' &&
      personality.partnerName &&
      (rawUser === personality.partnerName.trim().replace(/^@+/, '').toLowerCase() ||
        rawName === personality.partnerName.trim().toLowerCase())) ||
    (!personality.relationshipStatus &&
      userProfile &&
      (rawUser === 'misiori' || rawUser === 'kodewt' || rawName.includes('misiori')))
  );

  const isMisiori =
    userProfile &&
    (userProfile.username.toLowerCase() === 'misiori' ||
      userProfile.username.toLowerCase() === 'kodewt' ||
      userProfile.name.toLowerCase().includes('misiori'));

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-4 pb-3 flex items-center justify-between border-b border-gray-200/60 dark:border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-gray-300 dark:ring-gray-700 shadow-xs bg-gray-100 dark:bg-gray-800">
            <img
              src={personality.avatarUrl}
              alt={personality.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_NIKILOW_AVATAR;
              }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold tracking-tight text-sm text-gray-900 dark:text-gray-100 truncate">
                {personality.name}
              </span>
              {(personality.name.toLowerCase() === 'dary' || personality.name.toLowerCase() === 'niki' || personality.name.toLowerCase() === 'nikilow') && (
                <VerifiedBadge size="sm" />
              )}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
              {personality.relationshipStatus === 'dating' ? (
                <span className="text-gray-800 dark:text-gray-200 flex items-center gap-1 font-medium">
                  <Heart size={10} className="fill-current text-white shrink-0" />
                  dating
                </span>
              ) : (
                <span>friends</span>
              )}
            </div>
          </div>
        </div>

        {/* Close modal button */}
        <button
          onClick={onCloseMobile}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
          aria-label="close menu"
          title="close (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Segmented Control Tabs: Conversations vs Personality vs Visualisation */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center p-1 bg-gray-200/70 dark:bg-[#161a22] rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setMenuTab('chats')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              menuTab === 'chats'
                ? 'bg-white dark:bg-[#202734] text-gray-900 dark:text-gray-100 shadow-xs font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <MessageSquare size={13} />
            <span className="truncate">chats</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuTab('personality')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              menuTab === 'personality'
                ? 'bg-white dark:bg-[#202734] text-gray-900 dark:text-gray-100 shadow-xs font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Sparkles size={13} />
            <span className="truncate">persona</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuTab('visualisation')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              menuTab === 'visualisation'
                ? 'bg-white dark:bg-[#202734] text-gray-900 dark:text-gray-100 shadow-xs font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Palette size={13} />
            <span className="truncate">visual</span>
          </button>
        </div>
      </div>

      {/* Tab Content: Visualisation vs Personality vs Conversations */}
      {menuTab === 'visualisation' && wallpaperSettings && onUpdateWallpaper ? (
        <VisualisationSettings
          wallpaperSettings={wallpaperSettings}
          onUpdateWallpaper={onUpdateWallpaper}
          onClose={onCloseMobile}
        />
      ) : menuTab === 'personality' ? (
        <PersonalitySettings
          personality={personality}
          onSave={onSavePersonality}
          onResetToDefault={onResetPersonality}
          onClose={onCloseMobile}
          userProfile={userProfile}
        />
      ) : (
        /* Tab Content: Conversations */
        <>
          {/* New chat action */}
          <div className="px-3 py-1.5">
            <button
              onClick={() => {
                onNewSession();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-medium transition-all shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <Plus size={14} />
              <span>new chat</span>
            </button>
          </div>

          {/* Search conversations - only shown when logged in and has multiple conversations */}
          {userProfile && sessions.length > 2 && (
            <div className="px-3 pt-1 pb-1">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="search..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-[#161a22] border border-gray-200 dark:border-gray-800/80 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:border-gray-400 dark:focus:border-gray-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

      {/* Conversations history list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 flex flex-col">
        <div className="px-2.5 py-1 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 tracking-wider">
            conversations
          </span>
          {userProfile ? (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
              {sessions.length}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Lock size={10} />
              <span>account required</span>
            </span>
          )}
        </div>

        {!userProfile ? (
          <div className="my-auto px-3 py-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#181d26] border border-gray-200/80 dark:border-gray-800/80 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-2.5 shadow-2xs">
              <Lock size={17} />
            </div>
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
              history locked
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-[210px] mb-3.5">
              chat history is hidden while logged out. sign in to your account to view your past conversations.
            </p>
            <button
              onClick={() => {
                onOpenAuth();
                onCloseMobile();
              }}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-medium transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <LogIn size={13} />
              <span>sign in to view</span>
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {searchQuery ? 'no matching conversations' : 'no conversations yet'}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeId;
            const lastMsg =
              session.messages[session.messages.length - 1]?.content;

            return (
              <div
                key={session.id}
                className={`relative flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left cursor-pointer transition-all ${
                  isActive
                    ? 'bg-white dark:bg-[#181d26] text-gray-900 dark:text-gray-100 shadow-xs border border-gray-200/80 dark:border-gray-800'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                onClick={() => {
                  onSelectSession(session.id);
                  onCloseMobile();
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare
                    size={14}
                    className={`shrink-0 transition-colors ${
                      isActive
                        ? 'text-gray-900 dark:text-gray-200'
                        : 'text-gray-400'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-snug">
                      {session.title || 'untitled'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        {lastMsg
                          ? lastMsg.slice(0, 26) + (lastMsg.length > 26 ? '...' : '')
                          : 'empty'}
                      </span>
                      <span className="text-[9px] text-gray-300 dark:text-gray-600">
                        •
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 font-mono">
                        {formatTimeAgo(session.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delete button: visible by default without hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSessionToDelete(session.id);
                  }}
                  className="p-1 rounded-md text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                  title="delete conversation"
                  aria-label="delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* User Account / Profile Section */}
      <div className="p-3 border-t border-gray-200/60 dark:border-gray-800/60 bg-white/40 dark:bg-[#0c0e14]/40">
        {userProfile ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onOpenProfile();
                onCloseMobile();
              }}
              className="flex-1 flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-[#161a22] border border-gray-200/80 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700 transition-all text-left shadow-2xs cursor-pointer min-w-0"
            >
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 flex items-center justify-center shrink-0">
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {userProfile.name ? userProfile.name[0].toLowerCase() : 'u'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {userProfile.name}
                  </p>
                  {isMisiori && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  @{userProfile.username}
                </p>
              </div>
            </button>

            {onSignOut && (
              <button
                onClick={() => {
                  onSignOut();
                  onCloseMobile();
                }}
                className="p-2.5 rounded-2xl bg-white dark:bg-[#161a22] border border-gray-200/80 dark:border-gray-800/80 hover:border-white/50 hover:text-white text-gray-400 transition-all shadow-2xs cursor-pointer shrink-0"
                title="sign out"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              onOpenAuth();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white dark:bg-[#161a22] hover:bg-gray-50 dark:hover:bg-[#1c222e] border border-gray-200/80 dark:border-gray-800/80 text-gray-800 dark:text-gray-200 text-xs font-medium transition-all shadow-2xs cursor-pointer"
          >
            <LogIn size={14} className="text-emerald-500" />
            <span>sign in</span>
          </button>
        )}
      </div>

      {/* Footer: clear history if sessions exist AND user is logged in */}
      {userProfile && sessions.length > 0 && (
        <div className="p-3 pt-2 border-t border-gray-200/60 dark:border-gray-800/60">
          <button
            onClick={onClearAll}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>clear history</span>
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Menu Modal (Computers & Phones) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Dialog Card */}
            <motion.div
              id="app-menu-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Menu and conversations"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-md h-[88vh] max-h-[640px] flex flex-col bg-[#f5f6f8] dark:bg-[#0e1117] border border-gray-200/90 dark:border-gray-800/90 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              {renderSidebarContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Single Chat confirmation modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-xs p-5 rounded-2xl bg-white dark:bg-[#151922] border border-gray-200 dark:border-gray-800 shadow-xl">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              delete this conversation?
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              this will remove this chat from your history.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
              >
                cancel
              </button>
              <button
                onClick={() => {
                  if (sessionToDelete) {
                    onDeleteSession(sessionToDelete);
                    setSessionToDelete(null);
                  }
                }}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
              >
                delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
