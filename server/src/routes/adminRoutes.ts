import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { requireAdminBasicAuth } from '../middleware/auth.js';

const router = Router();

// Protect every administrator endpoint with HTTP Basic Authentication
router.use(requireAdminBasicAuth);

router.get('/verify', AdminController.verifyAuth);
router.get('/dashboard', AdminController.getDashboard);
router.get('/flights', AdminController.getFlights);
router.post('/flights', AdminController.createFlight);
router.patch('/flights/:id', AdminController.updateFlight);
router.get('/bookings', AdminController.getBookings);
router.get('/bookings/:id', AdminController.getBookingDetails);
router.post('/bookings/:id/cancel', AdminController.cancelBooking);

export default router;
