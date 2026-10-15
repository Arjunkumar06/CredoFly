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
  Clock,
  ShieldCheck,
  Star,
  Send,
  CreditCard,
  QrCode,
  Tag,
} from 'lucide-react';
import { bookingApi, paymentApi } from '../../services/api';
import { Booking, CancellationQuote } from '../../types';
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

  // Full cancellation & Refund Quote modal state
  const [showFullCancelModal, setShowFullCancelModal] = useState<boolean>(false);
  const [cancellationQuote, setCancellationQuote] = useState<CancellationQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [isCancellingFull, setIsCancellingFull] = useState<boolean>(false);

  // Post-flight Feedback state
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);

  // UPI UTR update state
  const [newUtr, setNewUtr] = useState<string>('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);

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
        setCancelAdults(0);
        setCancelChildren(0);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to retrieve booking details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCancelModal = async () => {
    if (!booking) return;
    setShowFullCancelModal(true);
    setIsLoadingQuote(true);
    try {
      const res = await bookingApi.getCancellationQuote(booking.id);
      if (res.data.success) {
        setCancellationQuote(res.data.quote);
      }
    } catch (err: any) {
      console.warn('Quote error:', err);
    } finally {
      setIsLoadingQuote(false);
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
        setSuccessMsg(
          `Booking cancelled successfully. Refund of ₹${Number(
            res.data.refundAmount || 0
          ).toLocaleString('en-IN')} initiated per CredoFly tier policy.`
        );
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
          `Successfully cancelled ${cancelAdults} adult(s) and ${cancelChildren} child(ren). Refund of ₹${res.data.refundAmount?.toLocaleString(
            'en-IN'
          )} processed.`
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

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setIsSubmittingFeedback(true);
    try {
      const res = await bookingApi.submitFeedback(booking.id, { rating, comment });
      if (res.data.success) {
        setFeedbackSuccess(true);
      }
    } catch (err: any) {
      setError('Failed to record customer feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleUpdateUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !newUtr.trim()) return;
    setIsSubmittingUtr(true);
    try {
      const res = await paymentApi.submitUtr({
        bookingId: booking.id,
        transactionRef: newUtr.trim(),
        paymentMethod: 'UPI',
      });
      if (res.data.success) {
        setSuccessMsg('UPI Transaction Reference updated. Our accounts team will verify shortly.');
        setNewUtr('');
        loadBooking();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit UTR.');
    } finally {
      setIsSubmittingUtr(false);
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
  const isPastFlight = new Date(booking.flightInstance.travelDate) < new Date();

  const travelDateFormatted = new Date(booking.flightInstance.travelDate).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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

        {/* Payment Verification Banner if PENDING_VERIFICATION */}
        {booking.paymentStatus === 'PENDING_VERIFICATION' && (
          <div className="p-4 sm:p-5 bg-amber-50 border border-amber-300 rounded-2xl mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-amber-900 text-sm">
                  Google Pay / UPI Payment Pending Verification
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Your seat inventory is reserved. Our operations team is verifying your 12-digit UTR with the bank statement.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateUtr} className="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Update UTR number"
                value={newUtr}
                onChange={(e) => setNewUtr(e.target.value)}
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono"
              />
              <button
                type="submit"
                disabled={isSubmittingUtr || !newUtr.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition whitespace-nowrap"
              >
                {isSubmittingUtr ? 'Saving...' : 'Update UTR'}
              </button>
            </form>
          </div>
        )}

        {/* Main Details Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Booking Reference
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-navy-950">
                {booking.bookingReference}
              </h1>
              <p className="text-sm font-medium text-slate-600 mt-1">
                {booking.flightInstance.flight.origin} &rarr; {booking.flightInstance.flight.destination} &bull;{' '}
                {travelDateFormatted}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge status={booking.status} className="text-sm px-3.5 py-1" />
              {booking.paymentStatus && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                    booking.paymentStatus === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : booking.paymentStatus === 'PENDING_VERIFICATION'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {booking.paymentStatus.replace('_', ' ')}
                </span>
              )}
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
              <span className="text-xs font-semibold text-slate-400 uppercase block">Reserved Seats</span>
              <span className="text-base font-bold text-slate-900">
                {booking.adultCount} Adult{booking.adultCount !== 1 ? 's' : ''},{' '}
                {booking.childCount} Child{booking.childCount !== 1 ? 'ren' : ''}
              </span>
              <p className="text-xs text-slate-500">
                Class: {booking.cabinClass ? booking.cabinClass.replace('_', ' ') : 'Economy'}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase block">Total Amount Paid</span>
              <span className="text-xl font-black text-blue-600">
                ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
              </span>
              <p className="text-xs text-slate-500">
                Method: {booking.paymentMethod || 'Online'}
              </p>
            </div>
          </div>

          {/* Cancellation Actions (if confirmed) */}
          {isConfirmed && (
            <div className="pt-6 space-y-6">
              {/* Full Cancellation Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-rose-50/60 rounded-2xl border border-rose-100">
                <div>
                  <h4 className="font-bold text-rose-950 text-sm">Need to cancel your itinerary?</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    View your guaranteed refund quote based on CredoFly tiered departure policy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCancelModal}
                  className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition flex items-center justify-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Entire Booking</span>
                </button>
              </div>

              {/* Partial Cancellation Box */}
              {booking.adultCount + booking.childCount > 1 && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="text-base font-bold text-navy-950 mb-1">Partial Passenger Cancellation</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Reduce the number of travelers in this booking. Released seats will immediately be restored
                    to flight inventory.
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
                        <span className="text-xs font-semibold text-slate-500 uppercase">Estimated Refund</span>
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
                        {isSubmittingPartial ? 'Processing...' : 'Cancel Selected Passengers'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Passenger List Table with Visual Seats */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-6">
          <h3 className="text-base font-bold text-navy-950 mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Passenger & Seat Manifest</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400 font-semibold uppercase">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Passenger Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Assigned Seat</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {booking.passengers.map((p, idx) => (
                  <tr key={idx} className={p.isCancelled ? 'bg-slate-50/60 opacity-60' : ''}>
                    <td className="py-3 px-3 text-xs text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {p.name}
                      {p.isCancelled && <span className="ml-2 text-xs text-rose-600 font-normal">(Cancelled)</span>}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {p.type === 'ADULT' ? 'Adult (12+)' : 'Child (2-11)'}
                    </td>
                    <td className="py-3 px-3">
                      {p.seatNumber ? (
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-lg text-xs">
                          Seat {p.seatNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Auto-Assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {p.isCancelled ? (
                        <span className="text-xs text-rose-600 font-semibold">Seat Released</span>
                      ) : (
                        <span className="text-xs text-emerald-700 font-semibold">Active Boarding Pass</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Post-Flight Rating & Feedback (Available for completed or past flights) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-6">
          <div className="flex items-center space-x-2.5 mb-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h3 className="text-base font-bold text-navy-950">Flight Experience & Feedback</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Rate your flight journey with CredoFly to help our aviation crew improve service standards.
          </p>

          {feedbackSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center space-x-3 text-xs font-semibold">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Thank you! Your feedback has been recorded in the central database.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300 hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-600 ml-2">
                  {rating === 5 ? 'Excellent' : rating === 4 ? 'Very Good' : rating === 3 ? 'Average' : 'Needs Improvement'}
                </span>
              </div>

              <div>
                <textarea
                  rows={2}
                  placeholder="Share your thoughts about boarding, legroom, staff, or cleanliness..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingFeedback ? 'Submitting...' : 'Submit Review'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Audit Log / Event History */}
        {booking.auditEvents && booking.auditEvents.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-navy-950 mb-4 flex items-center space-x-2">
              <History className="w-5 h-5 text-slate-600" />
              <span>Booking Audit Trail</span>
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

        {/* Configurable Tier-Based Cancellation Quote Modal */}
        {showFullCancelModal && (
          <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-navy-950">
                    Guaranteed Cancellation Quote
                  </h3>
                  <p className="text-xs text-slate-500">
                    Booking: <span className="font-mono font-bold text-slate-800">{booking.bookingReference}</span>
                  </p>
                </div>
              </div>

              {isLoadingQuote ? (
                <div className="py-8 flex flex-col items-center space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-medium">Calculating refund tier boundaries...</p>
                </div>
              ) : cancellationQuote ? (
                <div className="space-y-3.5 text-xs">
                  {/* Tier Indicator Pill */}
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Applicable Policy Tier</p>
                      <p className="font-extrabold text-navy-950 text-sm mt-0.5">{cancellationQuote.tier}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full font-black text-xs">
                      {cancellationQuote.refundPercentage}% Refund
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Hours Until Departure:</span>
                      <span className="font-bold text-slate-800">{cancellationQuote.hoursUntilDeparture} hours</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Total Paid Amount:</span>
                      <span className="font-bold text-slate-800">₹{cancellationQuote.totalPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 text-rose-600">
                      <span>Deducted Cancellation Fee:</span>
                      <span className="font-bold">-₹{cancellationQuote.cancellationFee.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-1 text-sm font-black text-emerald-600">
                      <span>Net Refund Amount:</span>
                      <span>₹{cancellationQuote.refundAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    * Refund will be remitted to original payment instrument within 24-48 hours.
                  </p>
                </div>
              ) : null}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFullCancelModal(false)}
                  className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  disabled={isCancellingFull || isLoadingQuote}
                  onClick={handleFullCancel}
                  className="w-1/2 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/30 transition"
                >
                  {isCancellingFull ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
