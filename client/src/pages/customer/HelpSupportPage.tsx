import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
  Send,
  CheckCircle,
  MessageSquare,
  AlertTriangle,
  Plane,
  Ticket,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { HeroBackground } from '../../components/common/HeroBackground';

interface FaqItem {
  id: string;
  category: 'booking' | 'cancellation' | 'seats' | 'payment' | 'baggage';
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'cancellation',
    question: 'How does CredoFly tier-based cancellation & refund policy work?',
    answer:
      'CredoFly guarantees fair, transparent cancellation refunds calculated based on departure timeline:\n• > 72 hours before departure: 90% refund of base fare (10% cancellation fee).\n• 24 to 72 hours before departure: 75% refund of base fare (25% cancellation fee).\n• 4 to 24 hours before departure: 50% refund of base fare (50% cancellation fee).\n• Less than 4 hours before departure: Non-refundable (0% refund).\nRefunds are automatically processed to your original payment method within 24 to 48 hours.',
  },
  {
    id: 'faq-2',
    category: 'seats',
    question: 'Can I choose specific seats or change them after booking?',
    answer:
      'Yes! During the booking process, you can select specific seats such as 4A, 4C, or any available aisle/window seats. The seat map shows real-time availability: green/blue for available, grey for occupied, and dark blue for your selected seats. Seats are confirmed immediately upon payment.',
  },
  {
    id: 'faq-3',
    category: 'payment',
    question: 'How do I pay with Google Pay or UPI QR and verify my UTR?',
    answer:
      'When selecting Google Pay / UPI QR at checkout, scan the dynamic QR code with any UPI app (Google Pay, PhonePe, Paytm, BHIM). Once paid, enter your 12-digit UPI UTR transaction reference number into the field and click Confirm Payment. Our verification team or automated gateway validates the transaction against bank statements.',
  },
  {
    id: 'faq-4',
    category: 'booking',
    question: 'Where can I find my PNR and download my flight ticket?',
    answer:
      'Once your booking is confirmed, your 6-character PNR (e.g. CF-98234) is sent immediately to your registered email via Resend notifications. You can also view all upcoming and past trips anytime under the "My Bookings" tab, complete with passenger names, seat numbers, and printable boarding passes.',
  },
  {
    id: 'faq-5',
    category: 'baggage',
    question: 'What is the standard baggage allowance on CredoFly domestic flights?',
    answer:
      'All CredoFly domestic tickets include:\n• Cabin Baggage: 1 piece up to 7 kg per passenger (plus one small personal item like laptop bag or handbag).\n• Check-in Baggage: 1 piece up to 15 kg per passenger.\nAdditional prepaid baggage can be added during online check-in or at the airport terminal.',
  },
  {
    id: 'faq-6',
    category: 'booking',
    question: 'Can I cancel individual passengers in a multi-passenger booking?',
    answer:
      'Yes! In "My Bookings" -> "View Details", use the "Partial Passenger Cancellation" tool. You can select how many adults or children to cancel. CredoFly recalculates the refund instantly according to the policy tier and releases those specific seats back to the flight inventory.',
  },
];

export const HelpSupportPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaq, setOpenFaq] = useState<string | null>('faq-1');

  // Support Request Ticket Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [category, setCategory] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const filteredFaqs = FAQ_DATA.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const generatedTicket = `TKT-CF-${Math.floor(100000 + Math.random() * 900000)}`;
      setTicketNumber(generatedTicket);
      setIsSubmitting(false);
      setMessage('');
    }, 800);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header & Search */}
        <HeroBackground variant="card" className="rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-800 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-500/40">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>CredoFly Customer Help & Knowledge Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              How Can We Help You Today?
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Find instant answers regarding reservations, seat selections, cancellations, refund tiers, and payment verifications.
            </p>

            {/* Search Input Bar */}
            <div className="pt-4 max-w-xl mx-auto">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="Search questions (e.g. cancellation refund, seat choice, Google Pay)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white text-navy-950 rounded-2xl text-xs sm:text-sm font-medium shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/30"
                />
              </div>
            </div>
          </div>
        </HeroBackground>

        {/* 3 Contact Support Channels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-navy-950">24/7 Flight Helpline</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Speak directly with CredoFly airport operations and flight support representatives.
              </p>
            </div>
            <div className="pt-2">
              <a
                href="tel:18002092300"
                className="text-sm font-black text-blue-600 hover:text-blue-700 font-mono"
              >
                1800-209-2300 (Toll-Free)
              </a>
              <span className="block text-[10px] text-slate-400 mt-0.5">Available 24 hours, 7 days</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Email Support</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Send queries regarding invoices, payment verification, and corporate itineraries.
              </p>
            </div>
            <div className="pt-2">
              <a
                href="mailto:support@credofly.com"
                className="text-sm font-black text-emerald-600 hover:text-emerald-700"
              >
                support@credofly.com
              </a>
              <span className="block text-[10px] text-slate-400 mt-0.5">Average response under 2 hours</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-navy-950">Airport Customer Desks</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Available at Departure Terminal 1 & 2 at BLR, DEL, BOM, MAA, and HYD airports.
              </p>
            </div>
            <div className="pt-2">
              <span className="text-sm font-black text-purple-700">Terminal Assistance Counters</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Open 3 hours prior to first flight</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-navy-950">Frequently Asked Questions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse our essential travel guides and policy explanations.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {['all', 'cancellation', 'seats', 'payment', 'booking', 'baggage'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All Questions' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full p-5 text-left flex items-center justify-between space-x-4 hover:bg-slate-50 transition"
                    >
                      <span className="font-bold text-navy-950 text-sm">{faq.question}</span>
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs text-slate-600 whitespace-pre-line leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                No matching questions found for &quot;{searchQuery}&quot;. Please submit a support ticket below.
              </div>
            )}
          </div>
        </div>

        {/* Support Request Ticket Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-navy-950">Submit a Support Ticket</h3>
              <p className="text-xs text-slate-500">
                Cannot find the answer above? Submit a request and our customer relations team will contact you.
              </p>
            </div>
          </div>

          {ticketNumber ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-center sm:text-left">
              <div className="flex items-center space-x-3 text-emerald-800">
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <h4 className="font-extrabold text-base">Support Ticket Created Successfully!</h4>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your ticket reference number is{' '}
                <strong className="font-mono text-sm bg-white px-2.5 py-0.5 rounded border border-emerald-300 text-emerald-900">
                  {ticketNumber}
                </strong>
                . A confirmation has been dispatched to your email address. Our desk will update your reservation within 2 business hours.
              </p>
              <button
                type="button"
                onClick={() => setTicketNumber(null)}
                className="mt-2 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Booking PNR / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CF101-ABCD"
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Inquiry Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Payment / UTR Verification">Payment / UTR Verification</option>
                    <option value="Seat Assignment Issue">Seat Assignment Issue</option>
                    <option value="Cancellation & Refund">Cancellation & Refund</option>
                    <option value="Resend Email Confirmation">Resend Email Confirmation</option>
                    <option value="Special Assistance / Baggage">Special Assistance / Baggage</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Describe Your Issue or Request *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please provide details regarding your journey, transaction reference, or requested changes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Generating Ticket...' : 'Submit Support Request'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
