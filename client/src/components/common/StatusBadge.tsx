import React from 'react';

interface StatusBadgeProps {
  status: 'CONFIRMED' | 'CANCELLED' | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase();

  if (normalized === 'CONFIRMED') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
      >
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
        Confirmed
      </span>
    );
  }

  if (normalized === 'CANCELLED') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 ${className}`}
      >
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-500"></span>
        Cancelled
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>
      {status}
    </span>
  );
};
