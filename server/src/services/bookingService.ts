import { prisma } from '../db.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';

export class BookingService {
  /**
   * Preview booking fare and availability without reserving seats
   */
  static async previewBookingFare(params: {
    flightInstanceId: string;
    adultCount: number;
    childCount: number;
    cabinClass?: string;
  }) {
    const { flightInstanceId, adultCount, childCount, cabinClass = 'ECONOMY' } = params;
    const totalPassengers = adultCount + childCount;

    const instance = await prisma.flightInstance.findUnique({
      where: { id: flightInstanceId },
      include: { flight: true },
    });

    if (!instance) {
      throw new NotFoundError('Flight departure not found');
    }

    if (instance.availableSeats < totalPassengers) {
      throw new BadRequestError(`Only ${instance.availableSeats} seat(s) remaining on this flight.`);
    }

    let multiplier = 1.0;
    if (cabinClass === 'PREMIUM_ECONOMY') multiplier = 1.25;
    if (cabinClass === 'BUSINESS') multiplier = 1.8;

    const baseAdultFare = Math.round(instance.adultFare.toNumber() * multiplier);
    const baseChildFare = Math.round(instance.childFare.toNumber() * multiplier);

    const adultSubtotal = baseAdultFare * adultCount;
    const childSubtotal = baseChildFare * childCount;
    const baseTotal = adultSubtotal + childSubtotal;

    // Standard aviation taxes & airport fees (e.g., ₹350 per pax)
    const taxesAndFees = 350 * totalPassengers;
    const grandTotal = baseTotal + taxesAndFees;

    return {
      flightInstanceId,
      flightCode: instance.flight.flightCode,
      origin: instance.flight.origin,
      destination: instance.flight.destination,
      travelDate: instance.travelDate.toISOString().slice(0, 10),
      departureTime: instance.departureTime,
      arrivalTime: instance.arrivalTime,
      availableSeats: instance.availableSeats,
      adultCount,
      childCount,
      cabinClass,
      breakdown: {
        baseAdultFare,
        baseChildFare,
        adultSubtotal,
        childSubtotal,
        baseTotal,
        taxesAndFees,
        grandTotal,
      },
      baggage: {
        cabin: cabinClass === 'BUSINESS' ? '12 Kg' : '7 Kg',
        checkIn: cabinClass === 'BUSINESS' ? '30 Kg' : cabinClass === 'PREMIUM_ECONOMY' ? '20 Kg' : '15 Kg',
      },
    };
  }

