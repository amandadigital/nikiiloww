import { FC, useState } from 'react';
import {
  ExternalLink,
  Copy,
  Sparkles,
  Layers,
  RotateCcw,
  Check,
  MessageSquare,
  Rss,
  MessageCircle,
} from 'lucide-react';
import { AccentColor, BgTheme } from '../utils/theme';
import { PWAInstallButton } from './PWAInstallButton';
import { VerifiedBadge } from './VerifiedBadge';

interface MoreViewProps {
  accentColor?: AccentColor;
  onSelectAccentColor?: (color: AccentColor) => void;
  bgTheme?: BgTheme;
  onSelectBgTheme?: (theme: BgTheme) => void;
  onOpenUserProfile: (username: string) => void;
  onReplayIntro: () => void;
}

export const MoreView: FC<MoreViewProps> = ({
  onOpenUserProfile,
  onReplayIntro,
}) => {
  const discordUrl = 'https://discord.gg/rbMenrMNW';
  const [copiedDiscord, setCopiedDiscord] = useState(false);

  const copyDiscord = () => {
    navigator.clipboard.writeText(discordUrl);
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto w-full h-full pb-24 md:pb-8 scroll-smooth">
      <div className="w-full max-w-xl mx-auto px-4 py-5 space-y-4 select-none">
        {/* Brand Header */}
        <div
          className="p-4 rounded-2xl border flex items-center justify-between hover-jump shadow-xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-3">
            <img
              src="https://startorigin2.vercel.app/icon.svg"
              alt="naisuru"
              className="w-10 h-10 rounded-xl shadow-xs hover-jump-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  naisuru
                </h2>
                <span className="text-[11px] text-gray-400 font-mono">
                  (startorigin.me)
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">
                created by{' '}
                <button
                  onClick={() => onOpenUserProfile('misiori')}
                  className="text-pink-400 hover:underline inline-flex items-center gap-0.5 font-semibold cursor-pointer"
                >
                  @misiori
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div
          className="p-4 rounded-2xl border space-y-2.5 hover-jump shadow-xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-white lowercase">
            <Sparkles size={14} className="text-pink-400" />
            <span>about</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed font-sans">
            naisuru is an app where u can create whoever u want with a prompt. like c.ai but customizable xD. created by{' '}
            <button
              onClick={() => onOpenUserProfile('misiori')}
              className="font-medium text-pink-400 hover:underline inline-flex items-center gap-1 font-mono cursor-pointer"
            >
              @misiori
              <VerifiedBadge size="sm" />
            </button>{' '}
            btw
          </p>
        </div>

        {/* Roadmap Section: updates */}
        <div
          className="p-4 rounded-2xl border space-y-3.5 hover-jump shadow-xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white lowercase">
              <Layers size={14} className="text-pink-400" />
              <span>version roadmap</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] font-mono font-medium">
              v1.0
            </span>
          </div>

          <div className="pt-1">
            {/* Current: v1.0 */}
            <div className="relative pl-5 pb-1 border-l-2 border-pink-500">
              <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-pink-500 ring-4 ring-pink-500/20" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono">
                  v1.0 (current)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-pink-500/15 text-pink-400 border border-pink-500/30 font-mono font-medium">
                  live
                </span>
              </div>

              {/* Exact user-requested bullet points */}
              <ul className="text-xs text-gray-200 mt-2.5 space-y-1.5 font-sans">
                <li className="flex items-center gap-1.5">
                  <span className="text-pink-400 font-bold font-mono">-</span>
                  <span className="text-gray-200">feed with users' updates</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-pink-400 font-bold font-mono">-</span>
                  <span className="text-gray-200">chat with niki and custom prompts creator</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-pink-400 font-bold font-mono">-</span>
                  <a
                    href={discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-200 hover:text-pink-400 inline-flex items-center gap-1 transition"
                  >
                    <span>discord server</span>
                    <ExternalLink size={11} className="text-[#5865F2]" />
                  </a>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-pink-400 font-bold font-mono">-</span>
                  <span className="text-gray-200">pwa app</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Discord Section */}
        <div className="p-4 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 space-y-3 hover-jump shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[#5865F2]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span className="text-xs font-semibold text-white">
                discord community
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#5865F2]">online</span>
          </div>

          <p className="text-xs text-gray-300">
            join our discord to chat with @misiori, request features, share custom prompts, and meet other companions.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-medium transition active:scale-95 shadow-xs hover-jump-sm"
            >
              <span>join discord</span>
              <ExternalLink size={13} />
            </a>
            <button
              onClick={copyDiscord}
              className="px-3 py-2 rounded-xl border border-[#5865F2]/30 text-gray-300 hover:text-white transition hover-jump-sm cursor-pointer text-xs flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--bg-surface)' }}
              title="copy link"
            >
              {copiedDiscord ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-400 font-mono text-[11px]">copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span className="text-gray-300 font-mono text-[11px]">copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* PWA & Replay */}
        <div className="grid grid-cols-2 gap-2.5">
          <div
            className="p-3.5 rounded-2xl border flex flex-col justify-between hover-jump shadow-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <span className="text-xs font-medium text-gray-300 lowercase">
              offline app
            </span>
            <div className="mt-2">
              <PWAInstallButton variant="full" />
            </div>
          </div>

          <button
            onClick={onReplayIntro}
            className="p-3.5 rounded-2xl border flex flex-col justify-between text-left transition active:scale-95 group hover-jump shadow-xs cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <span className="text-xs font-medium text-gray-300 lowercase">
              welcome intro
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-pink-400 font-medium">
              <RotateCcw size={13} className="group-hover:-rotate-90 transition duration-300" />
              <span>replay animation</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
