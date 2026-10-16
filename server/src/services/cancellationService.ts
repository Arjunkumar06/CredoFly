import { prisma } from '../db.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';
import { NotificationService } from './notificationService.js';

export class CancellationService {
  /**
   * Determine refund percentage and fee tier based on exact hours before scheduled flight departure
   */
  static getRefundTier(hoursBeforeDeparture: number) {
    if (hoursBeforeDeparture >= 240) {
      // 10 days or more
      return {
        tierName: 'TIER_10_DAYS_95',
        tierLabel: '10 days or more before departure',
        refundPercentage: 95,
        feePercentage: 5,
        description: '95% refund eligible as cancellation is requested 10+ days before departure.',
      };
    } else if (hoursBeforeDeparture >= 168) {
      // 7 days or more but less than 10 days
      return {
        tierName: 'TIER_7_DAYS_75',
        tierLabel: '7 to 10 days before departure',
        refundPercentage: 75,
        feePercentage: 25,
        description: '75% refund eligible as cancellation is requested between 7 and 10 days before departure.',
      };
    } else if (hoursBeforeDeparture >= 72) {
      // More than 3 days but less than 7 days
      return {
        tierName: 'TIER_3_DAYS_50',
        tierLabel: '3 to 7 days before departure',
        refundPercentage: 50,
        feePercentage: 50,
        description: '50% refund eligible as cancellation is requested between 3 and 7 days before departure.',
      };
    } else {
      // 3 days or less
      return {
        tierName: 'TIER_LESS_3_DAYS_0',
        tierLabel: 'Less than 3 days before departure',
        refundPercentage: 0,
        feePercentage: 100,
        description: 'Non-refundable as cancellation is requested within 3 days (72 hours) of departure.',
      };
    }
  }

  /**
   * Pre-cancellation quote and policy calculation
   */
  static async getCancellationQuote(bookingId: string, userId: string, isAdmin = false) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        flightInstance: {
          include: { flight: true },
        },
        passengers: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (!isAdmin && booking.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this booking.');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestError('This booking has already been cancelled.');
    }

    // Calculate exact scheduled departure timestamp
    const [depH, depM] = booking.flightInstance.departureTime.split(':').map(Number);
    const departureDate = new Date(booking.flightInstance.travelDate);
    departureDate.setHours(depH, depM, 0, 0);

    const now = new Date();
    const diffMs = departureDate.getTime() - now.getTime();
    const hoursBeforeDeparture = Math.max(0, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

    const tier = CancellationService.getRefundTier(hoursBeforeDeparture);
    const totalPaid = booking.totalAmount.toNumber();
    const refundAmount = Number(((totalPaid * tier.refundPercentage) / 100).toFixed(2));
    const cancellationFee = Number((totalPaid - refundAmount).toFixed(2));

    return {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      flightCode: booking.flightInstance.flight.flightCode,
      route: `${booking.flightInstance.flight.origin} → ${booking.flightInstance.flight.destination}`,
      departureTime: `${booking.flightInstance.travelDate.toISOString().slice(0, 10)} ${booking.flightInstance.departureTime}`,
      hoursBeforeDeparture,
      totalPaid,
      tier: tier.tierLabel,
      tierCode: tier.tierName,
      refundPercentage: tier.refundPercentage,
      estimatedRefund: refundAmount,
      cancellationFee,
      policyNote: tier.description,
      passengerCount: booking.passengers.filter((p) => !p.isCancelled).length,
    };
  }

  /**
   * Process cancellation transaction with inventory release and refund recording
   */
  static async cancelBookingWithTierRefund(bookingId: string, userId: string, isAdmin = false) {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          flightInstance: {
            include: { flight: true },
          },
          passengers: true,
          user: {
            select: { id: true, email: true, name: true, username: true },
          },
        },
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

      // Calculate deadline and tier
      const [depH, depM] = booking.flightInstance.departureTime.split(':').map(Number);
      const departureDate = new Date(booking.flightInstance.travelDate);
      departureDate.setHours(depH, depM, 0, 0);

