const BASE_URL = import.meta.env.VITE_API_BASE_URL;
import { sanitizeUUIDs, validateUUIDFields } from './uuid-utils';

// Check if API base URL is configured
if (!BASE_URL && process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️ VITE_API_BASE_URL is not set. API calls will fail.\n' +
    'If you have a backend API, add it to your .env file:\n' +
    'VITE_API_BASE_URL=http://localhost:8000'
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new Error('API base URL is not configured. Please set VITE_API_BASE_URL in your .env file.');
  }
  
  // Validate and sanitize body if it contains UUIDs
  let finalInit = init;
  if (init?.body && typeof init.body === 'string') {
    try {
      const parsedBody = JSON.parse(init.body);
      const validation = validateUUIDFields(parsedBody);
      if (!validation.valid) {
        throw new Error(`Invalid UUID format: ${validation.errors.join(', ')}`);
      }
      const sanitized = sanitizeUUIDs(parsedBody);
      finalInit = {
        ...init,
        body: JSON.stringify(sanitized),
      };
    } catch (e) {
      // If parsing fails, just use original init
      finalInit = init;
    }
  }
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(finalInit?.headers || {}) },
      ...finalInit,
    });
    
    // Handle JWT expiration (401 Unauthorized)
    if (res.status === 401) {
      const errorText = await res.text();
      if (errorText.includes('jwt') || errorText.includes('expired') || errorText.includes('unauthorized')) {
        // Clear session and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('supabase.auth.token');
          window.location.href = '/auth';
        }
        throw new Error('Your session has expired. Please log in again.');
      }
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API request failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    return res.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to API at ${BASE_URL}. Make sure the backend server is running.`);
    }
    throw error;
  }
}

export const api = {
  // System
  health: () => request<{ status: string; timestamp: string }>("/health"),

  // Templates
  getTemplates: () => request<{ templates: Record<string, unknown> }>("/api/templates"),

  // Teachers
  getTeachers: (schoolId: string) => request<{ teachers: any[] }>(`/api/teachers?school_id=${schoolId}`),
  createTeacher: (schoolId: string, body: any) =>
    request(`/api/teachers?school_id=${schoolId}`, { method: "POST", body: JSON.stringify(body) }),

  // Classes
  getClasses: (schoolId: string) => request<{ classes: any[] }>(`/api/classes?school_id=${schoolId}`),
  createClass: (schoolId: string, body: any) =>
    request(`/api/classes?school_id=${schoolId}`, { method: "POST", body: JSON.stringify(body) }),

  // Timetables
  listTimetables: (schoolId: string, limit = 10) =>
    request<{ timetables: any[] }>(`/api/timetables?school_id=${schoolId}&limit=${limit}`),
  getTimetable: (timetableId: string) => request<any>(`/api/timetables/${timetableId}`),
  exportTimetable: (timetableId: string, format: "json" | "csv" = "json") =>
    request<any>(`/api/timetables/${timetableId}/export?format=${format}`),
  generateTimetable: (schoolId: string, body: any) =>
    request(`/api/schools/${schoolId}/timetables/generate`, { method: "POST", body: JSON.stringify(body) }),

  // Past timetable upload (multipart)
  uploadPast: (schoolId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE_URL}/api/timetables/upload-past?school_id=${schoolId}`, {
      method: "POST",
      body: form,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });
  },

  // Auth (optional for now)
  signup: (body: { email: string; password: string; school_name: string; school_type: string }) =>
    request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (email: string, password: string) =>
    request(`/api/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, { method: "POST" }),

  // Analytics
  analytics: (schoolId: string) => request(`/api/schools/${schoolId}/analytics`),
};


