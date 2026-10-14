import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plane,
  Calendar,
  Users,
  AlertCircle,
  ArrowLeft,
  XCircle,
  AlertTriangle,
  History,
  CheckCircle,
} from 'lucide-react';
import { bookingApi } from '../../services/api';
import { Booking } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const BookingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Partial cancellation state
  const [cancelAdults, setCancelAdults] = useState<number>(0);
  const [cancelChildren, setCancelChildren] = useState<number>(0);
  const [isSubmittingPartial, setIsSubmittingPartial] = useState<boolean>(false);

  // Full cancellation modal state
  const [showFullCancelModal, setShowFullCancelModal] = useState<boolean>(false);
  const [isCancellingFull, setIsCancellingFull] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  const loadBooking = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingApi.getById(id!);
      if (res.data.success) {
        setBooking(res.data.booking);
        // Reset partial cancellation inputs
        setCancelAdults(0);
        setCancelChildren(0);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to retrieve booking details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullCancel = async () => {
    if (!booking) return;
    setIsCancellingFull(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await bookingApi.cancel(booking.id);
      if (res.data.success) {
        setBooking(res.data.booking);
        setSuccessMsg('Your entire booking has been cancelled and seats released.');
        setShowFullCancelModal(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel booking.');
    } finally {
      setIsCancellingFull(false);
    }
  };

  const handlePartialCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (cancelAdults === 0 && cancelChildren === 0) {
      setError('Please select at least one passenger to cancel.');
      return;
    }

    setIsSubmittingPartial(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await bookingApi.partialCancel(booking.id, {
        cancelAdults,
        cancelChildren,
      });

      if (res.data.success) {
        setBooking(res.data.booking);
        setSuccessMsg(
          `Successfully cancelled ${cancelAdults} adult(s) and ${cancelChildren} child(ren). Refund of ₹${res.data.refundAmount?.toLocaleString('en-IN')} initiated.`
        );
        setCancelAdults(0);
        setCancelChildren(0);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process partial cancellation.');
    } finally {
      setIsSubmittingPartial(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Booking Details Error</h2>
        <p className="text-slate-500 mt-2">{error}</p>
        <Link
          to="/my-bookings"
          className="inline-block mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium"
        >
          Return to My Bookings
        </Link>
      </div>
    );
  }

  if (!booking) return null;

  const adultFare = Number(booking.adultFareSnapshot);
  const childFare = Number(booking.childFareSnapshot);
  const refundAmountPreview = cancelAdults * adultFare + cancelChildren * childFare;
  const isConfirmed = booking.status === 'CONFIRMED';

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
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/my-bookings')}
          className="inline-flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Bookings</span>
        </button>

        {/* Success / Error alerts */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 mb-6">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center space-x-3 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Main Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Booking Reference
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-navy-950">
                {booking.bookingReference}
              </h1>
              <p className="text-sm font-medium text-slate-600 mt-1">
                {booking.flightInstance.flight.origin} &rarr;{' '}
                {booking.flightInstance.flight.destination} &bull; {travelDateFormatted}
              </p>
            </div>
            <div>
              <StatusBadge status={booking.status} className="text-sm px-3.5 py-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase block">Flight Code</span>
              <span className="text-base font-bold text-slate-900">
                {booking.flightInstance.flight.flightCode}
              </span>
              <p className="text-xs text-slate-500">
                {booking.flightInstance.departureTime} &rarr; {booking.flightInstance.arrivalTime}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase block">Current Reserved Seats</span>
              <span className="text-base font-bold text-slate-900">
                {booking.adultCount} Adult{booking.adultCount !== 1 ? 's' : ''},{' '}
                {booking.childCount} Child{booking.childCount !== 1 ? 'ren' : ''}
              </span>
              <p className="text-xs text-slate-500">
                {booking.adultCount + booking.childCount} Total Active Seat(s)
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase block">Total Amount</span>
              <span className="text-xl font-black text-blue-600">
                ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
              </span>
              <p className="text-xs text-slate-500">Fare Snapshot Locked</p>
            </div>
          </div>

          {/* Cancellation Actions (if confirmed) */}
          {isConfirmed && (
            <div className="pt-6 space-y-6">
              {/* Full Cancellation Button */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowFullCancelModal(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md shadow-rose-600/20 transition flex items-center justify-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Entire Booking</span>
                </button>
              </div>

              {/* Partial Cancellation Box */}
              {(booking.adultCount + booking.childCount > 1) && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="text-base font-bold text-navy-950 mb-1">
                    Partial Cancellation
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Reduce the number of passengers in this booking. Released seats will immediately
                    be restored to the flight inventory.
                  </p>

                  <form onSubmit={handlePartialCancel} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Cancel Adults */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Adults to Cancel
                        </label>
                        <select
                          value={cancelAdults}
                          onChange={(e) => setCancelAdults(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        >
                          {Array.from({ length: booking.adultCount + 1 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '0 (No change)' : `${i} Adult${i > 1 ? 's' : ''}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cancel Children */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Children to Cancel
                        </label>
                        <select
                          value={cancelChildren}
                          onChange={(e) => setCancelChildren(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        >
                          {Array.from({ length: booking.childCount + 1 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '0 (No change)' : `${i} Child${i > 1 ? 'ren' : ''}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Refund Preview */}
                      <div className="flex flex-col justify-end">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Refund Amount</span>
                        <span className="text-lg font-black text-emerald-600">
                          ₹{refundAmountPreview.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingPartial || (cancelAdults === 0 && cancelChildren === 0)}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm"
                      >
                        {isSubmittingPartial ? 'Processing...' : 'Update Booking'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Passenger List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
          <h3 className="text-base font-bold text-navy-950 mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Passenger List</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400 font-semibold uppercase">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {booking.passengers.map((p, idx) => (
                  <tr key={idx} className={p.isCancelled ? 'bg-slate-50/60 opacity-60' : ''}>
                    <td className="py-3 px-3 text-xs text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {p.name}
                      {p.isCancelled && <span className="ml-2 text-xs text-rose-600 font-normal">(Cancelled)</span>}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {p.type === 'ADULT' ? 'Adult (12+)' : 'Child (2-11)'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {p.isCancelled ? (
                        <span className="text-xs text-rose-600 font-semibold">Seat Released</span>
                      ) : (
                        <span className="text-xs text-emerald-700 font-semibold">Active Seat</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log / Event History */}
        {booking.auditEvents && booking.auditEvents.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-navy-950 mb-4 flex items-center space-x-2">
              <History className="w-5 h-5 text-slate-600" />
              <span>Booking Event History</span>
            </h3>
            <div className="space-y-3">
              {booking.auditEvents.map((event) => (
                <div key={event.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
                  <div className="flex justify-between items-center text-slate-500 font-semibold">
                    <span className="uppercase tracking-wider text-[11px] text-blue-600">
                      {event.eventType.replace('_', ' ')}
                    </span>
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{event.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Destructive Action Modal */}
        {showFullCancelModal && (
          <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">
                  Cancel Entire Booking?
                </h3>
                <p className="text-xs text-slate-500 mt-2">
                  This will release all {booking.adultCount + booking.childCount} seat(s) reserved
                  for {booking.bookingReference}. This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFullCancelModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Nevermind
                </button>
                <button
                  type="button"
                  disabled={isCancellingFull}
                  onClick={handleFullCancel}
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  {isCancellingFull ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
