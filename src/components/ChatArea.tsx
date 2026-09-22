import {
  FC,
  useState,
  useRef,
  useEffect,
  useMemo,
  KeyboardEvent,
  ChangeEvent,
} from 'react';
import {
  Send,
  Square,
  ArrowDown,
  Sparkles,
  RefreshCw,
  Menu,
  Heart,
} from 'lucide-react';
import {
  Message,
  UserProfile,
  CompanionPersonality,
  DEFAULT_NIKILOW_AVATAR,
} from '../types';
import { AccentColor, ACCENT_CONFIG } from '../utils/theme';
import { ChatWallpaperSettings, WALLPAPER_PRESETS } from '../utils/wallpaper';
import { MessageItem } from './MessageItem';
import { VerifiedBadge } from './VerifiedBadge';

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onOpenMenu: () => void;
  onNewChat: () => void;
  userProfile: UserProfile | null;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  personality: CompanionPersonality;
  onMentionClick?: (username: string) => void;
  wallpaperSettings?: ChatWallpaperSettings;
  onOpenVisualisation?: () => void;
  accentColor?: AccentColor;
  onRetry?: () => void;
}

export const ChatArea: FC<ChatAreaProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onOpenMenu,
  onNewChat,
  userProfile,
  onOpenProfile,
  onOpenAuth,
  personality,
  onMentionClick,
  wallpaperSettings,
  onOpenVisualisation,
  accentColor = 'white',
  onRetry,
}) => {
  const [inputText, setInputText] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const companionName = personality.name || 'niki';
  const companionAvatar = personality.avatarUrl || DEFAULT_NIKILOW_AVATAR;
  const accentCfg = ACCENT_CONFIG[accentColor] || ACCENT_CONFIG.white;

  // Guarantee strict chronological order: user message always appears before the assistant's reply
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const diff = (a.createdAt || 0) - (b.createdAt || 0);
      if (diff !== 0) return diff;
      if (a.role === 'user' && b.role === 'assistant') return -1;
      if (a.role === 'assistant' && b.role === 'user') return 1;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [messages]);

  const starters = isDatingThisUser
    ? [
        `hey ${companionName.toLowerCase()}, missed you today ❤️`,
        'what are you thinking about right now?',
        'tell me what you did today.',
        'tell me something sweet.',
        'what do you love most about us?',
      ]
    : [
        "what's on your mind today?",
        'do you ever overthink the smallest things?',
        'recommend a song for quiet nights.',
        'tell me an honest truth about the world.',
        'what made you smile recently?',
      ];

  // Derive background style for wallpaper
  const getWallpaperBackground = () => {
    if (!wallpaperSettings || wallpaperSettings.id === 'none') return null;

    if (wallpaperSettings.id === 'custom' && wallpaperSettings.customUrl) {
      return {
        backgroundImage: `url(${wallpaperSettings.customUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }

    const preset = WALLPAPER_PRESETS.find((p) => p.id === wallpaperSettings.id);
    if (!preset || preset.bgStyle === 'none') return null;

    if (preset.isImage) {
      return {
        backgroundImage: `url(${preset.bgStyle})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }

    return {
      backgroundImage: preset.bgStyle,
    };
  };

  const wallpaperBgStyle = getWallpaperBackground();

  // Auto-scroll when messages change or stream updates
  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, showScrollBottom]);

  // Handle scroll position detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;
    onSendMessage(text);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative pb-16 md:pb-0"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Top navigation header */}
      <header
        className="h-14 flex items-center justify-between px-3 sm:px-4 border-b z-10 select-none transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* Menu button in companion's header (opens modal menu) */}
          <button
            id="chat-menu-btn"
            onClick={onOpenMenu}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors cursor-pointer"
            title="chats & menu"
            aria-label="chats & menu"
          >
            <Menu size={15} />
            <span className="text-xs font-medium">menu</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMenu}
              className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 shadow-2xs transition-all cursor-pointer bg-gray-100 dark:bg-gray-800"
              style={{
                borderColor: accentCfg.hex,
              }}
              title={`${companionName} settings & menu`}
            >
              <img
                src={companionAvatar}
                alt={companionName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_NIKILOW_AVATAR;
                }}
              />
            </button>

            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight truncate max-w-[140px] sm:max-w-none">
                {companionName}
              </h1>
              {(companionName.toLowerCase() === 'dary' || companionName.toLowerCase() === 'niki' || companionName.toLowerCase() === 'nikilow') && (
                <VerifiedBadge size="sm" isBoyfriend={false} />
              )}
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-jump-sm cursor-pointer"
            title="start new conversation"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">new chat</span>
          </button>
        </div>
      </header>

      {/* Main chat messages container with wallpaper strictly inside it (ABOVE the text box) */}
      <div className="relative flex-1 overflow-hidden flex flex-col">
        {wallpaperBgStyle && (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none transition-all duration-300 z-0"
            style={{
              ...wallpaperBgStyle,
              opacity: wallpaperSettings?.opacity ?? 0.35,
              filter: wallpaperSettings?.blur ? `blur(${wallpaperSettings.blur}px)` : undefined,
            }}
          />
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-2 py-4 space-y-2 scroll-smooth relative z-1"
        >
        {sortedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto px-4 text-center select-none">
            {/* Companion Photo Avatar */}
            <div className="relative w-20 h-20 rounded-3xl overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 shadow-lg mb-4 bg-gray-100 dark:bg-gray-800">
              <img
                src={companionAvatar}
                alt={companionName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_NIKILOW_AVATAR;
                }}
              />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-1.5 flex items-center justify-center gap-1.5">
              <span>
                {isDatingThisUser
                  ? `hey ${userProfile?.name || userProfile?.username || 'babe'}`
                  : `hey, i'm ${companionName.toLowerCase()}.`}
              </span>
              {isDatingThisUser ? (
                <Heart size={16} className="text-white fill-white shrink-0" />
              ) : (
                <VerifiedBadge size="md" />
              )}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-7 leading-relaxed font-mono">
              thoughtful, observant, and always here to talk. what&apos;s on your mind?
            </p>

            <div className="w-full space-y-2 max-w-md">
              <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 tracking-wider block mb-2">
                start a conversation
              </span>
              {starters.map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(starter)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-[#141822] border border-gray-200/80 dark:border-gray-800/80 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#181d29] transition-all shadow-2xs active:scale-[0.99] flex items-center justify-between group cursor-pointer hover-jump-sm"
                >
                  <span>{starter}</span>
                  <Sparkles
                    size={13}
                    className="text-gray-400 dark:text-gray-500"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2">
            {sortedMessages.map((message, index) => {
              const isLast = index === sortedMessages.length - 1;
              return (
                <MessageItem
                  key={message.id || index}
                  message={message}
                  isStreaming={isLast && isStreaming && message.role === 'assistant'}
                  isLastAssistant={isLast && message.role === 'assistant'}
                  onRetry={onRetry}
                  userAvatar={userProfile?.avatar_url}
                  userName={userProfile?.name}
                  userUsername={userProfile?.username}
                  companionAvatar={companionAvatar}
                  companionName={companionName}
                  onMentionClick={onMentionClick}
                />
              );
            })}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 md:bottom-16 right-6 p-2 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all z-20 cursor-pointer hover-jump"
          aria-label="scroll to bottom"
        >
          <ArrowDown size={16} />
        </button>
      )}

      {/* Chat Input Field (docked directly above navigation bar - no wallpaper behind it) */}
      <div
        className="p-2 sm:p-2.5 border-t relative z-10 transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div
          className="max-w-3xl mx-auto relative flex items-end gap-2 rounded-2xl p-1.5 pl-3 border border-transparent focus-within:border-gray-300 dark:focus-within:border-gray-700 transition-all hover-jump-sm"
          style={{ backgroundColor: 'var(--bg-secondary, rgba(125,125,125,0.08))' }}
        >
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`message ${companionName.toLowerCase()}...`}
            rows={1}
            className="flex-1 max-h-36 resize-none bg-transparent border-none text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden py-1 leading-relaxed"
          />

          {isStreaming ? (
            <button
              onClick={onStopStreaming}
              className="p-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all shrink-0 cursor-pointer hover-jump-sm"
              title="stop response"
            >
              <Square size={16} className="fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim()}
              className={`p-2 rounded-xl ${
                accentColor === 'white' ? 'text-black' : 'text-white'
              } disabled:opacity-30 disabled:pointer-events-none transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 hover-jump`}
              style={{
                backgroundColor: accentCfg.hex,
                color: accentColor === 'white' ? '#000000' : '#ffffff',
              }}
              title="send message"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

