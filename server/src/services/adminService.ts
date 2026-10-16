import { prisma } from '../db.js';
import { NotFoundError } from '../utils/errors.js';

export class AdminService {
  /**
   * Helper to resolve current date in Asia/Kolkata timezone (YYYY-MM-DD)
   */
  static getTodayInKolkata(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  }

  /**
   * Admin dashboard metrics derived directly from real database records,
   * customizable by date with Asia/Kolkata timezone support.
   */
  static async getDashboardStats(dateStr?: string) {
    const activeDateStr = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())
      ? dateStr.trim()
      : this.getTodayInKolkata();

    const [year, month, day] = activeDateStr.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    // Formatted current time in Asia/Kolkata
    const currentDateTimeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());

    // 1. Flights scheduled on this date
    const instancesOnDate = await prisma.flightInstance.findMany({
      where: { travelDate: parsedDate },
      include: {
        flight: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { departureTime: 'asc' },
    });

    const flightsScheduledToday = instancesOnDate.filter((i) => i.status !== 'CANCELLED').length;
    const totalFlightsOnDate = instancesOnDate.length;

    // Available seats & occupancy for selected date
    const totalCapacityDate = instancesOnDate.reduce((sum, inst) => sum + inst.flight.capacity, 0);
    const availableSeatsDate = instancesOnDate.reduce((sum, inst) => sum + inst.availableSeats, 0);
    const occupiedSeatsDate = Math.max(0, totalCapacityDate - availableSeatsDate);
    const occupancyRateDate =
      totalCapacityDate > 0
        ? Number(((occupiedSeatsDate / totalCapacityDate) * 100).toFixed(1))
        : 0;

    // 2. Bookings for flights scheduled on this date
    const bookingsOnDate = await prisma.booking.findMany({
      where: { flightInstance: { travelDate: parsedDate } },
      include: {
        passengers: true,
        payments: true,
        user: { select: { id: true, username: true, email: true, name: true } },
        flightInstance: { include: { flight: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const bookingsMadeToday = bookingsOnDate.length;
    const confirmedBookingsToday = bookingsOnDate.filter((b) => b.status === 'CONFIRMED').length;
    const pendingBookingsToday = bookingsOnDate.filter(
      (b) => b.paymentStatus === 'PENDING_VERIFICATION' || b.paymentStatus === 'PENDING'
    ).length;
    const cancelledBookingsToday = bookingsOnDate.filter((b) => b.status === 'CANCELLED').length;

    // Travelling passengers on this date
    const travellingPassengersToday = bookingsOnDate
      .filter((b) => b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + b.passengers.filter((p) => !p.isCancelled).length, 0);

    // Verified revenue for bookings on this date
    const verifiedRevenueDate = bookingsOnDate.reduce((sum, b) => {
      const verifiedPayments = b.payments.filter((p) => p.status === 'VERIFIED');
      return sum + verifiedPayments.reduce((pSum, p) => pSum + p.amount.toNumber(), 0);
    }, 0);

    // 3. System-wide / operational metrics
    const [
      totalActiveFlights,
      upcomingFlightInstances,
      upcomingFlightsSystem,
      completedFlightsSystem,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      totalRegisteredUsers,
      totalVerifiedRevenueResult,
    ] = await Promise.all([
      prisma.flight.count({ where: { isActive: true } }),
      prisma.flightInstance.count({ where: { travelDate: { gte: parsedDate } } }),
      prisma.flightInstance.count({
        where: { travelDate: { gte: parsedDate }, status: { not: 'CANCELLED' } },
      }),
      prisma.flightInstance.count({
        where: { OR: [{ travelDate: { lt: parsedDate } }, { status: 'COMPLETED' }] },
      }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
      prisma.user.count(),
      prisma.payment.aggregate({
        where: { status: 'VERIFIED' },
        _sum: { amount: true },
      }),
    ]);

    const totalVerifiedRevenue = totalVerifiedRevenueResult._sum.amount?.toNumber() || 0;

    // 4. Flights departing soonest on this date
    const flightsDepartingSoon = instancesOnDate.slice(0, 8).map((inst) => ({
      id: inst.id,
      flightCode: inst.flight.flightCode,
      airlineName: inst.flight.airlineName,
      origin: inst.flight.origin,
      destination: inst.flight.destination,
      departureTime: inst.departureTime,
      arrivalTime: inst.arrivalTime,
      capacity: inst.flight.capacity,
      availableSeats: inst.availableSeats,
      bookedSeats: Math.max(0, inst.flight.capacity - inst.availableSeats),
      status: inst.status,
    }));

    // 5. Recent bookings on selected date
    const recentBookingsOnDate = bookingsOnDate.slice(0, 6).map((b) => ({
      id: b.id,
      bookingReference: b.bookingReference,
      pnr: b.pnr || b.bookingReference,
      customerName: b.user.name || b.user.username,
      flightCode: b.flightInstance.flight.flightCode,
      route: `${b.flightInstance.flight.origin} → ${b.flightInstance.flight.destination}`,
      departureTime: b.flightInstance.departureTime,
      passengerCount: b.passengers.length,
      totalAmount: b.totalAmount.toNumber(),
      status: b.status,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt.toISOString(),
    }));

    return {
      // Date and timezone context
      selectedDate: activeDateStr,
      todayDate: this.getTodayInKolkata(),
      timezone: 'Asia/Kolkata',
      currentDateTime: currentDateTimeStr,

      // 12 Requested Operational Cards & Details
      flightsScheduledToday,
      totalFlightsOnDate,
      bookingsMadeToday,
      confirmedBookingsToday,
      pendingBookingsToday,
      cancelledBookingsToday,
      travellingPassengersToday,
      upcomingFlights: upcomingFlightsSystem,
      completedFlights: completedFlightsSystem,
      totalRegisteredUsers,
      totalVerifiedRevenue,
      verifiedRevenueDate,
      availableSeatsToday: availableSeatsDate,
      totalCapacityToday: totalCapacityDate,
      occupiedSeatsToday: occupiedSeatsDate,
      occupancyRateToday: occupancyRateDate,

      // Lists & Tables
      flightsDepartingSoon,
      recentBookingsOnDate,

      // Existing backwards-compatible fields
      totalActiveFlights,
      upcomingFlightInstances,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
    };
  }

  /**
   * 12-Month Calendar Overview:
   * Aggregates month-level summary metrics and day-by-day status badges for the entire year.
   */
  static async getCalendarOverview(year: number, month: number) {
    // Validate year & month (1-12)
    const safeYear = Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : new Date().getFullYear();
    const safeMonth = Number.isInteger(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;

    const startOfMonth = new Date(Date.UTC(safeYear, safeMonth - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(safeYear, safeMonth, 0, 23, 59, 59, 999));
    const totalDaysInMonth = new Date(Date.UTC(safeYear, safeMonth, 0)).getUTCDate();

    // Query all instances in this month
    const instances = await prisma.flightInstance.findMany({
      where: {
        travelDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        flight: {
          select: {
            capacity: true,
            flightCode: true,
            origin: true,
            destination: true,
          },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: [{ travelDate: 'asc' }, { departureTime: 'asc' }],
    });

    // Query all bookings in this month
    const bookings = await prisma.booking.findMany({
      where: {
        flightInstance: {
          travelDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      },
      include: {
        passengers: { select: { id: true, isCancelled: true } },
        payments: { select: { amount: true, status: true } },
      },
    });

    // Monthly overview calculation
    const totalScheduledFlights = instances.filter((i) => i.status !== 'CANCELLED').length;
    const totalBookings = bookings.length;
    const totalPassengers = bookings
      .filter((b) => b.status === 'CONFIRMED')
      .reduce((acc, b) => acc + b.passengers.filter((p) => !p.isCancelled).length, 0);

    const totalVerifiedRevenue = bookings.reduce((sum, b) => {
      const verified = b.payments.filter((p) => p.status === 'VERIFIED');
      return sum + verified.reduce((vSum, p) => vSum + p.amount.toNumber(), 0);
    }, 0);

    const totalCapacity = instances.reduce((acc, i) => acc + i.flight.capacity, 0);
    const totalAvailableSeats = instances.reduce((acc, i) => acc + i.availableSeats, 0);
    const occupiedSeats = Math.max(0, totalCapacity - totalAvailableSeats);
    const monthlyOccupancyRate =
      totalCapacity > 0 ? Number(((occupiedSeats / totalCapacity) * 100).toFixed(1)) : 0;

    // Day-by-day mapping
    const days: Record<
      string,
      {
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
    > = {};

    // Initialize all days of the month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateKey = `${safeYear}-${String(safeMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days[dateKey] = {
        date: dateKey,
        flightCount: 0,
        bookingCount: 0,
        passengerCount: 0,
        hasCancelledFlights: false,
        hasDelayedFlights: false,
        isFullyBooked: false,
        flightsSample: [],
      };
    }

    // Populate instances into day buckets
    for (const inst of instances) {
      const dateKey = inst.travelDate.toISOString().slice(0, 10);
      if (!days[dateKey]) continue;

      days[dateKey].flightCount++;
      if (inst.status === 'CANCELLED') days[dateKey].hasCancelledFlights = true;
      if (inst.status === 'DELAYED') days[dateKey].hasDelayedFlights = true;
      if (inst.availableSeats === 0) days[dateKey].isFullyBooked = true;

      if (days[dateKey].flightsSample.length < 4) {
        days[dateKey].flightsSample.push({
          id: inst.id,
          flightCode: inst.flight.flightCode,
          departureTime: inst.departureTime,
          status: inst.status,
          availableSeats: inst.availableSeats,
        });
      }
    }

    // Populate bookings into day buckets
    for (const b of bookings) {
      // Find matching instance
      const inst = instances.find((i) => i.id === b.flightInstanceId);
      if (!inst) continue;
      const dateKey = inst.travelDate.toISOString().slice(0, 10);
      if (!days[dateKey]) continue;

      days[dateKey].bookingCount++;
      if (b.status === 'CONFIRMED') {
        days[dateKey].passengerCount += b.passengers.filter((p) => !p.isCancelled).length;
      }
    }

    return {
      year: safeYear,
      month: safeMonth,
      monthlySummary: {
        totalScheduledFlights,
        totalBookings,
        totalPassengers,
        totalVerifiedRevenue,
        monthlyOccupancyRate,
        totalCapacity,
        totalAvailableSeats,
        occupiedSeats,
      },
      days,
    };
  }

  /**
   * Calendar Date Details:
   * Returns complete flights schedule and bookings for a specific date, including
   * capacity, seat counts, passenger details, and statuses.
   */
  static async getCalendarDateDetails(dateStr: string) {
    const activeDateStr = /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())
      ? dateStr.trim()
      : this.getTodayInKolkata();

    const [year, month, day] = activeDateStr.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    // Fetch instances
    const instances = await prisma.flightInstance.findMany({
      where: { travelDate: parsedDate },
      include: {
        flight: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { departureTime: 'asc' },
    });

    // Fetch bookings
    const bookings = await prisma.booking.findMany({
      where: { flightInstance: { travelDate: parsedDate } },
      include: {
        user: { select: { id: true, username: true, email: true, name: true, mobileNumber: true } },
        flightInstance: { include: { flight: true } },
        passengers: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate daily summary
    const totalFlights = instances.length;
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED').length;
    const pendingBookings = bookings.filter(
      (b) => b.paymentStatus === 'PENDING_VERIFICATION' || b.paymentStatus === 'PENDING'
    ).length;
    const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED').length;

    const travellingPassengers = bookings
      .filter((b) => b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + b.passengers.filter((p) => !p.isCancelled).length, 0);

    const verifiedRevenue = bookings.reduce((sum, b) => {
      const verified = b.payments.filter((p) => p.status === 'VERIFIED');
      return sum + verified.reduce((vSum, p) => vSum + p.amount.toNumber(), 0);
    }, 0);

    const totalCapacity = instances.reduce((sum, i) => sum + i.flight.capacity, 0);
    const availableSeats = instances.reduce((sum, i) => sum + i.availableSeats, 0);
    const occupiedSeats = Math.max(0, totalCapacity - availableSeats);
    const occupancyRate =
      totalCapacity > 0 ? Number(((occupiedSeats / totalCapacity) * 100).toFixed(1)) : 0;

    const formattedFlights = instances.map((inst) => ({
      id: inst.id,
      flightId: inst.flightId,
      flightCode: inst.flight.flightCode,
      airlineName: inst.flight.airlineName,
      origin: inst.flight.origin,
      destination: inst.flight.destination,
      travelDate: activeDateStr,
      departureTime: inst.departureTime,
      arrivalTime: inst.arrivalTime,
      capacity: inst.flight.capacity,
      availableSeats: inst.availableSeats,
      bookedSeats: Math.max(0, inst.flight.capacity - inst.availableSeats),
      occupancyRate:
        inst.flight.capacity > 0
          ? Number((((inst.flight.capacity - inst.availableSeats) / inst.flight.capacity) * 100).toFixed(1))
          : 0,
      adultFare: inst.adultFare.toNumber(),
      childFare: inst.childFare.toNumber(),
      status: inst.status,
      bookingsCount: inst._count.bookings,
    }));

    const formattedBookings = bookings.map((b) => {
      const verifiedPayment = b.payments.find((p) => p.status === 'VERIFIED');
      return {
        id: b.id,
        bookingReference: b.bookingReference,
        pnr: b.pnr || b.bookingReference,
        customerName: b.user.name || b.user.username,
        customerEmail: b.contactEmail || b.user.email || 'N/A',
        customerPhone: b.contactPhone || b.user.mobileNumber || 'N/A',
        passengerCount: b.passengers.length,
        passengers: b.passengers.map((p) => ({
          name: p.name,
          seatNumber: p.seatNumber || 'Unassigned',
          isCancelled: p.isCancelled,
          type: p.type,
        })),
        flightCode: b.flightInstance.flight.flightCode,
        route: `${b.flightInstance.flight.origin} → ${b.flightInstance.flight.destination}`,
        departureTime: b.flightInstance.departureTime,
        travelDate: activeDateStr,
        bookingStatus: b.status,
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod,
        totalAmount: b.totalAmount.toNumber(),
        isVerified: !!verifiedPayment,
        createdAt: b.createdAt.toISOString(),
      };
    });

    return {
      selectedDate: activeDateStr,
      dailySummary: {
        totalFlights,
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        travellingPassengers,
        verifiedRevenue,
        totalCapacity,
        availableSeats,
        occupiedSeats,
        occupancyRate,
      },
      flights: formattedFlights,
      bookings: formattedBookings,
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
