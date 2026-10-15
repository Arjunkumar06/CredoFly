/**
 * CredoFly Shared Business Rules & System Constants (Client)
 */

export const MAX_PASSENGERS_PER_BOOKING = 8;
export const MIN_PASSENGERS_PER_BOOKING = 1;
export const MAX_SEATS_PER_BOOKING = 8;

export const TAX_PER_PASSENGER_PER_LEG = 350;

export const SEAT_LIMIT_WARNING_MESSAGE = (maxSeats: number) =>
  `You have reached the maximum limit of ${maxSeats} seats. Please deselect a seat before selecting another.`;
