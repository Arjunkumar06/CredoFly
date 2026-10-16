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
  returnBooking?: Booking | null;
}

export interface DashboardFlightSummary {
  id: string;
  flightCode: string;
  airlineName: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  capacity: number;
  availableSeats: number;
  bookedSeats: number;
  status: string;
}

export interface DashboardBookingSummary {
  id: string;
  bookingReference: string;
  pnr: string;
  customerName: string;
  flightCode: string;
  route: string;
  departureTime: string;
  passengerCount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface DashboardStats {
  selectedDate: string;
  todayDate: string;
  timezone: string;
  currentDateTime: string;

  // 12 Requested Operations Cards & Details
  flightsScheduledToday: number;
  totalFlightsOnDate: number;
  bookingsMadeToday: number;
  confirmedBookingsToday: number;
  pendingBookingsToday: number;
  cancelledBookingsToday: number;
  travellingPassengersToday: number;
  upcomingFlights: number;
  completedFlights: number;
  totalRegisteredUsers: number;
  totalVerifiedRevenue: number;
  verifiedRevenueDate: number;
  availableSeatsToday: number;
  totalCapacityToday: number;
  occupiedSeatsToday: number;
  occupancyRateToday: number;

  flightsDepartingSoon: DashboardFlightSummary[];
  recentBookingsOnDate: DashboardBookingSummary[];

  // Backwards-compatible fields
  totalActiveFlights: number;
  upcomingFlightInstances: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
}

export interface CalendarMonthSummary {
  totalScheduledFlights: number;
  totalBookings: number;
  totalPassengers: number;
  totalVerifiedRevenue: number;
  monthlyOccupancyRate: number;
  totalCapacity: number;
  totalAvailableSeats: number;
  occupiedSeats: number;
}

export interface CalendarDayOverview {
  date: string;
  flightCount: number;
  bookingCount: number;
  passengerCount: number;
  hasCancelledFlights: boolean;
  hasDelayedFlights: boolean;
  isFullyBooked: boolean;
  flightsSample: Array<{
    id: string;
    flightCode: string;
    departureTime: string;
    status: string;
    availableSeats: number;
  }>;
}

export interface CalendarOverviewResponse {
  year: number;
  month: number;
  monthlySummary: CalendarMonthSummary;
  days: Record<string, CalendarDayOverview>;
}

export interface CalendarFlightDetail {
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
  occupancyRate: number;
  adultFare: number;
  childFare: number;
  status: string;
  bookingsCount: number;
}

export interface CalendarBookingPassenger {
  name: string;
  seatNumber: string;
  isCancelled: boolean;
  type: string;
}

export interface CalendarBookingDetail {
  id: string;
  bookingReference: string;
  pnr: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  passengerCount: number;
  passengers: CalendarBookingPassenger[];
  flightCode: string;
  route: string;
  departureTime: string;
  travelDate: string;
  bookingStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  totalAmount: number;
  isVerified: boolean;
  createdAt: string;
}

export interface CalendarDateDetailsResponse {
  selectedDate: string;
  dailySummary: {
    totalFlights: number;
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    travellingPassengers: number;
    verifiedRevenue: number;
    totalCapacity: number;
    availableSeats: number;
    occupiedSeats: number;
    occupancyRate: number;
  };
  flights: CalendarFlightDetail[];
  bookings: CalendarBookingDetail[];
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
  hoursBeforeDeparture?: number;
  tier: string;
  tierCode?: string;
  refundPercentage: number;
  totalPaid: number;
  refundAmount: number;
  estimatedRefund?: number;
  cancellationFee: number;
  notes?: string;
  policyNote?: string;
  route?: string;
  departureTime?: string;
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

