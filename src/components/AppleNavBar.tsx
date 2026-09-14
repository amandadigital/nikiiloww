import { FC } from 'react';
import { motion } from 'motion/react';
import { Rss, Search, MessageCircle, User, MoreHorizontal } from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';
import { AccentColor, ACCENT_CONFIG } from '../utils/theme';

interface AppleNavBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  userProfile: UserProfile | null;
  accentColor?: AccentColor;
}

export const AppleNavBar: FC<AppleNavBarProps> = ({
  activeTab,
  onTabChange,
  userProfile,
  accentColor = 'rose',
}) => {
  const isMisiori =
    userProfile?.username?.toLowerCase() === 'misiori' ||
    userProfile?.username?.toLowerCase() === 'kodewt';

  const accentConfig = ACCENT_CONFIG[accentColor] || ACCENT_CONFIG.rose;

  const tabs: { id: ActiveTab; label: string; icon: typeof Rss }[] = [
    { id: 'feed', label: 'feed', icon: Rss },
    { id: 'search', label: 'search', icon: Search },
    { id: 'chat', label: 'chat', icon: MessageCircle },
    { id: 'profile', label: 'profile', icon: User },
    { id: 'more', label: 'more', icon: MoreHorizontal },
  ];

  return (
    <nav
      id="apple-tab-bar"
      aria-label="Main Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 backdrop-blur-xl border-t sm:border-x sm:rounded-t-2xl px-3 max-w-lg mx-auto shadow-lg transition-colors select-none"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center justify-around h-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center flex-1 py-1 group transition-all active:scale-95 hover-jump-sm cursor-pointer"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative flex items-center justify-center">
                {/* Special avatar indicator for profile tab */}
                {tab.id === 'profile' && userProfile?.avatar_url ? (
                  <div
                    className={`w-6 h-6 rounded-full overflow-hidden transition-all ${
                      isActive
                        ? 'ring-2 ring-rose-500 shadow-xs'
                        : 'ring-1 ring-gray-300 dark:ring-gray-700 opacity-75 group-hover:opacity-100'
                    }`}
                    style={{
                      boxShadow: isActive ? `0 0 0 2px ${accentConfig.hex}` : undefined,
                    }}
                  >
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.3 : 1.8}
                    className="transition-colors duration-200"
                    style={{
                      color: isActive ? accentConfig.hex : undefined,
                    }}
                  />
                )}
              </div>

              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors duration-200 ${
                  isActive
                    ? 'font-semibold'
                    : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`}
                style={{
                  color: isActive ? accentConfig.hex : undefined,
                }}
              >
                {tab.label}
              </span>

              {/* iOS Active Indicator Pill */}
              {isActive && (
                <motion.div
                  layoutId="apple-nav-indicator"
                  className="absolute -bottom-1 w-5 h-0.5 rounded-full"
                  style={{ backgroundColor: accentConfig.hex }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
