export interface WelcomeEmailProps {
  name: string;
  email: string;
  customerId: string;
  mobileNumber?: string | null;
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

export function generateWelcomeEmail(props: WelcomeEmailProps): { html: string; text: string; subject: string } {
  const safeName = escapeHtml(props.name || 'Traveler');
  const safeEmail = escapeHtml(props.email);
  const safeCustomerId = escapeHtml(props.customerId);
  const safeMobile = escapeHtml(props.mobileNumber || 'Not provided');
  const baseUrl = (props.appBaseUrl || 'http://localhost:5001').replace(/\/$/, '');

  const subject = `Welcome to CredoFly — Your Journey Begins Here`;

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
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .logo-badge { display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 8px 16px; border-radius: 9999px; font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25); }
    .title { font-size: 26px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em; }
    .tagline { font-size: 14px; color: #93c5fd; margin: 0; }
    .content { padding: 32px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    .lead-text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .highlight-card { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center; }
    .id-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #1e40af; margin-bottom: 6px; }
    .id-value { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.05em; font-family: monospace; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .details-table td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
    .details-label { color: #64748b; font-weight: 600; width: 40%; }
    .details-val { color: #0f172a; font-weight: 600; }
    .features-list { margin: 20px 0; padding: 0; list-style: none; }
    .features-list li { padding: 8px 0 8px 24px; position: relative; font-size: 14px; color: #334155; }
    .features-list li::before { content: "✓"; position: absolute; left: 0; color: #2563eb; font-weight: 800; }
    .button-container { text-align: center; margin: 32px 0 24px; }
    .cta-button { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
    .security-notice { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #92400e; line-height: 1.5; margin-top: 24px; }
    .footer { background-color: #f8fafc; padding: 24px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">✈ CredoFly Express</div>
      <h1 class="title">Welcome Aboard!</h1>
      <p class="tagline">Your Journey, Made Simple.</p>
    </div>
    <div class="content">
      <p class="greeting">Hello ${safeName},</p>
      <p class="lead-text">
        Thank you for joining <strong>CredoFly</strong>. Your personal traveler account has been created and verified. You are now ready to explore schedules, pick your preferred seats, and book flights across India with complete transparency.
      </p>

      <div class="highlight-card">
        <div class="id-label">Your Unique Customer ID</div>
        <div class="id-value">${safeCustomerId}</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="details-label">Registered Email:</td>
          <td class="details-val">${safeEmail}</td>
        </tr>
        <tr>
          <td class="details-label">Mobile Number:</td>
          <td class="details-val">${safeMobile}</td>
        </tr>
        <tr>
          <td class="details-label">Account Status:</td>
          <td class="details-val" style="color: #16a34a;">● Active &amp; Verified</td>
        </tr>
      </table>

      <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 20px; margin-bottom: 8px;">Enjoy seamless flight booking with CredoFly:</h3>
      <ul class="features-list">
        <li><strong>Interactive Seat Selection:</strong> Choose your exact window, aisle, or extra legroom seats.</li>
        <li><strong>Dual-Leg Round-Trip Scheduling:</strong> Book outbound and return journeys effortlessly.</li>
        <li><strong>Transparent Fare Breakdown:</strong> Real-time pricing with zero hidden convenience fees.</li>
        <li><strong>Instant Confirmations:</strong> Automated PNR generation and digital PDF boarding passes.</li>
      </ul>

      <div class="button-container">
        <a href="${baseUrl}/flights" class="cta-button" target="_blank">Book Your First Flight</a>
      </div>

      <div class="security-notice">
        <strong>Security Tip:</strong> You can log in using your Customer ID (<code>${safeCustomerId}</code>), your email, or your mobile number. CredoFly staff will never ask for your password, OTP, or UPI PIN.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px;">CredoFly Aviation Pvt Ltd • Premier Flight Booking Experience</p>
      <p style="margin: 0 0 6px;">Questions? Reach us at <a href="mailto:support@credofly.com" style="color: #2563eb; text-decoration: none;">support@credofly.com</a></p>
      <p style="margin: 0;">© ${new Date().getFullYear()} CredoFly. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
========================================
WELCOME TO CREDOFLY
Your Journey, Made Simple.
========================================

Hello ${props.name || 'Traveler'},

Thank you for joining CredoFly! Your personal traveler account has been created successfully.

YOUR ACCOUNT DETAILS:
----------------------------------------
Customer ID: ${props.customerId}
Registered Email: ${props.email}
Mobile Number: ${props.mobileNumber || 'Not provided'}
Status: Active & Verified

LOGIN INFORMATION:
You can log in to CredoFly anytime using your Customer ID (${props.customerId}), your registered email, or your registered mobile number.

WHAT YOU CAN DO NEXT:
- Search flights & schedules: ${baseUrl}/flights
- View and manage your profile: ${baseUrl}/my-bookings

SECURITY REMINDER:
Never share your password, OTP, or UPI security PIN with anyone. CredoFly will never request these details over phone or email.

Need help? Contact support@credofly.com
© ${new Date().getFullYear()} CredoFly Aviation Pvt Ltd. All rights reserved.
  `.trim();

  return { html, text, subject };
}
