import React, { useState, useEffect } from 'react';
import { Plane, Plus, Edit, Check, X, AlertCircle, Save } from 'lucide-react';
import { adminApi } from '../../services/api';
import { Flight } from '../../types';

interface ScheduleFormRow {
  dayOfWeek: number;
  dayName: string;
  departureTime: string;
  arrivalTime: string;
  adultFare: number;
  childFare: number;
  isOperating: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const AdminFlightsPage: React.FC = () => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Flight Editor modal / form state
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [flightCode, setFlightCode] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [capacity, setCapacity] = useState<number>(180);
  const [isActive, setIsActive] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleFormRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFlights();
  }, []);

  const loadFlights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getFlights();
      if (res.data.success) {
        setFlights(res.data.flights);
      }
    } catch {
      setError('Failed to fetch flight list.');
    } finally {
      setIsLoading(false);
    }
  };

  const initNewFlightForm = () => {
    setSelectedFlightId(null);
    setFlightCode('');
    setOrigin('Bangalore (BLR)');
    setDestination('Delhi (DEL)');
    setCapacity(180);
    setIsActive(true);

    // Default Monday-Sunday schedule (0=Sun, 1=Mon, ..., 6=Sat)
    const initialRows: ScheduleFormRow[] = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
      dayOfWeek: day,
      dayName: DAYS[day],
      departureTime: '08:00',
      arrivalTime: '10:50',
      adultFare: 5200,
      childFare: 3200,
      isOperating: true,
    }));
    setSchedules(initialRows);
    setIsEditing(true);
  };

  const handleEditFlight = (f: Flight) => {
    setSelectedFlightId(f.id);
    setFlightCode(f.flightCode);
    setOrigin(f.origin);
    setDestination(f.destination);
    setCapacity(f.capacity);
    setIsActive(f.isActive);

    // Populate schedules
    const rows: ScheduleFormRow[] = [1, 2, 3, 4, 5, 6, 0].map((day) => {
      const existing = f.schedules?.find((s) => s.dayOfWeek === day);
      return {
        dayOfWeek: day,
        dayName: DAYS[day],
        departureTime: existing?.departureTime || '08:00',
        arrivalTime: existing?.arrivalTime || '10:50',
        adultFare: existing ? Number(existing.adultFare) : 5200,
        childFare: existing ? Number(existing.childFare) : 3200,
        isOperating: existing ? existing.isOperating : true,
      };
    });
    setSchedules(rows);
    setIsEditing(true);
  };

  const handleScheduleChange = (
    index: number,
    field: keyof ScheduleFormRow,
    value: any
  ) => {
    setSchedules((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setError('Origin and destination must be different airports.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedFlightId) {
        // Update flight
        const res = await adminApi.updateFlight(selectedFlightId, {
          origin,
          destination,
          capacity,
          isActive,
          schedules: schedules.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            departureTime: s.departureTime,
            arrivalTime: s.arrivalTime,
            adultFare: Number(s.adultFare),
            childFare: Number(s.childFare),
            isOperating: s.isOperating,
          })),
        });
        if (res.data.success) {
          setSuccessMsg(`Flight ${flightCode} updated successfully.`);
          setIsEditing(false);
          loadFlights();
        }
      } else {
        // Create new flight
        const res = await adminApi.createFlight({
          flightCode,
          origin,
          destination,
          capacity,
          isActive,
          schedules: schedules.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            departureTime: s.departureTime,
            arrivalTime: s.arrivalTime,
            adultFare: Number(s.adultFare),
            childFare: Number(s.childFare),
            isOperating: s.isOperating,
          })),
        });
        if (res.data.success) {
          setSuccessMsg(`Flight ${flightCode} created successfully with 7-day schedule.`);
          setIsEditing(false);
          loadFlights();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save flight.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-950">Flight Configuration</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage commercial flights, capacities, routes, and day-by-day weekly departure schedules.
          </p>
        </div>
        <div>
          <button
            onClick={initNewFlightForm}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Flight</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Editor Modal / Form */}
      {isEditing && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-lg p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-navy-950 flex items-center space-x-2">
              <Plane className="w-5 h-5 text-blue-600" />
              <span>{selectedFlightId ? `Edit Flight: ${flightCode}` : 'Configure New Flight'}</span>
            </h2>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveFlight} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Flight Code
                </label>
                <input
                  type="text"
                  required
                  disabled={!!selectedFlightId} // Code unique & immutable once created
                  placeholder="e.g. CF101"
                  value={flightCode}
                  onChange={(e) => setFlightCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold uppercase disabled:bg-slate-100"
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
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
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
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
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
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Weekly Schedule Table (Monday through Sunday) */}
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
                    {schedules.map((row, idx) => (
                      <tr key={row.dayOfWeek} className={!row.isOperating ? 'bg-slate-50/50 opacity-60' : ''}>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{row.dayName}</td>
                        <td className="py-2 px-3">
                          <input
                            type="time"
                            required
                            disabled={!row.isOperating}
                            value={row.departureTime}
                            onChange={(e) => handleScheduleChange(idx, 'departureTime', e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="time"
                            required
                            disabled={!row.isOperating}
                            value={row.arrivalTime}
                            onChange={(e) => handleScheduleChange(idx, 'arrivalTime', e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            required
                            disabled={!row.isOperating}
                            value={row.adultFare}
                            onChange={(e) => handleScheduleChange(idx, 'adultFare', Number(e.target.value))}
                            className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            required
                            disabled={!row.isOperating}
                            value={row.childFare}
                            onChange={(e) => handleScheduleChange(idx, 'childFare', Number(e.target.value))}
                            className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-xs"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.isOperating}
                            onChange={(e) => handleScheduleChange(idx, 'isOperating', e.target.checked)}
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
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Flight'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Flights Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Configured Flights ({flights.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Flight Code</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Operating Days</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flights.map((f) => {
                const activeDays = f.schedules?.filter((s) => s.isOperating).length || 0;
                return (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-black text-navy-950 text-sm">
                      {f.flightCode}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {f.origin} &rarr; {f.destination}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {f.capacity} seats
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {activeDays} / 7 days active
                    </td>
                    <td className="py-3.5 px-4">
                      {f.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleEditFlight(f)}
                        className="px-3 py-1.5 border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold transition"
                      >
                        Edit & Schedule
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
