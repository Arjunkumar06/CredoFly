import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CredoFly database...');

  // 1. Create Demo Customer User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const demoUser = await prisma.user.upsert({
    where: { username: 'john_doe' },
    update: {},
    create: {
      username: 'john_doe',
      email: 'john@example.com',
      passwordHash,
    },
  });
  console.log(`👤 Customer created: ${demoUser.username}`);

  // Also create a second customer
  const user2 = await prisma.user.upsert({
    where: { username: 'priya_sharma' },
    update: {},
    create: {
      username: 'priya_sharma',
      email: 'priya@example.com',
      passwordHash,
    },
  });

  // 2. Sample Flights
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
      },
      create: {
        flightCode: f.flightCode,
        origin: f.origin,
        destination: f.destination,
        capacity: f.capacity,
        isActive: f.isActive,
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
