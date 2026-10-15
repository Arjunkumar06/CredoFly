import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Full name is required').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  mobileNumber: z.string().regex(/^(\+?\d{1,4}[- ]?)?\d{10}$/, 'Invalid mobile phone number (10 digits)').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required').optional(),
  username: z.string().min(1, 'Username is required').optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((data) => !!(data.identifier || data.username), {
  message: 'Customer ID, email, mobile number, or username is required',
  path: ['identifier'],
});

export const googleAuthSchema = z.object({
  credential: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  googleId: z.string().optional(),
}).refine((data) => !!(data.credential || (data.googleId && data.email)), {
  message: 'Google identity credential or verified profile required',
});

export const recoverCustomerIdSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  mobileNumber: z.string().optional(),
}).refine((data) => !!(data.email || data.mobileNumber), {
  message: 'Please provide either registered email or mobile number',
});

export const searchFlightsSchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  travelDate: z.string().min(1, 'Travel date is required'),
  returnDate: z.string().optional(),
  tripType: z.enum(['oneway', 'roundtrip']).default('oneway'),
  adults: z.coerce.number().int().min(0).default(1),
  children: z.coerce.number().int().min(0).default(0),
}).refine((data) => data.origin.trim().toLowerCase() !== data.destination.trim().toLowerCase(), {
  message: 'Origin and destination must be different',
  path: ['destination'],
}).refine((data) => data.adults + data.children >= 1, {
  message: 'At least one passenger must be selected',
  path: ['adults'],
}).refine((data) => {
  if (data.tripType === 'roundtrip' && data.returnDate) {
    return data.returnDate >= data.travelDate;
  }
  return true;
}, {
  message: 'Return date cannot be earlier than departure date',
  path: ['returnDate'],
});

export const createFlightSchema = z.object({
  flightCode: z.string().min(2).max(10).toUpperCase(),
  airlineName: z.string().default('CredoFly Express'),
  origin: z.string().min(2),
  destination: z.string().min(2),
  capacity: z.coerce.number().int().positive('Capacity must be a positive integer'),
  aircraftConfigId: z.string().uuid().optional(),
  timeZone: z.string().default('Asia/Kolkata'),
  durationMinutes: z.coerce.number().int().positive().default(170),
  isActive: z.boolean().default(true),
  schedules: z.array(z.any()).optional(),
}).refine((data) => data.origin.trim().toLowerCase() !== data.destination.trim().toLowerCase(), {
  message: 'Origin and destination must be different',
  path: ['destination'],
});

export const updateFlightSchema = z.object({
  origin: z.string().min(2).optional(),
  destination: z.string().min(2).optional(),
  capacity: z.coerce.number().int().positive().optional(),
  airlineName: z.string().optional(),
  aircraftConfigId: z.string().uuid().optional().nullable(),
  timeZone: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  schedules: z.array(z.any()).optional(),
});

export const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
  adultFare: z.coerce.number().positive('Adult fare must be positive'),
  childFare: z.coerce.number().positive('Child fare must be positive'),
  effectiveStartDate: z.string().optional().nullable(),
  effectiveEndDate: z.string().optional().nullable(),
  isOperating: z.boolean().default(true),
});

export const updateSchedulesSchema = z.object({
  schedules: z.array(scheduleItemSchema).min(1),
});

export const passengerInputSchema = z.object({
  name: z.string().min(1, 'Passenger name is required'),
  type: z.enum(['ADULT', 'CHILD']),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  seatNumber: z.string().optional(),
  seatPrice: z.coerce.number().optional(),
});

export const bookingPreviewSchema = z.object({
  flightInstanceId: z.string().uuid('Invalid flight departure ID'),
  adultCount: z.coerce.number().int().min(0),
  childCount: z.coerce.number().int().min(0),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST_CLASS']).default('ECONOMY'),
  selectedSeats: z.array(z.string()).optional(),
}).refine((data) => data.adultCount + data.childCount >= 1, {
  message: 'At least one passenger must be selected',
});

export const createBookingSchema = z.object({
  flightInstanceId: z.string().uuid('Invalid flight departure ID'),
  returnFlightInstanceId: z.string().uuid('Invalid return flight departure ID').optional(),
  adultCount: z.number().int().min(0),
  childCount: z.number().int().min(0),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST_CLASS']).default('ECONOMY'),
  contactEmail: z.string().email('Invalid contact email').optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  paymentMethod: z.enum(['GPAY_QR', 'CARD', 'UPI', 'NET_BANKING', 'DEMO_PAY']).default('DEMO_PAY'),
  passengers: z.array(passengerInputSchema).min(1, 'Please provide passenger details'),
  returnPassengers: z.array(passengerInputSchema).optional(),
}).refine((data) => data.adultCount + data.childCount >= 1, {
  message: 'At least one passenger must be selected',
}).refine((data) => data.passengers.length === data.adultCount + data.childCount, {
  message: 'Passenger list count must match total adult and child count',
}).refine((data) => !data.returnPassengers || data.returnPassengers.length === data.adultCount + data.childCount, {
  message: 'Return passenger list count must match total adult and child count',
});

export const partialCancelSchema = z.object({
  cancelAdults: z.number().int().min(0).default(0),
  cancelChildren: z.number().int().min(0).default(0),
}).refine((data) => data.cancelAdults + data.cancelChildren >= 1, {
  message: 'You must select at least one passenger to cancel',
});

export const seatSelectionSchema = z.object({
  flightInstanceId: z.string().uuid('Invalid flight departure ID'),
  assignments: z.array(z.object({
    passengerIndex: z.number().int().min(0),
    seatNumber: z.string().min(2).max(4).toUpperCase(),
  })).min(1, 'At least one seat must be selected'),
});

export const paymentSubmissionSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  method: z.enum(['GPAY_QR', 'UPI', 'CARD', 'NET_BANKING', 'DEMO_PAY']).default('GPAY_QR'),
  utr: z.string().min(6, 'UTR / transaction reference must be at least 6 characters').optional().or(z.literal('')),
  proofUrl: z.string().optional().or(z.literal('')),
});

export const paymentVerificationSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export const feedbackSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  rating: z.coerce.number().int().min(1).max(5),
  punctualityRating: z.coerce.number().int().min(1).max(5).optional(),
  serviceRating: z.coerce.number().int().min(1).max(5).optional(),
  cleanlinessRating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

export const holidaySchema = z.object({
  name: z.string().min(2, 'Holiday name required'),
  date: z.string().min(10, 'Date in YYYY-MM-DD format required'),
  affectsSchedule: z.boolean().default(false),
  affectsPricing: z.boolean().default(true),
  surgePercentage: z.coerce.number().min(0).max(100).default(15),
});

export const pricingRuleSchema = z.object({
  name: z.string().min(2, 'Rule name required'),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  applicableDays: z.array(z.number().int().min(0).max(6)).default([0, 5, 6]),
  route: z.string().optional().nullable(),
  cabinClass: z.string().optional().nullable(),
  adjustmentType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  adjustmentValue: z.coerce.number().min(0),
  priority: z.coerce.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});
