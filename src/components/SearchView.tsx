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

  // Dynamic user directory built strictly from real data: posts and current profile (no fake presets)
  const directory: CommunityUser[] = useMemo(() => {
    const list: CommunityUser[] = [];

    // Add current user if available
    if (currentUserProfile) {
      const currentClean = currentUserProfile.username.replace('@', '').trim().toLowerCase();
      if (currentClean) {
        list.push({
          id: currentUserProfile.id,
          name: currentUserProfile.name,
          username: currentClean,
          avatar_url:
            currentUserProfile.avatar_url ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${currentClean}`,
          bio: currentUserProfile.bio || '',
          is_verified: Boolean(currentUserProfile.is_verified),
          posts_count: posts.filter(
            (item) => item.authorUsername.replace('@', '').trim().toLowerCase() === currentClean
          ).length,
        });
      }
    }

    // Add actual authors from real feed posts if not already present
    posts.forEach((p) => {
      const cleanUser = p.authorUsername.replace('@', '').trim().toLowerCase();
      if (!cleanUser) return;
      if (!list.some((u) => u.username.toLowerCase() === cleanUser)) {
        list.push({
          id: `post_user_${cleanUser}`,
          name: p.authorName,
          username: cleanUser,
          avatar_url:
            p.authorAvatar ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUser}`,
          bio: '',
          is_verified: Boolean(p.isVerified),
          posts_count: posts.filter(
            (item) => item.authorUsername.replace('@', '').trim().toLowerCase() === cleanUser
          ).length,
        });
      }
    });

    return list;
  }, [posts, currentUserProfile]);

  // Filter based on query
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase().replace('@', '');
    if (!q) return [];
    return directory.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        (u.bio && u.bio.toLowerCase().includes(q))
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
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-gray-100/80 dark:bg-gray-800/60 border border-transparent focus:border-white/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 transition lowercase"
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
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {user.name}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            @{user.username}
                          </span>
                          {user.is_verified && <VerifiedBadge size="sm" />}
                        </div>
                        {user.bio && user.bio.trim() ? (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-xs mt-0.5">
                            {user.bio.trim()}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
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
