import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, TrendingDown, Sparkles } from 'lucide-react';
import { flightApi } from '../../services/api';
import { LowFareDay } from '../../types';

interface LowFareCalendarBarProps {
  origin: string;
  destination: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const LowFareCalendarBar: React.FC<LowFareCalendarBarProps> = ({
  origin,
  destination,
  selectedDate,
  onSelectDate,
}) => {
  const [calendarDays, setCalendarDays] = useState<LowFareDay[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadCalendar();
  }, [origin, destination, selectedDate]);

  const loadCalendar = async () => {
    setIsLoading(true);
    try {
      // Fetch 10-day fare window around selectedDate (e.g. starting 2 days prior or from today)
      const selected = new Date(selectedDate);
      const start = new Date(selected.getTime() - 2 * 86400000);
      const today = new Date();
      const actualStart = start < today ? today : start;
      const startDateStr = actualStart.toISOString().slice(0, 10);

      const res = await flightApi.getLowFareCalendar(origin, destination, startDateStr, 9);
      if (res.data.success && res.data.calendar) {
        setCalendarDays(res.data.calendar);
      }
    } catch {
      // Fallback empty or non-blocking
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return { dayName, dayNum };
    } catch {
      return { dayName: '', dayNum: dateStr };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs mb-6">
        <div className="flex items-center space-x-3 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="w-28 h-16 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (calendarDays.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center space-x-2 text-xs font-bold text-navy-950 uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Low-Fare Date Matrix</span>
        </div>
        <span className="text-[11px] text-slate-500 hidden sm:inline flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Compare lowest prices across adjacent travel dates</span>
        </span>
      </div>

      <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 scrollbar-none">
        {calendarDays.map((day) => {
          const isSelected = day.date === selectedDate;
          const { dayName, dayNum } = formatCardDate(day.date);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className={`flex-shrink-0 w-28 sm:w-32 p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-between relative ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                  : day.isLowestInWindow
                  ? 'bg-emerald-50/70 border-emerald-300 text-slate-800 hover:bg-emerald-100/60'
                  : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-700'
              }`}
            >
              {day.isLowestInWindow && (
                <span
                  className={`absolute -top-2 left-1/2 transform -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-wider uppercase shadow-xs ${
                    isSelected ? 'bg-amber-400 text-navy-950' : 'bg-emerald-600 text-white'
                  }`}
                >
                  Cheapest
                </span>
              )}

              <span
                className={`text-[10px] font-bold uppercase ${
                  isSelected ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                {dayName}
              </span>
              <span className="text-xs font-extrabold">{dayNum}</span>

              <div className="mt-1">
                {day.lowestFare > 0 ? (
                  <span
                    className={`text-xs font-black ${
                      isSelected
                        ? 'text-white'
                        : day.isLowestInWindow
                        ? 'text-emerald-700'
                        : 'text-blue-600'
                    }`}
                  >
                    ₹{day.lowestFare.toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">No Flights</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
