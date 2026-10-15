import { Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService.js';
import { AuthRequest } from '../middleware/auth.js';
import { paymentSubmissionSchema } from '../validators/index.js';
import { UnauthorizedError } from '../utils/errors.js';

export class PaymentController {
  static async getConfig(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const config = await PaymentService.getPaymentConfig();
      return res.status(200).json({
        success: true,
        config,
      });
    } catch (error) {
      next(error);
    }
  }

  static async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const validated = paymentSubmissionSchema.parse(req.body);

      const result = await PaymentService.submitPayment({
        bookingId: validated.bookingId,
        method: validated.method,
        utr: validated.utr || undefined,
        proofUrl: validated.proofUrl || undefined,
        userId: req.user.userId,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}
