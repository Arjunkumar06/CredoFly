# CredoFly — Modern Full-Stack Flight Booking Engine

> **Your Journey, Made Simple.**  
> Built as a premier full-stack flight booking engine for the Zutrula Coding Assignment.

---

## 1. Project Overview

**CredoFly** is a full-stack, responsive commercial airline booking platform engineered with **React, TypeScript, Vite, Tailwind CSS, Node.js, Express, Prisma ORM, and PostgreSQL**.

CredoFly delivers an end-to-end commercial airline reservation workflow:
- Dynamic flight search across origin/destination routes with live seat availability checks.
- Transparent fare breakdown by passenger mix (Adults & Children).
- Atomic, concurrency-safe database booking transactions preventing overbooking under high concurrent load.
- Self-service customer booking management with full and partial cancellation capabilities, automatic inventory restoration, and audit logging.
- Dedicated dark-navy Administrator Operations Console protected by **HTTP Basic Authentication**, featuring real database-derived dashboard statistics, fleet configuration, 7-day recurring schedule templates, and global booking filters.

---

## 2. Architecture & Design System

### Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v7, React Hook Form, Zod, Axios, Lucide React Icons |
| **Backend** | Node.js (v24), Express, TypeScript, Prisma ORM (v6), Zod, bcryptjs, jsonwebtoken, cookie-parser, cors |
| **Database** | PostgreSQL 18.6 (local instance: `flight_booking_db`) |
| **Testing** | Vitest, Supertest, Database Integration Test Suite |

### System Architecture Diagram

```mermaid
graph TD
    subgraph Client ["Frontend (Vite + React + Tailwind)"]
        UI_Home["Landing Page / Search"]
        UI_Results["Search Results"]
        UI_Booking["Review & Booking"]
        UI_Confirm["Confirmation & Boarding Pass"]
        UI_Customer["Customer Portal (My Bookings)"]
        UI_Admin["Admin Operations Console"]
    end

    subgraph Server ["Backend (Node.js + Express + TypeScript)"]
        AuthMid["Customer JWT & Admin Basic Auth"]
        ValMid["Zod Request Validation"]
        FlightCtrl["Flight & Schedule Controller"]
        BookingCtrl["Booking & Cancellation Controller"]
        AdminCtrl["Admin Operations Controller"]
    end

    subgraph Database ["PostgreSQL (flight_booking_db)"]
        PrismaORM["Prisma Client"]
        T_Users["users"]
        T_Flights["flights"]
        T_Schedules["flight_schedules"]
        T_Instances["flight_instances"]
        T_Bookings["bookings"]
        T_Passengers["passengers"]
        T_Events["booking_events"]
    end

    UI_Home -->|GET /api/flights/search| FlightCtrl
    UI_Booking -->|POST /api/bookings| BookingCtrl
    UI_Customer -->|GET /api/bookings/me| BookingCtrl
    UI_Customer -->|POST /api/bookings/:id/partial-cancel| BookingCtrl
    UI_Admin -->|Authorization: Basic| AdminCtrl

    Server --> PrismaORM
    PrismaORM --> Database
```

---

## 3. Database Schema & Concurrency Model

### Relational Schema

