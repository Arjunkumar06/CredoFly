export interface CancelledPassengerInfo {
  name: string;
  seatNumber?: string | null;
}

export interface CancellationEmailProps {
  bookingReference: string;
  pnr?: string | null;
  customerName?: string;
  flightCode: string;
  origin: string;
  destination: string;
  travelDate: string;
  isPartial?: boolean;
  cancelledPassengers?: CancelledPassengerInfo[];
  totalPaid: string | number;
  cancellationFee: string | number;
  refundAmount: string | number;
  refundPercentage?: string | number;
  tierLabel?: string;
  appBaseUrl?: string;
}

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateCancellationEmail(props: CancellationEmailProps): {
  html: string;
  text: string;
  subject: string;
} {
  const ref = escapeHtml(props.bookingReference);
  const pnr = escapeHtml(props.pnr || props.bookingReference);
  const name = escapeHtml(props.customerName || 'Valued Customer');
  const baseUrl = (props.appBaseUrl || 'http://localhost:5001').replace(/\/$/, '');
  const isPartial = !!props.isPartial;

  const totalPaidFormatted = typeof props.totalPaid === 'number'
    ? props.totalPaid.toLocaleString('en-IN')
    : props.totalPaid;
  const refundAmountFormatted = typeof props.refundAmount === 'number'
    ? props.refundAmount.toLocaleString('en-IN')
    : props.refundAmount;
  const feeFormatted = typeof props.cancellationFee === 'number'
    ? props.cancellationFee.toLocaleString('en-IN')
    : props.cancellationFee;

  const subject = `Booking Cancellation Notice: Ref ${props.bookingReference} - Refund ₹${refundAmountFormatted}`;

  const renderPassengersList = () => {
    if (!props.cancelledPassengers || props.cancelledPassengers.length === 0) {
      return '';
    }
    return `
      <div style="margin: 20px 0;">
        <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 8px;">Cancelled Passenger(s)</div>
        <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
          ${props.cancelledPassengers.map((p, i) => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0f172a;">${i + 1}. ${escapeHtml(p.name)}</td>
              <td style="padding: 10px 14px; font-size: 13px; color: #ef4444; font-weight: 700; text-align: right;">Seat ${escapeHtml(p.seatNumber || 'N/A')} Released</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .cancel-badge { display: inline-block; background-color: #ef4444; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em; }
    .content { padding: 28px; }
    .flight-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }
    .refund-card { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
    .refund-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #047857; margin-bottom: 4px; }
    .refund-val { font-size: 28px; font-weight: 800; color: #065f46; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .breakdown-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .breakdown-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .breakdown-table tr:last-child td { border-bottom: none; font-weight: 700; }
    .timeline-notice { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #1e40af; line-height: 1.5; margin: 20px 0; }
    .cta-container { text-align: center; margin: 28px 0 16px; }
    .cta-button { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; }
    .footer { background-color: #f8fafc; padding: 20px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="cancel-badge">${isPartial ? 'Partial Cancellation' : 'Booking Cancelled'}</div>
      <h1 class="title">Cancellation Confirmed</h1>
      <p style="margin: 0; font-size: 14px; color: #cbd5e1;">Booking Ref: ${ref}</p>
    </div>

    <div class="content">
      <p style="font-size: 15px; margin-top: 0; color: #334155;">
        Hello <strong>${name}</strong>, as requested, your ${isPartial ? 'selected passenger ticket(s) have' : 'flight booking has'} been successfully cancelled.
      </p>

      <div class="flight-box">
        <div style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Flight &amp; Schedule Details</div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 4px;">
          ${escapeHtml(props.flightCode)} • ${escapeHtml(props.origin)} → ${escapeHtml(props.destination)}
        </div>
        <div style="font-size: 13px; color: #475569; margin-top: 2px;">
          Departure Date: <strong>${escapeHtml(props.travelDate)}</strong> | PNR: <strong>${pnr}</strong>
        </div>
      </div>

      ${renderPassengersList()}

      <div class="refund-card">
        <div class="refund-label">Net Refund Payable</div>
        <div class="refund-val">₹${refundAmountFormatted}</div>
        ${props.refundPercentage !== undefined ? `<div style="font-size: 12px; color: #047857; margin-top: 4px;">Policy Tier: ${escapeHtml(props.tierLabel || `${props.refundPercentage}% Refund Tier`)}</div>` : ''}
      </div>

      <table class="breakdown-table">
        <tr>
          <td style="color: #64748b;">Original Amount Paid:</td>
          <td style="text-align: right; color: #0f172a;">₹${totalPaidFormatted}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Cancellation Fee / Retained Charges:</td>
          <td style="text-align: right; color: #ef4444;">- ₹${feeFormatted}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="color: #0f172a; font-weight: 700;">Total Refund Credit:</td>
          <td style="text-align: right; color: #16a34a; font-size: 15px;">₹${refundAmountFormatted}</td>
        </tr>
      </table>

      <div class="timeline-notice">
        <strong>Refund Processing Timeline:</strong><br />
        The refund of <strong>₹${refundAmountFormatted}</strong> has been initiated and will reflect in your original payment method (Bank Account / UPI / Card) within <strong>3 to 5 business days</strong>.
      </div>

      <div class="cta-container">
        <a href="${baseUrl}/flights" class="cta-button" target="_blank">Search &amp; Book New Flights</a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px;">CredoFly Express • Customer Support: <a href="mailto:support@credofly.com" style="color: #2563eb; text-decoration: none;">support@credofly.com</a></p>
      <p style="margin: 0;">© ${new Date().getFullYear()} CredoFly Aviation Pvt Ltd. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const passengersText = props.cancelledPassengers && props.cancelledPassengers.length > 0
    ? props.cancelledPassengers.map((p, i) => `  ${i + 1}. ${p.name} (Seat ${p.seatNumber || 'N/A'})`).join('\n')
    : 'All passengers';

  const text = `
========================================
CREDOFLY BOOKING CANCELLATION
========================================
Status: ${isPartial ? 'PARTIALLY CANCELLED' : 'CANCELLED'}
Booking Reference: ${props.bookingReference}
PNR: ${props.pnr || props.bookingReference}
Flight: ${props.flightCode} (${props.origin} -> ${props.destination})
Date: ${props.travelDate}

CANCELLED PASSENGERS:
----------------------------------------
${passengersText}

REFUND BREAKDOWN:
----------------------------------------
Original Paid: ₹${totalPaidFormatted}
Cancellation Fee: ₹${feeFormatted}
Net Refund Payable: ₹${refundAmountFormatted}
${props.tierLabel ? `Policy: ${props.tierLabel}\n` : ''}
REFUND TIMELINE:
The refund amount of ₹${refundAmountFormatted} has been initiated and will be credited to your original payment account within 3-5 business days.

Ready to plan your next flight?
Visit: ${baseUrl}/flights

Questions? Contact support@credofly.com
© ${new Date().getFullYear()} CredoFly Aviation Pvt Ltd.
  `.trim();

  return { html, text, subject };
}
