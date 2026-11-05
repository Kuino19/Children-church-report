import React, { useState } from 'react';
import { Church, ShieldCheck, UserPlus, LogIn, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [churchName, setChurchName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(emailOrPhone, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!zoneName.trim() || !churchName.trim()) {
      setError('Please type in both your Zone Name and Church Name.');
      setIsLoading(false);
      return;
    }

    try {
      await register({
        fullName,
        emailOrPhone,
        password,
        role: 'church_rep',
        zoneName: zoneName.trim(),
        churchName: churchName.trim()
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Logins
  const fillDemoAdmin = () => {
    setEmailOrPhone('admin@district.church');
    setPassword('adminpassword123');
    setTab('login');
  };

  const fillDemoRep = () => {
    setEmailOrPhone('rep@idimuzhq.church');
    setPassword('reppassword123');
    setTab('login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-md border border-slate-200/90 p-1.5 mb-3 overflow-hidden">
            <img
              src="/foursquare-logo.jpg"
              alt="Foursquare Church Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">
            IDIMU CHILDREN'S MINISTRY - DATA & SPIRITUAL REPORT PLATFORM
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Foursquare Idimu Missionary District • Weekly Sunday Collation Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 backdrop-blur-md">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setTab('login'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'login' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'register' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Create Rep Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. pastor@church.com or 080..."
                  value={emailOrPhone}
                  onChange={e => setEmailOrPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Register Form - Exclusively for Church Representatives */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-xl text-xs text-indigo-900 font-medium">
                <span className="font-bold">Church Representative Self-Registration: </span>
                Type in your Zone and local Church name. Whitespace and capitalisation will be automatically normalized.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deacon Joshua Adeleke"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email or Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. joshua@gmail.com or 08012345678"
                  value={emailOrPhone}
                  onChange={e => setEmailOrPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              {/* Reps type their Zone by themselves */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Zone Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type your Zone Name (e.g. Zone 1)"
                  value={zoneName}
                  onChange={e => setZoneName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Type your assigned Zone by yourself (e.g. Zone 1, Zone 2).
                </p>
              </div>

              {/* Reps type their Church Name by themselves */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Church Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type your Church Name (e.g. Grace Sanctuary)"
                  value={churchName}
                  onChange={e => setChurchName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Type your local church assembly name.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Creating account...' : 'Create Church Rep Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center gap-1.5 mb-2 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant One-Click Demo Access</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={fillDemoAdmin}
                className="px-3 py-2 text-left rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 text-xs transition-colors cursor-pointer"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" /> District Admin
                </div>
                <div className="text-[10px] text-slate-500">Pastor Emmanuel (Coordinator)</div>
              </button>

              <button
                type="button"
                onClick={fillDemoRep}
                className="px-3 py-2 text-left rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 text-xs transition-colors cursor-pointer"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Church className="w-3 h-3 text-emerald-600" /> Church Rep
                </div>
                <div className="text-[10px] text-slate-500">Idimu ZHQ (Idimu Zone)</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4 uppercase">
          IDIMU CHILDREN'S MINISTRY - DATA & SPIRITUAL REPORT PLATFORM • 2026
        </p>
      </div>
    </div>
  );
};
