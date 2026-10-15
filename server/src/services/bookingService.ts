import { prisma } from '../db.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';
import { NotificationService } from './notificationService.js';
import { PricingService } from './pricingService.js';
import { MAX_PASSENGERS_PER_BOOKING, SEAT_LIMIT_WARNING_MESSAGE } from '../utils/constants.js';

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

    const fare = await PricingService.calculateItineraryFare({
      flightInstanceId,
      adultCount,
      childCount,
      cabinClass,
      selectedSeats,
    });

    if (fare.availableSeats < totalPassengers) {
      throw new BadRequestError(`Only ${fare.availableSeats} seat(s) remaining on this flight.`);
    }

    return {
      flightInstanceId: fare.flightInstanceId,
      flightCode: fare.flightCode,
      origin: fare.origin,
      destination: fare.destination,
      travelDate: fare.travelDate,
      departureTime: fare.departureTime,
      arrivalTime: fare.arrivalTime,
      availableSeats: fare.availableSeats,
      adultCount,
      childCount,
      cabinClass,
      breakdown: {
        baseAdultFare: fare.baseAdultFare,
        baseChildFare: fare.baseChildFare,
        adultSubtotal: fare.adultSubtotal,
        childSubtotal: fare.childSubtotal,
        baseTotal: fare.baseTotal,
        taxesAndFees: fare.taxesAndFees,
        seatCharges: fare.seatCharges,
        grandTotal: fare.grandTotal,
        appliedRules: fare.appliedRules,
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
    returnFlightInstanceId?: string;
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
    returnPassengers?: Array<{
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
      returnFlightInstanceId,
      adultCount,
      childCount,
      cabinClass = 'ECONOMY',
      contactEmail,
      contactPhone,
      paymentMethod = 'DEMO_PAY',
      passengers,
      returnPassengers,
    } = params;
    const totalPassengers = adultCount + childCount;

    if (totalPassengers <= 0) {
      throw new BadRequestError('At least one passenger is required.');
    }

    if (totalPassengers > MAX_PASSENGERS_PER_BOOKING) {
      throw new BadRequestError(SEAT_LIMIT_WARNING_MESSAGE(MAX_PASSENGERS_PER_BOOKING));
    }

    if (passengers.length !== totalPassengers) {
      throw new BadRequestError('Passenger count does not match the provided passenger list.');
    }

    const retPassengers = returnPassengers && returnPassengers.length === totalPassengers
      ? returnPassengers
      : passengers;

    // Validate seat counts and duplicate seat selections
    const outboundSeats = passengers.filter((p) => p.seatNumber).map((p) => p.seatNumber!.toUpperCase().trim());
    if (new Set(outboundSeats).size !== outboundSeats.length) {
      throw new BadRequestError('Duplicate seats selected. Each passenger must have a unique seat.');
    }
    if (outboundSeats.length > totalPassengers) {
      throw new BadRequestError(SEAT_LIMIT_WARNING_MESSAGE(totalPassengers));
    }

    const retSeats = retPassengers.filter((p) => p.seatNumber).map((p) => p.seatNumber!.toUpperCase().trim());
    if (new Set(retSeats).size !== retSeats.length) {
      throw new BadRequestError('Duplicate return seats selected. Each passenger must have a unique seat.');
    }
    if (retSeats.length > totalPassengers) {
      throw new BadRequestError(SEAT_LIMIT_WARNING_MESSAGE(totalPassengers));
    }

    const result = await prisma.$transaction(async (tx) => {
      // 0. Fetch registered user contact details if not explicitly provided
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true, mobileNumber: true },
      });
      const effectiveEmail = contactEmail || user?.email || null;
      const effectivePhone = contactPhone || user?.mobileNumber || null;

      // 1. Atomic decrement of available seats for outbound flight
      const updateResult = await tx.$executeRaw`
        UPDATE flight_instances
        SET "availableSeats" = "availableSeats" - ${totalPassengers},
            "updatedAt" = NOW()
        WHERE id = ${flightInstanceId} AND "availableSeats" >= ${totalPassengers}
      `;

      if (updateResult === 0) {
        throw new BadRequestError(
          'Insufficient seats available on the outbound flight. The flight may have just been booked by another passenger.'
        );
      }

      // 1b. If round-trip, atomic decrement for return flight
      if (returnFlightInstanceId) {
        const returnUpdate = await tx.$executeRaw`
          UPDATE flight_instances
          SET "availableSeats" = "availableSeats" - ${totalPassengers},
              "updatedAt" = NOW()
          WHERE id = ${returnFlightInstanceId} AND "availableSeats" >= ${totalPassengers}
        `;

        if (returnUpdate === 0) {
          throw new BadRequestError(
            'Insufficient seats available on the return flight. Please select another flight.'
          );
        }
      }

      // 2. Fetch the outbound instance
      const instance = await tx.flightInstance.findUnique({
        where: { id: flightInstanceId },
        include: { flight: true },
      });

      if (!instance) {
        throw new NotFoundError('Outbound flight departure instance not found.');
      }

      // 3. Outbound fare calculation using authoritative PricingService
      const outboundFare = await PricingService.calculateItineraryFare({
        flightInstanceId,
        adultCount,
        childCount,
        cabinClass,
        selectedSeats: outboundSeats,
        db: tx,
      });

      const adultFare = outboundFare.baseAdultFare;
      const childFare = outboundFare.baseChildFare;
      const seatCharges = outboundFare.seatCharges;
      const totalAmount = new Prisma.Decimal(outboundFare.grandTotal);

      // 4. Generate outbound booking reference & PNR
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingReference = `CF${datePart}${randomSuffix}`;
      const pnr = `CF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const initialPaymentStatus = paymentMethod === 'GPAY_QR' ? 'PENDING_VERIFICATION' : 'CONFIRMED';

      // 5. Create outbound booking
      const booking = await tx.booking.create({
        data: {
          bookingReference,
          pnr,
          userId,
          flightInstanceId,
          adultCount,
          childCount,
          cabinClass,
          contactEmail: effectiveEmail,
          contactPhone: effectivePhone,
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
              seatNumber: p.seatNumber ? p.seatNumber.toUpperCase().trim() : null,
              isCancelled: false,
            })),
          },
          auditEvents: {
            create: [
              {
                eventType: 'CREATED',
                details: `Outbound booking created with ${adultCount} Adult(s), ${childCount} Child(ren) (${cabinClass}). Payment method: ${paymentMethod}. Total: ₹${totalAmount.toFixed(2)}.`,
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

      // 6. Concurrency-safe atomic lock of assigned outbound seats
      for (const p of booking.passengers) {
        if (p.seatNumber) {
          const sNum = p.seatNumber.toUpperCase().trim();
          const seatUpdate = await tx.flightSeat.updateMany({
            where: {
              flightInstanceId,
              seatNumber: sNum,
              status: 'AVAILABLE',
            },
            data: {
              status: 'OCCUPIED',
              bookingId: booking.id,
              passengerId: p.id,
            },
          });

          if (seatUpdate.count === 0) {
            throw new ConflictError(`Seat ${sNum} is no longer available on this flight. Please select another seat.`);
          }
        }
      }

      // 7. If returnFlightInstanceId, create Return booking
      let returnBookingRecord = null;
      if (returnFlightInstanceId) {
        const returnInstance = await tx.flightInstance.findUnique({
          where: { id: returnFlightInstanceId },
          include: { flight: true },
        });

        if (!returnInstance) {
          throw new NotFoundError('Return flight departure instance not found.');
        }

        const returnFare = await PricingService.calculateItineraryFare({
          flightInstanceId: returnFlightInstanceId,
          adultCount,
          childCount,
          cabinClass,
          selectedSeats: retSeats,
          db: tx,
        });

        const retAdultFare = returnFare.baseAdultFare;
        const retChildFare = returnFare.baseChildFare;
        const retSeatCharges = returnFare.seatCharges;
        const retTotalAmount = new Prisma.Decimal(returnFare.grandTotal);

        const retRandomSuffix = Math.floor(1000 + Math.random() * 9000);
        const retBookingReference = `CF${datePart}${retRandomSuffix}R`;
        const retPnr = `CF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        returnBookingRecord = await tx.booking.create({
          data: {
            bookingReference: retBookingReference,
            pnr: retPnr,
            userId,
            flightInstanceId: returnFlightInstanceId,
            adultCount,
            childCount,
            cabinClass,
            contactEmail: effectiveEmail,
            contactPhone: effectivePhone,
            paymentStatus: initialPaymentStatus,
            paymentMethod,
            adultFareSnapshot: new Prisma.Decimal(retAdultFare),
            childFareSnapshot: new Prisma.Decimal(retChildFare),
            seatCharges: new Prisma.Decimal(retSeatCharges),
            totalAmount: retTotalAmount,
            status: 'CONFIRMED',
            passengers: {
              create: retPassengers.map((p) => ({
                name: p.name.trim(),
                type: p.type,
                gender: p.gender || null,
                age: p.age || null,
                seatNumber: p.seatNumber ? p.seatNumber.toUpperCase().trim() : null,
                isCancelled: false,
              })),
            },
            auditEvents: {
              create: [
                {
                  eventType: 'CREATED',
                  details: `Return leg booking created. Linked to outbound booking ${booking.bookingReference}. Total: ₹${retTotalAmount.toFixed(2)}.`,
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

        // Concurrency-safe atomic lock of assigned return seats
        for (const p of returnBookingRecord.passengers) {
          if (p.seatNumber) {
            const sNum = p.seatNumber.toUpperCase().trim();
            const seatUpdate = await tx.flightSeat.updateMany({
              where: {
                flightInstanceId: returnFlightInstanceId,
                seatNumber: sNum,
                status: 'AVAILABLE',
              },
              data: {
                status: 'OCCUPIED',
                bookingId: returnBookingRecord.id,
                passengerId: p.id,
              },
            });

            if (seatUpdate.count === 0) {
              throw new ConflictError(`Return flight seat ${sNum} is no longer available. Please select another seat.`);
            }
          }
        }

        // Link outbound to return booking via audit event
        await tx.bookingEvent.create({
          data: {
            bookingId: booking.id,
            eventType: 'ROUND_TRIP_LINK',
            details: `Linked return booking reference: ${retBookingReference}`,
          },
        });
      }

      // 8. If GPAY_QR, initialize a Payment record in PENDING_VERIFICATION
      if (paymentMethod === 'GPAY_QR') {
        const combinedAmount = returnBookingRecord
          ? totalAmount.add(returnBookingRecord.totalAmount)
          : totalAmount;

        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: combinedAmount,
            method: 'GPAY_QR',
            status: 'PENDING_VERIFICATION',
          },
        });
      }

      return {
        ...booking,
        returnBooking: returnBookingRecord,
      };
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

        if (result.returnBooking) {
          await NotificationService.notifyBookingConfirmation({
            email: result.returnBooking.contactEmail,
            phone: result.returnBooking.contactPhone,
            bookingReference: result.returnBooking.bookingReference,
            pnr: result.returnBooking.pnr,
            flightCode: result.returnBooking.flightInstance.flight.flightCode,
            origin: result.returnBooking.flightInstance.flight.origin,
            destination: result.returnBooking.flightInstance.flight.destination,
            travelDate: result.returnBooking.flightInstance.travelDate.toISOString().slice(0, 10),
            departureTime: result.returnBooking.flightInstance.departureTime,
            totalAmount: result.returnBooking.totalAmount.toNumber().toLocaleString('en-IN'),
          });
        }
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
   * Cancel entire booking and release inventory.
   * If part of a round-trip, atomically cancels both outbound and return legs.
   */
  static async cancelEntireBooking(bookingId: string, userId: string, isAdmin = false) {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { passengers: true, auditEvents: true },
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

      // Check for linked round-trip booking
      let linkedBookingRef: string | null = null;
      for (const ev of booking.auditEvents) {
        const linkMatch =
          ev.details.match(/Linked return booking reference:\s*(CF[0-9A-Za-z]+)/i) ||
          ev.details.match(/Linked to outbound booking\s*(CF[0-9A-Za-z]+)/i);
        if (linkMatch) {
          linkedBookingRef = linkMatch[1];
          break;
        }
      }

      let linkedBooking = null;
      if (linkedBookingRef) {
        linkedBooking = await tx.booking.findUnique({
          where: { bookingReference: linkedBookingRef },
          include: { passengers: true },
        });
      } else if (booking.bookingReference.endsWith('R')) {
        // Find outbound booking that linked to this return booking
        const linkingEvent = await tx.bookingEvent.findFirst({
          where: {
            details: { contains: booking.bookingReference },
          },
          include: { booking: { include: { passengers: true } } },
        });
        if (linkingEvent?.booking && linkingEvent.booking.status !== 'CANCELLED') {
          linkedBooking = linkingEvent.booking;
        }
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

      // If linked booking exists and not yet cancelled, cancel it as well (round-trip full cancellation)
      if (linkedBooking && linkedBooking.status !== 'CANCELLED') {
        const linkedSeatsToRelease = linkedBooking.adultCount + linkedBooking.childCount;
        if (linkedSeatsToRelease > 0) {
          await tx.$executeRaw`
            UPDATE flight_instances
            SET "availableSeats" = "availableSeats" + ${linkedSeatsToRelease},
                "updatedAt" = NOW()
            WHERE id = ${linkedBooking.flightInstanceId}
          `;
        }

        await tx.flightSeat.updateMany({
          where: { bookingId: linkedBooking.id },
          data: {
            status: 'AVAILABLE',
            bookingId: null,
            passengerId: null,
          },
        });

        await tx.passenger.updateMany({
          where: { bookingId: linkedBooking.id, isCancelled: false },
          data: { isCancelled: true },
        });

        await tx.booking.update({
          where: { id: linkedBooking.id },
          data: {
            status: 'CANCELLED',
            adultCount: 0,
            childCount: 0,
            cancelledAt: new Date(),
            auditEvents: {
              create: {
                eventType: 'FULL_CANCELLATION',
                details: `Linked round-trip flight leg cancelled. Released ${linkedSeatsToRelease} seat(s).`,
              },
            },
          },
        });
      }

      // Customer notifications
      const user = await tx.user.findUnique({
        where: { id: booking.userId },
        select: { email: true, mobileNumber: true },
      });

      const recipientEmail = booking.contactEmail || user?.email;
      const recipientPhone = booking.contactPhone || user?.mobileNumber;

      return { updatedBooking, recipientEmail, recipientPhone, totalAmount: booking.totalAmount.toNumber() };
    });

    try {
      await NotificationService.notifyCancellation({
        email: result.recipientEmail,
        phone: result.recipientPhone,
        bookingReference: result.updatedBooking.bookingReference,
        refundAmount: result.totalAmount.toLocaleString('en-IN'),
        cancellationFee: '0',
      });
    } catch (err) {
      console.warn('Cancellation notification error:', err);
    }

    return result.updatedBooking;
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

    const result = await prisma.$transaction(async (tx) => {
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

      const user = await tx.user.findUnique({
        where: { id: booking.userId },
        select: { email: true, mobileNumber: true },
      });

      return {
        booking: updated,
        refundAmount,
        seatsReleased: seatsToRelease,
        recipientEmail: booking.contactEmail || user?.email,
        recipientPhone: booking.contactPhone || user?.mobileNumber,
      };
    });

    if ('booking' in result) {
      try {
        await NotificationService.notifyCancellation({
          email: result.recipientEmail,
          phone: result.recipientPhone,
          bookingReference: result.booking.bookingReference,
          refundAmount: result.refundAmount.toLocaleString('en-IN'),
          cancellationFee: '0',
        });
      } catch (err) {
        console.warn('Partial cancellation notification error:', err);
      }
    }

    return result;
  }
}