      const now = new Date();
      const diffMs = departureDate.getTime() - now.getTime();
      const hoursBeforeDeparture = Math.max(0, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

      const tier = CancellationService.getRefundTier(hoursBeforeDeparture);
      const totalPaid = booking.totalAmount.toNumber();
      const refundAmount = Number(((totalPaid * tier.refundPercentage) / 100).toFixed(2));
      const cancellationFee = Number((totalPaid - refundAmount).toFixed(2));

      const seatsToRelease = booking.passengers.filter((p) => !p.isCancelled).length;

      // 1. Restore flight instance available seats
      if (seatsToRelease > 0) {
        await tx.$executeRaw`
          UPDATE flight_instances
          SET "availableSeats" = "availableSeats" + ${seatsToRelease},
              "updatedAt" = NOW()
          WHERE id = ${booking.flightInstanceId}
        `;
      }

      // 2. Release any assigned visual flight seats
      await tx.flightSeat.updateMany({
        where: { bookingId },
        data: {
          status: 'AVAILABLE',
          bookingId: null,
          passengerId: null,
        },
      });

      // 3. Mark all passengers as cancelled
      await tx.passenger.updateMany({
        where: { bookingId, isCancelled: false },
        data: { isCancelled: true },
      });

      // 4. Create Cancellation record
      const cancellation = await tx.cancellation.create({
        data: {
          bookingId,
          hoursBeforeDeparture: new Prisma.Decimal(hoursBeforeDeparture),
          refundTier: tier.tierName,
          refundPercentage: new Prisma.Decimal(tier.refundPercentage),
          totalPaid: new Prisma.Decimal(totalPaid),
          refundAmount: new Prisma.Decimal(refundAmount),
          cancellationFee: new Prisma.Decimal(cancellationFee),
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      // 5. Update Booking status
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          adultCount: 0,
          childCount: 0,
          paymentStatus: refundAmount > 0 ? 'REFUND_PENDING' : 'CANCELLED',
          cancelledAt: new Date(),
          auditEvents: {
            create: {
              eventType: 'FULL_CANCELLATION',
              details: `Cancelled under policy tier '${tier.tierLabel}' (${tier.refundPercentage}% refund). Refund: ₹${refundAmount.toFixed(2)}, Fee: ₹${cancellationFee.toFixed(2)}. Released ${seatsToRelease} seat(s).`,
            },
          },
        },
        include: {
          flightInstance: {
            include: { flight: true },
          },
          passengers: true,
          cancellations: true,
        },
      });

      return {
        booking: updatedBooking,
        cancellation,
        refundAmount,
        cancellationFee,
        refundPercentage: tier.refundPercentage,
        seatsReleased: seatsToRelease,
        recipientEmail: booking.user?.email || booking.contactEmail,
        recipientPhone: booking.contactPhone,
        totalPaid,
        tierLabel: tier.tierLabel,
      };
    });

    // 6. Notify customer asynchronously AFTER database transaction has committed
    NotificationService.notifyCancellation({
      email: result.recipientEmail,
      phone: result.recipientPhone,
      bookingReference: result.booking.bookingReference,
      pnr: result.booking.pnr,
      customerName: result.booking.passengers?.[0]?.name,
      flightCode: result.booking.flightInstance?.flight?.flightCode,
      origin: result.booking.flightInstance?.flight?.origin,
      destination: result.booking.flightInstance?.flight?.destination,
      travelDate: result.booking.flightInstance?.travelDate
        ? result.booking.flightInstance.travelDate.toISOString().slice(0, 10)
        : 'Upcoming',
      totalPaid: result.totalPaid.toLocaleString('en-IN'),
      refundAmount: result.refundAmount.toLocaleString('en-IN'),
      cancellationFee: result.cancellationFee.toLocaleString('en-IN'),
      isPartial: false,
      cancelledPassengers: result.booking.passengers?.map((p) => ({
        name: p.name,
        seatNumber: p.seatNumber,
      })),
      tierLabel: result.tierLabel,
    }).catch((e) => console.warn('Cancellation notification error:', e));

    return {
      booking: result.booking,
      cancellation: result.cancellation,
      refundAmount: result.refundAmount,
      cancellationFee: result.cancellationFee,
      refundPercentage: result.refundPercentage,
      seatsReleased: result.seatsReleased,
    };
  }
}
