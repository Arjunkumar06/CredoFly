import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plane,
  User,
  History,
  XCircle,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { Booking } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminBookingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  useEffect(() => {
    if (id) loadBooking();
  }, [id]);

  const loadBooking = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getBookingDetails(id!);
      if (res.data.success) {
        setBooking(res.data.booking);
      }
    } catch {
      setError('Failed to fetch booking details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminCancel = async () => {
    if (!booking) return;
    setIsCancelling(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.cancelBooking(booking.id);
      if (res.data.success) {
        setBooking(res.data.booking);
        setSuccessMsg('Booking was successfully cancelled by administrator. Inventory restored.');
        setShowCancelModal(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <p className="text-rose-600 font-semibold mb-4">{error || 'Booking not found.'}</p>
        <Link
          to="/admin/bookings"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Bookings List
        </Link>
      </div>
    );
  }

  const travelDateFormatted = new Date(booking.flightInstance.travelDate).toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/bookings')}
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Bookings</span>
      </button>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Details on Left, Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Details & Passenger list */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Booking Reference
                </span>
                <h1 className="text-2xl font-black text-navy-950 font-mono">
                  {booking.bookingReference}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Booked on {new Date(booking.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <StatusBadge status={booking.status} className="text-sm px-3.5 py-1" />
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Customer Account</span>
                <p className="text-sm font-bold text-slate-900">{booking.user?.username || 'Guest'}</p>
                <p className="text-xs text-slate-500">{booking.user?.email || 'No email associated'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Flight Departure</span>
                <p className="text-sm font-bold text-blue-600">
                  {booking.flightInstance.flight.flightCode} ({booking.flightInstance.flight.origin} &rarr; {booking.flightInstance.flight.destination})
                </p>
                <p className="text-xs text-slate-500">
                  {travelDateFormatted} at {booking.flightInstance.departureTime}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Reserved Seats</span>
                <p className="text-sm font-bold text-slate-900">
                  {booking.adultCount} Adult{booking.adultCount !== 1 ? 's' : ''},{' '}
                  {booking.childCount} Child{booking.childCount !== 1 ? 'ren' : ''}
                </p>
                <p className="text-xs text-slate-500">
                  Adult Fare: ₹{Number(booking.adultFareSnapshot).toLocaleString('en-IN')} &bull; Child Fare: ₹{Number(booking.childFareSnapshot).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Total Transaction Amount</span>
                <p className="text-xl font-black text-slate-900">
                  ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
                </p>
                {booking.cancelledAt && (
                  <p className="text-xs text-rose-600">
                    Cancelled on {new Date(booking.cancelledAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Passenger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-navy-950 mb-4 flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Registered Passengers</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {booking.passengers.map((p, idx) => (
                    <tr key={idx} className={p.isCancelled ? 'opacity-50 bg-slate-50' : ''}>
                      <td className="py-3 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {p.name}
                        {p.isCancelled && <span className="ml-2 text-rose-600 font-normal">(Cancelled)</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.type === 'ADULT' ? 'Adult (12+)' : 'Child (2-11)'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {p.isCancelled ? (
                          <span className="text-rose-600 font-semibold">Seat Released</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Active Seat</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Events */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-navy-950 mb-4 flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-600" />
              <span>Audit Trail</span>
            </h3>
            <div className="space-y-3">
              {booking.auditEvents?.map((event) => (
                <div key={event.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
                  <div className="flex justify-between items-center text-slate-500 font-semibold">
                    <span className="uppercase tracking-wider text-[11px] text-blue-600 font-bold">
                      {event.eventType.replace('_', ' ')}
                    </span>
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{event.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Operations Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-navy-950">Administrative Actions</h3>

            {booking.status === 'CONFIRMED' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Administrators can override and cancel active customer bookings. This will release
                  all {booking.adultCount + booking.childCount} reserved seat(s) back into flight
                  inventory.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Booking (Override)</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 text-slate-600 text-xs rounded-xl">
                This booking is already cancelled. All associated seats have been released.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Cancel Booking {booking.bookingReference}?
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                This will release {booking.adultCount + booking.childCount} seat(s) on flight{' '}
                {booking.flightInstance.flight.flightCode}.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleAdminCancel}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
