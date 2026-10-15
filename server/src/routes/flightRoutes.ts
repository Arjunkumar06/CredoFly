import { Router } from 'express';
import { FlightController } from '../controllers/flightController.js';
import { requireAdminBasicAuth } from '../middleware/auth.js';

const router = Router();

router.get('/search', FlightController.search);
router.get('/cities', FlightController.getCities);
router.get('/calendar', FlightController.getCalendar);
router.get('/instance/:id', FlightController.getInstanceById);
router.get('/instance/:id/seats', FlightController.getSeats);
router.post('/generate-schedule', requireAdminBasicAuth, FlightController.generateSchedule);
router.get('/:id', FlightController.getFlightById);

export default router;
