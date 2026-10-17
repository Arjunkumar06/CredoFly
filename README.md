# CredoFly — Flight Booking Platform

## 1. Setup Instructions

### Prerequisites
- **Node.js**: v20+ (tested on v24)
- **npm**: v10+ (tested on v11)
- **PostgreSQL**: Local instance running on port 5432 with database `flight_booking_db` created

### Step 1: Install Dependencies
From the repository root directory:
```bash
npm install
```

### Step 2: Environment Configuration
Create a `.env` file in the project root:
```env
# Database connection string
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/flight_booking_db"

# Server configuration
PORT=5000
NODE_ENV="development"
JWT_SECRET="credofly-super-secure-jwt-secret-key-change-in-production"
CLIENT_URL="http://localhost:5001"

# Administrator credentials (HTTP Basic Authentication)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="adminpassword123"

# Email service (optional; falls back to sandbox/mock mode when empty)
RESEND_API_KEY=""
RESEND_FROM_EMAIL="onboarding@resend.dev"
APP_BASE_URL="http://localhost:5001"
```

### Step 3: Database Migration & Schema Sync
Generate Prisma client and push the relational schema to PostgreSQL:
```bash
npm run prisma:generate
npx prisma db push --schema=./prisma/schema.prisma
```

### Step 4: Seed Database
Populate initial flights, weekly schedules, departure instances, seats, and admin/customer accounts:
```bash
npm run prisma:seed
```

### Step 5: Run Development Servers
Start both the backend API and frontend client concurrently:
```bash
npm run dev
```
- **Frontend Portal**: [http://localhost:5001](http://localhost:5001)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Step 6: Run Automated Tests
Execute the full Vitest integration and unit test suite:
```bash
npm test
```

### Step 7: Production Build
Compile TypeScript and bundle frontend assets:
```bash
npm run build
```

---

## 2. Technology Stack

### Frontend
- **Framework & Language**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS, Lucide React Icons
- **State & Routing**: React Router v7, React Context
- **Forms & Validation**: React Hook Form, Zod
- **HTTP Client**: Axios

### Backend
- **Runtime & Framework**: Node.js, Express, TypeScript
- **Database ORM**: Prisma ORM v6
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, HTTP Basic Auth
- **Validation**: Zod schema validation middleware
- **Email Service**: Resend Node.js SDK (with automatic sandbox mock fallback)
- **Utilities**: `cookie-parser`, `cors`

### Database
- **Engine**: PostgreSQL 18
- **Data Integrity**: Foreign key constraints, unique indexes, ACID transactions, atomic conditional updates

### Tooling & Testing
- **Test Framework**: Vitest, Supertest
- **Process Management**: Concurrently, `tsx`
- **Build**: TypeScript compiler (`tsc`), Vite Rollup bundler

---

## 3. Assumptions

### Booking & Confirmation Flow
- **Immediate Confirmation**: In accordance with the core assignment specification, flight bookings are confirmed immediately upon entering passenger information and selecting a flight, without mandatory payment gateway dependencies.
- **Optional Payment Extension**: The architecture supports manual payment submission (such as UPI/QR code and UTR verification) without obstructing instant demo reservations.
- **Unique References**: Every booking is assigned an authoritative Booking Reference (e.g., `CF20261017XXXX`) and a 6-character PNR.

### Pricing & Fare Synchronization
- **Authoritative Server Pricing**: Fares submitted by the client are never trusted. All calculations are executed on the backend:
  $$\text{Grand Total} = (\text{adultCount} \times \text{adultFare}) + (\text{childCount} \times \text{childFare}) + \text{taxes} + \text{seatCharges}$$
- **Real-Time Fare Synchronization**: Modifying adult or child fares in the Admin Panel updates all future unbooked flight instances in PostgreSQL, which are immediately reflected in customer search results.
- **Historical Fare Snapshots**: Confirmed bookings store immutable snapshots of `adultFare` and `childFare` at reservation time, ensuring past booking amounts remain unchanged when administrator prices fluctuate.

### Scheduling & Inventory
- **Weekly Schedule Template**: Flights operate on recurring weekly schedules (days 0–6, Sunday through Saturday). Departure instances are generated automatically for upcoming dates.
- **Overnight Flights**: Departures crossing midnight (arrival time earlier than departure time) are supported and properly compute duration into the next day.
- **Concurrency & Overbooking Safeguards**: Seat inventory is decremented atomically using SQL conditions (`WHERE "availableSeats" >= $requestedSeats`) inside database transactions. If seats are exhausted concurrently, transactions roll back with an explicit error.
- **Deletion Safeguards**: Flights with existing passenger bookings cannot be hard-deleted. They undergo soft-deletion (deactivation of future departures while preserving historical booking and audit records). Flights with zero bookings can be permanently removed.

### Passenger & Cancellation Policies
- **Adult Requirement**: At least one adult passenger is required per reservation; children cannot book unaccompanied.
- **Maximum Passengers**: Reservations are capped at 8 passengers per booking.
- **Seat Restoration**: Full or partial cancellations restore seats back to the flight departure instance in real-time, recalculate refundable amounts, and log immutable audit events.
