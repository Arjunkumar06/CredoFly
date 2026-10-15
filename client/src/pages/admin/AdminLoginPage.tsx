import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ShieldAlert, ArrowRight, Plane, KeyRound, Check } from 'lucide-react';
import { adminApi } from '../../services/api';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAdmin } = useAdminAuth();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('adminpassword123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const trimmedUser = username.trim();
      const trimmedPass = password.trim();
      const basicToken = btoa(`${trimmedUser}:${trimmedPass}`);
      const res = await adminApi.verify(basicToken);

      if (res.data.success) {
        loginAdmin(basicToken, trimmedUser);
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'HTTP 401 Unauthorized: Invalid administrator username or password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('adminpassword123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-navy-950 items-center justify-center text-blue-400 mb-2 shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl font-bold text-navy-950">
              Credo<span className="text-blue-600">Fly</span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded text-slate-700">
              Admin
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Restricted Operations Portal
          </h2>
          <p className="text-xs text-slate-500">
            Enter administrator credentials to access fleet, bookings, payments and pricing.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Admin Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Admin Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Quick Pre-fill Pill */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-navy-950 text-[11px]">Default Admin Credentials</p>
              <p className="font-mono text-slate-600 text-[11px]">admin / adminpassword123</p>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold transition shadow-xs"
            >
              Pre-fill
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition"
            >
              {isLoading ? (
                <span>Authenticating with Server...</span>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center">
          <Link to="/" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            &larr; Return to Customer Flight Booking
          </Link>
        </div>
      </div>
    </div>
  );
};
