import { Response, NextFunction } from 'express';
import { BookingService } from '../services/bookingService.js';
import { AuthRequest } from '../middleware/auth.js';
import { createBookingSchema, partialCancelSchema, bookingPreviewSchema } from '../validators/index.js';
import { UnauthorizedError } from '../utils/errors.js';

export class BookingController {
  static async preview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = bookingPreviewSchema.parse(req.body);
      const preview = await BookingService.previewBookingFare(validated);

      return res.status(200).json({
        success: true,
        preview,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Please log in to complete your booking');
      }

      const validated = createBookingSchema.parse(req.body);

      const booking = await BookingService.createBooking({
        userId: req.user.userId,
        flightInstanceId: validated.flightInstanceId,
        adultCount: validated.adultCount,
        childCount: validated.childCount,
        cabinClass: validated.cabinClass,
        contactEmail: validated.contactEmail || undefined,
        contactPhone: validated.contactPhone || undefined,
        paymentMethod: validated.paymentMethod,
        passengers: validated.passengers,
      });

      return res.status(201).json({
        success: true,
        message: 'Booking confirmed successfully',
        booking,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Please log in to view your bookings');
      }

      const result = await BookingService.getCustomerBookings(req.user.userId);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const id = req.params.id as string;
      const booking = await BookingService.getBookingById(
        id,
        req.user.userId,
        false
      );

      return res.status(200).json({
        success: true,
        booking,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const id = req.params.id as string;
      const updated = await BookingService.cancelEntireBooking(
        id,
        req.user.userId,
        false
      );

      return res.status(200).json({
        success: true,
        message: 'Booking successfully cancelled. Seats have been restored.',
        booking: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async partialCancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const id = req.params.id as string;
      const validated = partialCancelSchema.parse(req.body);

      const result = await BookingService.partialCancelBooking(
        id,
        req.user.userId,
        validated,
        false
      );

      return res.status(200).json({
        success: true,
        message: 'Booking updated successfully. Seats released.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}
