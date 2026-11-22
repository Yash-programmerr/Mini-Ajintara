# Mini Ajintara

> **Video walkthrough:** TODO — add link

An online hotel listing and booking platform for India with three roles: guest,
partner (hotel owner), and admin. Authentication and role-based access are implemented. Other feature routes are placeholders.

## Overview

- Guests search approved hotels by city and date, hold a room, pay, and manage
  bookings.
- Partners manage properties, room types, and date-wise inventory.
- Admins approve properties, manage users, and view a dashboard.
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
cd frontend && npm run lint && npm run build
```

## Environment variables

### Backend

| Variable                   | Required | Notes                                                |
| -------------------------- | -------- | ---------------------------------------------------- |
| `PORT`                     | no       | Defaults to `5000`.                                  |
| `NODE_ENV`                 | no       | `development`, `test`, or `production`.              |
| `MONGO_URI`                | yes      | Atlas replica-set connection string.                 |
| `JWT_SECRET`               | yes      | At least 32 characters; no default.                  |
| `JWT_EXPIRES_IN`           | no       | Defaults to `15m`.                                    |
| `AUTH_RATE_LIMIT_MAX`      | no       | Signup and login share 10 attempts per IP per 15 minutes by default. |
| `FRONTEND_URL`             | no       | Comma-separated CORS origins.                        |
| `HOLD_MINUTES`             | no       | Defaults to `10`.                                    |
| `RAZORPAY_KEY_ID`          | no       | Required before A3 payment work.                     |
| `RAZORPAY_KEY_SECRET`      | no       | Required before A3 payment work.                     |
| `RAZORPAY_WEBHOOK_SECRET`  | no       | Required before A3 webhook verification.             |

### Frontend

`VITE_API_URL` is required. `VITE_CLOUDINARY_CLOUD_NAME`,
`VITE_CLOUDINARY_UPLOAD_PRESET`, and `VITE_RAZORPAY_KEY_ID` are placeholders for
later features.

Never commit `.env` files.

## Authentication

The Vercel frontend sends a JWT in the Authorization header to the Render API.
This keeps authentication stateless and avoids cross-site session cookies between
the two domains. The API verifies the signature and expiry, then loads the user
on each protected request. Blocks, deletions, and role changes take effect on the
next request. Tokens expire after 15 minutes by default.

Public signup accepts guests and hotel partners. To provision an admin, set
`ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the backend environment
and run `npm run seed:admin` from `backend`. Reusing an email preserves the
existing account, including its role and password.

### Known limitations

The frontend stores the token in localStorage so a reload can restore the user.
An XSS vulnerability could let injected JavaScript read and reuse that token.
Short expiry limits that window. Logout clears the browser's copy.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the Mermaid diagram
(React -> Express -> MongoDB Atlas, Razorpay webhook, and hold-expiry cron).

## Database design

See [docs/DATA_MODEL.md](docs/DATA_MODEL.md). The `users` collection is implemented. Planned collections include
`properties`, `roomTypes`, `inventory`, `bookings`, `payments`.

## API list

See [docs/API.md](docs/API.md). Signup, login, and the current-user endpoint are live alongside `GET /api/health`, which returns `{ status: "ok", time }`.

## Double-booking prevention (A4)

Planned: inventory is decremented only with atomic conditional updates
(`$inc` guarded by `booked <= totalRooms - qty`) inside a MongoDB transaction.
Booking creation and hold release happen in the same transaction. No
read-then-write logic. This is not implemented yet.

## Time zone handling (A5)

Planned: `utils/time.js` is the only place that derives "today" or converts IST
calendar dates. Calendar nights are `YYYY-MM-DD` strings; instants are UTC
`Date`. The API accepts date-only strings from clients, never ISO timestamps.
Tests must pass under both `TZ=UTC` and `TZ=America/New_York`. The helper is a
placeholder for now.

## Part B tasks done (B3, B7)

- **B3 (hold expiry cron):** not implemented yet. `jobs/holdExpiry.js` is a
  placeholder; the planned schedule and 10-minute hold are configured.
- **B7 (CI + tests):** GitHub Actions runs Vitest under UTC and America/New_York,
  including the frontend money formatter, HTTP error responses, and transaction
  commit and rollback on a disposable MongoDB replica set. CI also lints both
  packages and builds the frontend.

## Foundation verification

Run `npm test` in the backend to exercise HTTP behavior and money formatting.
Set `TEST_REPLICA_URI` to a dedicated test replica-set database to include the auth and transaction checks. They create and remove a unique auth
test database and a transaction probe collection.
Server startup requires a successful replica-set topology check before listening.

## Feature status

- Partner and admin routes enforce database roles and return `501 NOT_IMPLEMENTED` after authorization. Other hotel features are planned.
- The configured refund policy gives 100% at exactly 48 hours before check-in.
  Refund calculation and its boundary tests belong to the refund milestone.
- The frontend lockfile resolves Vite 8.3.8.
