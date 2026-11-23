# Mini Ajintara

> **Live frontend** `<VERCEL_PRODUCTION_URL>` · **Live API** `<RENDER_SERVICE_URL>/api` · **Video walkthrough** `<VIDEO_URL>`

An online hotel listing and booking platform for India with three roles: guest,
partner (hotel owner), and admin. Partners can submit listings, configure rooms and edit nightly inventory. Admins can review those listings.

## Overview

- Guest search, booking and payment are planned.
- Partners manage properties, room types, and date-wise inventory.
- Admins approve or reject pending properties. Booking, user and statistics screens are planned for A6.
- Money is integer paise, GST is basis points, and calendar dates are IST
  `YYYY-MM-DD` strings.

## Tech stack (and why)

| Area      | Choice                                                        | Why                                                                 |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Backend   | Node 20.19+, Express 5, ESM                                   | Small, familiar API layer; ESM matches the frontend.                |
| Database  | MongoDB Atlas + Mongoose                                      | Flexible property data; Atlas gives the replica set transactions need. |
| Validation| Zod                                                           | One schema style for API input and environment validation.          |
| Auth      | JWT + bcryptjs                                                | Stateless auth; bcryptjs is pure JS, so no native build failures.   |
| Security  | Helmet, CORS allow-list, express-rate-limit                   | Safe defaults with a single error format.                           |
| Payments  | Razorpay (test mode)                                          | Required gateway; raw-body webhook verification is planned.         |
| Frontend  | Vite + React (JS), Tailwind CSS v4, React Router              | Fast dev loop; utility CSS keeps the mobile-first UI consistent.    |
| Data      | TanStack Query, Axios, React Hook Form + Zod, date-fns        | Cache server state, schema-validated forms, and IST-aware dates.    |
| Tests     | Vitest, Supertest                                             | Fast unit tests and HTTP-level checks against a disposable replica set.           |

## Run locally

Prerequisites: Node.js 20.19+ and a MongoDB Atlas connection string.
Transactions require a replica set; a plain standalone local `mongod` is not
enough. A local single-node replica set also works after `rs.initiate()`.

### Backend

```bash
cd backend
cp .env.example .env   # fill MONGO_URI, JWT_SECRET (32+ chars), etc.
npm install
npm run dev            # http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev            # http://localhost:5173
```

### Checks

```bash
cd backend && npm run lint && npm test
cd frontend && npm run lint && npm test && npm run build
```

## Deployment

Vercel serves the React SPA. The browser sends authenticated HTTPS requests to Express on Render, which stores data in a MongoDB Atlas replica set. Set up Atlas first, create the Render service from `render.yaml`, then build Vercel with the assigned API URL. Confirm the final Vercel origin in Render, seed the database and run the smoke test. Follow the [deployment runbook](docs/DEPLOYMENT.md).

| Name | Where to set it | Example or purpose | Secret? |
| --- | --- | --- | --- |
| `MONGO_URI` | Render and local seed environment | `mongodb+srv://<user>:<encoded-password>@<cluster>/ajintara` | Yes |
| `JWT_SECRET` | Render | Random signing key, at least 32 characters | Yes |
| `JWT_EXPIRES_IN` | Render blueprint | `1d` (local default `15m`) | No |
| `FRONTEND_URL` | Render | `https://<project>.vercel.app`, comma-separated for multiple exact origins | No |
| `NODE_ENV`, `NODE_VERSION` | Render blueprint | `production`, `20` | No |
| `PORT` | Render supplies it | Local default `5000` | No |
| `HOLD_MINUTES`, `AUTH_RATE_LIMIT_MAX` | Render blueprint | `10`, `10` attempts per IP per 15 minutes for signup/login | No |
| `RAZORPAY_KEY_ID` | Render | Optional payment key identifier, reserved for A3 | No |
| `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Render | Optional private payment credentials, reserved for A3 | Yes |
| `VITE_API_URL` | Vercel → Environment Variables → Production | `https://<service>.onrender.com/api` | No |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | Vercel, optional | Cloud name and unsigned image upload preset | No |
| `VITE_RAZORPAY_KEY_ID` | Vercel, optional | Public payment key identifier, reserved for A3 | No |
| `SEED_PASSWORD`, `ADMIN_PASSWORD` | Local seed environment | Unique demo-account and administrator passwords | Yes |
| `ADMIN_NAME`, `ADMIN_EMAIL` | Local admin seed environment | Admin display name and email | No |
| `API_URL`, `FRONTEND_URL` | Local smoke environment | Render API URL and **one** allowed Vercel origin | No |
| `SMOKE_PASSWORD` | Local smoke environment | Existing demo accounts’ password | Yes |

Vite embeds `VITE_*` values at build time and exposes them to the browser. Redeploy Vercel after changing them. The backend validates its environment at startup. Keep private values in host settings or an untracked local environment file.

