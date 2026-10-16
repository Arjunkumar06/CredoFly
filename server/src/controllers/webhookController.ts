import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

export class WebhookController {
  /**
   * Resend Webhook handler for email delivery, bounce, and complaint events.
   * Updates NotificationLog status based on providerMessageId.
   */
  static async handleResendWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid webhook payload structure' });
      }

      const { type, data } = payload;
      const providerMessageId = data?.email_id || data?.id;

      if (!providerMessageId) {
        return res.status(200).json({ received: true, note: 'No email message ID provided in payload' });
      }

      // Map Resend webhook events to our NotificationLog status
      let mappedStatus: string | null = null;
      if (type === 'email.delivered') {
        mappedStatus = 'delivered';
      } else if (type === 'email.bounced') {
        mappedStatus = 'bounced';
      } else if (type === 'email.complained') {
        mappedStatus = 'complained';
      } else if (type === 'email.delivery_delayed') {
        mappedStatus = 'delayed';
      } else if (type === 'email.sent') {
        mappedStatus = 'accepted';
      }

      if (mappedStatus) {
        await prisma.notificationLog.updateMany({
          where: { providerMessageId },
          data: {
            status: mappedStatus,
          },
        });
      }

      return res.status(200).json({
        success: true,
        received: true,
        eventType: type,
        providerMessageId,
        statusUpdated: mappedStatus,
      });
    } catch (error) {
      next(error);
    }
  }
}
