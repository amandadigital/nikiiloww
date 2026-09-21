import { FC, useState, useMemo, FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Edit3,
  LogOut,
  LogIn,
  Send,
  Sparkles,
  Heart,
  MessageSquare,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Post, UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { PostItem } from './PostItem';
import { usePostRateLimit } from '../utils/rateLimit';
import { DecoratedAvatar } from './DecoratedAvatar';
import { DecoratedName } from './DecoratedName';
import { getBackgroundStyle, getBackgroundOpacity } from '../utils/decorations';

interface ProfileViewProps {
  currentUser: UserProfile | null;
  viewedUser: UserProfile | null;
  posts: Post[];
  onBack?: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
  onOpenAuth: () => void;
  onAddPost: (content: string) => Promise<void>;
  onLikePost: (postId: string) => void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onViewProfile: (username: string) => void;
  onOpenMenu?: () => void;
}

export const ProfileView: FC<ProfileViewProps> = ({
  currentUser,
  viewedUser,
  posts,
  onBack,
  onEditProfile,
  onSignOut,
  onOpenAuth,
  onAddPost,
  onLikePost,
  onDeletePost,
  onViewProfile,
  onOpenMenu,
}) => {
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // If viewedUser is explicitly provided, show that; otherwise show currentUser
  const profile = viewedUser || currentUser;
  const isOwnProfile =
    currentUser && profile && currentUser.username.toLowerCase() === profile.username.toLowerCase();

  const isMisiori =
    Boolean(
      profile?.username.toLowerCase() === 'misiori' ||
      profile?.username.toLowerCase() === 'kodewt'
    );

  const isVerified = isMisiori || Boolean(profile?.is_verified);

  // Posts authored by this profile (matched by userId if present or username)
  const userPosts = useMemo(() => {
    if (!profile) return [];
    return posts.filter(
      (p) =>
        (p.userId && profile.id && p.userId === profile.id) ||
        p.authorUsername.toLowerCase() === profile.username.toLowerCase()
    );
  }, [posts, profile]);

  // Posts authored by current logged-in user (for rate limit check)
  const currentUserPosts = useMemo(() => {
    if (!currentUser) return [];
    return posts.filter(
      (p) =>
        p.userId === currentUser.id ||
        p.authorUsername.toLowerCase() === currentUser.username.toLowerCase()
    );
  }, [posts, currentUser]);

  const { isRateLimited, formattedRemaining, recordPost } = usePostRateLimit(
    currentUser?.id,
    currentUserPosts
  );

  const totalLikes = userPosts.reduce((acc, p) => acc + p.likesCount, 0);

  const handlePostSubmit = (e: FormEvent) => {
    e.preventDefault();
    const toSend = newPostContent.trim();
    if (!toSend || isSubmittingPost) return;

    if (isRateLimited) {
      setPostError(`Rate limit active: you can post updates once every 5 minutes (wait ${formattedRemaining}).`);
      return;
    }

    setIsSubmittingPost(true);
    setPostError(null);

    onAddPost(toSend)
      .then(() => {
        setNewPostContent('');
        recordPost();
      })
      .catch((err: unknown) => {
        setPostError((err as Error)?.message || 'Failed to post');
      })
      .finally(() => {
        setIsSubmittingPost(false);
      });
  };

  // Not signed in and no profile specified to view
  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#fbfbfa] dark:bg-[#0b0d11] pb-24 select-none">
        <div className="max-w-sm w-full p-6 bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-gray-800/80 rounded-3xl shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-50 dark:bg-pink-950/40 text-pink-500 flex items-center justify-center">
            <Sparkles size={28} />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            your profile
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            sign in or create an account to view your profile, publish posts up to 300 characters, and chat directly with dary.
          </p>

          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <LogIn size={15} />
            <span>sign in</span>
          </button>
        </div>
      </div>
    );
  }

  // Only authentic verified users have the ability to make the verified badge seen for everyone
  const isProfileBadge = isVerified && profile.decorations?.badge !== false;
  const hasCustomBg = Boolean(profile.decorations?.backgroundValue);
  const bgOpacity = getBackgroundOpacity(profile.decorations);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto pb-24 md:pb-8 bg-[#fbfbfa] dark:bg-[#0b0d11]">
      {/* Apple-style Navigation Header */}
      <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-4 sm:px-6 bg-white/80 dark:bg-[#0e1117]/80 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-800/80 select-none">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 -ml-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors cursor-pointer"
              aria-label="go back"
            >
              <ArrowLeft size={16} />
              <span>back</span>
            </button>
          ) : (
            <>
              {onOpenMenu && (
                <button
                  onClick={onOpenMenu}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors cursor-pointer mr-1"
                  title="menu"
                  aria-label="menu"
                >
                  <span className="text-xs">menu</span>
                </button>
              )}
              <h1 className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                profile
              </h1>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <>
              <button
                onClick={onEditProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium transition-colors cursor-pointer"
                title="edit profile"
              >
                <Edit3 size={13} />
                <span>edit</span>
              </button>
              <button
                onClick={onSignOut}
                className="p-1.5 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="sign out"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Profile Content */}
      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Profile Card with Decorations (Selected background fully replaces gray) */}
        <div
          className={`relative p-6 sm:p-8 rounded-3xl shadow-xs overflow-hidden transition-all duration-300 ${
            hasCustomBg
              ? 'border border-white/20 text-white shadow-md'
              : 'bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-gray-800/80'
          }`}
          style={hasCustomBg ? getBackgroundStyle(profile.decorations) : undefined}
        >
          {/* Subtle dimming overlay only if opacity is explicitly reduced below 100% */}
          {hasCustomBg && bgOpacity < 1 && (
            <div
              className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300"
              style={{ opacity: 1 - bgOpacity }}
            />
          )}

          <div className="relative z-10 flex flex-col items-center text-center gap-4">
            {/* Avatar with Animation and Verified Badge */}
            <div className="relative shrink-0">
              <DecoratedAvatar
                src={profile.avatar_url}
                name={profile.name}
                animation={profile.decorations?.avatarAnimation || 'none'}
                pulseColor={profile.decorations?.pulseColor}
                size="xl"
              />
            </div>

            {/* User Meta */}
            <div className="w-full flex flex-col items-center text-center min-w-0">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <DecoratedName
                  name={profile.name}
                  decorations={profile.decorations}
                  onCustomBg={hasCustomBg}
                  className={`text-xl font-bold tracking-tight ${
                    hasCustomBg ? 'drop-shadow-sm' : ''
                  }`}
                />
                {isProfileBadge && <VerifiedBadge size="md" />}
              </div>

              <p
                className={`text-xs font-medium mt-0.5 font-mono ${
                  hasCustomBg
                    ? 'text-rose-300 dark:text-rose-300 drop-shadow-xs'
                    : 'text-rose-500 dark:text-rose-400'
                }`}
              >
                @{profile.username}
              </p>

              {/* Bio: only show if user has a bio */}
              {profile.bio && profile.bio.trim() ? (
                <p
                  className={`text-xs mt-2.5 leading-relaxed whitespace-pre-wrap max-w-md mx-auto text-center ${
                    hasCustomBg
                      ? 'text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {profile.bio.trim()}
                </p>
              ) : null}

              {/* Status badges */}
              {isVerified && (
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      hasCustomBg
                        ? 'bg-white/20 backdrop-blur-md border border-white/30 text-white drop-shadow-xs'
                        : 'bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-900/40 text-pink-500 dark:text-pink-400'
                    }`}
                  >
                    <ShieldCheck size={13} />
                    <span>verified</span>
                  </div>
                </div>
              )}

              {/* Stats Row */}
              <div
                className={`flex items-center justify-center gap-6 mt-4 pt-3 w-full max-w-xs mx-auto border-t ${
                  hasCustomBg
                    ? 'border-white/20 text-white'
                    : 'border-gray-100 dark:border-gray-800/80'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-sm font-bold ${
                      hasCustomBg ? 'text-white drop-shadow-xs' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {userPosts.length}
                  </span>
                  <span
                    className={`text-xs ${
                      hasCustomBg ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    posts
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart
                    size={14}
                    className={hasCustomBg ? 'text-rose-400 fill-rose-400' : 'text-rose-500 fill-rose-500'}
                  />
                  <span
                    className={`text-sm font-bold font-mono ${
                      hasCustomBg ? 'text-white drop-shadow-xs' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {totalLikes}
                  </span>
                  <span
                    className={`text-xs ${
                      hasCustomBg ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    likes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              posts
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {userPosts.length}
            </span>
          </div>

          {/* Quick composer if viewing own profile */}
          {isOwnProfile && (
            <form
              onSubmit={handlePostSubmit}
              className="p-3.5 bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl shadow-2xs space-y-2.5"
            >
              <textarea
                rows={2}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="post an update..."
                maxLength={300}
                className="w-full resize-none bg-transparent border-none text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden leading-relaxed"
              />

              {postError && (
                <p className="text-xs text-rose-500">{postError}</p>
              )}

              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                    {300 - newPostContent.length}
                  </span>
                  {isRateLimited && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200/60 dark:border-amber-900/50">
                      <Clock size={11} className="shrink-0" />
                      <span>cooldown: {formattedRemaining}</span>
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!newPostContent.trim() || isSubmittingPost || isRateLimited}
                  title={isRateLimited ? `Posting updates is limited to once every 5 minutes. Try again in ${formattedRemaining}.` : 'Post update'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-medium shadow-xs disabled:opacity-35 cursor-pointer"
                >
                  <span>{isSubmittingPost ? 'posting...' : isRateLimited ? `cooldown (${formattedRemaining})` : 'post'}</span>
                  <Send size={11} />
                </button>
              </div>
            </form>
          )}

          {/* List of user posts */}
          {userPosts.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#151922] border border-gray-200/70 dark:border-gray-800/70 rounded-2xl text-xs text-gray-400 dark:text-gray-500">
              {isOwnProfile
                ? 'you have not posted anything yet. share your first thought!'
                : `@${profile.username} hasn't posted anything yet.`}
            </div>
          ) : (
            <div className="space-y-3">
              {userPosts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <PostItem
                    post={post}
                    onLike={onLikePost}
                    onViewProfile={onViewProfile}
                    onDelete={onDeletePost}
                    canDelete={Boolean(
                      currentUser &&
                        (currentUser.id === post.userId ||
                          currentUser.username.toLowerCase() ===
                            post.authorUsername.toLowerCase())
                    )}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
