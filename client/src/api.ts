import type { CollationResponse, User, WeeklyReport, Zone } from './types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('church_report_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: Please make sure the church reports server is running.`);
    }
    throw new Error('Received unexpected non-JSON response from server.');
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

// Auth API
export const authApi = {
  login: (emailOrPhone: string, password: string) =>
    apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password })
    }),

  register: (payload: {
    fullName: string;
    emailOrPhone: string;
    password: string;
    role: 'church_rep' | 'district_admin';
    zoneName?: string;
    churchName?: string;
    adminInviteCode?: string;
  }) =>
    apiRequest<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMe: () => apiRequest<{ user: User }>('/auth/me'),

  updateProfile: (payload: { fullName?: string; zoneName?: string; churchName?: string }) =>
    apiRequest<{ user: User; token: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
};

// Metadata API
export const metadataApi = {
  getZones: () => apiRequest<{ zones: Zone[] }>('/metadata/zones'),
  
  renameZone: (id: string, name: string) =>
    apiRequest<{ message: string }>(`/metadata/admin/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    }),

  updateChurch: (id: string, name: string, zoneId?: string) =>
    apiRequest<{ message: string }>(`/metadata/admin/churches/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, zoneId })
    }),

  deleteChurch: (id: string) =>
    apiRequest<{ message: string }>(`/metadata/admin/churches/${id}`, {
      method: 'DELETE'
    })
};

// Reports API
export const reportsApi = {
  getChurchReports: (churchId: string, year: number, month: number) =>
    apiRequest<{
      church: { id: string; name: string; zone_name: string };
      year: number;
      month: number;
      weeks: { [key: number]: WeeklyReport | null };
    }>(`/reports/church/${churchId}?year=${year}&month=${month}`),

  submitReport: (payload: {
    churchId?: string;
    year: number;
    month: number;
    weekNumber: number;
    sundaySchool: number;
    bibleStudy: number;
    prayerMeeting: number;
    visitors: number;
    childrenCount: number;
    cadetsCount: number;
    torchbearersCount: number;
    candlelightersCount: number;
    teachersCount: number;
    salvations: number;
    holyGhostBaptisms: number;
    healings: number;
  }) =>
    apiRequest<{ message: string; report: WeeklyReport }>('/reports/submit', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getDistrictCollation: (params: {
    year: number;
    month: number;
    week?: string;
    aggregationMode?: 'average' | 'cumulative';
  }) => {
    const qs = new URLSearchParams({
      year: params.year.toString(),
      month: params.month.toString(),
      week: params.week || 'all',
      aggregationMode: params.aggregationMode || 'average'
    });
    return apiRequest<CollationResponse>(`/reports/district/collation?${qs.toString()}`);
  }
};
