import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Printer, Download, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenProfile: () => void;
  onPrint?: () => void;
  showPrint?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProfile, onPrint, showPrint = false }) => {
  const { user, logout } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to sign out of the portal?')) {
      logout();
    }
  };

  if (!user) return null;

  const isAdmin = user.role === 'district_admin';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white shrink-0">
            <img
              src="/foursquare-logo.jpg"
              alt="Foursquare Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
                IDIMU CHILDREN'S MINISTRY - DATA & SPIRITUAL REPORT PLATFORM
              </h1>
              {!isOnline && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <WifiOff className="w-3 h-3" /> Offline Mode
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              {isAdmin ? 'District Coordinator Central Collation' : `${user.church_name || 'Local Church'} • ${user.zone_name || 'Zone'}`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="sm:hidden inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}

          {/* PWA Install Button */}
          {installPrompt && (
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm cursor-pointer animate-pulse"
              title="Install app to your home screen"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {showPrint && onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
          )}

          {/* User Profile Pill */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/60 transition-colors text-xs font-medium cursor-pointer"
            title="Edit Profile"
          >
            <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate font-semibold">
              {user.full_name.split(' ')[0]}
            </span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
