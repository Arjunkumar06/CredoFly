import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plane, ArrowRight, Clock, Users, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { flightApi } from '../../services/api';
import { SearchFlightResult } from '../../types';

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

  const [flights, setFlights] = useState<SearchFlightResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
          setFlights(res.data.flights);
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
    });
    setIsModifying(false);
  };

  const handleSelectFlight = (flight: SearchFlightResult) => {
    navigate(
      `/booking/review?instanceId=${flight.id}&adults=${adults}&children=${children}&date=${travelDate}`
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

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Search Summary Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xl sm:text-2xl font-bold text-navy-950">
                <span>{origin}</span>
                <ArrowRight className="w-5 h-5 text-blue-600" />
                <span>{destination}</span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {formatDateDisplay(travelDate)} &bull; {adults} Adult{adults > 1 ? 's' : ''}
                {children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}
              </p>
            </div>
            <div>
              <button
                onClick={() => setIsModifying(!isModifying)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
                  <input
                    type="text"
                    value={modDestination}
                    onChange={(e) => setModDestination(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Passengers</label>
                  <div className="flex space-x-2">
                    <select
                      value={modAdults}
                      onChange={(e) => setModAdults(Number(e.target.value))}
                      className="w-1/2 px-2 py-2 border border-slate-300 rounded-lg text-xs"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} Ad</option>
                      ))}
                    </select>
                    <select
                      value={modChildren}
                      onChange={(e) => setModChildren(Number(e.target.value))}
                      className="w-1/2 px-2 py-2 border border-slate-300 rounded-lg text-xs"
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

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="h-6 bg-slate-200 rounded w-1/4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/3"></div>
                <div className="h-10 bg-slate-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && flights.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plane className="w-8 h-8 transform -rotate-45" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Flights Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              We couldn't find any scheduled departures matching {origin} to {destination} on {formatDateDisplay(travelDate)} with sufficient seat capacity.
            </p>
            <button
              onClick={() => setIsModifying(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm"
            >
              Modify Dates or Route
            </button>
          </div>
        )}

        {/* Flight Cards List */}
        {!isLoading && !error && flights.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 px-1">
              <span>Found {flights.length} available flight{flights.length > 1 ? 's' : ''}</span>
              <span>Sorted by Departure Time</span>
            </div>

            {flights.map((flight) => (
              <div
                key={flight.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-6"
              >
                {/* Flight Code & Carrier */}
                <div className="w-full md:w-40 flex md:flex-col items-center md:items-start justify-between border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                      <Plane className="w-3.5 h-3.5 transform -rotate-45" />
                    </div>
                    <span className="text-lg font-extrabold text-navy-950 tracking-tight">
                      {flight.flightCode}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1">Airbus A320</span>
                </div>

                {/* Times & Route Diagram */}
                <div className="flex-1 flex items-center justify-center space-x-6 sm:space-x-10 w-full">
                  {/* Departure */}
                  <div className="text-center sm:text-left">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                      {flight.departureTime}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 uppercase mt-0.5">
                      {flight.origin.match(/\(([^)]+)\)/)?.[1] || flight.origin}
                    </p>
                  </div>

                  {/* Flight Duration graphic */}
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[11px] font-medium text-slate-400 mb-1">
                      {flight.duration}
                    </span>
                    <div className="w-24 sm:w-36 flex items-center">
                      <div className="w-2 h-2 rounded-full border border-blue-600 bg-white"></div>
                      <div className="flex-1 border-t-2 border-dashed border-slate-300"></div>
                      <Plane className="w-3.5 h-3.5 text-blue-600 transform rotate-90 mx-1" />
                      <div className="flex-1 border-t-2 border-dashed border-slate-300"></div>
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold mt-1">Direct</span>
                  </div>

                  {/* Arrival */}
                  <div className="text-center sm:text-right">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                      {flight.arrivalTime}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 uppercase mt-0.5">
                      {flight.destination.match(/\(([^)]+)\)/)?.[1] || flight.destination}
                    </p>
                  </div>
                </div>

                {/* Pricing & Selection */}
                <div className="w-full md:w-56 flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-3">
                  <div className="text-left md:text-right">
                    <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      ₹{flight.adultFare.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-slate-500">per adult</p>
                    {children > 0 && (
                      <p className="text-[11px] text-slate-500">
                        ₹{flight.childFare.toLocaleString('en-IN')} per child
                      </p>
                    )}
                    <div className="mt-1">
                      <span
                        className={`text-xs font-bold ${
                          flight.availableSeats <= 8 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {flight.availableSeats} seats left
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectFlight(flight)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/20 transition active:scale-95"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
