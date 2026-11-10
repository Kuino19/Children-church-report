import React, { useState, useEffect, useMemo } from 'react';
import {
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
  MessageCircle,
  Sparkles,
  UserPlus,
  PlusCircle,
  Edit3,
  FileSpreadsheet,
  Copy,
  Menu,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { CollationResponse, Zone, ChurchRowCollation } from '../types';
import { reportsApi, metadataApi, authApi } from '../api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const currentDate = new Date();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
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
  const [selectedChurchProgrammes, setSelectedChurchProgrammes] = useState<ChurchRowCollation | null>(null);

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

  // Create Rep Profile Modal States
  const [showCreateRepModal, setShowCreateRepModal] = useState<boolean>(false);
  const [createRepForm, setCreateRepForm] = useState({
    fullName: '',
    emailOrPhone: '',
    churchId: '',
    customZone: '',
    customChurch: '',
    isCustomChurch: false,
    password: 'reppassword123'
  });
  const [createRepLoading, setCreateRepLoading] = useState(false);
  const [createRepSuccess, setCreateRepSuccess] = useState<{ message: string; user: any; password: string } | null>(null);
  const [createRepError, setCreateRepError] = useState<string | null>(null);
  const [copiedLoginDetails, setCopiedLoginDetails] = useState(false);

  // Enter Church Sunday Report Modal States
  const [showEnterReportModal, setShowEnterReportModal] = useState<boolean>(false);
  const [targetChurchForReport, setTargetChurchForReport] = useState<{ id: string; name: string; zoneName?: string } | null>(null);
  const [adminReportWeek, setAdminReportWeek] = useState<number>(1);
  const [adminReportData, setAdminReportData] = useState({
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
  const [adminChurchWeeksMap, setAdminChurchWeeksMap] = useState<{ [week: number]: boolean }>({});
  const [adminReportLoading, setAdminReportLoading] = useState(false);
  const [adminReportSaving, setAdminReportSaving] = useState(false);
  const [adminReportSuccess, setAdminReportSuccess] = useState<string | null>(null);
  const [adminReportError, setAdminReportError] = useState<string | null>(null);

  // Flat list of all churches
  const allChurches = useMemo(() => {
    return zonesList.flatMap((z) =>
      (z.churches || []).map((c) => ({
        id: c.id,
        name: c.name,
        zoneId: z.id,
        zoneName: z.name
      }))
    );
  }, [zonesList]);

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
    loadZonesMetadata();
  }, []);

  useEffect(() => {
    if (showManageModal || showCreateRepModal || showEnterReportModal) {
      loadZonesMetadata();
    }
  }, [showManageModal, showCreateRepModal, showEnterReportModal]);

  const loadChurchWeekData = async (churchId: string, week: number) => {
    try {
      setAdminReportLoading(true);
      setAdminReportError(null);
      setAdminReportSuccess(null);
      const res = await reportsApi.getChurchReports(churchId, selectedYear, selectedMonth);
      const weeksMap: { [w: number]: boolean } = {};
      for (let w = 1; w <= 5; w++) {
        if (res.weeks && res.weeks[w]) {
          weeksMap[w] = true;
        }
      }
      setAdminChurchWeeksMap(weeksMap);

      const reportForWeek = res.weeks ? res.weeks[week] : null;
      if (reportForWeek) {
        setAdminReportData({
          sundaySchool: reportForWeek.sunday_school || 0,
          worshipAttendance: reportForWeek.worship_attendance || 0,
          bibleStudy: reportForWeek.bible_study || 0,
          prayerMeeting: reportForWeek.prayer_meeting || 0,
          visitors: reportForWeek.visitors || 0,
          childrenCount: reportForWeek.children_count || 0,
          cadetsCount: reportForWeek.cadets_count || 0,
          cupbearersCount: reportForWeek.cupbearers_count ?? reportForWeek.torchbearers_count ?? 0,
          candlelightersCount: reportForWeek.candlelighters_count || 0,
          teachersCount: reportForWeek.teachers_count || 0,
          bibleClubTeachers: reportForWeek.bible_club_teachers || 0,
          bibleClubChildren: reportForWeek.bible_club_children || 0,
          salvations: reportForWeek.salvations || 0,
          holyGhostBaptisms: reportForWeek.holy_ghost_baptisms || 0,
          healings: reportForWeek.healings || 0,
          specialProgramme: reportForWeek.special_programme || '',
          forthcomingProgramme: reportForWeek.forthcoming_programme || ''
        });
      } else {
        setAdminReportData({
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
      setAdminReportError('Failed to load existing church report: ' + err.message);
    } finally {
      setAdminReportLoading(false);
    }
  };

  const handleOpenEnterReportModal = (churchId?: string, churchName?: string, zoneName?: string) => {
    setAdminReportSuccess(null);
    setAdminReportError(null);
    const initialWeek = selectedWeek === 'all' ? 1 : parseInt(selectedWeek, 10);
    setAdminReportWeek(initialWeek);

    if (churchId && churchName) {
      setTargetChurchForReport({ id: churchId, name: churchName, zoneName });
      loadChurchWeekData(churchId, initialWeek);
    } else if (allChurches.length > 0) {
      const firstChurch = allChurches[0];
      setTargetChurchForReport({ id: firstChurch.id, name: firstChurch.name, zoneName: firstChurch.zoneName });
      loadChurchWeekData(firstChurch.id, initialWeek);
    } else {
      setTargetChurchForReport(null);
    }

    setShowEnterReportModal(true);
  };

  const handleChangeTargetChurch = (churchId: string) => {
    const found = allChurches.find((c) => c.id === churchId);
    if (found) {
      setTargetChurchForReport({ id: found.id, name: found.name, zoneName: found.zoneName });
      loadChurchWeekData(found.id, adminReportWeek);
    }
  };

  const handleChangeReportWeek = (week: number) => {
    setAdminReportWeek(week);
    if (targetChurchForReport) {
      loadChurchWeekData(targetChurchForReport.id, week);
    }
  };

  const handleSaveAdminChurchReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetChurchForReport) return;
    try {
      setAdminReportSaving(true);
      setAdminReportError(null);
      setAdminReportSuccess(null);

      await reportsApi.submitReport({
        churchId: targetChurchForReport.id,
        year: selectedYear,
        month: selectedMonth,
        weekNumber: adminReportWeek,
        ...adminReportData
      });

      setAdminReportSuccess(`✓ Week ${adminReportWeek} report saved for ${targetChurchForReport.name}!`);
      setAdminChurchWeeksMap((prev) => ({ ...prev, [adminReportWeek]: true }));
      fetchCollation();
    } catch (err: any) {
      setAdminReportError(err.message || 'Failed to save church report.');
    } finally {
      setAdminReportSaving(false);
    }
  };

  const handleCreateRep = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateRepLoading(true);
    setCreateRepError(null);
    setCreateRepSuccess(null);
    setCopiedLoginDetails(false);

    try {
      if (createRepForm.isCustomChurch) {
        if (!createRepForm.customZone.trim() || !createRepForm.customChurch.trim()) {
          throw new Error('Please enter both Zone Name and Church Name.');
        }
      } else {
        if (!createRepForm.churchId) {
          throw new Error('Please select a church from the list.');
        }
      }

      const payload = {
        fullName: createRepForm.fullName.trim(),
        emailOrPhone: createRepForm.emailOrPhone.trim(),
        password: createRepForm.password || 'reppassword123',
        ...(createRepForm.isCustomChurch
          ? { zoneName: createRepForm.customZone.trim(), churchName: createRepForm.customChurch.trim() }
          : { churchId: createRepForm.churchId })
      };

      const res = await authApi.adminCreateRep(payload);
      setCreateRepSuccess({
        message: res.message,
        user: res.user,
        password: res.defaultPassword || createRepForm.password || 'reppassword123'
      });

      setCreateRepForm({
        fullName: '',
        emailOrPhone: '',
        churchId: '',
        customZone: '',
        customChurch: '',
        isCustomChurch: false,
        password: 'reppassword123'
      });

      loadZonesMetadata();
      fetchCollation();
    } catch (err: any) {
      setCreateRepError(err.message || 'Failed to create representative profile.');
    } finally {
      setCreateRepLoading(false);
    }
  };

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
      'Worship Attendance',
      'Bible Study',
      'Prayer Meeting',
      'Visitors',
      'Total Attendance',
      'Children',
      'Cadets',
      'Cupbearers',
      'Candlelighters',
      'Teachers',
      'Bible Club Children',
      'Bible Club Teachers',
      'Salvations',
      'Holy Ghost Baptisms',
      'Healings',
      'Special Programmes',
      'Forthcoming Programmes'
    ];

    const rows: string[][] = [];

    collation.zones.forEach((z) => {
      z.churches.forEach((c) => {
        const specProg = (c.specialProgrammes || []).filter(Boolean).join(' | ').replace(/"/g, '""');
        const forthProg = (c.forthcomingProgrammes || []).filter(Boolean).join(' | ').replace(/"/g, '""');

        rows.push([
          `"${z.zoneName}"`,
          `"${c.churchName}"`,
          `${c.metrics.weeksCount}`,
          `${c.metrics.sundaySchool}`,
          `${c.metrics.worshipAttendance}`,
          `${c.metrics.bibleStudy}`,
          `${c.metrics.prayerMeeting}`,
          `${c.metrics.visitors}`,
          `${c.metrics.totalAttendance}`,
          `${c.metrics.childrenCount}`,
          `${c.metrics.cadetsCount}`,
          `${c.metrics.cupbearersCount}`,
          `${c.metrics.candlelightersCount}`,
          `${c.metrics.teachersCount}`,
          `${c.metrics.bibleClubChildren}`,
          `${c.metrics.bibleClubTeachers}`,
          `${c.metrics.salvations}`,
          `${c.metrics.holyGhostBaptisms}`,
          `${c.metrics.healings}`,
          `"${specProg}"`,
          `"${forthProg}"`
        ]);
      });

      // Subtotal row
      rows.push([
        `"[ZONE SUBTOTAL] ${z.zoneName}"`,
        `"-"`,
        `"-"`,
        `${z.subtotal.sundaySchool}`,
        `${z.subtotal.worshipAttendance}`,
        `${z.subtotal.bibleStudy}`,
        `${z.subtotal.prayerMeeting}`,
        `${z.subtotal.visitors}`,
        `${z.subtotal.totalAttendance}`,
        `${z.subtotal.childrenCount}`,
        `${z.subtotal.cadetsCount}`,
        `${z.subtotal.cupbearersCount}`,
        `${z.subtotal.candlelightersCount}`,
        `${z.subtotal.teachersCount}`,
        `${z.subtotal.bibleClubChildren}`,
        `${z.subtotal.bibleClubTeachers}`,
        `${z.subtotal.salvations}`,
        `${z.subtotal.holyGhostBaptisms}`,
        `${z.subtotal.healings}`,
        `"-"`,
        `"-"`
      ]);
    });

    // Grand Totals row
    rows.push([
      `"[DISTRICT GRAND TOTALS]"`,
      `"All ${collation.totalChurchesCount} Churches"`,
      `"-"`,
      `${collation.grandTotals.sundaySchool}`,
      `${collation.grandTotals.worshipAttendance}`,
      `${collation.grandTotals.bibleStudy}`,
      `${collation.grandTotals.prayerMeeting}`,
      `${collation.grandTotals.visitors}`,
      `${collation.grandTotals.totalAttendance}`,
      `${collation.grandTotals.childrenCount}`,
      `${collation.grandTotals.cadetsCount}`,
      `${collation.grandTotals.cupbearersCount}`,
      `${collation.grandTotals.candlelightersCount}`,
      `${collation.grandTotals.teachersCount}`,
      `${collation.grandTotals.bibleClubChildren}`,
      `${collation.grandTotals.bibleClubTeachers}`,
      `${collation.grandTotals.salvations}`,
      `${collation.grandTotals.holyGhostBaptisms}`,
      `${collation.grandTotals.healings}`,
      `"-"`,
      `"-"`
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
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col md:flex-row pb-16">
      {/* Mobile Top Bar (Visible only on small screens) */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-black text-amber-300 text-xs">
            TL
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              District Admin Portal
            </div>
            <div className="text-xs font-bold text-white">Taiwo Lawal (Coordinator)</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer"
        >
          <Menu className="w-4 h-4 text-amber-400" />
          <span>{isSidebarOpen ? 'Hide Menu' : 'Admin Menu'}</span>
        </button>
      </div>

      {/* Admin Left Sidebar Navigation */}
      <aside
        className={`${
          isSidebarOpen ? 'block' : 'hidden'
        } md:block w-full md:w-72 lg:w-80 shrink-0 bg-slate-900 border-r border-slate-800 text-slate-200 p-5 space-y-6 no-print`}
      >
        {/* District Coordinator Identity Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/90 to-indigo-950/80 border border-indigo-500/30 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center font-black text-amber-400 text-lg shadow-inner shrink-0">
              TL
            </div>
            <div className="min-w-0">
              <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                District Coordinator
              </span>
              <h2 className="text-sm font-black text-white mt-1 truncate">Taiwo Lawal</h2>
              <p className="text-[11px] text-indigo-200/80 font-medium truncate">
                {user?.email_or_phone || 'admin@district.church'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Core Action Center */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Command Actions
          </div>
          <button
            type="button"
            onClick={() => {
              handleOpenEnterReportModal();
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Enter Church Report</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreateRepModal(true);
              setCreateRepSuccess(null);
              setCreateRepError(null);
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create Rep Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowManageModal(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Manage Names & Zones</span>
          </button>
        </div>

        {/* Section 2: Collation Timeframe & Scope */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
            <span>Collation Period</span>
            <button
              type="button"
              onClick={fetchCollation}
              disabled={loading}
              className="p-1 rounded text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
              title="Refresh Collation Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Month:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Year:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Sunday Scope:
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Full Month Collation</option>
                <option value="1">1st Sunday Only</option>
                <option value="2">2nd Sunday Only</option>
                <option value="3">3rd Sunday Only</option>
                <option value="4">4th Sunday Only</option>
                <option value="5">5th Sunday Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Calculation Engine Mode */}
        <div className="space-y-2 pt-4 border-t border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Calculation Engine
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setAggregationMode('average')}
              className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                aggregationMode === 'average'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Average
            </button>
            <button
              type="button"
              onClick={() => setAggregationMode('cumulative')}
              className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                aggregationMode === 'cumulative'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cumulative
            </button>
          </div>
          <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
            {aggregationMode === 'average'
              ? 'Averages weekly workforce to prevent recurring member multiplication.'
              : 'Directly sums all attendance counts across submitted weeks.'}
          </p>
        </div>

        {/* Section 4: Export & Print */}
        <div className="space-y-2 pt-4 border-t border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Reports & Output
          </div>
          <button
            type="button"
            onClick={exportToCSV}
            disabled={!collation || loading}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV Spreadsheet</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Print / PDF Document</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Identifiable Admin Command Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  DISTRICT ADMIN PORTAL
                </span>
                <span className="text-xs text-indigo-300 font-semibold hidden sm:inline">
                  Foursquare Idimu Missionary District
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-1">
                Central Collation & Ministry Analytics
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Coordinating Officer: <strong className="text-amber-300">Sister Taiwo Lawal</strong> • {collation?.totalChurchesCount || 8} Assemblies in District
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs">
              <div className="text-[10px] uppercase font-bold text-indigo-300">Active Scope</div>
              <div className="font-extrabold text-white">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear} • {selectedWeek === 'all' ? 'All Weeks' : `Week ${selectedWeek}`}
              </div>
            </div>
            <button
              onClick={handleWhatsAppBroadcast}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/30 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Broadcast Reminder</span>
            </button>
          </div>
        </div>
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
                <strong>Average Headcount:</strong> Demographic group counts (Children, Cadets, Cupbearers, Candlelighters, Teachers) represent weekly averages across submitted Sundays so that recurring church membership is not artificially inflated by 4x. Service attendees and visitors are displayed as true monthly aggregates.
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
              <div className="mt-1 text-[11px] font-medium text-slate-500">
                Active Teachers
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
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEnterReportModal(ch.churchId, ch.churchName, zone.zoneName)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                    title={`Enter report for ${ch.churchName}`}
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                    <span>Enter</span>
                                  </button>
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
                  <th className="py-3 px-3 text-right">Worship Attd</th>
                  <th className="py-3 px-3 text-right">Bible Study</th>
                  <th className="py-3 px-3 text-right">Prayer Mtg</th>
                  <th className="py-3 px-3 text-right">Visitors</th>
                  <th className="py-3 px-3 text-right font-black text-indigo-700">Total Attd</th>
                  <th className="py-3 px-3 text-right">Children</th>
                  <th className="py-3 px-3 text-right">Cadets</th>
                  <th className="py-3 px-3 text-right">Cupbearers</th>
                  <th className="py-3 px-3 text-right">Candlelighters</th>
                  <th className="py-3 px-3 text-right font-bold text-emerald-800">Teachers</th>
                  <th className="py-3 px-3 text-right" title="Bible Club (Children)">BC (Ch)</th>
                  <th className="py-3 px-3 text-right" title="Bible Club (Teachers)">BC (Tr)</th>
                  <th className="py-3 px-3 text-right">Salvations</th>
                  <th className="py-3 px-3 text-right">HG Baptisms</th>
                  <th className="py-3 px-3 text-right">Healings</th>
                  <th className="py-3 px-3 text-center">Programmes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={19} className="py-12 text-center text-slate-400 font-medium">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                      Loading collation records...
                    </td>
                  </tr>
                ) : filteredZones.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="py-12 text-center text-slate-400 font-medium">
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
                          <td colSpan={18} className="py-3 px-3 text-[11px] font-semibold text-indigo-800 text-right pr-4">
                            Click to {isExpanded ? 'collapse' : 'expand'}
                          </td>
                        </tr>

                        {/* Church Rows */}
                        {isExpanded &&
                          zone.churches.map((church) => {
                            const hasProgrammes =
                              (church.specialProgrammes && church.specialProgrammes.filter(Boolean).length > 0) ||
                              (church.forthcomingProgrammes && church.forthcomingProgrammes.filter(Boolean).length > 0);

                            return (
                              <tr key={church.churchId} className="hover:bg-slate-50/90 transition-colors">
                                <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-slate-50/90 z-10 pl-9 font-medium text-slate-900 border-r border-slate-100">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="font-semibold text-slate-900">{church.churchName}</div>
                                      {church.lastSubmittedBy && (
                                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-[200px]">
                                          By: {church.lastSubmittedBy} {church.lastUpdatedAt && `• ${new Date(church.lastUpdatedAt).toLocaleDateString()}`}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEnterReportModal(church.churchId, church.churchName, zone.zoneName)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer shrink-0"
                                      title={`Enter or edit report for ${church.churchName}`}
                                    >
                                      <Edit3 className="w-3 h-3 text-emerald-600" />
                                      <span>Data</span>
                                    </button>
                                  </div>
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
                                <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.worshipAttendance}</td>
                                <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.bibleStudy}</td>
                                <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.prayerMeeting}</td>
                                <td className="py-2.5 px-3 text-right text-amber-700 font-medium">{church.metrics.visitors}</td>
                                <td className="py-2.5 px-3 text-right font-black text-indigo-700 bg-indigo-50/30">
                                  {church.metrics.totalAttendance}
                                </td>
                                <td className="py-2.5 px-3 text-right text-purple-700 font-medium">{church.metrics.childrenCount}</td>
                                <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.cadetsCount}</td>
                                <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.cupbearersCount}</td>
                                <td className="py-2.5 px-3 text-right text-slate-700">{church.metrics.candlelightersCount}</td>
                                <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">{church.metrics.teachersCount}</td>
                                <td className="py-2.5 px-3 text-right text-teal-700 font-medium">{church.metrics.bibleClubChildren}</td>
                                <td className="py-2.5 px-3 text-right text-teal-700 font-medium">{church.metrics.bibleClubTeachers}</td>
                                <td className="py-2.5 px-3 text-right text-rose-700 font-medium">{church.metrics.salvations}</td>
                                <td className="py-2.5 px-3 text-right text-rose-700 font-medium">{church.metrics.holyGhostBaptisms}</td>
                                <td className="py-2.5 px-3 text-right text-rose-700 font-medium">{church.metrics.healings}</td>
                                <td className="py-2.5 px-3 text-center">
                                  {hasProgrammes ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedChurchProgrammes(church)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                                      title="View Special & Forthcoming Programmes"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-600" />
                                      <span>Notes</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                        {/* Zone Subtotal Row */}
                        <tr className="bg-slate-100/90 font-bold text-slate-900 border-b border-slate-300">
                          <td className="py-2.5 px-4 sticky left-0 bg-slate-100/90 z-10 pl-6 text-xs font-black text-slate-800">
                            Subtotal: {zone.zoneName}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.sundaySchool}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.worshipAttendance}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.bibleStudy}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.prayerMeeting}</td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-800">{zone.subtotal.visitors}</td>
                          <td className="py-2.5 px-3 text-right font-black text-indigo-800 bg-indigo-100/40">
                            {zone.subtotal.totalAttendance}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-purple-800">{zone.subtotal.childrenCount}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.cadetsCount}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.cupbearersCount}</td>
                          <td className="py-2.5 px-3 text-right font-black">{zone.subtotal.candlelightersCount}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-800">{zone.subtotal.teachersCount}</td>
                          <td className="py-2.5 px-3 text-right font-black text-teal-800">{zone.subtotal.bibleClubChildren}</td>
                          <td className="py-2.5 px-3 text-right font-black text-teal-800">{zone.subtotal.bibleClubTeachers}</td>
                          <td className="py-2.5 px-3 text-right font-black text-rose-800">{zone.subtotal.salvations}</td>
                          <td className="py-2.5 px-3 text-right font-black text-rose-800">{zone.subtotal.holyGhostBaptisms}</td>
                          <td className="py-2.5 px-3 text-right font-black text-rose-800">{zone.subtotal.healings}</td>
                          <td className="py-2.5 px-3 text-center text-slate-400">-</td>
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
                    <td className="py-3 px-3 text-right text-emerald-300">{collation.grandTotals.worshipAttendance.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-emerald-300">{collation.grandTotals.bibleStudy.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-emerald-300">{collation.grandTotals.prayerMeeting.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-amber-300">{collation.grandTotals.visitors.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-indigo-300 font-extrabold bg-slate-800">
                      {collation.grandTotals.totalAttendance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-purple-300">{collation.grandTotals.childrenCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{collation.grandTotals.cadetsCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{collation.grandTotals.cupbearersCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{collation.grandTotals.candlelightersCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-emerald-300">{collation.grandTotals.teachersCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-teal-300">{collation.grandTotals.bibleClubChildren.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-teal-300">{collation.grandTotals.bibleClubTeachers.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-rose-300">{collation.grandTotals.salvations.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-rose-300">{collation.grandTotals.holyGhostBaptisms.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-rose-300">{collation.grandTotals.healings.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center text-slate-400">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Foursquare Idimu Missionary District • Children's Ministry Collation Portal</span>
            <span>All figures update automatically upon rep submission.</span>
          </div>
        </div>
      </main>

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
      {/* Special & Forthcoming Programmes Modal */}
      {selectedChurchProgrammes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedChurchProgrammes.churchName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Programmes & Notes • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChurchProgrammes(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Special Programme(s)
                </h4>
                {selectedChurchProgrammes.specialProgrammes && selectedChurchProgrammes.specialProgrammes.filter(Boolean).length > 0 ? (
                  <div className="space-y-2">
                    {selectedChurchProgrammes.specialProgrammes.filter(Boolean).map((prog, idx) => (
                      <div key={idx} className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-950 whitespace-pre-wrap">
                        {prog}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">None reported for this period.</p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Forthcoming Programme(s)
                </h4>
                {selectedChurchProgrammes.forthcomingProgrammes && selectedChurchProgrammes.forthcomingProgrammes.filter(Boolean).length > 0 ? (
                  <div className="space-y-2">
                    {selectedChurchProgrammes.forthcomingProgrammes.filter(Boolean).map((prog, idx) => (
                      <div key={idx} className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 whitespace-pre-wrap">
                        {prog}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">None reported for this period.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedChurchProgrammes(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Church Rep Profile Modal */}
      {showCreateRepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-700">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Create Church Rep Profile
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Set up credentials for a local church teacher or coordinator.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateRepModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRep} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {createRepError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{createRepError}</span>
                </div>
              )}

              {createRepSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2.5">
                  <div className="font-bold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Representative Account Created Successfully!</span>
                  </div>
                  <div className="p-3 bg-white/80 rounded-xl border border-emerald-100 text-slate-700 space-y-1">
                    <div><strong>Name:</strong> {createRepSuccess.user.full_name}</div>
                    <div><strong>Church:</strong> {createRepSuccess.user.church_name} ({createRepSuccess.user.zone_name})</div>
                    <div><strong>Login Email/Phone:</strong> <span className="font-mono text-indigo-700 font-bold">{createRepSuccess.user.email_or_phone}</span></div>
                    <div><strong>Password:</strong> <span className="font-mono text-emerald-700 font-bold">{createRepSuccess.password}</span></div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const text = `Calvary greetings! Here are your login credentials for the Foursquare Idimu Children's Ministry Report Portal:\n\n👤 Church: ${createRepSuccess.user.church_name} (${createRepSuccess.user.zone_name})\n🔑 Username: ${createRepSuccess.user.email_or_phone}\n🔒 Password: ${createRepSuccess.password}\n\n🌐 Portal Link: https://children-church-report.vercel.app`;
                        navigator.clipboard.writeText(text);
                        setCopiedLoginDetails(true);
                        setTimeout(() => setCopiedLoginDetails(false), 2500);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                    >
                      {copiedLoginDetails ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLoginDetails ? 'Copied to Clipboard!' : 'Copy Login Details'}</span>
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Calvary greetings! Here are your login credentials for the Foursquare Idimu Children's Ministry Report Portal:\n\n👤 Church: ${createRepSuccess.user.church_name} (${createRepSuccess.user.zone_name})\n🔑 Username: ${createRepSuccess.user.email_or_phone}\n🔒 Password: ${createRepSuccess.password}\n\n🌐 Portal Link: https://children-church-report.vercel.app`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send on WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Representative Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sister Faith Adeyemi"
                  value={createRepForm.fullName}
                  onChange={(e) => setCreateRepForm({ ...createRepForm, fullName: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email or Phone Number * (Used for Login)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 08012345678 or faith@church.org"
                  value={createRepForm.emailOrPhone}
                  onChange={(e) => setCreateRepForm({ ...createRepForm, emailOrPhone: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Assigned Church *
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateRepForm({ ...createRepForm, isCustomChurch: !createRepForm.isCustomChurch })}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {createRepForm.isCustomChurch ? '← Select Existing Church' : '+ Enter New Zone & Church'}
                  </button>
                </div>

                {!createRepForm.isCustomChurch ? (
                  <select
                    value={createRepForm.churchId}
                    onChange={(e) => setCreateRepForm({ ...createRepForm, churchId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Choose Church Assembly --</option>
                    {zonesList.map((z) => (
                      <optgroup key={z.id} label={`${z.name} Zone`}>
                        {(z.churches || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({z.name} Zone)
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Zone Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Idimu"
                        value={createRepForm.customZone}
                        onChange={(e) => setCreateRepForm({ ...createRepForm, customZone: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Church Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Grace Sanctuary"
                        value={createRepForm.customChurch}
                        onChange={(e) => setCreateRepForm({ ...createRepForm, customChurch: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Login Password
                </label>
                <input
                  type="text"
                  value={createRepForm.password}
                  onChange={(e) => setCreateRepForm({ ...createRepForm, password: e.target.value })}
                  placeholder="reppassword123"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Default is reppassword123. The rep can change this after logging in.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRepModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={createRepLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{createRepLoading ? 'Creating...' : 'Create Representative Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter / Edit Church Sunday Report Modal */}
      {showEnterReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Enter Church Sunday Report
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Submit or update attendance and spiritual figures on behalf of a local assembly.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEnterReportModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {adminReportError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{adminReportError}</span>
                </div>
              )}

              {adminReportSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adminReportSuccess}</span>
                </div>
              )}

              {/* Church Selector & Period Header */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Select Church Assembly
                    </label>
                    <select
                      value={targetChurchForReport?.id || ''}
                      onChange={(e) => handleChangeTargetChurch(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {zonesList.map((z) => (
                        <optgroup key={z.id} label={`${z.name} Zone`}>
                          {(z.churches || []).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({z.name} Zone)
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Report Period
                    </label>
                    <div className="text-xs font-bold text-slate-800 px-3 py-2 bg-white border border-slate-300 rounded-xl">
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </div>
                  </div>
                </div>

                {/* Sunday Week Selector Tabs */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Select Sunday Week
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((w) => {
                      const isSaved = adminChurchWeeksMap[w];
                      const isSelected = adminReportWeek === w;

                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => handleChangeReportWeek(w)}
                          className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : isSaved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>Week {w}</div>
                          <div className={`text-[10px] font-normal ${isSelected ? 'text-emerald-100' : isSaved ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {isSaved ? '✓ Saved' : 'Empty'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {adminReportLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  Loading church figures...
                </div>
              ) : (
                <form onSubmit={handleSaveAdminChurchReport} className="space-y-4">
                  {/* Category 1: Service Attendance */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        1. Service Attendance & Visitors
                      </h4>
                      <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Total: {adminReportData.sundaySchool + adminReportData.worshipAttendance + adminReportData.bibleStudy + adminReportData.prayerMeeting + adminReportData.visitors}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Sunday School
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.sundaySchool}
                          onChange={(e) => setAdminReportData({ ...adminReportData, sundaySchool: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Worship Attendance
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.worshipAttendance}
                          onChange={(e) => setAdminReportData({ ...adminReportData, worshipAttendance: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Bible Study
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.bibleStudy}
                          onChange={(e) => setAdminReportData({ ...adminReportData, bibleStudy: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Prayer Meeting
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.prayerMeeting}
                          onChange={(e) => setAdminReportData({ ...adminReportData, prayerMeeting: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          First-time Visitors
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.visitors}
                          onChange={(e) => setAdminReportData({ ...adminReportData, visitors: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Demographics & Workforce */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b pb-2">
                      2. Demographics & Workforce
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Total Children Present
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.childrenCount}
                          onChange={(e) => setAdminReportData({ ...adminReportData, childrenCount: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-purple-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Cadets
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.cadetsCount}
                          onChange={(e) => setAdminReportData({ ...adminReportData, cadetsCount: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Cupbearers
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.cupbearersCount}
                          onChange={(e) => setAdminReportData({ ...adminReportData, cupbearersCount: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Candlelighters
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.candlelightersCount}
                          onChange={(e) => setAdminReportData({ ...adminReportData, candlelightersCount: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Teachers Present
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.teachersCount}
                          onChange={(e) => setAdminReportData({ ...adminReportData, teachersCount: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-emerald-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 3: Bible Club Attendance */}
                  <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/30 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-900 border-b border-teal-200 pb-2">
                      3. Bible Club Attendance
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-teal-900 mb-1">
                          Bible Club (Children)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.bibleClubChildren}
                          onChange={(e) => setAdminReportData({ ...adminReportData, bibleClubChildren: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-teal-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-teal-900 mb-1">
                          Bible Club (Teachers)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.bibleClubTeachers}
                          onChange={(e) => setAdminReportData({ ...adminReportData, bibleClubTeachers: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-teal-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 4: Spiritual Report */}
                  <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900 border-b border-rose-200 pb-2">
                      4. Spiritual Harvest
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-rose-900 mb-1">
                          Salvations
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.salvations}
                          onChange={(e) => setAdminReportData({ ...adminReportData, salvations: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-rose-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-rose-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-rose-900 mb-1">
                          HG Baptisms
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.holyGhostBaptisms}
                          onChange={(e) => setAdminReportData({ ...adminReportData, holyGhostBaptisms: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-rose-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-rose-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-rose-900 mb-1">
                          Divine Healings
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adminReportData.healings}
                          onChange={(e) => setAdminReportData({ ...adminReportData, healings: parseInt(e.target.value, 10) || 0 })}
                          className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-rose-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-rose-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 5: Special & Forthcoming Programmes */}
                  <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 border-b border-amber-200 pb-2">
                      5. Special & Forthcoming Programmes
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                          Special Programme(s) Held
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Children's Day Rally, Easter Bible Recitation..."
                          value={adminReportData.specialProgramme}
                          onChange={(e) => setAdminReportData({ ...adminReportData, specialProgramme: e.target.value })}
                          className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                          Forthcoming Programme(s)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Next month Camp meeting, Choir rehearsal..."
                          value={adminReportData.forthcomingProgramme}
                          onChange={(e) => setAdminReportData({ ...adminReportData, forthcomingProgramme: e.target.value })}
                          className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEnterReportModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={adminReportSaving}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{adminReportSaving ? 'Saving...' : `Save Week ${adminReportWeek} Report`}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
