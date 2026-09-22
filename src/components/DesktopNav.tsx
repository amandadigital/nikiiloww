import { FC } from 'react';
import {
  Rss,
  Search,
  MessageCircle,
  User,
  MoreHorizontal,
  PanelLeftClose,
  Sparkles,
} from 'lucide-react';
import { ActiveTab, UserProfile, CompanionPersonality, DEFAULT_NIKILOW_AVATAR } from '../types';
import { AccentColor, ACCENT_CONFIG } from '../utils/theme';

interface DesktopNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  userProfile: UserProfile | null;
  accentColor?: AccentColor;
  personality: CompanionPersonality;
  isOpen: boolean;
  onToggle: () => void;
}

export const DesktopNav: FC<DesktopNavProps> = ({
  activeTab,
  onTabChange,
  userProfile,
  accentColor = 'rose',
  personality,
  isOpen,
  onToggle,
}) => {
  const isMisiori =
    userProfile?.username?.toLowerCase() === 'misiori' ||
    userProfile?.username?.toLowerCase() === 'kodewt';

  const accentConfig = ACCENT_CONFIG[accentColor] || ACCENT_CONFIG.rose;
  const companionAvatar = personality.avatarUrl || DEFAULT_NIKILOW_AVATAR;
  const companionName = personality.name || 'niki';

  const navItems: { id: ActiveTab; label: string; icon: typeof Rss }[] = [
    { id: 'feed', label: 'feed', icon: Rss },
    { id: 'search', label: 'search', icon: Search },
    { id: 'chat', label: 'chat', icon: MessageCircle },
    { id: 'profile', label: 'profile', icon: User },
    { id: 'more', label: 'more', icon: MoreHorizontal },
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      id="desktop-side-nav"
      aria-label="Desktop Side Navigation"
      className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 h-full border-r select-none transition-all duration-200 z-30"
      style={{
        backgroundColor: 'var(--bg-surface, #0d1017)',
        borderColor: 'var(--border-color, rgba(255,255,255,0.08))',
      }}
    >
      {/* Top Header with App Name and Collapse Button */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
          <span className="font-semibold text-sm tracking-tight text-white font-mono">
            naisuru
          </span>
        </div>

        <button
          type="button"
          onClick={onToggle}
          title="hide navigation menu"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/70 transition-colors cursor-pointer"
          aria-label="Collapse side navigation"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Nav Sections List */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-gray-500 font-medium">
          sections
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all text-left cursor-pointer group hover-jump-sm ${
                isActive
                  ? 'bg-white/15 text-white font-medium border border-white/30 shadow-xs'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/40 border border-transparent'
              }`}
              style={{
                color: isActive ? accentConfig.hex : undefined,
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.12)' : undefined,
                borderColor: isActive ? 'rgba(255, 255, 255, 0.25)' : undefined,
              }}
            >
              {item.id === 'profile' && userProfile?.avatar_url ? (
                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 ring-1 ring-gray-700">
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <Icon
                  size={17}
                  className="shrink-0 transition-colors duration-150"
                  style={{
                    color: isActive ? accentConfig.hex : undefined,
                  }}
                />
              )}

              <span className="flex-1 truncate tracking-tight">{item.label}</span>

              {isActive && (
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: accentConfig.hex }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Companion Quick Dock at Bottom */}
      <div className="p-3 border-t border-gray-800/60">
        <button
          type="button"
          onClick={() => onTabChange('chat')}
          className="w-full p-2.5 rounded-xl bg-gray-900/60 hover:bg-gray-800/60 border border-gray-800/80 hover:border-white/30 transition-all flex items-center gap-2.5 text-left group cursor-pointer"
          title={`Chat with ${companionName}`}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/40">
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

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-200 group-hover:text-white transition-colors truncate">
                {companionName}
              </span>
              <Sparkles size={11} className="text-white shrink-0" />
            </div>
            <p className="text-[10px] text-gray-500 truncate">
              {activeTab === 'chat' ? 'current chat' : 'open chat'}
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
};
