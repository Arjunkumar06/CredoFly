import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plane, Calendar, Users, AlertCircle, ArrowRight, XCircle } from 'lucide-react';
import { bookingApi } from '../../services/api';
import { Booking } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { HeroBackground } from '../../components/common/HeroBackground';
import { useAuth } from '../../context/AuthContext';

export const MyBookingsPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate('/login?redirect=/my-bookings');
      return;
    }

    if (user) {
      loadBookings();
    }
  }, [user, isAuthLoading, navigate]);

  const loadBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingApi.getMyBookings();
      if (res.data.success) {
        setUpcoming(res.data.upcoming || []);
        setPast(res.data.past || []);
      }
    } catch {
      setError('Unable to fetch your bookings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentBookings = activeTab === 'upcoming' ? upcoming : past;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Customer Dashboard Banner */}
      <HeroBackground variant="banner" className="mb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold mb-2 border border-blue-400/30">
                <Plane className="w-3.5 h-3.5 transform -rotate-45" />
                <span>Customer Reservation Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">My Bookings</h1>
              <p className="text-sm text-slate-300 mt-1">
                Manage your confirmed flight reservations, download tickets, and review cancellations.
              </p>
            </div>
            <div>
              <Link
                to="/flights"
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-blue-900/40 transition"
              >
                <Plane className="w-4 h-4 transform -rotate-45" />
                <span>Book New Flight</span>
              </Link>
            </div>
          </div>
        </div>
      </HeroBackground>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        {/* Tab Controls */}
        <div className="flex space-x-2 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-2.5 px-4 text-sm font-bold border-b-2 transition ${
              activeTab === 'upcoming'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`py-2.5 px-4 text-sm font-bold border-b-2 transition ${
              activeTab === 'past'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Past & Cancelled ({past.length})
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-32"></div>
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && currentBookings.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No {activeTab} bookings found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              {activeTab === 'upcoming'
                ? "You don't have any upcoming trips scheduled right now."
                : 'No historical or cancelled flights.'}
            </p>
            <Link
              to="/flights"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
            >
              Search Flights
            </Link>
          </div>
        )}

        {/* Bookings List */}
        {!isLoading && !error && currentBookings.length > 0 && (
          <div className="space-y-4">
            {currentBookings.map((b) => {
              const travelDate = new Date(b.flightInstance.travelDate).toLocaleDateString(
                'en-US',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }
              );
              const totalPassengers = b.adultCount + b.childCount;

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-navy-950 text-base">
                        {b.bookingReference}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>

                    <p className="text-sm font-semibold text-slate-700">
                      {b.flightInstance.flight.origin} &rarr; {b.flightInstance.flight.destination} &bull;{' '}
                      <span className="font-normal text-slate-500">{travelDate}</span>
                    </p>

                    <p className="text-xs text-slate-500">
                      {b.status === 'CANCELLED'
                        ? 'Cancelled reservation'
                        : `${totalPassengers} Passenger${totalPassengers > 1 ? 's' : ''}`}{' '}
                      &bull; <strong className="text-slate-800">₹{Number(b.totalAmount).toLocaleString('en-IN')}</strong>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                    <Link
                      to={`/my-bookings/${b.id}`}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                      View Details
                    </Link>

                    {b.status === 'CONFIRMED' && (
                      <Link
                        to={`/my-bookings/${b.id}?action=cancel`}
                        className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl transition"
                      >
                        Cancel
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
