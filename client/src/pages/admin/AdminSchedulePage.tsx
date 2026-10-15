import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plane,
  Clock,
  Plus,
  RefreshCw,
  Edit2,
  Check,
  AlertCircle,
  X,
  Sparkles,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { adminApi } from '../../services/api';

interface ScheduleInstance {
  id: string;
  flightId: string;
  flightCode: string;
  airlineName: string;
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  capacity: number;
  availableSeats: number;
  bookedSeats: number;
  adultFare: number;
  childFare: number;
  status: string;
  bookingsCount: number;
}

export const AdminSchedulePage: React.FC = () => {
  // Current viewed month: default current year and month
  const today = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [instances, setInstances] = useState<ScheduleInstance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Selected instance for single editing modal / slide-over
  const [selectedInstance, setSelectedInstance] = useState<ScheduleInstance | null>(null);
  const [editDepTime, setEditDepTime] = useState('');
  const [editArrTime, setEditArrTime] = useState('');
  const [editAdultFare, setEditAdultFare] = useState<number>(0);
  const [editChildFare, setEditChildFare] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('SCHEDULED');
  const [isSavingInstance, setIsSavingInstance] = useState<boolean>(false);

  // Date selection state
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    today.toISOString().slice(0, 10)
  );

  // Filter state
  const [flightFilter, setFlightFilter] = useState<string>('ALL');

  useEffect(() => {
    loadMonthSchedule();
  }, [currentDate]);

  const loadMonthSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Start from first day of month to last day of month
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);

      const startDateStr = start.toISOString().slice(0, 10);
      const endDateStr = end.toISOString().slice(0, 10);

      const res = await adminApi.getScheduleInstances({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      if (res.data.success) {
        setInstances(res.data.instances || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load schedule calendar.');
    } finally {
      setIsLoading(false);
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
          `Idempotent generation completed! Generated/verified flight instances for the next 12 months.`
        );
        loadMonthSchedule();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate 12-month schedules.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSelectInstanceForEdit = (inst: ScheduleInstance) => {
    setSelectedInstance(inst);
    setEditDepTime(inst.departureTime);
    setEditArrTime(inst.arrivalTime);
    setEditAdultFare(inst.adultFare);
    setEditChildFare(inst.childFare);
    setEditStatus(inst.status);
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
      });

      if (res.data.success) {
        setSuccessMsg(
          `Updated flight departure for ${selectedInstance.flightCode} on ${selectedInstance.travelDate}. Changes applied exclusively to this flight instance without altering future schedules.`
        );
        setSelectedInstance(null);
        loadMonthSchedule();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update flight instance.');
    } finally {
      setIsSavingInstance(false);
    }
  };

  // Calendar geometry calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Group instances by date YYYY-MM-DD
  const instancesByDate = new Map<string, ScheduleInstance[]>();
  instances.forEach((inst) => {
    if (flightFilter !== 'ALL' && inst.flightCode !== flightFilter) return;
    const list = instancesByDate.get(inst.travelDate) || [];
    list.push(inst);
    instancesByDate.set(inst.travelDate, list);
  });

  const uniqueFlightCodes = Array.from(new Set(instances.map((i) => i.flightCode))).sort();
  const selectedDateInstances = instancesByDate.get(selectedDateStr) || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold tracking-wide uppercase mb-2">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Fleet Operations</span>
          </div>
          <h1 className="text-2xl font-black text-navy-950">12-Month Flight Schedule Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View live departures, generate yearly flight schedules idempotently, and manage single flight exceptions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
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
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-2xl flex items-center space-x-3 shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-2xl flex items-center space-x-3 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Calendar Bar & Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg sm:text-xl font-black text-navy-950 px-2 min-w-[200px] text-center">
              {monthName}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Filter Flight:
            </label>
            <select
              value={flightFilter}
              onChange={(e) => setFlightFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
            >
              <option value="ALL">All Flights ({instances.length} departures)</option>
              {uniqueFlightCodes.map((code) => (
                <option key={code} value={code}>
                  Flight {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 7-Day Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider text-slate-400 py-2 border-b border-slate-100">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* 35/42 Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty spacer blocks for first week */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`spacer-${idx}`} className="min-h-[90px] sm:min-h-[110px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 p-1"></div>
          ))}

          {/* Actual days */}
          {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayFlights = instancesByDate.get(dayStr) || [];
            const isToday = dayStr === today.toISOString().slice(0, 10);
            const isSelected = dayStr === selectedDateStr;

            return (
              <div
                key={dayStr}
                onClick={() => setSelectedDateStr(dayStr)}
                className={`min-h-[90px] sm:min-h-[110px] rounded-2xl p-1.5 sm:p-2 border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm'
                    : isToday
                    ? 'border-slate-300 bg-amber-50/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center'
                        : isSelected
                        ? 'text-blue-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayFlights.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {dayFlights.length} flt{dayFlights.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Chips */}
                <div className="space-y-1 mt-1 overflow-y-auto max-h-[70px] scrollbar-none">
                  {dayFlights.slice(0, 3).map((f) => {
                    const isCancelled = f.status === 'CANCELLED';
                    const isDelayed = f.status === 'DELAYED';
                    return (
                      <div
                        key={f.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectInstanceForEdit(f);
                        }}
                        className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold truncate transition border flex items-center justify-between ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-700 border-rose-200 line-through'
                            : isDelayed
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-blue-100 hover:text-blue-800'
                        }`}
                        title={`${f.flightCode} (${f.origin} → ${f.destination}) at ${f.departureTime}`}
                      >
                        <span>{f.flightCode}</span>
                        <span className="font-mono text-[8px] opacity-75">{f.departureTime}</span>
                      </div>
                    );
                  })}
                  {dayFlights.length > 3 && (
                    <div className="text-[9px] text-blue-600 font-bold text-center">
                      +{dayFlights.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Details Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-black text-navy-950 flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>Departures for {selectedDateStr}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {selectedDateInstances.length} scheduled flight departures found for this day.
            </p>
          </div>
        </div>

        {selectedDateInstances.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No scheduled departures on this date. Click &quot;Generate 12-Month Schedules&quot; above to populate recurring flights.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Flight</th>
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3">Departure / Arrival</th>
                  <th className="py-2.5 px-3">Available / Capacity</th>
                  <th className="py-2.5 px-3">Adult / Child Fare</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedDateInstances.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-extrabold text-navy-950">
                      {f.flightCode}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {f.origin} &rarr; {f.destination}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800">
                      {f.departureTime} - {f.arrivalTime}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">{f.availableSeats}</span>
                      <span className="text-slate-400 text-[10px]"> / {f.capacity}</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      ₹{f.adultFare.toLocaleString('en-IN')} / ₹{f.childFare.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          f.status === 'SCHEDULED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : f.status === 'DELAYED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSelectInstanceForEdit(f)}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold rounded-lg text-xs transition"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Instance</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Single Flight Instance Modal */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
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
              <span className="font-bold">Single Instance Mode:</span> Any modifications made here apply exclusively to this departure on <span className="font-bold">{selectedInstance.travelDate}</span> without altering historical departures or recurring weekly schedule rules.
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Flight Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold"
                >
                  <option value="SCHEDULED">SCHEDULED (Normal Operations)</option>
                  <option value="DELAYED">DELAYED (Departure Postponed)</option>
                  <option value="CANCELLED">CANCELLED (Departure Cancelled)</option>
                  <option value="BOARDING">BOARDING (Gates Open)</option>
                  <option value="COMPLETED">COMPLETED (Arrived at Destination)</option>
                </select>
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
    </div>
  );
};
