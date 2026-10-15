import React, { useState, useEffect } from 'react';
import {
  Plane,
  AlertTriangle,
  Info,
  Check,
  X,
  User,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { flightApi } from '../../services/api';
import { SeatMapItem, AircraftSeatMapResponse } from '../../types';

interface PassengerSelection {
  index: number;
  name: string;
  type: 'ADULT' | 'CHILD';
  selectedSeatNumber?: string;
  seatPrice?: number;
}

interface SeatSelectionMapProps {
  flightInstanceId: string;
  passengers: Array<{ name: string; type: 'ADULT' | 'CHILD' }>;
  currentAssignments: Array<{ seatNumber?: string; seatPrice?: number }>;
  onConfirmSeats: (assignments: Array<{ seatNumber?: string; seatPrice?: number }>) => void;
  onClose: () => void;
}

export const SeatSelectionMap: React.FC<SeatSelectionMapProps> = ({
  flightInstanceId,
  passengers,
  currentAssignments,
  onConfirmSeats,
  onClose,
}) => {
  const [seatData, setSeatData] = useState<AircraftSeatMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Passenger selection state
  const [activePassengerIdx, setActivePassengerIdx] = useState<number>(0);
  const [assignedSeats, setAssignedSeats] = useState<
    Array<{ seatNumber?: string; seatPrice?: number }>
  >(() => {
    return passengers.map((p, idx) => ({
      seatNumber: currentAssignments[idx]?.seatNumber,
      seatPrice: currentAssignments[idx]?.seatPrice || 0,
    }));
  });

  const [hoveredSeat, setHoveredSeat] = useState<SeatMapItem | null>(null);

  useEffect(() => {
    loadSeatMap();
  }, [flightInstanceId]);

  const loadSeatMap = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await flightApi.getSeatMap(flightInstanceId);
      if (res.data.success) {
        setSeatData(res.data);
      } else {
        setError('Failed to retrieve aircraft seat inventory.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to connect to seat map service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeatClick = (seat: SeatMapItem) => {
    if (seat.isOccupied || seat.isBlocked) return;

    // Check if this seat is already chosen by another passenger in this booking
    const alreadyChosenByIdx = assignedSeats.findIndex(
      (a, i) => i !== activePassengerIdx && a.seatNumber === seat.seatNumber
    );

    const updated = [...assignedSeats];

    if (alreadyChosenByIdx !== -1) {
      // Unassign from that passenger
      updated[alreadyChosenByIdx] = { seatNumber: undefined, seatPrice: 0 };
    }

    // If active passenger clicks on their current seat, toggle off
    if (updated[activePassengerIdx]?.seatNumber === seat.seatNumber) {
      updated[activePassengerIdx] = { seatNumber: undefined, seatPrice: 0 };
    } else {
      updated[activePassengerIdx] = {
        seatNumber: seat.seatNumber,
        seatPrice: seat.price,
      };

      // Automatically advance to next passenger without a seat
      const nextUnassigned = updated.findIndex((a, idx) => idx > activePassengerIdx && !a.seatNumber);
      if (nextUnassigned !== -1) {
        setActivePassengerIdx(nextUnassigned);
      }
    }

    setAssignedSeats(updated);
  };

  const handleClearSeat = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...assignedSeats];
    updated[idx] = { seatNumber: undefined, seatPrice: 0 };
    setAssignedSeats(updated);
  };

  const totalSeatFee = assignedSeats.reduce((sum, item) => sum + (item.seatPrice || 0), 0);

  const getSeatColor = (seat: SeatMapItem) => {
    // Is selected by active passenger?
    const isCurrentPassengerSeat =
      assignedSeats[activePassengerIdx]?.seatNumber === seat.seatNumber;
    if (isCurrentPassengerSeat) {
      return 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400 scale-105';
    }

    // Is selected by another passenger in this party?
    const otherPassengerIdx = assignedSeats.findIndex(
      (a, i) => i !== activePassengerIdx && a.seatNumber === seat.seatNumber
    );
    if (otherPassengerIdx !== -1) {
      return 'bg-emerald-600 text-white border-emerald-700 shadow-sm';
    }

    // Occupied or blocked
    if (seat.isOccupied || seat.isBlocked) {
      return 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-60';
    }

    // Tier specific coloring
    switch (seat.tier) {
      case 'BUSINESS':
        return 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold';
      case 'EXIT_ROW':
        return 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300 font-bold';
      case 'EXTRA_LEGROOM':
        return 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-sky-300';
      case 'PREFERRED':
        return 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200';
      default:
        // Free Standard
        return 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Group seats by row
  const rowsMap = new Map<number, SeatMapItem[]>();
  if (seatData?.seats) {
    seatData.seats.forEach((seat) => {
      const list = rowsMap.get(seat.rowNumber) || [];
      list.push(seat);
      rowsMap.set(seat.rowNumber, list);
    });
  }
  const sortedRowNumbers = Array.from(rowsMap.keys()).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-navy-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                Select Your Flight Seats
              </h3>
              <p className="text-xs text-slate-400">
                {seatData?.aircraft.name || 'Airbus A320neo'} &bull; Layout: {seatData?.aircraft.seatLayout || '3-3'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Passenger Selection Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Select Passenger to Assign Seat:
          </p>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {passengers.map((p, idx) => {
              const assigned = assignedSeats[idx];
              const isCurrent = activePassengerIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePassengerIdx(idx)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex-shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>
                    {p.name || `Passenger ${idx + 1}`} ({p.type})
                  </span>
                  {assigned?.seatNumber ? (
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 ${
                        isCurrent
                          ? 'bg-blue-800 text-blue-100'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <span>{assigned.seatNumber}</span>
                      <X
                        className="w-3 h-3 hover:text-rose-500 cursor-pointer ml-1"
                        onClick={(e) => handleClearSeat(idx, e)}
                      />
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-500 font-bold ml-1">
                      No Seat
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Legend */}
        <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-600">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300"></span>
            <span className="text-[11px]">Business (₹1500)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300"></span>
            <span className="text-[11px]">Exit Row (₹750)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-sky-100 border border-sky-300"></span>
            <span className="text-[11px]">Extra Legroom (₹500)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-indigo-50 border border-indigo-200"></span>
            <span className="text-[11px]">Window/Aisle (₹200-250)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300"></span>
            <span className="text-[11px]">Standard / Middle (Free ₹0)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-700 text-white"></span>
            <span className="text-[11px]">Selected</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300"></span>
            <span className="text-[11px]">Occupied</span>
          </div>
        </div>

        {/* Aircraft Cabin Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/70 flex justify-center">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-500">Rendering aircraft seat configuration...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600 text-xs">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="max-w-md w-full bg-white rounded-3xl shadow-md border border-slate-200 p-4 relative">
              {/* Airplane Nose / Cockpit Graphic */}
              <div className="w-full flex flex-col items-center mb-6">
                <div className="w-32 h-16 bg-slate-200 rounded-t-full flex items-center justify-center border-t-2 border-x-2 border-slate-300 relative shadow-inner">
                  {/* Cockpit windshields */}
                  <div className="flex space-x-2 mt-2">
                    <div className="w-5 h-3 bg-sky-900 rounded-tl-lg"></div>
                    <div className="w-5 h-3 bg-sky-900 rounded-tr-lg"></div>
                  </div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                  Aircraft Front (Cockpit)
                </div>
                <div className="w-full h-px bg-slate-200 my-2"></div>
              </div>

              {/* Column Headers: A B C   D E F */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-3 pb-3 mb-2 border-b border-slate-100">
                <div className="flex space-x-2">
                  <span className="w-7 text-center">A</span>
                  <span className="w-7 text-center">B</span>
                  <span className="w-7 text-center">C</span>
                </div>
                <span className="w-8 text-center text-[10px] uppercase text-slate-400 font-normal">
                  Aisle
                </span>
                <div className="flex space-x-2">
                  <span className="w-7 text-center">D</span>
                  <span className="w-7 text-center">E</span>
                  <span className="w-7 text-center">F</span>
                </div>
              </div>

              {/* Seat Rows */}
              <div className="space-y-2">
                {sortedRowNumbers.map((rowNum) => {
                  const rowSeats = rowsMap.get(rowNum) || [];
                  const leftSeats = rowSeats.filter((s) => ['A', 'B', 'C'].includes(s.columnLetter));
                  const rightSeats = rowSeats.filter((s) => ['D', 'E', 'F'].includes(s.columnLetter));
                  const isExitRow = rowSeats.some((s) => s.isExitRow);

                  return (
                    <div key={rowNum} className="relative">
                      {/* Emergency exit row indicator banner */}
                      {isExitRow && (
                        <div className="my-1 py-0.5 bg-rose-50 border border-rose-200 rounded-lg text-center text-[9px] font-bold text-rose-700 flex items-center justify-center space-x-1">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>EMERGENCY EXIT ROW (Age 15+ Only)</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between px-1">
                        {/* Left seat block (A, B, C) */}
                        <div className="flex space-x-2">
                          {['A', 'B', 'C'].map((col) => {
                            const seat = leftSeats.find((s) => s.columnLetter === col);
                            if (!seat) return <div key={col} className="w-7 h-7"></div>;

                            return (
                              <button
                                key={seat.id}
                                type="button"
                                disabled={seat.isOccupied || seat.isBlocked}
                                onClick={() => handleSeatClick(seat)}
                                onMouseEnter={() => setHoveredSeat(seat)}
                                onMouseLeave={() => setHoveredSeat(null)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] font-bold border transition flex items-center justify-center ${getSeatColor(
                                  seat
                                )}`}
                                title={`${seat.seatNumber} (${seat.tier}) - ₹${seat.price}`}
                              >
                                {seat.columnLetter}
                              </button>
                            );
                          })}
                        </div>

                        {/* Row Number in Aisle */}
                        <div className="w-8 text-center text-[11px] font-mono font-bold text-slate-400">
                          {rowNum}
                        </div>

                        {/* Right seat block (D, E, F) */}
                        <div className="flex space-x-2">
                          {['D', 'E', 'F'].map((col) => {
                            const seat = rightSeats.find((s) => s.columnLetter === col);
                            if (!seat) return <div key={col} className="w-7 h-7"></div>;

                            return (
                              <button
                                key={seat.id}
                                type="button"
                                disabled={seat.isOccupied || seat.isBlocked}
                                onClick={() => handleSeatClick(seat)}
                                onMouseEnter={() => setHoveredSeat(seat)}
                                onMouseLeave={() => setHoveredSeat(null)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] font-bold border transition flex items-center justify-center ${getSeatColor(
                                  seat
                                )}`}
                                title={`${seat.seatNumber} (${seat.tier}) - ₹${seat.price}`}
                              >
                                {seat.columnLetter}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rear Graphic */}
              <div className="w-full flex flex-col items-center mt-6 pt-4 border-t border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Rear Aircraft Galley & Lavatories
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hover / Info Banner */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-xs flex items-center justify-between min-h-[36px]">
          {hoveredSeat ? (
            <div className="flex items-center space-x-3 text-slate-700">
              <span className="font-bold text-navy-950 text-sm">
                Seat {hoveredSeat.seatNumber}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold uppercase">
                {hoveredSeat.tier.replace('_', ' ')}
              </span>
              <span>{hoveredSeat.seatType}</span>
              <span className="font-bold text-blue-600">
                {hoveredSeat.price > 0 ? `+₹${hoveredSeat.price}` : 'Free (₹0)'}
              </span>
              {hoveredSeat.isExitRow && (
                <span className="text-rose-600 text-[10px] font-bold flex items-center space-x-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>Extra Legroom / Age Restriction</span>
                </span>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-xs italic">
              Hover over a seat to view features, legroom, and exact seat price.
            </div>
          )}
        </div>

        {/* Footer with Price & Actions */}
        <div className="bg-white p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">
              Seat Selection Fee
            </p>
            <p className="text-xl font-black text-blue-600">
              ₹{totalSeatFee.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs transition"
            >
              Skip / Auto-Assign
            </button>

            <button
              type="button"
              onClick={() => onConfirmSeats(assignedSeats)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/30 text-xs transition flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirm Seats</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
