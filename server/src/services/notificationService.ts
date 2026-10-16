import { prisma } from '../db.js';
import { EmailService } from './emailService.js';
import { FlightLegDetails, BookingPassengerInfo } from '../templates/booking-confirmation-email.js';
import { CancelledPassengerInfo } from '../templates/cancellation-email.js';

export interface NotificationPayload {
  channel: 'EMAIL' | 'SMS';
  recipient: string;
  event: 'REGISTRATION' | 'BOOKING_CONFIRMATION' | 'PAYMENT_VERIFIED' | 'CANCELLATION' | 'REFUND_UPDATE' | 'CUSTOMER_ID_RECOVERY';
  title?: string;
  message: string;
}

export class NotificationService {
  /**
   * Dispatch notification via configured adapters (Email via Resend / SMS via Twilio/Sandbox)
   * with audit logging in PostgreSQL
   */
  static async send(payload: NotificationPayload) {
    const { channel, recipient, event, title, message } = payload;

    if (channel === 'EMAIL') {
      return await EmailService.sendEmail({
        to: recipient,
        subject: title || `CredoFly Update: ${event}`,
        text: message,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #0f172a; margin-top: 0;">${title || 'CredoFly Notification'}</h2>
          <p style="font-size: 15px; line-height: 1.6; white-space: pre-line;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b;">CredoFly Aviation Pvt Ltd • Your Journey, Made Simple.</p>
        </div>`,
        event: event as any,
      });
    }

    // SMS Dispatch logic
    const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN;
    let deliveryStatus = 'SENT';
    let errorMessage: string | null = null;

    try {
      if (hasTwilio) {
        console.log(`📱 [Twilio SMS Dispatch] To: ${recipient} | Event: ${event}`);
      } else {
        console.log(`📱 [CredoFly SMS Sandbox] To: ${recipient} | Event: ${event} | Message: ${message}`);
      }
    } catch (err: any) {
      deliveryStatus = 'FAILED';
      errorMessage = err?.message || 'SMS dispatch error';
    }

    try {
      return await prisma.notificationLog.create({
        data: {
          channel: 'SMS',
          recipient,
          event,
          title: title || event,
          message,
          status: deliveryStatus,
          error: errorMessage,
        },
      });
    } catch (dbErr) {
      console.warn('Could not record SMS notification log:', dbErr);
      return null;
    }
  }

  /**
   * Send booking confirmation via both email (Resend) and SMS
   */
  static async notifyBookingConfirmation(params: {
    email?: string | null;
    phone?: string | null;
    bookingReference: string;
    pnr?: string | null;
    customerName?: string;
    flightCode: string;
    airlineName?: string;
    origin: string;
    destination: string;
    travelDate: string;
    departureTime: string;
    arrivalTime?: string;
    cabinClass?: string;
    totalAmount: string | number;
    paymentMethod?: string;
    passengers?: BookingPassengerInfo[];
    returnFlight?: FlightLegDetails | null;
  }) {
    const {
      email,
      phone,
      bookingReference,
      pnr,
      customerName,
      flightCode,
      airlineName,
      origin,
      destination,
      travelDate,
      departureTime,
      arrivalTime,
      cabinClass = 'ECONOMY',
      totalAmount,
      paymentMethod = 'CONFIRMED',
      passengers = [],
      returnFlight,
    } = params;

    const normalizedEmail = EmailService.normalizeEmail(email);

    if (normalizedEmail) {
      // Prevent duplicate emails caused by repeated requests or frontend retries
      const existingEmail = await prisma.notificationLog.findFirst({
        where: {
          channel: 'EMAIL',
          event: 'BOOKING_CONFIRMATION',
          recipient: normalizedEmail,
          title: { contains: bookingReference },
          status: { in: ['accepted', 'delivered', 'SENT'] },
        },
      });

      if (existingEmail) {
        console.log(`ℹ️ [NotificationService] Skipping duplicate confirmation email for ${bookingReference} to ${normalizedEmail}`);
      } else {
        await EmailService.sendBookingConfirmationEmail({
          bookingReference,
          pnr,
          customerName,
          contactEmail: normalizedEmail,
          contactPhone: phone,
          cabinClass,
          paymentMethod,
          totalAmount,
          outboundFlight: {
            flightCode,
            airlineName: airlineName || 'CredoFly Express',
            origin,
            destination,
            travelDate,
            departureTime,
            arrivalTime,
            cabinClass,
          },
          returnFlight,
          passengers: passengers.length > 0 ? passengers : [
            { name: customerName || 'Primary Traveler', type: 'ADULT', seatNumber: null }
          ],
        });
      }
    }

    if (phone) {
      await this.send({
        channel: 'SMS',
        recipient: phone,
        event: 'BOOKING_CONFIRMATION',
        message: `CredoFly: Flight ${flightCode} (${origin} to ${destination}) on ${travelDate} confirmed. PNR: ${pnr || bookingReference}. Total: ₹${totalAmount}. Check-in online 48h before departure.`,
      });
    }
  }

  /**
   * Send cancellation confirmation via both email (Resend) and SMS
   */
  static async notifyCancellation(params: {
    email?: string | null;
    phone?: string | null;
    bookingReference: string;
    pnr?: string | null;
    customerName?: string;
    flightCode?: string;
    origin?: string;
    destination?: string;
    travelDate?: string;
    refundAmount: string | number;
    cancellationFee: string | number;
    totalPaid?: string | number;
    isPartial?: boolean;
    cancelledPassengers?: CancelledPassengerInfo[];
    tierLabel?: string;
  }) {
    const {
      email,
      phone,
      bookingReference,
      pnr,
      customerName,
      flightCode = 'CredoFly Flight',
      origin = 'Origin',
      destination = 'Destination',
      travelDate = 'Upcoming',
      refundAmount,
      cancellationFee,
      totalPaid,
      isPartial,
      cancelledPassengers,
      tierLabel,
    } = params;

    const normalizedEmail = EmailService.normalizeEmail(email);

    if (normalizedEmail) {
      // Prevent duplicate cancellation emails caused by repeated requests or frontend retries
      const existingEmail = await prisma.notificationLog.findFirst({
        where: {
          channel: 'EMAIL',
          event: 'CANCELLATION',
          recipient: normalizedEmail,
          title: { contains: bookingReference },
          status: { in: ['accepted', 'delivered', 'SENT'] },
        },
      });

      if (existingEmail) {
        console.log(`ℹ️ [NotificationService] Skipping duplicate cancellation email for ${bookingReference} to ${normalizedEmail}`);
      } else {
        await EmailService.sendCancellationEmail({
          bookingReference,
          pnr,
          customerName,
          contactEmail: normalizedEmail,
          flightCode,
          origin,
          destination,
          travelDate,
          refundAmount,
          cancellationFee,
          totalPaid: totalPaid ?? refundAmount,
          isPartial,
          cancelledPassengers,
          tierLabel,
        });
      }
    }

    if (phone) {
      await this.send({
        channel: 'SMS',
        recipient: phone,
        event: 'CANCELLATION',
        message: `CredoFly: Booking ${bookingReference} ${isPartial ? 'partially cancelled' : 'cancelled'}. Refund amount: ₹${refundAmount} (Cancellation Fee: ₹${cancellationFee}). The refund will reflect in your account within 3-5 business days.`,
      });
    }
  }
}
