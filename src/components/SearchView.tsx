import { FC, useState, useMemo } from 'react';
import { Search as SearchIcon, X, UserCheck, MessageSquare, Sparkles } from 'lucide-react';
import { UserProfile, Post } from '../types';
import { VerifiedBadge } from './VerifiedBadge';

interface SearchViewProps {
  onOpenUserProfile: (username: string) => void;
  onOpenChatWithCompanion?: () => void;
  posts: Post[];
  currentUserProfile: UserProfile | null;
}

interface CommunityUser {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  bio: string;
  is_verified: boolean;
  posts_count: number;
}

export const SearchView: FC<SearchViewProps> = ({
  onOpenUserProfile,
  onOpenChatWithCompanion,
  posts,
  currentUserProfile,
}) => {
  const [query, setQuery] = useState('');

  // Curated and dynamic user directory
  const directory: CommunityUser[] = useMemo(() => {
    const list: CommunityUser[] = [
      {
        id: 'user_misiori',
        name: 'misiori',
        username: 'misiori',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        bio: 'creator of naisuru • building whatever u want with a prompt',
        is_verified: true,
        posts_count: posts.filter((p) => p.authorUsername.toLowerCase() === 'misiori').length || 12,
      },
      {
        id: 'user_niki',
        name: 'niki',
        username: 'niki',
        avatar_url: 'https://i.pinimg.com/736x/a1/8f/50/a18f5016507bf9e3ea6bda97da769913.jpg',
        bio: 'your thoughtful, aesthetic companion. talking to @misiori',
        is_verified: true,
        posts_count: posts.filter((p) => p.authorUsername.toLowerCase() === 'niki' || p.authorUsername.toLowerCase() === 'nikilow').length || 24,
      },
      {
        id: 'user_luna',
        name: 'luna',
        username: 'luna_art',
        avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
        bio: 'visual artist & prompt engineer. creating dreamy atmospheres',
        is_verified: false,
        posts_count: posts.filter((p) => p.authorUsername.toLowerCase() === 'luna_art').length || 5,
      },
      {
        id: 'user_rei',
        name: 'rei',
        username: 'rei_synth',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
        bio: 'lo-fi melodies, twilight coffee, and neural stories',
        is_verified: false,
        posts_count: posts.filter((p) => p.authorUsername.toLowerCase() === 'rei_synth').length || 8,
      },
      {
        id: 'user_zen',
        name: 'zen',
        username: 'zen_walk',
        avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
        bio: 'minimalism, poetry, and quiet moments in the rain',
        is_verified: false,
        posts_count: posts.filter((p) => p.authorUsername.toLowerCase() === 'zen_walk').length || 3,
      },
    ];

    // Add authors from feed posts if not already present
    posts.forEach((p) => {
      const cleanUser = p.authorUsername.replace('@', '').toLowerCase();
      if (!list.some((u) => u.username.toLowerCase() === cleanUser)) {
        list.push({
          id: `post_user_${cleanUser}`,
          name: p.authorName,
          username: cleanUser,
          avatar_url:
            p.authorAvatar ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUser}`,
          bio: 'community member on naisuru',
          is_verified: p.isVerified || cleanUser === 'misiori',
          posts_count: posts.filter(
            (item) => item.authorUsername.replace('@', '').toLowerCase() === cleanUser
          ).length,
        });
      }
    });

    // Add current user if available
    if (currentUserProfile) {
      const currentClean = currentUserProfile.username.replace('@', '').toLowerCase();
      if (!list.some((u) => u.username.toLowerCase() === currentClean)) {
        list.push({
          id: currentUserProfile.id,
          name: currentUserProfile.name,
          username: currentClean,
          avatar_url:
            currentUserProfile.avatar_url ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${currentClean}`,
          bio: currentUserProfile.bio || 'naisuru member',
          is_verified:
            currentUserProfile.is_verified || currentClean === 'misiori',
          posts_count: 0,
        });
      }
    }

    return list;
  }, [posts, currentUserProfile]);

  // Filter based on query
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase().replace('@', '');
    if (!q) return directory;
    return directory.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.bio.toLowerCase().includes(q)
    );
  }, [directory, query]);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-24 md:pb-8 space-y-4 select-none">
      {/* Search Header */}
      <div className="px-1">
        <h1 className="text-base font-semibold text-gray-900 dark:text-white lowercase">
          search
        </h1>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <SearchIcon size={16} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search"
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-gray-100/80 dark:bg-gray-800/60 border border-transparent focus:border-rose-500/50 dark:focus:border-rose-500/40 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition lowercase"
          autoFocus={false}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Search results list */}
      <div className="space-y-2">
        {query.trim() ? (
          <>
            <div className="flex items-center justify-between px-1 text-xs text-gray-400 font-mono">
              <span>results ({filteredUsers.length})</span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-xs font-mono">
                no users found for "{query}"
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isMisiori = user.username.toLowerCase() === 'misiori';
                const isNiki =
                  user.username.toLowerCase() === 'niki' ||
                  user.username.toLowerCase() === 'nikilow';

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#121620] border border-gray-100 dark:border-gray-800/80 hover:border-gray-200 dark:hover:border-gray-700/80 transition group cursor-pointer"
                    onClick={() => onOpenUserProfile(user.username)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                          referrerPolicy="no-referrer"
                        />
                        {user.is_verified && (
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <VerifiedBadge size="sm" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {user.name}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            @{user.username}
                          </span>
                          {isMisiori && <VerifiedBadge size="sm" />}
                          {isNiki && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">
                              companion
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-xs mt-0.5">
                          {user.bio}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      {isNiki && onOpenChatWithCompanion && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChatWithCompanion();
                          }}
                          className="p-2 rounded-xl text-pink-500 hover:bg-pink-500/10 transition cursor-pointer"
                          title="chat with niki"
                        >
                          <MessageSquare size={15} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenUserProfile(user.username);
                        }}
                        className="px-3 py-1 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                      >
                        profile
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400 text-xs font-mono">
            type to search users
          </div>
        )}
      </div>
    </div>
  );
};
