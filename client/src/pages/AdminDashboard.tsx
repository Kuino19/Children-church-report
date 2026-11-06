import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Filter,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings,
  Users,
  Flame,
  UserCheck,
  Building,
  RefreshCw,
  Search,
  HelpCircle,
  Edit2,
  Trash2,
  X,
  Save,
  Check,
  Key,
  MessageCircle
} from 'lucide-react';
import type { CollationResponse, Zone } from '../types';
import { reportsApi, metadataApi, authApi } from '../api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AdminDashboard: React.FC = () => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [aggregationMode, setAggregationMode] = useState<'average' | 'cumulative'>('average');

  const [collation, setCollation] = useState<CollationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded states
  const [expandedZones, setExpandedZones] = useState<{ [zoneId: string]: boolean }>({});
  const [showComplianceDrawer, setShowComplianceDrawer] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Zone & Church Management Modal
  const [showManageModal, setShowManageModal] = useState<boolean>(false);
  const [zonesList, setZonesList] = useState<Zone[]>([]);
  const [editingItem, setEditingItem] = useState<{
    type: 'zone' | 'church';
    id: string;
    name: string;
    zoneId?: string;
  } | null>(null);
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);

  // Load collation data
  const fetchCollation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.getDistrictCollation({
        year: selectedYear,
        month: selectedMonth,
        week: selectedWeek,
        aggregationMode
      });
      setCollation(data);

      // Default expand all zones initially
      const exp: { [zoneId: string]: boolean } = {};
      data.zones.forEach((z) => {
        exp[z.zoneId] = true;
      });
      setExpandedZones(exp);
    } catch (err: any) {
      setError(err.message || 'Failed to load collation reports');
    } finally {
      setLoading(false);
    }
  };

  const loadZonesMetadata = async () => {
    try {
      const res = await metadataApi.getZones();
      setZonesList(res.zones);
    } catch (err) {
      console.error('Failed to load zones for management modal', err);
    }
  };

  useEffect(() => {
    fetchCollation();
  }, [selectedYear, selectedMonth, selectedWeek, aggregationMode]);

  useEffect(() => {
    if (showManageModal) {
      loadZonesMetadata();
    }
  }, [showManageModal]);

  const toggleZone = (zoneId: string) => {
    setExpandedZones((prev) => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  // CSV Export
  const exportToCSV = () => {
    if (!collation) return;

    const headers = [
      'Zone',
      'Church Name',
      'Submissions',
      'Sunday School',
      'Bible Study',
      'Prayer Meeting',
      'Visitors',
      'Total Attendance',
      'Children',
      'Cadets',
      'Torchbearers',
      'Candlelighters',
      'Teachers (Incl Mamas)',
      'Salvations',
      'Holy Ghost Baptisms',
      'Healings'
    ];

    const rows: string[][] = [];

    collation.zones.forEach((z) => {
      z.churches.forEach((c) => {
        rows.push([
          `"${z.zoneName}"`,
          `"${c.churchName}"`,
          `${c.metrics.weeksCount}`,
          `${c.metrics.sundaySchool}`,
          `${c.metrics.bibleStudy}`,
          `${c.metrics.prayerMeeting}`,
          `${c.metrics.visitors}`,
          `${c.metrics.totalAttendance}`,
          `${c.metrics.childrenCount}`,
          `${c.metrics.cadetsCount}`,
          `${c.metrics.torchbearersCount}`,
          `${c.metrics.candlelightersCount}`,
          `${c.metrics.teachersCount}`,
          `${c.metrics.salvations}`,
          `${c.metrics.holyGhostBaptisms}`,
          `${c.metrics.healings}`
        ]);
      });

      // Subtotal row
      rows.push([
        `"[ZONE SUBTOTAL] ${z.zoneName}"`,
        `"-"`,
        `"-"`,
        `${z.subtotal.sundaySchool}`,
        `${z.subtotal.bibleStudy}`,
        `${z.subtotal.prayerMeeting}`,
        `${z.subtotal.visitors}`,
        `${z.subtotal.totalAttendance}`,
        `${z.subtotal.childrenCount}`,
        `${z.subtotal.cadetsCount}`,
        `${z.subtotal.torchbearersCount}`,
        `${z.subtotal.candlelightersCount}`,
        `${z.subtotal.teachersCount}`,
        `${z.subtotal.salvations}`,
        `${z.subtotal.holyGhostBaptisms}`,
        `${z.subtotal.healings}`
      ]);
    });

    // Grand Totals row
    rows.push([
      `"[DISTRICT GRAND TOTALS]"`,
      `"All ${collation.totalChurchesCount} Churches"`,
      `"-"`,
      `${collation.grandTotals.sundaySchool}`,
      `${collation.grandTotals.bibleStudy}`,
      `${collation.grandTotals.prayerMeeting}`,
      `${collation.grandTotals.visitors}`,
      `${collation.grandTotals.totalAttendance}`,
      `${collation.grandTotals.childrenCount}`,
      `${collation.grandTotals.cadetsCount}`,
      `${collation.grandTotals.torchbearersCount}`,
      `${collation.grandTotals.candlelightersCount}`,
      `${collation.grandTotals.teachersCount}`,
      `${collation.grandTotals.salvations}`,
      `${collation.grandTotals.holyGhostBaptisms}`,
      `${collation.grandTotals.healings}`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `foursquare_idimu_collation_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}_${selectedWeek === 'all' ? 'FullMonth' : `Week${selectedWeek}`}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered churches in Collation Table
  const filteredZones = useMemo(() => {
    if (!collation) return [];
    if (!searchQuery.trim()) return collation.zones;

    const query = searchQuery.toLowerCase();
    return collation.zones
      .map((z) => {
        const matchingChurches = z.churches.filter((c) =>
          c.churchName.toLowerCase().includes(query)
        );
        if (matchingChurches.length > 0 || z.zoneName.toLowerCase().includes(query)) {
          return {
            ...z,
            churches: matchingChurches
          };
        }
        return null;
      })
      .filter(Boolean) as typeof collation.zones;
  }, [collation, searchQuery]);

  // Dynamic Year List
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  // WhatsApp Broadcast for pending churches
  const handleWhatsAppBroadcast = () => {
    if (!collation) return;
    const pendingByZone: { [zoneName: string]: string[] } = {};
    for (const z of collation.complianceByZone) {
      const pendingList = z.churches.filter((ch) =>
        selectedWeek === 'all'
          ? ch.submittedCount === 0
          : !ch.submittedWeeks.includes(parseInt(selectedWeek, 10))
      );
      if (pendingList.length > 0) {
        pendingByZone[z.zoneName] = pendingList.map((c) => c.churchName);
      }
    }

    const totalPendingCount = Object.values(pendingByZone).reduce((a, b) => a + b.length, 0);
    if (totalPendingCount === 0) {
      alert('Hallelujah! All churches have submitted their reports for this period.');
      return;
    }

    let msg = `*FOURSQUARE IDIMU MISSIONARY DISTRICT*\n*CHILDREN'S MINISTRY - REPORTING REMINDER*\nPeriod: ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} (${selectedWeek === 'all' ? 'Full Month' : `Week ${selectedWeek}`})\n\nCalvary greetings esteemed leaders! Kindly log your weekly Sunday reports on the portal. The following ${totalPendingCount} church assembly(ies) are currently pending:\n\n`;

    for (const [zName, chList] of Object.entries(pendingByZone)) {
      msg += `📍 *${zName}*\n${chList.map((c) => `  • ${c}`).join('\n')}\n\n`;
    }

    msg += `🔗 Portal: https://children-church-report.vercel.app\n\nThank you and God bless your labor of love! 🙏`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Reset Rep Password
  const handleResetRepPassword = async (churchId: string, churchName: string) => {
    if (!window.confirm(`Reset login password for ${churchName}'s representative to default 'reppassword123'?`)) {
      return;
    }
    try {
      const res = await authApi.adminResetPassword({ churchId, newPassword: 'reppassword123' });
      setModalSuccessMsg(`Password for ${churchName} rep reset to: reppassword123 (Login: ${res.emailOrPhone})`);
      setTimeout(() => setModalSuccessMsg(null), 8000);
    } catch (err: any) {
      alert(err.message || 'Failed to reset rep password.');
    }
  };

  // Overall compliance stats
  const complianceStats = useMemo(() => {
    if (!collation) return { totalChurches: 0, submittedCount: 0, percentage: 0 };
    const total = collation.totalChurchesCount || 0;
    if (total === 0) return { totalChurches: 0, submittedCount: 0, percentage: 0 };

    let submitted = 0;
    collation.complianceByZone.forEach((z) => {
      z.churches.forEach((c) => {
        if (selectedWeek === 'all') {
          if (c.submittedCount > 0) submitted++;
        } else {
          if (c.submittedWeeks.includes(parseInt(selectedWeek, 10))) submitted++;
        }
      });
    });

    const percentage = Math.round((submitted / total) * 100);
    return { totalChurches: total, submittedCount: submitted, percentage };
  }, [collation, selectedWeek]);

  // Handle saving zone/church rename or reassignment
  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.name.trim()) return;

    try {
      if (editingItem.type === 'zone') {
        await metadataApi.renameZone(editingItem.id, editingItem.name.trim());
      } else {
        await metadataApi.updateChurch(editingItem.id, editingItem.name.trim(), editingItem.zoneId);
      }
      setModalSuccessMsg(`Successfully updated ${editingItem.type}!`);
      setEditingItem(null);
      await loadZonesMetadata();
      await fetchCollation();
      setTimeout(() => setModalSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Error updating: ${err.message}`);
    }
  };

  const handleDeleteChurch = async (churchId: string, churchName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${churchName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await metadataApi.deleteChurch(churchId);
      await loadZonesMetadata();
      await fetchCollation();
    } catch (err: any) {
      alert(`Error deleting church: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header / Title Section */}
      <div className="bg-white border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-white shrink-0">
                <img
                  src="/foursquare-logo.jpg"
                  alt="Foursquare Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-1">
                  <span>Foursquare Idimu Missionary District</span>
                </div>
                <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  IDIMU CHILDREN'S MINISTRY - DATA & SPIRITUAL REPORT PLATFORM
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Foursquare Idimu Missionary District — Real-time collation for all Zones and Churches.
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowManageModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Manage Names & Zones</span>
              </button>

              <button
                onClick={exportToCSV}
                disabled={!collation || loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / PDF Report</span>
              </button>
            </div>
          </div>

          {/* Filter Bar Controls */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300/80 rounded-xl px-3 py-1.5 shadow-2xs">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300/80 rounded-xl px-3 py-1.5 shadow-2xs">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Week Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300/80 rounded-xl px-3 py-1.5 shadow-2xs">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Scope:</span>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Full Month Collation</option>
                  <option value="1">1st Sunday Only</option>
                  <option value="2">2nd Sunday Only</option>
                  <option value="3">3rd Sunday Only</option>
                  <option value="4">4th Sunday Only</option>
                  <option value="5">5th Sunday Only</option>
                </select>
              </div>

              {/* Aggregation Mode (Sum vs Average) */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAggregationMode('average')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    aggregationMode === 'average'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Averages recurring headcounts across submitted weeks to avoid artificial multiplication"
                >
                  Average Headcount
                </button>
                <button
                  type="button"
                  onClick={() => setAggregationMode('cumulative')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    aggregationMode === 'cumulative'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Direct sum across all weeks"
                >
                  Cumulative (Sum)
                </button>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchCollation}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Printable Header (Visible only when printing) */}
        <div className="hidden print:flex items-center gap-4 mb-6 border-b pb-4">
          <img
            src="/foursquare-logo.jpg"
            alt="Foursquare Logo"
            className="w-16 h-16 object-contain rounded-lg border border-slate-300"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">
              IDIMU CHILDREN'S MINISTRY - DATA & SPIRITUAL REPORT PLATFORM
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Period: <span className="font-bold">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span> •
              Scope: <span className="font-bold">{selectedWeek === 'all' ? 'Full Month Collation' : `Week ${selectedWeek}`}</span> •
              Calculation: <span className="font-bold">{aggregationMode === 'average' ? 'Average Headcount Rollup' : 'Cumulative Sum'}</span>
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 no-print">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 font-medium">
              <span className="font-bold">Error loading reports: </span>
              {error}
            </div>
          </div>
        )}

        {/* Aggregation Mode Explanatory Notice */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 no-print">
          <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <span className="font-bold">Collation Mode Active: </span>
            {aggregationMode === 'average' ? (
              <span>
                <strong>Average Headcount:</strong> Demographic group counts (Children, Cadets, Torchbearers, Candlelighters, Teachers) represent weekly averages across submitted Sundays so that recurring church membership is not artificially inflated by 4x. Service attendees and visitors are displayed as true monthly aggregates.
              </span>
            ) : (
              <span>
                <strong>Cumulative Totals:</strong> All numbers across weeks are directly summed together. Useful when tracking cumulative attendance, total visitors, or year-to-date decisions.
              </span>
            )}
          </div>
        </div>

        {/* District Grand KPI Summary Cards */}
        {collation && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Submissions
                </span>
                <Building className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {complianceStats.submittedCount} / {complianceStats.totalChurches}
              </p>
              <div className="mt-1 text-[11px] font-semibold text-indigo-600">
                {complianceStats.percentage}% compliance
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Attendees
                </span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-blue-700">
                {collation.grandTotals.totalAttendance.toLocaleString()}
              </p>
              <div className="mt-1 text-[11px] font-medium text-slate-500">
                Avg: {Math.round(collation.grandTotals.totalAttendance / (collation.zones.length || 1))} / zone
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Children
                </span>
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-purple-700">
                {collation.grandTotals.childrenCount.toLocaleString()}
              </p>
              <div className="mt-1 text-[11px] font-medium text-slate-500">
                Across all churches
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Teachers
                </span>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-700">
                {collation.grandTotals.teachersCount.toLocaleString()}
              </p>
              <div className="mt-1 text-[11px] font-bold text-emerald-600">
                Incl. Mamas
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Visitors
                </span>
                <Users className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-700">
                {collation.grandTotals.visitors.toLocaleString()}
              </p>
              <div className="mt-1 text-[11px] font-medium text-slate-500">
                New guests
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Spiritual Harvest
                </span>
                <Flame className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-700">
                {(
                  collation.grandTotals.salvations +
                  collation.grandTotals.holyGhostBaptisms +
                  collation.grandTotals.healings
                ).toLocaleString()}
              </p>
              <div className="mt-1 text-[11px] font-medium text-slate-500">
                Salvation + HG + Healings
              </div>
            </div>
          </div>
        )}

        {/* Submission Compliance Progress Bar & Accordion (No Print) */}
        {collation && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Reporting Compliance Overview</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {complianceStats.submittedCount} of {complianceStats.totalChurches} churches reported
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submission status for {MONTH_NAMES[selectedMonth - 1]} {selectedYear} ({selectedWeek === 'all' ? 'Any Sunday' : `Week ${selectedWeek}`}).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleWhatsAppBroadcast}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                  title="Broadcast pending report reminder to WhatsApp group"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Broadcast</span>
                </button>

                <button
                  onClick={() => setShowComplianceDrawer(!showComplianceDrawer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  <span>{showComplianceDrawer ? 'Hide Details' : 'View Submitted vs Pending'}</span>
                  {showComplianceDrawer ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    complianceStats.percentage >= 80
                      ? 'bg-emerald-500'
                      : complianceStats.percentage >= 50
                      ? 'bg-indigo-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${complianceStats.percentage}%` }}
                />
              </div>
            </div>

            {/* Expandable Church-by-Church Compliance Tracker */}
            {showComplianceDrawer && (
              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collation.complianceByZone.map((zone) => (
                  <div key={zone.zoneId} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-extrabold text-slate-900">{zone.zoneName}</h4>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {zone.submittedCount} / {zone.totalChurches} Done
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {zone.churches.map((ch) => {
                        const hasSubmittedCurrent =
                          selectedWeek === 'all'
                            ? ch.submittedCount > 0
                            : ch.submittedWeeks.includes(parseInt(selectedWeek, 10));

                        return (
                          <div
                            key={ch.churchId}
                            className={`flex items-center justify-between text-xs p-2 rounded-lg border ${
                              hasSubmittedCurrent
                                ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-950'
                                : 'bg-rose-50/60 border-rose-200/60 text-rose-950'
                            }`}
                          >
                            <span className="font-medium truncate max-w-[180px]">{ch.churchName}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {hasSubmittedCurrent ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{ch.submittedCount} Sun</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded">
                                    <Clock className="w-3 h-3" />
                                    <span>Pending</span>
                                  </span>
                                  <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`Calvary greetings! Gentle reminder from Foursquare Idimu Missionary District Children's Ministry. Kindly submit the weekly Sunday report for *${ch.churchName}* (${zone.zoneName}) for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} on the portal:\nhttps://children-church-report.vercel.app`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-1.5 py-0.5 rounded transition-colors"
                                    title={`Send WhatsApp reminder to ${ch.churchName}`}
                                  >
                                    <MessageCircle className="w-2.5 h-2.5" />
                                    <span>Remind</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search & Collation Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Zone & Church Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed metrics collated for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search church or zone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Responsive Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[220px] sticky left-0 bg-slate-100 z-10">Church / Zone</th>
                  <th className="py-3 px-3 text-center">Weeks</th>
                  <th className="py-3 px-3 text-right">Sun School</th>
                  <th className="py-3 px-3 text-right">Bible Study</th>
                  <th className="py-3 px-3 text-right">Prayer Mtg</th>
                  <th className="py-3 px-3 text-right">Visitors</th>
                  <th className="py-3 px-3 text-right font-black text-indigo-700">Total Attd</th>
                  <th className="py-3 px-3 text-right">Children</th>
                  <th className="py-3 px-3 text-right">Cadets</th>
                  <th className="py-3 px-3 text-right">Torchbearers</th>
                  <th className="py-3 px-3 text-right">Candlelighters</th>
                  <th className="py-3 px-3 text-right font-bold text-emerald-800">Teachers*</th>
                  <th className="py-3 px-3 text-right">Salvations</th>
                  <th className="py-3 px-3 text-right">HG Baptisms</th>
                  <th className="py-3 px-3 text-right">Healings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-slate-400 font-medium">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                      Loading collation records...
                    </td>
                  </tr>
                ) : filteredZones.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-slate-400 font-medium">
                      No matching records found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredZones.map((zone) => {
                    const isExpanded = expandedZones[zone.zoneId] !== false;

                    return (
                      <React.Fragment key={zone.zoneId}>
                        {/* Zone Header Row */}
                        <tr
                          onClick={() => toggleZone(zone.zoneId)}
                          className="bg-indigo-50/40 hover:bg-indigo-50/70 border-y border-indigo-100 font-black cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 sticky left-0 bg-indigo-50/90 z-10 flex items-center gap-2 text-indigo-950">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-600 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-indigo-600 shrink-0" />
                            )}
                            <span className="font-extrabold text-xs">{zone.zoneName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                              {zone.churches.length} Churches
                            </span>
                          </td>
                          <td colSpan={14} className="py-3 px-3 text-[11px] font-semibold text-indigo-800 text-right pr-4">
                            Click to {isExpanded ? 'collapse' : 'expand'}
                          </td>
                        </tr>

                        {/* Church Rows */}
                        {isExpanded &&
                          zone.churches.map((church) => (
                            <tr key={church.churchId} className="hover:bg-slate-50/90 transition-colors">
                              <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-slate-50/90 z-10 pl-9 font-medium text-slate-900 border-r border-slate-100">
                                <div>{church.churchName}</div>
                                {church.lastSubmittedBy && (
                                  <div className="text-[10px] text-slate-400 font-normal truncate max-w-[200px]">
                                    By: {church.lastSubmittedBy} {church.lastUpdatedAt && `• ${new Date(church.lastUpdatedAt).toLocaleDateString()}`}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    church.metrics.weeksCount > 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {church.metrics.weeksCount}/5
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.sundaySchool}</td>
                              <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.bibleStudy}</td>
                              <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.prayerMeeting}</td>
                              <td className="py-2.5 px-3 text-right text-amber-700 font-medium">{church.metrics.visitors}</td>
                              <td className="py-2.5 px-3 text-right font-black text-indigo-700 bg-indigo-50/30">
                                {church.metrics.totalAttendance}
                              </td>
                              <td className="py-2.5 px-3 text-right text-purple-700 font-medium">{church.metrics.childrenCount}</td>
                              <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.cadetsCount}</td>
                              <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.torchbearersCount}</td>
                              <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.candlelightersCount}</td>
                              <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">{church.metrics.teachersCount}</td>
                              <td className="py-2.5 px-3 text-right text-rose-700 font-medium">{church.metrics.salvations}</td>
                              <td className="py-2.5 px-3 text-right text-rose-700 font-medium">{church.metrics.holyGhostBaptisms}</td>
                              <td className="py-2.5 px-3 text-right text-rose-700 font-medium">{church.metrics.healings}</td>
                            </tr>
                          ))}

                        {/* Zone Subtotal Row */}
                        <tr className="bg-slate-100/90 font-bold text-slate-900 border-b border-slate-300">
                          <td className="py-2.5 px-4 sticky left-0 bg-slate-100/90 z-10 pl-6 text-xs font-black text-slate-800">
                            Subtotal: {zone.zoneName}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.sundaySchool}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.bibleStudy}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.prayerMeeting}</td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-800">{zone.subtotal.visitors}</td>
                          <td className="py-2.5 px-3 text-right font-black text-indigo-800 bg-indigo-100/40">
                            {zone.subtotal.totalAttendance}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-purple-800">{zone.subtotal.childrenCount}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.cadetsCount}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.torchbearersCount}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.candlelightersCount}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-800">{zone.subtotal.teachersCount}</td>
                          <td className="py-2.5 px-3 text-right font-black text-rose-800">{zone.subtotal.salvations}</td>
                          <td className="py-2.5 px-3 text-right font-black text-rose-800">{zone.subtotal.holyGhostBaptisms}</td>
                          <td className="py-2.5 px-3 text-right font-black text-rose-800">{zone.subtotal.healings}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}

                {/* District Grand Totals Row */}
                {collation && (
                  <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-950">
                    <td className="py-3 px-4 sticky left-0 bg-slate-900 z-10 text-white font-extrabold uppercase tracking-wide">
                      District Grand Totals (Foursquare Idimu)
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      {collation.totalChurchesCount} Churches
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300">{collation.grandTotals.sundaySchool.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-emerald-300">{collation.grandTotals.bibleStudy.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-emerald-300">{collation.grandTotals.prayerMeeting.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-amber-300">{collation.grandTotals.visitors.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-indigo-300 font-extrabold bg-slate-800">
                      {collation.grandTotals.totalAttendance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-purple-300">{collation.grandTotals.childrenCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{collation.grandTotals.cadetsCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{collation.grandTotals.torchbearersCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{collation.grandTotals.candlelightersCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-emerald-300">{collation.grandTotals.teachersCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-rose-300">{collation.grandTotals.salvations.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-rose-300">{collation.grandTotals.holyGhostBaptisms.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-rose-300">{collation.grandTotals.healings.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>* Teachers count explicitly includes Mamas in church leadership.</span>
            <span>All figures update automatically upon rep submission.</span>
          </div>
        </div>
      </div>

      {/* Name Corrections & Zone Management Modal (Admin Only) */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Church & Zone Name Management
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Merge duplicate names, fix typos entered during registration, or reassign zones.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowManageModal(false);
                  setEditingItem(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6">
              {modalSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{modalSuccessMsg}</span>
                </div>
              )}

              {/* Edit Active Form */}
              {editingItem && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Editing {editingItem.type === 'zone' ? 'Zone' : 'Church'} Name
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Display Name (Normalized Title Case)
                      </label>
                      <input
                        type="text"
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {editingItem.type === 'church' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Assign to Zone
                        </label>
                        <select
                          value={editingItem.zoneId}
                          onChange={(e) => setEditingItem({ ...editingItem, zoneId: e.target.value })}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        >
                          {zonesList.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Zones and their Churches List */}
              <div className="space-y-4">
                {zonesList.map((zone) => (
                  <div key={zone.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-extrabold text-slate-900">{zone.name}</span>
                        <span className="text-[10px] text-slate-500">
                          ({zone.churches?.length || 0} churches)
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setEditingItem({
                            type: 'zone',
                            id: zone.id,
                            name: zone.name
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Rename Zone</span>
                      </button>
                    </div>

                    <div className="p-3 divide-y divide-slate-100">
                      {zone.churches && zone.churches.length > 0 ? (
                        zone.churches.map((church) => (
                          <div
                            key={church.id}
                            className="py-2 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-lg"
                          >
                            <span className="font-medium text-slate-800">{church.name}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleResetRepPassword(church.id, church.name)}
                                className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                                title="Reset Rep Password to default"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setEditingItem({
                                    type: 'church',
                                    id: church.id,
                                    name: church.name,
                                    zoneId: zone.id
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Edit / Reassign"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteChurch(church.id, church.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete Church"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 py-1.5 px-2 italic">
                          No registered churches in this zone yet.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => {
                  setShowManageModal(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
