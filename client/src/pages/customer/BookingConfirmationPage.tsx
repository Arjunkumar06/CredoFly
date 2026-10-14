import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, Download, Plane, Calendar, User, ArrowLeft, ArrowRight, Printer } from 'lucide-react';
import { bookingApi } from '../../services/api';
import { Booking } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const BookingConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [booking, setBooking] = useState<Booking | null>(
    (location.state as any)?.booking || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!booking);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!booking && id) {
      const fetchBooking = async () => {
        try {
          const res = await bookingApi.getById(id);
          if (res.data.success) {
            setBooking(res.data.booking);
          }
        } catch {
          setError('Failed to retrieve booking confirmation details.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchBooking();
    }
  }, [id, booking]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Booking Confirmation Not Found</h2>
        <p className="text-slate-500 mt-2">{error || 'Unable to locate this booking.'}</p>
        <Link
          to="/"
          className="inline-block mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium"
        >
          Return to Homepage
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
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Confirmed Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-emerald-900">
                Booking Confirmed!
              </h1>
              <p className="text-xs sm:text-sm text-emerald-700 mt-0.5">
                Your flight has been successfully booked. Confirmation email sent.
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Ticket</span>
            </button>
          </div>
        </div>

        {/* Printable Boarding Ticket Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Booking Reference
              </span>
              <span className="text-2xl font-black text-navy-950 tracking-wider">
                {booking.bookingReference}
              </span>
            </div>
            <div>
              <StatusBadge status={booking.status} className="text-sm px-3 py-1" />
            </div>
          </div>

          {/* Flight Route and Schedule */}
          <div className="p-6 border-b border-slate-100 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Plane className="w-5 h-5 transform -rotate-45" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {booking.flightInstance.flight.flightCode}
                </h3>
                <p className="text-xs text-slate-500">
                  {booking.flightInstance.flight.origin} &rarr; {booking.flightInstance.flight.destination}
                </p>
              </div>
              <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {travelDateFormatted}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4 text-center items-center">
              <div>
                <p className="text-xl font-black text-slate-900">
                  {booking.flightInstance.departureTime}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Departure</p>
              </div>
              <div className="flex flex-col items-center">
                <ArrowRight className="w-5 h-5 text-blue-600" />
                <span className="text-[10px] text-slate-400 mt-1">Confirmed Non-stop</span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900">
                  {booking.flightInstance.arrivalTime}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Arrival</p>
              </div>
            </div>
          </div>

          {/* Passenger Table */}
          <div className="p-6 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Passenger Details</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-400 font-semibold uppercase">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {booking.passengers.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">{p.name}</td>
                      <td className="py-3 px-3 text-xs text-slate-600">
                        {p.type === 'ADULT' ? 'Adult (12+)' : 'Child (2-11)'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-xs text-emerald-700 font-semibold">Seat Reserved</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Paid Section */}
          <div className="p-6 bg-slate-50/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Total Amount Paid</span>
              <p className="text-xs text-slate-400">Includes all taxes and passenger service fees</p>
            </div>
            <div className="text-2xl font-black text-blue-600">
              ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
            </div>
          </div>

        </div>

        {/* Action Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/my-bookings"
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl text-center shadow-md shadow-blue-600/20 transition"
          >
            Go to My Bookings
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 text-center transition"
          >
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
};
