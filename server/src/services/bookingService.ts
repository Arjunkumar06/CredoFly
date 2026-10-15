import { prisma } from '../db.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';
import { NotificationService } from './notificationService.js';
import { PricingService } from './pricingService.js';

export class BookingService {
  /**
   * Preview booking fare, seat charges, baggage, and availability without reserving inventory
   */
  static async previewBookingFare(params: {
    flightInstanceId: string;
    adultCount: number;
    childCount: number;
    cabinClass?: string;
    selectedSeats?: string[];
  }) {
    const { flightInstanceId, adultCount, childCount, cabinClass = 'ECONOMY', selectedSeats = [] } = params;
    const totalPassengers = adultCount + childCount;

    const instance = await prisma.flightInstance.findUnique({
      where: { id: flightInstanceId },
      include: {
        flight: {
          include: { aircraftConfig: true },
        },
      },
    });

    if (!instance) {
      throw new NotFoundError('Flight departure not found');
    }

    if (instance.availableSeats < totalPassengers) {
      throw new BadRequestError(`Only ${instance.availableSeats} seat(s) remaining on this flight.`);
    }

    // Dynamic pricing adjustment (Holiday / Weekend / Peak rules)
    const pricing = await PricingService.calculateDynamicMultiplier({
      travelDate: instance.travelDate,
      route: `${instance.flight.origin}-${instance.flight.destination}`,
      cabinClass,
    });

    const baseAdultFare = Math.round(instance.adultFare.toNumber() * pricing.baseMultiplier);
    const baseChildFare = Math.round(instance.childFare.toNumber() * pricing.baseMultiplier);

    const adultSubtotal = baseAdultFare * adultCount;
    const childSubtotal = baseChildFare * childCount;
    const baseTotal = adultSubtotal + childSubtotal;

    // Standard aviation taxes & airport fees (₹350 per passenger)
    const taxesAndFees = 350 * totalPassengers;

    // Seat charges calculation if specific seats are selected
    let seatCharges = 0;
    if (selectedSeats && selectedSeats.length > 0) {
      const seats = await prisma.flightSeat.findMany({
        where: {
          flightInstanceId,
          seatNumber: { in: selectedSeats },
        },
      });

      for (const s of seats) {
        seatCharges += s.price.toNumber();
      }
    }

    const grandTotal = baseTotal + taxesAndFees + seatCharges;

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
        seatCharges,
        grandTotal,
        appliedRules: pricing.appliedRules,
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
      seatNumber?: string;
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

    const result = await prisma.$transaction(async (tx) => {
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
      if (cabinClass === 'FIRST_CLASS') multiplier = 2.5;

      const adultFare = Math.round(instance.adultFare.toNumber() * multiplier);
      const childFare = Math.round(instance.childFare.toNumber() * multiplier);
      const taxesAndFees = 350 * totalPassengers;

      // Calculate seat charges if seats are assigned
      let seatCharges = 0;
      const seatNumbers = passengers.filter((p) => p.seatNumber).map((p) => p.seatNumber!.toUpperCase().trim());

      if (seatNumbers.length > 0) {
        for (const sNum of seatNumbers) {
          const seatRecord = await tx.flightSeat.findUnique({
            where: {
              flightInstanceId_seatNumber: {
                flightInstanceId,
                seatNumber: sNum,
              },
            },
          });
          if (seatRecord) {
            seatCharges += seatRecord.price.toNumber();
          }
        }
      }

      const totalAmount = new Prisma.Decimal(adultFare * adultCount + childFare * childCount + taxesAndFees + seatCharges);

      // 4. Generate unique readable booking reference & PNR: e.g. CF2026101501
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingReference = `CF${datePart}${randomSuffix}`;
      const pnr = `CF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const initialPaymentStatus = paymentMethod === 'GPAY_QR' ? 'PENDING_VERIFICATION' : 'CONFIRMED';

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
          paymentStatus: initialPaymentStatus,
          paymentMethod,
          adultFareSnapshot: new Prisma.Decimal(adultFare),
          childFareSnapshot: new Prisma.Decimal(childFare),
          seatCharges: new Prisma.Decimal(seatCharges),
          totalAmount,
          status: 'CONFIRMED',
          passengers: {
            create: passengers.map((p) => ({
              name: p.name.trim(),
              type: p.type,
              gender: p.gender || null,
              age: p.age || null,
              seatNumber: p.seatNumber || null,
              isCancelled: false,
            })),
          },
          auditEvents: {
            create: [
              {
                eventType: 'CREATED',
                details: `Booking created with ${adultCount} Adult(s), ${childCount} Child(ren) (${cabinClass}). Payment method: ${paymentMethod}. Total: ₹${totalAmount.toFixed(2)}.`,
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

      // 6. Lock assigned seats to this booking and passengers
      for (const p of booking.passengers) {
        if (p.seatNumber) {
          await tx.flightSeat.updateMany({
            where: {
              flightInstanceId,
              seatNumber: p.seatNumber,
            },
            data: {
              status: 'OCCUPIED',
              bookingId: booking.id,
              passengerId: p.id,
            },
          });
        }
      }

      // 7. If GPAY_QR, initialize a Payment record in PENDING_VERIFICATION
      if (paymentMethod === 'GPAY_QR') {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: totalAmount,
            method: 'GPAY_QR',
            status: 'PENDING_VERIFICATION',
          },
        });
      }

      return booking;
    });

    if (paymentMethod !== 'GPAY_QR') {
      try {
        await NotificationService.notifyBookingConfirmation({
          email: result.contactEmail,
          phone: result.contactPhone,
          bookingReference: result.bookingReference,
          pnr: result.pnr,
          flightCode: result.flightInstance.flight.flightCode,
          origin: result.flightInstance.flight.origin,
          destination: result.flightInstance.flight.destination,
          travelDate: result.flightInstance.travelDate.toISOString().slice(0, 10),
          departureTime: result.flightInstance.departureTime,
          totalAmount: result.totalAmount.toNumber().toLocaleString('en-IN'),
        });
      } catch (e) {
        console.warn('Booking confirmation notification error:', e);
      }
    }

    return result;
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
        payments: true,
        cancellations: true,
        feedback: true,
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
          select: { id: true, name: true, username: true, email: true, customerId: true, mobileNumber: true },
        },
        flightInstance: {
          include: { flight: true },
        },
        passengers: true,
        seats: true,
        payments: true,
        cancellations: true,
        feedback: true,
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
   * Customer submits flight review and ratings post-journey
   */
  static async submitFeedback(params: {
    bookingId: string;
    userId: string;
    rating: number;
    punctualityRating?: number;
    serviceRating?: number;
    cleanlinessRating?: number;
    comment?: string;
  }) {
    const { bookingId, userId, rating, punctualityRating, serviceRating, cleanlinessRating, comment } = params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenError('You can only submit feedback for your own bookings.');
    }

    const existingFeedback = await prisma.feedback.findUnique({
      where: { bookingId },
    });

    if (existingFeedback) {
      throw new ConflictError('Feedback has already been submitted for this booking.');
    }

    return prisma.feedback.create({
      data: {
        bookingId,
        userId,
        rating,
        punctualityRating,
        serviceRating,
        cleanlinessRating,
        comment,
      },
    });
  }

  /**
   * Cancel entire booking and release inventory (legacy or direct)
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

      // Release any assigned visual seats
      await tx.flightSeat.updateMany({
        where: { bookingId },
        data: {
          status: 'AVAILABLE',
          bookingId: null,
          passengerId: null,
        },
      });

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
          if (p.seatNumber) {
            await tx.flightSeat.updateMany({
              where: { bookingId, seatNumber: p.seatNumber },
              data: { status: 'AVAILABLE', bookingId: null, passengerId: null },
            });
          }
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
          if (p.seatNumber) {
            await tx.flightSeat.updateMany({
              where: { bookingId, seatNumber: p.seatNumber },
              data: { status: 'AVAILABLE', bookingId: null, passengerId: null },
            });
          }
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
