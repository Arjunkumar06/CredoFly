/**
 * CredoFly Shared Business Rules & System Constants
 */

// Passenger & Seat Limits
export const MAX_PASSENGERS_PER_BOOKING = 8;
export const MIN_PASSENGERS_PER_BOOKING = 1;
export const MAX_SEATS_PER_BOOKING = 8;

// Aviation Taxes & Airport Development Fees per passenger per flight leg
export const TAX_PER_PASSENGER_PER_LEG = 350;

// Cabin Class Baseline Multipliers
export const CABIN_CLASS_MULTIPLIERS: Record<string, number> = {
  ECONOMY: 1.0,
  PREMIUM_ECONOMY: 1.25,
  BUSINESS: 1.8,
  FIRST_CLASS: 2.5,
};

// Baggage Allowances by Cabin Class
export const BAGGAGE_ALLOWANCE: Record<string, { cabin: string; checkIn: string }> = {
  ECONOMY: { cabin: '7 Kg (1 piece)', checkIn: '15 Kg (1 piece)' },
  PREMIUM_ECONOMY: { cabin: '7 Kg (1 piece)', checkIn: '20 Kg (1 piece)' },
  BUSINESS: { cabin: '12 Kg (1 piece)', checkIn: '30 Kg (2 pieces)' },
  FIRST_CLASS: { cabin: '15 Kg (1 piece)', checkIn: '40 Kg (2 pieces)' },
};

// Seat Limit Warning Messages
export const SEAT_LIMIT_WARNING_MESSAGE = (maxSeats: number) =>
  `You have reached the maximum limit of ${maxSeats} seats. Please deselect a seat before selecting another.`;
