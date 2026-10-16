import { Resend } from 'resend';
import { prisma } from '../db.js';
import {
  generateWelcomeEmail,
  WelcomeEmailProps,
} from '../templates/welcome-email.js';
import {
  generateBookingConfirmationEmail,
  BookingConfirmationEmailProps,
} from '../templates/booking-confirmation-email.js';
import {
  generateCancellationEmail,
  CancellationEmailProps,
} from '../templates/cancellation-email.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  event: 'REGISTRATION' | 'BOOKING_CONFIRMATION' | 'CANCELLATION' | 'REFUND_UPDATE' | 'GENERAL';
}

export class EmailService {
  private static resendClient: Resend | null = null;
  private static isInitialized = false;

  /**
   * Lazily initialize or retrieve the Resend client safely from process.env.RESEND_API_KEY
   */
  public static getResendClient(): Resend | null {
    if (!this.isInitialized) {
      const apiKey = process.env.RESEND_API_KEY?.trim();
      if (apiKey) {
        try {
          this.resendClient = new Resend(apiKey);
          console.log('✅ [EmailService] Resend SDK initialized successfully.');
        } catch (initErr) {
          console.error('❌ [EmailService] Failed to initialize Resend SDK:', initErr);
          this.resendClient = null;
        }
      } else {
        console.warn('⚠️ [EmailService] RESEND_API_KEY is not configured. Email delivery operating in sandbox/mock mode.');
        this.resendClient = null;
      }
      this.isInitialized = true;
    }
    return this.resendClient;
  }

  /**
   * Reset initialization state (useful in automated tests)
   */
  public static resetClient(): void {
    this.resendClient = null;
    this.isInitialized = false;
  }

  public static getFromEmail(): string {
    return process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev';
  }

  public static getBaseUrl(): string {
    return process.env.APP_BASE_URL?.trim() || process.env.CLIENT_URL?.trim() || 'http://localhost:5001';
  }

  /**
   * Core email dispatch method using Resend with PostgreSQL NotificationLog auditing
   * Guarantees post-commit safety: catches all errors so calling transactions never fail
   */
  public static async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const { to, subject, html, text, event } = options;
    const from = this.getFromEmail();
    const client = this.getResendClient();

    let status = 'SENT';
    let errorMessage: string | null = null;
    let resendMessageId: string | undefined;

    try {
      if (client) {
        const response = await client.emails.send({
          from,
          to: [to],
          subject,
          html,
          text,
        });

        if (response.error) {
          throw new Error(response.error.message || 'Resend API returned delivery error');
        }

        resendMessageId = response.data?.id;
        console.log(`📧 [Resend Success] To: ${to} | Subject: "${subject}" | Resend ID: ${resendMessageId || 'N/A'}`);
      } else {
        // Safe mock / sandbox fallback mode
        console.log(`📧 [Email Sandbox Mode] To: ${to} | From: ${from} | Subject: "${subject}" | Event: ${event}`);
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err?.message || String(err);
      console.warn(`⚠️ [EmailService Dispatch Error] To: ${to} | Error: ${errorMessage}`);
    }

    // Persist notification log record in database
    try {
      await prisma.notificationLog.create({
        data: {
          channel: 'EMAIL',
          recipient: to,
          event,
          title: subject,
          message: text.slice(0, 2000), // Protect against large payload columns
          status,
          error: errorMessage,
        },
      });
    } catch (dbErr) {
      console.warn('⚠️ [EmailService] Could not persist notification log to database:', dbErr);
    }

    return {
      success: status === 'SENT',
      id: resendMessageId,
      error: errorMessage || undefined,
    };
  }

  /**
   * Dispatch Customer Registration Welcome Email
   */
  public static async sendWelcomeEmail(props: WelcomeEmailProps): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const emailContent = generateWelcomeEmail({
        ...props,
        appBaseUrl: props.appBaseUrl || this.getBaseUrl(),
      });

      return await this.sendEmail({
        to: props.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        event: 'REGISTRATION',
      });
    } catch (err: any) {
      console.warn('⚠️ [EmailService] Failed to generate/send welcome email:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dispatch Booking Confirmation Email
   */
  public static async sendBookingConfirmationEmail(
    props: BookingConfirmationEmailProps
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const emailContent = generateBookingConfirmationEmail({
        ...props,
        appBaseUrl: props.appBaseUrl || this.getBaseUrl(),
      });

      return await this.sendEmail({
        to: props.contactEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        event: 'BOOKING_CONFIRMATION',
      });
    } catch (err: any) {
      console.warn('⚠️ [EmailService] Failed to generate/send booking confirmation email:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dispatch Booking Cancellation Email
   */
  public static async sendCancellationEmail(
    props: CancellationEmailProps & { contactEmail: string }
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const emailContent = generateCancellationEmail({
        ...props,
        appBaseUrl: props.appBaseUrl || this.getBaseUrl(),
      });

      return await this.sendEmail({
        to: props.contactEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        event: 'CANCELLATION',
      });
    } catch (err: any) {
      console.warn('⚠️ [EmailService] Failed to generate/send cancellation email:', err);
      return { success: false, error: err.message };
    }
  }
}
