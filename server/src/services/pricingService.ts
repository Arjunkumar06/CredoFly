import { prisma } from '../db.js';

export interface PricingAdjustment {
  baseMultiplier: number;
  surgePercentage: number;
  appliedRules: string[];
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
}
