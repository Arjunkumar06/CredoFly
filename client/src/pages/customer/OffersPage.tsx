import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag,
  Copy,
  Check,
  Percent,
  Calendar,
  Sparkles,
  Plane,
  ArrowRight,
  ShieldCheck,
  Clock,
  Users,
} from 'lucide-react';

interface PromoOffer {
  id: string;
  code: string;
  title: string;
  tagline: string;
  discount: string;
  discountType: 'PERCENT' | 'FLAT';
  minFare?: number;
  validTill: string;
  badge: string;
  badgeColor: string;
  description: string;
  terms: string[];
}

const PROMO_OFFERS: PromoOffer[] = [
  {
    id: 'earlybird',
    code: 'EARLYBIRD',
    title: 'Early Bird Flying Advantage',
    tagline: 'Plan ahead and save 15% on your domestic flight tickets',
    discount: '15% OFF',
    discountType: 'PERCENT',
    minFare: 3000,
    validTill: '31 Dec 2026',
    badge: 'Popular',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description:
      'Book your flights at least 14 days before your scheduled departure date and enjoy 15% instant discount on base adult and child fares.',
    terms: [
      'Applicable on all CredoFly domestic routes.',
      'Requires booking at least 14 days prior to travel date.',
      'Maximum discount capped at ₹1,500 per booking.',
      'Valid for both one-way and round-trip bookings.',
    ],
  },
  {
    id: 'flyfamily',
    code: 'FLYFAMILY',
    title: 'Family & Group Travel Saver',
    tagline: 'Flat ₹1,000 off when travelling with children or family members',
    discount: '₹1,000 OFF',
    discountType: 'FLAT',
    minFare: 5000,
    validTill: '31 Dec 2026',
    badge: 'Family Special',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description:
      'Travelling with family? Enjoy a flat discount of ₹1,000 when booking for 3 or more passengers including at least one child.',
    terms: [
      'Minimum 3 passengers required in booking.',
      'Must include at least one child passenger.',
      'Discount applies automatically at review checkout.',
      'Cannot be clubbed with corporate discount schemes.',
    ],
  },
  {
    id: 'roundtrip',
    code: 'RETURN500',
    title: 'Round-Trip Combo Discount',
    tagline: 'Save ₹500 on booking return flights together',
    discount: '₹500 OFF',
    discountType: 'FLAT',
    minFare: 4000,
    validTill: '31 Dec 2026',
    badge: 'Round Trip',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description:
      'Combine your onward and return journeys in a single reservation to unlock ₹500 instant savings and unified PNR management.',
    terms: [
      'Valid exclusively on Round-Trip flight selections.',
      'Onward and return journeys must be booked in same checkout.',
      'Seats subject to flight inventory availability.',
    ],
  },
  {
    id: 'metrofly',
    code: 'METROFLY',
    title: 'Metro Express Route Specials',
    tagline: 'Exclusive rates on Bangalore, Delhi, Mumbai, and Chennai routes',
    discount: '10% OFF',
    discountType: 'PERCENT',
    minFare: 2500,
    validTill: '31 Dec 2026',
    badge: 'Metros Only',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description:
      'Fly between major Indian business capitals with 10% off base fares and complimentary standard seat assignment.',
    terms: [
      'Valid on routes connecting BLR, DEL, BOM, and MAA.',
      'Applies to Morning and Evening peak departures.',
      'Instant verification via Google Pay / UPI.',
    ],
  },
  {
    id: 'zerofee',
    code: 'ZEROCHANGE',
    title: 'Zero Cancellation & Flexi Change',
    tagline: 'Free date modification within 72 hours of departure',
    discount: 'FREE RESCHEDULE',
    discountType: 'FLAT',
    validTill: '31 Dec 2026',
    badge: 'Flexi Shield',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description:
      'Protect your travel plans with zero date-change penalties when you modify flights up to 72 hours prior to scheduled takeoff.',
    terms: [
      'One date modification permitted without administrative fees.',
      'Fare difference between original and new flight applies.',
      'Applicable on confirmed bookings only.',
    ],
  },
];

export const OffersPage: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-navy-950 text-white p-8 sm:p-12 shadow-xl border border-slate-800">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-500/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Exclusive Travel Offers & Deals</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Fly More, Spend Less with Credo<span className="text-blue-400">Fly</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Explore curated flight deals, promotional coupon codes, and seasonal savings across all domestic commercial routes. Copy your promo code and apply it during flight booking review.
            </p>
            <div className="pt-2">
              <Link
                to="/flights"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
              >
                <span>Book Flights Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Background Decorative Graphic */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-10 pointer-events-none hidden lg:block">
            <Plane className="w-96 h-96 transform -rotate-45 text-white" />
          </div>
        </div>

        {/* Feature Highlights Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-navy-950 text-sm">Instant Discount</h4>
              <p className="text-xs text-slate-500">Promos deducted directly at booking review</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-navy-950 text-sm">Guaranteed Fares</h4>
              <p className="text-xs text-slate-500">No hidden surcharge or surprise checkout fees</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-navy-950 text-sm">Valid Across 2026</h4>
              <p className="text-xs text-slate-500">All promo codes active for year-round flights</p>
            </div>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-navy-950">Active Flight Deals</h2>
              <p className="text-xs text-slate-500 mt-1">
                Copy any code below and use it on your reservation or click Book Now to find available dates.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-200/60 px-3 py-1 rounded-full">
              {PROMO_OFFERS.length} Offers Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROMO_OFFERS.map((offer) => (
              <div
                key={offer.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {/* Top Badge & Discount */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${offer.badgeColor}`}
                    >
                      {offer.badge}
                    </span>
                    <span className="text-base font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                      {offer.discount}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h3 className="text-lg font-black text-navy-950">{offer.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{offer.tagline}</p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {offer.description}
                  </p>

                  {/* Terms */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Key Conditions:
                    </span>
                    <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4">
                      {offer.terms.map((term, i) => (
                        <li key={i}>{term}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom Promo Code Pill & Action */}
                <div className="p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="font-mono font-black text-sm bg-white px-3 py-1.5 rounded-xl border border-dashed border-blue-400 text-blue-700 select-all">
                      {offer.code}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(offer.code)}
                      title="Copy promo code"
                      className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition"
                    >
                      {copiedCode === offer.code ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <Link
                    to="/flights"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center space-x-1"
                  >
                    <span>Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guarantee Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-navy-950 text-white p-8 rounded-3xl shadow-lg border border-blue-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-bold">Have a custom corporate or student inquiry?</h3>
            <p className="text-xs text-blue-200">
              Reach out to CredoFly customer desk for group bookings above 9 passengers.
            </p>
          </div>
          <Link
            to="/help"
            className="px-6 py-2.5 bg-white hover:bg-blue-50 text-navy-950 font-bold text-xs rounded-xl transition shadow-md whitespace-nowrap"
          >
            Contact Support Desk
          </Link>
        </div>

      </div>
    </div>
  );
};
