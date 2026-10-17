import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Plane,
  Users,
  Calendar,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Briefcase,
  RefreshCw,
  Info,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  Luggage,
  Sparkles,
} from 'lucide-react';
import { flightApi, bookingApi, paymentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FlightInstanceDetail, BookingFarePreview, Passenger } from '../../types';
import { BookingStepper } from '../../components/booking/BookingStepper';
import { PaymentGatewayModal } from '../../components/booking/PaymentGatewayModal';
import { SeatSelectionMap } from '../../components/booking/SeatSelectionMap';
import { HeroBackground } from '../../components/common/HeroBackground';
import { LoadingScreen } from '../../components/common/LoadingScreen';

interface FormPassenger {
  title: string;
  firstName: string;
  lastName: string;
  type: 'ADULT' | 'CHILD';
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age?: number;
}

export const BookingReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const instanceId = searchParams.get('instanceId');
  const returnInstanceId = searchParams.get('returnInstanceId');
  const isRoundTrip = !!returnInstanceId;

  const initialAdults = Math.max(1, Number(searchParams.get('adults')) || 1);
  const initialChildren = Math.max(0, Number(searchParams.get('children')) || 0);
  const cabinClassParam = searchParams.get('class') || 'ECONOMY';

  // Wizard state: 1 = Flight & Policy, 2 = Passenger Details, 3 = Review Itinerary
  const [step, setStep] = useState<number>(1);
  
  // Outbound flight & preview
  const [flight, setFlight] = useState<FlightInstanceDetail | null>(null);
  const [preview, setPreview] = useState<BookingFarePreview | null>(null);

  // Return flight & preview (for round trips)
  const [returnFlight, setReturnFlight] = useState<FlightInstanceDetail | null>(null);
  const [returnPreview, setReturnPreview] = useState<BookingFarePreview | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Policy tab state in Step 1
  const [policyTab, setPolicyTab] = useState<'baggage' | 'cancellation' | 'dateChange'>('baggage');

  // Passenger & Contact details state in Step 2
  const [adultCount, setAdultCount] = useState<number>(initialAdults);
  const [childCount, setChildCount] = useState<number>(initialChildren);
  const [cabinClass, setCabinClass] = useState<string>(cabinClassParam);
  const [contactEmail, setContactEmail] = useState<string>(user?.email || '');
  const [contactPhone, setContactPhone] = useState<string>(user?.mobileNumber || '');
  const [passengers, setPassengers] = useState<FormPassenger[]>([]);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);

  // Outbound Seat Selection State
  const [isSeatModalOpen, setIsSeatModalOpen] = useState<boolean>(false);
  const [seatAssignments, setSeatAssignments] = useState<
    Array<{ seatNumber?: string; seatPrice?: number }>
  >([]);

  // Return Seat Selection State
  const [isReturnSeatModalOpen, setIsReturnSeatModalOpen] = useState<boolean>(false);
  const [returnSeatAssignments, setReturnSeatAssignments] = useState<
    Array<{ seatNumber?: string; seatPrice?: number }>
  >([]);

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);

  // Prepopulate email and phone from authenticated user
  useEffect(() => {
    if (user?.email && !contactEmail) {
      setContactEmail(user.email);
    }
    if (user?.mobileNumber && !contactPhone) {
      setContactPhone(user.mobileNumber);
    }
  }, [user]);

  // Initialize passenger list
  useEffect(() => {
    const list: FormPassenger[] = [];
    for (let i = 0; i < adultCount; i++) {
      list.push({
        title: 'Mr',
        firstName: i === 0 && user ? (user.name?.split(' ')[0] || user.username.split('_')[0]) : '',
        lastName: i === 0 && user ? (user.name?.split(' ').slice(1).join(' ') || user.username.split('_')[1] || '') : '',
        type: 'ADULT',
        gender: 'MALE',
        age: 28,
      });
    }
    for (let i = 0; i < childCount; i++) {
      list.push({
        title: 'Master',
        firstName: '',
        lastName: '',
        type: 'CHILD',
        gender: 'MALE',
        age: 7,
      });
    }
    setPassengers(list);
  }, [adultCount, childCount, user]);

  // Load flight instance details safely using direct instance endpoint
  useEffect(() => {
    if (!instanceId) {
      navigate('/flights');
      return;
    }

    const loadFlightData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const promises: Promise<any>[] = [
          flightApi.getInstanceById(instanceId, { adults: adultCount, children: childCount }),
          bookingApi.preview({
            flightInstanceId: instanceId,
            adultCount,
            childCount,
            cabinClass,
          }),
        ];

        if (returnInstanceId) {
          promises.push(
            flightApi.getInstanceById(returnInstanceId, { adults: adultCount, children: childCount }),
            bookingApi.preview({
              flightInstanceId: returnInstanceId,
              adultCount,
              childCount,
              cabinClass,
            })
          );
        }

        const results = await Promise.all(promises);
        const flightRes = results[0];
        const previewRes = results[1];

        if (flightRes.data.success && flightRes.data.flight) {
          setFlight(flightRes.data.flight);
        } else {
          setError('Selected outbound flight departure not found.');
        }

        if (previewRes.data.success && previewRes.data.preview) {
          setPreview(previewRes.data.preview);
        }

        if (returnInstanceId && results[2] && results[3]) {
          const retFlightRes = results[2];
          const retPreviewRes = results[3];

          if (retFlightRes.data.success && retFlightRes.data.flight) {
            setReturnFlight(retFlightRes.data.flight);
          } else {
            setError('Selected return flight departure not found.');
          }

          if (retPreviewRes.data.success && retPreviewRes.data.preview) {
            setReturnPreview(retPreviewRes.data.preview);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to retrieve flight details from the server.');
      } finally {
        setIsLoading(false);
      }
    };

    loadFlightData();
  }, [instanceId, returnInstanceId, adultCount, childCount, cabinClass, navigate]);

  const handlePassengerChange = (index: number, field: keyof FormPassenger, value: any) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validatePassengerDetails = () => {
    setError(null);
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.firstName.trim() || !p.lastName.trim()) {
        setError(`Please enter both First Name and Last Name for Passenger #${i + 1} (${p.type}).`);
        return false;
      }
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setError('Please provide a valid contact email address for ticket delivery.');
      return false;
    }
    if (!contactPhone.trim() || contactPhone.length < 8) {
      setError('Please provide a valid mobile contact number.');
      return false;
    }
    return true;
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassengerDetails()) return;
    setStep(3);
  };

  const handleInitiatePayment = () => {
    setError(null);
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the fare and cancellation terms to proceed.');
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleImmediateConfirm = () => {
    setError(null);
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the fare and cancellation terms to proceed.');
      return;
    }
    handlePaymentSuccess('DEMO_PAY');
  };

  const handlePaymentSuccess = async (
    paymentMethod: 'CARD' | 'UPI' | 'NET_BANKING' | 'DEMO_PAY',
    utr?: string
  ) => {
    setIsPaymentModalOpen(false);
    if (!flight) return;

    setIsBookingSubmitting(true);
    setError(null);

    try {
      const formattedPassengers = passengers.map((p, idx) => ({
        name: `${p.title} ${p.firstName.trim()} ${p.lastName.trim()}`.trim(),
        type: p.type,
        gender: p.gender,
        age: p.age,
        seatNumber: seatAssignments[idx]?.seatNumber,
        seatPrice: seatAssignments[idx]?.seatPrice || 0,
      }));

      const formattedReturnPassengers = isRoundTrip
        ? passengers.map((p, idx) => ({
            name: `${p.title} ${p.firstName.trim()} ${p.lastName.trim()}`.trim(),
            type: p.type,
            gender: p.gender,
            age: p.age,
            seatNumber: returnSeatAssignments[idx]?.seatNumber,
            seatPrice: returnSeatAssignments[idx]?.seatPrice || 0,
          }))
        : undefined;

      const res = await bookingApi.create({
        flightInstanceId: flight.id,
        returnFlightInstanceId: returnFlight ? returnFlight.id : undefined,
        adultCount,
        childCount,
        cabinClass,
        contactEmail,
        contactPhone,
        paymentMethod,
        passengers: formattedPassengers,
        returnPassengers: formattedReturnPassengers,
      });

      if (res.data.success && res.data.booking) {
        if (utr) {
          try {
            await paymentApi.submitUtr({
              bookingId: res.data.booking.id,
              transactionRef: utr,
              paymentMethod: 'UPI',
            });
          } catch (e) {
            console.warn('UTR submission note:', e);
          }
        }

        navigate(`/booking/confirmation/${res.data.booking.id}`, {
          state: { booking: res.data.booking },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete reservation. Please try again.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen
        message="Retrieving Real-Time Flight Details & Fare Rules..."
        subMessage="Locking seat inventory snapshot from central database"
      />
    );
  }

  if (error && !flight) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Flight Details Unavailable</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <Link
          to="/flights"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search Results</span>
        </Link>
      </div>
    );
  }

  if (!flight) return null;

  // Outbound Pricing
  const outboundSeatTotal = seatAssignments.reduce((sum, item) => sum + (item.seatPrice || 0), 0);
  const outboundBaseGrandTotal =
    preview?.breakdown.grandTotal ||
    flight.adultFare * adultCount + flight.childFare * childCount + 350 * (adultCount + childCount);

  // Return Pricing (if round trip)
  const returnSeatTotal = returnSeatAssignments.reduce((sum, item) => sum + (item.seatPrice || 0), 0);
  const returnBaseGrandTotal = returnFlight
    ? returnPreview?.breakdown.grandTotal ||
      returnFlight.adultFare * adultCount + returnFlight.childFare * childCount + 350 * (adultCount + childCount)
    : 0;

  const totalSeatCharges = outboundSeatTotal + returnSeatTotal;
  const grandTotal = outboundBaseGrandTotal + returnBaseGrandTotal + totalSeatCharges;

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else navigate(-1);
            }}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Back to Search Results' : 'Back to Previous Step'}</span>
          </button>
          <span className="text-xs font-semibold text-slate-400">Step {step} of 3</span>
        </div>

        {/* Visual Progress Stepper */}
        <BookingStepper currentStep={step} />

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center space-x-3 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Booking Area (8 cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* STEP 1: Flight Itinerary & Policy Details */}
            {step === 1 && (
              <div className="space-y-6">
                
                {/* Outbound Flight Card */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Plane className="w-6 h-6 transform -rotate-45" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-xl font-black text-navy-950">{flight.flightCode}</h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {flight.airlineName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600">
                            {isRoundTrip ? 'Leg 1: Outbound' : 'One Way'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                          {flight.aircraft} &bull; {cabinClass.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                        Travel Date
                      </span>
                      <span className="text-sm font-extrabold text-slate-800">{flight.travelDate}</span>
                    </div>
                  </div>

                  {/* Route & Times */}
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-2xl p-6 text-center items-center">
                    <div>
                      <p className="text-2xl sm:text-3xl font-black text-slate-900">{flight.departureTime}</p>
                      <p className="text-xs font-bold text-slate-600 uppercase mt-1">
                        {flight.origin.match(/\(([^)]+)\)/)?.[1] || flight.origin}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">{flight.origin}</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-xs font-semibold text-slate-500 mb-1">{flight.duration}</span>
                      <div className="w-24 sm:w-36 flex items-center my-1">
                        <div className="w-2 h-2 rounded-full border border-blue-600 bg-white"></div>
                        <div className="flex-1 border-t-2 border-dashed border-slate-300"></div>
                        <Plane className="w-3.5 h-3.5 text-blue-600 transform rotate-90 mx-1" />
                        <div className="flex-1 border-t-2 border-dashed border-slate-300"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Direct Non-Stop
                      </span>
                    </div>

                    <div>
                      <p className="text-2xl sm:text-3xl font-black text-slate-900">{flight.arrivalTime}</p>
                      <p className="text-xs font-bold text-slate-600 uppercase mt-1">
                        {flight.destination.match(/\(([^)]+)\)/)?.[1] || flight.destination}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">{flight.destination}</p>
                    </div>
                  </div>

                  {/* Highlights Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center space-x-2.5">
                      <Luggage className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900">Free Baggage</p>
                        <p className="text-slate-500 text-[11px]">7kg Cabin + 15kg Check-in</p>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center space-x-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900">Instant Confirmation</p>
                        <p className="text-slate-500 text-[11px]">{flight.availableSeats} seats left</p>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center space-x-2.5">
                      <RefreshCw className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900">Flexible Cancellation</p>
                        <p className="text-slate-500 text-[11px]">Easy online self-service</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Flight Card (if round-trip) */}
                {isRoundTrip && returnFlight && (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                          <Plane className="w-6 h-6 transform rotate-135" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h2 className="text-xl font-black text-navy-950">{returnFlight.flightCode}</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {returnFlight.airlineName}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800">
                              Leg 2: Return
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">
                            {returnFlight.aircraft} &bull; {cabinClass.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                          Return Travel Date
                        </span>
                        <span className="text-sm font-extrabold text-slate-800">{returnFlight.travelDate}</span>
                      </div>
                    </div>

                    {/* Return Route & Times */}
                    <div className="grid grid-cols-3 gap-4 bg-indigo-50/40 rounded-2xl p-6 text-center items-center border border-indigo-100/50">
                      <div>
                        <p className="text-2xl sm:text-3xl font-black text-slate-900">{returnFlight.departureTime}</p>
                        <p className="text-xs font-bold text-slate-600 uppercase mt-1">
                          {returnFlight.origin.match(/\(([^)]+)\)/)?.[1] || returnFlight.origin}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">{returnFlight.origin}</p>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-xs font-semibold text-slate-500 mb-1">{returnFlight.duration}</span>
                        <div className="w-24 sm:w-36 flex items-center my-1">
                          <div className="w-2 h-2 rounded-full border border-indigo-600 bg-white"></div>
                          <div className="flex-1 border-t-2 border-dashed border-indigo-300"></div>
                          <Plane className="w-3.5 h-3.5 text-indigo-600 transform rotate-90 mx-1" />
                          <div className="flex-1 border-t-2 border-dashed border-indigo-300"></div>
                          <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                          Direct Non-Stop
                        </span>
                      </div>

                      <div>
                        <p className="text-2xl sm:text-3xl font-black text-slate-900">{returnFlight.arrivalTime}</p>
                        <p className="text-xs font-bold text-slate-600 uppercase mt-1">
                          {returnFlight.destination.match(/\(([^)]+)\)/)?.[1] || returnFlight.destination}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">{returnFlight.destination}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MakeMyTrip-Style Policy Tabs */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <div className="flex border-b border-slate-100 space-x-4">
                    <button
                      type="button"
                      onClick={() => setPolicyTab('baggage')}
                      className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                        policyTab === 'baggage'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Baggage Allowance
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolicyTab('cancellation')}
                      className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                        policyTab === 'cancellation'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Cancellation Rules
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolicyTab('dateChange')}
                      className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                        policyTab === 'dateChange'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Date Change Policy
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 pt-2">
                    {policyTab === 'baggage' && (
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="font-semibold text-slate-700">Cabin Baggage</span>
                          <span className="font-bold text-slate-900">{flight.baggage.cabin}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="font-semibold text-slate-700">Check-In Baggage</span>
                          <span className="font-bold text-slate-900">{flight.baggage.checkIn}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          * Applicable per passenger per flight leg. Excess baggage can be purchased at airport check-in counters.
                        </p>
                      </div>
                    )}

                    {policyTab === 'cancellation' && (
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="font-semibold text-slate-700">More than 72 hours before departure</span>
                          <span className="font-bold text-emerald-700">{flight.policies.cancellation.moreThan72Hrs}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="font-semibold text-slate-700">Within 72 hours of departure</span>
                          <span className="font-bold text-amber-700">{flight.policies.cancellation.within72Hrs}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="font-semibold text-slate-700">Within 4 hours of departure</span>
                          <span className="font-bold text-rose-700">{flight.policies.cancellation.within4Hrs}</span>
                        </div>
                      </div>
                    )}

                    {policyTab === 'dateChange' && (
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="font-semibold text-slate-700">More than 72 hours before departure</span>
                          <span className="font-bold text-slate-900">{flight.policies.dateChange.moreThan72Hrs}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="font-semibold text-slate-700">Within 72 hours of departure</span>
                          <span className="font-bold text-slate-900">{flight.policies.dateChange.within72Hrs}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Continue Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition"
                  >
                    <span>Continue to Passenger Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Passenger Details Form */}
            {step === 2 && (
              <form onSubmit={handleProceedToReview} className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-bold text-navy-950 flex items-center space-x-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span>Enter Passenger Details</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Please enter name as per government photo ID (Aadhaar / Passport / Voter ID).
                      </p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {passengers.length} Traveler{passengers.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Passenger Input Fields */}
                  <div className="space-y-4">
                    {passengers.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{p.type === 'ADULT' ? 'Adult Passenger (Age 12+)' : 'Child Passenger (Age 2-11)'}</span>
                          </span>

                          <div className="flex items-center space-x-2">
                            {/* Outbound Seat status */}
                            {seatAssignments[idx]?.seatNumber ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[11px] font-bold">
                                <span>Out: {seatAssignments[idx]?.seatNumber}</span>
                              </span>
                            ) : null}

                            {/* Return Seat status */}
                            {isRoundTrip && returnSeatAssignments[idx]?.seatNumber ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-md text-[11px] font-bold">
                                <span>Ret: {returnSeatAssignments[idx]?.seatNumber}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          {/* Title */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Title
                            </label>
                            <select
                              value={p.title}
                              onChange={(e) => handlePassengerChange(idx, 'title', e.target.value)}
                              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                            >
                              {p.type === 'ADULT' ? (
                                <>
                                  <option value="Mr">Mr</option>
                                  <option value="Ms">Ms</option>
                                  <option value="Mrs">Mrs</option>
                                </>
                              ) : (
                                <>
                                  <option value="Master">Master</option>
                                  <option value="Miss">Miss</option>
                                </>
                              )}
                            </select>
                          </div>

                          {/* First Name */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              First & Middle Name
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. John"
                              value={p.firstName}
                              onChange={(e) => handlePassengerChange(idx, 'firstName', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                            />
                          </div>

                          {/* Last Name */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Last Name
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Doe"
                              value={p.lastName}
                              onChange={(e) => handlePassengerChange(idx, 'lastName', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                            />
                          </div>

                          {/* Gender */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Gender
                            </label>
                            <select
                              value={p.gender}
                              onChange={(e) => handlePassengerChange(idx, 'gender', e.target.value)}
                              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                            >
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Seat Selection Banner 1: Outbound Leg */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                        <Plane className="w-6 h-6 transform -rotate-45" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-navy-950 text-sm">
                          {isRoundTrip ? `Outbound Flight Seats: ${flight.flightCode}` : 'Interactive Aircraft Seat Map (3-3 Layout)'}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Pick preferred seats: Window, Aisle, Extra Legroom (Row 13), Emergency Exit (Row 12), or Business.
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {passengers.map((p, idx) => {
                            const seat = seatAssignments[idx];
                            return (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  seat?.seatNumber
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-300 text-slate-600'
                                }`}
                              >
                                Pax {idx + 1}: {seat?.seatNumber ? `${seat.seatNumber} (+₹${seat.seatPrice})` : 'Auto-Assign'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSeatModalOpen(true)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isRoundTrip ? 'Select Outbound Seats' : 'Select Seats on Map'}</span>
                    </button>
                  </div>

                  {/* Seat Selection Banner 2: Return Leg (if Round Trip) */}
                  {isRoundTrip && returnFlight && (
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
                          <Plane className="w-6 h-6 transform rotate-135" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-navy-950 text-sm">
                            Return Flight Seats: {returnFlight.flightCode}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Select your seats for the journey back: {returnFlight.origin} &rarr; {returnFlight.destination}.
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {passengers.map((p, idx) => {
                              const seat = returnSeatAssignments[idx];
                              return (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    seat?.seatNumber
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-300 text-slate-600'
                                  }`}
                                >
                                  Pax {idx + 1}: {seat?.seatNumber ? `${seat.seatNumber} (+₹${seat.seatPrice})` : 'Auto-Assign'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsReturnSeatModalOpen(true)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 whitespace-nowrap"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Select Return Seats</span>
                      </button>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Contact Information (Ticket & Updates Will Be Sent Here)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="email"
                            required
                            placeholder="your.email@example.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Mobile Number
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="tel"
                            required
                            placeholder="10-digit mobile number"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    &larr; Back to Flight
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition"
                  >
                    <span>Proceed to Review Itinerary</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Review Itinerary & Final Summary */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-navy-950">Review Your Itinerary</h3>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Seats Held for 10 Minutes
                    </span>
                  </div>

                  {/* Outbound Flight Summary Box */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                        <Plane className="w-4 h-4 transform -rotate-45" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-extrabold text-navy-950 text-sm">
                            {flight.flightCode} &bull; {flight.origin} &rarr; {flight.destination}
                          </p>
                          {isRoundTrip && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.2 rounded">
                              Outbound
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {flight.travelDate} &bull; {flight.departureTime} &rarr; {flight.arrivalTime} ({flight.duration})
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                      {cabinClass.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Return Flight Summary Box (if round-trip) */}
                  {isRoundTrip && returnFlight && (
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                          <Plane className="w-4 h-4 transform rotate-135" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-extrabold text-navy-950 text-sm">
                              {returnFlight.flightCode} &bull; {returnFlight.origin} &rarr; {returnFlight.destination}
                            </p>
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.2 rounded">
                              Return
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {returnFlight.travelDate} &bull; {returnFlight.departureTime} &rarr; {returnFlight.arrivalTime} ({returnFlight.duration})
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-900 bg-white px-3 py-1.5 rounded-xl border border-indigo-200">
                        {cabinClass.replace('_', ' ')}
                      </span>
                    </div>
                  )}

                  {/* Verified Passengers Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Confirmed Passenger List ({passengers.length})
                    </h4>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Gender</th>
                            <th className="py-2.5 px-3">Outbound Seat</th>
                            {isRoundTrip && <th className="py-2.5 px-3">Return Seat</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {passengers.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {p.title} {p.firstName} {p.lastName}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{p.type}</td>
                              <td className="py-2.5 px-3 text-slate-600">{p.gender}</td>
                              
                              {/* Outbound assigned seat */}
                              <td className="py-2.5 px-3">
                                {seatAssignments[idx]?.seatNumber ? (
                                  <span className="font-bold text-blue-600">
                                    {seatAssignments[idx]?.seatNumber}
                                    <span className="text-[10px] text-slate-500 ml-1 font-normal">
                                      ({seatAssignments[idx]?.seatPrice ? `+₹${seatAssignments[idx]?.seatPrice}` : 'Free'})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Auto-Assigned</span>
                                )}
                              </td>

                              {/* Return assigned seat */}
                              {isRoundTrip && (
                                <td className="py-2.5 px-3">
                                  {returnSeatAssignments[idx]?.seatNumber ? (
                                    <span className="font-bold text-indigo-600">
                                      {returnSeatAssignments[idx]?.seatNumber}
                                      <span className="text-[10px] text-slate-500 ml-1 font-normal">
                                        ({returnSeatAssignments[idx]?.seatPrice ? `+₹${returnSeatAssignments[idx]?.seatPrice}` : 'Free'})
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Auto-Assigned</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Terms acceptance */}
                  <div className="pt-4 border-t border-slate-100">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-600 leading-relaxed">
                        I acknowledge and accept the <strong>CredoFly Baggage, Cancellation & Date Change Policies</strong>, and confirm that all passenger names match their government-issued identity documents.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    &larr; Edit Passengers
                  </button>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={isBookingSubmitting}
                      onClick={handleInitiatePayment}
                      className="w-full sm:w-auto px-4 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pay via UPI / Card (Optional)</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBookingSubmitting}
                      onClick={handleImmediateConfirm}
                      className="w-full sm:w-auto px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition"
                    >
                      {isBookingSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Confirming Reservation...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>Confirm Booking (Instant)</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: MakeMyTrip Fare Breakdown Card (4 cols) */}
          <div className="lg:col-span-4 space-y-4 sticky top-24">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-navy-950 text-base border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Fare Breakdown</span>
                {isRoundTrip && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full uppercase">
                    Round Trip
                  </span>
                )}
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600">
                {/* Outbound Leg Subtotal */}
                <div>
                  <div className="flex justify-between py-1 font-semibold text-slate-800">
                    <span>
                      {isRoundTrip ? 'Outbound Airfare' : `Base Fare (${adultCount} Ad${childCount > 0 ? `, ${childCount} Ch` : ''})`}
                    </span>
                    <span className="font-bold text-slate-900">
                      ₹{((preview?.breakdown.baseTotal || flight.adultFare * adultCount + flight.childFare * childCount)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-400 text-[11px]">
                    <span>Taxes & Airport Development Fee</span>
                    <span>₹{(preview?.breakdown.taxesAndFees || 350 * (adultCount + childCount)).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Return Leg Subtotal (if round trip) */}
                {isRoundTrip && returnFlight && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between py-1 font-semibold text-indigo-900">
                      <span>Return Airfare</span>
                      <span className="font-bold text-slate-900">
                        ₹{((returnPreview?.breakdown.baseTotal || returnFlight.adultFare * adultCount + returnFlight.childFare * childCount)).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 text-slate-400 text-[11px]">
                      <span>Taxes & Airport Development Fee</span>
                      <span>₹{(returnPreview?.breakdown.taxesAndFees || 350 * (adultCount + childCount)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}

                {/* Seat Charges */}
                {totalSeatCharges > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex justify-between py-1 text-blue-600">
                    <span className="font-medium">
                      Seat Selection Charges
                    </span>
                    <span className="font-bold">+₹{totalSeatCharges.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-black text-navy-950">Grand Total</span>
                    <p className="text-[10px] text-slate-400">
                      {isRoundTrip ? 'Both flight legs, taxes & seats' : 'All taxes & seat selection included'}
                    </p>
                  </div>
                  <span className="text-2xl font-black text-blue-600">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>100% Price Lock:</strong> Fares are verified and held by our central reservation engine.
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Outbound Top-Down Aircraft Seat Selection Modal */}
      {isSeatModalOpen && flight && (
        <SeatSelectionMap
          flightInstanceId={flight.id}
          passengers={passengers.map((p) => ({
            name: `${p.title} ${p.firstName} ${p.lastName}`.trim(),
            type: p.type,
          }))}
          currentAssignments={seatAssignments}
          onConfirmSeats={(assignments) => {
            setSeatAssignments(assignments);
            setIsSeatModalOpen(false);
          }}
          onClose={() => setIsSeatModalOpen(false)}
        />
      )}

      {/* Return Top-Down Aircraft Seat Selection Modal (if round-trip) */}
      {isReturnSeatModalOpen && returnFlight && (
        <SeatSelectionMap
          flightInstanceId={returnFlight.id}
          passengers={passengers.map((p) => ({
            name: `${p.title} ${p.firstName} ${p.lastName}`.trim(),
            type: p.type,
          }))}
          currentAssignments={returnSeatAssignments}
          onConfirmSeats={(assignments) => {
            setReturnSeatAssignments(assignments);
            setIsReturnSeatModalOpen(false);
          }}
          onClose={() => setIsReturnSeatModalOpen(false)}
        />
      )}

      {/* MakeMyTrip-Style Interactive Payment Gateway Modal with Google Pay QR */}
      <PaymentGatewayModal
        isOpen={isPaymentModalOpen}
        amount={grandTotal}
        bookingSummary={{
          flightCode: isRoundTrip && returnFlight ? `${flight.flightCode} + ${returnFlight.flightCode}` : flight.flightCode,
          route: isRoundTrip && returnFlight
            ? `${flight.origin} ⇄ ${flight.destination}`
            : `${flight.origin} → ${flight.destination}`,
          travelDate: isRoundTrip && returnFlight
            ? `${flight.travelDate} to ${returnFlight.travelDate}`
            : flight.travelDate,
          passengersCount: passengers.length,
        }}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
