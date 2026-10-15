import { prisma } from '../db.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';

export class SeatService {
  /**
   * Retrieve or initialize the complete visual seat-map for a flight departure instance
   */
  static async getSeatMapForInstance(flightInstanceId: string) {
    const instance = await prisma.flightInstance.findUnique({
      where: { id: flightInstanceId },
      include: {
        flight: {
          include: {
            aircraftConfig: {
              include: {
                seats: {
                  orderBy: [{ rowNumber: 'asc' }, { seatNumber: 'asc' }],
                },
              },
            },
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundError('Flight departure instance not found');
    }

    // Check existing seats for this instance
    let seats = await prisma.flightSeat.findMany({
      where: { flightInstanceId },
      orderBy: [{ rowNumber: 'asc' }, { seatNumber: 'asc' }],
    });

    // If no seats exist for this instance, generate them from template
    if (seats.length === 0) {
      let config = instance.flight.aircraftConfig;

      // Fallback: if flight doesn't have an aircraft config, find default A320
      if (!config) {
        config = await prisma.aircraftConfiguration.findFirst({
          where: { code: 'A320-33' },
          include: {
            seats: {
              orderBy: [{ rowNumber: 'asc' }, { seatNumber: 'asc' }],
            },
          },
        });
      }

      if (config && config.seats.length > 0) {
        // Create FlightSeat records
        const flightSeatsData = config.seats.map((t) => ({
          flightInstanceId,
          seatNumber: t.seatNumber,
          rowNumber: t.rowNumber,
          seatPosition: t.seatPosition,
          cabinClass: t.cabinClass,
          features: t.features,
          price: t.basePrice,
          status: t.isBlocked ? 'BLOCKED' : 'AVAILABLE',
        }));

        await prisma.flightSeat.createMany({
          data: flightSeatsData,
          skipDuplicates: true,
        });

        // Some realistic occupied seats (e.g. 10-15 seats already taken) for realism
        const sampleOccupied = ['3A', '3B', '5C', '6D', '14A', '15F', '18C', '20D'];
        await prisma.flightSeat.updateMany({
          where: {
            flightInstanceId,
            seatNumber: { in: sampleOccupied },
          },
          data: { status: 'OCCUPIED' },
        });

        seats = await prisma.flightSeat.findMany({
          where: { flightInstanceId },
          orderBy: [{ rowNumber: 'asc' }, { seatNumber: 'asc' }],
        });
      }
    }

    const layout = instance.flight.aircraftConfig?.seatLayout || '3-3';
    const totalRows = instance.flight.aircraftConfig?.totalRows || 30;
    const aircraftName = instance.flight.aircraftConfig?.name || 'Airbus A320neo (3-3 Standard)';

    return {
      flightInstanceId,
      flightCode: instance.flight.flightCode,
      travelDate: instance.travelDate.toISOString().slice(0, 10),
      aircraft: {
        name: aircraftName,
        seatLayout: layout,
        totalRows,
        seatsPerRow: layout === '2-2' ? 4 : 6,
      },
      seats: seats.map((s) => ({
        id: s.id,
        seatNumber: s.seatNumber,
        rowNumber: s.rowNumber,
        seatPosition: s.seatPosition,
        cabinClass: s.cabinClass,
        features: s.features,
        price: s.price.toNumber(),
        status: s.status,
      })),
    };
  }

  /**
   * Concurrency-safe atomic seat reservation
   */
  static async reserveSeats(params: {
    flightInstanceId: string;
    bookingId: string;
    assignments: Array<{
      passengerId?: string;
      passengerIndex?: number;
      seatNumber: string;
    }>;
  }) {
    const { flightInstanceId, bookingId, assignments } = params;

    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { passengers: true },
      });

      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      let totalSeatCharges = 0;
      const seatNumbers = assignments.map((a) => a.seatNumber.toUpperCase().trim());

      // 1. Check uniqueness in request
      const uniqueSeatSet = new Set(seatNumbers);
      if (uniqueSeatSet.size !== seatNumbers.length) {
        throw new BadRequestError('Each passenger must have a distinct seat assigned.');
      }

      // 2. Concurrency-safe check and update: lock each requested seat
      for (let i = 0; i < assignments.length; i++) {
        const item = assignments[i];
        const sNum = item.seatNumber.toUpperCase().trim();

        // Atomic update where status = 'AVAILABLE'
        const updated = await tx.flightSeat.updateMany({
          where: {
            flightInstanceId,
            seatNumber: sNum,
            status: 'AVAILABLE',
          },
          data: {
            status: 'OCCUPIED',
            bookingId,
          },
        });

        if (updated.count === 0) {
          throw new BadRequestError(`Seat ${sNum} is already occupied or no longer available. Please select another seat.`);
        }

        // Fetch seat price
        const seat = await tx.flightSeat.findUnique({
          where: {
            flightInstanceId_seatNumber: {
              flightInstanceId,
              seatNumber: sNum,
            },
          },
        });

        const seatPrice = seat ? seat.price.toNumber() : 0;
        totalSeatCharges += seatPrice;

        // Assign to corresponding passenger
        const targetPassenger =
          item.passengerId
            ? booking.passengers.find((p) => p.id === item.passengerId)
            : booking.passengers[item.passengerIndex ?? i];

        if (targetPassenger) {
          await tx.passenger.update({
            where: { id: targetPassenger.id },
            data: {
              seatNumber: sNum,
              seatPrice: new Prisma.Decimal(seatPrice),
            },
          });

          await tx.flightSeat.update({
            where: {
              flightInstanceId_seatNumber: {
                flightInstanceId,
                seatNumber: sNum,
              },
            },
            data: { passengerId: targetPassenger.id },
          });
        }
      }

      // 3. Update booking totalAmount with seat charges
      const updatedTotal = booking.totalAmount.add(new Prisma.Decimal(totalSeatCharges));

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          seatCharges: new Prisma.Decimal(totalSeatCharges),
          totalAmount: updatedTotal,
          auditEvents: {
            create: {
              eventType: 'SEAT_SELECTION',
              details: `Seats assigned: ${seatNumbers.join(', ')}. Additional seat charges: ₹${totalSeatCharges.toFixed(2)}. Revised Total: ₹${updatedTotal.toFixed(2)}`,
            },
          },
        },
        include: {
          passengers: true,
          seats: true,
        },
      });

      return {
        booking: updatedBooking,
        seatsAssigned: seatNumbers,
        additionalCharges: totalSeatCharges,
      };
    });
  }
}
