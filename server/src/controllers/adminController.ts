import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/adminService.js';
import { FlightService } from '../services/flightService.js';
import { BookingService } from '../services/bookingService.js';
import { createFlightSchema, updateFlightSchema } from '../validators/index.js';

export class AdminController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getDashboardStats();
      return res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFlights(req: Request, res: Response, next: NextFunction) {
    try {
      const flights = await FlightService.getAllFlights();
      return res.status(200).json({
        success: true,
        flights,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createFlight(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createFlightSchema.parse(req.body);
      const flight = await FlightService.createFlight({
        ...validated,
        schedules: req.body.schedules,
      });

      return res.status(201).json({
        success: true,
        message: 'Flight created successfully',
        flight,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateFlight(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const validated = updateFlightSchema.parse(req.body);
      const flight = await FlightService.updateFlight(id, {
        ...validated,
        schedules: req.body.schedules,
      });

      return res.status(200).json({
        success: true,
        message: 'Flight updated successfully',
        flight,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const { route, travelDate, departureTime, page, limit } = req.query;

      const result = await AdminService.getAllBookings({
        route: route as string | undefined,
        travelDate: travelDate as string | undefined,
        departureTime: departureTime as string | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBookingDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const booking = await AdminService.getBookingDetails(id);
      return res.status(200).json({
        success: true,
        booking,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      // Admin cancel passes isAdmin = true so ownership check is bypassed
      const booking = await BookingService.cancelEntireBooking(
        id,
        '',
        true
      );

      return res.status(200).json({
        success: true,
        message: 'Booking cancelled by administrator',
        booking,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyAuth(req: Request, res: Response) {
    // Reached here means requireAdminBasicAuth passed!
    return res.status(200).json({
      success: true,
      message: 'Admin authentication valid',
      user: {
        role: 'admin',
        username: process.env.ADMIN_USERNAME || 'admin',
      },
    });
  }
}
