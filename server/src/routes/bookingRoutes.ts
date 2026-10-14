import { Router } from 'express';
import { BookingController } from '../controllers/bookingController.js';
import { requireCustomerAuth } from '../middleware/auth.js';

const router = Router();

// All customer booking endpoints require customer authentication
router.use(requireCustomerAuth);

router.post('/', BookingController.create);
router.get('/me', BookingController.getMyBookings);
router.get('/:id', BookingController.getById);
router.post('/:id/cancel', BookingController.cancel);
router.post('/:id/partial-cancel', BookingController.partialCancel);

export default router;
