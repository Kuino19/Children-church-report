import React from 'react';
import { LogOut, User as UserIcon, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenProfile: () => void;
  onPrint?: () => void;
  showPrint?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProfile, onPrint, showPrint = false }) => {
  const { user, logout } = useAuth();

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
            <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
              IDIMU CHILDREN'S MINISTRY - DATA & SPIRITUAL REPORT PLATFORM
            </h1>
            <p className="text-[11px] font-medium text-slate-500">
              {isAdmin ? 'District Coordinator Central Collation' : `${user.church_name || 'Local Church'} • ${user.zone_name || 'Zone'}`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
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
            onClick={logout}
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
