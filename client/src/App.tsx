import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { RepDashboard } from './pages/RepDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfileModal } from './components/ProfileModal';
import { ShieldCheck } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'rep'>('admin');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Loading Reporting System...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const isAdmin = user.role === 'district_admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        onOpenProfile={() => setIsProfileOpen(true)}
        onPrint={() => window.print()}
        showPrint={isAdmin && adminViewMode === 'admin'}
      />

      {/* Admin Mode Switcher Banner (allows coordinator to preview Rep interface) */}
      {isAdmin && (
        <div className="bg-indigo-950 text-indigo-200 px-4 py-2 text-xs flex items-center justify-between border-b border-indigo-900 no-print">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">District Coordinator Mode</span>
              <span className="hidden sm:inline text-indigo-300">
                — Foursquare Idimu Missionary District Collation Engine
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-indigo-300">Switch view:</span>
              <button
                type="button"
                onClick={() => setAdminViewMode('admin')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  adminViewMode === 'admin'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-900/60 text-indigo-300 hover:text-white'
                }`}
              >
                Collation Engine
              </button>
              <button
                type="button"
                onClick={() => setAdminViewMode('rep')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  adminViewMode === 'rep'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-900/60 text-indigo-300 hover:text-white'
                }`}
              >
                Weekly Rep View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Dashboard View */}
      <main className="flex-1">
        {isAdmin && adminViewMode === 'admin' ? (
          <AdminDashboard />
        ) : (
          <RepDashboard />
        )}
      </main>

      {/* Profile Settings Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
