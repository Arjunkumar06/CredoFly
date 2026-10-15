import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { requireCustomerAuth } from '../middleware/auth.js';

const router = Router();

router.get('/config', PaymentController.getConfig);
router.post('/submit', requireCustomerAuth, PaymentController.submit);

export default router;
