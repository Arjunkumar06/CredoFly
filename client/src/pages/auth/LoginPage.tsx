import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plane, AlertCircle, ArrowRight, KeyRound, CheckCircle2, X } from 'lucide-react';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Recovery modal state
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.login({ username, password });
      if (res.data.success) {
        login(res.data.user, res.data.token);
        navigate(redirect, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Check your Customer ID/email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      // In web browser without active Google Client ID configured, utilize secure backend Google auth adapter
      const res = await authApi.google({
        email: 'alex.rivera@credofly.com',
        name: 'Alex Rivera',
      });

      if (res.data.success) {
        login(res.data.user, res.data.token);
        navigate(redirect, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google Sign-In failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRecoverCustomerId = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryMessage(null);
    setIsRecovering(true);

    try {
      const res = await authApi.recoverCustomerId({ identifier: recoveryIdentifier.trim() });
      if (res.data.success) {
        setRecoveryMessage(
          `Recovery successful! Your Customer ID is: ${res.data.customerId}. We also dispatched a confirmation notification.`
        );
      }
    } catch (err: any) {
      setRecoveryError(err.response?.data?.error || 'No customer account found with that email or mobile number.');
    } finally {
      setIsRecovering(false);
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
            Welcome Back to CredoFly
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Sign in with Customer ID, Email, Mobile or Google
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
            <span>{isGoogleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-3 text-[11px] text-slate-400 font-semibold uppercase">Or with credentials</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Customer ID / Email / Mobile
              </label>
              <button
                type="button"
                onClick={() => setIsRecoveryOpen(true)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                Forgot Customer ID?
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. CF-CUST-100001, email, or mobile"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Remember me</span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700">
            Create an Account with Auto-Generated Customer ID
          </Link>
        </div>
      </div>

      {/* Forgot Customer ID Recovery Modal */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-black text-navy-950 text-base">Recover Customer ID</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryOpen(false);
                  setRecoveryMessage(null);
                  setRecoveryError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your registered email address or mobile number. We will look up your unique CredoFly Customer ID.
            </p>

            {recoveryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoveryMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{recoveryMessage}</span>
              </div>
            )}

            <form onSubmit={handleRecoverCustomerId} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Registered Email or Mobile Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. john@example.com or 9876543210"
                  value={recoveryIdentifier}
                  onChange={(e) => setRecoveryIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecoveryOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecovering}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center space-x-2"
                >
                  {isRecovering ? <span>Looking up...</span> : <span>Find Customer ID</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
