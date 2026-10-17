import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plane,
  ArrowRight,
  ShieldCheck,
  Tag,
  Headphones,
  RefreshCw,
  MapPin,
  Sparkles,
  Calendar,
  Users,
  Compass,
} from 'lucide-react';
import { flightApi } from '../../services/api';
import { HeroBackground } from '../../components/common/HeroBackground';

interface DestinationItem {
  city: string;
  title: string;
  tagline: string;
  image: string;
  fallbackImage: string;
  badgeText: string;
}

const POPULAR_DESTINATIONS: DestinationItem[] = [
  {
    city: 'Goa (GOI)',
    title: 'Goa',
    tagline: 'Golden Beaches & Tropical Sun',
    image: '/images/destinations/goa.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800&auto=format&fit=crop',
    badgeText: 'Daily Coastal Flights',
  },
  {
    city: 'Delhi (DEL)',
    title: 'New Delhi',
    tagline: 'India Gate & Capital Heritage',
    image: '/images/destinations/delhi.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=800&auto=format&fit=crop',
    badgeText: 'High Frequency Hub',
  },
  {
    city: 'Mumbai (BOM)',
    title: 'Mumbai',
    tagline: 'Gateway of India & Coastal Hub',
    image: '/images/destinations/mumbai.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=800&auto=format&fit=crop',
    badgeText: 'Financial Capital',
  },
  {
    city: 'Bangalore (BLR)',
    title: 'Bengaluru',
    tagline: 'Silicon Valley & Modern Skyline',
    image: '/images/destinations/bengaluru.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=800&auto=format&fit=crop',
    badgeText: 'Tech & Garden City',
  },
  {
    city: 'Chennai (MAA)',
    title: 'Chennai',
    tagline: 'Marina Beach & Cultural Capital',
    image: '/images/destinations/chennai.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=800&auto=format&fit=crop',
    badgeText: 'South Coast Direct',
  },
  {
    city: 'Hyderabad (HYD)',
    title: 'Hyderabad',
    tagline: 'Historic Charminar & Culinary Hub',
    image: '/images/destinations/hyderabad.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?q=80&w=800&auto=format&fit=crop',
    badgeText: 'Deccan Gateway',
  },
  {
    city: 'Kochi (COK)',
    title: 'Kochi',
    tagline: 'Kerala Backwaters & Arabian Shore',
    image: '/images/destinations/kochi.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=800&auto=format&fit=crop',
    badgeText: 'Scenic Backwaters',
  },
  {
    city: 'Jaipur (JAI)',
    title: 'Jaipur',
    tagline: 'Hawa Mahal & The Pink City',
    image: '/images/destinations/jaipur.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?q=80&w=800&auto=format&fit=crop',
    badgeText: 'Royal Heritage',
  },
  {
    city: 'Kolkata (CCU)',
    title: 'Kolkata',
    tagline: 'Howrah Bridge & Cultural Splendour',
    image: '/images/destinations/kolkata.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1558431382-27e303142255?q=80&w=800&auto=format&fit=crop',
    badgeText: 'City of Joy',
  },
  {
    city: 'Coimbatore (CJB)',
    title: 'Coimbatore',
    tagline: 'Western Ghats & Gateway to Hills',
    image: '/images/destinations/coimbatore.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1616843413587-9e3a37f7bbd8?q=80&w=800&auto=format&fit=crop',
    badgeText: 'Foothills Gateway',
  },
];

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

  const defaultReturn = new Date();
  defaultReturn.setDate(defaultReturn.getDate() + 4);
  const [returnDate, setReturnDate] = useState<string>(
    defaultReturn.toISOString().slice(0, 10)
  );

  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [availableCities, setAvailableCities] = useState<{
    origins: string[];
    destinations: string[];
  }>({
    origins: [
      'Bangalore (BLR)',
      'Delhi (DEL)',
      'Mumbai (BOM)',
      'Chennai (MAA)',
      'Goa (GOI)',
      'Hyderabad (HYD)',
      'Kochi (COK)',
      'Jaipur (JAI)',
      'Kolkata (CCU)',
      'Coimbatore (CJB)',
    ],
    destinations: [
      'Delhi (DEL)',
      'Bangalore (BLR)',
      'Mumbai (BOM)',
      'Goa (GOI)',
      'Chennai (MAA)',
      'Hyderabad (HYD)',
      'Kochi (COK)',
      'Jaipur (JAI)',
      'Kolkata (CCU)',
      'Coimbatore (CJB)',
    ],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await flightApi.getCities();
        if (res.data.success && res.data.origins.length > 0) {
          // Merge configured cities with default airports so search supports all destinations
          const mergedOrigins = Array.from(
            new Set([...res.data.origins, ...availableCities.origins])
          );
          const mergedDestinations = Array.from(
            new Set([...res.data.destinations, ...availableCities.destinations])
          );
          setAvailableCities({
            origins: mergedOrigins,
            destinations: mergedDestinations,
          });
        }
      } catch {
        // Retain fallback list
      }
    };
    fetchCities();
  }, []);

  const handleSwapAirports = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSelectDestination = (dest: string) => {
    // If destination matches current origin, select a different origin to avoid origin === destination
    if (origin.trim().toLowerCase() === dest.trim().toLowerCase()) {
      const other =
        availableCities.origins.find(
          (c) => c.toLowerCase() !== dest.toLowerCase()
        ) || 'Bangalore (BLR)';
      setOrigin(other);
    }
    setDestination(dest);

    // Scroll smoothly to search card
    const searchElem = document.getElementById('search-flight-card');
    if (searchElem) {
      searchElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }
  };

  const handleDirectExplore = (dest: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let currentOrigin = origin;
    if (currentOrigin.trim().toLowerCase() === dest.trim().toLowerCase()) {
      currentOrigin =
        availableCities.origins.find(
          (c) => c.toLowerCase() !== dest.toLowerCase()
        ) || 'Bangalore (BLR)';
    }

    const params = new URLSearchParams({
      tripType: 'oneway',
      origin: currentOrigin.trim(),
      destination: dest.trim(),
      travelDate,
      adults: adults.toString(),
      children: children.toString(),
    });

    navigate(`/flights?${params.toString()}`);
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

    if (tripType === 'roundtrip') {
      if (!returnDate) {
        setError('Please select a return date for your round trip.');
        return;
      }
      if (returnDate < travelDate) {
        setError('Return date cannot be earlier than departure date.');
        return;
      }
    }

    const params = new URLSearchParams({
      tripType,
      origin: origin.trim(),
      destination: destination.trim(),
      travelDate,
      adults: adults.toString(),
      children: children.toString(),
    });

    if (tripType === 'roundtrip') {
      params.set('returnDate', returnDate);
    }

    navigate(`/flights?${params.toString()}`);
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section with Supplied Airplane-and-Coastal-Landscape Background */}
      <HeroBackground variant="full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 lg:pt-16 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-8 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-600/30 text-blue-200 text-xs font-semibold tracking-wide border border-blue-400/40 backdrop-blur-md">
                <Plane className="w-3.5 h-3.5 text-blue-300 transform -rotate-45" />
                <span>Premier Domestic Flight Experience</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
                Fly Beyond <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-200 to-white">
                  Your Destination
                </span>
              </h1>
              <p className="text-lg sm:text-xl font-medium text-slate-200">
                Your Journey, Made Simple.
              </p>
              <p className="text-slate-300 max-w-2xl leading-relaxed text-sm sm:text-base">
                Discover seamless recurring weekly flight schedules, real-time seat inventory,
                transparent adult &amp; child fare breakdown, and immediate booking confirmations
                across premier regional routes.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs text-slate-300">
                <span className="inline-flex items-center space-x-1.5 bg-navy-900/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Instant Booking Confirmation</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 bg-navy-900/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                  <Tag className="w-4 h-4 text-sky-400" />
                  <span>Configured Adult &amp; Child Fares</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 bg-navy-900/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>10 Popular Domestic Routes</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </HeroBackground>

      {/* Main Content Area: Search Card + Destinations */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-20 pb-20">
        {/* Interactive Search Card */}
        <div
          id="search-flight-card"
          className="bg-white rounded-3xl shadow-2xl shadow-navy-950/20 border border-slate-200 overflow-hidden"
        >
          {/* Trip Type Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/80 px-6 pt-3">
            <button
              type="button"
              onClick={() => setTripType('oneway')}
              className={`flex items-center space-x-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
                tripType === 'oneway'
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
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
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Round Trip</span>
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Origin */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  From (Origin)
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
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
                  className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition border border-slate-200 shadow-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Destination */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  To (Destination)
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                >
                  {availableCities.destinations.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Travel Date */}
              <div
                className={
                  tripType === 'roundtrip'
                    ? 'md:col-span-2 space-y-1.5'
                    : 'md:col-span-3 space-y-1.5'
                }
              >
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={travelDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Return Date (if roundtrip) */}
              {tripType === 'roundtrip' && (
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Return Date
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    min={travelDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
              )}

              {/* Passenger selector */}
              <div
                className={
                  tripType === 'roundtrip'
                    ? 'md:col-span-1 space-y-1.5'
                    : 'md:col-span-2 space-y-1.5'
                }
              >
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Passengers
                </label>
                <div className="flex space-x-1.5">
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    title="Adults (Age 12+)"
                    className="w-1/2 px-1.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:ring-2 focus:ring-blue-500"
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
                    className="w-1/2 px-1.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:ring-2 focus:ring-blue-500"
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
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Direct seat confirmation &bull; No mandatory payment roadblock &bull; Transparent fare rules
              </p>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition transform active:scale-95"
              >
                <span>Search Flights</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Popular Domestic Destinations Showcase */}
        <section className="mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Premier Domestic Network</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-navy-950">
                Popular Domestic Destinations
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xl">
                Explore top Indian destinations. Click any card to set your route and discover scheduled direct flights with real-time seat inventory.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {POPULAR_DESTINATIONS.map((dest) => (
              <div
                key={dest.city}
                onClick={() => handleSelectDestination(dest.city)}
                className="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-400 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img
                    src={dest.image}
                    alt={`${dest.title} - ${dest.tagline}`}
                    loading="lazy"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = dest.fallbackImage;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/30 to-transparent"></div>
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-extrabold text-navy-900 shadow-sm border border-slate-100">
                    {dest.badgeText}
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <p className="text-lg font-black tracking-tight">{dest.title}</p>
                    <p className="text-xs text-slate-200 font-medium line-clamp-1">{dest.tagline}</p>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between bg-slate-50/70 border-t border-slate-100">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span>{dest.city}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDirectExplore(dest.city, e)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition"
                  >
                    <span>Search Flights</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Highlight Cards */}
        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Immediate Booking</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Direct reservation confirmation with live seat inventory deduction and instant PNR generation.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 border border-emerald-100">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Transparent Fares</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Configured adult and child ticket pricing snapshot, zero hidden fees, and transparent seat fees.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 border border-amber-100">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Full &amp; Partial Cancellation</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Flexible passenger cancellation with real-time seat inventory restoration back to the central engine.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
