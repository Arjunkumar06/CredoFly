import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // If requesting admin routes, prefer admin basic auth token if stored
  if (config.url?.startsWith('/admin')) {
    const adminAuth = sessionStorage.getItem('credofly_admin_auth');
    if (adminAuth) {
      config.headers.Authorization = `Basic ${adminAuth}`;
      return config;
    }
  }

  // Otherwise, use customer JWT token if present
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
  }) => api.get('/flights/search', { params }),
  getCities: () => api.get('/flights/cities'),
  getInstanceById: (id: string, params?: { adults?: number; children?: number }) =>
    api.get(`/flights/instance/${id}`, { params }),
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
    }>;
  }) => api.post('/bookings', data),
  getMyBookings: () => api.get('/bookings/me'),
  getById: (id: string) => api.get(`/bookings/${id}`),
  cancel: (id: string) => api.post(`/bookings/${id}/cancel`),
  partialCancel: (
    id: string,
    data: { cancelAdults: number; cancelChildren: number }
  ) => api.post(`/bookings/${id}/partial-cancel`, data),
};

export const adminApi = {
  verify: (authHeader?: string) =>
    api.get('/admin/verify', {
      headers: authHeader ? { Authorization: `Basic ${authHeader}` } : {},
    }),
  getDashboard: () => api.get('/admin/dashboard'),
  getFlights: () => api.get('/admin/flights'),
  createFlight: (data: any) => api.post('/admin/flights', data),
  updateFlight: (id: string, data: any) => api.patch(`/admin/flights/${id}`, data),
  getBookings: (params?: {
    route?: string;
    travelDate?: string;
    departureTime?: string;
    page?: number;
    limit?: number;
  }) => api.get('/admin/bookings', { params }),
  getBookingDetails: (id: string) => api.get(`/admin/bookings/${id}`),
  cancelBooking: (id: string) => api.post(`/admin/bookings/${id}/cancel`),
};

export default api;
