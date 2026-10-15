import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  Plane,
  Calendar,
  User,
  ArrowRight,
  Printer,
  Copy,
  Check,
  Luggage,
  Clock,
  ShieldCheck,
  Mail,
  Phone,
  CreditCard,
  AlertCircle,
  MapPin,
  FileText,
} from 'lucide-react';
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
  const [copiedPnr, setCopiedPnr] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

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

  const copyToClipboard = (text: string, type: 'pnr' | 'ref') => {
    navigator.clipboard.writeText(text);
    if (type === 'pnr') {
      setCopiedPnr(true);
      setTimeout(() => setCopiedPnr(false), 2000);
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 text-sm font-medium">Loading flight confirmation...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Booking Confirmation Not Found</h2>
        <p className="text-slate-600 mt-2">{error || 'Unable to locate this booking. It may have expired or belongs to another session.'}</p>
        <Link
          to="/"
          className="inline-block mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-sm"
        >
          Return to Homepage
        </Link>
      </div>
    );
  }

  const travelDateFormatted = new Date(booking.flightInstance.travelDate).toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );

  const bookingDateFormatted = new Date(booking.createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const cabinClassDisplay =
    booking.cabinClass === 'BUSINESS'
      ? 'Business Class'
      : booking.cabinClass === 'PREMIUM_ECONOMY'
      ? 'Premium Economy'
      : 'Economy Class';

  const cabinBaggage = booking.cabinClass === 'BUSINESS' ? '12 Kg (1 piece)' : '7 Kg (1 piece)';
  const checkInBaggage =
    booking.cabinClass === 'BUSINESS'
      ? '30 Kg (2 pieces)'
      : booking.cabinClass === 'PREMIUM_ECONOMY'
      ? '20 Kg (1 piece)'
      : '15 Kg (1 piece)';

  const displayPnr = booking.pnr || `CF${booking.bookingReference.slice(-6)}`;

  return (
    <div className="bg-slate-50 min-h-screen py-8 print:py-0 print:bg-white">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-ticket {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Success Confirmation Banner (Screen Only) */}
        <div className="no-print bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2.5 py-0.5 rounded-full">
                  Confirmed & Ticketed
                </span>
                <span className="text-xs text-slate-500">Booked on {bookingDateFormatted}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
                Booking Confirmed!
              </h1>
              <p className="text-xs sm:text-sm text-emerald-700 mt-0.5">
                Your flight is confirmed. Your E-Ticket and travel itinerary receipt are ready below.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-900 font-bold text-sm rounded-xl shadow-sm transition"
            >
              <Printer className="w-4 h-4 text-emerald-700" />
              <span>Print / Save Ticket</span>
            </button>
          </div>
        </div>

        {/* Printable E-Ticket Card */}
        <div className="print-ticket bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden mb-8">
          
          {/* Airline Header Bar */}
          <div className="bg-navy-950 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Plane className="w-6 h-6 transform -rotate-45" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-black tracking-tight text-white">CredoFly</span>
                  <span className="text-xs bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded font-mono">
                    Express
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 tracking-wide">Official Electronic Ticket Receipt & Boarding Summary</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:text-right">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider block">
                  Airline PNR
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-black text-amber-300 font-mono tracking-wider">
                    {displayPnr}
                  </span>
                  <button
                    onClick={() => copyToClipboard(displayPnr, 'pnr')}
                    title="Copy PNR"
                    className="no-print p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white transition"
                  >
                    {copiedPnr ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Booking Ref
                </span>
                <div className="flex items-center space-x-1 sm:justify-end">
                  <span className="text-sm font-bold text-white font-mono">{booking.bookingReference}</span>
                  <button
                    onClick={() => copyToClipboard(booking.bookingReference, 'ref')}
                    title="Copy Booking Reference"
                    className="no-print p-1 hover:bg-white/20 rounded text-slate-400 hover:text-white transition"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Flight Summary Ribbon */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5 text-slate-800">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{travelDateFormatted}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                {cabinClassDisplay}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Aircraft: Airbus A320neo</span>
            </div>
            <div>
              <StatusBadge status={booking.status} className="text-xs px-3 py-1 font-bold shadow-sm" />
            </div>
          </div>

          {/* MakeMyTrip-Style Route & Timings Board */}
          <div className="p-6 sm:p-8 border-b border-slate-200">
            <div className="bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-2xl p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                
                {/* Origin */}
                <div className="text-left">
                  <div className="inline-flex items-center space-x-1 text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Departure</span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {booking.flightInstance.departureTime}
                  </h3>
                  <p className="text-base font-extrabold text-slate-800 mt-1">
                    {booking.flightInstance.flight.origin}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Terminal 2 (CredoFly Departure)</p>
                </div>

                {/* Duration & Flight Info */}
                <div className="flex flex-col items-center justify-center text-center px-4">
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                    {booking.flightInstance.flight.flightCode}
                  </span>
                  
                  <div className="w-full flex items-center justify-center my-3">
                    <div className="h-[2px] bg-slate-300 flex-1 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                    <div className="mx-3 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <Plane className="w-4 h-4 transform -rotate-45" />
                    </div>
                    <div className="h-[2px] bg-slate-300 flex-1 relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                  </div>

                  <span className="inline-block text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                    Confirmed Non-Stop
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">CredoFly Express Service</span>
                </div>

                {/* Destination */}
                <div className="text-left md:text-right">
                  <div className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Arrival</span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {booking.flightInstance.arrivalTime}
                  </h3>
                  <p className="text-base font-extrabold text-slate-800 mt-1">
                    {booking.flightInstance.flight.destination}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Terminal 1 (Arrival)</p>
                </div>

              </div>
            </div>
          </div>

          {/* Passenger List */}
          <div className="p-6 sm:p-8 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>Passenger Details ({booking.passengers.length})</span>
              </h4>
              <span className="text-xs font-semibold text-slate-500">
                {booking.adultCount} Adult{booking.adultCount > 1 ? 's' : ''}
                {booking.childCount > 0 ? `, ${booking.childCount} Child${booking.childCount > 1 ? 'ren' : ''}` : ''}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Passenger Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Gender & Age</th>
                    <th className="py-3 px-4 text-right">Seat / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {booking.passengers.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                        {p.type === 'ADULT' ? 'Adult (12+ yrs)' : 'Child (2-11 yrs)'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {p.gender ? `${p.gender.charAt(0)}${p.gender.slice(1).toLowerCase()}` : '—'}
                        {p.age ? `, ${p.age} yrs` : ''}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.isCancelled ? (
                          <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Confirmed</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Baggage & Contact Grid */}
          <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Baggage Allowance */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h5 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 mb-3">
                  <Luggage className="w-4 h-4 text-blue-600" />
                  <span>Baggage Allowance ({cabinClassDisplay})</span>
                </h5>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Cabin (Hand) Baggage:</span>
                    <span className="font-bold text-slate-900">{cabinBaggage}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Check-in Baggage:</span>
                    <span className="font-bold text-slate-900">{checkInBaggage}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1 italic">
                    Additional baggage may be purchased up to 4 hours before departure at CredoFly airport counters.
                  </p>
                </div>
              </div>

              {/* Contact & Payment Information */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h5 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 mb-3">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Payment & Contact Summary</span>
                </h5>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-medium text-slate-700 flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Contact Email:</span>
                    </span>
                    <span className="font-bold text-slate-900">{booking.contactEmail || 'Registered Customer Email'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-medium text-slate-700 flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Phone:</span>
                    </span>
                    <span className="font-bold text-slate-900">{booking.contactPhone || '+91 Primary Contact'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="font-medium text-slate-700">Payment Status:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      PAID / CONFIRMED ({booking.paymentMethod || 'DEMO_PAY'})
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Fare Breakdown & Total */}
          <div className="p-6 sm:p-8 bg-slate-100/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Amount Paid
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Includes base airfare for {booking.passengers.length} passenger{booking.passengers.length > 1 ? 's' : ''}, airport development fees, and applicable GST.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-3xl font-black text-blue-600 font-mono">
                ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
              </span>
              <span className="block text-[11px] font-semibold text-emerald-700">
                Payment Completed • No Balance Due
              </span>
            </div>
          </div>

          {/* Important Travel Guidelines & Check-in Advisory */}
          <div className="p-6 sm:p-8 bg-white">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Important Travel Guidelines & Airport Advisory</span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 flex items-center space-x-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Check-in Deadlines</span>
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Web check-in opens 48 hours before departure. Airport baggage drop closes 60 mins and boarding gate closes 25 mins prior to departure.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 flex items-center space-x-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mandatory Government ID</span>
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Each passenger must carry an original government-approved photo ID (Aadhaar, Passport, Voter ID, Driving License) at airport entry.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 flex items-center space-x-1.5 mb-1">
                  <Luggage className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cabin Baggage Rules</span>
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Liquids, aerosols and gels over 100ml are prohibited in hand baggage. Power banks and loose lithium batteries must be in cabin baggage only.
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-4 text-center">
              CredoFly Airlines Ltd. • Customer Helpline: +91 1800-CREDO-FLY • support@credofly.com • GSTIN: 29AAACC1234F1Z5
            </p>
          </div>

        </div>

        {/* Action Buttons (No-print) */}
        <div className="no-print flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save E-Ticket</span>
          </button>
          <Link
            to="/my-bookings"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm rounded-xl border border-slate-300 shadow-sm transition"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>View All My Bookings</span>
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
          >
            <span>Book Another Flight</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
};
