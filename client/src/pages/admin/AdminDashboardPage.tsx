import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane,
  Calendar,
  CheckCircle,
  XCircle,
  Ticket,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { DashboardStats } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await adminApi.getDashboard();
        if (res.data.success) {
          setStats(res.data.stats);
        }
      } catch (err: any) {
        setError('Failed to load dashboard metrics. Verify database connectivity.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-navy-950">Operations Dashboard</h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time metrics derived from PostgreSQL database.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Flights */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Active Flights</span>
            <Plane className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.totalActiveFlights ?? 0}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Scheduled in fleet</span>
        </div>

        {/* Upcoming Departures */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Upcoming Departures</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.upcomingFlightInstances ?? 0}
          </p>
          <span className="text-[11px] text-indigo-600 font-medium">Next 30 days</span>
        </div>

        {/* Total Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Bookings</span>
            <Ticket className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.totalBookings ?? 0}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">All recorded orders</span>
        </div>

        {/* Confirmed Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Confirmed</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">
            {stats?.confirmedBookings ?? 0}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Active reservations</span>
        </div>

        {/* Cancelled Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Cancelled</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700">
            {stats?.cancelledBookings ?? 0}
          </p>
          <span className="text-[11px] text-rose-600 font-medium">Seats released</span>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Plane className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Manage Flights & Schedules</h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure flight routes, seating capacities, and recurring weekly schedules for Monday
              through Sunday.
            </p>
          </div>
          <Link
            to="/admin/flights"
            className="inline-flex items-center space-x-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
          >
            <span>Open Flight Configuration</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Ticket className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">All Passenger Bookings</h3>
            <p className="text-xs text-slate-500 mt-1">
              Search and filter customer bookings by route, travel date, or departure time. View
              tickets and audit trail.
            </p>
          </div>
          <Link
            to="/admin/bookings"
            className="inline-flex items-center space-x-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
          >
            <span>View All Bookings Table</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
