export interface FlightLegDetails {
  flightCode: string;
  airlineName?: string;
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime?: string;
  cabinClass?: string;
}

export interface BookingPassengerInfo {
  name: string;
  type: 'ADULT' | 'CHILD';
  seatNumber?: string | null;
}

export interface BookingConfirmationEmailProps {
  bookingReference: string;
  pnr?: string | null;
  customerName?: string;
  contactEmail: string;
  contactPhone?: string | null;
  cabinClass: string;
  paymentMethod?: string;
  paymentStatus?: string;
  totalAmount: string | number;
  outboundFlight: FlightLegDetails;
  returnFlight?: FlightLegDetails | null;
  passengers: BookingPassengerInfo[];
  fareBreakdown?: {
    baseFare?: string | number;
    seatCharges?: string | number;
    taxesAndFees?: string | number;
    totalAmount?: string | number;
  };
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

export function generateBookingConfirmationEmail(props: BookingConfirmationEmailProps): {
  html: string;
  text: string;
  subject: string;
} {
  const pnr = escapeHtml(props.pnr || props.bookingReference);
  const ref = escapeHtml(props.bookingReference);
  const name = escapeHtml(props.customerName || 'Valued Traveler');
  const baseUrl = (props.appBaseUrl || 'http://localhost:5001').replace(/\/$/, '');
  const outbound = props.outboundFlight;
  const ret = props.returnFlight;
  const isRoundTrip = !!ret;

  const totalFormatted = typeof props.totalAmount === 'number'
    ? props.totalAmount.toLocaleString('en-IN')
    : props.totalAmount;

  const subject = `Booking Confirmed: CredoFly ${outbound.flightCode} (${outbound.origin} → ${outbound.destination}) - PNR: ${props.pnr || props.bookingReference}`;

  const renderFlightCard = (leg: FlightLegDetails, label: string) => `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 12px;">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; background-color: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 9999px;">${escapeHtml(label)}</span>
        <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(leg.airlineName || 'CredoFly Express')} • <strong>${escapeHtml(leg.flightCode)}</strong></span>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 42%; vertical-align: top;">
            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${escapeHtml(leg.origin)}</div>
            <div style="font-size: 14px; font-weight: 600; color: #2563eb; margin-top: 2px;">${escapeHtml(leg.departureTime)}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${escapeHtml(leg.travelDate)}</div>
          </td>
          <td style="width: 16%; text-align: center; vertical-align: middle;">
            <div style="font-size: 18px; color: #94a3b8;">✈</div>
            <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Direct</div>
          </td>
          <td style="width: 42%; text-align: right; vertical-align: top;">
            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${escapeHtml(leg.destination)}</div>
            <div style="font-size: 14px; font-weight: 600; color: #2563eb; margin-top: 2px;">${escapeHtml(leg.arrivalTime || 'Arrival')}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${escapeHtml(leg.travelDate)}</div>
          </td>
        </tr>
      </table>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569; display: flex; justify-content: space-between;">
        <span>Cabin Class: <strong>${escapeHtml(leg.cabinClass || props.cabinClass)}</strong></span>
        <span>Baggage: <strong>15 Kg Check-in • 7 Kg Cabin</strong></span>
      </div>
    </div>
  `;

  const renderPassengersHtml = () => {
    return props.passengers.map((p, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #0f172a;">
          ${idx + 1}. ${escapeHtml(p.name)}
        </td>
        <td style="padding: 10px 12px; font-size: 13px; color: #64748b; text-align: center;">
          ${escapeHtml(p.type)}
        </td>
        <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #2563eb; text-align: right;">
          ${escapeHtml(p.seatNumber || 'Standard Allocation')}
        </td>
      </tr>
    `).join('');
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
    .container { max-width: 620px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .status-badge { display: inline-block; background-color: #10b981; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em; }
    .content { padding: 28px; }
    .pnr-box { display: flex; justify-content: space-between; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
    .pnr-col { text-align: left; }
    .pnr-col.right { text-align: right; }
    .pnr-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1e40af; margin-bottom: 4px; }
    .pnr-value { font-size: 20px; font-weight: 800; color: #0f172a; font-family: monospace; letter-spacing: 0.05em; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 24px 0 12px; }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .data-table th { background-color: #f8fafc; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .total-box { background-color: #0f172a; color: #ffffff; border-radius: 12px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; margin: 24px 0; }
    .total-label { font-size: 13px; color: #94a3b8; }
    .total-val { font-size: 24px; font-weight: 800; color: #38bdf8; }
    .cta-container { text-align: center; margin: 28px 0; }
    .cta-button { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
    .travel-tips { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 12px; color: #64748b; line-height: 1.6; }
    .footer { background-color: #f8fafc; padding: 20px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="status-badge">✓ Booking Confirmed</div>
      <h1 class="title">Have a Great Flight!</h1>
      <p style="margin: 0; font-size: 14px; color: #93c5fd;">Your electronic ticket is issued and confirmed.</p>
    </div>

    <div class="content">
      <p style="font-size: 15px; margin-top: 0; color: #334155;">Hello <strong>${name}</strong>, your CredoFly booking has been successfully confirmed. Below is your complete travel itinerary and receipt.</p>

      <div class="pnr-box">
        <div class="pnr-col">
          <div class="pnr-label">Booking Reference</div>
          <div class="pnr-value">${ref}</div>
        </div>
        <div class="pnr-col right">
          <div class="pnr-label">Airline PNR</div>
          <div class="pnr-value" style="color: #2563eb;">${pnr}</div>
        </div>
      </div>

      <div class="section-title">Flight Itinerary</div>
      ${renderFlightCard(outbound, isRoundTrip ? 'Outbound Journey' : 'Flight')}

      ${isRoundTrip && ret ? renderFlightCard(ret, 'Return Journey') : ''}

      <div class="section-title">Passenger &amp; Assigned Seats</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Passenger Name</th>
            <th style="text-align: center;">Type</th>
            <th style="text-align: right;">Seat</th>
          </tr>
        </thead>
        <tbody>
          ${renderPassengersHtml()}
        </tbody>
      </table>

      <div class="total-box">
        <div>
          <div class="total-label">Total Amount Paid (${escapeHtml(props.paymentMethod || 'Confirmed Payment')})</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Inclusive of all passenger fares, taxes &amp; seat selection</div>
        </div>
        <div class="total-val">₹${totalFormatted}</div>
      </div>

      <div class="cta-container">
        <a href="${baseUrl}/my-bookings" class="cta-button" target="_blank">View / Download E-Ticket</a>
      </div>

      <div class="travel-tips">
        <strong>Important Travel Guidelines:</strong><br />
        • <strong>Web Check-in:</strong> Opens 48 hours prior and closes 60 minutes before scheduled departure.<br />
        • <strong>Airport Arrival:</strong> Please arrive at the departure terminal at least 2 hours before domestic departures.<br />
        • <strong>Identity Proof:</strong> Valid government photo ID (Aadhaar, Passport, Voter ID, Driving Licence) is required for all passengers.
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

  const passengersText = props.passengers
    .map((p, i) => `  ${i + 1}. ${p.name} (${p.type}) - Seat: ${p.seatNumber || 'Unassigned'}`)
    .join('\n');

  const text = `
========================================
CREDOFLY FLIGHT CONFIRMATION
========================================
Status: CONFIRMED
Booking Reference: ${props.bookingReference}
PNR: ${props.pnr || props.bookingReference}

PASSENGER DETAILS:
----------------------------------------
${passengersText}

FLIGHT DETAILS (OUTBOUND):
----------------------------------------
Flight: ${outbound.airlineName || 'CredoFly Express'} ${outbound.flightCode}
Route: ${outbound.origin} -> ${outbound.destination}
Date: ${outbound.travelDate}
Departure: ${outbound.departureTime}
Cabin: ${outbound.cabinClass || props.cabinClass}
${
  isRoundTrip && ret
    ? `
FLIGHT DETAILS (RETURN):
----------------------------------------
Flight: ${ret.airlineName || 'CredoFly Express'} ${ret.flightCode}
Route: ${ret.origin} -> ${ret.destination}
Date: ${ret.travelDate}
Departure: ${ret.departureTime}
Cabin: ${ret.cabinClass || props.cabinClass}
`
    : ''
}
PAYMENT SUMMARY:
----------------------------------------
Total Paid: ₹${totalFormatted}
Payment Method: ${props.paymentMethod || 'Confirmed'}
Status: CONFIRMED

MANAGE YOUR BOOKING:
View and download your digital boarding pass anytime at:
${baseUrl}/my-bookings

Need assistance? Contact support@credofly.com
© ${new Date().getFullYear()} CredoFly Aviation Pvt Ltd.
  `.trim();

  return { html, text, subject };
}
