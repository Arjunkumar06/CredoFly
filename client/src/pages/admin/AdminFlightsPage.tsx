import React, { useState, useEffect } from 'react';
import { Plane, Plus, Edit, Check, X, AlertCircle, Save, Calendar, Trash2 } from 'lucide-react';
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
  const [isGeneratingSchedules, setIsGeneratingSchedules] = useState(false);

  // Delete / Deactivate modal state
  const [flightToDelete, setFlightToDelete] = useState<Flight | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteFlight = async () => {
    if (!flightToDelete) return;
    setIsDeleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.deleteFlight(flightToDelete.id);
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setFlightToDelete(null);
        loadFlights();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete flight.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateSchedules = async () => {
    setIsGeneratingSchedules(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.generateSchedules(365);
      if (res.data.success) {
        setSuccessMsg(
          `Idempotently generated ${res.data.generatedCount} dated flight departures across the fleet for the next 12 months.`
        );
        loadFlights();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate 12-month schedules.');
    } finally {
      setIsGeneratingSchedules(false);
    }
  };

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

    const cleanCode = flightCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 2) {
      setError('Please provide a valid flight code with at least 2 characters (e.g. CF101).');
      return;
    }

    if (!origin.trim() || !destination.trim()) {
      setError('Both origin and destination airports are required.');
      return;
    }

    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setError('Origin and destination must be different airports.');
      return;
    }

    if (capacity <= 0) {
      setError('Seating capacity must be a positive integer.');
      return;
    }

    const operatingDays = schedules.filter((s) => s.isOperating);
    if (operatingDays.length === 0) {
      setError('At least one day of the week must be marked as operating.');
      return;
    }

    for (const op of operatingDays) {
      if (!op.departureTime || !op.arrivalTime) {
        setError(`Please provide valid departure and arrival times for ${op.dayName}.`);
        return;
      }
      if (op.adultFare <= 0 || op.childFare <= 0) {
        setError(`Fares must be greater than zero for ${op.dayName}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (selectedFlightId) {
        // Update flight
        const res = await adminApi.updateFlight(selectedFlightId, {
          origin: origin.trim(),
          destination: destination.trim(),
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
          try {
            await adminApi.generateSchedules(365);
          } catch (genErr) {
            console.warn('Auto-schedule generation warning:', genErr);
          }
          setSuccessMsg(`Flight ${cleanCode} updated successfully.`);
          setIsEditing(false);
          loadFlights();
        }
      } else {
        // Create new flight
        const res = await adminApi.createFlight({
          flightCode: cleanCode,
          origin: origin.trim(),
          destination: destination.trim(),
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
          // Immediately regenerate schedules for the new flight so it's live in 12-month calendar
          try {
            await adminApi.generateSchedules(365);
          } catch (genErr) {
            console.warn('Auto-schedule generation warning:', genErr);
          }
          setSuccessMsg(`Flight ${cleanCode} created successfully and populated into 12-month calendar.`);
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
        <div className="flex items-center space-x-3">
          <button
            type="button"
            disabled={isGeneratingSchedules}
            onClick={handleGenerateSchedules}
            className="inline-flex items-center space-x-2 px-4 py-2 border border-blue-600 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs sm:text-sm rounded-xl transition"
          >
            <Calendar className="w-4 h-4" />
            <span>{isGeneratingSchedules ? 'Generating 365 Days...' : 'Generate 12-Month Schedules'}</span>
          </button>

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

      {/* Flight Editor Overlay Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-navy-950 flex items-center space-x-2">
                <Plane className="w-5 h-5 text-blue-600" />
                <span>{selectedFlightId ? `Edit Flight: ${flightCode}` : 'Configure New Commercial Flight'}</span>
              </h2>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          <form onSubmit={handleSaveFlight} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Status
                </label>
                <select
                  value={isActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold bg-white"
                >
                  <option value="ACTIVE">Active (Live)</option>
                  <option value="INACTIVE">Inactive (Disabled)</option>
                </select>
              </div>
            </div>

            {/* Weekly Schedule Table (Monday through Sunday) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy-950">Weekly Schedule</h3>
                <span className="text-xs text-slate-400">Times in HH:mm (24-hour format)</span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full min-w-[550px] text-left text-xs">
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
                            min={1}
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
                            min={1}
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
      </div>
      )}

      {/* Delete / Deactivate Confirmation Modal */}
      {flightToDelete && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-navy-950">
                Delete or Deactivate Flight {flightToDelete.flightCode}?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                If this flight has existing booking records, it will be safely <strong>deactivated and cancelled for future dates</strong> to protect all passenger booking and payment history.
                If it has zero bookings, it will be <strong>permanently deleted</strong>.
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFlightToDelete(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteFlight}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete / Deactivate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flights Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Configured Flights ({flights.length})</h3>
        </div>

        {/* Mobile View: Clean Cards for screen widths < 640px */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {flights.map((f) => {
            const activeDays = f.schedules?.filter((s) => s.isOperating).length || 0;
            return (
              <div key={f.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-navy-950 text-base">{f.flightCode}</span>
                    {f.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-600">{f.capacity} seats</span>
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  {f.origin} &rarr; {f.destination}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span>{activeDays} / 7 days active</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditFlight(f)}
                      className="px-2.5 py-1.5 border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setFlightToDelete(f)}
                      className="p-1.5 border border-slate-200 hover:border-rose-400 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Delete or Deactivate Flight"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop & Tablet Table: screen widths >= 640px */}
        <div className="hidden sm:block overflow-x-auto">
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
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditFlight(f)}
                          className="px-3 py-1.5 border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold transition"
                        >
                          Edit & Schedule
                        </button>
                        <button
                          onClick={() => setFlightToDelete(f)}
                          className="p-1.5 border border-slate-200 hover:border-rose-400 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete or Deactivate Flight"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
