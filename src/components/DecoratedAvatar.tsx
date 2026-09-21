import { FC } from 'react';
import { AvatarAnimationType } from '../types';

interface DecoratedAvatarProps {
  src?: string;
  name?: string;
  animation?: AvatarAnimationType;
  pulseColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const DecoratedAvatar: FC<DecoratedAvatarProps> = ({
  src,
  name,
  animation = 'none',
  pulseColor = '#facc15',
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: {
      wrapper: 'w-9 h-9',
      earsOffset: '-top-2.5',
      earsSize: 'w-3 h-3',
      text: 'text-sm font-semibold',
      moonSize: 'text-xs',
      cloudSize: 'text-xs',
    },
    md: {
      wrapper: 'w-12 h-12',
      earsOffset: '-top-3.5',
      earsSize: 'w-4 h-4',
      text: 'text-base font-semibold',
      moonSize: 'text-sm',
      cloudSize: 'text-sm',
    },
    lg: {
      wrapper: 'w-16 h-16',
      earsOffset: '-top-4',
      earsSize: 'w-5 h-5',
      text: 'text-xl font-bold',
      moonSize: 'text-base',
      cloudSize: 'text-base',
    },
    xl: {
      wrapper: 'w-24 h-24',
      earsOffset: '-top-5',
      earsSize: 'w-7 h-7',
      text: 'text-3xl font-bold',
      moonSize: 'text-xl',
      cloudSize: 'text-lg',
    },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`relative shrink-0 select-none ${currentSize.wrapper} ${className}`}>
      {/* 1. CAT EARS ANIMATION OVERLAY (3s Duration Loop) */}
      {animation === 'cat_ears' && (
        <div
          className={`absolute left-0 right-0 ${currentSize.earsOffset} flex justify-between px-1 pointer-events-none z-10`}
          aria-hidden="true"
        >
          {/* Left Cat Ear */}
          <div className="animate-deco-ear-left transform origin-bottom drop-shadow-[0_2px_4px_rgba(236,72,153,0.5)]">
            <svg
              className={`${currentSize.earsSize} text-pink-400 fill-pink-500`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3 21L12 2L21 21H3Z" stroke="#f472b6" strokeWidth="2" strokeLinejoin="round" />
              <path d="M7 19L12 7L17 19H7Z" fill="#fbcfe8" />
            </svg>
          </div>

          {/* Right Cat Ear */}
          <div className="animate-deco-ear-right transform origin-bottom drop-shadow-[0_2px_4px_rgba(236,72,153,0.5)]">
            <svg
              className={`${currentSize.earsSize} text-pink-400 fill-pink-500`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3 21L12 2L21 21H3Z" stroke="#f472b6" strokeWidth="2" strokeLinejoin="round" />
              <path d="M7 19L12 7L17 19H7Z" fill="#fbcfe8" />
            </svg>
          </div>
        </div>
      )}

      {/* 2. STATIC COLOR ACCENT RING (Non-pulsing, steady clean ring) */}
      {(animation === 'pulse' || animation === 'moon') && (
        <div
          className="absolute -inset-1 pointer-events-none z-10 flex items-center justify-center"
        >
          {/* Steady static color ring */}
          <div
            className="w-full h-full rounded-full"
            style={{
              border: `2px solid ${pulseColor}`,
              boxShadow: `0 0 8px ${pulseColor}66`,
            }}
          />
        </div>
      )}

      {/* Main Avatar Container */}
      <div
        className={`w-full h-full rounded-full overflow-hidden ring-2 ${
          animation === 'pulse' || animation === 'moon'
            ? ''
            : animation === 'cat_ears'
            ? 'ring-pink-400/80 shadow-[0_0_12px_rgba(244,114,182,0.3)]'
            : animation === 'clouds'
            ? 'ring-sky-300/80 shadow-[0_0_12px_rgba(125,211,252,0.35)]'
            : 'ring-gray-200 dark:ring-gray-800'
        } bg-gray-100 dark:bg-gray-800 relative z-0`}
        style={
          animation === 'pulse' || animation === 'moon'
            ? {
                boxShadow: `0 0 12px ${pulseColor}88`,
                border: `2px solid ${pulseColor}`,
              }
            : undefined
        }
      >
        {src ? (
          <img
            src={src}
            alt={name || 'avatar'}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${currentSize.text} text-gray-500 uppercase`}>
            {name ? name[0] : 'U'}
          </div>
        )}
      </div>

      {/* 3. CLOUDS ANIMATION OVERLAY (3s Duration Loop) */}
      {animation === 'clouds' && (
        <div className="absolute -bottom-1.5 -inset-x-2 pointer-events-none z-10 flex items-center justify-center">
          <div className="relative w-full flex items-center justify-around">
            {/* Cloud 1 */}
            <div className="animate-deco-cloud-1 drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)] text-sky-200 dark:text-sky-300">
              <svg className="w-5 h-3.5 fill-current opacity-90" viewBox="0 0 24 24">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
              </svg>
            </div>
            {/* Cloud 2 */}
            <div className="animate-deco-cloud-2 drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)] text-sky-100 dark:text-white">
              <svg className="w-6 h-4 fill-current opacity-95" viewBox="0 0 24 24">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
