import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plane,
  Clock,
  RefreshCw,
  Edit2,
  Check,
  AlertCircle,
  X,
  Users,
  Search,
  IndianRupee,
  Percent,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ticket,
  Eye,
  SlidersHorizontal,
  Plus,
  Save,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import {
  CalendarOverviewResponse,
  CalendarMonthSummary,
  CalendarDayOverview,
  CalendarDateDetailsResponse,
  CalendarFlightDetail,
  CalendarBookingDetail,
} from '../../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const AdminSchedulePage: React.FC = () => {
  const detailsSectionRef = useRef<HTMLDivElement>(null);

  // Current real-world date in Asia/Kolkata
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const [initialYear, initialMonth] = todayStr.split('-').map(Number);

  // Calendar Year & Month State (1-indexed month: 1 = Jan, 12 = Dec)
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

  // Selected date for detailed view YYYY-MM-DD
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Calendar Overview Data
  const [calendarOverview, setCalendarOverview] = useState<CalendarOverviewResponse | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(true);

  // Date Details Data
  const [dateDetails, setDateDetails] = useState<CalendarDateDetailsResponse | null>(null);
  const [isLoadingDateDetails, setIsLoadingDateDetails] = useState<boolean>(false);
  const [activeDateTab, setActiveDateTab] = useState<'summary' | 'flights' | 'bookings'>('flights');

  // Filters for Bookings inside Selected Date
  const [bookingSearch, setBookingSearch] = useState<string>('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('ALL');

  // Notifications & Async Actions
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Edit Single Flight Instance Modal State
  const [selectedInstance, setSelectedInstance] = useState<CalendarFlightDetail | null>(null);
  const [editDepTime, setEditDepTime] = useState('');
  const [editArrTime, setEditArrTime] = useState('');
  const [editAdultFare, setEditAdultFare] = useState<number>(0);
  const [editChildFare, setEditChildFare] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('SCHEDULED');
  const [editAvailableSeats, setEditAvailableSeats] = useState<number>(0);
  const [isSavingInstance, setIsSavingInstance] = useState<boolean>(false);

  // Passenger Modal Viewer State
  const [viewingPassengers, setViewingPassengers] = useState<CalendarBookingDetail | null>(null);

  // Create New Flight Modal State directly from Schedule Calendar
  const [showAddFlightModal, setShowAddFlightModal] = useState<boolean>(false);
  const [newFlightCode, setNewFlightCode] = useState<string>('');
  const [newOrigin, setNewOrigin] = useState<string>('Bangalore (BLR)');
  const [newDestination, setNewDestination] = useState<string>('Delhi (DEL)');
  const [newCapacity, setNewCapacity] = useState<number>(180);
  const [newIsActive, setNewIsActive] = useState<boolean>(true);
  const [newSchedules, setNewSchedules] = useState<Array<{
    dayOfWeek: number;
    dayName: string;
    departureTime: string;
    arrivalTime: string;
    adultFare: number;
    childFare: number;
    isOperating: boolean;
  }>>([]);
  const [isSavingNewFlight, setIsSavingNewFlight] = useState<boolean>(false);

  // Load Month Overview when year or month changes
  useEffect(() => {
    loadMonthOverview(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Load Date Details when selectedDateStr changes
  useEffect(() => {
    if (selectedDateStr) {
      loadDateDetails(selectedDateStr);
    }
  }, [selectedDateStr]);

  const loadMonthOverview = async (year: number, month: number) => {
    setIsLoadingOverview(true);
    setError(null);
    try {
      const res = await adminApi.getCalendarOverview({ year, month });
      if (res.data.success) {
        setCalendarOverview(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load calendar schedule overview.');
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const loadDateDetails = async (dateStr: string) => {
    setIsLoadingDateDetails(true);
    try {
      const res = await adminApi.getCalendarDateDetails({ date: dateStr });
      if (res.data.success) {
        setDateDetails(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load date details:', err);
    } finally {
      setIsLoadingDateDetails(false);
    }
  };

  const handleGenerateYearlySchedule = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.generateSchedules(365);
      if (res.data) {
        setSuccessMsg(
          'Idempotent schedule generation completed! Flight instances across 12 months verified and synchronized.'
        );
        loadMonthOverview(selectedYear, selectedMonth);
        if (selectedDateStr) {
          loadDateDetails(selectedDateStr);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate 12-month schedules.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleSelectInstanceForEdit = (inst: CalendarFlightDetail) => {
    setSelectedInstance(inst);
    setEditDepTime(inst.departureTime);
    setEditArrTime(inst.arrivalTime);
    setEditAdultFare(inst.adultFare);
    setEditChildFare(inst.childFare);
    setEditStatus(inst.status);
    setEditAvailableSeats(inst.availableSeats);
  };

  const handleSaveSingleInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstance) return;

    setIsSavingInstance(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await adminApi.updateSingleFlightInstance(selectedInstance.id, {
        departureTime: editDepTime,
        arrivalTime: editArrTime,
        adultFare: Number(editAdultFare),
        childFare: Number(editChildFare),
        status: editStatus,
        availableSeats: Number(editAvailableSeats),
      });

      if (res.data.success) {
        setSuccessMsg(
          `Updated flight departure for ${selectedInstance.flightCode} on ${selectedInstance.travelDate}. Changes applied exclusively to this flight instance without altering future schedules.`
        );
        setSelectedInstance(null);
        loadMonthOverview(selectedYear, selectedMonth);
        loadDateDetails(selectedInstance.travelDate);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update flight instance.');
    } finally {
      setIsSavingInstance(false);
    }
  };

  const handleDateClick = (dateKey: string) => {
    setSelectedDateStr(dateKey);
    setActiveDateTab('flights');
    setTimeout(() => {
      detailsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const initNewFlightForm = () => {
    setNewFlightCode('');
    setNewOrigin('Bangalore (BLR)');
    setNewDestination('Delhi (DEL)');
    setNewCapacity(180);
    setNewIsActive(true);
    const initialRows = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
      dayOfWeek: day,
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      departureTime: '08:00',
      arrivalTime: '10:50',
      adultFare: 5200,
      childFare: 3200,
      isOperating: true,
    }));
    setNewSchedules(initialRows);
    setShowAddFlightModal(true);
  };

  const handleNewScheduleChange = (
    index: number,
    field: string,
    value: any
  ) => {
    setNewSchedules((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveNewFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCode = newFlightCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 2) {
      setError('Please provide a valid flight code (e.g. CF101).');
      return;
    }
    if (!newOrigin.trim() || !newDestination.trim()) {
      setError('Both origin and destination airports are required.');
      return;
    }
    if (newOrigin.trim().toLowerCase() === newDestination.trim().toLowerCase()) {
      setError('Origin and destination must be different airports.');
      return;
    }
    if (newCapacity <= 0) {
      setError('Seating capacity must be a positive integer.');
      return;
    }

    const operatingDays = newSchedules.filter((s) => s.isOperating);
    if (operatingDays.length === 0) {
      setError('At least one day of the week must be marked as operating.');
      return;
    }

    setIsSavingNewFlight(true);
    try {
      const res = await adminApi.createFlight({
        flightCode: cleanCode,
        origin: newOrigin.trim(),
        destination: newDestination.trim(),
        capacity: newCapacity,
        isActive: newIsActive,
        schedules: newSchedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          departureTime: s.departureTime,
          arrivalTime: s.arrivalTime,
          adultFare: Number(s.adultFare),
          childFare: Number(s.childFare),
          isOperating: s.isOperating,
        })),
      });

      if (res.data.success) {
        // Automatically generate 365-day schedule instances
        await adminApi.generateSchedules(365);
        setSuccessMsg(`Flight ${cleanCode} created and 12-month departures generated successfully.`);
        setShowAddFlightModal(false);
        loadMonthOverview(selectedYear, selectedMonth);
        loadDateDetails(selectedDateStr);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create flight.');
    } finally {
      setIsSavingNewFlight(false);
    }
  };

  // Calendar Geometry Calculations
  // Month is 1-indexed (1..12), so Date.UTC(year, month - 1, 1)
  const firstDayOfMonthUtc = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
  const firstDayOfWeek = firstDayOfMonthUtc.getUTCDay(); // 0 = Sun, 1 = Mon ...
  const totalDaysInMonth = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();

  // Summary shortcuts
  const monthlySummary: CalendarMonthSummary = calendarOverview?.monthlySummary || {
    totalScheduledFlights: 0,
    totalBookings: 0,
    totalPassengers: 0,
    totalVerifiedRevenue: 0,
    monthlyOccupancyRate: 0,
    totalCapacity: 0,
    totalAvailableSeats: 0,
    occupiedSeats: 0,
  };

  // Filtered Bookings for Selected Date
  const filteredBookings = (dateDetails?.bookings || []).filter((b) => {
    if (bookingStatusFilter !== 'ALL' && b.bookingStatus !== bookingStatusFilter) {
      return false;
    }
    if (bookingSearch.trim() !== '') {
      const query = bookingSearch.toLowerCase().trim();
      const matchPnr = b.pnr?.toLowerCase().includes(query) || b.bookingReference.toLowerCase().includes(query);
      const matchCustomer = b.customerName?.toLowerCase().includes(query) || b.customerEmail?.toLowerCase().includes(query);
      const matchFlight = b.flightCode?.toLowerCase().includes(query);
      return matchPnr || matchCustomer || matchFlight;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold tracking-wide uppercase mb-2">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Full-Year Fleet Operations</span>
          </div>
          <h1 className="text-2xl font-black text-navy-950">12-Month Flight Schedule Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full 12-month calendar navigation with live schedules, occupancy rates, passenger manifests, and flight overrides.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={initNewFlightForm}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-navy-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Add New Flight</span>
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateYearlySchedule}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating 365 Days...' : 'Generate 12-Month Schedules'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Monthly Overview Summary Cards (5 Key Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Scheduled Flights */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Scheduled Flights</span>
            <Plane className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {monthlySummary.totalScheduledFlights.toLocaleString()}
          </p>
          <span className="text-[10px] text-blue-600 font-semibold">
            in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </span>
        </div>

        {/* Total Bookings */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Month Bookings</span>
            <Ticket className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {monthlySummary.totalBookings.toLocaleString()}
          </p>
          <span className="text-[10px] text-indigo-600 font-semibold">
            orders confirmed & pending
          </span>
        </div>

        {/* Total Passengers */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Passengers</span>
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-black text-violet-800">
            {monthlySummary.totalPassengers.toLocaleString()}
          </p>
          <span className="text-[10px] text-violet-600 font-semibold">
            travelling in month
          </span>
        </div>

        {/* Verified Revenue */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Verified Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">
            ₹{monthlySummary.totalVerifiedRevenue.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            settled payments
          </span>
        </div>

        {/* Seat Occupancy Rate */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Seat Occupancy</span>
            <Percent className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-600">
            {monthlySummary.monthlyOccupancyRate}%
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
            <div
              className="bg-blue-600 h-1 rounded-full"
              style={{ width: `${Math.min(100, monthlySummary.monthlyOccupancyRate)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">
            {monthlySummary.occupiedSeats} / {monthlySummary.totalCapacity} seats
          </span>
        </div>
      </div>

      {/* Calendar Color Code & Status Legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] flex items-center space-x-1">
          <span>Schedule Legend:</span>
        </span>
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-slate-600 font-semibold text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200"></span>
            <span>Today</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-md border-2 border-blue-600 bg-blue-100"></span>
            <span>Selected Date</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Scheduled Flights</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Delayed</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Cancelled</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
            <span>Fully Booked</span>
          </div>
        </div>
      </div>

      {/* Year & Month Navigation Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Year selector & Prev/Next Month */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 px-2">
              <span className="text-lg sm:text-xl font-black text-navy-950">
                {MONTH_NAMES[selectedMonth - 1]}
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1 text-sm sm:text-base font-black text-navy-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedYear(initialYear);
                setSelectedMonth(initialMonth);
                setSelectedDateStr(todayStr);
              }}
              className="ml-2 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200"
            >
              Current Month
            </button>
          </div>

          {/* Quick Date Display */}
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Selected Date:</span>
            <span className="font-bold text-navy-950 bg-slate-100 px-2.5 py-1 rounded-xl">
              {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* 12-Month Quick Tab Strip */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {MONTH_SHORT.map((mShort, idx) => {
            const mNum = idx + 1;
            const isSelected = selectedMonth === mNum;
            const isCurrentMonth = selectedYear === initialYear && initialMonth === mNum;

            return (
              <button
                key={mShort}
                type="button"
                onClick={() => setSelectedMonth(mNum)}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isCurrentMonth
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{mShort}</span>
                {isCurrentMonth && (
                  <span className={`text-[8px] font-extrabold uppercase ${isSelected ? 'text-blue-100' : 'text-blue-600'}`}>
                    Now
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Responsive Calendar Wrapper for all screen widths */}
        <div className="overflow-x-auto pb-2 -mx-2 px-2">
          <div className="min-w-[560px]">
            {/* 7-Day Weekday Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider text-slate-400 py-2 border-b border-slate-100">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Grid (Days & Badges) */}
            {isLoadingOverview ? (
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2">
                {Array.from({ length: 35 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="min-h-[95px] sm:min-h-[115px] bg-slate-50/70 rounded-2xl animate-pulse border border-slate-100"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2">
                {/* Blank offset tiles for first week */}
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <div
                    key={`offset-${idx}`}
                    className="min-h-[95px] sm:min-h-[115px] bg-slate-50/40 rounded-2xl border border-dashed border-slate-100"
                  />
                ))}

                {/* Actual Month Days */}
                {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayData: CalendarDayOverview | undefined = calendarOverview?.days?.[dateKey];

                  const isToday = dateKey === todayStr;
                  const isSelected = dateKey === selectedDateStr;

                  return (
                    <div
                      key={dateKey}
                      onClick={() => handleDateClick(dateKey)}
                      className={`min-h-[100px] sm:min-h-[118px] rounded-2xl p-2 border transition cursor-pointer flex flex-col justify-between select-none ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/30 shadow-md scale-[1.01]'
                          : isToday
                          ? 'border-blue-400 bg-blue-50/20 hover:border-blue-500 hover:shadow-xs'
                          : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs'
                      }`}
                    >
                      {/* Top Bar: Date number + Flight Count Badge */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black ${
                            isToday
                              ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center'
                              : isSelected
                              ? 'text-blue-700'
                              : 'text-slate-800'
                          }`}
                        >
                          {dayNum}
                        </span>

                        {dayData && dayData.flightCount > 0 && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {dayData.flightCount} flt{dayData.flightCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Middle Indicators: Bookings & Status Flags */}
                      <div className="space-y-1 my-1">
                        {/* Booking badge */}
                        {dayData && dayData.bookingCount > 0 && (
                          <div className="flex items-center space-x-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                            <Ticket className="w-2.5 h-2.5 flex-shrink-0" />
                            <span>
                              {dayData.bookingCount} bkgs ({dayData.passengerCount} pax)
                            </span>
                          </div>
                        )}

                        {/* Status Flags: Cancellation, Delay, or Fully Booked */}
                        <div className="flex flex-wrap gap-1">
                          {dayData?.hasCancelledFlights && (
                            <span className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-rose-100 text-rose-800">
                              Cancelled
                            </span>
                          )}
                          {dayData?.hasDelayedFlights && (
                            <span className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-amber-100 text-amber-800">
                              Delayed
                            </span>
                          )}
                          {dayData?.isFullyBooked && (
                            <span className="px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-800 text-white">
                              Full
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Flight Chips Preview */}
                      <div className="space-y-0.5 overflow-hidden">
                        {dayData?.flightsSample && dayData.flightsSample.length > 0 ? (
                          dayData.flightsSample.slice(0, 2).map((f) => (
                            <div
                              key={f.id}
                              className="text-[9px] font-semibold text-slate-600 truncate flex items-center justify-between"
                            >
                              <span className="truncate">{f.flightCode}</span>
                              <span className="font-mono text-[8px] text-slate-400 ml-1">{f.departureTime}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-[9px] text-slate-300 italic">No flights</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Details Drawer / Panel */}
      <div ref={detailsSectionRef} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Date Details Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-black text-navy-950">
                Detailed Operations for {selectedDateStr}
              </h3>
              {selectedDateStr === todayStr && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  TODAY
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Complete schedule, passenger lists, and payment reconciliations for this travel date.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveDateTab('summary')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeDateTab === 'summary'
                  ? 'bg-white text-navy-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Summary
            </button>
            <button
              type="button"
              onClick={() => setActiveDateTab('flights')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
                activeDateTab === 'flights'
                  ? 'bg-white text-navy-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Flight Schedule</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {dateDetails?.flights.length ?? 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDateTab('bookings')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
                activeDateTab === 'bookings'
                  ? 'bg-white text-navy-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Bookings Info</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {dateDetails?.bookings.length ?? 0}
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1: Daily Summary Cards */}
        {activeDateTab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Flights on Date */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Flights
                </span>
                <p className="text-xl font-black text-slate-900">
                  {dateDetails?.dailySummary.totalFlights ?? 0}
                </p>
                <span className="text-[10px] text-slate-500">Scheduled departures</span>
              </div>

              {/* Total Bookings */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Bookings
                </span>
                <p className="text-xl font-black text-slate-900">
                  {dateDetails?.dailySummary.totalBookings ?? 0}
                </p>
                <span className="text-[10px] text-slate-500">Orders placed for date</span>
              </div>

              {/* Confirmed Bookings */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Confirmed
                </span>
                <p className="text-xl font-black text-emerald-700">
                  {dateDetails?.dailySummary.confirmedBookings ?? 0}
                </p>
                <span className="text-[10px] text-emerald-600">Active reservations</span>
              </div>

              {/* Pending Bookings */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Pending Verification
                </span>
                <p className="text-xl font-black text-amber-700">
                  {dateDetails?.dailySummary.pendingBookings ?? 0}
                </p>
                <span className="text-[10px] text-amber-600">Awaiting UTR approval</span>
              </div>

              {/* Cancelled Bookings */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                  Cancellations
                </span>
                <p className="text-xl font-black text-rose-700">
                  {dateDetails?.dailySummary.cancelledBookings ?? 0}
                </p>
                <span className="text-[10px] text-rose-600">Released tickets</span>
              </div>

              {/* Travelling Passengers */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">
                  Travelling Passengers
                </span>
                <p className="text-xl font-black text-violet-800">
                  {dateDetails?.dailySummary.travellingPassengers ?? 0}
                </p>
                <span className="text-[10px] text-violet-600">Ticketed passengers</span>
              </div>

              {/* Date Verified Revenue */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Verified Revenue
                </span>
                <p className="text-xl font-black text-emerald-700">
                  ₹{(dateDetails?.dailySummary.verifiedRevenue ?? 0).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-emerald-600">Verified payments</span>
              </div>

              {/* Seat Occupancy */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Seat Occupancy
                </span>
                <p className="text-xl font-black text-blue-600">
                  {dateDetails?.dailySummary.occupancyRate ?? 0}%
                </p>
                <span className="text-[10px] text-slate-500">
                  {dateDetails?.dailySummary.occupiedSeats ?? 0} / {dateDetails?.dailySummary.totalCapacity ?? 0} seats
                </span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveDateTab('flights')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Inspect Flight Manifest ({dateDetails?.flights.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveDateTab('bookings')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                View Passenger Bookings ({dateDetails?.bookings.length ?? 0})
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Flight Schedule with Enhanced Flight Timings & Operations View */}
        {activeDateTab === 'flights' && (
          <div className="space-y-4">
            {/* Summary Bar for Selected Date */}
            <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-extrabold text-navy-950">
                  {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="font-semibold text-blue-800">
                  {dateDetails?.flights.length ?? 0} Departures Scheduled
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={initNewFlightForm}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Flight</span>
                </button>
              </div>
            </div>

            {dateDetails?.flights && dateDetails.flights.length > 0 ? (
              <div className="space-y-3">
                {dateDetails.flights.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 sm:p-5 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl shadow-xs hover:shadow-sm transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Left: Flight Code, Airline & Route */}
                    <div className="space-y-1 sm:min-w-[220px]">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 bg-navy-950 text-white font-mono font-black text-xs rounded-lg">
                          {f.flightCode}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{f.airlineName}</span>
                      </div>
                      <p className="text-sm font-black text-navy-950 pt-1">
                        {f.origin} &rarr; {f.destination}
                      </p>
                    </div>

                    {/* Center: Timings Block with Clock */}
                    <div className="flex items-center space-x-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Departure</span>
                        <span className="text-base font-black text-navy-950 font-mono flex items-center justify-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{f.departureTime}</span>
                        </span>
                      </div>

                      <div className="text-center px-2">
                        <Plane className="w-4 h-4 text-blue-400 transform -rotate-45 mx-auto" />
                        <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Non-stop</span>
                      </div>

                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Arrival</span>
                        <span className="text-base font-black text-navy-950 font-mono">
                          {f.arrivalTime}
                        </span>
                      </div>
                    </div>

                    {/* Seats & Occupancy Bar */}
                    <div className="space-y-1 sm:w-44">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Available Seats:</span>
                        <span className="font-extrabold text-navy-950 font-mono">
                          {f.availableSeats} / {f.capacity}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            f.occupancyRate >= 90
                              ? 'bg-rose-500'
                              : f.occupancyRate >= 60
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, f.occupancyRate)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block text-right font-bold">
                        {f.occupancyRate}% Booked
                      </span>
                    </div>

                    {/* Fares & Status */}
                    <div className="flex items-center space-x-3 justify-between lg:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Base Fares</span>
                        <span className="text-xs font-black text-slate-800">
                          ₹{f.adultFare.toLocaleString('en-IN')} <span className="text-slate-400 font-normal">/ ₹{f.childFare.toLocaleString('en-IN')}</span>
                        </span>
                      </div>

                      <div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            f.status === 'SCHEDULED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : f.status === 'DELAYED'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : f.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {f.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectInstanceForEdit(f)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold rounded-xl text-xs transition"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 px-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                <Plane className="w-8 h-8 text-slate-300 mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-700 text-sm">No Flights Scheduled for {selectedDateStr}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Generate the recurring 365-day schedule or add a new commercial flight route to populate this date.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={initNewFlightForm}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Flight</span>
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerateYearlySchedule}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    Generate 12-Month Schedules
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Bookings Information Table with Search & Status Filters */}
        {activeDateTab === 'bookings' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search PNR, customer, flight..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <label className="text-xs font-bold text-slate-500 uppercase">Status:</label>
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
                >
                  <option value="ALL">All Statuses ({dateDetails?.bookings.length ?? 0})</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {filteredBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">PNR / Ref</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Flight / Route</th>
                      <th className="py-2.5 px-3">Passengers</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Payment</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">View Pax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-mono font-bold text-navy-950">
                          {b.pnr}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Ref: {b.bookingReference}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {b.customerName}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {b.customerEmail}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          <span className="font-bold text-slate-900">{b.flightCode}</span> &bull; {b.route}
                          <span className="block text-[10px] font-mono text-slate-400">
                            Dep: {b.departureTime}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900">
                            {b.passengerCount} {b.passengerCount > 1 ? 'Passengers' : 'Passenger'}
                          </span>
                          <span className="block text-[10px] text-slate-400 truncate max-w-[150px]">
                            {b.passengers.map((p) => p.name).join(', ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          ₹{b.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              b.paymentStatus === 'CONFIRMED' || b.paymentStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.paymentStatus === 'PENDING_VERIFICATION'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {b.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              b.bookingStatus === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {b.bookingStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setViewingPassengers(b)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No passenger bookings found matching criteria for {selectedDateStr}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Single Flight Instance Modal */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Plane className="w-5 h-5 transform -rotate-45" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-navy-950">
                    Edit Flight Departure Instance
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedInstance.flightCode} &bull; {selectedInstance.travelDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInstance(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800">
              <span className="font-bold">Single Instance Override:</span> Any modifications made here apply exclusively to this departure on <span className="font-bold">{selectedInstance.travelDate}</span> without altering historical departures or recurring weekly schedule rules.
            </div>

            <form onSubmit={handleSaveSingleInstance} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departure Time (HH:mm)</label>
                  <input
                    type="text"
                    required
                    pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                    value={editDepTime}
                    onChange={(e) => setEditDepTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Arrival Time (HH:mm)</label>
                  <input
                    type="text"
                    required
                    pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                    value={editArrTime}
                    onChange={(e) => setEditArrTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Adult Fare (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editAdultFare}
                    onChange={(e) => setEditAdultFare(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Child Fare (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editChildFare}
                    onChange={(e) => setEditChildFare(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Flight Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
                  >
                    <option value="SCHEDULED">SCHEDULED (Normal)</option>
                    <option value="DELAYED">DELAYED (Postponed)</option>
                    <option value="CANCELLED">CANCELLED (Grounded)</option>
                    <option value="BOARDING">BOARDING (Gates Open)</option>
                    <option value="COMPLETED">COMPLETED (Arrived)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Available Seats</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={selectedInstance.capacity}
                    value={editAvailableSeats}
                    onChange={(e) => setEditAvailableSeats(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedInstance(null)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInstance}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-md transition"
                >
                  {isSavingInstance ? 'Saving...' : 'Save Instance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Passenger Manifest Modal */}
      {viewingPassengers && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-navy-950">
                  Passenger Manifest ({viewingPassengers.pnr})
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingPassengers.flightCode} &bull; {viewingPassengers.travelDate}
                </p>
              </div>
              <button
                onClick={() => setViewingPassengers(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="font-semibold text-slate-500">Contact Person:</p>
                <p className="font-bold text-slate-900">{viewingPassengers.customerName}</p>
                <p className="text-slate-600">{viewingPassengers.customerEmail} &bull; {viewingPassengers.customerPhone}</p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500">
                    <tr>
                      <th className="p-2.5">Passenger Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Seat</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingPassengers.passengers.map((p, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-slate-900">{p.name}</td>
                        <td className="p-2.5 text-slate-600">{p.type}</td>
                        <td className="p-2.5 font-mono font-bold text-blue-600">
                          {p.seatNumber}
                        </td>
                        <td className="p-2.5 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              p.isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.isCancelled ? 'CANCELLED' : 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingPassengers(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create New Flight Overlay Modal */}
      {showAddFlightModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-navy-950 flex items-center space-x-2">
                <Plane className="w-5 h-5 text-blue-600" />
                <span>Configure New Commercial Flight</span>
              </h2>
              <button
                onClick={() => setShowAddFlightModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewFlight} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Flight Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CF101"
                    value={newFlightCode}
                    onChange={(e) => setNewFlightCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Origin Airport
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bangalore (BLR)"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Destination Airport
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delhi (DEL)"
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Weekly Schedule Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-navy-950">Weekly Schedule</h3>
                  <span className="text-xs text-slate-400">Times in HH:mm (24-hour format)</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Day</th>
                        <th className="py-2.5 px-3">Departure</th>
                        <th className="py-2.5 px-3">Arrival</th>
                        <th className="py-2.5 px-3">Adult Fare (₹)</th>
                        <th className="py-2.5 px-3">Child Fare (₹)</th>
                        <th className="py-2.5 px-3 text-center">Operating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newSchedules.map((row, idx) => (
                        <tr key={row.dayOfWeek} className={!row.isOperating ? 'bg-slate-50/50 opacity-60' : ''}>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{row.dayName}</td>
                          <td className="py-2 px-3">
                            <input
                              type="time"
                              required
                              disabled={!row.isOperating}
                              value={row.departureTime}
                              onChange={(e) => handleNewScheduleChange(idx, 'departureTime', e.target.value)}
                              className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="time"
                              required
                              disabled={!row.isOperating}
                              value={row.arrivalTime}
                              onChange={(e) => handleNewScheduleChange(idx, 'arrivalTime', e.target.value)}
                              className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              required
                              disabled={!row.isOperating}
                              value={row.adultFare}
                              onChange={(e) => handleNewScheduleChange(idx, 'adultFare', Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              required
                              disabled={!row.isOperating}
                              value={row.childFare}
                              onChange={(e) => handleNewScheduleChange(idx, 'childFare', Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.isOperating}
                              onChange={(e) => handleNewScheduleChange(idx, 'isOperating', e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFlightModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewFlight}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingNewFlight ? 'Creating Flight...' : 'Save & Generate Schedules'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
