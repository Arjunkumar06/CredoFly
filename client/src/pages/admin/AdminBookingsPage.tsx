import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Calendar, Clock, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { adminApi, flightApi } from '../../services/api';
import { Booking } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('all');

  const [routesList, setRoutesList] = useState<string[]>([]);

  useEffect(() => {
    // Load city routes
    const loadRoutes = async () => {
      try {
        const res = await flightApi.getCities();
        if (res.data.success) {
          const combined = Array.from(
            new Set([...res.data.origins, ...res.data.destinations])
          );
          setRoutesList(combined);
        }
      } catch {
        // Ignore
      }
    };
    loadRoutes();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [page, routeFilter, dateFilter, timeFilter]);

  const loadBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getBookings({
        route: routeFilter !== 'all' ? routeFilter : undefined,
        travelDate: dateFilter || undefined,
        departureTime: timeFilter !== 'all' ? timeFilter : undefined,
        page,
        limit: 10,
      });

      if (res.data.success) {
        setBookings(res.data.bookings);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch {
      setError('Failed to fetch bookings list.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilters = () => {
    setRouteFilter('all');
    setDateFilter('');
    setTimeFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-navy-950">All Customer Bookings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, filter, and audit flight bookings across the entire airline network.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* Route filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Route / Airport
            </label>
            <select
              value={routeFilter}
              onChange={(e) => {
                setRouteFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
            >
              <option value="all">All Routes</option>
              {routesList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Travel Date filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Travel Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
            />
          </div>

          {/* Departure Time filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Departure Time
            </label>
            <select
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
            >
              <option value="all">All Times</option>
              <option value="07:30">07:30</option>
              <option value="08:00">08:00</option>
              <option value="09:00">09:00</option>
              <option value="11:30">11:30</option>
              <option value="14:00">14:00</option>
              <option value="16:15">16:15</option>
              <option value="18:00">18:00</option>
            </select>
          </div>

          {/* Reset Filters button */}
          <div>
            <button
              onClick={handleResetFilters}
              className="w-full py-2 px-3 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            Total Results: {total} booking{total !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No bookings found matching the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-3">Booking Reference</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Flight</th>
                  <th className="py-3 px-3">Route</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Seats</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => {
                  const dateStr = new Date(b.flightInstance.travelDate).toLocaleDateString(
                    'en-US',
                    {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }
                  );
                  const seatCount = b.adultCount + b.childCount;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-navy-950">
                        {b.bookingReference}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {b.user?.username || 'Customer'}
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-600">
                        {b.flightInstance.flight.flightCode}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {b.flightInstance.flight.origin} &rarr; {b.flightInstance.flight.destination}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {dateStr} ({b.flightInstance.departureTime})
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {seatCount} seat{seatCount !== 1 ? 's' : ''}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        ₹{Number(b.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/admin/bookings/${b.id}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 border border-slate-300 hover:border-blue-500 rounded-lg text-slate-700 hover:text-blue-600 font-semibold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
