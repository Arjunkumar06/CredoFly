import { prisma } from '../db.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { NotificationService } from './notificationService.js';

export class PaymentService {
  /**
   * Fetch active Google Pay / UPI QR configuration
   */
  static async getPaymentConfig() {
    const config = await prisma.paymentConfig.findFirst();
    if (!config) {
      return {
        merchantName: 'CredoFly Aviation Pvt Ltd',
        upiId: 'credofly@oksbi',
        qrImageUrl: '/images/gpay-sample-qr.png',
        instructions: 'Scan the CredoFly Google Pay / UPI QR code with any UPI app, pay the exact amount, and enter your 12-digit UPI UTR reference number below.',
        requireManualVerification: true,
      };
    }
    return config;
  }

  /**
   * Update payment configuration (Admin only)
   */
  static async updatePaymentConfig(data: {
    merchantName?: string;
    upiId?: string;
    qrImageUrl?: string;
    instructions?: string;
    requireManualVerification?: boolean;
  }) {
    const config = await prisma.paymentConfig.findFirst();
    if (config) {
      return prisma.paymentConfig.update({
        where: { id: config.id },
        data,
      });
    } else {
      return prisma.paymentConfig.create({
        data: {
          merchantName: data.merchantName || 'CredoFly Aviation Pvt Ltd',
          upiId: data.upiId || 'credofly@oksbi',
          qrImageUrl: data.qrImageUrl,
          instructions: data.instructions || 'Scan QR and pay exact amount',
          requireManualVerification: data.requireManualVerification ?? true,
        },
      });
    }
  }

  /**
   * Customer submits Google Pay QR payment with UTR / reference number
   */
  static async submitPayment(params: {
    bookingId: string;
    method?: string;
    utr?: string;
    proofUrl?: string;
    userId: string;
  }) {
    const { bookingId, method = 'GPAY_QR', utr, proofUrl, userId } = params;

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

    if (booking.userId !== userId) {
      throw new BadRequestError('You do not own this booking');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestError('Cannot submit payment for a cancelled booking');
    }

    // Check duplicate UTR if provided
    if (utr && utr.trim() !== '') {
      const normalizedUtr = utr.trim();
      const existingPayment = await prisma.payment.findFirst({
        where: {
          utr: normalizedUtr,
          status: 'VERIFIED',
        },
      });

      if (existingPayment && existingPayment.bookingId !== bookingId) {
        throw new ConflictError(
          'This UPI UTR reference number has already been verified for another booking. Please check your transaction details.'
        );
      }
    }

    const config = await this.getPaymentConfig();
    const isAutoVerify = !config.requireManualVerification || method === 'DEMO_PAY';

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount: booking.totalAmount,
        method,
        utr: utr ? utr.trim() : null,
        proofUrl: proofUrl || null,
        status: isAutoVerify ? 'VERIFIED' : 'PENDING_VERIFICATION',
        verifiedAt: isAutoVerify ? new Date() : null,
        verifiedBy: isAutoVerify ? 'SYSTEM_AUTO' : null,
      },
    });

    // Update booking payment status
    const newPaymentStatus = isAutoVerify ? 'CONFIRMED' : 'PENDING_VERIFICATION';
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: newPaymentStatus,
        paymentMethod: method,
        auditEvents: {
          create: {
            eventType: 'PAYMENT_SUBMITTED',
            details: `Payment submitted via ${method}. Amount: ₹${booking.totalAmount}. UTR: ${utr || 'N/A'}. Status: ${payment.status}.`,
          },
        },
      },
    });

    if (isAutoVerify) {
      // Trigger confirmation notification
      NotificationService.notifyBookingConfirmation({
        email: booking.contactEmail,
        phone: booking.contactPhone,
        bookingReference: booking.bookingReference,
        pnr: booking.pnr,
        customerName: booking.passengers[0]?.name,
        flightCode: booking.flightInstance.flight.flightCode,
        airlineName: booking.flightInstance.flight.airlineName,
        origin: booking.flightInstance.flight.origin,
        destination: booking.flightInstance.flight.destination,
        travelDate: booking.flightInstance.travelDate.toISOString().slice(0, 10),
        departureTime: booking.flightInstance.departureTime,
        arrivalTime: booking.flightInstance.arrivalTime,
        cabinClass: booking.cabinClass,
        totalAmount: booking.totalAmount.toNumber().toLocaleString('en-IN'),
        paymentMethod: method,
        passengers: booking.passengers.map((p) => ({
          name: p.name,
          type: p.type as 'ADULT' | 'CHILD',
          seatNumber: p.seatNumber,
        })),
      }).catch((e) => console.warn('Notification dispatch error:', e));
    }

    return {
      payment,
      bookingReference: booking.bookingReference,
      status: payment.status,
      isVerified: isAutoVerify,
      message: isAutoVerify
        ? 'Payment verified and booking confirmed!'
        : 'Payment proof submitted successfully! CredoFly administrators are reviewing your transaction.',
    };
  }

  /**
   * Admin reviews and verifies or rejects a submitted payment
   */
  static async verifyPayment(paymentId: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string, adminActor = 'admin') {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            flightInstance: {
              include: { flight: true },
            },
            passengers: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment record not found');
    }

    if (payment.status === 'VERIFIED') {
      throw new BadRequestError('This payment has already been verified');
    }

    return prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          verifiedAt: new Date(),
          verifiedBy: adminActor,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        },
      });

      const newBookingPaymentStatus = status === 'VERIFIED' ? 'CONFIRMED' : 'PAYMENT_FAILED';

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: newBookingPaymentStatus,
          auditEvents: {
            create: {
              eventType: status === 'VERIFIED' ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
              details: `Payment #${payment.id} ${status.toLowerCase()} by ${adminActor}. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
            },
          },
        },
      });

      // Audit log entry
      await tx.auditLog.create({
        data: {
          action: status === 'VERIFIED' ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
          entity: 'Payment',
          entityId: paymentId,
          actor: adminActor,
          details: `Booking ${payment.booking.bookingReference} payment marked ${status}. Amount: ₹${payment.amount}. UTR: ${payment.utr || 'N/A'}.`,
        },
      });

      if (status === 'VERIFIED') {
        NotificationService.notifyBookingConfirmation({
          email: payment.booking.contactEmail,
          phone: payment.booking.contactPhone,
          bookingReference: payment.booking.bookingReference,
          pnr: payment.booking.pnr,
          customerName: payment.booking.passengers[0]?.name,
          flightCode: payment.booking.flightInstance.flight.flightCode,
          airlineName: payment.booking.flightInstance.flight.airlineName,
          origin: payment.booking.flightInstance.flight.origin,
          destination: payment.booking.flightInstance.flight.destination,
          travelDate: payment.booking.flightInstance.travelDate.toISOString().slice(0, 10),
          departureTime: payment.booking.flightInstance.departureTime,
          arrivalTime: payment.booking.flightInstance.arrivalTime,
          cabinClass: payment.booking.cabinClass,
          totalAmount: payment.booking.totalAmount.toNumber().toLocaleString('en-IN'),
          paymentMethod: 'UPI / Google Pay (Verified)',
          passengers: payment.booking.passengers.map((p) => ({
            name: p.name,
            type: p.type as 'ADULT' | 'CHILD',
            seatNumber: p.seatNumber,
          })),
        }).catch((e) => console.warn('Payment verified notification error:', e));
      }

      return updatedPayment;
    });
  }

  /**
   * List all submitted payments for admin review
   */
  static async listPayments(status?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    return prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, username: true, email: true, customerId: true } },
            flightInstance: { include: { flight: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
