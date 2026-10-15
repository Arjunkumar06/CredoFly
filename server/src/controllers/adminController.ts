import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';
import { AdminService } from '../services/adminService.js';
import { FlightService } from '../services/flightService.js';
import { BookingService } from '../services/bookingService.js';
import { PaymentService } from '../services/paymentService.js';
import {
  createFlightSchema,
  updateFlightSchema,
  paymentVerificationSchema,
  holidaySchema,
  pricingRuleSchema,
} from '../validators/index.js';
import { Prisma } from '@prisma/client';

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

      await prisma.auditLog.create({
        data: {
          action: 'FLIGHT_CREATED',
          entity: 'Flight',
          entityId: flight.id,
          actor: 'admin',
          details: `Flight ${flight.flightCode} (${flight.origin} → ${flight.destination}) created with capacity ${flight.capacity}.`,
        },
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

      await prisma.auditLog.create({
        data: {
          action: 'FLIGHT_UPDATED',
          entity: 'Flight',
          entityId: id,
          actor: 'admin',
          details: `Flight updated: ${JSON.stringify(validated)}.`,
        },
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
      const booking = await BookingService.cancelEntireBooking(id, '', true);

      await prisma.auditLog.create({
        data: {
          action: 'BOOKING_CANCELLED_BY_ADMIN',
          entity: 'Booking',
          entityId: id,
          actor: 'admin',
          details: `Booking ${booking.bookingReference} cancelled by administrator.`,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Booking cancelled by administrator',
        booking,
      });
    } catch (error) {
      next(error);
    }
  }

  // Payments review & verification
  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const payments = await PaymentService.listPayments(status);
      return res.status(200).json({
        success: true,
        count: payments.length,
        payments,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, rejectionReason } = paymentVerificationSchema.parse(req.body);
      const updated = await PaymentService.verifyPayment(id, status, rejectionReason, 'admin');

      return res.status(200).json({
        success: true,
        message: `Payment has been marked ${status}.`,
        payment: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await PaymentService.getPaymentConfig();
      return res.status(200).json({
        success: true,
        config,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await PaymentService.updatePaymentConfig(req.body);
      return res.status(200).json({
        success: true,
        message: 'Payment configuration updated',
        config,
      });
    } catch (error) {
      next(error);
    }
  }

  // 12-Month schedule generation
  static async generateSchedules(req: Request, res: Response, next: NextFunction) {
    try {
      const months = req.body.months ? Number(req.body.months) : 12;
      const result = await FlightService.generateYearlySchedule({ monthsAhead: months });

      await prisma.auditLog.create({
        data: {
          action: 'SCHEDULES_GENERATED',
          entity: 'FlightInstance',
          entityId: 'ALL',
          actor: 'admin',
          details: `Generated flight instances for ${months} months. Instances created/checked: ${result.totalInstancesCheckedOrCreated}.`,
        },
      });

      return res.status(200).json({
        ...result,
        message: `Generated flight instances for the next ${months} months.`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Holidays management
  static async getHolidays(req: Request, res: Response, next: NextFunction) {
    try {
      const holidays = await prisma.holiday.findMany({
        orderBy: { date: 'asc' },
      });
      return res.status(200).json({
        success: true,
        holidays,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = holidaySchema.parse(req.body);
      const [y, m, d] = validated.date.split('-').map(Number);
      const parsedDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

      const holiday = await prisma.holiday.upsert({
        where: { date: parsedDate },
        update: {
          name: validated.name,
          affectsSchedule: validated.affectsSchedule,
          affectsPricing: validated.affectsPricing,
          surgePercentage: new Prisma.Decimal(validated.surgePercentage),
        },
        create: {
          name: validated.name,
          date: parsedDate,
          affectsSchedule: validated.affectsSchedule,
          affectsPricing: validated.affectsPricing,
          surgePercentage: new Prisma.Decimal(validated.surgePercentage),
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Holiday configured successfully',
        holiday,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.holiday.delete({ where: { id } });
      return res.status(200).json({
        success: true,
        message: 'Holiday deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Pricing rules management
  static async getPricingRules(req: Request, res: Response, next: NextFunction) {
    try {
      const rules = await prisma.pricingRule.findMany({
        orderBy: { priority: 'desc' },
      });
      return res.status(200).json({
        success: true,
        rules,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createPricingRule(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = pricingRuleSchema.parse(req.body);
      const [sy, sm, sd] = validated.startDate.split('-').map(Number);
      const [ey, em, ed] = validated.endDate.split('-').map(Number);

      const rule = await prisma.pricingRule.create({
        data: {
          name: validated.name,
          startDate: new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0)),
          endDate: new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59)),
          applicableDays: JSON.stringify(validated.applicableDays),
          route: validated.route || null,
          cabinClass: validated.cabinClass || null,
          adjustmentType: validated.adjustmentType,
          adjustmentValue: new Prisma.Decimal(validated.adjustmentValue),
          priority: validated.priority,
          isActive: validated.isActive,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Pricing rule created successfully',
        rule,
      });
    } catch (error) {
      next(error);
    }
  }

  // Aircraft configurations
  static async getAircraftConfigs(req: Request, res: Response, next: NextFunction) {
    try {
      const configs = await prisma.aircraftConfiguration.findMany({
        include: {
          _count: { select: { seats: true, flights: true } },
        },
      });
      return res.status(200).json({
        success: true,
        configs,
      });
    } catch (error) {
      next(error);
    }
  }

  // Operational Audit Logs
  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return res.status(200).json({
        success: true,
        logs,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyAuth(req: Request, res: Response) {
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