```mermaid
erDiagram
    User ||--o{ Booking : "makes"
    Flight ||--o{ FlightSchedule : "defines weekly"
    Flight ||--o{ FlightInstance : "schedules dates"
    FlightSchedule ||--o{ FlightInstance : "generates"
    FlightInstance ||--o{ Booking : "reserved by"
    Booking ||--o{ Passenger : "contains"
    Booking ||--o{ BookingEvent : "audited by"

    User {
        string id PK
        string username UK
        string email UK
        string passwordHash
        datetime createdAt
    }

    Flight {
        string id PK
        string flightCode UK
        string origin
        string destination
        int capacity
        boolean isActive
    }

    FlightSchedule {
        string id PK
        string flightId FK
        int dayOfWeek "0-6 (Sun-Sat)"
        string departureTime
        string arrivalTime
        decimal adultFare
        decimal childFare
        boolean isOperating
    }

    FlightInstance {
        string id PK
        string flightId FK
        string scheduleId FK
        date travelDate
        string departureTime
        string arrivalTime
        decimal adultFare
        decimal childFare
        int availableSeats
    }

    Booking {
        string id PK
        string bookingReference UK "e.g. CF2026101501"
        string userId FK
        string flightInstanceId FK
        int adultCount
        int childCount
        decimal adultFareSnapshot
        decimal childFareSnapshot
        decimal totalAmount
        string status "CONFIRMED | CANCELLED"
        datetime cancelledAt
    }

    Passenger {
        string id PK
        string bookingId FK
        string name
        string type "ADULT | CHILD"
        boolean isCancelled
    }

    BookingEvent {
        string id PK
        string bookingId FK
        string eventType "CREATED | PARTIAL_CANCELLATION | FULL_CANCELLATION"
        string details
        datetime createdAt
    }
```

### Concurrency & Overbooking Prevention Policy
- **Atomic Inventory Updates**: Seat allocation is executed via atomic conditional SQL queries within an isolated database transaction:
  ```sql
  UPDATE flight_instances
  SET "availableSeats" = "availableSeats" - $totalPassengers,
      "updatedAt" = NOW()
  WHERE id = $instanceId AND "availableSeats" >= $totalPassengers;
  ```
  If affected rows equals 0, the transaction immediately aborts with an `InsufficientSeatsError`, guaranteeing that multiple parallel booking requests will never overbook inventory.
- **Server-Side Fare Snapshots**: Prices submitted by the client are ignored. Fares are read directly from trusted database departure records, and snapshots are recorded with each booking.
- **Idempotent Cancellation**: Cancelling an already cancelled booking rejects the request and guarantees seats are not released twice.
- **Partial Cancellation**: Passengers can be cancelled individually. Each cancelled passenger releases exactly one seat back to `flight_instances.availableSeats`, and recalculates total amounts and refund amounts according to original fare snapshots.

---

## 4. The 12 User Interfaces (Reference Collage Mapping)

The application faithfully implements all 12 interface screens from the project design specification:

1. **Customer Landing Page (`/`)**: Hero section with CredoFly branding, airplane hero imagery, and flight search card with airport selectors, date picker, passenger selectors, and feature cards (Easy Booking, Best Fares, 24/7 Support).
2. **Flight Search Results (`/flights`)**: Interactive results card showing flight codes (e.g. `CF101`), non-stop duration diagrams, live available seats badge, adult/child fares, and "Select" action with search modification drawer.
3. **Flight Details & Booking Review (`/booking/review`)**: Route overview, aircraft details (A320), passenger count selectors, passenger name inputs, detailed price breakdown formula (`Adult Count × Adult Fare + Child Count × Child Fare`), and Confirm Booking submission.
4. **Booking Confirmation (`/booking/confirmation/:id`)**: Green checkmark confirmation banner, unique booking reference (`CF...`), printable boarding pass slip, passenger details table, and action links.
5. **My Bookings (`/my-bookings`)**: Authenticated customer reservation dashboard separated into "Upcoming" and "Past & Cancelled" tabs with reference codes, routes, passenger summaries, status badges, and action buttons.
6. **Booking Details & Partial Cancellation (`/my-bookings/:id`)**: Comprehensive view of a single reservation, destructive "Cancel Entire Booking" button with confirmation modal, and "Partial Cancellation" tool to cancel specific adult or child passengers with live refund calculation.
7. **Admin Flight Configuration (`/admin/flights`)**: Fleet management panel to create and configure flights with unique codes, capacities, origin/destination validation, and a full 7-day (Monday to Sunday) weekly operating schedule editor.
8. **Admin All Bookings (`/admin/bookings`)**: Centralized operations booking table with active filters for Route, Travel Date, and Departure Time, along with pagination controls.
9. **Admin Booking Details (`/admin/bookings/:id`)**: Detailed inspection view showing customer info, flight parameters, fare snapshots, passenger statuses, audit logs, and administrative override cancellation.
10. **Customer Registration (`/register`)**: Centered authentication card with CredoFly logo, username, email, password, confirm password, and client-side validation.
11. **Customer Login (`/login`)**: Centered authentication card with pre-filled demo account options, password security, and JWT cookie/token issuing.
12. **Admin Restricted Login (`/admin/login`)**: High-security login screen for administrators that verifies credentials against backend HTTP Basic Authentication endpoints.

