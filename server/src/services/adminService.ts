import { prisma } from '../db.js';
import { NotFoundError } from '../utils/errors.js';

export class AdminService {
  /**
   * Admin dashboard metrics derived directly from real database records
   */
  static async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalActiveFlights,
      upcomingFlightInstances,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
    ] = await Promise.all([
      prisma.flight.count({ where: { isActive: true } }),
      prisma.flightInstance.count({ where: { travelDate: { gte: today } } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
    ]);

    return {
      totalActiveFlights,
      upcomingFlightInstances,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
    };
  }

  /**
   * Filterable and paginated list of all bookings for administrators
   */
  static async getAllBookings(params: {
    route?: string;
    travelDate?: string;
    departureTime?: string;
    page?: number;
    limit?: number;
  }) {
    const { route, travelDate, departureTime, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Filter by route: matches either origin, destination, or formatted route string
    if (route && route.trim() !== '' && route.toLowerCase() !== 'all' && route.toLowerCase() !== 'all routes') {
      whereClause.flightInstance = {
        flight: {
          OR: [
            { origin: { contains: route.trim(), mode: 'insensitive' } },
            { destination: { contains: route.trim(), mode: 'insensitive' } },
            { flightCode: { contains: route.trim(), mode: 'insensitive' } },
          ],
        },
      };
    }

    // Filter by travel date
    if (travelDate && travelDate.trim() !== '') {
      const [year, month, day] = travelDate.split('-').map(Number);
      const parsedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      whereClause.flightInstance = {
        ...(whereClause.flightInstance || {}),
        travelDate: parsedDate,
      };
    }

    // Filter by departure time
    if (departureTime && departureTime.trim() !== '' && departureTime.toLowerCase() !== 'all times') {
      whereClause.flightInstance = {
        ...(whereClause.flightInstance || {}),
        departureTime: departureTime.trim(),
      };
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where: whereClause }),
      prisma.booking.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
          flightInstance: {
            include: { flight: true },
          },
          passengers: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      bookings,
    };
  }

  /**
   * Detailed booking view for administrator
   */
  static async getBookingDetails(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        flightInstance: {
          include: { flight: true },
        },
        passengers: true,
        auditEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return booking;
  }
}
