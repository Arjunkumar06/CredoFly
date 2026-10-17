import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const api = axios.create({
  baseURL: apiBase ? `${apiBase}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // 1. If caller explicitly passed Authorization header (e.g. admin verify), keep it
  const existingAuth =
    config.headers?.Authorization ||
    (config.headers as any)?.get?.('Authorization') ||
    (config.headers as any)?.['authorization'];

  if (existingAuth) {
    return config;
  }

  // 2. If requesting admin routes, use stored admin Basic auth
  if (config.url?.startsWith('/admin')) {
    const adminAuth = sessionStorage.getItem('credofly_admin_auth');
    if (adminAuth) {
      config.headers.Authorization = `Basic ${adminAuth}`;
    }
    return config;
  }

  // 3. Otherwise, use customer JWT token if present
  const token = localStorage.getItem('credofly_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Centralized API calls
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  google: (data: { credential?: string; token?: string; email?: string; name?: string }) =>
    api.post('/auth/google', data),
  recoverCustomerId: (data: { identifier: string }) =>
    api.post('/auth/recover-customer-id', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const flightApi = {
  search: (params: {
    origin: string;
    destination: string;
    travelDate: string;
    adults: number;
    children: number;
    tripType?: string;
    returnDate?: string;
  }) => api.get('/flights/search', { params }),
  getCities: () => api.get('/flights/cities'),
  getInstanceById: (id: string, params?: { adults?: number; children?: number }) =>
    api.get(`/flights/instance/${id}`, { params }),
  getSeatMap: (instanceId: string) => api.get(`/flights/instance/${instanceId}/seats`),
  getLowFareCalendar: (origin: string, destination: string, startDate?: string, days?: number) =>
    api.get('/flights/low-fare-calendar', { params: { origin, destination, startDate, days } }),
  getById: (id: string) => api.get(`/flights/${id}`),
};

export const bookingApi = {
  preview: (data: {
    flightInstanceId: string;
    adultCount: number;
    childCount: number;
    cabinClass?: string;
  }) => api.post('/bookings/preview', data),
  create: (data: {
    flightInstanceId: string;
    returnFlightInstanceId?: string;
    adultCount: number;
    childCount: number;
    cabinClass?: string;
    contactEmail?: string;
    contactPhone?: string;
    paymentMethod?: string;
    passengers: Array<{
      name: string;
      type: 'ADULT' | 'CHILD';
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      age?: number;
      seatNumber?: string;
      seatPrice?: number;
    }>;
    returnPassengers?: Array<{
      name: string;
      type: 'ADULT' | 'CHILD';
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      age?: number;
      seatNumber?: string;
      seatPrice?: number;
    }>;
  }) => api.post('/bookings', data),
  getMyBookings: () => api.get('/bookings/me'),
  getById: (id: string) => api.get(`/bookings/${id}`),
  getCancellationQuote: (id: string) => api.get(`/bookings/${id}/cancellation-quote`),
  cancel: (id: string) => api.post(`/bookings/${id}/cancel`),
  partialCancel: (
    id: string,
    data: { cancelAdults: number; cancelChildren: number }
  ) => api.post(`/bookings/${id}/partial-cancel`, data),
  submitFeedback: (id: string, data: { rating: number; comment?: string }) =>
    api.post(`/bookings/${id}/feedback`, data),
};

export const paymentApi = {
  getConfig: () => api.get('/payment/config'),
  submitUtr: (data: { bookingId: string; transactionRef: string; paymentMethod?: string }) =>
    api.post('/payment/submit-utr', data),
  getStatus: (bookingId: string) => api.get(`/payment/status/${bookingId}`),
};

export const adminApi = {
  verify: (authHeader?: string) =>
    api.get('/admin/verify', {
      headers: authHeader ? { Authorization: `Basic ${authHeader}` } : {},
    }),
  getDashboard: (params?: { date?: string }) => api.get('/admin/dashboard', { params }),
  getFlights: () => api.get('/admin/flights'),
  createFlight: (data: any) => api.post('/admin/flights', data),
  updateFlight: (id: string, data: any) => api.patch(`/admin/flights/${id}`, data),
  deleteFlight: (id: string) => api.delete(`/admin/flights/${id}`),
  getBookings: (params?: {
    route?: string;
    travelDate?: string;
    departureTime?: string;
    page?: number;
    limit?: number;
  }) => api.get('/admin/bookings', { params }),
  getBookingDetails: (id: string) => api.get(`/admin/bookings/${id}`),
  cancelBooking: (id: string) => api.post(`/admin/bookings/${id}/cancel`),
  // Extended operations
  generateSchedules: (days?: number) => api.post('/admin/schedules/generate', { days }),
  getCalendarOverview: (params: { year: number; month: number }) =>
    api.get('/admin/calendar/overview', { params }),
  getCalendarDateDetails: (params: { date: string }) =>
    api.get('/admin/calendar/date-details', { params }),
  getScheduleInstances: (params?: { startDate?: string; endDate?: string; flightId?: string }) =>
    api.get('/admin/schedule/instances', { params }),
  updateSingleFlightInstance: (id: string, data: any) =>
    api.patch(`/admin/schedule/instances/${id}`, data),
  getPayments: (params?: { status?: string }) => api.get('/admin/payments', { params }),
  verifyPayment: (id: string, data: { status: 'VERIFIED' | 'REJECTED'; adminNotes?: string }) =>
    api.post(`/admin/payments/${id}/verify`, data),
  updatePaymentConfig: (data: any) => api.patch('/admin/payments/config', data),
  getHolidays: () => api.get('/admin/pricing/holidays'),
  createHoliday: (data: any) => api.post('/admin/pricing/holidays', data),
  deleteHoliday: (id: string) => api.delete(`/admin/pricing/holidays/${id}`),
  getPricingRules: () => api.get('/admin/pricing/rules'),
  createPricingRule: (data: any) => api.post('/admin/pricing/rules', data),
  updatePricingRule: (id: string, data: any) => api.patch(`/admin/pricing/rules/${id}`, data),
  deletePricingRule: (id: string) => api.delete(`/admin/pricing/rules/${id}`),
};

export default api;