---

## 5. Environment Variables & Setup

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and configure your local PostgreSQL password:

```env
# Database connection string format
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/flight_booking_db"

PORT=5000
NODE_ENV="development"
JWT_SECRET="credofly-super-secure-jwt-secret-key-change-in-production"
CLIENT_URL="http://localhost:5173"

# Administrator HTTP Basic Authentication Credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="adminpassword123"
```

> [!IMPORTANT]
> Never commit `.env` or hardcode sensitive database passwords into Git. `.gitignore` is pre-configured to ignore all environment files.

---

## 6. Local Execution Guide

### Prerequisites
- Node.js >= 20 (verified on v24.21.0)
- npm >= 10 (verified on v11.19.0)
- PostgreSQL running locally with database `flight_booking_db` created.

### Step 1: Install Dependencies
Run from the root directory:
```bash
npm install
```

### Step 2: Database Migration & Schema Sync
Push the Prisma schema to your existing `flight_booking_db` database:
```bash
npx prisma db push --schema=./prisma/schema.prisma
```
*(Or use `npx prisma migrate dev --schema=./prisma/schema.prisma`)*

### Step 3: Seed Database
Populate demo flights, 7-day recurring schedules, 30-day departure instances, demo customer account, and sample bookings:
```bash
npm run prisma:seed
```

### Step 4: Start Development Servers
Run both frontend and backend concurrently with a single command:
```bash
npm run dev
```

Alternatively, run them in separate terminals:
```bash
# Terminal 1: Backend Server (runs on http://localhost:5000)
npm run dev:server

# Terminal 2: Frontend Client (runs on http://localhost:5173)
npm run dev:client
```

Open your browser at **http://localhost:5173** to access CredoFly.

---

## 7. Demo Accounts & Credentials

### Customer Account
- **Username**: `john_doe`
- **Password**: `Password123!`
- *(Pre-seeded with confirmed and past bookings)*

### Administrator Account (HTTP Basic Auth)
- **Username**: `admin`
- **Password**: `adminpassword123`
- Direct access: navigate to **http://localhost:5173/admin/login** or click "Admin" in the top navbar.

---

## 8. API Endpoints Overview

### Customer APIs
- `POST /api/auth/register` — Create new customer account
- `POST /api/auth/login` — Authenticate and receive JWT token
- `POST /api/auth/logout` — Clear session
- `GET /api/auth/me` — Retrieve authenticated user profile
- `GET /api/flights/search` — Search flights by origin, destination, travelDate, and passengers
- `GET /api/flights/cities` — Retrieve distinct cities and airport codes for dropdowns
- `GET /api/flights/:id` — Retrieve flight details and schedules
- `POST /api/bookings` — Create a concurrency-safe booking
- `GET /api/bookings/me` — Retrieve upcoming and past customer bookings
- `GET /api/bookings/:id` — Retrieve booking details (owner or admin only)
- `POST /api/bookings/:id/cancel` — Cancel entire booking and release all seats
- `POST /api/bookings/:id/partial-cancel` — Partially cancel adult/child passengers and release seats

### Administrator APIs (Protected with HTTP Basic Auth)
- `GET /api/admin/verify` — Verify administrator HTTP Basic Auth credentials
- `GET /api/admin/dashboard` — Live database summary metrics
- `GET /api/admin/flights` — Get all flights with 7-day schedules
- `POST /api/admin/flights` — Create new flight with 7-day schedule
- `PATCH /api/admin/flights/:id` — Update flight details, capacity, and schedules
- `GET /api/admin/bookings` — Paginated and filterable customer bookings list
- `GET /api/admin/bookings/:id` — Detailed booking inspection with audit trail
- `POST /api/admin/bookings/:id/cancel` — Administrative cancellation override

