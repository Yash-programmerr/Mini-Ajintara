# Data model (planning only)

No Mongoose schemas exist yet. This document describes the intended
collections and indexes so feature work stays consistent.

All money is stored as integer paise. All GST rates are basis points. Calendar
dates are `'YYYY-MM-DD'` strings for IST; instants are UTC `Date` values.

## `users`

| Field          | Type                                          | Notes                               |
| -------------- | --------------------------------------------- | ----------------------------------- |
| `_id`          | ObjectId                                      |                                     |
| `name`         | string                                        | required                            |
| `email`        | string                                        | required, unique, stored lowercase  |
| `passwordHash` | string                                        | required, `select: false`           |
| `role`         | `guest` \| `partner` \| `admin`               | default `guest`                     |
| `isBlocked`    | boolean                                       | default `false`                     |
| `createdAt`    | Date                                          | timestamps                          |
| `updatedAt`    | Date                                          | timestamps                          |

Indexes: `{ email: 1 }` unique; `{ role: 1, isBlocked: 1 }`.

## `properties`

| Field          | Type                                         | Notes                                      |
| -------------- | -------------------------------------------- | ------------------------------------------ |
| `_id`          | ObjectId                                     |                                            |
| `partnerId`    | ObjectId                                     | ref `users`, required                      |
| `name`         | string                                       | required                                   |
| `city`         | string                                       | display value, required                    |
| `cityKey`      | string                                       | normalized lowercase for matching/search   |
| `address`      | string                                       | required                                   |
| `description`  | string                                       |                                            |
| `amenities`    | string[]                                     |                                            |
| `images`       | string[]                                     | URLs                                       |
| `status`       | `pending` \| `approved` \| `rejected`        | default `pending`                          |
| `rejectReason` | string                                       | required when rejected                     |
| `createdAt`    | Date                                         | timestamps                                 |
| `updatedAt`    | Date                                         | timestamps                                 |

Indexes: `{ partnerId: 1, createdAt: -1 }`; `{ status: 1, cityKey: 1 }`;
text index on `{ name, city, description }`.

## `roomTypes`

| Field            | Type      | Notes                              |
| ---------------- | --------- | ---------------------------------- |
| `_id`            | ObjectId  |                                    |
| `propertyId`     | ObjectId  | ref `properties`, required         |
| `name`           | string    | e.g. Deluxe Room                   |
| `basePricePaise` | integer   | >= 0, per room per night           |
| `totalRooms`     | integer   | >= 1                               |
| `maxGuests`      | integer   | >= 1                               |
| `createdAt`      | Date      | timestamps                         |
| `updatedAt`      | Date      | timestamps                         |

Indexes: `{ propertyId: 1, name: 1 }` unique; `{ propertyId: 1 }`.

## `inventory`

| Field        | Type     | Notes                                      |
| ------------ | -------- | ------------------------------------------ |
| `_id`        | ObjectId |                                            |
| `roomTypeId` | ObjectId | ref `roomTypes`, required                  |
| `propertyId` | ObjectId | ref `properties`, required                 |
| `date`       | string   | `'YYYY-MM-DD'` IST calendar night          |
| `pricePaise` | integer  | >= 0, nightly override                     |
| `totalRooms` | integer  | >= 1                                       |
| `booked`     | integer  | default 0                                  |
| `createdAt`  | Date     | timestamps                                 |
| `updatedAt`  | Date     | timestamps                                 |

Indexes: `{ roomTypeId: 1, date: 1 }` unique; `{ propertyId: 1, date: 1 }`.

Invariant: `0 <= booked <= totalRooms`, enforced by conditional atomic updates
(`$inc` with `booked: { $lte: totalRooms - qty }`) inside a transaction.

## `bookings`

| Field                | Type                                                                 | Notes                                          |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| `_id`                | ObjectId                                                             |                                                |
| `guestId`            | ObjectId                                                             | ref `users`, required                          |
| `partnerId`          | ObjectId                                                             | ref `users`, denormalized for partner queries  |
| `propertyId`         | ObjectId                                                             | ref `properties`                               |
| `roomTypeId`         | ObjectId                                                             | ref `roomTypes`                                |
| `city`               | string                                                               | snapshot                                       |
| `qty`                | integer                                                              | rooms booked, >= 1                             |
| `nights`             | string[]                                                             | `'YYYY-MM-DD'` nights                          |
| `priceBreakdown`     | object                                                               | immutable snapshot: room total, GST, total     |
| `status`             | `pending_payment` \| `confirmed` \| `cancelled` \| `expired` \| `payment_failed` | status machine                    |
| `holdExpiresAt`      | Date                                                                 | UTC instant; pending holds only                |
| `checkInDate`        | string                                                               | `'YYYY-MM-DD'` IST                             |
| `checkOutDate`       | string                                                               | `'YYYY-MM-DD'` IST, exclusive                  |
| `checkInAt`          | Date                                                                 | UTC instant (14:00 IST)                        |
| `checkOutAt`         | Date                                                                 | UTC instant (12:00 IST)                        |
| `guest`              | object                                                               | `{ name, email, phone }` snapshot              |
| `refundAmountPaise`  | integer                                                              | set on cancellation                            |
| `refundStatus`       | `none` \| `pending` \| `processed` \| `failed`                       |                                                |
| `refundedAt`         | Date                                                                 | UTC instant                                    |
| `cancellationReason` | string                                                               |                                                |
| `idempotencyKey`     | string                                                               | client-supplied, prevents duplicate holds      |
| `createdAt`          | Date                                                                 | timestamps                                     |
| `updatedAt`          | Date                                                                 | timestamps                                     |

Indexes: `{ guestId: 1, createdAt: -1 }`; `{ partnerId: 1, createdAt: -1 }`;
`{ status: 1, holdExpiresAt: 1 }` for the expiry cron;
`{ idempotencyKey: 1 }` unique sparse; `{ roomTypeId: 1, checkInDate: 1, checkOutDate: 1 }`.

## `payments`

| Field              | Type                                                   | Notes                                  |
| ------------------ | ------------------------------------------------------ | -------------------------------------- |
| `_id`              | ObjectId                                               |                                        |
| `bookingId`        | ObjectId                                               | ref `bookings`, required               |
| `gatewayOrderId`   | string                                                 | Razorpay order id, unique              |
| `gatewayPaymentId` | string                                                 | Razorpay payment id, unique sparse     |
| `amountPaise`      | integer                                                | >= 0                                   |
| `status`           | `created` \| `paid` \| `failed` \| `refunded`          | gateway-mirrored status                |
| `createdAt`        | Date                                                   | timestamps                             |
| `updatedAt`        | Date                                                   | timestamps                             |

Indexes: `{ bookingId: 1 }`; `{ gatewayOrderId: 1 }` unique;
`{ gatewayPaymentId: 1 }` unique sparse.

## Notes

- `priceBreakdown` and guest details are snapshots: later property price changes
  must not alter an existing booking.
- Booking transitions are conditional updates on the expected current status.
- Inventory rows are created for a date range when a partner sets availability;
  missing rows mean "not bookable", not "unlimited".
