import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CustomerLayout } from './layouts/CustomerLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Customer Pages
import { HomePage } from './pages/customer/HomePage';
import { SearchResultsPage } from './pages/customer/SearchResultsPage';
import { BookingReviewPage } from './pages/customer/BookingReviewPage';
import { BookingConfirmationPage } from './pages/customer/BookingConfirmationPage';
import { MyBookingsPage } from './pages/customer/MyBookingsPage';
import { BookingDetailsPage } from './pages/customer/BookingDetailsPage';
import { OffersPage } from './pages/customer/OffersPage';
import { HelpSupportPage } from './pages/customer/HelpSupportPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminFlightsPage } from './pages/admin/AdminFlightsPage';
import { AdminSchedulePage } from './pages/admin/AdminSchedulePage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminBookingDetailsPage } from './pages/admin/AdminBookingDetailsPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminPricingPage } from './pages/admin/AdminPricingPage';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Customer Interface Routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/flights" element={<SearchResultsPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/help" element={<HelpSupportPage />} />
          <Route path="/support" element={<Navigate to="/help" replace />} />
          <Route path="/booking/review" element={<BookingReviewPage />} />
          <Route path="/booking/confirmation/:id" element={<BookingConfirmationPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/my-bookings/:id" element={<BookingDetailsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Admin Login (Interface 12) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected Admin Routes (Interfaces 7, 8, 9, Dashboard) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="flights" element={<AdminFlightsPage />} />
          <Route path="schedule" element={<AdminSchedulePage />} />
          {/* Alias for plural /admin/schedules */}
          <Route path="schedules" element={<Navigate to="/admin/schedule" replace />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="bookings/:id" element={<AdminBookingDetailsPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="pricing" element={<AdminPricingPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
