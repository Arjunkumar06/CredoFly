import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { EmailService } from '../src/services/emailService.js';
import { generateWelcomeEmail, escapeHtml as escapeWelcomeHtml } from '../src/templates/welcome-email.js';
import { generateBookingConfirmationEmail, escapeHtml as escapeBookingHtml } from '../src/templates/booking-confirmation-email.js';
import { generateCancellationEmail, escapeHtml as escapeCancellationHtml } from '../src/templates/cancellation-email.js';
import { prisma } from '../src/db.js';
import request from 'supertest';
import app from '../src/app.js';

describe('CredoFly — Resend Email Integration & Notification System', () => {
  beforeAll(async () => {
    try {
      await prisma.$connect();
    } catch (e) {
      console.warn('Prisma not connected in test environment');
    }
  });

  describe('1. HTML Sanitization & Template Rendering', () => {
    it('should sanitize HTML inputs to prevent injection attacks', () => {
      const malicious = '<script>alert("hack")</script>&"\'';
      const escaped = escapeWelcomeHtml(malicious);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;');
      expect(escaped).toContain('&#039;');
    });

    it('should render Welcome Email with Customer ID, security notes, and plain-text fallback', () => {
      const { html, text, subject } = generateWelcomeEmail({
        name: 'Arjun Kumar',
        email: 'arjun@example.com',
        customerId: 'CF-CUST-849201',
        mobileNumber: '+91 9876543210',
        appBaseUrl: 'http://localhost:5001',
      });

      expect(subject).toBe('Welcome to CredoFly — Your Journey Begins Here');
      expect(html).toContain('CF-CUST-849201');
      expect(html).toContain('Arjun Kumar');
      expect(html).toContain('arjun@example.com');
      expect(html).toContain('+91 9876543210');
      expect(html).toContain('Book Your First Flight');
      expect(html).toContain('http://localhost:5001/flights');
      expect(html).toContain('Security Tip:');

      // Check text fallback
      expect(text).toContain('CF-CUST-849201');
      expect(text).toContain('Arjun Kumar');
      expect(text).toContain('http://localhost:5001/flights');
    });

    it('should render Booking Confirmation with dual-leg round-trip itineraries and seat numbers', () => {
      const { html, text, subject } = generateBookingConfirmationEmail({
        bookingReference: 'CF2026101601',
        pnr: 'CF99XTRA',
        customerName: 'Priya Sharma',
        contactEmail: 'priya@example.com',
        cabinClass: 'ECONOMY',
        paymentMethod: 'UPI / Google Pay',
        totalAmount: '6,450',
        outboundFlight: {
          flightCode: 'CF862',
          airlineName: 'CredoFly Express',
          origin: 'Bangalore (BLR)',
          destination: 'Goa (GOI)',
          travelDate: '2026-10-25',
          departureTime: '09:00',
          arrivalTime: '10:30',
          cabinClass: 'ECONOMY',
        },
        returnFlight: {
          flightCode: 'CF863',
          airlineName: 'CredoFly Express',
          origin: 'Goa (GOI)',
          destination: 'Bangalore (BLR)',
          travelDate: '2026-10-30',
          departureTime: '17:00',
          arrivalTime: '18:30',
          cabinClass: 'ECONOMY',
        },
        passengers: [
          { name: 'Priya Sharma', type: 'ADULT', seatNumber: '4A' },
          { name: 'Rohan Sharma', type: 'ADULT', seatNumber: '4B' },
        ],
        appBaseUrl: 'http://localhost:5001',
      });

      expect(subject).toContain('CF862');
      expect(subject).toContain('PNR: CF99XTRA');
      expect(html).toContain('CF2026101601');
      expect(html).toContain('CF99XTRA');
      expect(html).toContain('Bangalore (BLR)');
      expect(html).toContain('Goa (GOI)');
      expect(html).toContain('Outbound Journey');
      expect(html).toContain('Return Journey');
      expect(html).toContain('4A');
      expect(html).toContain('4B');
      expect(html).toContain('₹6,450');

      // Plain-text checks
      expect(text).toContain('CF99XTRA');
      expect(text).toContain('4A');
      expect(text).toContain('4B');
      expect(text).toContain('FLIGHT DETAILS (RETURN)');
    });

    it('should render Cancellation Email with refund breakdown, fees, and policy tier', () => {
      const { html, text, subject } = generateCancellationEmail({
        bookingReference: 'CF2026101699',
        pnr: 'CF77CANC',
        customerName: 'Kavita Roy',
        flightCode: 'CF501',
        origin: 'Mumbai (BOM)',
        destination: 'Delhi (DEL)',
        travelDate: '2026-11-05',
        totalPaid: '5,000',
        cancellationFee: '250',
        refundAmount: '4,750',
        refundPercentage: '95',
        tierLabel: '95% Refund (> 10 Days Before Departure)',
        isPartial: false,
        cancelledPassengers: [
          { name: 'Kavita Roy', seatNumber: '12F' },
        ],
        appBaseUrl: 'http://localhost:5001',
      });

      expect(subject).toContain('Refund ₹4,750');
      expect(html).toContain('CF2026101699');
      expect(html).toContain('CF77CANC');
      expect(html).toContain('12F');
      expect(html).toContain('₹4,750');
      expect(html).toContain('₹250');
      expect(html).toContain('95% Refund');
      expect(html).toContain('3 to 5 business days');

      expect(text).toContain('Net Refund Payable: ₹4,750');
      expect(text).toContain('Cancellation Fee: ₹250');
    });
  });

  describe('2. EmailService & NotificationLog PostgreSQL Auditing', () => {
    it('should operate safely in mock/sandbox mode when RESEND_API_KEY is not configured', async () => {
      const originalKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      EmailService.resetClient();

      const testEmail = `sandbox_${Date.now()}@example.com`;
      const result = await EmailService.sendWelcomeEmail({
        name: 'Sandbox User',
        email: testEmail,
        customerId: 'CF-CUST-999001',
      });

      expect(result.success).toBe(true);

      // Verify PostgreSQL notification log was persisted
      const log = await prisma.notificationLog.findFirst({
        where: {
          recipient: testEmail,
          event: 'REGISTRATION',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(log).toBeDefined();
      expect(log?.channel).toBe('EMAIL');
      expect(log?.status).toBe('SENT');
      expect(log?.title).toContain('Welcome to CredoFly');

      // Restore key
      if (originalKey !== undefined) {
        process.env.RESEND_API_KEY = originalKey;
      }
      EmailService.resetClient();
    });

    it('should catch errors gracefully without throwing uncaught exceptions', async () => {
      // Test sending to invalid structure or triggering catch block
      const result = await EmailService.sendEmail({
        to: 'invalid-email-test@example.com',
        subject: 'Fault Tolerance Test',
        html: '<p>Test</p>',
        text: 'Test',
        event: 'GENERAL',
      });

      // The service guarantees non-blocking execution (does not throw)
      expect(result).toHaveProperty('success');
    });
  });

  describe('3. Registration & Google Sign-In Welcome Email Delivery Behavior', () => {
    it('should send welcome email upon standard customer registration', async () => {
      const regUser = `resend_reg_${Date.now()}`;
      const regEmail = `${regUser}@example.com`;

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: regUser,
          email: regEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          name: 'Resend Registrant',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const customerId = res.body.customerId;

      // Verify NotificationLog table has recorded the welcome email
      const log = await prisma.notificationLog.findFirst({
        where: {
          recipient: regEmail,
          event: 'REGISTRATION',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(log).toBeDefined();
      expect(log?.recipient).toBe(regEmail);
      expect(log?.channel).toBe('EMAIL');
      expect(log?.message).toContain(customerId);
    });

    it('should send welcome email on FIRST Google sign-up, and NEVER on subsequent logins', async () => {
      const googleId = `google_sub_${Date.now()}`;
      const googleEmail = `google_user_${Date.now()}@example.com`;

      // 1. First-time sign-up via Google OAuth
      const firstRes = await request(app)
        .post('/api/auth/google')
        .send({
          googleId,
          email: googleEmail,
          name: 'First Time Google User',
        });

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.token).toBeDefined();

      // Count welcome emails sent to this recipient
      const firstCount = await prisma.notificationLog.count({
        where: {
          recipient: googleEmail,
          event: 'REGISTRATION',
        },
      });
      expect(firstCount).toBe(1);

      // 2. Second login via Google OAuth with the exact same googleId
      const secondRes = await request(app)
        .post('/api/auth/google')
        .send({
          googleId,
          email: googleEmail,
          name: 'First Time Google User',
        });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.token).toBeDefined();

      // Count must still be 1! No duplicate welcome email dispatched
      const secondCount = await prisma.notificationLog.count({
        where: {
          recipient: googleEmail,
          event: 'REGISTRATION',
        },
      });
      expect(secondCount).toBe(1);
    });
  });

  describe('4. Post-Commit Transaction Safety in Booking and Cancellation', () => {
    it('should complete booking confirmation email dispatch and verify PostgreSQL audit record', async () => {
      // Find an available flight instance
      const instance = await prisma.flightInstance.findFirst({
        where: { availableSeats: { gte: 2 } },
        include: { flight: true },
      });

      if (!instance) {
        console.warn('Skipping test: no flight instance available');
        return;
      }

      const confirmResult = await EmailService.sendBookingConfirmationEmail({
        bookingReference: 'CF-TX-SAFE',
        pnr: 'CFTX01',
        customerName: 'Test Traveler',
        contactEmail: 'tx_safe@example.com',
        cabinClass: 'ECONOMY',
        totalAmount: 3500,
        outboundFlight: {
          flightCode: instance.flight.flightCode,
          origin: instance.flight.origin,
          destination: instance.flight.destination,
          travelDate: instance.travelDate.toISOString().slice(0, 10),
          departureTime: instance.departureTime,
        },
        passengers: [{ name: 'Test Passenger', type: 'ADULT', seatNumber: '3A' }],
      });

      expect(confirmResult.success).toBe(true);

      const log = await prisma.notificationLog.findFirst({
        where: {
          recipient: 'tx_safe@example.com',
          event: 'BOOKING_CONFIRMATION',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(log).toBeDefined();
      expect(log?.title).toContain('CFTX01');
      expect(log?.message).toContain('3A');
    });

    it('should complete cancellation email dispatch and record refund breakdown in notification log', async () => {
      const cancelResult = await EmailService.sendCancellationEmail({
        bookingReference: 'CF-CANCEL-SAFE',
        pnr: 'CFCANC01',
        customerName: 'Aarav Mehta',
        contactEmail: 'aarav_cancel@example.com',
        flightCode: 'CF862',
        origin: 'Bangalore (BLR)',
        destination: 'Goa (GOI)',
        travelDate: '2026-10-30',
        totalPaid: 4500,
        cancellationFee: 450,
        refundAmount: 4050,
        tierLabel: '90% Refund Policy Tier',
        isPartial: false,
        cancelledPassengers: [{ name: 'Aarav Mehta', seatNumber: '5C' }],
      });

      expect(cancelResult.success).toBe(true);

      const log = await prisma.notificationLog.findFirst({
        where: {
          recipient: 'aarav_cancel@example.com',
          event: 'CANCELLATION',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(log).toBeDefined();
      expect(log?.title).toContain('CF-CANCEL-SAFE');
      expect(log?.message).toContain('4,050');
      expect(log?.message).toContain('5C');
    });
  });
});

