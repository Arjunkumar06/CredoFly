export interface User {
  id: string;
  username: string;
  email?: string | null;
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
