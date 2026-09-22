import { FC } from 'react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isBoyfriend?: boolean;
}

export const VerifiedBadge: FC<VerifiedBadgeProps> = ({
  size = 'sm',
  className = '',
}) => {
  const dimensions =
    size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const iconSize = size === 'lg' ? 12 : size === 'md' ? 10 : 8.5;

  return (
    <span className="inline-flex items-center select-none shrink-0" title="Verified Account" aria-label="Verified badge">
      <span
        className={`inline-flex items-center justify-center shrink-0 ${dimensions} rounded-full bg-[#1d9bf0] text-white shadow-xs ring-1 ring-sky-400/40 ${className}`}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    </span>
  );
};


