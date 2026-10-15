import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Building,
  Zap,
  ShieldCheck,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react';

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
  onSuccess: (paymentMethod: 'CARD' | 'UPI' | 'NET_BANKING' | 'DEMO_PAY') => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  amount,
  bookingSummary,
  onClose,
  onSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'CARD' | 'UPI' | 'NET_BANKING' | 'DEMO_PAY'>('DEMO_PAY');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [upiId, setUpiId] = useState('passenger@okaxis');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    // Simulate real gateway handshake & 3DS verification
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(selectedMethod);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-navy-950 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                CredoFly <span className="text-blue-400">Payment Gateway</span>
              </h3>
              <p className="text-xs text-slate-400">256-bit SSL Encrypted Transaction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-2.5 flex items-center space-x-2 text-xs text-amber-900 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Simulated Sandbox:</strong> No actual money is debited. Designed for coding assignment demonstration.
          </span>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Order Summary Pill */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total Payable Amount
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {bookingSummary.flightCode} &bull; {bookingSummary.route} ({bookingSummary.passengersCount} Pax)
              </p>
            </div>
            <div className="text-2xl font-black text-blue-600">
              ₹{amount.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Payment Methods Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedMethod('DEMO_PAY')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center space-y-1.5 ${
                selectedMethod === 'DEMO_PAY'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs">Quick Pay</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('CARD')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center space-y-1.5 ${
                selectedMethod === 'CARD'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('UPI')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center space-y-1.5 ${
                selectedMethod === 'UPI'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span className="text-xs">UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('NET_BANKING')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center space-y-1.5 ${
                selectedMethod === 'NET_BANKING'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building className="w-4 h-4" />
              <span className="text-xs">Net Banking</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 min-h-[160px] flex flex-col justify-center">
            {selectedMethod === 'DEMO_PAY' && (
              <div className="text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Instant Demo Checkout</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  One-click verified authorization for instant seat confirmation and ticket issuance.
                </p>
              </div>
            )}

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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
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
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
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
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'UPI' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Virtual Payment Address (VPA / UPI ID)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="mobile@upi"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                  <span className="font-semibold">Supported:</span>
                  <span>Google Pay &bull; PhonePe &bull; Paytm &bull; BHIM</span>
                </div>
              </div>
            )}

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
                      className={`p-2.5 rounded-lg border text-xs font-medium text-left transition ${
                        selectedBank === bank
                          ? 'border-blue-600 bg-white text-blue-700 shadow-sm font-bold'
                          : 'border-slate-200 bg-white/60 text-slate-700'
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
          <div className="pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handlePay}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Payment Handshake...</span>
                </>
              ) : (
                <span>Pay ₹{amount.toLocaleString('en-IN')} & Confirm Reservation</span>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
