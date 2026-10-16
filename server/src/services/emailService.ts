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
  event: 'REGISTRATION' | 'BOOKING_CONFIRMATION' | 'CANCELLATION' | 'REFUND_UPDATE' | 'CUSTOMER_ID_RECOVERY' | 'DIAGNOSTIC_TEST' | 'GENERAL';
}

export interface EmailDispatchResult {
  success: boolean;
  id?: string;
  status: 'queued' | 'accepted' | 'delivered' | 'bounced' | 'failed';
  error?: string;
  isSandbox?: boolean;
}

export interface DiagnosticTestResult {
  success: boolean;
  configured: boolean;
  maskedApiKey: string;
  fromEmail: string;
  sender: string;
  recipient: string;
  isConfigured: boolean;
  isCustomDomain: boolean;
  isSandboxSender: boolean;
  resendAccepted: boolean;
  status: 'accepted' | 'delivered' | 'failed' | 'bounced' | 'queued';
  providerMessageId?: string;
  error?: string;
  restrictionNote?: string;
  warnings: string[];
  recommendedAction?: string;
  instructions: string[];
}

export class EmailService {
  private static resendClient: Resend | null = null;
  private static isInitialized = false;

  /**
   * Normalize and validate recipient email format
   */
  public static normalizeEmail(email?: string | null): string | null {
    if (!email || typeof email !== 'string') return null;
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? trimmed : null;
  }

