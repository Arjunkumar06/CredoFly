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

    // If no seats exist for this instance, generate them
    if (seats.length === 0) {
      let config = instance.flight.aircraftConfig;

      // Fallback: if flight doesn't have an aircraft config, find or create default A320-33
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

      if (!config) {
        config = await prisma.aircraftConfiguration.create({
          data: {
            name: 'Airbus A320neo (3-3 Standard)',
            code: 'A320-33',
            seatLayout: '3-3',
            totalRows: 30,
            seatsPerRow: 6,
          },
          include: { seats: true },
        });
      }

      // If configuration has no seat templates, generate all 180 seats (Rows 1-30, Columns A-F)
      if (!config.seats || config.seats.length === 0) {
        const templates = [];
        const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
        for (let r = 1; r <= 30; r++) {
          for (const col of cols) {
            const seatNumber = `${r}${col}`;
            let cabinClass = 'ECONOMY';
            const position = col === 'A' || col === 'F' ? 'WINDOW' : col === 'C' || col === 'D' ? 'AISLE' : 'MIDDLE';
            let features = 'STANDARD';
            let basePrice = 0;

            if (r <= 4) {
              cabinClass = 'BUSINESS';
              features = 'PREFERRED';
              basePrice = 1500;
            } else if (r === 12) {
              features = 'EXIT_ROW,EXTRA_LEGROOM';
              basePrice = 750;
            } else if (r === 13) {
              features = 'EXTRA_LEGROOM';
              basePrice = 500;
            } else {
              if (position === 'WINDOW') {
                features = 'PREFERRED,WINDOW';
                basePrice = 250;
              } else if (position === 'AISLE') {
                features = 'PREFERRED,AISLE';
                basePrice = 200;
              } else {
                features = 'STANDARD,MIDDLE';
                basePrice = 0;
              }
            }

            templates.push({
              aircraftConfigId: config.id,
              seatNumber,
              rowNumber: r,
              seatPosition: position,
              cabinClass,
              features,
              basePrice: new Prisma.Decimal(basePrice),
              isBlocked: false,
            });
          }
        }

        await prisma.seatTemplate.createMany({
          data: templates,
          skipDuplicates: true,
        });

        config = (await prisma.aircraftConfiguration.findUnique({
          where: { id: config.id },
          include: {
            seats: {
              orderBy: [{ rowNumber: 'asc' }, { seatNumber: 'asc' }],
            },
          },
        }))!;
      }

      // Create FlightSeat records from templates
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

      // Populate realistic sample occupied seats
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

    const layout = instance.flight.aircraftConfig?.seatLayout || '3-3';
    const totalRows = instance.flight.aircraftConfig?.totalRows || 30;
    const aircraftName = instance.flight.aircraftConfig?.name || 'Airbus A320neo (3-3 Standard)';
    const aircraftCode = instance.flight.aircraftConfig?.code || 'A320-33';

    const mappedSeats = seats.map((s) => {
      const col = s.seatNumber.replace(/^[0-9]+/, '');
      const isExit = s.features.includes('EXIT_ROW') || s.rowNumber === 12 || s.rowNumber === 13;
      const tier =
        s.cabinClass === 'BUSINESS'
          ? 'BUSINESS'
          : isExit
          ? 'EXIT_ROW'
          : s.features.includes('EXTRA_LEGROOM')
          ? 'EXTRA_LEGROOM'
          : s.features.includes('PREFERRED')
          ? 'PREFERRED'
          : 'STANDARD';

      return {
        id: s.id,
        seatNumber: s.seatNumber,
        rowNumber: s.rowNumber,
        columnLetter: col,
        seatPosition: s.seatPosition,
        seatType: s.seatPosition as 'WINDOW' | 'AISLE' | 'MIDDLE',
        cabinClass: s.cabinClass,
        tier: tier as 'BUSINESS' | 'EXIT_ROW' | 'EXTRA_LEGROOM' | 'PREFERRED' | 'STANDARD',
        features: s.features,
        price: s.price.toNumber(),
        status: s.status,
        isExitRow: isExit,
        isOccupied: s.status === 'OCCUPIED',
        isBlocked: s.status === 'BLOCKED',
        bookedByPassenger: s.passengerId ?? null,
      };
    });

    return {
      flightInstanceId,
      flightCode: instance.flight.flightCode,
      travelDate: instance.travelDate.toISOString().slice(0, 10),
      aircraft: {
        name: aircraftName,
        code: aircraftCode,
        seatLayout: layout,
        totalRows,
        seatsPerRow: layout === '2-2' ? 4 : 6,
      },
      seats: mappedSeats,
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
