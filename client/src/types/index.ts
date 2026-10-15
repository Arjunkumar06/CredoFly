export interface User {
  id: string;
  customerId?: string;
  name?: string;
  username: string;
  email?: string | null;
  mobileNumber?: string | null;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
  createdAt: string;
}

export interface FlightSchedule {
  id: string;
  flightId: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  departureTime: string;
  arrivalTime: string;
  adultFare: number | string;
  childFare: number | string;
  isOperating: boolean;
}

export interface Flight {
  id: string;
  flightCode: string;
  origin: string;
  destination: string;
  capacity: number;
  isActive: boolean;
  schedules?: FlightSchedule[];
  _count?: {
    instances: number;
  };
}

export interface SearchFlightResult {
  id: string; // flightInstanceId
  flightId: string;
  flightCode: string;
  origin: string;
  destination: string;
  capacity: number;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  adultFare: number;
  childFare: number;
  totalFare: number;
  availableSeats: number;
  duration: string;
}

export interface Passenger {
  id?: string;
  name: string;
  type: 'ADULT' | 'CHILD';
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  age?: number;
  seatNumber?: string;
  seatPrice?: number;
  isCancelled?: boolean;
}

export interface FlightPolicies {
  cancellation: {
    moreThan72Hrs: string;
    within72Hrs: string;
    within4Hrs: string;
  };
  dateChange: {
    moreThan72Hrs: string;
    within72Hrs: string;
  };
}

export interface FlightInstanceDetail extends SearchFlightResult {
  airlineName: string;
  aircraft: string;
  durationMinutes: number;
  baggage: {
    cabin: string;
    checkIn: string;
  };
  policies: FlightPolicies;
}

export interface BookingFarePreview {
  flightInstanceId: string;
  flightCode: string;
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  adultCount: number;
  childCount: number;
  cabinClass: string;
  breakdown: {
    baseAdultFare: number;
    baseChildFare: number;
    adultSubtotal: number;
    childSubtotal: number;
    baseTotal: number;
    taxesAndFees: number;
    grandTotal: number;
  };
  baggage: {
    cabin: string;
    checkIn: string;
  };
}

export interface BookingEvent {
  id: string;
  bookingId: string;
  eventType: string;
  details: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingReference: string;
  pnr?: string | null;
  userId: string;
  user?: {
    id: string;
    username: string;
    email?: string | null;
  };
  flightInstanceId: string;
  flightInstance: {
    id: string;
    travelDate: string;
    departureTime: string;
    arrivalTime: string;
    adultFare: number | string;
    childFare: number | string;
    availableSeats: number;
    flight: {
      id: string;
      flightCode: string;
      origin: string;
      destination: string;
      capacity: number;
    };
  };
  adultCount: number;
  childCount: number;
  cabinClass?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  paymentStatus?: string;
  paymentMethod?: string | null;
  adultFareSnapshot: number | string;
  childFareSnapshot: number | string;
  totalAmount: number | string;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  passengers: Passenger[];
  auditEvents?: BookingEvent[];
}

export interface DashboardStats {
  totalActiveFlights: number;
  upcomingFlightInstances: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
}

export interface SeatMapItem {
  id: string;
  seatNumber: string;
  rowNumber: number;
  columnLetter: string;
  seatType: 'WINDOW' | 'AISLE' | 'MIDDLE';
  tier: 'BUSINESS' | 'EXIT_ROW' | 'EXTRA_LEGROOM' | 'PREFERRED' | 'STANDARD';
  price: number;
  isExitRow: boolean;
  isOccupied: boolean;
  isBlocked: boolean;
  bookedByPassenger?: string | null;
}

export interface AircraftSeatMapResponse {
  aircraft: {
    name: string;
    code: string;
    seatLayout: string;
    totalRows: number;
    seatsPerRow: number;
  };
  flightInstanceId: string;
  seats: SeatMapItem[];
}

export interface PaymentConfig {
  upiId: string;
  merchantName: string;
  qrNote: string;
  isSandbox: boolean;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  paymentMethod: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'REFUNDED';
  transactionRef?: string | null;
  submittedAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  adminNotes?: string | null;
  booking?: Booking;
}

export interface CancellationQuote {
  bookingId: string;
  bookingReference: string;
  travelDate: string;
  hoursUntilDeparture: number;
  tier: string;
  refundPercentage: number;
  totalPaid: number;
  refundAmount: number;
  cancellationFee: number;
  notes: string;
}

export interface LowFareDay {
  date: string;
  lowestFare: number;
  availableSeats: number;
  isLowestInWindow: boolean;
  flightCount: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  surgeMultiplier: number;
  description?: string | null;
}

export interface PricingRule {
  id: string;
  name: string;
  ruleType: string;
  conditionValue?: string | null;
  multiplier: number;
  isActive: boolean;
}

export interface Feedback {
  id: string;
  bookingId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

