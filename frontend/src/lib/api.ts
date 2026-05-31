/**
 * Cliente HTTP único para hablar con el backend Go.
 * Se encarga de:
 *   - Inyectar el token JWT en cada request
 *   - Redirigir a /login si el token expira (401)
 *   - Mostrar mensajes de error consistentes
 */
import axios, { AxiosError } from 'axios';

export const apiBaseURL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Inyectar token automáticamente
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('admiral-auth');
    if (stored) {
      try {
        const { state } = JSON.parse(stored);
        if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
      } catch {
        /* ignore */
      }
    }
  }
  return config;
});

// Manejo global de 401
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (typeof window !== 'undefined' && err.response?.status === 401) {
      localStorage.removeItem('admiral-auth');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

// Helper: mensaje legible de un error de axios
export function apiError(e: unknown): string {
  const err = e as AxiosError<{ message?: string; error?: string }>;
  return err?.response?.data?.message ?? err?.message ?? 'Error desconocido';
}

// ─── APIs tipadas por dominio ──────────────────────────────

const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || 'admiral';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { tenantSlug, email, password }),
  loginPin: (userId: string, pin: string) =>
    api.post('/auth/pin', { tenantSlug, userId, pin }),
  me: () => api.get('/auth/me'),
  listUsers: () => api.get(`/auth/users/${tenantSlug}`),
};

export const branchApi = {
  list: () => api.get('/branches/'),
  current: () => api.get('/branches/current'),
};

export const menuApi = {
  categories: () => api.get('/menu/categories'),
  products: (params?: { category?: string; branchId?: string }) =>
    api.get('/menu/products', { params }),
};

export const posApi = {
  listOpen: (branchId: string) => api.get('/pos/sales', { params: { branchId } }),
  get: (id: string) => api.get(`/pos/sales/${id}`),
  open: (data: any) => api.post('/pos/sales', data),
  addItems: (id: string, data: any) => api.post(`/pos/sales/${id}/items`, data),
  close: (id: string, data: any) => api.post(`/pos/sales/${id}/close`, data),
  cancel: (id: string, reason?: string) =>
    api.post(`/pos/sales/${id}/cancel`, { reason }),
};

export const promoApi = {
  active: () => api.get('/promotions/active'),
  calculate: (lines: any[], customerId?: string) =>
    api.post('/promotions/calculate', { lines, customerId }),
  validateCoupon: (code: string, amount: number) =>
    api.get('/promotions/coupons/validate', { params: { code, amount } }),
};

export const adminApi = {
  products: {
    list: (params: any) => api.get('/admin/products/', { params }),
    create: (data: any) => api.post('/admin/products/', data),
    update: (id: string, data: any) => api.put(`/admin/products/${id}`, data),
    toggle: (id: string) => api.put(`/admin/products/${id}/toggle`),
    delete: (id: string) => api.delete(`/admin/products/${id}`),
  },
  categories: {
    list: () => api.get('/admin/categories/'),
    create: (data: any) => api.post('/admin/categories/', data),
    update: (id: string, data: any) => api.put(`/admin/categories/${id}`, data),
    delete: (id: string) => api.delete(`/admin/categories/${id}`),
  },
  inventory: {
    stock: (branchId?: string) => api.get('/admin/inventory/stock', { params: { branchId } }),
    lowStock: (branchId?: string) => api.get('/admin/inventory/low-stock', { params: { branchId } }),
    value: (branchId?: string) => api.get('/admin/inventory/value', { params: { branchId } }),
    movement: (data: any) => api.post('/admin/inventory/movements', data),
    physicalCount: (data: any) => api.post('/admin/inventory/physical-count', data),
  },
  users: {
    list: () => api.get('/admin/users/'),
    create: (data: any) => api.post('/admin/users/', data),
    update: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
    resetPin: (id: string, pin: string) => api.put(`/admin/users/${id}/reset-pin`, { pin }),
    deactivate: (id: string) => api.delete(`/admin/users/${id}`),
  },
  import: {
    products: (file: File, branchId: string) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/admin/import/products', fd, {
        params: { branchId },
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    templateURL: `${apiBaseURL}/admin/import/template`,
  },
};

export const crmApi = {
  list: (params?: any) => api.get('/crm/customers', { params }),
  get: (id: string) => api.get(`/crm/customers/${id}`),
  upsert: (data: any) => api.post('/crm/customers', data),
  consent: (id: string, data: any) => api.put(`/crm/customers/${id}/consent`, data),
};

export const reportsApi = {
  dailyClose: (branchId: string, date?: string) =>
    api.get('/reports/daily-close', { params: { branchId, date } }),
  exportDailyClose: (branchId: string, date?: string) =>
    `${apiBaseURL}/reports/daily-close/export?branchId=${branchId}${date ? `&date=${date}` : ''}`,
};

export const qrApi = {
  list: (branchId: string) => api.get('/qr/codes', { params: { branchId } }),
  generate: (branchId: string, tableId: string) =>
    api.post('/qr/codes', { branchId, tableId }),
  generateAll: (branchId: string) => api.post('/qr/codes/generate-all', { branchId }),
  // públicos
  resolve: (token: string) => api.get(`/qr/resolve/${token}`),
  menu: (token: string) => api.get(`/qr/menu/${token}`),
  callWaiter: (token: string) => api.post(`/qr/call-waiter/${token}`),
  // Cuenta Dividida
  getSplit: (token: string) => api.get(`/qr/split/${token}`),
  initiateSplit: (token: string, shares: any[]) => api.post(`/qr/split/${token}`, { shares }),
  payShare: (token: string, shareId: string, method: string, reference?: string) =>
    api.post(`/qr/split/${token}/pay/${shareId}`, { method, reference }),
};

export const attendanceApi = {
  clock: (formData: FormData) =>
    api.post('/auth/attendance/clock', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  history: () => api.get('/auth/attendance/history'),
};
