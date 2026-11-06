export type UserRole = 'church_rep' | 'district_admin';

export interface User {
  id: string;
  full_name: string;
  email_or_phone: string;
  role: UserRole;
  church_id: string | null;
  zone_id: string | null;
  church_name?: string;
  zone_name?: string;
  created_at: string;
}

export interface Church {
  id: string;
  zone_id: string;
  name: string;
  zone_name?: string;
  created_at: string;
}

export interface Zone {
  id: string;
  name: string;
  churches: Church[];
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  church_id: string;
  zone_id: string;
  submitted_by: string;
  report_year: number;
  report_month: number;
  week_number: number;
  sunday_school: number;
  worship_attendance: number;
  bible_study: number;
  prayer_meeting: number;
  visitors: number;
  children_count: number;
  cadets_count: number;
  cupbearers_count: number;
  torchbearers_count?: number;
  candlelighters_count: number;
  teachers_count: number;
  bible_club_teachers: number;
  bible_club_children: number;
  salvations: number;
  holy_ghost_baptisms: number;
  healings: number;
  special_programme?: string;
  forthcoming_programme?: string;
  created_at: string;
  updated_at: string;
}

export interface MetricsSummary {
  weeksCount: number;
  sundaySchool: number;
  worshipAttendance: number;
  bibleStudy: number;
  prayerMeeting: number;
  visitors: number;
  totalAttendance: number;
  childrenCount: number;
  cadetsCount: number;
  cupbearersCount: number;
  torchbearersCount?: number;
  candlelightersCount: number;
  teachersCount: number;
  bibleClubTeachers: number;
  bibleClubChildren: number;
  salvations: number;
  holyGhostBaptisms: number;
  healings: number;
}

export interface ChurchRowCollation {
  churchId: string;
  churchName: string;
  weeks: { [key: number]: WeeklyReport | null };
  metrics: MetricsSummary;
  specialProgrammes?: string[];
  forthcomingProgrammes?: string[];
  lastSubmittedBy?: string | null;
  lastUpdatedAt?: string | null;
}

export interface RepUser {
  id: string;
  full_name: string;
  email_or_phone: string;
  role: UserRole;
  church_id: string | null;
  zone_id: string | null;
  church_name?: string;
  zone_name?: string;
  created_at: string;
}

export interface ZoneCollation {
  zoneId: string;
  zoneName: string;
  churches: ChurchRowCollation[];
  subtotal: MetricsSummary;
}

export interface ComplianceChurchItem {
  churchId: string;
  churchName: string;
  isSubmitted: boolean;
  submittedWeeks: number[];
  submittedCount: number;
}

export interface ComplianceZoneItem {
  zoneId: string;
  zoneName: string;
  totalChurches: number;
  submittedCount: number;
  churches: ComplianceChurchItem[];
}

export interface GrandTotals extends MetricsSummary {
  totalRegisteredChurches: number;
  totalZones: number;
}

export interface CollationResponse {
  year: number;
  month: number;
  weekFilter: string;
  aggregationMode: 'average' | 'cumulative';
  totalChurchesCount: number;
  weeklyCompliance: {
    [key: number]: {
      submittedCount: number;
      percentage: number;
    };
  };
  complianceByZone: ComplianceZoneItem[];
  zones: ZoneCollation[];
  grandTotals: GrandTotals;
}
