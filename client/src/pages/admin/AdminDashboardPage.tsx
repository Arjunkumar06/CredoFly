import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane,
  Calendar,
  CheckCircle2,
  XCircle,
  Ticket,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Users,
  CheckCheck,
  UserCheck,
  IndianRupee,
  Percent,
  Timer,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { DashboardStats } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  // Today's date string YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (dateStr?: string) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await adminApi.getDashboard({ date: dateStr || selectedDate });
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      setError('Failed to load dashboard metrics. Verify database connectivity.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (newDate: string) => {
    if (newDate) {
      setSelectedDate(newDate);
    }
  };

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() - 1);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + 1);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const handleResetToday = () => {
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    setSelectedDate(todayStr);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-white rounded-2xl animate-pulse border border-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  const isSelectedDateToday = stats?.todayDate === selectedDate;

  return (
    <div className="space-y-8">
      {/* Page Header & Live Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold tracking-wide uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Operations</span>
            <span className="text-slate-400">&bull;</span>
            <span>{stats?.timezone || 'Asia/Kolkata'}</span>
          </div>
          <h1 className="text-2xl font-black text-navy-950">Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time fleet operations, bookings, passenger manifestations, and verified payment metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/schedules"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-navy-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>12-Month Calendar</span>
          </Link>

          <button
            onClick={() => fetchDashboard(selectedDate)}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Date Control Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-navy-950 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetToday}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
              isSelectedDateToday
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Today
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-700">Displaying:</span>
            <span className="font-bold text-navy-950 bg-slate-100 px-2 py-0.5 rounded-lg">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {isSelectedDateToday && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                CURRENT DAY
              </span>
            )}
          </div>
          {stats?.currentDateTime && (
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              Server: {stats.currentDateTime}
            </span>
          )}
        </div>
      </div>

      {/* 12 Live Operation Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Flights Scheduled Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Flights Scheduled</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Plane className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.flightsScheduledToday ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-semibold">Active Departures</span>
            <span className="text-slate-400">fleet total: {stats?.totalActiveFlights ?? 0}</span>
          </div>
        </div>

        {/* 2. Total Bookings Made Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Bookings on Date</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.bookingsMadeToday ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-indigo-600 font-semibold">Recorded for Date</span>
            <span className="text-slate-400">all-time: {stats?.totalBookings ?? 0}</span>
          </div>
        </div>

        {/* 3. Confirmed Bookings Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Confirmed Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">
            {stats?.confirmedBookingsToday ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-semibold">Active Seats</span>
            <span className="text-slate-400">all-time: {stats?.confirmedBookings ?? 0}</span>
          </div>
        </div>

        {/* 4. Pending Bookings & Payment Statuses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Pending Verification</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700">
            {stats?.pendingBookingsToday ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-amber-600 font-semibold">Awaiting Verification</span>
            <Link to="/admin/payments" className="text-blue-600 hover:underline">
              Review &rarr;
            </Link>
          </div>
        </div>

        {/* 5. Cancelled Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Cancelled Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700">
            {stats?.cancelledBookingsToday ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-semibold">Seats Released</span>
            <span className="text-slate-400">all-time: {stats?.cancelledBookings ?? 0}</span>
          </div>
        </div>

        {/* 6. Total Passengers Travelling Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Travelling Passengers</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-violet-800">
            {stats?.travellingPassengersToday ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-violet-600 font-semibold">Manifested Passengers</span>
            <span className="text-slate-400">on this date</span>
          </div>
        </div>

        {/* 7. Upcoming Flights */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Upcoming Flights</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.upcomingFlights ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-sky-600 font-semibold">Future Departures</span>
            <span className="text-slate-400">across 365 days</span>
          </div>
        </div>

        {/* 8. Completed Flights */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Completed Flights</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.completedFlights ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-teal-600 font-semibold">Past Departures</span>
            <span className="text-slate-400">historical archive</span>
          </div>
        </div>

        {/* 9. Total Registered Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Registered Users</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.totalRegisteredUsers ?? 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-semibold">Customer Accounts</span>
            <span className="text-slate-400">authenticated users</span>
          </div>
        </div>

        {/* 10. Total Revenue from Verified Payments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Verified Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">
            ₹{(stats?.totalVerifiedRevenue ?? 0).toLocaleString('en-IN')}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-semibold">
              ₹{(stats?.verifiedRevenueDate ?? 0).toLocaleString('en-IN')} on date
            </span>
            <span className="text-slate-400">reconciled</span>
          </div>
        </div>

        {/* 11. Available Seats & Seat Occupancy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Seat Occupancy</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-blue-600">
              {stats?.occupancyRateToday ?? 0}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({stats?.occupiedSeatsToday ?? 0} / {stats?.totalCapacityToday ?? 0} seats)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, stats?.occupancyRateToday ?? 0)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{stats?.availableSeatsToday ?? 0} seats available</span>
            <span>{stats?.occupiedSeatsToday ?? 0} seats booked</span>
          </div>
        </div>

        {/* 12. Flights Departing Soon */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Departing Soon</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.flightsDepartingSoon?.length ?? 0} Flights
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-cyan-600 font-semibold">Active Departure Queue</span>
            <span className="text-slate-400">sorted by schedule</span>
          </div>
        </div>
      </div>

      {/* Two Detailed Tables for Selected Date */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Flights Scheduled on Selected Date */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-navy-950 flex items-center space-x-2">
                <Plane className="w-4 h-4 text-blue-600" />
                <span>Flights Scheduled ({stats?.flightsDepartingSoon?.length ?? 0})</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Departures configured for {selectedDate}
              </p>
            </div>
            <Link
              to="/admin/schedules"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              Manage &rarr;
            </Link>
          </div>

          {stats?.flightsDepartingSoon && stats.flightsDepartingSoon.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Flight</th>
                    <th className="pb-2">Route</th>
                    <th className="pb-2">Departure</th>
                    <th className="pb-2">Seats</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.flightsDepartingSoon.map((flight) => (
                    <tr key={flight.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 font-black text-navy-950">
                        {flight.flightCode}
                      </td>
                      <td className="py-2.5 font-medium text-slate-700">
                        {flight.origin} &rarr; {flight.destination}
                      </td>
                      <td className="py-2.5 font-mono text-slate-800">
                        {flight.departureTime}
                      </td>
                      <td className="py-2.5">
                        <span className="font-bold text-slate-800">{flight.availableSeats}</span>
                        <span className="text-slate-400 text-[10px]"> / {flight.capacity}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            flight.status === 'SCHEDULED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : flight.status === 'DELAYED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {flight.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No flights scheduled on {selectedDate}. Use the 12-Month Calendar to generate schedules.
            </div>
          )}
        </div>

        {/* Table 2: Recent Bookings for Selected Date */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-navy-950 flex items-center space-x-2">
                <Ticket className="w-4 h-4 text-emerald-600" />
                <span>Recent Bookings ({stats?.recentBookingsOnDate?.length ?? 0})</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Reservations made for flights on {selectedDate}
              </p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              View All &rarr;
            </Link>
          </div>

          {stats?.recentBookingsOnDate && stats.recentBookingsOnDate.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">PNR / Ref</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Flight</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentBookingsOnDate.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 font-mono font-bold text-navy-950">
                        {booking.pnr || booking.bookingReference}
                      </td>
                      <td className="py-2.5 font-medium text-slate-700">
                        {booking.customerName}
                      </td>
                      <td className="py-2.5 font-mono text-slate-800">
                        {booking.flightCode}
                      </td>
                      <td className="py-2.5 font-bold text-slate-900">
                        ₹{booking.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            booking.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No bookings recorded for flights departing on {selectedDate}.
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">12-Month Interactive Calendar</h3>
            <p className="text-xs text-slate-500 mt-1">
              Browse flight departures and passenger bookings across all 12 months with year selector, leap year support, and day summaries.
            </p>
          </div>
          <Link
            to="/admin/schedule"
            className="inline-flex items-center space-x-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
          >
            <span>Open Schedule Calendar</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Ticket className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">All Passenger Bookings</h3>
            <p className="text-xs text-slate-500 mt-1">
              Search and filter customer bookings by route, travel date, or departure time. View tickets, passengers, and audit trail.
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

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <IndianRupee className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Payments & Verification</h3>
            <p className="text-xs text-slate-500 mt-1">
              Review Google Pay and UPI UTR references, verify or reject customer transaction submissions, and adjust gateway configuration.
            </p>
          </div>
          <Link
            to="/admin/payments"
            className="inline-flex items-center space-x-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
          >
            <span>Review Payments</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
