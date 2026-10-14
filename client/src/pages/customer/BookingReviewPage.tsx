import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plane, Users, Calendar, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { flightApi, bookingApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SearchFlightResult } from '../../types';

export const BookingReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const instanceId = searchParams.get('instanceId');
  const initialAdults = Number(searchParams.get('adults')) || 1;
  const initialChildren = Number(searchParams.get('children')) || 0;
  const travelDateParam = searchParams.get('date') || '';

  const [flight, setFlight] = useState<SearchFlightResult | null>(null);
  const [adultCount, setAdultCount] = useState<number>(initialAdults);
  const [childCount, setChildCount] = useState<number>(initialChildren);
  const [passengers, setPassengers] = useState<Array<{ name: string; type: 'ADULT' | 'CHILD' }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize passenger list whenever adultCount or childCount changes
  useEffect(() => {
    const list: Array<{ name: string; type: 'ADULT' | 'CHILD' }> = [];
    for (let i = 0; i < adultCount; i++) {
      list.push({
        name: i === 0 && user ? user.username.replace('_', ' ') : '',
        type: 'ADULT',
      });
    }
    for (let i = 0; i < childCount; i++) {
      list.push({ name: '', type: 'CHILD' });
    }
    setPassengers(list);
  }, [adultCount, childCount, user]);

  // Fetch flight instance details
  useEffect(() => {
    if (!instanceId) {
      navigate('/flights');
      return;
    }

    const loadFlight = async () => {
      try {
        // Query search endpoint or direct flight
        const res = await flightApi.search({
          origin: '',
          destination: '',
          travelDate: travelDateParam,
          adults: adultCount,
          children: childCount,
        });
        if (res.data.success) {
          const found = res.data.flights.find((f: SearchFlightResult) => f.id === instanceId);
          if (found) {
            setFlight(found);
          } else {
            setError('Selected flight departure is no longer available.');
          }
        }
      } catch {
        setError('Failed to retrieve flight details.');
      }
    };

    loadFlight();
  }, [instanceId, travelDateParam]);

  const handlePassengerNameChange = (index: number, name: string) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name };
      return updated;
    });
  };

  const adultFare = flight?.adultFare || 0;
  const childFare = flight?.childFare || 0;
  const adultSubtotal = adultFare * adultCount;
  const childSubtotal = childFare * childCount;
  const grandTotal = adultSubtotal + childSubtotal;

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      // Prompt user to log in before completing booking
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    // Validate that all passenger names are filled
    for (let i = 0; i < passengers.length; i++) {
      if (!passengers[i].name.trim()) {
        setError(`Please enter the full name for Passenger #${i + 1} (${passengers[i].type}).`);
        return;
      }
    }

    if (!flight) return;

    setIsSubmitting(true);
    try {
      const res = await bookingApi.create({
        flightInstanceId: flight.id,
        adultCount,
        childCount,
        passengers,
      });

      if (res.data.success && res.data.booking) {
        // Navigate to confirmation page
        navigate(`/booking/confirmation/${res.data.booking.id}`, {
          state: { booking: res.data.booking },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Booking could not be confirmed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!flight && !error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search Results</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 mb-6">
          Flight Details & Booking Review
        </h1>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center space-x-3 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {flight && (
          <form onSubmit={handleConfirmBooking} className="space-y-6">
            {/* Flight Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <Plane className="w-5 h-5 transform -rotate-45" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-navy-950">{flight.flightCode}</h2>
                    <p className="text-xs font-semibold text-slate-500">
                      {flight.origin} &rarr; {flight.destination}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs font-semibold text-slate-400 block uppercase">Travel Date</span>
                  <span className="text-sm font-bold text-slate-800">{travelDateParam}</span>
                </div>
              </div>

              {/* Timing Grid */}
              <div className="grid grid-cols-3 gap-4 pt-4 items-center text-center">
                <div>
                  <p className="text-2xl font-black text-slate-900">{flight.departureTime}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{flight.origin}</p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 font-medium">{flight.duration}</span>
                  <div className="w-full flex items-center px-4 my-1">
                    <div className="h-0.5 w-full bg-slate-200"></div>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600">Aircraft A320</span>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{flight.arrivalTime}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{flight.destination}</p>
                </div>
              </div>

              {/* Base Fare Tags */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-xl">
                <span>
                  Adult Fare: <strong className="text-slate-900">₹{flight.adultFare.toLocaleString('en-IN')}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Child Fare: <strong className="text-slate-900">₹{flight.childFare.toLocaleString('en-IN')}</strong>
                </span>
                <span>&bull;</span>
                <span className="text-emerald-700 font-semibold">
                  {flight.availableSeats} seats currently available
                </span>
              </div>
            </div>

            {/* Passenger Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                <h3 className="text-lg font-bold text-navy-950 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Passenger Details</span>
                </h3>

                {/* Adjust passenger count */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-slate-600">Adults:</span>
                    <select
                      value={adultCount}
                      onChange={(e) => setAdultCount(Number(e.target.value))}
                      className="px-2 py-1 border border-slate-300 rounded-lg font-bold"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-slate-600">Children:</span>
                    <select
                      value={childCount}
                      onChange={(e) => setChildCount(Number(e.target.value))}
                      className="px-2 py-1 border border-slate-300 rounded-lg font-bold"
                    >
                      {[0, 1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Names input table */}
              <div className="space-y-3 pt-2">
                {passengers.map((p, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="w-28 flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {p.type === 'ADULT' ? 'Adult (12+)' : 'Child (2-11)'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        placeholder={`Full Name for Passenger ${idx + 1}`}
                        value={p.name}
                        onChange={(e) => handlePassengerNameChange(idx, e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Fare Breakdown Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-navy-950">Fare Summary</h3>
              
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between py-1">
                  <span>
                    Adult Passenger{adultCount > 1 ? 's' : ''} ({adultCount} &times; ₹{flight.adultFare.toLocaleString('en-IN')})
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{adultSubtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                {childCount > 0 && (
                  <div className="flex justify-between py-1">
                    <span>
                      Child Passenger{childCount > 1 ? 's' : ''} ({childCount} &times; ₹{flight.childFare.toLocaleString('en-IN')})
                    </span>
                    <span className="font-semibold text-slate-900">
                      ₹{childSubtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="text-base font-bold text-navy-950">Grand Total</span>
                    <p className="text-xs text-slate-500">Taxes, airport fees, and instant seat reservation included</p>
                  </div>
                  <span className="text-2xl font-black text-blue-600">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {!user && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
                  <strong>Notice:</strong> You will be asked to sign in or register before your booking is created.
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Confirming Reservation...</span>
                    </>
                  ) : (
                    <span>Confirm Booking</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
