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

// Payments & Google Pay QR review
router.get('/payments', AdminController.getPayments);
router.post('/payments/:id/verify', AdminController.verifyPayment);
router.get('/payment-config', AdminController.getPaymentConfig);
router.put('/payment-config', AdminController.updatePaymentConfig);

// 12-Month schedule generation & calendar inspection
router.post('/generate-schedules', AdminController.generateSchedules);
router.post('/schedules/generate', AdminController.generateSchedules);
router.get('/schedule/instances', AdminController.getScheduleInstances);
router.patch('/schedule/instances/:id', AdminController.updateSingleFlightInstance);

// Holidays calendar (with /pricing/holidays alias for frontend client)
router.get('/holidays', AdminController.getHolidays);
router.post('/holidays', AdminController.createHoliday);
router.delete('/holidays/:id', AdminController.deleteHoliday);
router.get('/pricing/holidays', AdminController.getHolidays);
router.post('/pricing/holidays', AdminController.createHoliday);
router.delete('/pricing/holidays/:id', AdminController.deleteHoliday);

// Pricing rules (with /pricing/rules alias for frontend client)
router.get('/pricing-rules', AdminController.getPricingRules);
router.post('/pricing-rules', AdminController.createPricingRule);
router.patch('/pricing-rules/:id', AdminController.updatePricingRule);
router.delete('/pricing-rules/:id', AdminController.deletePricingRule);
router.get('/pricing/rules', AdminController.getPricingRules);
router.post('/pricing/rules', AdminController.createPricingRule);
router.patch('/pricing/rules/:id', AdminController.updatePricingRule);
router.delete('/pricing/rules/:id', AdminController.deletePricingRule);

// Aircraft configs & Audit logs
router.get('/aircraft-configs', AdminController.getAircraftConfigs);
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
