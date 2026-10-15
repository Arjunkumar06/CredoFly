import { Router } from 'express';
import { FlightController } from '../controllers/flightController.js';

const router = Router();

router.get('/search', FlightController.search);
router.get('/cities', FlightController.getCities);
router.get('/instance/:id', FlightController.getInstanceById);
router.get('/:id', FlightController.getFlightById);

export default router;