  /**
   * Lazily initialize or retrieve the Resend client safely from process.env.RESEND_API_KEY
   * Strips any accidental surrounding quotes and validates key format.
   */
  public static getResendClient(): Resend | null {
    if (!this.isInitialized) {
      const rawApiKey = process.env.RESEND_API_KEY;
      const apiKey = rawApiKey ? rawApiKey.replace(/^["']|["']$/g, '').trim() : '';

      if (apiKey && apiKey.startsWith('re_') && apiKey.length > 8) {
        try {
          this.resendClient = new Resend(apiKey);
          console.log('✅ [EmailService] Resend SDK initialized with configured API key.');
        } catch (initErr) {
          console.error('❌ [EmailService] Failed to initialize Resend SDK:', initErr);
          this.resendClient = null;
        }
      } else {
        console.warn('⚠️ [EmailService] RESEND_API_KEY is not configured or is a placeholder. Operating in sandbox/mock delivery mode.');
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

  /**
   * Get sanitized API key without exposing secret
   */
  public static getApiKey(): string | null {
    const rawApiKey = process.env.RESEND_API_KEY;
    const apiKey = rawApiKey ? rawApiKey.replace(/^["']|["']$/g, '').trim() : '';
    return apiKey || null;
  }

  /**
   * Get configured sender email address
   */
  public static getFromEmail(): string {
    const rawFrom = process.env.RESEND_FROM_EMAIL;
    const from = rawFrom ? rawFrom.replace(/^["']|["']$/g, '').trim() : '';
    return from || 'onboarding@resend.dev';
  }

  public static getBaseUrl(): string {
    return process.env.APP_BASE_URL?.trim() || process.env.CLIENT_URL?.trim() || 'http://localhost:5001';
  }

  /**
   * Core email dispatch method using official Resend SDK with PostgreSQL NotificationLog auditing
   * - Validates recipient, sender, subject, and body
   * - Awaits and inspects SDK response data and errors
   * - Captures returned provider message ID
   * - Accurately records status: 'accepted' (queued for delivery) or 'failed' (never falsely marks 'delivered')
   * - Catches exceptions so calling database transactions are never broken
   */
  public static async sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
    const { to, subject, html, text, event } = options;
    const from = this.getFromEmail();
    const client = this.getResendClient();

    // 1. Validate & normalize recipient
    const normalizedTo = this.normalizeEmail(to);
    if (!normalizedTo) {
      const valError = !to || to.trim() === ''
        ? 'Recipient email address is required'
        : `Invalid recipient email format: '${to}'`;
      console.warn(`⚠️ [EmailService Validation Error] ${valError}`);

      try {
        await prisma.notificationLog.create({
          data: {
            channel: 'EMAIL',
            recipient: to || 'MISSING_RECIPIENT',
            event,
            title: subject || 'Untitled Notification',
            message: text ? text.slice(0, 2000) : 'No content',
            status: 'failed',
            error: valError,
          },
        });
      } catch (logErr) {
        console.warn('⚠️ [EmailService] Could not persist validation error log:', logErr);
      }

      return {
        success: false,
        status: 'failed',
        error: valError,
        isSandbox: !client,
      };
    }

    let status: 'queued' | 'accepted' | 'delivered' | 'bounced' | 'failed' = 'accepted';
    let errorMessage: string | null = null;
    let resendMessageId: string | undefined;

    // 2. Dispatch via Resend SDK if live client is present
    if (client) {
      try {
        const response = await client.emails.send({
          from,
          to: [normalizedTo],
          subject,
          html,
          text,
        });

        if (response.error) {
          status = 'failed';
          let sanitizedMsg = response.error.message || 'Resend API returned delivery error';

          // Detect account-level testing restrictions with onboarding@resend.dev
          if (
            sanitizedMsg.toLowerCase().includes('can only send testing emails') ||
            sanitizedMsg.toLowerCase().includes('verify a domain')
          ) {
            sanitizedMsg = `Resend account-level testing restriction: Sender '${from}' can only deliver to the verified Resend account owner. To send to other registered customers ('${normalizedTo}'), verify your custom domain at https://resend.com/domains and configure RESEND_FROM_EMAIL.`;
          }

          errorMessage = sanitizedMsg;
          console.warn(`⚠️ [Resend Delivery Rejected] To: ${normalizedTo} | Error: ${sanitizedMsg}`);
        } else if (response.data?.id) {
          resendMessageId = response.data.id;
          status = 'accepted';
          console.log(`📧 [Resend Accepted] To: ${normalizedTo} | Subject: "${subject}" | Resend ID: ${resendMessageId}`);
        } else {
          status = 'accepted';
        }
      } catch (err: any) {
        status = 'failed';
        errorMessage = err?.message || String(err);
        console.warn(`⚠️ [Resend SDK Exception] To: ${normalizedTo} | Error: ${errorMessage}`);
      }
    } else {
      // 3. Sandbox / Mock fallback mode
      status = 'accepted';
      resendMessageId = `mock_resend_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.log(`📧 [Email Sandbox Mode] To: ${normalizedTo} | From: ${from} | Subject: "${subject}" | Event: ${event}`);
    }

    // 4. Persist notification log record in PostgreSQL
    try {
      await prisma.notificationLog.create({
        data: {
          channel: 'EMAIL',
          recipient: normalizedTo,
          event,
          title: subject,
          message: text.slice(0, 2000),
          status,
          providerMessageId: resendMessageId,
          error: errorMessage,
        },
      });
    } catch (dbErr) {
      console.warn('⚠️ [EmailService] Could not persist notification log to database:', dbErr);
    }

    return {
      success: status === 'accepted',
      id: resendMessageId,
      status,
      error: errorMessage || undefined,
      isSandbox: !client,
    };
  }

  /**
   * Dispatch Customer Registration Welcome Email
   */
  public static async sendWelcomeEmail(props: WelcomeEmailProps): Promise<EmailDispatchResult> {
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
      return { success: false, status: 'failed', error: err.message };
    }
  }

  /**
   * Dispatch Booking Confirmation Email
   */
  public static async sendBookingConfirmationEmail(
    props: BookingConfirmationEmailProps
  ): Promise<EmailDispatchResult> {
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
      return { success: false, status: 'failed', error: err.message };
    }
  }

  /**
   * Dispatch Booking Cancellation Email
   */
  public static async sendCancellationEmail(
    props: CancellationEmailProps & { contactEmail: string }
  ): Promise<EmailDispatchResult> {
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
      return { success: false, status: 'failed', error: err.message };
    }
  }

  /**
   * Development & Administrator Email Diagnostic Test
   * Performs an end-to-end verification of Resend configuration and sender restrictions
   */
  public static async runDiagnosticTest(recipient: string): Promise<DiagnosticTestResult> {
    const from = this.getFromEmail();
    const isCustomDomain = !from.toLowerCase().includes('resend.dev');
    const client = this.getResendClient();
    const isConfigured = !!client;

    const testSubject = `CredoFly Email Delivery Diagnostic Test — ${new Date().toISOString()}`;
    const testText = `This is an automated diagnostic test from the CredoFly Airline Reservation Engine.\n\nTimestamp: ${new Date().toISOString()}\nSender: ${from}\nRecipient: ${recipient}\nEnvironment: ${process.env.NODE_ENV || 'development'}`;
    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
        <h2 style="color: #0f172a; margin-top: 0;">CredoFly Email Delivery Diagnostic Test</h2>
        <p style="font-size: 14px; color: #475569;">
          This test message confirms that your CredoFly email integration is active and communicating with the Resend API.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 12px; color: #334155;">
          <p style="margin: 4px 0;"><strong>Sender:</strong> ${from}</p>
          <p style="margin: 4px 0;"><strong>Recipient:</strong> ${recipient}</p>
          <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p style="margin: 4px 0;"><strong>Sender Mode:</strong> ${isCustomDomain ? 'Verified Custom Domain' : 'Testing Onboarding Domain (onboarding@resend.dev)'}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">CredoFly Aviation Pvt Ltd • Operations Diagnostic Console</p>
      </div>
    `;

    const dispatchResult = await this.sendEmail({
      to: recipient,
      subject: testSubject,
      text: testText,
      html: testHtml,
      event: 'DIAGNOSTIC_TEST',
    });

    const instructions: string[] = [];
    let restrictionNote: string | undefined;

    if (!isConfigured) {
      instructions.push('RESEND_API_KEY is not configured in backend environment. Set a valid Resend API key starting with "re_".');
    }

    if (!isCustomDomain) {
      restrictionNote = "Resend Sandbox Restriction: 'onboarding@resend.dev' only delivers emails to the verified Resend account owner's email address. To deliver notifications to all registered customer emails, verify your custom domain at https://resend.com/domains.";
      instructions.push('Add your domain in Resend dashboard: https://resend.com/domains');
      instructions.push('Add the required DNS records (DKIM, SPF, and DMARC) with your domain provider.');
      instructions.push('Update RESEND_FROM_EMAIL in .env to an address on your verified domain (e.g. tickets@yourdomain.com).');
    } else {
      instructions.push('Custom sending domain is active. Ensure DNS status is verified in the Resend console.');
    }
    const rawKey = this.getApiKey();
    const maskedApiKey = rawKey && rawKey.length > 6
      ? `${rawKey.slice(0, 4)}...${rawKey.slice(-4)}`
      : rawKey
      ? 'Configured (Short Key)'
      : 'Not configured';

    const warnings: string[] = [];
    if (!isCustomDomain) {
      warnings.push(
        "Resend Sandbox Restriction: 'onboarding@resend.dev' only delivers emails to the verified Resend account owner's email address. Deliveries to external customer domains will be rejected by Resend."
      );
    }
    if (!isConfigured) {
      warnings.push('RESEND_API_KEY is not configured. Email service is running in mock/sandbox mode.');
    }

    let recommendedAction: string | undefined;
    if (!isConfigured) {
      recommendedAction = "Add a valid RESEND_API_KEY starting with 're_' to your server environment.";
    } else if (!isCustomDomain) {
      recommendedAction = "Verify your custom domain at https://resend.com/domains with DKIM, SPF and DMARC, then set RESEND_FROM_EMAIL to your verified domain.";
    }

    return {
      success: dispatchResult.success,
      configured: isConfigured,
      maskedApiKey,
      fromEmail: from,
      sender: from,
      recipient,
      isConfigured,
      isCustomDomain,
      isSandboxSender: !isCustomDomain,
      resendAccepted: dispatchResult.success,
      status: dispatchResult.status,
      providerMessageId: dispatchResult.id,
      error: dispatchResult.error,
      restrictionNote,
      warnings,
      recommendedAction,
      instructions,
    };
  }
}
