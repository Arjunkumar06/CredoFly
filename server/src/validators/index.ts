import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
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
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const searchFlightsSchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  travelDate: z.string().min(1, 'Travel date is required'),
  adults: z.coerce.number().int().min(0).default(1),
  children: z.coerce.number().int().min(0).default(0),
}).refine((data) => data.origin.trim().toLowerCase() !== data.destination.trim().toLowerCase(), {
  message: 'Origin and destination must be different',
  path: ['destination'],
}).refine((data) => data.adults + data.children >= 1, {
  message: 'At least one passenger must be selected',
  path: ['adults'],
});

export const createFlightSchema = z.object({
  flightCode: z.string().min(2).max(10).toUpperCase(),
  origin: z.string().min(2),
  destination: z.string().min(2),
  capacity: z.coerce.number().int().positive('Capacity must be a positive integer'),
  isActive: z.boolean().default(true),
}).refine((data) => data.origin.trim().toLowerCase() !== data.destination.trim().toLowerCase(), {
  message: 'Origin and destination must be different',
  path: ['destination'],
});

export const updateFlightSchema = z.object({
  origin: z.string().min(2).optional(),
  destination: z.string().min(2).optional(),
  capacity: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
  adultFare: z.coerce.number().positive('Adult fare must be positive'),
  childFare: z.coerce.number().positive('Child fare must be positive'),
  isOperating: z.boolean().default(true),
});

export const updateSchedulesSchema = z.object({
  schedules: z.array(scheduleItemSchema).min(1),
});

export const passengerInputSchema = z.object({
  name: z.string().min(1, 'Passenger name is required'),
  type: z.enum(['ADULT', 'CHILD']),
});

export const createBookingSchema = z.object({
  flightInstanceId: z.string().uuid('Invalid flight departure ID'),
  adultCount: z.number().int().min(0),
  childCount: z.number().int().min(0),
  passengers: z.array(passengerInputSchema).min(1, 'Please provide passenger details'),
}).refine((data) => data.adultCount + data.childCount >= 1, {
  message: 'At least one passenger must be selected',
}).refine((data) => data.passengers.length === data.adultCount + data.childCount, {
  message: 'Passenger list count must match total adult and child count',
});

export const partialCancelSchema = z.object({
  cancelAdults: z.number().int().min(0).default(0),
  cancelChildren: z.number().int().min(0).default(0),
}).refine((data) => data.cancelAdults + data.cancelChildren >= 1, {
  message: 'You must select at least one passenger to cancel',
});
