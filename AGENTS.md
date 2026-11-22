# AGENTS.md — Mini Ajintara project rules

Mini Ajintara is a hotel listing and booking platform for India with three roles:
guest, partner (hotel owner), and admin. This repository currently contains the
foundation only; features are implemented one at a time.

These rules are non-negotiable. Read them before changing code.

## 1. Money

Money is stored as **INTEGER PAISE**. GST rates are stored as **basis points**
(500 = 5%, 1800 = 18%). Never use floats for money or tax rates. Format only at
the UI boundary.

## 2. Dates and time

- Calendar nights are `'YYYY-MM-DD'` strings representing **IST dates**.
- Instants (`checkInAt`, `createdAt`, `holdExpiresAt`) are **UTC `Date`** values.
- Never derive "today" from the server's local time. Always use
  `utils/time.js` (Asia/Kolkata).
- The API accepts date-only strings from the client, never ISO timestamps.

## 3. Layers

`routes -> thin controllers -> services (all business logic)`.

Pricing and refund calculations are **PURE functions**. `now` is passed in as an
argument so results are deterministic and testable.

## 4. Inventory

Inventory changes only via **atomic conditional updates inside a MongoDB
transaction**. Never read-then-write. The database must be a replica set
(MongoDB Atlas); transactions are not available on a plain standalone mongod.

## 5. Booking status machine

```
pending_payment -> confirmed -> cancelled
pending_payment -> expired | payment_failed
```

Every transition is a conditional `findOneAndUpdate` on the expected current
status. No blind status writes.

## 6. Errors

Throw `AppError`. Every error response has exactly one shape:

```json
{ "error": { "code": "SOME_CODE", "message": "Human readable", "details": [] } }
```

`details` is optional. Status codes:

- `400` validation
- `401` not logged in / invalid token
- `403` forbidden / blocked / not yours
- `404` not found / not yours
- `409` conflict (sold out, duplicate)
- `429` rate limited

## 7. Security

- No secrets in the repository. `.env` stays untracked.
- `passwordHash` uses `select: false`.
- The role is always read from the database, never trusted from the token.
- Partners can only touch their own properties: enforce an ownership check, not
  just a role check.
- Public signup can never create an admin.

## 8. Style

- ESM only (`"type": "module"`).
- Keep files under roughly 200 lines.
- Comments explain **WHY**, not what the code does.
- Use conventional commits.

## 9. Tests

Use Vitest. Pure logic must be unit-tested and must pass under both
`TZ=UTC` and `TZ=America/New_York`.
