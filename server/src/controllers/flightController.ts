import { Request, Response, NextFunction } from 'express';
import { FlightService } from '../services/flightService.js';
import { searchFlightsSchema } from '../validators/index.js';

export class FlightController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = searchFlightsSchema.parse({
        origin: req.query.origin,
        destination: req.query.destination,
        travelDate: req.query.travelDate,
        adults: req.query.adults ? Number(req.query.adults) : 1,
        children: req.query.children ? Number(req.query.children) : 0,
      });

      const flights = await FlightService.searchFlights(validated);

      return res.status(200).json({
        success: true,
        count: flights.length,
        flights,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCities(req: Request, res: Response, next: NextFunction) {
    try {
      const cities = await FlightService.getCitiesAndRoutes();
      return res.status(200).json({
        success: true,
        ...cities,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getInstanceById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adults = req.query.adults ? Number(req.query.adults) : 1;
      const children = req.query.children ? Number(req.query.children) : 0;
      const flight = await FlightService.getFlightInstanceById(id, adults, children);
      return res.status(200).json({
        success: true,
        flight,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFlightById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const flight = await FlightService.getFlightById(id);
      return res.status(200).json({
        success: true,
        flight,
      });
    } catch (error) {
      next(error);
    }
  }
}
