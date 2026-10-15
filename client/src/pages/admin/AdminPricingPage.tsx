import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Percent,
  Sliders,
  Check,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { Holiday, PricingRule } from '../../types';

export const AdminPricingPage: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Holiday form
  const [showAddHoliday, setShowAddHoliday] = useState<boolean>(false);
  const [newHolidayName, setNewHolidayName] = useState<string>('');
  const [newHolidayDate, setNewHolidayDate] = useState<string>('');
  const [newHolidayMultiplier, setNewHolidayMultiplier] = useState<number>(1.2);
  const [newHolidayDesc, setNewHolidayDesc] = useState<string>('');
  const [isAddingHoliday, setIsAddingHoliday] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [holidaysRes, rulesRes] = await Promise.all([
        adminApi.getHolidays(),
        adminApi.getPricingRules(),
      ]);

      if (holidaysRes.data.success) {
        setHolidays(holidaysRes.data.holidays || []);
      }
      if (rulesRes.data.success) {
        setRules(rulesRes.data.rules || []);
      }
    } catch {
      setError('Failed to fetch pricing and holiday configurations.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    setIsAddingHoliday(true);
    setError(null);
    try {
      const res = await adminApi.createHoliday({
        name: newHolidayName.trim(),
        date: newHolidayDate,
        surgeMultiplier: Number(newHolidayMultiplier),
        description: newHolidayDesc.trim() || undefined,
      });
      if (res.data.success) {
        setSuccessMsg(`Holiday "${newHolidayName}" added to central pricing engine.`);
        setShowAddHoliday(false);
        setNewHolidayName('');
        setNewHolidayDate('');
        setNewHolidayMultiplier(1.2);
        setNewHolidayDesc('');
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add holiday.');
    } finally {
      setIsAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to remove this holiday surge rule?')) return;
    try {
      const res = await adminApi.deleteHoliday(id);
      if (res.data.success) {
        setSuccessMsg('Holiday surge rule removed.');
        loadData();
      }
    } catch {
      setError('Failed to delete holiday.');
    }
  };

  const handleToggleRule = async (rule: PricingRule) => {
    try {
      const res = await adminApi.updatePricingRule(rule.id, {
        isActive: !rule.isActive,
      });
      if (res.data.success) {
        setSuccessMsg(`Rule "${rule.name}" ${!rule.isActive ? 'activated' : 'deactivated'}.`);
        loadData();
      }
    } catch {
      setError('Failed to toggle pricing rule.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-navy-950">Dynamic Pricing & Holiday Calendar</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure peak-period multiplier rules, weekend surges, and national holiday fare increases.
        </p>
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

      {/* Section 1: Active Dynamic Pricing Rules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-extrabold text-navy-950">System Pricing Rules</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => {
            const surgePct = Math.round((Number(rule.multiplier) - 1) * 100);
            return (
              <div
                key={rule.id}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 text-sm">{rule.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Type: <span className="font-semibold text-slate-700">{rule.ruleType}</span> &bull; Multiplier:{' '}
                    <span className="font-black text-blue-600">{rule.multiplier}x</span>{' '}
                    {surgePct > 0 && <span className="text-emerald-600 font-bold">(+{surgePct}%)</span>}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleRule(rule)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    rule.isActive
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {rule.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: National Holiday Calendar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-extrabold text-navy-950">National Holiday Calendar</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAddHoliday(!showAddHoliday)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday Rule</span>
          </button>
        </div>

        {/* Add Holiday Drawer */}
        {showAddHoliday && (
          <form
            onSubmit={handleAddHoliday}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
          >
            <h3 className="font-extrabold text-navy-950 text-sm">Create New Holiday Surge Window</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Festival"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Surge Multiplier
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="3.0"
                  required
                  value={newHolidayMultiplier}
                  onChange={(e) => setNewHolidayMultiplier(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional details"
                  value={newHolidayDesc}
                  onChange={(e) => setNewHolidayDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddHoliday(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingHoliday}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>{isAddingHoliday ? 'Saving...' : 'Add to Calendar'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Holiday Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Holiday Name</th>
                  <th className="py-3 px-4">Calendar Date</th>
                  <th className="py-3 px-4">Surge Multiplier</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Loading holidays...
                    </td>
                  </tr>
                ) : holidays.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No national holidays configured.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => {
                    const surge = Math.round((Number(h.surgeMultiplier) - 1) * 100);
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{h.name}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {new Date(h.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-blue-600">{h.surgeMultiplier}x</span>{' '}
                          {surge > 0 && (
                            <span className="ml-1 text-[10px] text-emerald-600 font-bold">
                              (+{surge}%)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{h.description || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title="Delete holiday"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    </div>
  );
};
