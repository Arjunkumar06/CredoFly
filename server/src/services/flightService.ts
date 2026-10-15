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
        // Upsert FlightInstance safely so duplicates are never created
        await prisma.flightInstance.upsert({
          where: {
            flightId_travelDate_departureTime: {
              flightId: flight.id,
              travelDate: parsedDate,
              departureTime: schedule.departureTime,
            },
          },
          update: {},
          create: {
            flightId: flight.id,
            scheduleId: schedule.id,
            travelDate: parsedDate,
            departureTime: schedule.departureTime,
            arrivalTime: schedule.arrivalTime,
            adultFare: schedule.adultFare,
            childFare: schedule.childFare,
            availableSeats: flight.capacity,
          },
        });
      }
    }

    // 3. Query all instances for this date and route with sufficient capacity
    const instances = await prisma.flightInstance.findMany({
      where: {
        travelDate: parsedDate,
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
        origin: inst.flight.origin,
        destination: inst.flight.destination,
        capacity: inst.flight.capacity,
        travelDate: travelDate,
        departureTime: inst.departureTime,
        arrivalTime: inst.arrivalTime,
        adultFare: adultFareNum,
        childFare: childFareNum,
        totalFare,
        availableSeats: inst.availableSeats,
        duration: durationStr,
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

    return prisma.flight.create({
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
  }

  /**
   * Update existing flight
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
      // Update flight base details
      const updated = await tx.flight.update({
        where: { id },
        data: {
          origin: data.origin?.trim(),
          destination: data.destination?.trim(),
          capacity: data.capacity,
          isActive: data.isActive,
        },
      });

      // Update weekly schedules if provided
      if (data.schedules && data.schedules.length > 0) {
        for (const s of data.schedules) {
          await tx.flightSchedule.upsert({
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
