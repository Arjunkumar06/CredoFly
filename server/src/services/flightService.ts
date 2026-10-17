import { prisma } from '../db.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';

export class FlightService {
  /**
   * Search flights by route, date, and passenger count
   */
  static async searchFlights(params: {
    origin: string;
    destination: string;
    travelDate: string; // YYYY-MM-DD
    adults: number;
    children: number;
  }) {
    const { origin, destination, travelDate, adults, children } = params;
    const totalPassengers = adults + children;

    // Parse date safely (YYYY-MM-DD)
    const [year, month, day] = travelDate.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const dayOfWeek = parsedDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ...

    // 1. Find matching active flights
    const matchingFlights = await prisma.flight.findMany({
      where: {
        isActive: true,
        origin: {
          contains: origin.trim(),
          mode: 'insensitive',
        },
        destination: {
          contains: destination.trim(),
          mode: 'insensitive',
        },
      },
      include: {
        schedules: {
          where: {
            dayOfWeek,
            isOperating: true,
          },
        },
      },
    });

    // 2. Resolve or generate FlightInstances for this specific date
    for (const flight of matchingFlights) {
      for (const schedule of flight.schedules) {
        // Upsert FlightInstance safely and synchronize updated fares/timings
        await prisma.flightInstance.upsert({
          where: {
            flightId_travelDate_departureTime: {
              flightId: flight.id,
              travelDate: parsedDate,
              departureTime: schedule.departureTime,
            },
          },
          update: {
            scheduleId: schedule.id,
            arrivalTime: schedule.arrivalTime,
            adultFare: schedule.adultFare,
            childFare: schedule.childFare,
            status: schedule.isOperating && flight.isActive ? 'SCHEDULED' : 'CANCELLED',
          },
          create: {
            flightId: flight.id,
            scheduleId: schedule.id,
            travelDate: parsedDate,
            departureTime: schedule.departureTime,
            arrivalTime: schedule.arrivalTime,
            adultFare: schedule.adultFare,
            childFare: schedule.childFare,
            availableSeats: flight.capacity,
            status: schedule.isOperating && flight.isActive ? 'SCHEDULED' : 'CANCELLED',
          },
        });
      }
    }

    // 3. Query all instances for this date and route with sufficient capacity
    const instances = await prisma.flightInstance.findMany({
      where: {
        travelDate: parsedDate,
        status: 'SCHEDULED',
        flight: {
          isActive: true,
          origin: {
            contains: origin.trim(),
            mode: 'insensitive',
          },
          destination: {
            contains: destination.trim(),
            mode: 'insensitive',
          },
        },
        availableSeats: {
          gte: totalPassengers,
        },
      },
      include: {
        flight: true,
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    // 4. Calculate fares and durations
    return instances.map((inst) => {
      const adultFareNum = inst.adultFare.toNumber();
      const childFareNum = inst.childFare.toNumber();
      const adultSubtotal = adultFareNum * adults;
      const childSubtotal = childFareNum * children;
      const baseFare = adultSubtotal + childSubtotal;
      const taxesAndFees = 350 * totalPassengers;
      const totalFare = baseFare;
      const grandTotal = baseFare + taxesAndFees;

      // Calculate approximate duration
      const [depH, depM] = inst.departureTime.split(':').map(Number);
      const [arrH, arrM] = inst.arrivalTime.split(':').map(Number);
      let durationMinutes = arrH * 60 + arrM - (depH * 60 + depM);
      if (durationMinutes < 0) durationMinutes += 24 * 60; // Overnight flight
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const durationStr = `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim() + ' Non-stop';

      return {
        id: inst.id,
        flightId: inst.flightId,
        flightCode: inst.flight.flightCode,
        airlineName: inst.flight.airlineName,
        origin: inst.flight.origin,
        destination: inst.flight.destination,
        capacity: inst.flight.capacity,
        travelDate: travelDate,
        departureTime: inst.departureTime,
        arrivalTime: inst.arrivalTime,
        adultFare: adultFareNum,
        childFare: childFareNum,
        adultSubtotal,
        childSubtotal,
        baseFare,
        taxesAndFees,
        totalFare,
        grandTotal,
        availableSeats: inst.availableSeats,
        duration: durationStr,
        status: inst.status,
      };
    });
  }

  /**
   * Get all flights for admin
   */
  static async getAllFlights() {
    return prisma.flight.findMany({
      include: {
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
        _count: {
          select: { instances: true },
        },
      },
      orderBy: { flightCode: 'asc' },
    });
  }

  /**
   * Get specific dated flight departure instance with complete itinerary & policy details
   */
  static async getFlightInstanceById(id: string, adults = 1, children = 0) {
    const inst = await prisma.flightInstance.findUnique({
      where: { id },
      include: {
        flight: true,
      },
    });

    if (!inst) {
      throw new NotFoundError('Selected flight departure not found or no longer available.');
    }

    const adultFareNum = inst.adultFare.toNumber();
    const childFareNum = inst.childFare.toNumber();
    const totalFare = adultFareNum * adults + childFareNum * children;

    // Calculate approximate duration
    const [depH, depM] = inst.departureTime.split(':').map(Number);
    const [arrH, arrM] = inst.arrivalTime.split(':').map(Number);
    let durationMinutes = arrH * 60 + arrM - (depH * 60 + depM);
    if (durationMinutes < 0) durationMinutes += 24 * 60; // Overnight flight
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationStr = `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim() + ' Non-stop';

    return {
      id: inst.id,
      flightId: inst.flightId,
      flightCode: inst.flight.flightCode,
      airlineName: 'CredoFly Express',
      aircraft: 'Airbus A320neo',
      origin: inst.flight.origin,
      destination: inst.flight.destination,
      capacity: inst.flight.capacity,
      travelDate: inst.travelDate.toISOString().slice(0, 10),
      departureTime: inst.departureTime,
      arrivalTime: inst.arrivalTime,
      adultFare: adultFareNum,
      childFare: childFareNum,
      totalFare,
      availableSeats: inst.availableSeats,
      duration: durationStr,
      durationMinutes,
      baggage: {
        cabin: '7 Kg (1 piece per pax)',
        checkIn: '15 Kg (1 piece per pax)',
      },
      policies: {
        cancellation: {
          moreThan72Hrs: '₹1,500 cancellation fee per passenger',
          within72Hrs: '₹2,500 cancellation fee per passenger',
          within4Hrs: 'Non-refundable within 4 hours of departure',
        },
        dateChange: {
          moreThan72Hrs: '₹1,000 date change fee + fare difference',
          within72Hrs: '₹2,000 date change fee + fare difference',
        },
      },
    };
  }

  /**
   * Get single flight with schedules
   */
  static async getFlightById(id: string) {
    const flight = await prisma.flight.findUnique({
      where: { id },
      include: {
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!flight) {
      throw new NotFoundError('Flight not found');
    }

    return flight;
  }

  /**
   * Create new flight with default weekly schedules
   */
  static async createFlight(data: {
    flightCode: string;
    origin: string;
    destination: string;
    capacity: number;
    isActive?: boolean;
    schedules?: Array<{
      dayOfWeek: number;
      departureTime: string;
      arrivalTime: string;
      adultFare: number;
      childFare: number;
      isOperating?: boolean;
    }>;
  }) {
    const existing = await prisma.flight.findUnique({
      where: { flightCode: data.flightCode.trim().toUpperCase() },
    });
    if (existing) {
      throw new BadRequestError(`Flight code ${data.flightCode} already exists.`);
    }

    if (data.origin.trim().toLowerCase() === data.destination.trim().toLowerCase()) {
      throw new BadRequestError('Origin and destination must be different.');
    }

    // Default schedules if none provided
    const defaultSchedules = data.schedules || [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      dayOfWeek: day,
      departureTime: '08:00',
      arrivalTime: '10:50',
      adultFare: 5000,
      childFare: 3000,
      isOperating: true,
    }));

    const flight = await prisma.flight.create({
      data: {
        flightCode: data.flightCode.trim().toUpperCase(),
        origin: data.origin.trim(),
        destination: data.destination.trim(),
        capacity: data.capacity,
        isActive: data.isActive ?? true,
        schedules: {
          create: defaultSchedules.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            departureTime: s.departureTime,
            arrivalTime: s.arrivalTime,
            adultFare: new Prisma.Decimal(s.adultFare),
            childFare: new Prisma.Decimal(s.childFare),
            isOperating: s.isOperating ?? true,
          })),
        },
      },
      include: {
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    // Populate upcoming flight instances for the next 90 days immediately
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const instancesToCreate = [];

      for (let dayOffset = 0; dayOffset <= 90; dayOffset++) {
        const cur = new Date(today);
        cur.setDate(cur.getDate() + dayOffset);
        const dayOfWeek = cur.getDay();
        const sched = flight.schedules.find((s) => s.dayOfWeek === dayOfWeek && s.isOperating);
        if (sched) {
          instancesToCreate.push({
            flightId: flight.id,
            scheduleId: sched.id,
            travelDate: cur,
            departureTime: sched.departureTime,
            arrivalTime: sched.arrivalTime,
            adultFare: sched.adultFare,
            childFare: sched.childFare,
            availableSeats: flight.capacity,
            status: flight.isActive ? 'SCHEDULED' : 'CANCELLED',
          });
        }
      }

      if (instancesToCreate.length > 0) {
        await prisma.flightInstance.createMany({
          data: instancesToCreate,
          skipDuplicates: true,
        });
      }
    } catch (e) {
      console.warn('Initial flight instances generation warning:', e);
    }

    return flight;
  }

  /**
   * Update existing flight and propagate fare, schedule, and capacity changes to all future instances
   */
  static async updateFlight(
    id: string,
    data: {
      origin?: string;
      destination?: string;
      capacity?: number;
      isActive?: boolean;
      schedules?: Array<{
        dayOfWeek: number;
        departureTime: string;
        arrivalTime: string;
        adultFare: number;
        childFare: number;
        isOperating: boolean;
      }>;
    }
  ) {
    const flight = await prisma.flight.findUnique({
      where: { id },
      include: { instances: true },
    });
    if (!flight) {
      throw new NotFoundError('Flight not found');
    }

    // Check capacity reduction safety
    if (data.capacity && data.capacity < flight.capacity) {
      const bookedInstances = await prisma.flightInstance.findMany({
        where: {
          flightId: id,
          travelDate: { gte: new Date() },
        },
      });

      for (const inst of bookedInstances) {
        const currentlyBooked = flight.capacity - inst.availableSeats;
        if (currentlyBooked > data.capacity) {
          throw new BadRequestError(
            `Cannot reduce capacity to ${data.capacity}. Upcoming flight departure on ${inst.travelDate.toISOString().slice(0, 10)} already has ${currentlyBooked} booked seats.`
          );
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Update flight base details
      const updated = await tx.flight.update({
        where: { id },
        data: {
          origin: data.origin?.trim(),
          destination: data.destination?.trim(),
          capacity: data.capacity,
          isActive: data.isActive,
        },
      });

      // 2. Adjust capacity differences on future departures
      if (data.capacity && data.capacity !== flight.capacity) {
        const capacityDiff = data.capacity - flight.capacity;
        await tx.flightInstance.updateMany({
          where: {
            flightId: id,
            travelDate: { gte: today },
          },
          data: {
            availableSeats: {
              increment: capacityDiff,
            },
          },
        });
      }

      // 3. If deactivated, mark all upcoming instances as CANCELLED
      if (data.isActive === false) {
        await tx.flightInstance.updateMany({
          where: {
            flightId: id,
            travelDate: { gte: today },
          },
          data: {
            status: 'CANCELLED',
          },
        });
      }

      // 4. Update weekly schedules and synchronize all future flight departure instances
      if (data.schedules && data.schedules.length > 0) {
        for (const s of data.schedules) {
          const scheduleRecord = await tx.flightSchedule.upsert({
            where: {
              flightId_dayOfWeek: {
                flightId: id,
                dayOfWeek: s.dayOfWeek,
              },
            },
            update: {
              departureTime: s.departureTime,
              arrivalTime: s.arrivalTime,
              adultFare: new Prisma.Decimal(s.adultFare),
              childFare: new Prisma.Decimal(s.childFare),
              isOperating: s.isOperating,
            },
            create: {
              flightId: id,
              dayOfWeek: s.dayOfWeek,
              departureTime: s.departureTime,
              arrivalTime: s.arrivalTime,
              adultFare: new Prisma.Decimal(s.adultFare),
              childFare: new Prisma.Decimal(s.childFare),
              isOperating: s.isOperating,
            },
          });

          // Fetch all future instances for this flight to synchronize
          const upcomingMatchingInstances = await tx.flightInstance.findMany({
            where: {
              flightId: id,
              travelDate: { gte: today },
            },
            select: { id: true, travelDate: true, scheduleId: true },
          });

          const idsToUpdate = upcomingMatchingInstances
            .filter((inst) => {
              const instDay = inst.travelDate.getDay();
              return inst.scheduleId === scheduleRecord.id || instDay === s.dayOfWeek;
            })
            .map((inst) => inst.id);

          if (idsToUpdate.length > 0) {
            const targetStatus =
              data.isActive === false || !s.isOperating
                ? 'CANCELLED'
                : 'SCHEDULED';

            await tx.flightInstance.updateMany({
              where: {
                id: { in: idsToUpdate },
              },
              data: {
                scheduleId: scheduleRecord.id,
                departureTime: s.departureTime,
                arrivalTime: s.arrivalTime,
                adultFare: new Prisma.Decimal(s.adultFare),
                childFare: new Prisma.Decimal(s.childFare),
                status: targetStatus,
              },
            });
          }
        }
      }

      return tx.flight.findUnique({
        where: { id },
        include: {
          schedules: {
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Delete or safely deactivate a flight while preserving all booking records
   */
  static async deleteFlight(id: string) {
    const flight = await prisma.flight.findUnique({
      where: { id },
      include: {
        instances: {
          include: {
            _count: {
              select: { bookings: true },
            },
          },
        },
      },
    });

    if (!flight) {
      throw new NotFoundError('Flight not found');
    }

    const totalBookings = flight.instances.reduce((acc, inst) => acc + inst._count.bookings, 0);

    if (totalBookings > 0) {
      // Historical bookings exist: soft-delete/deactivate to safeguard booking integrity
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.$transaction(async (tx) => {
        await tx.flight.update({
          where: { id },
          data: {
            isActive: false,
            status: 'CANCELLED',
          },
        });

        await tx.flightInstance.updateMany({
          where: {
            flightId: id,
            travelDate: { gte: today },
          },
          data: {
            status: 'CANCELLED',
            availableSeats: 0,
          },
        });

        await tx.flightSchedule.updateMany({
          where: { flightId: id },
          data: { isOperating: false },
        });
      });

      return {
        success: true,
        softDeleted: true,
        message: `Flight ${flight.flightCode} has ${totalBookings} existing booking record(s). It has been deactivated and cancelled for future dates to preserve historical booking data.`,
      };
    } else {
      // Zero bookings: safe to completely remove
      await prisma.$transaction(async (tx) => {
        const instanceIds = flight.instances.map((i) => i.id);
        if (instanceIds.length > 0) {
          await tx.flightSeat.deleteMany({
            where: { flightInstanceId: { in: instanceIds } },
          });
          await tx.flightInstance.deleteMany({
            where: { flightId: id },
          });
        }
        await tx.flightSchedule.deleteMany({
          where: { flightId: id },
        });
        await tx.flight.delete({
          where: { id },
        });
      });

      return {
        success: true,
        softDeleted: false,
        message: `Flight ${flight.flightCode} and its associated schedules were deleted successfully.`,
      };
    }
  }

  /**
   * Idempotent 12-Month Flight Schedule Generator from configured weekly schedules
   */
  static async generateYearlySchedule(params?: { startDate?: Date; monthsAhead?: number }) {
    const start = params?.startDate || new Date();
    start.setHours(0, 0, 0, 0);
    const months = params?.monthsAhead || 12;

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);

    // Fetch active flights with operating weekly schedules
    const flights = await prisma.flight.findMany({
      where: { isActive: true },
      include: {
        schedules: {
          where: { isOperating: true },
        },
      },
    });

    // Fetch schedule-affecting holidays
    const scheduleHolidays = await prisma.holiday.findMany({
      where: {
        affectsSchedule: true,
        date: { gte: start, lte: endDate },
      },
    });
    const holidayDateSet = new Set(scheduleHolidays.map((h) => h.date.toISOString().slice(0, 10)));

    let generatedCount = 0;
    let skippedCount = 0;

    const instancesToCreate = [];

    const cur = new Date(start);
    while (cur <= endDate) {
      const travelDate = new Date(cur);
      const dateStr = travelDate.toISOString().slice(0, 10);
      const dayOfWeek = travelDate.getDay();

      if (holidayDateSet.has(dateStr)) {
        skippedCount++;
        cur.setDate(cur.getDate() + 1);
        continue;
      }

      for (const flight of flights) {
        const matchingSchedules = flight.schedules.filter((s) => s.dayOfWeek === dayOfWeek);

        for (const s of matchingSchedules) {
          // Check effective dates if present
          if (s.effectiveStartDate && travelDate < s.effectiveStartDate) continue;
          if (s.effectiveEndDate && travelDate > s.effectiveEndDate) continue;

          instancesToCreate.push({
            flightId: flight.id,
            scheduleId: s.id,
            travelDate,
            departureTime: s.departureTime,
            arrivalTime: s.arrivalTime,
            adultFare: s.adultFare,
            childFare: s.childFare,
            availableSeats: flight.capacity,
          });
        }
      }

      cur.setDate(cur.getDate() + 1);
    }

    // High performance batch insertion
    const chunkSize = 1000;
    for (let i = 0; i < instancesToCreate.length; i += chunkSize) {
      const chunk = instancesToCreate.slice(i, i + chunkSize);
      const res = await prisma.flightInstance.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      generatedCount += res.count;
    }

    return {
      success: true,
      monthsCovered: months,
      startDate: start.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      totalInstancesCheckedOrCreated: generatedCount,
      holidaysSkipped: skippedCount,
    };
  }

  /**
   * Low-Fare Calendar for route over a specified month (or next 30 days)
   */
  static async getLowFareCalendar(params: {
    origin: string;
    destination: string;
    yearMonth?: string; // YYYY-MM
  }) {
    const { origin, destination, yearMonth } = params;

    let startDate: Date;
    let endDate: Date;

    if (yearMonth) {
      const [y, m] = yearMonth.split('-').map(Number);
      startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    } else {
      const today = new Date();
      startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 30);
    }

    // Ensure schedules are generated for this window
    await FlightService.generateYearlySchedule({ startDate, monthsAhead: 1 });

    const instances = await prisma.flightInstance.findMany({
      where: {
        travelDate: { gte: startDate, lte: endDate },
        flight: {
          isActive: true,
          origin: { contains: origin.trim(), mode: 'insensitive' },
          destination: { contains: destination.trim(), mode: 'insensitive' },
        },
        availableSeats: { gt: 0 },
      },
      include: {
        flight: true,
      },
      orderBy: [{ travelDate: 'asc' }, { adultFare: 'asc' }],
    });

    const calendarMap: Record<string, { date: string; lowestFare: number; flightCount: number; available: boolean }> = {};

    for (const inst of instances) {
      const dStr = inst.travelDate.toISOString().slice(0, 10);
      const fare = inst.adultFare.toNumber();

      if (!calendarMap[dStr]) {
        calendarMap[dStr] = {
          date: dStr,
          lowestFare: fare,
          flightCount: 1,
          available: true,
        };
      } else {
        calendarMap[dStr].flightCount++;
        if (fare < calendarMap[dStr].lowestFare) {
          calendarMap[dStr].lowestFare = fare;
        }
      }
    }

    return Object.values(calendarMap);
  }

  /**
   * Get unique routes and cities for search dropdowns
   */
  static async getCitiesAndRoutes() {
    const flights = await prisma.flight.findMany({
      where: { isActive: true },
      select: { origin: true, destination: true },
    });

    const origins = Array.from(new Set(flights.map((f) => f.origin))).sort();
    const destinations = Array.from(new Set(flights.map((f) => f.destination))).sort();

    return { origins, destinations };
  }
}

