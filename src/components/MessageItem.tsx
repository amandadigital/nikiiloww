import { FC, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, User, RefreshCw, ShieldAlert } from 'lucide-react';
import { Message, DEFAULT_NIKILOW_AVATAR } from '../types';
import { renderMentions } from '../utils/mentions';
import { VerifiedBadge } from './VerifiedBadge';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRetry?: () => void;
  userAvatar?: string;
  userName?: string;
  userUsername?: string;
  companionAvatar?: string;
  companionName?: string;
  onMentionClick?: (username: string) => void;
}

export const MessageItem: FC<MessageItemProps> = ({
  message,
  isStreaming,
  isLastAssistant,
  onRetry,
  userAvatar,
  userName,
  userUsername,
  companionAvatar,
  companionName,
  onMentionClick,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isKodewtUser = isUser && userUsername?.toLowerCase() === 'kodewt';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const resolvedCompanionAvatar = companionAvatar || DEFAULT_NIKILOW_AVATAR;
  const resolvedCompanionName = companionName || 'nikilow';
  const isSafetyViolation =
    !isUser && message.content.includes('You are violating our rules.');
  const hasErrorIndication =
    !isUser &&
    (isSafetyViolation ||
      message.content.includes('glitch') ||
      message.content.includes('error') ||
      message.content.includes('notice') ||
      message.content.includes('limit') ||
      message.content.includes('expired'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group flex gap-3 px-4 py-2.5 max-w-3xl mx-auto w-full ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Companion Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 pt-0.5">
          <div
            className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 shadow-xs select-none block bg-gray-100 dark:bg-gray-800"
            title={resolvedCompanionName}
          >
            <img
              src={resolvedCompanionAvatar}
              alt={resolvedCompanionName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_NIKILOW_AVATAR;
              }}
            />
          </div>
        </div>
      )}

      {/* Message content container */}
      <div
        className={`flex flex-col ${
          isUser ? 'items-end' : 'items-start'
        } max-w-[85%] sm:max-w-[78%]`}
      >
        <div
          className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed tracking-normal whitespace-pre-wrap select-text transition-all duration-200 ${
            isUser
              ? 'chat-bubble-user rounded-tr-xs shadow-xs'
              : isSafetyViolation
              ? 'chat-bubble-companion rounded-tl-xs shadow-xs border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium'
              : 'chat-bubble-companion rounded-tl-xs shadow-xs'
          }`}
          style={{
            backgroundColor: isUser
              ? 'var(--accent)'
              : isSafetyViolation
              ? undefined
              : 'var(--companion-msg-bg)',
            borderColor: isUser
              ? undefined
              : isSafetyViolation
              ? undefined
              : 'var(--border-color)',
          }}
        >
          {isSafetyViolation && (
            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <ShieldAlert size={14} className="shrink-0" />
              <span>Safety policy</span>
            </div>
          )}
          {renderMentions(message.content, onMentionClick)}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-gray-400 dark:bg-gray-500 animate-pulse align-middle" />
          )}
        </div>

        {/* Footer meta: timestamp, copy button, and retry action */}
        <div
          className={`flex items-center gap-2 mt-1 px-1 transition-opacity text-[10px] text-gray-400 dark:text-gray-500 ${
            hasErrorIndication
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          } ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        >
          <span className="font-mono">{formattedTime}</span>
          <button
            onClick={handleCopy}
            className="p-0.5 rounded hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Copy text"
          >
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
          </button>
          {isLastAssistant && !isStreaming && onRetry && (
            <button
              onClick={onRetry}
              className="p-0.5 rounded hover:text-rose-500 dark:hover:text-rose-400 text-gray-400 dark:text-gray-500 transition-colors flex items-center gap-1 cursor-pointer"
              title="Retry / regenerate response"
            >
              <RefreshCw size={10} />
              <span className="text-[10px]">retry</span>
            </button>
          )}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 pt-0.5 relative">
          {userAvatar ? (
            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 shadow-xs select-none">
              <img
                src={userAvatar}
                alt={userName || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 text-xs font-semibold shadow-xs select-none">
              {userName ? userName[0].toUpperCase() : <User size={14} />}
            </div>
          )}
          {isKodewtUser && (
            <div className="absolute -bottom-1 -right-1">
              <VerifiedBadge size="sm" />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

