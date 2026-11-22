# Data model

Users, properties, room types and inventory have Mongoose schemas. The booking and payment sections describe planned collections. All collections have MongoDB’s default unique `_id` index in addition to the indexes listed below.

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

Email has a unique `{ email: 1 }` index.

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

Indexes are `{ partnerId: 1 }` and `{ cityKey: 1, status: 1 }`.

## `roomtypes` (RoomType)

| Field            | Type      | Notes                              |
| ---------------- | --------- | ---------------------------------- |
| `_id`            | ObjectId  |                                    |
| `propertyId`     | ObjectId  | ref `properties`, required         |
| `name`           | string    | e.g. Deluxe Room                   |
| `basePricePaise` | integer   | 100–10,000,000 paise per room per night           |
| `totalRooms`     | integer   | >= 1                               |
| `maxGuests`      | integer   | >= 1                               |
| `createdAt`      | Date      | timestamps                         |
| `updatedAt`      | Date      | timestamps                         |

The property lookup index is `{ propertyId: 1 }`.

## `inventories` (Inventory)

| Field        | Type     | Notes                                      |
| ------------ | -------- | ------------------------------------------ |
| `_id`        | ObjectId |                                            |
| `roomTypeId` | ObjectId | ref `roomtypes`, required                  |
| `propertyId` | ObjectId | ref `properties`, required                 |
| `date`       | string   | `'YYYY-MM-DD'` IST calendar night          |
| `pricePaise` | integer  | 100–10,000,000 paise per night                     |
| `totalRooms` | integer  | >= 1                                       |
| `booked`     | integer  | default 0                                  |

Indexes: `{ roomTypeId: 1, date: 1 }` unique; `{ propertyId: 1, date: 1 }`.

Capacity edits preserve `0 <= booked <= totalRooms` by matching only nights with `booked <= proposed totalRooms`. A transaction rolls back the entire range if fewer nights match than requested.

## `bookings` (planned)

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

## `payments` (planned)

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
- Each new room type starts with 365 nights. Startup and the daily extension job append missing nights at the end of the window using the room type’s base price and room count. A missing night has no bookable inventory.
