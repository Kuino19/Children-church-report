import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../api';
import type { WeeklyReport } from '../types';
import { 
  CheckCircle2, Save, Users, HeartHandshake, Sparkles, 
  AlertCircle, BarChart3, RefreshCw 
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const RepDashboard: React.FC = () => {
  const { user } = useAuth();
  const now = new Date();

  // Period Selector State
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // Weekly Reports for this month (1 to 5)
  const [weeksData, setWeeksData] = useState<{ [key: number]: WeeklyReport | null }>({
    1: null, 2: null, 3: null, 4: null, 5: null
  });

  // Current Form State
  const [formData, setFormData] = useState({
    // Cat 1: Service Attendance
    sundaySchool: 0,
    bibleStudy: 0,
    prayerMeeting: 0,
    visitors: 0,
    // Cat 2: Demographics & Workforce
    childrenCount: 0,
    cadetsCount: 0,
    torchbearersCount: 0,
    candlelightersCount: 0,
    teachersCount: 0,
    // Cat 3: Spiritual Report
    salvations: 0,
    holyGhostBaptisms: 0,
    healings: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Church reports when month/year changes
  const loadReports = async () => {
    if (!user?.church_id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await reportsApi.getChurchReports(user.church_id, selectedYear, selectedMonth);
      setWeeksData(res.weeks);

      // Populate current active week's form
      const currentReport = res.weeks[selectedWeek];
      if (currentReport) {
        setFormData({
          sundaySchool: currentReport.sunday_school,
          bibleStudy: currentReport.bible_study,
          prayerMeeting: currentReport.prayer_meeting,
          visitors: currentReport.visitors,
          childrenCount: currentReport.children_count,
          cadetsCount: currentReport.cadets_count,
          torchbearersCount: currentReport.torchbearers_count,
          candlelightersCount: currentReport.candlelighters_count,
          teachersCount: currentReport.teachers_count,
          salvations: currentReport.salvations,
          holyGhostBaptisms: currentReport.holy_ghost_baptisms,
          healings: currentReport.healings
        });
      } else {
        // Reset to zeros for fresh submission
        setFormData({
          sundaySchool: 0,
          bibleStudy: 0,
          prayerMeeting: 0,
          visitors: 0,
          childrenCount: 0,
          cadetsCount: 0,
          torchbearersCount: 0,
          candlelightersCount: 0,
          teachersCount: 0,
          salvations: 0,
          holyGhostBaptisms: 0,
          healings: 0
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not fetch reports.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user?.church_id, selectedYear, selectedMonth]);

  // When selectedWeek changes, update form data from weeksData
  useEffect(() => {
    const reportForWeek = weeksData[selectedWeek];
    if (reportForWeek) {
      setFormData({
        sundaySchool: reportForWeek.sunday_school,
        bibleStudy: reportForWeek.bible_study,
        prayerMeeting: reportForWeek.prayer_meeting,
        visitors: reportForWeek.visitors,
        childrenCount: reportForWeek.children_count,
        cadetsCount: reportForWeek.cadets_count,
        torchbearersCount: reportForWeek.torchbearers_count,
        candlelightersCount: reportForWeek.candlelighters_count,
        teachersCount: reportForWeek.teachers_count,
        salvations: reportForWeek.salvations,
        holyGhostBaptisms: reportForWeek.holy_ghost_baptisms,
        healings: reportForWeek.healings
      });
    } else {
      setFormData({
        sundaySchool: 0,
        bibleStudy: 0,
        prayerMeeting: 0,
        visitors: 0,
        childrenCount: 0,
        cadetsCount: 0,
        torchbearersCount: 0,
        candlelightersCount: 0,
        teachersCount: 0,
        salvations: 0,
        holyGhostBaptisms: 0,
        healings: 0
      });
    }
  }, [selectedWeek, weeksData]);

  const handleInputChange = (field: keyof typeof formData, valueStr: string) => {
    const val = valueStr === '' ? 0 : parseInt(valueStr, 10);
    setFormData(prev => ({
      ...prev,
      [field]: isNaN(val) || val < 0 ? 0 : val
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToastMessage(null);
    setErrorMessage(null);

    try {
      const res = await reportsApi.submitReport({
        churchId: user?.church_id || undefined,
        year: selectedYear,
        month: selectedMonth,
        weekNumber: selectedWeek,
        ...formData
      });

      // Update local state
      setWeeksData(prev => ({
        ...prev,
        [selectedWeek]: res.report
      }));

      setToastMessage(`${selectedWeek}${getOrdinal(selectedWeek)} Sunday report saved successfully!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save weekly report.');
    } finally {
      setIsSaving(false);
    }
  };

  const getOrdinal = (n: number) => {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  };

  // Auto-calculated Monthly Summary
  const submittedReportsList = Object.values(weeksData).filter((r): r is WeeklyReport => r !== null);
  const submittedCount = submittedReportsList.length;

  const monthlySummary = {
    submittedCount,
    totalAttendance: submittedReportsList.reduce((acc, r) => acc + r.sunday_school + r.bible_study + r.prayer_meeting + r.visitors, 0),
    avgSundaySchool: submittedCount > 0 ? Math.round(submittedReportsList.reduce((acc, r) => acc + r.sunday_school, 0) / submittedCount) : 0,
    totalVisitors: submittedReportsList.reduce((acc, r) => acc + r.visitors, 0),
    avgChildren: submittedCount > 0 ? Math.round(submittedReportsList.reduce((acc, r) => acc + r.children_count, 0) / submittedCount) : 0,
    totalSalvations: submittedReportsList.reduce((acc, r) => acc + r.salvations, 0),
    totalBaptisms: submittedReportsList.reduce((acc, r) => acc + r.holy_ghost_baptisms, 0),
    totalHealings: submittedReportsList.reduce((acc, r) => acc + r.healings, 0),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-sm font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-white shrink-0">
              <img
                src="/foursquare-logo.jpg"
                alt="Foursquare Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-1">
                <span>{user?.zone_name || 'Assigned Zone'}</span>
                <span>•</span>
                <span>{user?.church_name || 'My Church'}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Weekly Service Submission
              </h2>
              <p className="text-xs text-slate-500">
                Foursquare Idimu Missionary District — Log Sunday metrics.
              </p>
            </div>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2">
            {isLoading && (
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            )}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 5 Sunday Week Selector Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Select Sunday Week
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 5].map(w => {
              const isSubmitted = Boolean(weeksData[w]);
              const isSelected = selectedWeek === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeek(w)}
                  className={`relative p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600'
                      : isSubmitted
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/70'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-black">
                    {w}{getOrdinal(w)}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    Sunday
                  </span>

                  {isSubmitted && (
                    <div className="mt-1 flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-white px-1.5 py-0.5 rounded-full shadow-2xs">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span className="hidden sm:inline">Saved</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* Category 1: Service Attendance & Visitors */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                1. Service Attendance & Visitors
              </h3>
              <p className="text-[11px] text-slate-500">Sunday morning & mid-week service figures</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sunday School</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.sundaySchool || ''}
                placeholder="0"
                onChange={e => handleInputChange('sundaySchool', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bible Study</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.bibleStudy || ''}
                placeholder="0"
                onChange={e => handleInputChange('bibleStudy', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prayer Meeting</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.prayerMeeting || ''}
                placeholder="0"
                onChange={e => handleInputChange('prayerMeeting', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 mb-1">New Visitors</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.visitors || ''}
                placeholder="0"
                onChange={e => handleInputChange('visitors', e.target.value)}
                className="w-full text-center text-lg font-black bg-indigo-50/60 border border-indigo-200 rounded-2xl py-2.5 text-indigo-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Category 2: Children, Groups & Workforce */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                2. Children, Groups & Workforce
              </h3>
              <p className="text-[11px] text-slate-500">Demographic cohorts & church teachers</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Children</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.childrenCount || ''}
                placeholder="0"
                onChange={e => handleInputChange('childrenCount', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cadets</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.cadetsCount || ''}
                placeholder="0"
                onChange={e => handleInputChange('cadetsCount', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Torchbearers</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.torchbearersCount || ''}
                placeholder="0"
                onChange={e => handleInputChange('torchbearersCount', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Candlelighters</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.candlelightersCount || ''}
                placeholder="0"
                onChange={e => handleInputChange('candlelightersCount', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div className="col-span-2 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Teachers Count</label>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                  ★ Include Mamas in teachers count
                </span>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.teachersCount || ''}
                placeholder="0"
                onChange={e => handleInputChange('teachersCount', e.target.value)}
                className="w-full text-center text-lg font-black bg-purple-50/40 border border-purple-200 rounded-2xl py-2.5 text-purple-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Category 3: Spiritual Report */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                3. Spiritual Report
              </h3>
              <p className="text-[11px] text-slate-500">Spiritual milestones & testimonies</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Salvations</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.salvations || ''}
                placeholder="0"
                onChange={e => handleInputChange('salvations', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Holy Ghost Baptism</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.holyGhostBaptisms || ''}
                placeholder="0"
                onChange={e => handleInputChange('holyGhostBaptisms', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Healings</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.healings || ''}
                placeholder="0"
                onChange={e => handleInputChange('healings', e.target.value)}
                className="w-full text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-2xl py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{isSaving ? 'Saving Report...' : `Save ${selectedWeek}${getOrdinal(selectedWeek)} Sunday Report`}</span>
        </button>
      </form>

      {/* Monthly Summary Preview Card */}
      <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h4 className="text-sm font-extrabold tracking-tight">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear} Church Summary
            </h4>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
            {monthlySummary.submittedCount} of 5 Sundays Logged
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Avg Sunday School</div>
            <div className="text-xl font-black text-indigo-300 mt-0.5">{monthlySummary.avgSundaySchool}</div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Total Visitors</div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">{monthlySummary.totalVisitors}</div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Avg Children</div>
            <div className="text-xl font-black text-amber-300 mt-0.5">{monthlySummary.avgChildren}</div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Spiritual Harvest</div>
            <div className="text-sm font-bold text-purple-300 mt-1">
              {monthlySummary.totalSalvations} Salvations • {monthlySummary.totalBaptisms} Bapt.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
