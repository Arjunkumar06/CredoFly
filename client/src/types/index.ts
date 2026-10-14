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
  isCancelled?: boolean;
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
