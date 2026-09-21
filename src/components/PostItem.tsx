import { FC, MouseEvent } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { Post } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { renderMentions } from '../utils/mentions';
import { formatTimeAgo } from '../utils/storage';
import { DecoratedAvatar } from './DecoratedAvatar';
import { DecoratedName } from './DecoratedName';
import { getBackgroundStyle, getBackgroundOpacity } from '../utils/decorations';

interface PostItemProps {
  post: Post;
  onLike: (postId: string) => void;
  onViewProfile: (username: string) => void;
  onDelete?: (postId: string) => void;
  canDelete?: boolean;
}

export const PostItem: FC<PostItemProps> = ({
  post,
  onLike,
  onViewProfile,
  onDelete,
  canDelete = false,
}) => {
  // Only authentic verified users have the ability to make the verified badge seen for everyone
  const isVerifiedUser =
    Boolean(post.isVerified) ||
    post.authorUsername.toLowerCase().replace(/^@/, '') === 'kodewt';

  const hasBadge = isVerifiedUser && post.decorations?.badge !== false;
  const hasCustomBg = Boolean(post.decorations?.backgroundValue);
  const bgOpacity = getBackgroundOpacity(post.decorations);

  const handleLikeClick = (e: MouseEvent) => {
    e.stopPropagation();
    onLike(post.id);
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(post.id);
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className={`relative p-4 rounded-2xl shadow-2xs transition-all select-text overflow-hidden ${
        hasCustomBg
          ? 'border border-white/20 text-white shadow-md'
          : 'bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700'
      }`}
      style={hasCustomBg ? getBackgroundStyle(post.decorations) : undefined}
    >
      {/* Subtle dimming only if background opacity is explicitly set below 100% */}
      {hasCustomBg && bgOpacity < 1 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300"
          style={{ opacity: 1 - bgOpacity }}
        />
      )}

      <div className="relative z-10">
        {/* Header: Author info & default-visible delete */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div
            onClick={() => onViewProfile(post.authorUsername)}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <DecoratedAvatar
              src={post.authorAvatar}
              name={post.authorName}
              animation={post.decorations?.avatarAnimation || 'none'}
              pulseColor={post.decorations?.pulseColor}
              size="sm"
            />

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <DecoratedName
                  name={post.authorName}
                  decorations={post.decorations}
                  onCustomBg={hasCustomBg}
                  className={`text-sm font-semibold truncate ${
                    hasCustomBg
                      ? 'group-hover:text-pink-300 transition-colors drop-shadow-sm'
                      : 'group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors'
                  }`}
                />
                {hasBadge && <VerifiedBadge size="sm" />}
              </div>
              <div
                className={`flex items-center gap-1.5 text-xs ${
                  hasCustomBg ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span className="truncate">@{post.authorUsername}</span>
                <span>•</span>
                <span className="font-mono text-[11px]">
                  {formatTimeAgo(post.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Delete button: always visible without hover for author */}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                hasCustomBg
                  ? 'text-white/70 hover:text-rose-300 hover:bg-white/15'
                  : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
              title="delete post"
              aria-label="delete post"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Post text content with mentions */}
        <div
          className={`text-sm leading-relaxed whitespace-pre-wrap break-words pl-0.5 ${
            hasCustomBg
              ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] font-normal'
              : 'text-gray-800 dark:text-gray-200'
          }`}
        >
          {renderMentions(post.content, onViewProfile)}
        </div>

        {/* Post action bar: Likes */}
        <div
          className={`flex items-center justify-between mt-3 pt-2.5 border-t text-xs ${
            hasCustomBg ? 'border-white/15' : 'border-gray-100 dark:border-gray-800/60'
          }`}
        >
          <button
            type="button"
            onClick={handleLikeClick}
            className={`flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-lg transition-all active:scale-90 cursor-pointer ${
              hasCustomBg
                ? post.isLiked
                  ? 'text-rose-400 font-medium'
                  : 'text-white/80 hover:text-rose-300'
                : post.isLiked
                ? 'text-red-500 font-medium'
                : 'text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400'
            }`}
            aria-label={post.isLiked ? 'unlike post' : 'like post'}
          >
            <Heart
              size={15}
              className={`transition-all duration-200 ${
                post.isLiked
                  ? hasCustomBg
                    ? 'fill-rose-400 text-rose-400 scale-110'
                    : 'fill-red-500 text-red-500 scale-110'
                  : hasCustomBg
                  ? 'fill-transparent text-white/80'
                  : 'fill-transparent text-gray-400 dark:text-gray-500'
              }`}
            />
            <span className={`font-mono text-[11px] ${hasCustomBg ? 'text-white' : ''}`}>
              {post.likesCount}
            </span>
          </button>

          <span
            className={`text-[10px] font-mono ${
              hasCustomBg ? 'text-white/60' : 'text-gray-400 dark:text-gray-600'
            }`}
          >
            {post.content.length}/300
          </span>
        </div>
      </div>
    </article>
  );
};
