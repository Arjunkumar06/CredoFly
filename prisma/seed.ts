import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CredoFly database...');

  // 1. Create Demo Customer User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const demoUser = await prisma.user.upsert({
    where: { username: 'john_doe' },
    update: {
      customerId: 'CF-CUST-100001',
      name: 'John Doe',
      mobileNumber: '+91 9876543210',
      isEmailVerified: true,
      isMobileVerified: true,
    },
    create: {
      customerId: 'CF-CUST-100001',
      name: 'John Doe',
      username: 'john_doe',
      email: 'john@example.com',
      mobileNumber: '+91 9876543210',
      isEmailVerified: true,
      isMobileVerified: true,
      passwordHash,
    },
  });
  console.log(`👤 Customer created: ${demoUser.username} (${demoUser.customerId})`);

  // Also create a second customer
  const user2 = await prisma.user.upsert({
    where: { username: 'priya_sharma' },
    update: {
      customerId: 'CF-CUST-100002',
      name: 'Priya Sharma',
      mobileNumber: '+91 9812345678',
      isEmailVerified: true,
      isMobileVerified: true,
    },
    create: {
      customerId: 'CF-CUST-100002',
      name: 'Priya Sharma',
      username: 'priya_sharma',
      email: 'priya@example.com',
      mobileNumber: '+91 9812345678',
      isEmailVerified: true,
      isMobileVerified: true,
      passwordHash,
    },
  });

  // 2. Aircraft Configuration & Seat Map Template (Airbus A320neo 3-3)
  const a320Config = await prisma.aircraftConfiguration.upsert({
    where: { code: 'A320-33' },
    update: {},
    create: {
      name: 'Airbus A320neo (3-3 Standard)',
      code: 'A320-33',
      seatLayout: '3-3',
      totalRows: 30,
      seatsPerRow: 6,
    },
  });
  console.log(`✈️ Aircraft configuration ready: ${a320Config.name}`);

  // Create seat templates if not yet seeded
  const seatTemplateCount = await prisma.seatTemplate.count({
    where: { aircraftConfigId: a320Config.id },
  });

  if (seatTemplateCount === 0) {
    const seatTemplatesToCreate = [];
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (let r = 1; r <= 30; r++) {
      for (const col of cols) {
        const seatNumber = `${r}${col}`;
        let cabinClass = 'ECONOMY';
        let position = col === 'A' || col === 'F' ? 'WINDOW' : col === 'C' || col === 'D' ? 'AISLE' : 'MIDDLE';
        let features = 'STANDARD';
        let basePrice = new Prisma.Decimal('0.00');

        if (r <= 4) {
          // Rows 1-4: Business Class
          cabinClass = 'BUSINESS';
          features = 'PREFERRED';
          basePrice = new Prisma.Decimal('1500.00');
        } else if (r === 12) {
          // Row 12: Exit Row / Extra Legroom
          features = 'EXIT_ROW,EXTRA_LEGROOM';
          basePrice = new Prisma.Decimal('750.00');
        } else if (r === 13) {
          // Row 13: Extra Legroom
          features = 'EXTRA_LEGROOM';
          basePrice = new Prisma.Decimal('500.00');
        } else {
          // Standard Economy: Preferred window/aisle
          if (position === 'WINDOW') {
            features = 'PREFERRED,WINDOW';
            basePrice = new Prisma.Decimal('250.00');
          } else if (position === 'AISLE') {
            features = 'PREFERRED,AISLE';
            basePrice = new Prisma.Decimal('200.00');
          } else {
            features = 'STANDARD,MIDDLE';
            basePrice = new Prisma.Decimal('0.00');
          }
        }

        seatTemplatesToCreate.push({
          aircraftConfigId: a320Config.id,
          seatNumber,
          rowNumber: r,
          seatPosition: position,
          cabinClass,
          features,
          basePrice,
          isBlocked: false,
        });
      }
    }

    await prisma.seatTemplate.createMany({
      data: seatTemplatesToCreate,
      skipDuplicates: true,
    });
    console.log(`💺 Created ${seatTemplatesToCreate.length} seat templates for A320`);
  }

  // 3. Payment Configuration for Google Pay / UPI QR
  const paymentConfig = await prisma.paymentConfig.upsert({
    where: { id: 'default-gpay-config' },
    update: {},
    create: {
      id: 'default-gpay-config',
      merchantName: 'CredoFly Aviation Pvt Ltd',
      upiId: 'credofly@oksbi',
      qrImageUrl: '/images/gpay-sample-qr.png',
      instructions: 'Scan the CredoFly Google Pay / UPI QR code with any UPI app, complete the transaction, and enter your 12-digit UPI UTR reference number below.',
      requireManualVerification: true,
    },
  });
  console.log(`💳 Payment configuration ready: ${paymentConfig.merchantName} (${paymentConfig.upiId})`);

  // 4. Default Holidays for Dynamic Calendar & Pricing
  const defaultHolidays = [
    { name: "New Year's Day", date: new Date('2026-01-01'), surgePercentage: new Prisma.Decimal('15.00') },
    { name: 'Republic Day', date: new Date('2026-01-26'), surgePercentage: new Prisma.Decimal('20.00') },
    { name: 'Holi Festival', date: new Date('2026-03-04'), surgePercentage: new Prisma.Decimal('15.00') },
    { name: 'Independence Day', date: new Date('2026-08-15'), surgePercentage: new Prisma.Decimal('25.00') },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), surgePercentage: new Prisma.Decimal('10.00') },
    { name: 'Diwali Festival', date: new Date('2026-11-08'), surgePercentage: new Prisma.Decimal('30.00') },
    { name: 'Christmas Day', date: new Date('2026-12-25'), surgePercentage: new Prisma.Decimal('25.00') },
  ];

  for (const h of defaultHolidays) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      update: { name: h.name, surgePercentage: h.surgePercentage },
      create: { name: h.name, date: h.date, surgePercentage: h.surgePercentage, affectsPricing: true },
    });
  }
  console.log(`🎉 Seeded ${defaultHolidays.length} official holidays`);

  // 5. Pricing Rules for Peak Seasons and Weekends
  const pricingRule = await prisma.pricingRule.upsert({
    where: { id: 'weekend-surge-rule' },
    update: {},
    create: {
      id: 'weekend-surge-rule',
      name: 'Weekend Getaway Surge',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      applicableDays: '[0, 5, 6]', // Friday, Saturday, Sunday
      adjustmentType: 'PERCENTAGE',
      adjustmentValue: new Prisma.Decimal('10.00'), // +10% on weekends
      priority: 1,
      isActive: true,
    },
  });
  console.log(`📈 Pricing rule ready: ${pricingRule.name} (+10%)`);

  // 6. Sample Flights
  const flightsData = [
    {
      flightCode: 'CF101',
      origin: 'Bangalore (BLR)',
      destination: 'Delhi (DEL)',
      capacity: 180,
      isActive: true,
      departureTime: '08:00',
      arrivalTime: '10:50',
      adultFare: new Prisma.Decimal('5200.00'),
      childFare: new Prisma.Decimal('3200.00'),
    },
    {
      flightCode: 'CF203',
      origin: 'Bangalore (BLR)',
      destination: 'Delhi (DEL)',
      capacity: 180,
      isActive: true,
      departureTime: '11:30',
      arrivalTime: '14:20',
      adultFare: new Prisma.Decimal('4800.00'),
      childFare: new Prisma.Decimal('2900.00'),
    },
    {
      flightCode: 'CF305',
      origin: 'Bangalore (BLR)',
      destination: 'Delhi (DEL)',
      capacity: 180,
      isActive: true,
      departureTime: '16:15',
      arrivalTime: '19:05',
      adultFare: new Prisma.Decimal('5500.00'),
      childFare: new Prisma.Decimal('3400.00'),
    },
    {
      flightCode: 'CF102',
      origin: 'Delhi (DEL)',
      destination: 'Bangalore (BLR)',
      capacity: 180,
      isActive: true,
      departureTime: '09:00',
      arrivalTime: '11:45',
      adultFare: new Prisma.Decimal('5100.00'),
      childFare: new Prisma.Decimal('3100.00'),
    },
    {
      flightCode: 'CF401',
      origin: 'Mumbai (BOM)',
      destination: 'Delhi (DEL)',
      capacity: 160,
      isActive: true,
      departureTime: '07:30',
      arrivalTime: '09:40',
      adultFare: new Prisma.Decimal('4500.00'),
      childFare: new Prisma.Decimal('2800.00'),
    },
    {
      flightCode: 'CF502',
      origin: 'Bangalore (BLR)',
      destination: 'Mumbai (BOM)',
      capacity: 150,
      isActive: true,
      departureTime: '14:00',
      arrivalTime: '15:40',
      adultFare: new Prisma.Decimal('3800.00'),
      childFare: new Prisma.Decimal('2400.00'),
    },
    {
      flightCode: 'CF601',
      origin: 'Bangalore (BLR)',
      destination: 'Chennai (MAA)',
      capacity: 120,
      isActive: true,
      departureTime: '18:00',
      arrivalTime: '19:00',
      adultFare: new Prisma.Decimal('2700.00'),
      childFare: new Prisma.Decimal('1700.00'),
    },
  ];

  for (const f of flightsData) {
    const flight = await prisma.flight.upsert({
      where: { flightCode: f.flightCode },
      update: {
        origin: f.origin,
        destination: f.destination,
        capacity: f.capacity,
        isActive: f.isActive,
        aircraftConfigId: a320Config.id,
      },
      create: {
        flightCode: f.flightCode,
        origin: f.origin,
        destination: f.destination,
        capacity: f.capacity,
        isActive: f.isActive,
        aircraftConfigId: a320Config.id,
      },
    });

    // Create weekly schedule Mon-Sun (0 = Sun, 1 = Mon, ..., 6 = Sat)
    for (let day = 0; day <= 6; day++) {
      await prisma.flightSchedule.upsert({
        where: {
          flightId_dayOfWeek: {
            flightId: flight.id,
            dayOfWeek: day,
          },
        },
        update: {
          departureTime: f.departureTime,
          arrivalTime: f.arrivalTime,
          adultFare: f.adultFare,
          childFare: f.childFare,
          isOperating: true,
        },
        create: {
          flightId: flight.id,
          dayOfWeek: day,
          departureTime: f.departureTime,
          arrivalTime: f.arrivalTime,
          adultFare: f.adultFare,
          childFare: f.childFare,
          isOperating: true,
        },
      });
    }

    // Generate FlightInstances for the next 30 days
    const today = new Date();
    for (let offset = -2; offset <= 30; offset++) {
      const travelDate = new Date(today);
      travelDate.setDate(today.getDate() + offset);
      travelDate.setHours(0, 0, 0, 0);

      // Available seats default to capacity or slightly less for realism
      const initialSeats = f.flightCode === 'CF101' && offset === 1 ? 5 : f.capacity - (offset % 10);

      await prisma.flightInstance.upsert({
        where: {
          flightId_travelDate_departureTime: {
            flightId: flight.id,
            travelDate,
            departureTime: f.departureTime,
          },
        },
        update: {},
        create: {
          flightId: flight.id,
          travelDate,
          departureTime: f.departureTime,
          arrivalTime: f.arrivalTime,
          adultFare: f.adultFare,
          childFare: f.childFare,
          availableSeats: initialSeats,
        },
      });
    }
  }

  console.log('✈️ Flights, schedules, and instances seeded');

  // 3. Create Sample Bookings for demoUser
  const sampleInstance = await prisma.flightInstance.findFirst({
    where: {
      flight: { flightCode: 'CF101' },
    },
    include: { flight: true },
  });

  if (sampleInstance) {
    // Confirmed booking matching reference mockup
    const confirmedBooking = await prisma.booking.upsert({
      where: { bookingReference: 'CF2025042801' },
      update: {},
      create: {
        bookingReference: 'CF2025042801',
        userId: demoUser.id,
        flightInstanceId: sampleInstance.id,
        adultCount: 2,
        childCount: 1,
        adultFareSnapshot: sampleInstance.adultFare,
        childFareSnapshot: sampleInstance.childFare,
        totalAmount: new Prisma.Decimal('13600.00'), // (2 * 5200) + (1 * 3200)
        status: 'CONFIRMED',
        passengers: {
          create: [
            { name: 'John Doe', type: 'ADULT' },
            { name: 'Jane Doe', type: 'ADULT' },
            { name: 'Child Doe', type: 'CHILD' },
          ],
        },
        auditEvents: {
          create: [
            {
              eventType: 'CREATED',
              details: 'Booking created with 2 Adults, 1 Child. Total: ₹13,600',
            },
          ],
        },
      },
    });

    console.log(`🎟️ Confirmed booking seeded: ${confirmedBooking.bookingReference}`);

    // Cancelled booking
    await prisma.booking.upsert({
      where: { bookingReference: 'CF2025041507' },
      update: {},
      create: {
        bookingReference: 'CF2025041507',
        userId: demoUser.id,
        flightInstanceId: sampleInstance.id,
        adultCount: 0,
        childCount: 0,
        adultFareSnapshot: sampleInstance.adultFare,
        childFareSnapshot: sampleInstance.childFare,
        totalAmount: new Prisma.Decimal('5400.00'),
        status: 'CANCELLED',
        cancelledAt: new Date(),
        passengers: {
          create: [
            { name: 'John Doe', type: 'ADULT', isCancelled: true },
            { name: 'Jane Doe', type: 'ADULT', isCancelled: true },
          ],
        },
        auditEvents: {
          create: [
            {
              eventType: 'FULL_CANCELLATION',
              details: 'Entire booking was cancelled. 2 seats released.',
            },
          ],
        },
      },
    });
  }

  console.log('✅ CredoFly database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
