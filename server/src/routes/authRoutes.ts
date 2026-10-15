import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { requireCustomerAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/google', AuthController.google);
router.post('/recover-customer-id', AuthController.recoverCustomerId);
router.post('/logout', AuthController.logout);
router.get('/me', requireCustomerAuth, AuthController.me);

export default router;