---

---

## 9. Resend Email Service Integration & Notifications

CredoFly integrates transactional email delivery using the official **Resend Node.js SDK** (`resend`).

### Configuration (`.env`)

```env
# Resend Email Service Configuration
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="onboarding@resend.dev"
APP_BASE_URL="http://localhost:5001"
```

> **Testing Sandbox Notice:**  
> When using the default sender `onboarding@resend.dev`, Resend's free tier restricts email delivery exclusively to the verified account owner's email address. Once a custom domain is verified in your Resend dashboard (e.g., `notifications@credofly.com`), transactional emails can be delivered to any customer email.
> 
> **Zero-Crash Sandbox Fallback:**  
> If `RESEND_API_KEY` is omitted or left empty, CredoFly gracefully falls back to non-blocking sandbox mode. All notifications are logged to the console and audited in the PostgreSQL `notification_logs` table without interrupting or failing user bookings.

### Automated Transactional Email Events

| Event | Trigger | Template Features |
| :--- | :--- | :--- |
| **Welcome Email** | Initial customer registration or first-time Google sign-up *(never on repeat Google logins)* | Brand header, personalized greeting, auto-generated Customer ID (`CF-CUST-XXXXXX`), login instructions, security reminders, and quick-booking CTA. |
| **Booking Confirmation** | Successful booking or verified payment | Outbound & return (dual-leg) schedules, seat numbers (e.g. `4A`), cabin class, authoritative fare breakdown, PNR, check-in guidelines, and link to My Bookings. |
| **Cancellation Notice** | Full or partial booking cancellation | Detailed refund calculation (total paid, cancellation fee, net refund amount, applied policy tier), released seat numbers, and refund turnaround timeline (3–5 business days). |

### Post-Commit Dispatch & Reliability
All email dispatches occur strictly **after** database transactions have committed. If network latency or provider errors occur, the transaction remains safe and confirmed, and the error is recorded in the PostgreSQL `notification_logs` table.

---

## 10. Automated Testing

Integration and unit tests verify all core business rules:
- Customer registration, login, and multi-factor authentication (Customer ID, email, mobile)
- Rejection of duplicate usernames and invalid input
- Administrator HTTP Basic Authentication validation with timing-safe comparison
- Flight search, schedule generation, and authoritative server-side fare calculation
- Visual seat selection, 8-seat maximum enforcement, and atomic database reservation
- Full and partial cancellation with exact refund tier policy and seat restoration
- Dual-leg round-trip booking and synchronized cancellation
- **Resend Email Service unit and integration testing (`email_resend.test.ts`)**:
  - Template rendering with responsive HTML and plain-text fallback
  - HTML input sanitization and XSS prevention
  - Safe sandbox fallback when API key is omitted
  - Welcome email sent on first Google login, and suppressed on subsequent logins
  - Immutable audit logging in the `notification_logs` PostgreSQL table

To execute the full test suite (68 tests):
```bash
npm run test
```


---

## 11. Design Assumptions & Technical Interview Walkthrough

### 1. Payment Scope Assumption
The coding assignment specifications present conflicting requirements: one clause calls for immediate booking confirmation without payment, while another lists payment gateways as potential extensions.  
**Implemented Design**: CredoFly implements immediate booking confirmation with transparent fare calculation and zero mock credit card forms. The architecture isolates `BookingService` so payment gateway webhooks (e.g., Stripe / Razorpay) can easily wrap the transaction when needed.

### 2. Timezone & Schedule Assumptions
Weekly schedules operate in local airline time (`HH:mm` format). Overnight flights (where arrival time is earlier than departure time) automatically calculate travel duration spanning into the next calendar day without error.

### 3. Concurrency Safety
Rather than relying on application-level locks (which fail in multi-instance or clustered environments), CredoFly leverages PostgreSQL database transactions and conditional SQL row updates (`WHERE "availableSeats" >= $requestedSeats`). This provides ACID guarantees under high concurrent traffic.
