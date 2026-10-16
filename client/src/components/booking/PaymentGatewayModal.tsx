import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CreditCard,
  QrCode,
  Building,
  Zap,
  ShieldCheck,
  AlertCircle,
  X,
  Lock,
  Copy,
  Check,
} from 'lucide-react';
import { paymentApi } from '../../services/api';
import { PaymentConfig } from '../../types';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  amount: number;
  bookingSummary: {
    flightCode: string;
    route: string;
    travelDate: string;
    passengersCount: number;
  };
  onClose: () => void;
  onSuccess: (paymentMethod: 'CARD' | 'UPI' | 'NET_BANKING' | 'DEMO_PAY', utr?: string) => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  amount,
  bookingSummary,
  onClose,
  onSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NET_BANKING' | 'DEMO_PAY'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState<string | null>(null);

  // Dynamic payment config from backend
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    upiId: 'credofly@oksbi',
    merchantName: 'CredoFly Aviation Pvt Ltd',
    qrNote: 'CredoFly Flight Ticket Booking',
    isSandbox: true,
  });

  // Card form states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Prevent background scrolling when modal is open and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isProcessing, onClose]);

  useEffect(() => {
    if (isOpen) {
      paymentApi
        .getConfig()
        .then((res) => {
          if (res.data.success && res.data.config) {
            setPaymentConfig(res.data.config);
          }
        })
        .catch(() => {
          // fallback to defaults
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(paymentConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handlePay = () => {
    setUtrError(null);

    if (selectedMethod === 'UPI') {
      const cleanUtr = utrNumber.trim();
      if (!cleanUtr || cleanUtr.length < 8) {
        setUtrError('Please enter a valid 12-digit UPI Transaction Reference (UTR) number after scanning.');
        return;
      }
    }

    setIsProcessing(true);

    // Simulate verification delay
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(selectedMethod, selectedMethod === 'UPI' ? utrNumber.trim() : undefined);
    }, 1500);
  };

  // SVG QR Code generator representation
  const renderQrCodeSvg = () => {
    return (
      <div className="relative p-2.5 sm:p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block">
        <svg
          viewBox="0 0 200 200"
          className="w-36 h-36 sm:w-44 sm:h-44 mx-auto"
          shapeRendering="crispEdges"
        >
          {/* Outer Border / Quiet Zone */}
          <rect width="200" height="200" fill="#ffffff" />
          
          {/* Top-Left Finder Pattern */}
          <rect x="20" y="20" width="46" height="46" fill="#0f172a" rx="4" />
          <rect x="26" y="26" width="34" height="34" fill="#ffffff" rx="2" />
          <rect x="33" y="33" width="20" height="20" fill="#2563eb" rx="2" />

          {/* Top-Right Finder Pattern */}
          <rect x="134" y="20" width="46" height="46" fill="#0f172a" rx="4" />
          <rect x="140" y="26" width="34" height="34" fill="#ffffff" rx="2" />
          <rect x="147" y="33" width="20" height="20" fill="#2563eb" rx="2" />

          {/* Bottom-Left Finder Pattern */}
          <rect x="20" y="134" width="46" height="46" fill="#0f172a" rx="4" />
          <rect x="26" y="140" width="34" height="34" fill="#ffffff" rx="2" />
          <rect x="33" y="147" width="20" height="20" fill="#2563eb" rx="2" />

          {/* Decorative QR matrix pattern tiles */}
          <rect x="74" y="22" width="10" height="10" fill="#0f172a" />
          <rect x="90" y="22" width="8" height="8" fill="#2563eb" />
          <rect x="104" y="22" width="12" height="6" fill="#0f172a" />
          
          <rect x="74" y="40" width="8" height="12" fill="#0f172a" />
          <rect x="92" y="38" width="14" height="14" fill="#0f172a" />
          <rect x="114" y="42" width="10" height="10" fill="#2563eb" />

          <rect x="22" y="74" width="14" height="10" fill="#0f172a" />
          <rect x="44" y="74" width="10" height="8" fill="#2563eb" />
          <rect x="62" y="74" width="8" height="12" fill="#0f172a" />
          <rect x="78" y="72" width="14" height="14" fill="#0f172a" />
          <rect x="100" y="74" width="12" height="10" fill="#2563eb" />
          <rect x="120" y="74" width="16" height="8" fill="#0f172a" />
          <rect x="144" y="74" width="10" height="12" fill="#0f172a" />
          <rect x="162" y="74" width="14" height="10" fill="#2563eb" />

          <rect x="22" y="92" width="10" height="14" fill="#2563eb" />
          <rect x="40" y="94" width="12" height="8" fill="#0f172a" />
          <rect x="60" y="92" width="16" height="16" fill="#0f172a" />
          <rect x="84" y="92" width="10" height="12" fill="#2563eb" />
          <rect x="102" y="90" width="14" height="14" fill="#0f172a" />
          <rect x="124" y="94" width="12" height="8" fill="#0f172a" />
          <rect x="144" y="92" width="16" height="16" fill="#2563eb" />
          <rect x="168" y="94" width="10" height="10" fill="#0f172a" />

          <rect x="22" y="114" width="12" height="10" fill="#0f172a" />
          <rect x="42" y="112" width="10" height="12" fill="#2563eb" />
          <rect x="60" y="116" width="14" height="8" fill="#0f172a" />
          <rect x="80" y="112" width="12" height="12" fill="#0f172a" />
          <rect x="100" y="114" width="10" height="10" fill="#2563eb" />
          <rect x="118" y="112" width="16" height="14" fill="#0f172a" />
          <rect x="142" y="116" width="10" height="8" fill="#0f172a" />
          <rect x="160" y="112" width="14" height="12" fill="#2563eb" />

          <rect x="74" y="134" width="12" height="10" fill="#0f172a" />
          <rect x="94" y="132" width="16" height="14" fill="#2563eb" />
          <rect x="118" y="136" width="12" height="8" fill="#0f172a" />
          <rect x="138" y="134" width="10" height="10" fill="#0f172a" />
          <rect x="156" y="132" width="14" height="14" fill="#2563eb" />

          <rect x="74" y="152" width="14" height="14" fill="#2563eb" />
          <rect x="96" y="154" width="10" height="10" fill="#0f172a" />
          <rect x="114" y="152" width="16" height="14" fill="#0f172a" />
          <rect x="138" y="152" width="12" height="10" fill="#2563eb" />
          <rect x="158" y="154" width="10" height="12" fill="#0f172a" />

          {/* CredoFly Center Badge */}
          <rect x="82" y="82" width="36" height="36" fill="#ffffff" rx="6" />
          <rect x="85" y="85" width="30" height="30" fill="#1e40af" rx="4" />
          <path
            d="M93 97 L100 93 L107 97 L100 107 Z"
            fill="#ffffff"
          />
        </svg>
        <div className="text-[10px] text-center font-bold text-slate-500 uppercase tracking-widest mt-1">
          Scan to Pay ₹{amount.toLocaleString('en-IN')}
        </div>
      </div>
    );
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm p-3 sm:p-4 md:p-6 flex justify-center items-center"
      style={{ minHeight: '100%' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        className="relative bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-navy-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 id="payment-modal-title" className="font-extrabold text-sm sm:text-base tracking-tight">
                CredoFly <span className="text-blue-400">Secure Payment</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">256-bit SSL Encrypted &bull; PCI Compliant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            aria-label="Close payment modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Notice Banner */}
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200/80 px-4 sm:px-5 py-2 sm:py-2.5 flex items-center space-x-2 text-xs text-amber-900 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Coding Assignment Sandbox:</strong> Simulated Google Pay QR workflow with real-time UTR tracking.
          </span>
        </div>

        {/* Vertically Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
          {/* Order Summary Pill */}
          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                Total Payable Amount
              </p>
              <p className="text-xs text-slate-700 font-semibold mt-0.5">
                {bookingSummary.flightCode} &bull; {bookingSummary.route} ({bookingSummary.passengersCount} Pax)
              </p>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600">
              ₹{amount.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Payment Methods Tabs */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSelectedMethod('UPI')}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center space-y-1 sm:space-y-1.5 ${
                selectedMethod === 'UPI'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-bold shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="text-[11px] sm:text-xs">Google Pay QR</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('DEMO_PAY')}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center space-y-1 sm:space-y-1.5 ${
                selectedMethod === 'DEMO_PAY'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-bold shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              <span className="text-[11px] sm:text-xs">Quick Demo</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('CARD')}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center space-y-1 sm:space-y-1.5 ${
                selectedMethod === 'CARD'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-bold shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[11px] sm:text-xs">Credit/Debit</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('NET_BANKING')}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center space-y-1 sm:space-y-1.5 ${
                selectedMethod === 'NET_BANKING'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-bold shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[11px] sm:text-xs">Net Banking</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
            {/* Google Pay / UPI QR Method */}
            {selectedMethod === 'UPI' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* QR Image Box */}
                  <div className="flex flex-col items-center">{renderQrCodeSvg()}</div>

                  {/* QR Details */}
                  <div className="flex-1 space-y-2.5 text-xs text-slate-600">
                    <div>
                      <p className="font-semibold text-slate-500 uppercase text-[10px]">Merchant Name</p>
                      <p className="font-bold text-navy-950 text-sm">{paymentConfig.merchantName}</p>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-500 uppercase text-[10px]">UPI VPA / ID</p>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-300 text-slate-800 font-bold text-xs">
                          {paymentConfig.upiId}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="p-1 rounded-lg border border-slate-200 hover:bg-white text-slate-600 transition"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <p className="text-[11px] text-slate-500">
                        Works with <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any UPI App.
                      </p>
                    </div>
                  </div>
                </div>

                {/* UTR Reference Input */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Enter 12-Digit UPI Ref / UTR Number: <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. 412389102938"
                      value={utrNumber}
                      onChange={(e) => {
                        setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''));
                        setUtrError(null);
                      }}
                      maxLength={16}
                      className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono tracking-wide focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setUtrNumber(`CF${Date.now().toString().slice(-8)}`)}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[11px] font-bold transition flex-shrink-0"
                    >
                      Generate Demo UTR
                    </button>
                  </div>
                  {utrError && <p className="text-[11px] text-rose-600 font-semibold mt-1">{utrError}</p>}
                  <p className="text-[10px] text-slate-500 mt-1">
                    Found in your UPI app's transaction receipt under "UPI Ref No." or "UTR".
                  </p>
                </div>
              </div>
            )}

            {/* Quick Demo Pay */}
            {selectedMethod === 'DEMO_PAY' && (
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Instant Verified Demo Checkout</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Instantly completes reservation and marks payment as VERIFIED without needing to input a manual UTR.
                </p>
              </div>
            )}

            {/* Cards */}
            {selectedMethod === 'CARD' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Net Banking */}
            {selectedMethod === 'NET_BANKING' && (
              <div className="space-y-3">
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Select Popular Bank
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left transition ${
                        selectedBank === bank
                          ? 'border-blue-600 bg-white text-blue-700 shadow-sm font-bold'
                          : 'border-slate-200 bg-white/60 text-slate-700 hover:bg-white'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handlePay}
              className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition text-sm cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Payment Handshake...</span>
                </>
              ) : (
                <span>
                  {selectedMethod === 'UPI' ? 'Submit UTR & Confirm Booking' : `Pay ₹${amount.toLocaleString('en-IN')}`}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
