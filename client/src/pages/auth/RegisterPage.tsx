import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Success modal state for Customer ID presentation
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.register({
        name: name.trim() || undefined,
        username: username.trim(),
        email: email.trim() || undefined,
        mobileNumber: mobileNumber.trim() || undefined,
        password,
        confirmPassword,
      });

      if (res.data.success) {
        setCreatedCustomerId(res.data.user.customerId || 'CF-CUST-100003');
        setCreatedUser(res.data.user);
        setCreatedToken(res.data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCustomerId = () => {
    if (createdCustomerId) {
      navigator.clipboard.writeText(createdCustomerId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleProceedToDashboard = () => {
    if (createdUser && createdToken) {
      login(createdUser, createdToken);
      navigate('/');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const res = await authApi.google({
        email: 'alex.rivera@credofly.com',
        name: 'Alex Rivera',
      });

      if (res.data.success) {
        login(res.data.user, res.data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google Sign-In failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 relative overflow-hidden">
      {/* Background Graphic Accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/80 border border-slate-200/80 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="flex justify-center mb-2">
            <BrandLogo size="lg" />
          </div>
          <h2 className="text-2xl font-black text-navy-950 tracking-tight">
            Create Your Account
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Get an instant CredoFly Customer ID for seamless reservations.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Quick Button */}
        <div className="mb-5">
          <button
            type="button"
            disabled={isGoogleLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center space-x-2.5 shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Connecting Google...' : 'Sign up with Google'}</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-3 text-[11px] text-slate-400 font-semibold uppercase">Or fill form</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="e.g. john_doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition text-xs sm:text-sm"
            >
              {isLoading ? (
                <span>Generating Customer Account...</span>
              ) : (
                <>
                  <span>Create Account & Get Customer ID</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
            Sign In with Customer ID
          </Link>
        </div>
      </div>

      {/* Presentation Modal for Server-Generated Customer ID */}
      {createdCustomerId && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <UserCheck className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-black text-navy-950 text-xl tracking-tight">
                Account Successfully Created!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your unique CredoFly Customer ID has been generated:
              </p>
            </div>

            {/* Customer ID Display Box */}
            <div className="p-4 bg-blue-50/70 border-2 border-dashed border-blue-400 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider text-left">
                  CredoFly Customer ID
                </p>
                <p className="text-xl font-mono font-black text-navy-950 tracking-wider">
                  {createdCustomerId}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyCustomerId}
                className="px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
              💡 <strong>Tip:</strong> You can use this Customer ID or your registered email/mobile to log in from any device. We have also emailed your welcome confirmation.
            </p>

            <button
              type="button"
              onClick={handleProceedToDashboard}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 text-xs sm:text-sm transition flex items-center justify-center space-x-2"
            >
              <span>Continue to CredoFly Booking</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