  /**
   * Concurrency-safe booking creation using database transactions & atomic inventory decrement
   */
  static async createBooking(params: {
    userId: string;
    flightInstanceId: string;
    adultCount: number;
    childCount: number;
    cabinClass?: string;
    contactEmail?: string;
    contactPhone?: string;
    paymentMethod?: string;
    passengers: Array<{
      name: string;
      type: 'ADULT' | 'CHILD';
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      age?: number;
    }>;
  }) {
    const {
      userId,
      flightInstanceId,
      adultCount,
      childCount,
      cabinClass = 'ECONOMY',
      contactEmail,
      contactPhone,
      paymentMethod = 'DEMO_PAY',
      passengers,
    } = params;
    const totalPassengers = adultCount + childCount;

    if (totalPassengers <= 0) {
      throw new BadRequestError('At least one passenger is required.');
    }

    if (passengers.length !== totalPassengers) {
      throw new BadRequestError('Passenger count does not match the provided passenger list.');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Atomic decrement of available seats with capacity guard condition
      const updateResult = await tx.$executeRaw`
        UPDATE flight_instances
        SET "availableSeats" = "availableSeats" - ${totalPassengers},
            "updatedAt" = NOW()
        WHERE id = ${flightInstanceId} AND "availableSeats" >= ${totalPassengers}
      `;

      if (updateResult === 0) {
        throw new BadRequestError(
          'Insufficient seats available. The flight may have just been booked by another passenger.'
        );
      }

      // 2. Fetch the instance to access verified fares and flight details
      const instance = await tx.flightInstance.findUnique({
        where: { id: flightInstanceId },
        include: { flight: true },
      });

      if (!instance) {
        throw new NotFoundError('Flight departure instance not found.');
      }

      // 3. Trusted server-side fare calculation
      let multiplier = 1.0;
      if (cabinClass === 'PREMIUM_ECONOMY') multiplier = 1.25;
      if (cabinClass === 'BUSINESS') multiplier = 1.8;

      const adultFare = Math.round(instance.adultFare.toNumber() * multiplier);
      const childFare = Math.round(instance.childFare.toNumber() * multiplier);
      const taxesAndFees = 350 * totalPassengers;
      const totalAmount = new Prisma.Decimal(adultFare * adultCount + childFare * childCount + taxesAndFees);

      // 4. Generate unique readable booking reference & PNR: e.g. CF2026101501
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingReference = `CF${datePart}${randomSuffix}`;
      const pnr = `CF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 5. Create booking with passenger records
      const booking = await tx.booking.create({
        data: {
          bookingReference,
          pnr,
          userId,
          flightInstanceId,
          adultCount,
          childCount,
          cabinClass,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          paymentStatus: 'CONFIRMED',
          paymentMethod,
          adultFareSnapshot: new Prisma.Decimal(adultFare),
          childFareSnapshot: new Prisma.Decimal(childFare),
          totalAmount,
          status: 'CONFIRMED',
          passengers: {
            create: passengers.map((p) => ({
              name: p.name.trim(),
              type: p.type,
              gender: p.gender || null,
              age: p.age || null,
              isCancelled: false,
            })),
          },
          auditEvents: {
            create: [
              {
                eventType: 'CREATED',
                details: `Booking confirmed with ${adultCount} Adult(s) and ${childCount} Child(ren) (${cabinClass}). Payment method: ${paymentMethod}. Total: ₹${totalAmount.toFixed(2)}`,
              },
            ],
          },
        },
        include: {
          flightInstance: {
            include: { flight: true },
          },
          passengers: true,
          auditEvents: true,
        },
      });

      return booking;
    });
  }

  /**
   * Get authenticated customer's bookings (upcoming and past)
   */
  static async getCustomerBookings(userId: string) {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        flightInstance: {
          include: { flight: true },
        },
        passengers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = bookings.filter((b) => {
      const travelDate = new Date(b.flightInstance.travelDate);
      return travelDate >= now && b.status !== 'CANCELLED';
    });

    const past = bookings.filter((b) => {
      const travelDate = new Date(b.flightInstance.travelDate);
      return travelDate < now || b.status === 'CANCELLED';
    });

    return { all: bookings, upcoming, past };
  }

  /**
   * Get single booking details with access control
   */
  static async getBookingById(bookingId: string, userId: string, isAdmin = false) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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

    if (!isAdmin && booking.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this booking.');
    }

    return booking;
  }

  /**
   * Cancel entire booking and release inventory
   */
  static async cancelEntireBooking(bookingId: string, userId: string, isAdmin = false) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { passengers: true },
      });

      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      if (!isAdmin && booking.userId !== userId) {
        throw new ForbiddenError('You do not have permission to modify this booking.');
      }

      if (booking.status === 'CANCELLED') {
        throw new BadRequestError('This booking has already been cancelled.');
      }

      const seatsToRelease = booking.adultCount + booking.childCount;

      // Atomically restore available seats on the flight instance
      if (seatsToRelease > 0) {
        await tx.$executeRaw`
          UPDATE flight_instances
          SET "availableSeats" = "availableSeats" + ${seatsToRelease},
              "updatedAt" = NOW()
          WHERE id = ${booking.flightInstanceId}
        `;
      }

      // Mark all passengers cancelled
      await tx.passenger.updateMany({
        where: { bookingId, isCancelled: false },
        data: { isCancelled: true },
      });

      // Update booking status
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          adultCount: 0,
          childCount: 0,
          cancelledAt: new Date(),
          auditEvents: {
            create: {
              eventType: 'FULL_CANCELLATION',
              details: `Entire booking cancelled. Released ${seatsToRelease} seat(s).`,
            },
          },
        },
        include: {
          flightInstance: {
            include: { flight: true },
          },
          passengers: true,
          auditEvents: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return updatedBooking;
    });
  }

  /**
   * Partially cancel passengers from a booking and restore released inventory
   */
  static async partialCancelBooking(
    bookingId: string,
    userId: string,
    params: { cancelAdults: number; cancelChildren: number },
    isAdmin = false
  ) {
    const { cancelAdults, cancelChildren } = params;

    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { passengers: true },
      });

      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      if (!isAdmin && booking.userId !== userId) {
        throw new ForbiddenError('You do not have permission to modify this booking.');
      }

      if (booking.status === 'CANCELLED') {
        throw new BadRequestError('Cannot modify a cancelled booking.');
      }

      if (cancelAdults > booking.adultCount) {
        throw new BadRequestError(`Cannot cancel ${cancelAdults} adult(s). Only ${booking.adultCount} booked.`);
      }

      if (cancelChildren > booking.childCount) {
        throw new BadRequestError(`Cannot cancel ${cancelChildren} child(ren). Only ${booking.childCount} booked.`);
      }

      const seatsToRelease = cancelAdults + cancelChildren;
      if (seatsToRelease <= 0) {
        throw new BadRequestError('Please select at least one passenger to cancel.');
      }

      const newAdultCount = booking.adultCount - cancelAdults;
      const newChildCount = booking.childCount - cancelChildren;

      // If all passengers are cancelled, treat as full cancellation
      if (newAdultCount + newChildCount === 0) {
        return this.cancelEntireBooking(bookingId, userId, isAdmin);
      }

      const adultFare = booking.adultFareSnapshot.toNumber();
      const childFare = booking.childFareSnapshot.toNumber();
      const refundAmount = cancelAdults * adultFare + cancelChildren * childFare;
      const newTotalAmount = new Prisma.Decimal(newAdultCount * adultFare + newChildCount * childFare);

      // Atomically restore released seats
      await tx.$executeRaw`
        UPDATE flight_instances
        SET "availableSeats" = "availableSeats" + ${seatsToRelease},
            "updatedAt" = NOW()
        WHERE id = ${booking.flightInstanceId}
      `;

      // Mark the cancelled passengers
      if (cancelAdults > 0) {
        const activeAdults = booking.passengers
          .filter((p) => p.type === 'ADULT' && !p.isCancelled)
          .slice(0, cancelAdults);
        for (const p of activeAdults) {
          await tx.passenger.update({
            where: { id: p.id },
            data: { isCancelled: true },
          });
        }
      }

      if (cancelChildren > 0) {
        const activeChildren = booking.passengers
          .filter((p) => p.type === 'CHILD' && !p.isCancelled)
          .slice(0, cancelChildren);
        for (const p of activeChildren) {
          await tx.passenger.update({
            where: { id: p.id },
            data: { isCancelled: true },
          });
        }
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          adultCount: newAdultCount,
          childCount: newChildCount,
          totalAmount: newTotalAmount,
          auditEvents: {
            create: {
              eventType: 'PARTIAL_CANCELLATION',
              details: `Cancelled ${cancelAdults} adult(s) and ${cancelChildren} child(ren). Released ${seatsToRelease} seat(s). Refund: ₹${refundAmount.toFixed(2)}. Revised Total: ₹${newTotalAmount.toFixed(2)}.`,
            },
          },
        },
        include: {
          flightInstance: {
            include: { flight: true },
          },
          passengers: true,
          auditEvents: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return {
        booking: updated,
        refundAmount,
        seatsReleased: seatsToRelease,
      };
    });
  }
}
