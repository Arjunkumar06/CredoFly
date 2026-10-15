import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  Building,
  Save,
} from 'lucide-react';
import { adminApi, paymentApi } from '../../services/api';
import { PaymentRecord, PaymentConfig } from '../../types';

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Config modal / drawer
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    upiId: 'credofly@oksbi',
    merchantName: 'CredoFly Aviation Pvt Ltd',
    qrNote: 'CredoFly Flight Ticket Booking',
    isSandbox: true,
  });
  const [isUpdatingConfig, setIsUpdatingConfig] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Action state
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
    loadConfig();
  }, [statusFilter]);

  const loadPayments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : undefined;
      const res = await adminApi.getPayments(params);
      if (res.data.success) {
        setPayments(res.data.payments || []);
      }
    } catch {
      setError('Failed to fetch payment verification queue.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await paymentApi.getConfig();
      if (res.data.success && res.data.config) {
        setPaymentConfig(res.data.config);
      }
    } catch {
      // fallback to defaults
    }
  };

  const handleVerify = async (paymentId: string, status: 'VERIFIED' | 'REJECTED') => {
    setProcessingId(paymentId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.verifyPayment(paymentId, {
        status,
        adminNotes: status === 'VERIFIED' ? 'Verified with bank statement' : 'UTR not found in bank feeds',
      });
      if (res.data.success) {
        setSuccessMsg(`Payment #${paymentId.slice(0, 8)} marked as ${status}.`);
        loadPayments();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update payment status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setError(null);
    try {
      const res = await adminApi.updatePaymentConfig(paymentConfig);
      if (res.data.success) {
        setSuccessMsg('UPI Payment gateway configuration updated successfully.');
        setIsUpdatingConfig(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save payment configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const pendingCount = payments.filter((p) => p.status === 'PENDING_VERIFICATION').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-950">Payment Verification Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review customer Google Pay UPI UTR numbers and reconcile bank settlements.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsUpdatingConfig(!isUpdatingConfig)}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-2"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>Configure UPI Gateway</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Gateway Configuration Drawer */}
      {isUpdatingConfig && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-navy-950 text-sm">UPI Merchant Settings</h3>
          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Merchant UPI VPA
              </label>
              <input
                type="text"
                required
                value={paymentConfig.upiId}
                onChange={(e) => setPaymentConfig({ ...paymentConfig, upiId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Display Merchant Name
              </label>
              <input
                type="text"
                required
                value={paymentConfig.merchantName}
                onChange={(e) => setPaymentConfig({ ...paymentConfig, merchantName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Transaction Note
              </label>
              <input
                type="text"
                value={paymentConfig.qrNote}
                onChange={(e) => setPaymentConfig({ ...paymentConfig, qrNote: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUpdatingConfig(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingConfig ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        {[
          { id: 'ALL', label: 'All Transactions' },
          { id: 'PENDING_VERIFICATION', label: `Pending UTR Review (${pendingCount})` },
          { id: 'VERIFIED', label: 'Verified Settlements' },
          { id: 'REJECTED', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
              statusFilter === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">UTR / Transaction Ref</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading payment audit queue...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment records match this filter.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isProcessing = processingId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-navy-950">
                        {p.booking?.bookingReference || p.bookingId.slice(0, 10)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {p.transactionRef || <span className="text-slate-400 italic">None provided</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'PENDING_VERIFICATION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(p.submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.status === 'PENDING_VERIFICATION' ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleVerify(p.id, 'VERIFIED')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-[11px] transition shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleVerify(p.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
