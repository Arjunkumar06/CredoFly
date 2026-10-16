import React from 'react';
import { Plane, ShieldCheck, Headphones, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-400 border-t border-slate-800/80 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Plane className="w-4 h-4 text-white transform -rotate-45" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Credo<span className="text-blue-400">Fly</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your Journey, Made Simple. Fast, reliable, and comfortable airline booking
              experience across premier destinations.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Explore
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-blue-400 transition">
                  Book a Flight
                </Link>
              </li>
              <li>
                <Link to="/flights" className="hover:text-blue-400 transition">
                  Search Routes
                </Link>
              </li>
              <li>
                <Link to="/offers" className="hover:text-blue-400 transition">
                  Special Offers & Deals
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-blue-400 transition">
                  Help & Support Center
                </Link>
              </li>
              <li>
                <Link to="/my-bookings" className="hover:text-blue-400 transition">
                  Manage Reservations
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Guarantees */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Trust & Safety
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Instant Seat Confirmation</span>
              </li>
              <li className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-blue-400" />
                <span>Transparent Fare Guarantee</span>
              </li>
              <li className="flex items-center space-x-2">
                <Headphones className="w-4 h-4 text-amber-400" />
                <span>24/7 Booking Support</span>
              </li>
            </ul>
          </div>

          {/* Admin access */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Portal
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              CredoFly Operations and Fleet Management.
            </p>
            <Link
              to="/admin/login"
              className="inline-flex items-center text-xs font-medium text-blue-400 hover:text-blue-300 underline underline-offset-4"
            >
              Administrator Console &rarr;
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} CredoFly Airlines. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">CredoFly Aviation Pvt Ltd • Commercial Airline Reservation Engine</p>
        </div>
      </div>
    </footer>
  );
};
