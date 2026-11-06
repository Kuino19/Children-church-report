import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../api';
import type { WeeklyReport } from '../types';
import { 
  CheckCircle2, Save, Users, HeartHandshake, Sparkles, 
  AlertCircle, BarChart3, RefreshCw, WifiOff, UploadCloud, X, ShieldCheck,
  BookOpen, Calendar
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface OfflineDraft {
  id: string;
  churchId: string;
  year: number;
  month: number;
  weekNumber: number;
  formData: any;
  timestamp: number;
}

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
    worshipAttendance: 0,
    bibleStudy: 0,
    prayerMeeting: 0,
    visitors: 0,
    // Cat 2: Demographics & Workforce
    childrenCount: 0,
    cadetsCount: 0,
    cupbearersCount: 0,
    candlelightersCount: 0,
    teachersCount: 0,
    // Bible Club Attendance
    bibleClubTeachers: 0,
    bibleClubChildren: 0,
    // Cat 3: Spiritual Report
    salvations: 0,
    holyGhostBaptisms: 0,
    healings: 0,
    // Programmes
    specialProgramme: '',
    forthcomingProgramme: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineDraft[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Dynamic Year List
  const currentYear = now.getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  // Load offline drafts from localStorage on mount & listen to network status
  useEffect(() => {
    try {
      const stored = localStorage.getItem('church_offline_drafts');
      if (stored) {
        setOfflineDrafts(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    try {
      const stored = localStorage.getItem('church_offline_drafts');
      if (!stored) return;
      const drafts: OfflineDraft[] = JSON.parse(stored);
      if (!drafts.length) return;

      setIsSyncing(true);
      const remaining: OfflineDraft[] = [];

      for (const draft of drafts) {
        try {
          await reportsApi.submitReport({
            churchId: draft.churchId,
            year: draft.year,
            month: draft.month,
            weekNumber: draft.weekNumber,
            ...draft.formData
          });
        } catch {
          remaining.push(draft);
        }
      }

      setOfflineDrafts(remaining);
      localStorage.setItem('church_offline_drafts', JSON.stringify(remaining));

      if (remaining.length === 0) {
        setToastMessage('All offline reports synced successfully to cloud!');
        setTimeout(() => setToastMessage(null), 3500);
        loadReports();
      }
    } catch {
      // Ignore
    } finally {
      setIsSyncing(false);
    }
  };

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
          worshipAttendance: currentReport.worship_attendance || 0,
          bibleStudy: currentReport.bible_study,
          prayerMeeting: currentReport.prayer_meeting,
          visitors: currentReport.visitors,
          childrenCount: currentReport.children_count,
          cadetsCount: currentReport.cadets_count,
          cupbearersCount: currentReport.cupbearers_count ?? currentReport.torchbearers_count ?? 0,
          candlelightersCount: currentReport.candlelighters_count,
          teachersCount: currentReport.teachers_count,
          bibleClubTeachers: currentReport.bible_club_teachers || 0,
          bibleClubChildren: currentReport.bible_club_children || 0,
          salvations: currentReport.salvations,
          holyGhostBaptisms: currentReport.holy_ghost_baptisms,
          healings: currentReport.healings,
          specialProgramme: currentReport.special_programme || '',
          forthcomingProgramme: currentReport.forthcoming_programme || ''
        });
      } else {
        // Reset to zeros for fresh submission
        setFormData({
          sundaySchool: 0,
          worshipAttendance: 0,
          bibleStudy: 0,
          prayerMeeting: 0,
          visitors: 0,
          childrenCount: 0,
          cadetsCount: 0,
          cupbearersCount: 0,
          candlelightersCount: 0,
          teachersCount: 0,
          bibleClubTeachers: 0,
          bibleClubChildren: 0,
          salvations: 0,
          holyGhostBaptisms: 0,
          healings: 0,
          specialProgramme: '',
          forthcomingProgramme: ''
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
        worshipAttendance: reportForWeek.worship_attendance || 0,
        bibleStudy: reportForWeek.bible_study,
        prayerMeeting: reportForWeek.prayer_meeting,
        visitors: reportForWeek.visitors,
        childrenCount: reportForWeek.children_count,
        cadetsCount: reportForWeek.cadets_count,
        cupbearersCount: reportForWeek.cupbearers_count ?? reportForWeek.torchbearers_count ?? 0,
        candlelightersCount: reportForWeek.candlelighters_count,
        teachersCount: reportForWeek.teachers_count,
        bibleClubTeachers: reportForWeek.bible_club_teachers || 0,
        bibleClubChildren: reportForWeek.bible_club_children || 0,
        salvations: reportForWeek.salvations,
        holyGhostBaptisms: reportForWeek.holy_ghost_baptisms,
        healings: reportForWeek.healings,
        specialProgramme: reportForWeek.special_programme || '',
        forthcomingProgramme: reportForWeek.forthcoming_programme || ''
      });
    } else {
      setFormData({
        sundaySchool: 0,
        worshipAttendance: 0,
        bibleStudy: 0,
        prayerMeeting: 0,
        visitors: 0,
        childrenCount: 0,
        cadetsCount: 0,
        cupbearersCount: 0,
        candlelightersCount: 0,
        teachersCount: 0,
        bibleClubTeachers: 0,
        bibleClubChildren: 0,
        salvations: 0,
        holyGhostBaptisms: 0,
        healings: 0,
        specialProgramme: '',
        forthcomingProgramme: ''
      });
    }
  }, [selectedWeek, weeksData]);

  const handleInputChange = (field: keyof typeof formData, valueStr: string) => {
    if (field === 'specialProgramme' || field === 'forthcomingProgramme') {
      setFormData(prev => ({
        ...prev,
        [field]: valueStr
      }));
      return;
    }
    const val = valueStr === '' ? 0 : parseInt(valueStr, 10);
    setFormData(prev => ({
      ...prev,
      [field]: isNaN(val) || val < 0 ? 0 : val
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const executeSave = async () => {
    setIsSaving(true);
    setToastMessage(null);
    setErrorMessage(null);

    // If offline or network unavailable, save directly to offline drafts
    if (!navigator.onLine) {
      saveOfflineDraft();
      setIsSaving(false);
      setShowConfirmModal(false);
      return;
    }

    try {
      const res = await reportsApi.submitReport({
        churchId: user?.church_id || undefined,
        year: selectedYear,
        month: selectedMonth,
        weekNumber: selectedWeek,
        ...formData,
        torchbearersCount: formData.cupbearersCount
      });

      // Update local state
      setWeeksData(prev => ({
        ...prev,
        [selectedWeek]: res.report
      }));

      setToastMessage(`${selectedWeek}${getOrdinal(selectedWeek)} Sunday report saved successfully!`);
      setTimeout(() => setToastMessage(null), 3500);
      setShowConfirmModal(false);
    } catch (err: any) {
      // Network failure fallback
      if (!navigator.onLine || err.message?.includes('fetch') || err.message?.includes('network')) {
        saveOfflineDraft();
        setShowConfirmModal(false);
      } else {
        setErrorMessage(err.message || 'Failed to save weekly report.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const saveOfflineDraft = () => {
    if (!user?.church_id) return;
    const draftId = `${user.church_id}_${selectedYear}_${selectedMonth}_${selectedWeek}`;
    const newDraft: OfflineDraft = {
      id: draftId,
      churchId: user.church_id,
      year: selectedYear,
      month: selectedMonth,
      weekNumber: selectedWeek,
      formData: { ...formData },
      timestamp: Date.now()
    };

    const updatedDrafts = offlineDrafts.filter(d => d.id !== draftId).concat(newDraft);
    setOfflineDrafts(updatedDrafts);
    localStorage.setItem('church_offline_drafts', JSON.stringify(updatedDrafts));

    // Update UI weeksData locally
    setWeeksData(prev => ({
      ...prev,
      [selectedWeek]: {
        id: draftId,
        church_id: user.church_id!,
        zone_id: user.zone_id || '',
        submitted_by: user.id,
        report_year: selectedYear,
        report_month: selectedMonth,
        week_number: selectedWeek,
        sunday_school: formData.sundaySchool,
        worship_attendance: formData.worshipAttendance,
        bible_study: formData.bibleStudy,
        prayer_meeting: formData.prayerMeeting,
        visitors: formData.visitors,
        children_count: formData.childrenCount,
        cadets_count: formData.cadetsCount,
        cupbearers_count: formData.cupbearersCount,
        torchbearers_count: formData.cupbearersCount,
        candlelighters_count: formData.candlelightersCount,
        teachers_count: formData.teachersCount,
        bible_club_teachers: formData.bibleClubTeachers,
        bible_club_children: formData.bibleClubChildren,
        salvations: formData.salvations,
        holy_ghost_baptisms: formData.holyGhostBaptisms,
        healings: formData.healings,
        special_programme: formData.specialProgramme,
        forthcoming_programme: formData.forthcomingProgramme,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }));

    setToastMessage(`⚡ Saved offline on phone! Will sync when connection returns.`);
    setTimeout(() => setToastMessage(null), 4000);
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
    totalAttendance: submittedReportsList.reduce((acc, r) => acc + r.sunday_school + (r.worship_attendance || 0) + r.bible_study + r.prayer_meeting + r.visitors, 0),
    avgSundaySchool: submittedCount > 0 ? Math.round(submittedReportsList.reduce((acc, r) => acc + r.sunday_school, 0) / submittedCount) : 0,
    avgWorshipAttendance: submittedCount > 0 ? Math.round(submittedReportsList.reduce((acc, r) => acc + (r.worship_attendance || 0), 0) / submittedCount) : 0,
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
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-sm font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 transition-all">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Offline Sync Banner if drafts exist */}
      {offlineDrafts.length > 0 && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                {offlineDrafts.length} report(s) saved on this phone waiting to sync.
              </p>
              <p className="text-[11px] text-amber-700">
                They will sync automatically when your internet connection is restored.
              </p>
            </div>
          </div>
          {isOnline && (
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}
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
              <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight uppercase">
                IDIMU CHILDREN'S MINISTRY - DATA & SPIRITUAL REPORT PLATFORM
              </h2>
              <p className="text-xs text-slate-500">
                Weekly Sunday Service Submission & Metrics Log.
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
              {availableYears.map(y => (
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
      <form onSubmit={handleFormSubmit} className="space-y-5">
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

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
              <label className="block text-xs font-bold text-indigo-700 mb-1">Worship Attd</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.worshipAttendance || ''}
                placeholder="0"
                onChange={e => handleInputChange('worshipAttendance', e.target.value)}
                className="w-full text-center text-lg font-black bg-indigo-50/50 border border-indigo-200 rounded-2xl py-2.5 text-indigo-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
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

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-amber-700 mb-1">New Visitors</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.visitors || ''}
                placeholder="0"
                onChange={e => handleInputChange('visitors', e.target.value)}
                className="w-full text-center text-lg font-black bg-amber-50/60 border border-amber-200 rounded-2xl py-2.5 text-amber-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
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

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Cupbearers</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.cupbearersCount || ''}
                placeholder="0"
                onChange={e => handleInputChange('cupbearersCount', e.target.value)}
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

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">Teachers Count</label>
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

        {/* Category 3: Bible Club Attendance */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                3. Bible Club Attendance
              </h3>
              <p className="text-[11px] text-slate-500">Mid-week or Saturday Bible Club outreach</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bible Club Children</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.bibleClubChildren || ''}
                placeholder="0"
                onChange={e => handleInputChange('bibleClubChildren', e.target.value)}
                className="w-full text-center text-lg font-black bg-teal-50/50 border border-teal-200 rounded-2xl py-2.5 text-teal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bible Club Teachers</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.bibleClubTeachers || ''}
                placeholder="0"
                onChange={e => handleInputChange('bibleClubTeachers', e.target.value)}
                className="w-full text-center text-lg font-black bg-teal-50/50 border border-teal-200 rounded-2xl py-2.5 text-teal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600"
              />
            </div>
          </div>
        </div>

        {/* Category 4: Spiritual Report */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                4. Spiritual Report
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

        {/* Category 5: Special & Forthcoming Programmes */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                5. Special & Forthcoming Programmes
              </h3>
              <p className="text-[11px] text-slate-500">Events held this week and upcoming church events</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Special Programme (Events Held)</label>
              <textarea
                rows={2}
                value={formData.specialProgramme}
                placeholder="e.g. Children Harvest celebration, Easter picnic, or Community Outreach held this week..."
                onChange={e => handleInputChange('specialProgramme', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Forthcoming Programme (Upcoming Events)</label>
              <textarea
                rows={2}
                value={formData.forthcomingProgramme}
                placeholder="e.g. Vacation Bible School next month, Choir practice, or Zonal rally planned..."
                onChange={e => handleInputChange('forthcomingProgramme', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 resize-none"
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

      {/* Submission Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Confirm Weekly Submission
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedWeek}{getOrdinal(selectedWeek)} Sunday • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Please double check the figures below before saving for <strong>{user?.church_name}</strong>:
            </p>

            <div className="space-y-3 mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-700">1. Service Attendance</span>
                <span className="text-slate-900 font-semibold text-right">
                  SS: {formData.sundaySchool} | Worship: {formData.worshipAttendance} | BS: {formData.bibleStudy} | PM: {formData.prayerMeeting} | Visitors: {formData.visitors}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-700">2. Demographics</span>
                <span className="text-slate-900 font-semibold text-right">
                  Children: {formData.childrenCount} (Cadets: {formData.cadetsCount}, Cup: {formData.cupbearersCount}, Candle: {formData.candlelightersCount}) | Teachers: {formData.teachersCount}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-700">3. Bible Club</span>
                <span className="text-slate-900 font-semibold text-right">
                  Children: {formData.bibleClubChildren} | Teachers: {formData.bibleClubTeachers}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-700">4. Spiritual Harvest</span>
                <span className="text-slate-900 font-semibold text-right">
                  Salvations: {formData.salvations} | Baptisms: {formData.holyGhostBaptisms} | Healings: {formData.healings}
                </span>
              </div>
              {(formData.specialProgramme || formData.forthcomingProgramme) && (
                <div className="pt-1 text-[11px] space-y-1">
                  {formData.specialProgramme && (
                    <div><span className="font-bold text-indigo-700">Special:</span> {formData.specialProgramme}</div>
                  )}
                  {formData.forthcomingProgramme && (
                    <div><span className="font-bold text-emerald-700">Forthcoming:</span> {formData.forthcomingProgramme}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Review & Edit
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={isSaving}
                className="flex-1 py-3 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Yes, Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
