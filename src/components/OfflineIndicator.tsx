import { FC } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../utils/usePWAInstall';

export const OfflineIndicator: FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="flex items-center gap-2 rounded-full bg-amber-500/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-white shadow-lg pointer-events-auto">
        <WifiOff size={13} className="animate-pulse" />
        <span>offline mode — using cached data</span>
      </div>
    </div>
  );
};
