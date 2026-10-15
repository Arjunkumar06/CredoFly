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
} from 'lucide-react';
import { flightApi } from '../../services/api';
import { SearchFlightResult } from '../../types';
import { LowFareCalendarBar } from '../../components/flights/LowFareCalendarBar';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const origin = searchParams.get('origin') || 'Bangalore (BLR)';
  const destination = searchParams.get('destination') || 'Delhi (DEL)';
  const travelDate =
    searchParams.get('travelDate') ||
    new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const adults = Number(searchParams.get('adults')) || 1;
  const children = Number(searchParams.get('children')) || 0;
  const cabinClass = searchParams.get('class') || 'ECONOMY';

  const [rawFlights, setRawFlights] = useState<SearchFlightResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState<'cheapest' | 'earliest' | 'fastest'>('cheapest');
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);

  // Modify search drawer state
  const [isModifying, setIsModifying] = useState<boolean>(false);
  const [modOrigin, setModOrigin] = useState(origin);
  const [modDestination, setModDestination] = useState(destination);
  const [modDate, setModDate] = useState(travelDate);
  const [modAdults, setModAdults] = useState(adults);
  const [modChildren, setModChildren] = useState(children);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await flightApi.search({
          origin,
          destination,
          travelDate,
          adults,
          children,
        });
        if (res.data.success) {
          setRawFlights(res.data.flights);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to search flights. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [origin, destination, travelDate, adults, children]);

  const handleApplyModifiedSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (modOrigin.trim().toLowerCase() === modDestination.trim().toLowerCase()) {
      setError('Origin and destination must be different.');
      return;
    }
    setSearchParams({
      origin: modOrigin,
      destination: modDestination,
      travelDate: modDate,
      adults: modAdults.toString(),
      children: modChildren.toString(),
      class: cabinClass,
    });
    setIsModifying(false);
  };

  const handleSelectFlight = (flight: SearchFlightResult) => {
    navigate(
      `/booking/review?instanceId=${flight.id}&adults=${adults}&children=${children}&date=${travelDate}&class=${cabinClass}`
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

  // Filter & Sort Flights
  const filteredFlights = rawFlights.filter((flight) => {
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

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Search Summary Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5 text-xl sm:text-2xl font-black text-navy-950">
                <span>{origin}</span>
                <ArrowRight className="w-5 h-5 text-blue-600" />
                <span>{destination}</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                {formatDateDisplay(travelDate)} &bull; {adults} Adult{adults > 1 ? 's' : ''}
                {children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''} &bull;{' '}
                <span className="text-blue-600 font-semibold">{cabinClass.replace('_', ' ')}</span>
              </p>
            </div>
            <div>
              <button
                onClick={() => setIsModifying(!isModifying)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
              >
                <span>Modify Search</span>
                {isModifying ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible Modify Form */}
          {isModifying && (
            <form onSubmit={handleApplyModifiedSearch} className="mt-6 pt-6 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={modDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setModDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Passengers</label>
                  <div className="flex space-x-2">
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

        {/* Low-Fare Date Carousel / Matrix */}
        <LowFareCalendarBar
          origin={origin}
          destination={destination}
          selectedDate={travelDate}
          onSelectDate={(newDate) => {
            setSearchParams({
              origin,
              destination,
              travelDate: newDate,
              adults: adults.toString(),
              children: children.toString(),
              class: cabinClass,
            });
          }}
        />

        {/* MakeMyTrip-Style Filter & Sorting Bar */}
        {!isLoading && rawFlights.length > 0 && (
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
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-3xl flex items-center space-x-3">
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Flights Matching Filters</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              We couldn't find any flights for the selected departure time or passenger capacity. Try clearing your filters or choosing another date.
            </p>
            <button
              onClick={() => {
                setTimeFilter('all');
                setIsModifying(true);
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm"
            >
              Reset Filters & Dates
            </button>
          </div>
        )}

        {/* Flight Cards List */}
        {!isLoading && !error && sortedFlights.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 px-1">
              <span>Showing {sortedFlights.length} flight{sortedFlights.length > 1 ? 's' : ''}</span>
              <span className="text-emerald-700">All prices include base fare, taxes, and baggage</span>
            </div>

            {sortedFlights.map((flight) => {
              const isExpanded = expandedFlightId === flight.id;

              return (
                <div
                  key={flight.id}
                  className="bg-white rounded-3xl border border-slate-200 hover:border-blue-400 p-6 shadow-sm hover:shadow-md transition-all space-y-4"
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
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 transition active:scale-95"
                      >
                        Select Flight
                      </button>
                    </div>
                  </div>

                  {/* MakeMyTrip-Style Flight Card Footer */}
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
    </div>
  );
};