**Free-tier limitations.** Render sleeps after about 15 minutes of inactivity. The next request can take around a minute. In-process cron jobs pause while the service sleeps, and inventory extension catches up at startup. [Render free services](https://render.com/docs/free)

This demo’s Atlas network policy allows `0.0.0.0/0`. The Render service uses shared regional outbound IPs and can use different addresses. Use a strong database password and a database-scoped account. You can narrow the Atlas access list to the CIDRs in Render’s **Connect → Outbound** panel plus the seed operator’s IP. [Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses) · [Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/)

The browser stores bearer tokens in localStorage. Injected JavaScript can read a token until it expires or the signing key rotates.

## Authentication

The Vercel frontend sends a JWT in the Authorization header to the Render API.
This keeps authentication stateless and avoids cross-site session cookies between
the two domains. The API verifies the signature and expiry, then loads the user
on each protected request. Blocks, deletions, and role changes take effect on the
next request. Tokens expire after 15 minutes by default.

Public signup accepts guests and hotel partners. To provision an admin, set
`ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the backend environment
and run `npm run seed:admin` from `backend` (append `-- --yes` for Atlas). Reusing an email preserves the
existing account, including its role and password.

### Known limitations

The frontend stores the token in localStorage so a reload can restore the user.
An XSS vulnerability could let injected JavaScript read and reuse that token.
Short expiry limits that window. Logout clears the browser's copy.

## Architecture

The [architecture diagram](docs/ARCHITECTURE.md) shows the three hosts, browser requests and inventory job.

## Database design

The database stores users, properties, room types and nightly inventory. Field definitions and indexes are in the [data model](docs/DATA_MODEL.md).

## API list

Partner management, admin review, authentication and health endpoints are implemented. See the [API reference](docs/API.md).

## Inventory design (A2)

Each room type has one inventory document per IST night. The unique room-type/date index gives a future booking transaction a single document per night on which to reserve capacity atomically. Creating a room type also creates its first 365 nights, starting today in Asia/Kolkata, in the same transaction.

The server fills the window at startup and at 00:05 Asia/Kolkata each day. Newly generated nights take their price and total rooms from the room type’s base values. Partners edit inclusive ranges through the inventory endpoint. They can change price, capacity or both. If any night is missing or already has more bookings than the proposed capacity, the entire range update rolls back and the API identifies up to ten conflicting nights.

Prices are per room per night, in integer paise, capped at ₹1,00,000. At 20,000 properties averaging five room types each, the active window alone takes about 36.5 million documents. Historical nights add storage beyond that. At that scale, consider sparse nightly overrides against base values or per-month documents.

Editing an approved property keeps its approval. Editing a rejected property clears the reason and sends it back to the pending queue.

## Seed data and test logins

Run `npm run seed:data` from `backend` against a local replica set. The command prints the host, database name, counts and account emails. For a remote target, pass `-- --yes`. To rebuild the two demo partners’ listings, room types and inventory, pass `-- --reset`. Existing accounts keep their credentials. Use `npm run seed:admin` separately to create the admin.

| Role | Email |
| --- | --- |
| Guest | `guest@ajintara.test` |
| Partner, 8 properties | `partner1@ajintara.test` |
| Partner, 6 properties | `partner2@ajintara.test` |

**Demo only** — the default password is `Demo@12345`. Set `SEED_PASSWORD` before the first run to choose another password.

The catalog has 14 properties in Goa, Jaipur, Mumbai and Manali. Approved properties have a 15% Friday/Saturday premium for the next 60 nights. From December 24 through January 1 inclusive, the 40% holiday premium takes precedence within the bookable window. Seeded overrides round to whole rupees. The Last Room Suite has one room and a base price of exactly ₹7,500.

## Double-booking prevention (A4)

Planned: inventory is decremented only with atomic conditional updates
(`$inc` guarded by `booked <= totalRooms - qty`) inside a MongoDB transaction.
Booking creation and hold release happen in the same transaction. No
read-then-write logic. This is not implemented yet.

## Time zone handling (A5)

- **Calendar nights** use IST `YYYY-MM-DD` strings. A night identifies the same hotel date wherever the guest opens the app. Checkout is exclusive. The frontend serializes the local date-picker selection with `toDateString()` and displays the string using UTC calendar parts.
- **UTC instants** represent a specific moment, such as `checkInAt` or `checkOutAt`. The frontend displays these in Asia/Kolkata with an IST label.
- **Wall-clock rules** live in `config/booking.js`. The stay builder combines the arrival date with 14:00 IST and the departure date with 12:00 IST, then returns each as a UTC `Date`.

Never derive today from the server clock’s local calendar. Pass the current instant to `todayIST(now)` on the backend and use the same IST day for the frontend date-picker minimum. Same-day check-in is allowed, and a stay can span 1 through 30 nights.

### Pricing and refund assumptions

Each night uses the first GST slab covering its per-room price. Multiply that price by the room quantity, calculate GST for the night, and round half up to the nearest paisa before summing the nights.

Refunds use the grand total including GST, multiplied by the applicable percentage and rounded down to whole paise. More than 48 hours before check-in gives 100%. From exactly 48 hours through exactly 24 hours, both endpoints included, the refund is 50%. With less than 24 hours remaining the refund is zero. Cancellation closes at the check-in instant.

## Part B tasks done (B3, B7)

- **B3 (hold expiry cron):** not implemented yet. `jobs/holdExpiry.js` is a
  placeholder; the planned schedule and 10-minute hold are configured.
- **B7 (CI + tests):** GitHub Actions runs Vitest under UTC and America/New_York,
  including the frontend money formatter, HTTP error responses, and transaction
  commit and rollback on a disposable MongoDB replica set. CI also lints both
  packages and builds the frontend.

## Foundation verification

Install dependencies in both packages, then run `npm test` in the backend for HTTP checks and shared backend and frontend helper tests.
Set `TEST_REPLICA_URI` to a dedicated local test replica-set URI to include authentication, ownership, review, inventory, rollback and seed checks. The integration suites clean up their disposable databases or probe collections. Run with `TZ=UTC` and `TZ=America/New_York`.
Server startup requires a successful replica-set topology check before listening.
