import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Calendar, Users, ArrowRight, ShieldCheck, Tag, Headphones, RefreshCw } from 'lucide-react';
import { flightApi } from '../../services/api';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<'oneway' | 'roundtrip'>('oneway');
  const [origin, setOrigin] = useState<string>('Bangalore (BLR)');
  const [destination, setDestination] = useState<string>('Delhi (DEL)');
  
  // Default travel date: tomorrow in YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [travelDate, setTravelDate] = useState<string>(
    tomorrow.toISOString().slice(0, 10)
  );

  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [availableCities, setAvailableCities] = useState<{ origins: string[]; destinations: string[] }>({
    origins: ['Bangalore (BLR)', 'Delhi (DEL)', 'Mumbai (BOM)'],
    destinations: ['Delhi (DEL)', 'Bangalore (BLR)', 'Mumbai (BOM)', 'Chennai (MAA)'],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await flightApi.getCities();
        if (res.data.success) {
          if (res.data.origins.length > 0) setAvailableCities(res.data);
        }
      } catch {
        // Fallback to defaults
      }
    };
    fetchCities();
  }, []);

  const handleSwapAirports = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setError('Origin and destination must be different airports.');
      return;
    }

    if (adults + children < 1) {
      setError('At least one passenger must be selected.');
      return;
    }

    if (!travelDate) {
      setError('Please select a valid travel date.');
      return;
    }

    navigate(
      `/flights?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
        destination
      )}&travelDate=${encodeURIComponent(travelDate)}&adults=${adults}&children=${children}`
    );
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Heading and Tagline */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left z-10">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-100/80 text-blue-800 text-xs font-semibold tracking-wide border border-blue-200">
                <Plane className="w-3.5 h-3.5 text-blue-600" />
                <span>Premier Flight Booking Experience</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy-950 leading-[1.15]">
                Fly Beyond <br />
                <span className="text-blue-600">Your Destination</span>
              </h1>
              <p className="text-lg sm:text-xl font-medium text-slate-600">
                Your Journey, Made Simple.
              </p>
              <p className="text-slate-500 max-w-lg leading-relaxed text-sm sm:text-base">
                Discover seamless flight schedules, live seat inventory, transparent fare breakdown,
                and instant booking confirmations across premier regional routes.
              </p>
            </div>

            {/* Right Column: High-Res Hero Image with Sky Clouds */}
            <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg lg:max-w-none">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/10 border-4 border-white aspect-[4/3] bg-gradient-to-tr from-sky-100 to-blue-50">
                  <img
                    src="/images/hero-airplane.png"
                    alt="CredoFly Airplane in Sky"
                    className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      // Fallback if image path has issue
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-4 left-6 text-white pointer-events-none">
                    <p className="text-xs uppercase tracking-widest font-semibold text-blue-200">
                      CredoFly Express
                    </p>
                    <p className="text-lg font-bold">Reliable Daily Departures</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Search Card */}
          <div className="mt-12 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-200 overflow-hidden">
              {/* Trip Type Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 pt-3">
                <button
                  type="button"
                  onClick={() => setTripType('oneway')}
                  className={`flex items-center space-x-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
                    tripType === 'oneway'
                      ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Plane className="w-4 h-4 transform -rotate-45" />
                  <span>One Way</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTripType('roundtrip')}
                  className={`flex items-center space-x-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
                    tripType === 'roundtrip'
                      ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Round Trip</span>
                </button>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="p-6 sm:p-8 space-y-6">
                {error && (
                  <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  {/* Origin */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      From
                    </label>
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    >
                      {availableCities.origins.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Swap button */}
                  <div className="hidden md:flex md:col-span-1 justify-center pb-2">
                    <button
                      type="button"
                      onClick={handleSwapAirports}
                      title="Swap departure and arrival"
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Destination */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      To
                    </label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    >
                      {availableCities.destinations.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Travel Date */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Travel Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={travelDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* Passenger mix */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Passengers
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={adults}
                        onChange={(e) => setAdults(Number(e.target.value))}
                        title="Adults (Age 12+)"
                        className="w-1/2 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n} Ad
                          </option>
                        ))}
                      </select>
                      <select
                        value={children}
                        onChange={(e) => setChildren(Number(e.target.value))}
                        title="Children (Age 2-11)"
                        className="w-1/2 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      >
                        {[0, 1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n} Ch
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition transform active:scale-95"
                  >
                    <span>Search Flights</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Feature Highlight Cards */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1">Easy Booking</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Quick and simple 3-step checkout with instant ticket generation.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1">Best Fares</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Competitive adult and child fares with zero hidden convenience fees.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1">24/7 Support</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Dedicated customer service and full partial cancellation assistance.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};
