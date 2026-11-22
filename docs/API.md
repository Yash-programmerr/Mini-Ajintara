# API

Health, authentication, partner property management and admin property review are implemented. All A2 endpoints require a bearer token with the indicated database role.

| Method | Path                                        | Access        | Description                                  | Status  |
| ------ | ------------------------------------------- | ------------- | -------------------------------------------- | ------- |
| POST   | `/api/auth/signup`                          | Public        | Create a guest or partner account                       | implemented |
| POST   | `/api/auth/login`                           | Public        | Email/password login, returns JWT            | implemented |
| GET    | `/api/auth/me`                              | Authenticated | Current user profile                         | implemented |
| GET    | `/api/properties`                           | Public        | Search approved properties by city/dates     | planned |
| GET    | `/api/properties/:id`                       | Public        | Property details with room types             | planned |
| GET    | `/api/properties/:id/availability`          | Public        | Nightly availability and prices              | planned |
| POST   | `/api/bookings`                             | Guest         | Create a pending_payment hold                | planned |
| GET    | `/api/bookings`                             | Guest         | List own bookings                            | planned |
| GET    | `/api/bookings/:id`                         | Guest         | Own booking details                          | planned |
| POST   | `/api/bookings/:id/cancel`                  | Guest         | Cancel and calculate refund                  | planned |
| POST   | `/api/payments/orders`                      | Guest         | Create a Razorpay order for a held booking   | planned |
| POST   | `/api/payments/verify`                      | Guest         | Verify checkout signature                    | planned |
| POST   | `/api/payments/webhook`                     | Razorpay      | Signed webhook, raw body                     | planned |
| GET    | `/api/partner/properties`                   | Partner       | List own properties                          | implemented |
| POST   | `/api/partner/properties`                   | Partner       | Create a property (pending approval)         | implemented |
| GET    | `/api/partner/properties/:id`               | Partner       | Own property details                         | implemented |
| PATCH  | `/api/partner/properties/:id`               | Partner       | Update own property                          | implemented |
| POST   | `/api/partner/properties/:id/room-types`    | Partner       | Add a room type                              | implemented |
| PATCH  | `/api/partner/room-types/:id`               | Partner       | Update own room type                         | implemented |
| GET    | `/api/partner/room-types/:id/inventory`                    | Partner       | Read date-wise inventory                     | implemented |
| PUT    | `/api/partner/room-types/:id/inventory`                    | Partner       | Set date-wise price and room count           | implemented |
| GET    | `/api/partner/bookings`                     | Partner       | Bookings for own properties                  | planned |
| GET    | `/api/admin/dashboard`                      | Admin         | Counts and revenue summary                   | planned |
| GET    | `/api/admin/properties`                     | Admin         | Properties filtered by status                | implemented |
| GET | `/api/admin/properties/:id` | Admin | Review property details, partner and room types | implemented |
| PATCH | `/api/admin/properties/:id/review` | Admin | Approve or reject a pending property | implemented |
| GET    | `/api/admin/users`                          | Admin         | List users                                   | planned |
| PATCH  | `/api/admin/users/:id/block`                | Admin         | Block or unblock a user                      | planned |
| GET    | `/api/admin/bookings`                       | Admin         | List all bookings                            | planned |

## Authentication examples

Send JSON bodies with `Content-Type: application/json`. Signup and login share
the per-IP attempt limit. Excess attempts receive `429 RATE_LIMITED`.

### POST /api/auth/signup

```json
{"name":"Yash","email":"yash@example.com","password":"<your-password>","role":"guest"}
```

Role defaults to `guest` and also accepts `partner`. A successful request returns HTTP 201.

```json
{"token":"<JWT>","user":{"id":"67aa12345678901234567890","name":"Yash","email":"yash@example.com","role":"guest","isBlocked":false,"createdAt":"2026-01-01T12:00:00.000Z","updatedAt":"2026-01-01T12:00:00.000Z"}}
```

### POST /api/auth/login

```json
{"email":"yash@example.com","password":"<your-password>"}
```

A successful request returns HTTP 200.

```json
{"token":"<JWT>","user":{"id":"67aa12345678901234567890","name":"Yash","email":"yash@example.com","role":"guest","isBlocked":false,"createdAt":"2026-01-01T12:00:00.000Z","updatedAt":"2026-01-01T12:00:00.000Z"}}
```

### GET /api/auth/me

```http
GET /api/auth/me HTTP/1.1
Authorization: Bearer <JWT>
```

A successful request returns HTTP 200.

```json
{"user":{"id":"67aa12345678901234567890","name":"Yash","email":"yash@example.com","role":"guest","isBlocked":false,"createdAt":"2026-01-01T12:00:00.000Z","updatedAt":"2026-01-01T12:00:00.000Z"}}
```

