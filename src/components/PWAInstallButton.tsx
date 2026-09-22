import { FC, useState } from 'react';
import { Download, Share, X, Check, Laptop, Smartphone, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    if (!isInstallable) return;
    setInstalling(true);
    try {
      const success = await install();
      if (success) {
        setInstalledNotice(true);
        setTimeout(() => {
          setInstalledNotice(false);
          onClose();
        }, 2000);
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#0f121a] p-5 shadow-2xl border border-gray-800 text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-800/80">
          <div className="flex items-center gap-2.5">
            <img
              src="https://startorigin2.vercel.app/icon.svg"
              alt="naisuru logo"
              className="w-8 h-8 rounded-xl ring-1 ring-white/30 shadow-xs"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <h3 id="install-modal-title" className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                <span>install naisuru</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white border border-white/20">
                  pwa
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                fast native app experience on phone & desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
            aria-label="close install modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status / Direct install button if supported */}
        {isInstalled ? (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <Check size={16} className="text-emerald-400 shrink-0" />
            <span>naisuru is already installed and ready for offline use.</span>
          </div>
        ) : isInstallable ? (
          <div className="mt-4 space-y-2">
            <button
              onClick={handleDirectInstall}
              disabled={installing}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Download size={15} />
              <span>
                {installedNotice
                  ? 'installed successfully!'
                  : installing
                  ? 'prompting installation...'
                  : 'install to this device now'}
              </span>
            </button>
            <p className="text-[11px] text-center text-gray-400">
              one-click install via your browser
            </p>
          </div>
        ) : null}

        {/* Multi-platform instructions */}
        <div className="mt-4 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-medium flex items-center gap-1.5">
            <Sparkles size={12} className="text-white" />
            <span>how to install on your device</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* iOS / Safari */}
            <div className="p-3 rounded-xl bg-[#141824] border border-gray-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Smartphone size={13} className="text-white" />
                <span>iphone & ipad (safari)</span>
              </div>
              <p className="text-gray-400 leading-relaxed text-[11px]">
                1. Tap the <Share size={11} className="inline text-white mx-0.5" /> <strong>Share</strong> button in Safari's toolbar.
                <br />
                2. Scroll down and choose <strong>Add to Home Screen</strong>.
                <br />
                3. Tap <strong>Add</strong> in the top right corner.
              </p>
            </div>

            {/* Android / Chrome */}
            <div className="p-3 rounded-xl bg-[#141824] border border-gray-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Smartphone size={13} className="text-white" />
                <span>android (chrome)</span>
              </div>
              <p className="text-gray-400 leading-relaxed text-[11px]">
                1. Tap the <strong>three dots (⋮)</strong> menu in the upper right.
                <br />
                2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </p>
            </div>

            {/* Desktop */}
            <div className="p-3 rounded-xl bg-[#141824] border border-gray-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Laptop size={13} className="text-white" />
                <span>computers (chrome / edge / brave)</span>
              </div>
              <p className="text-gray-400 leading-relaxed text-[11px]">
                Click the <strong>Install icon (⊕ / ⤓)</strong> on the right side of the address bar, or choose <strong>Install Naisuru</strong> from the browser menu.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits bullets */}
        <div className="mt-3.5 pt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
          <span>⚡ offline cached</span>
          <span>📱 fullscreen</span>
          <span>🚀 instant launch</span>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-gray-800 hover:bg-gray-700 py-2 text-xs font-medium text-gray-200 transition cursor-pointer"
        >
          got it
        </button>
      </div>
    </div>
  );
};

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstalled } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running as standalone PWA
  if (isInstalled) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium transition hover:bg-emerald-500/15 cursor-pointer ${
            variant === 'full' ? 'w-full justify-center' : ''
          } ${className}`}
          aria-label="app installed as pwa"
        >
          <Check size={14} />
          <span>app installed as pwa</span>
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer ${
          variant === 'full'
            ? 'w-full py-2.5 px-4 bg-white hover:bg-gray-100 text-black font-semibold shadow-xs'
            : 'px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20'
        } ${className}`}
        aria-label="Install App"
      >
        <Download size={14} />
        <span>install app</span>
      </button>

      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
