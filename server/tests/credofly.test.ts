import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/db.js';
import bcrypt from 'bcryptjs';

describe('CredoFly API Test Suite', () => {
  let customerToken: string;
  let customer2Token: string;
  let flightInstanceId: string;
  let testFlightId: string;
  const adminAuthHeader = `Basic ${Buffer.from('admin:adminpassword123').toString('base64')}`;

  const testUsername = `user_${Date.now()}`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    // Ensure test database connection or seed prerequisite
    try {
      await prisma.$connect();
    } catch (e) {
      console.warn('Prisma not connected yet for integration tests.');
    }
  });

  describe('1. Customer Authentication', () => {
    it('should register a new customer', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUsername,
          email: `${testUsername}@example.com`,
          password: testPassword,
          confirmPassword: testPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe(testUsername);
      customerToken = res.body.token;
    });

    it('should reject duplicate username registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUsername,
          password: testPassword,
          confirmPassword: testPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid input (short password)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `valid_user_${Date.now()}`,
          password: '123',
          confirmPassword: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should login an existing customer', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsername,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should register a second customer for ownership testing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `cust2_${Date.now()}`,
          password: testPassword,
          confirmPassword: testPassword,
        });

      expect(res.status).toBe(201);
      customer2Token = res.body.token;
    });
  });

  describe('2. Administrator HTTP Basic Authentication', () => {
    it('should reject admin request without authorization header', async () => {
      const res = await request(app).get('/api/admin/verify');
      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toContain('Basic');
    });

    it('should reject admin request with invalid credentials', async () => {
      const invalidAuth = `Basic ${Buffer.from('admin:wrongpassword').toString('base64')}`;
      const res = await request(app)
        .get('/api/admin/verify')
        .set('Authorization', invalidAuth);

      expect(res.status).toBe(401);
    });

    it('should allow admin request with valid HTTP Basic Auth credentials', async () => {
      const res = await request(app)
        .get('/api/admin/verify')
        .set('Authorization', adminAuthHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fetch real database dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', adminAuthHeader);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(typeof res.body.stats.totalActiveFlights).toBe('number');
    });
  });

  describe('3. Flight Management & Search', () => {
    const flightCode = `CF${Math.floor(100 + Math.random() * 899)}`;

    it('should allow admin to create a flight with weekly schedule', async () => {
      const res = await request(app)
        .post('/api/admin/flights')
        .set('Authorization', adminAuthHeader)
        .send({
          flightCode,
          origin: 'Bangalore (BLR)',
          destination: 'Goa (GOI)',
          capacity: 10, // Small capacity to test concurrency & exhaustion
          isActive: true,
          schedules: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
            dayOfWeek: day,
            departureTime: '10:00',
            arrivalTime: '11:15',
            adultFare: 3000,
            childFare: 1800,
            isOperating: true,
          })),
        });

      expect(res.status).toBe(201);
      expect(res.body.flight.flightCode).toBe(flightCode);
      testFlightId = res.body.flight.id;
    });

    it('should search flights by route and date and return calculated fares', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const res = await request(app).get('/api/flights/search').query({
        origin: 'Bangalore (BLR)',
        destination: 'Goa (GOI)',
        travelDate: dateStr,
        adults: 2,
        children: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.flights.length).toBeGreaterThanOrEqual(1);

      const found = res.body.flights.find((f: any) => f.flightCode === flightCode);
      expect(found).toBeDefined();
      expect(found.adultFare).toBe(3000);
      expect(found.childFare).toBe(1800);
      // (2 * 3000) + (1 * 1800) = 7800
      expect(found.totalFare).toBe(7800);
      expect(found.availableSeats).toBe(10);
      flightInstanceId = found.id;
    });

    it('should return empty results when no flights match route', async () => {
      const res = await request(app).get('/api/flights/search').query({
        origin: 'UnknownCityA',
        destination: 'UnknownCityB',
        travelDate: '2026-12-01',
        adults: 1,
        children: 0,
      });

      expect(res.status).toBe(200);
      expect(res.body.flights).toEqual([]);
    });

    it('should reject search when origin equals destination', async () => {
      const res = await request(app).get('/api/flights/search').query({
        origin: 'Bangalore (BLR)',
        destination: 'Bangalore (BLR)',
        travelDate: '2026-12-01',
        adults: 1,
        children: 0,
      });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Booking Creation & Overbooking Prevention', () => {
    let bookingId: string;

    it('should create a confirmed booking with accurate fare calculation', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 2,
          childCount: 1,
          passengers: [
            { name: 'Alice Smith', type: 'ADULT' },
            { name: 'Bob Smith', type: 'ADULT' },
            { name: 'Charlie Smith', type: 'CHILD' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.bookingReference).toMatch(/^CF\d+/);
      expect(Number(res.body.booking.totalAmount)).toBe(7800);
      expect(res.body.booking.status).toBe('CONFIRMED');
      expect(res.body.booking.passengers.length).toBe(3);
      bookingId = res.body.booking.id;
    });

    it('should reject booking if requested capacity exceeds available seats', async () => {
      // Capacity was 10, 3 seats booked -> 7 available. Requesting 8 seats should be rejected!
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 8,
          childCount: 0,
          passengers: Array.from({ length: 8 }, (_, i) => ({
            name: `Exceed Passenger ${i + 1}`,
            type: 'ADULT',
          })),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient seats');
    });

    it('should prevent overbooking during concurrent booking requests', async () => {
      // Currently 7 seats left. Send 3 concurrent requests trying to book 4 seats each (total 12 seats requested).
      // At most 1 request can succeed (7 - 4 = 3 seats left), others must be rejected!
      const concurrentRequests = [1, 2, 3].map((i) =>
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            flightInstanceId,
            adultCount: 4,
            childCount: 0,
            passengers: [
              { name: `Concurrent ${i} P1`, type: 'ADULT' },
              { name: `Concurrent ${i} P2`, type: 'ADULT' },
              { name: `Concurrent ${i} P3`, type: 'ADULT' },
              { name: `Concurrent ${i} P4`, type: 'ADULT' },
            ],
          })
      );

      const results = await Promise.all(concurrentRequests);
      const successful = results.filter((r) => r.status === 201);
      const failed = results.filter((r) => r.status === 400);

      // Exactly 1 must succeed because 4 <= 7, but 4 + 4 = 8 > 7
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(2);

      // Check remaining seats in database: 7 - 4 = 3 seats left
      const instance = await prisma.flightInstance.findUnique({
        where: { id: flightInstanceId },
      });
      expect(instance?.availableSeats).toBe(3);
    });

    it('enforces customer booking ownership (another customer cannot view or cancel)', async () => {
      const res = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
    });

    it('allows owner to view their own booking', async () => {
      const res = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.booking.id).toBe(bookingId);
    });
  });

  describe('5. Partial & Full Cancellation with Inventory Restoration', () => {
    let cancelBookingId: string;

    it('should setup a booking for cancellation tests', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 2,
          childCount: 1,
          passengers: [
            { name: 'Parent 1', type: 'ADULT' },
            { name: 'Parent 2', type: 'ADULT' },
            { name: 'Kid 1', type: 'CHILD' },
          ],
        });

      expect(res.status).toBe(201);
      cancelBookingId = res.body.booking.id;

      // Check inventory after booking 3 seats: 3 - 3 = 0 seats left
      const instance = await prisma.flightInstance.findUnique({
        where: { id: flightInstanceId },
      });
      expect(instance?.availableSeats).toBe(0);
    });

    it('should perform partial cancellation and restore released seats', async () => {
      // Cancel 1 adult and 1 child -> 2 seats released
      const res = await request(app)
        .post(`/api/bookings/${cancelBookingId}/partial-cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          cancelAdults: 1,
          cancelChildren: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.seatsReleased).toBe(2);
      expect(res.body.refundAmount).toBe(3000 + 1800); // 4800
      expect(res.body.booking.adultCount).toBe(1);
      expect(res.body.booking.childCount).toBe(0);
      expect(Number(res.body.booking.totalAmount)).toBe(3000);

      // Verify that 2 seats were restored to the flight instance!
      const instance = await prisma.flightInstance.findUnique({
        where: { id: flightInstanceId },
      });
      expect(instance?.availableSeats).toBe(2);
    });

    it('should reject partial cancellation of more passengers than booked', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancelBookingId}/partial-cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          cancelAdults: 5,
          cancelChildren: 0,
        });

      expect(res.status).toBe(400);
    });

    it('should cancel the entire remaining booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancelBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe('CANCELLED');
      expect(res.body.booking.adultCount).toBe(0);

      // 1 remaining seat released: 2 + 1 = 3 seats
      const instance = await prisma.flightInstance.findUnique({
        where: { id: flightInstanceId },
      });
      expect(instance?.availableSeats).toBe(3);
    });

    it('should prevent repeated cancellation of already cancelled booking (idempotency)', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancelBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already been cancelled');

      // Available seats must NOT increase again!
      const instance = await prisma.flightInstance.findUnique({
        where: { id: flightInstanceId },
      });
      expect(instance?.availableSeats).toBe(3);
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