## A2 requests and responses

The examples below use `:id` for a property or room type ID, as indicated by the route. Dates are IST calendar strings. Some response examples show selected fields for readability.

### Partner listings

`POST /api/partner/properties` accepts the following JSON.

```json
{"name":"Mandovi Verandah","city":" Goa ","address":"18 Rua de Ourem, Panaji","description":"A courtyard house near the river.","amenities":["Wi-Fi","Breakfast"],"images":["https://picsum.photos/seed/mandovi/800/600"]}
```

HTTP 201 returns the saved property, including the supplied listing fields and server-managed fields.

```json
{"property":{"id":"67aa12345678901234567891","partnerId":"67aa12345678901234567890","name":"Mandovi Verandah","city":"Goa","cityKey":"goa","status":"pending","rejectReason":null}}
```

| Request | Example body | Example result |
| --- | --- | --- |
| `GET /api/partner/properties` | — | `{"properties":[{"id":"67aa12345678901234567891","status":"pending","rejectReason":null,"roomTypes":[]}]}` |
| `GET /api/partner/properties/:id` | — | `{"property":{"id":"67aa12345678901234567891","roomTypes":[]}}` |
| `PATCH /api/partner/properties/:id` | `{"city":"New Delhi"}` | `{"property":{"city":"New Delhi","cityKey":"new delhi"}}` |
| `POST /api/partner/properties/:id/room-types` | `{"name":"Verandah King","basePricePaise":750000,"totalRooms":4,"maxGuests":3}` | HTTP 201, `{"roomType":{"id":"67aa12345678901234567892","name":"Verandah King","basePricePaise":750000,"totalRooms":4,"maxGuests":3}}` |
| `PATCH /api/partner/room-types/:id` | `{"name":"Garden King","maxGuests":2}` | `{"roomType":{"id":"67aa12345678901234567892","name":"Garden King","maxGuests":2}}` |

Property writes accept only name, city, address, description, amenities and 1–10 HTTPS images. A PATCH requires at least one editable field. A pending property can have rooms. Room creation initializes 365 nights and room type PATCH accepts only name and maxGuests. Requests for another partner’s resources return `404 NOT_FOUND`. Malformed IDs return `400 INVALID_ID`.

### Partner inventory

Both endpoints use inclusive dates and allow at most 366 nights per request. Writes must fit inside the current 365-night window. Use dates in your local demo’s window when trying the example.

```http
GET /api/partner/room-types/:id/inventory?from=2026-12-24&to=2026-12-24
```

```json
{"inventory":[{"date":"2026-12-24","pricePaise":750000,"totalRooms":4,"booked":1,"availableRooms":3}]}
```

`PUT /api/partner/room-types/:id/inventory` accepts a price, a room count or both.

```json
{"from":"2026-12-24","to":"2026-12-26","pricePaise":800000,"totalRooms":3}
```

HTTP 200 returns `{"updatedDays":3}`. Reversed or oversized ranges return `400 INVALID_RANGE`. Writes outside the bookable window return `400 OUT_OF_WINDOW`. A conflicting or missing night aborts every change in the range and returns HTTP 409.

```json
{"error":{"code":"ROOMS_ALREADY_BOOKED","message":"The listed nights have more bookings than the requested capacity or are missing inventory.","details":["2026-12-25"]}}
```

### Admin review

`GET /api/admin/properties?status=pending&page=1&limit=10` defaults to those values. Status also accepts `approved` or `rejected`. The maximum limit is 50. The partner object includes the owner’s public ID, name and email.

```json
{"items":[{"id":"67aa12345678901234567891","name":"Mandovi Verandah","status":"pending","partnerId":{"id":"67aa12345678901234567890","name":"Devika Naik","email":"partner1@ajintara.test"}}],"page":1,"limit":10,"total":1,"totalPages":1}
```

| Request | Example body | Example result |
| --- | --- | --- |
| `GET /api/admin/properties/:id` | — | `{"property":{"name":"Mandovi Verandah","images":["https://picsum.photos/seed/mandovi/800/600"],"roomTypes":[{"name":"Garden King","maxGuests":2}]}}` |
| `PATCH /api/admin/properties/:id/review` | `{"action":"approve"}` | `{"property":{"status":"approved","rejectReason":null}}` |
| `PATCH /api/admin/properties/:id/review` | `{"action":"reject","reason":"Please confirm the street entrance."}` | `{"property":{"status":"rejected","rejectReason":"Please confirm the street entrance."}}` |

Reject requires a trimmed reason of 5–300 characters. A second review of the same submission returns `409 NOT_PENDING`. Editing a rejected listing resubmits it.
