import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plane,
  ArrowRight,
  Clock,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  SlidersHorizontal,
  Luggage,
  ShieldCheck,
  Check,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { flightApi } from '../../services/api';
import { SearchFlightResult } from '../../types';
import { LowFareCalendarBar } from '../../components/flights/LowFareCalendarBar';
import { HeroBackground } from '../../components/common/HeroBackground';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tripTypeParam = searchParams.get('tripType');
  const returnDateParam = searchParams.get('returnDate');
  const tripType: 'oneway' | 'roundtrip' =
    tripTypeParam === 'roundtrip' || returnDateParam ? 'roundtrip' : 'oneway';

  const origin = searchParams.get('origin') || 'Bangalore (BLR)';
  const destination = searchParams.get('destination') || 'Delhi (DEL)';
  const travelDate =
    searchParams.get('travelDate') ||
    new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const returnDate =
    returnDateParam ||
    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
  const adults = Number(searchParams.get('adults')) || 1;
  const children = Number(searchParams.get('children')) || 0;
  const cabinClass = searchParams.get('class') || 'ECONOMY';

  // Active leg for round trip: 'outbound' or 'return'
  const [activeLeg, setActiveLeg] = useState<'outbound' | 'return'>('outbound');

  // Flight results state
  const [rawOutboundFlights, setRawOutboundFlights] = useState<SearchFlightResult[]>([]);
  const [rawReturnFlights, setRawReturnFlights] = useState<SearchFlightResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected flights for Round Trip
  const [selectedOutbound, setSelectedOutbound] = useState<SearchFlightResult | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<SearchFlightResult | null>(null);

  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState<'cheapest' | 'earliest' | 'fastest'>('cheapest');
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);

  // Modify search drawer state
  const [isModifying, setIsModifying] = useState<boolean>(false);
  const [modTripType, setModTripType] = useState<'oneway' | 'roundtrip'>(tripType);
  const [modOrigin, setModOrigin] = useState(origin);
  const [modDestination, setModDestination] = useState(destination);
  const [modDate, setModDate] = useState(travelDate);
  const [modReturnDate, setModReturnDate] = useState(returnDate);
  const [modAdults, setModAdults] = useState(adults);
  const [modChildren, setModChildren] = useState(children);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (tripType === 'roundtrip') {
          // Fetch both outbound and return flights independently
          const [outboundRes, returnRes] = await Promise.all([
            flightApi.search({
              origin,
              destination,
              travelDate,
              adults,
              children,
              tripType: 'roundtrip',
              returnDate,
            }),
            flightApi.search({
              origin: destination,
              destination: origin,
              travelDate: returnDate,
              adults,
              children,
              tripType: 'oneway',
            }),
          ]);

          if (outboundRes.data.success) {
            setRawOutboundFlights(outboundRes.data.flights);
            if (outboundRes.data.flights.length > 0 && !selectedOutbound) {
              setSelectedOutbound(outboundRes.data.flights[0]);
            }
          }
          if (returnRes.data.success) {
            setRawReturnFlights(returnRes.data.flights);
            if (returnRes.data.flights.length > 0 && !selectedReturn) {
              setSelectedReturn(returnRes.data.flights[0]);
            }
          }
        } else {
          // One-way search
          const res = await flightApi.search({
            origin,
            destination,
            travelDate,
            adults,
            children,
            tripType: 'oneway',
          });
          if (res.data.success) {
            setRawOutboundFlights(res.data.flights);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to search flights. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [origin, destination, travelDate, returnDate, adults, children, tripType]);

  const handleApplyModifiedSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (modOrigin.trim().toLowerCase() === modDestination.trim().toLowerCase()) {
      setError('Origin and destination must be different.');
      return;
    }
    if (modTripType === 'roundtrip' && modReturnDate < modDate) {
      setError('Return date cannot be earlier than departure date.');
      return;
    }

    const nextParams: Record<string, string> = {
      tripType: modTripType,
      origin: modOrigin,
      destination: modDestination,
      travelDate: modDate,
      adults: modAdults.toString(),
      children: modChildren.toString(),
      class: cabinClass,
    };
    if (modTripType === 'roundtrip') {
      nextParams.returnDate = modReturnDate;
    }

    setSearchParams(nextParams);
    setIsModifying(false);
  };

  const handleSelectFlight = (flight: SearchFlightResult) => {
    if (tripType === 'oneway') {
      navigate(
        `/booking/review?instanceId=${flight.id}&adults=${adults}&children=${children}&date=${travelDate}&class=${cabinClass}`
      );
    } else {
      // Round trip leg selection
      if (activeLeg === 'outbound') {
        setSelectedOutbound(flight);
        if (!selectedReturn) {
          setActiveLeg('return');
        }
      } else {
        setSelectedReturn(flight);
      }
    }
  };

  const handleProceedRoundTripBooking = () => {
    if (!selectedOutbound) {
      setActiveLeg('outbound');
      setError('Please select an outbound flight to continue.');
      return;
    }
    if (!selectedReturn) {
      setActiveLeg('return');
      setError('Please select a return flight to continue.');
      return;
    }

    navigate(
      `/booking/review?instanceId=${selectedOutbound.id}&returnInstanceId=${selectedReturn.id}&adults=${adults}&children=${children}&date=${travelDate}&returnDate=${returnDate}&class=${cabinClass}`
    );
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Determine current flight list based on active leg
  const currentFlights = tripType === 'roundtrip' && activeLeg === 'return'
    ? rawReturnFlights
    : rawOutboundFlights;

  const currentLegOrigin = tripType === 'roundtrip' && activeLeg === 'return' ? destination : origin;
  const currentLegDestination = tripType === 'roundtrip' && activeLeg === 'return' ? origin : destination;
  const currentLegDate = tripType === 'roundtrip' && activeLeg === 'return' ? returnDate : travelDate;

  // Filter & Sort Flights
  const filteredFlights = currentFlights.filter((flight) => {
    if (timeFilter === 'all') return true;
    const hour = parseInt(flight.departureTime.split(':')[0], 10);
    if (timeFilter === 'morning') return hour >= 4 && hour < 12;
    if (timeFilter === 'afternoon') return hour >= 12 && hour < 18;
    if (timeFilter === 'evening') return hour >= 18 || hour < 4;
    return true;
  });

  const sortedFlights = [...filteredFlights].sort((a, b) => {
    if (sortBy === 'cheapest') return a.totalFare - b.totalFare;
    if (sortBy === 'earliest') return a.departureTime.localeCompare(b.departureTime);
    if (sortBy === 'fastest') {
      const getMins = (dur: string) => {
        const parts = dur.match(/(\d+)h\s*(\d*)m?/);
        if (!parts) return 180;
        return parseInt(parts[1], 10) * 60 + (parts[2] ? parseInt(parts[2], 10) : 0);
      };
      return getMins(a.duration) - getMins(b.duration);
    }
    return 0;
  });

  const totalRoundTripFare =
    (selectedOutbound?.totalFare || 0) + (selectedReturn?.totalFare || 0);

  return (
    <div className={`bg-slate-50 min-h-screen ${tripType === 'roundtrip' ? 'pb-28' : ''}`}>
      {/* Search Summary Header Banner with Hero Background */}
      <HeroBackground variant="banner" className="mb-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5 text-xl sm:text-2xl font-black text-white">
                <span>{origin}</span>
                {tripType === 'roundtrip' ? (
                  <RefreshCw className="w-5 h-5 text-sky-400" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-sky-400" />
                )}
                <span>{destination}</span>
                {tripType === 'roundtrip' && (
                  <span className="text-xs font-bold text-sky-200 bg-sky-900/60 border border-sky-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider ml-2">
                    Round Trip
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-300 mt-1">
                {formatDateDisplay(travelDate)}
                {tripType === 'roundtrip' ? ` — ${formatDateDisplay(returnDate)}` : ''} &bull; {adults} Adult{adults > 1 ? 's' : ''}
                {children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''} &bull;{' '}
                <span className="text-sky-300 font-semibold">{cabinClass.replace('_', ' ')}</span>
              </p>
            </div>
            <div>
              <button
                onClick={() => setIsModifying(!isModifying)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 border border-white/20 rounded-xl text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm transition shadow-sm"
              >
                <span>Modify Search</span>
                {isModifying ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible Modify Form */}
          {isModifying && (
            <form onSubmit={handleApplyModifiedSearch} className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex space-x-3 mb-4">
                <button
                  type="button"
                  onClick={() => setModTripType('oneway')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    modTripType === 'oneway' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  One Way
                </button>
                <button
                  type="button"
                  onClick={() => setModTripType('roundtrip')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    modTripType === 'roundtrip' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Round Trip
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">From</label>
                  <input
                    type="text"
                    value={modOrigin}
                    onChange={(e) => setModOrigin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
                  <input
                    type="text"
                    value={modDestination}
                    onChange={(e) => setModDestination(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Departure</label>
                  <input
                    type="date"
                    value={modDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setModDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
                {modTripType === 'roundtrip' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Return</label>
                    <input
                      type="date"
                      value={modReturnDate}
                      min={modDate}
                      onChange={(e) => setModReturnDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Passengers</label>
                  <div className="flex space-x-1">
                    <select
                      value={modAdults}
                      onChange={(e) => setModAdults(Number(e.target.value))}
                      className="w-1/2 px-2 py-2 border border-slate-300 rounded-xl text-xs"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} Ad</option>
                      ))}
                    </select>
                    <select
                      value={modChildren}
                      onChange={(e) => setModChildren(Number(e.target.value))}
                      className="w-1/2 px-2 py-2 border border-slate-300 rounded-xl text-xs"
                    >
                      {[0, 1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>{n} Ch</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModifying(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Update Results
                </button>
              </div>
            </form>
          )}
        </div>
      </HeroBackground>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

        {/* Round Trip Leg Switcher Tabs (MakeMyTrip Style) */}
        {tripType === 'roundtrip' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Outbound Leg Card */}
            <div
              onClick={() => setActiveLeg('outbound')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                activeLeg === 'outbound'
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                    activeLeg === 'outbound' ? 'bg-blue-600' : 'bg-slate-400'
                  }`}
                >
                  <Plane className="w-5 h-5 transform -rotate-45" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    1. Outbound Flight
                  </span>
                  <p className="text-sm font-black text-navy-950">
                    {origin.match(/\(([^)]+)\)/)?.[1] || origin} &rarr; {destination.match(/\(([^)]+)\)/)?.[1] || destination}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatDateDisplay(travelDate)}</p>
                </div>
              </div>

              <div className="text-right">
                {selectedOutbound ? (
                  <div>
                    <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mb-0.5">
                      {selectedOutbound.flightCode}
                    </span>
                    <p className="text-xs font-black text-slate-900">
                      ₹{selectedOutbound.adultFare.toLocaleString('en-IN')}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-blue-600 font-bold">Select Flight</span>
                )}
              </div>
            </div>

            {/* Return Leg Card */}
            <div
              onClick={() => setActiveLeg('return')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                activeLeg === 'return'
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                    activeLeg === 'return' ? 'bg-blue-600' : 'bg-slate-400'
                  }`}
                >
                  <Plane className="w-5 h-5 transform rotate-135" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    2. Return Flight
                  </span>
                  <p className="text-sm font-black text-navy-950">
                    {destination.match(/\(([^)]+)\)/)?.[1] || destination} &rarr; {origin.match(/\(([^)]+)\)/)?.[1] || origin}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatDateDisplay(returnDate)}</p>
                </div>
              </div>

              <div className="text-right">
                {selectedReturn ? (
                  <div>
                    <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mb-0.5">
                      {selectedReturn.flightCode}
                    </span>
                    <p className="text-xs font-black text-slate-900">
                      ₹{selectedReturn.adultFare.toLocaleString('en-IN')}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-blue-600 font-bold">Select Flight</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Low-Fare Date Carousel / Matrix for current leg */}
        <LowFareCalendarBar
          origin={currentLegOrigin}
          destination={currentLegDestination}
          selectedDate={currentLegDate}
          onSelectDate={(newDate) => {
            if (tripType === 'roundtrip' && activeLeg === 'return') {
              setSearchParams({
                tripType,
                origin,
                destination,
                travelDate,
                returnDate: newDate,
                adults: adults.toString(),
                children: children.toString(),
                class: cabinClass,
              });
            } else {
              setSearchParams({
                tripType,
                origin,
                destination,
                travelDate: newDate,
                returnDate,
                adults: adults.toString(),
                children: children.toString(),
                class: cabinClass,
              });
            }
          }}
        />

        {/* Filter & Sorting Bar */}
        {!isLoading && currentFlights.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Sorting Tabs */}
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span className="text-slate-400 mr-1 uppercase tracking-wider text-[11px]">Sort By:</span>
              <button
                type="button"
                onClick={() => setSortBy('cheapest')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  sortBy === 'cheapest'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cheapest First
              </button>
              <button
                type="button"
                onClick={() => setSortBy('earliest')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  sortBy === 'earliest'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Earliest Departure
              </button>
              <button
                type="button"
                onClick={() => setSortBy('fastest')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  sortBy === 'fastest'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Fastest First
              </button>
            </div>

            {/* Time Slot Filter Pills */}
            <div className="flex items-center space-x-1.5 text-xs font-medium">
              <span className="text-slate-400 mr-1 uppercase tracking-wider text-[11px]">Departure:</span>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs ${
                  timeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Day
              </button>
              <button
                onClick={() => setTimeFilter('morning')}
                className={`px-2.5 py-1 rounded-lg text-xs ${
                  timeFilter === 'morning' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Morning (6am-12pm)
              </button>
              <button
                onClick={() => setTimeFilter('afternoon')}
                className={`px-2.5 py-1 rounded-lg text-xs ${
                  timeFilter === 'afternoon' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Afternoon (12-6pm)
              </button>
              <button
                onClick={() => setTimeFilter('evening')}
                className={`px-2.5 py-1 rounded-lg text-xs ${
                  timeFilter === 'evening' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Evening (6pm+)
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="h-6 bg-slate-200 rounded w-1/4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/3"></div>
                <div className="h-10 bg-slate-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-3xl flex items-center space-x-3 mb-6">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && sortedFlights.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plane className="w-8 h-8 transform -rotate-45" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Flights Found for This Leg</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              We couldn't find any flights for {currentLegOrigin} &rarr; {currentLegDestination} on {formatDateDisplay(currentLegDate)}. Try choosing an adjacent date or clearing filters.
            </p>
            <button
              onClick={() => {
                setTimeFilter('all');
                setIsModifying(true);
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm"
            >
              Modify Dates & Route
            </button>
          </div>
        )}

        {/* Flight Cards List */}
        {!isLoading && !error && sortedFlights.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 px-1">
              <span>
                Showing {sortedFlights.length} flight{sortedFlights.length > 1 ? 's' : ''} for{' '}
                <strong className="text-slate-800">
                  {currentLegOrigin.match(/\(([^)]+)\)/)?.[1] || currentLegOrigin} &rarr;{' '}
                  {currentLegDestination.match(/\(([^)]+)\)/)?.[1] || currentLegDestination}
                </strong>
              </span>
              <span className="text-emerald-700">All prices include base fare, taxes, and baggage</span>
            </div>

            {sortedFlights.map((flight) => {
              const isExpanded = expandedFlightId === flight.id;
              const isSelected =
                (tripType === 'roundtrip' && activeLeg === 'outbound' && selectedOutbound?.id === flight.id) ||
                (tripType === 'roundtrip' && activeLeg === 'return' && selectedReturn?.id === flight.id);

              return (
                <div
                  key={flight.id}
                  className={`bg-white rounded-3xl border transition-all space-y-4 p-6 shadow-sm ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-100 shadow-md bg-blue-50/10'
                      : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Airline & Code */}
                    <div className="w-full md:w-44 flex md:flex-col items-center md:items-start justify-between border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                          <Plane className="w-4 h-4 transform -rotate-45" />
                        </div>
                        <div>
                          <span className="text-base font-black text-navy-950 tracking-tight">
                            {flight.flightCode}
                          </span>
                          <p className="text-[11px] text-slate-400 font-medium leading-none">CredoFly Express</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 mt-2">Airbus A320</span>
                    </div>

                    {/* Departure, Diagram & Arrival */}
                    <div className="flex-1 flex items-center justify-center space-x-6 sm:space-x-10 w-full">
                      {/* Departure */}
                      <div className="text-center sm:text-left">
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                          {flight.departureTime}
                        </p>
                        <p className="text-xs font-bold text-slate-600 uppercase mt-0.5">
                          {flight.origin.match(/\(([^)]+)\)/)?.[1] || flight.origin}
                        </p>
                      </div>

                      {/* Flight Duration graphic */}
                      <div className="flex flex-col items-center px-2">
                        <span className="text-[11px] font-semibold text-slate-500 mb-1">
                          {flight.duration}
                        </span>
                        <div className="w-24 sm:w-36 flex items-center">
                          <div className="w-2 h-2 rounded-full border border-blue-600 bg-white"></div>
                          <div className="flex-1 border-t-2 border-dashed border-slate-300"></div>
                          <Plane className="w-3.5 h-3.5 text-blue-600 transform rotate-90 mx-1" />
                          <div className="flex-1 border-t-2 border-dashed border-slate-300"></div>
                          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 border border-emerald-200">
                          Direct Non-stop
                        </span>
                      </div>

                      {/* Arrival */}
                      <div className="text-center sm:text-right">
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                          {flight.arrivalTime}
                        </p>
                        <p className="text-xs font-bold text-slate-600 uppercase mt-0.5">
                          {flight.destination.match(/\(([^)]+)\)/)?.[1] || flight.destination}
                        </p>
                      </div>
                    </div>

                    {/* Pricing & Selection */}
                    <div className="w-full md:w-56 flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-3">
                      <div className="text-left md:text-right">
                        <div className="text-xl sm:text-2xl font-black text-slate-900">
                          ₹{flight.adultFare.toLocaleString('en-IN')}
                        </div>
                        <p className="text-[11px] text-slate-500">per adult</p>
                        <div className="mt-1">
                          <span
                            className={`text-xs font-bold ${
                              flight.availableSeats <= 8 ? 'text-amber-600' : 'text-emerald-700'
                            }`}
                          >
                            {flight.availableSeats} seats left
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectFlight(flight)}
                        className={`px-6 py-2.5 font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                        }`}
                      >
                        {isSelected ? '✓ Selected' : tripType === 'roundtrip' ? 'Select Leg' : 'Select Flight'}
                      </button>
                    </div>
                  </div>

                  {/* Flight Card Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center space-x-1 text-slate-600">
                        <Luggage className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cabin: 7kg &bull; Check-in: 15kg</span>
                      </span>
                      <span className="hidden sm:inline">&bull;</span>
                      <span className="text-emerald-700 font-semibold hidden sm:inline">
                        Instant Ticket Issuance
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedFlightId(isExpanded ? null : flight.id)}
                      className="text-blue-600 hover:text-blue-700 font-bold text-xs inline-flex items-center space-x-1"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'Flight Details & Policies'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expandable Policy / Details Drawer */}
                  {isExpanded && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">
                            Baggage Allowance
                          </p>
                          <p className="text-slate-600">Cabin: 7 kg / Adult</p>
                          <p className="text-slate-600">Check-in: 15 kg / Adult</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">
                            Cancellation Fee
                          </p>
                          <p className="text-slate-600">&gt; 72 hrs: ₹1,500 / pax</p>
                          <p className="text-slate-600">&lt; 72 hrs: ₹2,500 / pax</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">
                            Date Change Fee
                          </p>
                          <p className="text-slate-600">₹1,000 + Fare Difference</p>
                          <p className="text-slate-600">Available via My Bookings</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MakeMyTrip-Style Sticky Bottom Bar for Round Trip */}
      {tripType === 'roundtrip' && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200/90 shadow-2xl py-3 px-4 z-40">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Outbound & Return Summary Chips */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 w-full sm:w-auto">
              {/* Outbound chip */}
              <div
                onClick={() => setActiveLeg('outbound')}
                className="cursor-pointer flex items-center space-x-2 text-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Outbound</span>
                  {selectedOutbound ? (
                    <span className="font-bold text-slate-800">
                      {selectedOutbound.flightCode} &bull; {selectedOutbound.departureTime} (₹{selectedOutbound.adultFare})
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold">Select Flight</span>
                  )}
                </div>
              </div>

              <div className="hidden sm:block text-slate-300 font-bold">+</div>

              {/* Return chip */}
              <div
                onClick={() => setActiveLeg('return')}
                className="cursor-pointer flex items-center space-x-2 text-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Return</span>
                  {selectedReturn ? (
                    <span className="font-bold text-slate-800">
                      {selectedReturn.flightCode} &bull; {selectedReturn.departureTime} (₹{selectedReturn.adultFare})
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold">Select Flight</span>
                  )}
                </div>
              </div>
            </div>

            {/* Price and CTA */}
            <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Combined Total</span>
                <span className="text-xl sm:text-2xl font-black text-blue-600">
                  ₹{totalRoundTripFare.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={handleProceedRoundTripBooking}
                disabled={!selectedOutbound || !selectedReturn}
                className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center space-x-2 transition ${
                  selectedOutbound && selectedReturn
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <span>Continue to Booking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
