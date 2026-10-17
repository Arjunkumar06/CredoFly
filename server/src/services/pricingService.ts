import { prisma } from '../db.js';
import { TAX_PER_PASSENGER_PER_LEG } from '../utils/constants.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export interface PricingAdjustment {
  baseMultiplier: number;
  surgePercentage: number;
  appliedRules: string[];
}

export interface ItineraryFareResult {
  flightInstanceId: string;
  flightCode: string;
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  adultCount: number;
  childCount: number;
  cabinClass: string;
  multiplier: number;
  baseAdultFare: number;
  baseChildFare: number;
  adultSubtotal: number;
  childSubtotal: number;
  baseTotal: number;
  taxesAndFees: number;
  seatCharges: number;
  grandTotal: number;
  appliedRules: string[];
  selectedSeatDetails: Array<{ seatNumber: string; price: number; type?: string }>;
}

export class PricingService {
  /**
   * Calculate dynamic pricing adjustments based on date, day of week, holidays, and active pricing rules
   */
  static async calculateDynamicMultiplier(params: {
    travelDate: Date | string;
    route?: string;
    cabinClass?: string;
  }): Promise<PricingAdjustment> {
    const { travelDate, route, cabinClass } = params;
    const dateObj = typeof travelDate === 'string' ? new Date(travelDate) : travelDate;
    const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const dayOfWeek = dateOnly.getDay();

    let totalSurgePct = 0;
    const appliedRules: string[] = [];

    // 1. Check official holidays
    try {
      const holiday = await prisma.holiday.findFirst({
        where: {
          date: dateOnly,
          affectsPricing: true,
        },
      });

      if (holiday) {
        const surge = holiday.surgePercentage.toNumber();
        totalSurgePct += surge;
        appliedRules.push(`Holiday: ${holiday.name} (+${surge}%)`);
      }
    } catch {
      // Ignore if table not yet queried
    }

    // 2. Check active pricing rules (e.g., Weekend surge, seasonal peak)
    try {
      const rules = await prisma.pricingRule.findMany({
        where: {
          isActive: true,
          startDate: { lte: dateOnly },
          endDate: { gte: dateOnly },
        },
        orderBy: { priority: 'desc' },
      });

      for (const rule of rules) {
        // Check days of week
        let matchesDay = true;
        try {
          const days: number[] = JSON.parse(rule.applicableDays);
          if (Array.isArray(days) && days.length > 0) {
            matchesDay = days.includes(dayOfWeek);
          }
        } catch {
          matchesDay = true;
        }

        if (!matchesDay) continue;

        // Check route filter
        if (rule.route && route && !route.toLowerCase().includes(rule.route.toLowerCase())) {
          continue;
        }

        // Check cabin filter
        if (rule.cabinClass && cabinClass && rule.cabinClass !== cabinClass) {
          continue;
        }

        if (rule.adjustmentType === 'PERCENTAGE') {
          const pct = rule.adjustmentValue.toNumber();
          totalSurgePct += pct;
          appliedRules.push(`${rule.name} (+${pct}%)`);
        }
      }
    } catch {
      // Ignore if table not yet queried
    }

    // Cabin class baseline multipliers
    let baseMultiplier = 1.0;
    if (cabinClass === 'PREMIUM_ECONOMY') baseMultiplier = 1.25;
    if (cabinClass === 'BUSINESS') baseMultiplier = 1.8;
    if (cabinClass === 'FIRST_CLASS') baseMultiplier = 2.5;

    // Apply combined surge multiplier
    const finalMultiplier = baseMultiplier * (1 + totalSurgePct / 100);

    return {
      baseMultiplier: Number(finalMultiplier.toFixed(3)),
      surgePercentage: totalSurgePct,
      appliedRules,
    };
  }

  /**
   * Single authoritative itinerary fare calculator for preview, booking creation, and confirmation.
   * Ensures identical base fare, passenger subtotals, cabin multiplier, seat fees, and taxes.
   */
  static async calculateItineraryFare(params: {
    flightInstanceId: string;
    adultCount: number;
    childCount: number;
    cabinClass?: string;
    selectedSeats?: string[];
    db?: any;
  }): Promise<ItineraryFareResult> {
    const dbClient = params.db || prisma;
    const { flightInstanceId, adultCount, childCount, cabinClass = 'ECONOMY', selectedSeats = [] } = params;
    const totalPassengers = adultCount + childCount;

    const instance = await dbClient.flightInstance.findUnique({
      where: { id: flightInstanceId },
      include: {
        flight: {
          include: { aircraftConfig: true },
        },
      },
    });

    if (!instance) {
      throw new NotFoundError('Flight departure not found');
    }

    if (!instance.flight.isActive || instance.status === 'CANCELLED' || instance.status === 'INACTIVE') {
      throw new BadRequestError('This flight is currently inactive or cancelled and cannot be booked.');
    }

    const pricing = await PricingService.calculateDynamicMultiplier({
      travelDate: instance.travelDate,
      route: `${instance.flight.origin}-${instance.flight.destination}`,
      cabinClass,
    });

    const baseAdultFare = Math.round(instance.adultFare.toNumber() * pricing.baseMultiplier);
    const baseChildFare = Math.round(instance.childFare.toNumber() * pricing.baseMultiplier);
    const adultSubtotal = baseAdultFare * adultCount;
    const childSubtotal = baseChildFare * childCount;
    const baseTotal = adultSubtotal + childSubtotal;

    const taxesAndFees = TAX_PER_PASSENGER_PER_LEG * totalPassengers;

    let seatCharges = 0;
    const selectedSeatDetails: Array<{ seatNumber: string; price: number; type?: string }> = [];

    if (selectedSeats && selectedSeats.length > 0) {
      const seats = await dbClient.flightSeat.findMany({
        where: {
          flightInstanceId,
          seatNumber: { in: selectedSeats.map((s) => s.toUpperCase().trim()) },
        },
      });

      for (const s of seats) {
        const price = s.price.toNumber();
        seatCharges += price;
        selectedSeatDetails.push({
          seatNumber: s.seatNumber,
          price,
          type: s.features,
        });
      }
    }

    const grandTotal = baseTotal + taxesAndFees + seatCharges;

    return {
      flightInstanceId,
      flightCode: instance.flight.flightCode,
      origin: instance.flight.origin,
      destination: instance.flight.destination,
      travelDate: instance.travelDate.toISOString().slice(0, 10),
      departureTime: instance.departureTime,
      arrivalTime: instance.arrivalTime,
      availableSeats: instance.availableSeats,
      adultCount,
      childCount,
      cabinClass,
      multiplier: pricing.baseMultiplier,
      baseAdultFare,
      baseChildFare,
      adultSubtotal,
      childSubtotal,
      baseTotal,
      taxesAndFees,
      seatCharges,
      grandTotal,
      appliedRules: pricing.appliedRules,
      selectedSeatDetails,
    };
  }
}
