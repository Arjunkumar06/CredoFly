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

  describe('0. System & Health Endpoints', () => {
    it('should return 200 OK on root GET / endpoint with API status', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.message).toBe('Flight booking API is running');
      expect(res.body.endpoints).toBeDefined();
    });

    it('should return 200 OK on /api/health endpoint', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
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
      // (2 * 3000) + (1 * 1800) base fare = 7800 + (3 * 350 taxes & fees) = 8850 (or 9630 with 10% dynamic surge)
      expect([8850, 9630]).toContain(Number(res.body.booking.totalAmount));
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
      expect([4800, 5280]).toContain(res.body.refundAmount);
      expect(res.body.booking.adultCount).toBe(1);
      expect(res.body.booking.childCount).toBe(0);
      expect([3000, 3300]).toContain(Number(res.body.booking.totalAmount));

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

  describe('6. MakeMyTrip-Style Multi-Step Flight Booking Workflow API', () => {
    it('should fetch flight instance by ID with policy and route details', async () => {
      const res = await request(app).get(`/api/flights/instance/${flightInstanceId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.flight).toBeDefined();
      expect(res.body.flight.flightCode).toBeDefined();
      expect(typeof res.body.flight.availableSeats).toBe('number');
      expect(res.body.flight.policies).toBeDefined();
      expect(res.body.flight.policies.cancellation).toBeDefined();
    });

    it('should return 404 for non-existent flight instance', async () => {
      const res = await request(app).get('/api/flights/instance/non-existent-instance-id');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should preview booking fare and baggage with cabin multipliers without locking seats', async () => {
      const res = await request(app)
        .post('/api/bookings/preview')
        .send({
          flightInstanceId,
          adultCount: 1,
          childCount: 1,
          cabinClass: 'BUSINESS',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preview.cabinClass).toBe('BUSINESS');
      // Adult base = 3000 * 1.8 = 5400 (plus 10% surge on weekends = 5940)
      expect([5400, 5940]).toContain(res.body.preview.breakdown.baseAdultFare);
      expect([3240, 3564]).toContain(res.body.preview.breakdown.baseChildFare);
      expect(res.body.preview.breakdown.taxesAndFees).toBe(700);
      expect([9340, 10204]).toContain(res.body.preview.breakdown.grandTotal);
      expect(res.body.preview.baggage.cabin).toBe('12 Kg');
      expect(res.body.preview.baggage.checkIn).toBe('30 Kg');
    });

    it('should reject fare preview if passenger count exceeds available seats', async () => {
      const res = await request(app)
        .post('/api/bookings/preview')
        .send({
          flightInstanceId,
          adultCount: 999,
          childCount: 0,
          cabinClass: 'ECONOMY',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('remaining');
    });

    it('should create booking storing PNR, contact details, payment method, and passenger demographics', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 1,
          childCount: 0,
          cabinClass: 'BUSINESS',
          contactEmail: 'traveler@example.com',
          contactPhone: '+91 9876543210',
          paymentMethod: 'UPI',
          passengers: [
            {
              name: 'Dr. Evelyn Carter',
              type: 'ADULT',
              gender: 'FEMALE',
              age: 34,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.pnr).toBeDefined();
      expect(res.body.booking.pnr.length).toBeGreaterThanOrEqual(6);
      expect(res.body.booking.cabinClass).toBe('BUSINESS');
      expect(res.body.booking.contactEmail).toBe('traveler@example.com');
      expect(res.body.booking.contactPhone).toBe('+91 9876543210');
      expect(res.body.booking.paymentMethod).toBe('UPI');
      expect(res.body.booking.passengers[0].gender).toBe('FEMALE');
      expect(res.body.booking.passengers[0].age).toBe(34);
    });
  });

  describe('7. Advanced Authentication: Customer ID, Multi-Factor Login, Google OAuth, & Recovery', () => {
    let advCustomerId: string;
    let advUserToken: string;
    const advUsername = `adv_${Date.now()}`;
    const advEmail = `${advUsername}@example.com`;
    const advMobile = `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    const advPassword = 'Password123!';

    it('should register a customer with unique auto-generated Customer ID and mobile number', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Connor',
          username: advUsername,
          email: advEmail,
          mobileNumber: advMobile,
          password: advPassword,
          confirmPassword: advPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.customerId).toBeDefined();
      expect(res.body.customerId).toMatch(/^CF-CUST-\d{6}$/);
      expect(res.body.user.mobileNumber).toBe(advMobile);
      advCustomerId = res.body.customerId;
      advUserToken = res.body.token;
    });

    it('should login using unique Customer ID and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: advCustomerId,
          password: advPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.customerId).toBe(advCustomerId);
      expect(res.body.token).toBeDefined();
    });

    it('should login using registered email and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: advEmail,
          password: advPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(advEmail);
    });

    it('should login using registered mobile number and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: advMobile,
          password: advPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.mobileNumber).toBe(advMobile);
    });

    it('should return generic failure message for invalid password to prevent enumeration', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: advCustomerId,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid login credentials');
    });

    it('should sign in or create customer via Google OAuth without granting admin privileges', async () => {
      const googleSub = `goog_${Date.now()}`;
      const googleEmail = `google_${Date.now()}@example.com`;

      const res = await request(app)
        .post('/api/auth/google')
        .send({
          googleId: googleSub,
          email: googleEmail,
          name: 'Google Traveler',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.customerId).toBeDefined();
      expect(res.body.user.email).toBe(googleEmail);
      expect(res.body.token).toBeDefined();

      // Ensure customer accounts never receive admin privileges
      const adminRes = await request(app)
        .get('/api/admin/verify')
        .set('Authorization', `Bearer ${res.body.token}`);
      expect(adminRes.status).toBe(401);
    });

    it('should securely link Google account to existing user by verified email', async () => {
      const googleSub = `goog_link_${Date.now()}`;
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          googleId: googleSub,
          email: advEmail, // Matches existing customer Sarah Connor
          name: 'Sarah Connor',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.customerId).toBe(advCustomerId);
      expect(res.body.user.email).toBe(advEmail);
    });

    it('should recover Customer ID via registered email or mobile number', async () => {
      const res = await request(app)
        .post('/api/auth/recover-customer-id')
        .send({
          email: advEmail,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.customerId).toBe(advCustomerId);
    });
  });

  describe('8. Visual Seat Map & Concurrency-Safe Seat Reservation', () => {
    let seatBookingId: string;

    beforeAll(async () => {
      // Replenish seats on flightInstanceId for seat reservation, payments, and cancellation suites
      await prisma.flightInstance.update({
        where: { id: flightInstanceId },
        data: { availableSeats: 50 },
      });
    });

    it('should render aircraft seat map with cabin layout, rows, and seat features', async () => {
      const res = await request(app).get(`/api/flights/instance/${flightInstanceId}/seats`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.aircraft).toBeDefined();
      expect(res.body.aircraft.seatLayout).toBe('3-3');
      expect(res.body.seats.length).toBeGreaterThanOrEqual(100);

      // Verify seat attributes: window, aisle, middle, price
      const seat1A = res.body.seats.find((s: any) => s.seatNumber === '1A');
      expect(seat1A).toBeDefined();
      expect(seat1A.seatPosition).toBe('WINDOW');
      expect(seat1A.cabinClass).toBe('BUSINESS');
      expect(seat1A.price).toBeGreaterThan(0);
    });

    it('should reserve seats atomically and calculate seat surcharges', async () => {
      // 1. Create a 2-passenger booking
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 2,
          childCount: 0,
          passengers: [
            { name: 'Seat User 1', type: 'ADULT' },
            { name: 'Seat User 2', type: 'ADULT' },
          ],
        });

      expect(bookRes.status).toBe(201);
      seatBookingId = bookRes.body.booking.id;

      // 2. Reserve seats 1A and 1B
      const res = await request(app)
        .post(`/api/bookings/${seatBookingId}/reserve-seats`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          assignments: [
            { passengerIndex: 0, seatNumber: '1A' },
            { passengerIndex: 1, seatNumber: '1B' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.seatsAssigned).toEqual(['1A', '1B']);
      expect(res.body.additionalCharges).toBeGreaterThan(0);
      expect(Number(res.body.booking.seatCharges)).toBe(res.body.additionalCharges);
    });

    it('should prevent concurrent users from booking an already occupied seat', async () => {
      // Create second booking
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 1,
          childCount: 0,
          passengers: [{ name: 'Conflict User', type: 'ADULT' }],
        });

      const secondBookingId = bookRes.body.booking.id;

      // Try to reserve already booked seat '1A'
      const res = await request(app)
        .post(`/api/bookings/${secondBookingId}/reserve-seats`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          assignments: [{ passengerIndex: 0, seatNumber: '1A' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already occupied');
    });
  });

  describe('9. 12-Month Schedule Generator, Low-Fare Calendar, & Holidays', () => {
    it('should generate dated flight instances for the next 12 months idempotently', async () => {
      const res = await request(app)
        .post('/api/admin/generate-schedules')
        .set('Authorization', adminAuthHeader)
        .send({ months: 12 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.monthsCovered).toBe(12);
      expect(res.body.totalInstancesCheckedOrCreated).toBeGreaterThan(50);

      // Idempotency: rerunning generator does not error or cause duplicate key conflicts
      const rerunRes = await request(app)
        .post('/api/admin/generate-schedules')
        .set('Authorization', adminAuthHeader)
        .send({ months: 12 });

      expect(rerunRes.status).toBe(200);
      expect(rerunRes.body.success).toBe(true);
    });

    it('should fetch low-fare calendar across available departure dates', async () => {
      const res = await request(app)
        .get('/api/flights/calendar')
        .query({
          origin: 'Bangalore (BLR)',
          destination: 'Delhi (DEL)',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.calendar)).toBe(true);
      if (res.body.calendar.length > 0) {
        expect(res.body.calendar[0].lowestFare).toBeGreaterThan(0);
        expect(res.body.calendar[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should allow admin to configure holidays affecting schedule and pricing', async () => {
      const res = await request(app)
        .post('/api/admin/holidays')
        .set('Authorization', adminAuthHeader)
        .send({
          name: 'Special Aviation Day',
          date: '2026-11-20',
          affectsSchedule: false,
          affectsPricing: true,
          surgePercentage: 25,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.holiday.name).toBe('Special Aviation Day');
      expect(Number(res.body.holiday.surgePercentage)).toBe(25);
    });
  });

  describe('10. Google Pay QR Workflow & Admin Manual Payment Verification', () => {
    let gpayBookingId: string;
    let paymentId: string;
    const testUtr = `UTR${Date.now()}`;

    it('should fetch active Google Pay / UPI QR configuration', async () => {
      const res = await request(app).get('/api/payment/config');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.config.merchantName).toBeDefined();
      expect(res.body.config.upiId).toBeDefined();
    });

    it('should create booking in PENDING_VERIFICATION status when paying via GPAY_QR', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 1,
          childCount: 0,
          paymentMethod: 'GPAY_QR',
          passengers: [{ name: 'QR Payer', type: 'ADULT' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.booking.paymentStatus).toBe('PENDING_VERIFICATION');
      expect(res.body.booking.paymentMethod).toBe('GPAY_QR');
      gpayBookingId = res.body.booking.id;
    });

    it('should submit Google Pay transaction UTR for verification', async () => {
      const res = await request(app)
        .post('/api/payment/submit')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          bookingId: gpayBookingId,
          method: 'GPAY_QR',
          utr: testUtr,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.payment).toBeDefined();
      expect(res.body.payment.utr).toBe(testUtr);
      paymentId = res.body.payment.id;
    });

    it('should list submitted payment in admin payment review queue', async () => {
      const res = await request(app)
        .get('/api/admin/payments')
        .set('Authorization', adminAuthHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.payments.find((p: any) => p.id === paymentId);
      expect(found).toBeDefined();
      expect(found.utr).toBe(testUtr);
    });

    it('should allow admin to verify payment and transition booking to CONFIRMED', async () => {
      const res = await request(app)
        .post(`/api/admin/payments/${paymentId}/verify`)
        .set('Authorization', adminAuthHeader)
        .send({ status: 'VERIFIED' });

      expect(res.status).toBe(200);
      expect(res.body.payment.status).toBe('VERIFIED');

      // Verify booking payment status updated to CONFIRMED
      const bookingCheck = await request(app)
        .get(`/api/bookings/${gpayBookingId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(bookingCheck.status).toBe(200);
      expect(bookingCheck.body.booking.paymentStatus).toBe('CONFIRMED');
    });

    it('should reject submission of duplicate verified UTR on another booking', async () => {
      // Create another booking
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 1,
          childCount: 0,
          passengers: [{ name: 'Duplicate Check User', type: 'ADULT' }],
        });

      const secondId = bookRes.body.booking.id;

      // Attempt to submit identical UTR
      const res = await request(app)
        .post('/api/payment/submit')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          bookingId: secondId,
          method: 'GPAY_QR',
          utr: testUtr,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already been verified');
    });
  });

  describe('11. Exact Refund Tiers, Cancellation Quotes, & Post-Flight Feedback', () => {
    let cancelBookingId: string;

    it('should create booking and provide pre-cancellation quote with exact refund tier and fees', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 1,
          childCount: 0,
          passengers: [{ name: 'Refund Quote Traveler', type: 'ADULT' }],
        });

      expect(res.status).toBe(201);
      cancelBookingId = res.body.booking.id;

      // Get cancellation quote
      const quoteRes = await request(app)
        .get(`/api/bookings/${cancelBookingId}/cancellation-quote`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(quoteRes.status).toBe(200);
      expect(quoteRes.body.success).toBe(true);
      expect(quoteRes.body.quote.estimatedRefund).toBeDefined();
      expect(quoteRes.body.quote.cancellationFee).toBeDefined();
      expect(quoteRes.body.quote.refundPercentage).toBeGreaterThanOrEqual(0);
      expect(quoteRes.body.quote.tier).toBeDefined();
    });

    it('should cancel booking under tier policy and record cancellation history', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancelBookingId}/cancel-with-refund`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.status).toBe('CANCELLED');
      expect(res.body.cancellation).toBeDefined();
      expect(res.body.cancellation.refundTier).toBeDefined();
    });

    it('should prevent repeated cancellation on already cancelled booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancelBookingId}/cancel-with-refund`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already been cancelled');
    });

    it('should allow customer to submit post-flight feedback and ratings', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancelBookingId}/feedback`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          punctualityRating: 5,
          serviceRating: 5,
          cleanlinessRating: 4,
          comment: 'Outstanding flight experience with CredoFly!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.feedback.rating).toBe(5);
      expect(res.body.feedback.comment).toContain('CredoFly');
    });

    it('should reject duplicate feedback submission for the same booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancelBookingId}/feedback`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 4,
          comment: 'Second feedback attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already been submitted');
    });
  });

  describe('12. Seat Limit Enforcement, Direct Booking Concurrency, Authoritative Pricing & Dual-Leg Round-Trip Cancellation', () => {
    it('should reject booking when passenger count exceeds maximum limit of 8', async () => {
      const ninePax = Array.from({ length: 9 }, (_, i) => ({
        name: `Passenger ${i + 1}`,
        type: 'ADULT' as const,
      }));

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 9,
          childCount: 0,
          passengers: ninePax,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('maximum limit of 8 seats');
    });

    it('should reject duplicate seat selections on the same booking', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 2,
          childCount: 0,
          passengers: [
            { name: 'Traveler One', type: 'ADULT', seatNumber: '3A' },
            { name: 'Traveler Two', type: 'ADULT', seatNumber: '3A' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Duplicate seats selected');
    });

    it('should reject booking creation when a selected seat is already occupied (concurrency check)', async () => {
      // Find an available seat
      const availSeat = await prisma.flightSeat.findFirst({
        where: { flightInstanceId, status: 'AVAILABLE' },
      });
      expect(availSeat).toBeDefined();
      const testSeatNum = availSeat!.seatNumber;

      // First booking reserves this seat
      const res1 = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 1,
          childCount: 0,
          passengers: [{ name: 'First Booker', type: 'ADULT', seatNumber: testSeatNum }],
        });
      expect(res1.status).toBe(201);

      // Second concurrent booking tries to book the same seat
      const res2 = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 1,
          childCount: 0,
          passengers: [{ name: 'Second Booker', type: 'ADULT', seatNumber: testSeatNum }],
        });
      expect(res2.status).toBe(409);
      expect(res2.body.error).toContain('no longer available');
    });

    it('should match preview fare and createBooking grand total to the exact rupee', async () => {
      const previewRes = await request(app)
        .post('/api/bookings/preview')
        .send({
          flightInstanceId,
          adultCount: 2,
          childCount: 1,
          cabinClass: 'ECONOMY',
        });
      expect(previewRes.status).toBe(200);

      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          flightInstanceId,
          adultCount: 2,
          childCount: 1,
          cabinClass: 'ECONOMY',
          passengers: [
            { name: 'Adult 1', type: 'ADULT' },
            { name: 'Adult 2', type: 'ADULT' },
            { name: 'Child 1', type: 'CHILD' },
          ],
        });
      expect(bookRes.status).toBe(201);
      expect(Number(bookRes.body.booking.totalAmount)).toBe(previewRes.body.preview.breakdown.grandTotal);
    });

    it('should cancel both outbound and return legs in round-trip cancellation', async () => {
      const returnInstance = await prisma.flightInstance.findFirst({
        where: {
          id: { not: flightInstanceId },
          availableSeats: { gte: 5 },
        },
      });

      if (returnInstance) {
        const outSeat = await prisma.flightSeat.findFirst({
          where: { flightInstanceId, status: 'AVAILABLE' },
        });
        const retSeat = await prisma.flightSeat.findFirst({
          where: { flightInstanceId: returnInstance.id, status: 'AVAILABLE' },
        });

        const initialOutboundSeats = (await prisma.flightInstance.findUnique({ where: { id: flightInstanceId } }))?.availableSeats || 0;
        const initialReturnSeats = returnInstance.availableSeats;

        const res = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            flightInstanceId,
            returnFlightInstanceId: returnInstance.id,
            adultCount: 1,
            childCount: 0,
            passengers: [{ name: 'Roundtrip Flyer', type: 'ADULT', seatNumber: outSeat?.seatNumber }],
            returnPassengers: [{ name: 'Roundtrip Flyer', type: 'ADULT', seatNumber: retSeat?.seatNumber }],
          });

        expect(res.status).toBe(201);
        const outboundBookingId = res.body.booking.id;
        const returnBookingId = res.body.booking.returnBooking?.id;
        expect(returnBookingId).toBeDefined();

        // Cancel outbound booking -> must cancel return booking as well!
        const cancelRes = await request(app)
          .post(`/api/bookings/${outboundBookingId}/cancel`)
          .set('Authorization', `Bearer ${customerToken}`);

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.booking.status).toBe('CANCELLED');

        // Verify return booking was also cancelled!
        const retBookingInDb = await prisma.booking.findUnique({
          where: { id: returnBookingId },
        });
        expect(retBookingInDb?.status).toBe('CANCELLED');

        // Verify seats on both legs were restored
        const updatedOutboundInstance = await prisma.flightInstance.findUnique({ where: { id: flightInstanceId } });
        const updatedReturnInstance = await prisma.flightInstance.findUnique({ where: { id: returnInstance.id } });
        expect(updatedOutboundInstance?.availableSeats).toBe(initialOutboundSeats);
        expect(updatedReturnInstance?.availableSeats).toBe(initialReturnSeats);
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
