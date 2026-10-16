import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';
import { AdminService } from '../services/adminService.js';
import { FlightService } from '../services/flightService.js';
import { BookingService } from '../services/bookingService.js';
import { PaymentService } from '../services/paymentService.js';
import { EmailService } from '../services/emailService.js';
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
      const date = req.query.date as string | undefined;
      const stats = await AdminService.getDashboardStats(date);
      return res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCalendarOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
      const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
      const overview = await AdminService.getCalendarOverview(year, month);
      return res.status(200).json({
        success: true,
        ...overview,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCalendarDateDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const date = (req.query.date as string) || AdminService.getTodayInKolkata();
      const details = await AdminService.getCalendarDateDetails(date);
      return res.status(200).json({
        success: true,
        ...details,
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
      const formatted = holidays.map((h) => ({
        id: h.id,
        name: h.name,
        date: h.date.toISOString().slice(0, 10),
        affectsSchedule: h.affectsSchedule,
        affectsPricing: h.affectsPricing,
        surgePercentage: h.surgePercentage.toNumber(),
        surgeMultiplier: 1 + h.surgePercentage.toNumber() / 100,
      }));
      return res.status(200).json({
        success: true,
        holidays: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      let surgePercentage = 15;
      if (req.body.surgePercentage !== undefined) {
        surgePercentage = Number(req.body.surgePercentage);
      } else if (req.body.surgeMultiplier !== undefined) {
        surgePercentage = Math.round((Number(req.body.surgeMultiplier) - 1) * 100);
      }

      const validated = holidaySchema.parse({
        name: req.body.name,
        date: req.body.date,
        affectsSchedule: req.body.affectsSchedule ?? false,
        affectsPricing: req.body.affectsPricing ?? true,
        surgePercentage,
      });

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
        holiday: {
          ...holiday,
          date: holiday.date.toISOString().slice(0, 10),
          surgePercentage: holiday.surgePercentage.toNumber(),
          surgeMultiplier: 1 + holiday.surgePercentage.toNumber() / 100,
        },
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
        rules: rules.map((r) => ({
          ...r,
          startDate: r.startDate.toISOString().slice(0, 10),
          endDate: r.endDate.toISOString().slice(0, 10),
          adjustmentValue: r.adjustmentValue.toNumber(),
          applicableDays: JSON.parse(r.applicableDays || '[]'),
        })),
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
        rule: {
          ...rule,
          startDate: rule.startDate.toISOString().slice(0, 10),
          endDate: rule.endDate.toISOString().slice(0, 10),
          adjustmentValue: rule.adjustmentValue.toNumber(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePricingRule(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { isActive, name, adjustmentValue, priority } = req.body;
      const data: any = {};
      if (isActive !== undefined) data.isActive = isActive;
      if (name) data.name = name;
      if (adjustmentValue !== undefined) data.adjustmentValue = new Prisma.Decimal(adjustmentValue);
      if (priority !== undefined) data.priority = Number(priority);

      const rule = await prisma.pricingRule.update({
        where: { id },
        data,
      });

      return res.status(200).json({
        success: true,
        message: 'Pricing rule updated successfully',
        rule: {
          ...rule,
          startDate: rule.startDate.toISOString().slice(0, 10),
          endDate: rule.endDate.toISOString().slice(0, 10),
          adjustmentValue: rule.adjustmentValue.toNumber(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deletePricingRule(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.pricingRule.delete({ where: { id } });
      return res.status(200).json({
        success: true,
        message: 'Pricing rule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // 12-Month Schedule Calendar & Single Flight Instance Management
  static async getScheduleInstances(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, flightId, status } = req.query;

      let start = startDate ? new Date(startDate as string) : new Date();
      start.setHours(0, 0, 0, 0);

      let end = endDate ? new Date(endDate as string) : new Date(start);
      if (!endDate) {
        end.setDate(end.getDate() + 35);
      }
      end.setHours(23, 59, 59, 999);

      const where: any = {
        travelDate: {
          gte: start,
          lte: end,
        },
      };

      if (flightId) {
        where.flightId = flightId as string;
      }

      if (status) {
        where.status = status as string;
      }

      const instances = await prisma.flightInstance.findMany({
        where,
        include: {
          flight: true,
          _count: {
            select: { bookings: true, seats: true },
          },
        },
        orderBy: [{ travelDate: 'asc' }, { departureTime: 'asc' }],
      });

      return res.status(200).json({
        success: true,
        count: instances.length,
        instances: instances.map((inst) => ({
          id: inst.id,
          flightId: inst.flightId,
          flightCode: inst.flight.flightCode,
          airlineName: inst.flight.airlineName,
          origin: inst.flight.origin,
          destination: inst.flight.destination,
          travelDate: inst.travelDate.toISOString().slice(0, 10),
          departureTime: inst.departureTime,
          arrivalTime: inst.arrivalTime,
          capacity: inst.flight.capacity,
          availableSeats: inst.availableSeats,
          bookedSeats: inst.flight.capacity - inst.availableSeats,
          adultFare: inst.adultFare.toNumber(),
          childFare: inst.childFare.toNumber(),
          status: inst.status,
          bookingsCount: inst._count.bookings,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSingleFlightInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { departureTime, arrivalTime, adultFare, childFare, status, availableSeats } = req.body;

      const data: any = {};
      if (departureTime) data.departureTime = departureTime;
      if (arrivalTime) data.arrivalTime = arrivalTime;
      if (adultFare !== undefined) data.adultFare = new Prisma.Decimal(adultFare);
      if (childFare !== undefined) data.childFare = new Prisma.Decimal(childFare);
      if (status) data.status = status;
      if (availableSeats !== undefined) data.availableSeats = Number(availableSeats);

      const updated = await prisma.flightInstance.update({
        where: { id },
        data,
        include: { flight: true },
      });

      await prisma.auditLog.create({
        data: {
          action: 'FLIGHT_INSTANCE_UPDATED',
          entity: 'FlightInstance',
          entityId: id,
          actor: 'admin',
          details: `Flight instance ${updated.flight.flightCode} on ${updated.travelDate.toISOString().slice(0, 10)} updated: ${JSON.stringify(data)}.`,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Flight departure instance updated successfully',
        instance: {
          id: updated.id,
          flightCode: updated.flight.flightCode,
          travelDate: updated.travelDate.toISOString().slice(0, 10),
          departureTime: updated.departureTime,
          arrivalTime: updated.arrivalTime,
          adultFare: updated.adultFare.toNumber(),
          childFare: updated.childFare.toNumber(),
          status: updated.status,
          availableSeats: updated.availableSeats,
        },
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

  // Email Diagnostic Test
  static async runEmailDiagnostic(req: Request, res: Response, next: NextFunction) {
    try {
      const recipient = req.body?.recipient || (req.query?.recipient as string | undefined);
      const result = await EmailService.runDiagnosticTest(recipient);
      return res.status(200).json({
        success: result.success,
        diagnostic: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
