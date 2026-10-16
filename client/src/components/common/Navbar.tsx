import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plane, User as UserIcon, LogOut, Shield, Tag, HelpCircle, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-navy-950 text-white sticky top-0 z-50 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:bg-blue-500 transition-colors">
              <Plane className="w-5 h-5 text-white transform -rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white flex items-center">
                Credo<span className="text-blue-400">Fly</span>
              </span>
              <span className="text-[10px] text-slate-400 -mt-1 tracking-wider uppercase font-medium">
                Airlines
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Home
            </Link>
            <Link
              to="/flights"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/flights')
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Flights
            </Link>
            <Link
              to="/offers"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                isActive('/offers')
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Offers</span>
            </Link>
            <Link
              to="/help"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                isActive('/help')
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Help & Support</span>
            </Link>
            <Link
              to="/my-bookings"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/my-bookings')
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              My Bookings
            </Link>
          </div>

          {/* User Controls & Mobile Toggle */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/my-bookings"
                  className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full text-sm text-slate-200 hover:bg-slate-700 transition"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 font-semibold text-xs">
                    {(user.name || user.username).charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-xs sm:text-sm">{user.name || user.username}</span>
                  {user.customerId && (
                    <span className="hidden sm:inline-block text-[10px] bg-blue-900/90 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-700/60">
                      {user.customerId}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-600/30 transition"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Admin Portal Shortcut */}
            <div className="border-l border-slate-800 pl-3 ml-2 hidden sm:block">
              <Link
                to="/admin/dashboard"
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-blue-400 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-md transition"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            </div>

            {/* Mobile Menu Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg md:hidden transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800/80 space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive('/') ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Home
            </Link>
            <Link
              to="/flights"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive('/flights') ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Search Flights
            </Link>
            <Link
              to="/offers"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                isActive('/offers') ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Tag className="w-4 h-4 text-blue-400" />
              <span>Offers & Deals</span>
            </Link>
            <Link
              to="/help"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                isActive('/help') ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>Help & Support</span>
            </Link>
            <Link
              to="/my-bookings"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive('/my-bookings') ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              My Bookings
            </Link>
            <div className="pt-2 border-t border-slate-800/80">
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 text-xs text-blue-400 font-semibold hover:bg-slate-800/60 rounded-lg"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Operations Portal</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
