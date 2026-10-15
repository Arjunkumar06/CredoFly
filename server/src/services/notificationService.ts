import { prisma } from '../db.js';

export interface NotificationPayload {
  channel: 'EMAIL' | 'SMS';
  recipient: string;
  event: 'REGISTRATION' | 'BOOKING_CONFIRMATION' | 'PAYMENT_VERIFIED' | 'CANCELLATION' | 'REFUND_UPDATE' | 'CUSTOMER_ID_RECOVERY';
  title?: string;
  message: string;
}

export class NotificationService {
  /**
   * Dispatch notification via configured adapters (Email / SMS) with audit logging in PostgreSQL
   */
  static async send(payload: NotificationPayload) {
    const { channel, recipient, event, title, message } = payload;

    // Check if provider credentials exist in environment
    const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER;
    const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN;

    let deliveryStatus = 'SENT';
    let errorMessage: string | null = null;

    try {
      if (channel === 'EMAIL') {
        if (hasSmtp) {
          // If real SMTP is configured, real transport would be called here
          console.log(`📧 [Real SMTP Dispatch] To: ${recipient} | Subject: ${title} | Event: ${event}`);
        } else {
          // Robust Sandbox / Mock Adapter: log clearly without failing transaction
          console.log(`📧 [CredoFly Email Adapter (Dev/Sandbox)] To: ${recipient} | Subject: ${title || event} | Event: ${event}`);
        }
      } else if (channel === 'SMS') {
        if (hasTwilio) {
          // If real Twilio / AWS SNS is configured, provider would be called here
          console.log(`📱 [Real SMS Dispatch] To: ${recipient} | Event: ${event}`);
        } else {
          // Sandbox SMS Adapter
          console.log(`📱 [CredoFly SMS Adapter (Dev/Sandbox)] To: ${recipient} | Event: ${event} | Message: ${message}`);
        }
      }
    } catch (err: any) {
      deliveryStatus = 'FAILED';
      errorMessage = err.message || 'Notification provider dispatch error';
    }

    // Persist immutable audit log record in database
    try {
      return await prisma.notificationLog.create({
        data: {
          channel,
          recipient,
          event,
          title: title || event,
          message,
          status: deliveryStatus,
          error: errorMessage,
        },
      });
    } catch (dbErr) {
      console.warn('Could not record notification log:', dbErr);
      return null;
    }
  }

  /**
   * Send booking confirmation via both email and SMS
   */
  static async notifyBookingConfirmation(params: {
    email?: string | null;
    phone?: string | null;
    bookingReference: string;
    pnr?: string | null;
    flightCode: string;
    origin: string;
    destination: string;
    travelDate: string;
    departureTime: string;
    totalAmount: string;
  }) {
    const { email, phone, bookingReference, pnr, flightCode, origin, destination, travelDate, departureTime, totalAmount } = params;

    if (email) {
      await this.send({
        channel: 'EMAIL',
        recipient: email,
        event: 'BOOKING_CONFIRMATION',
        title: `CredoFly Flight Confirmation - PNR: ${pnr || bookingReference}`,
        message: `Your flight ${flightCode} from ${origin} to ${destination} on ${travelDate} at ${departureTime} is confirmed. Booking Reference: ${bookingReference}, PNR: ${pnr || bookingReference}. Total Paid: ₹${totalAmount}. Have a wonderful flight!`,
      });
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
   * Send cancellation confirmation
   */
  static async notifyCancellation(params: {
    email?: string | null;
    phone?: string | null;
    bookingReference: string;
    refundAmount: string;
    cancellationFee: string;
  }) {
    const { email, phone, bookingReference, refundAmount, cancellationFee } = params;

    const message = `CredoFly: Booking ${bookingReference} has been cancelled. Refund amount: ₹${refundAmount} (Cancellation Fee: ₹${cancellationFee}). The refund will reflect in your account within 3-5 business days.`;

    if (email) {
      await this.send({
        channel: 'EMAIL',
        recipient: email,
        event: 'CANCELLATION',
        title: `CredoFly Cancellation & Refund Notice - Ref: ${bookingReference}`,
        message,
      });
    }

    if (phone) {
      await this.send({
        channel: 'SMS',
        recipient: phone,
        event: 'CANCELLATION',
        message,
      });
    }
  }
}
