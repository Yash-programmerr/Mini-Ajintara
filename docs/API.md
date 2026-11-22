# API (planned)

Everything below is **planned** and not implemented yet. The only live endpoint
today is `GET /api/health`.

| Method | Path                                        | Access        | Description                                  | Status  |
| ------ | ------------------------------------------- | ------------- | -------------------------------------------- | ------- |
| POST   | `/api/auth/signup`                          | Public        | Create a guest account                       | planned |
| POST   | `/api/auth/login`                           | Public        | Email/password login, returns JWT            | planned |
| GET    | `/api/auth/me`                              | Authenticated | Current user profile                         | planned |
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
| GET    | `/api/partner/properties`                   | Partner       | List own properties                          | planned |
| POST   | `/api/partner/properties`                   | Partner       | Create a property (pending approval)         | planned |
| GET    | `/api/partner/properties/:id`               | Partner       | Own property details                         | planned |
| PATCH  | `/api/partner/properties/:id`               | Partner       | Update own property                          | planned |
| POST   | `/api/partner/properties/:id/room-types`    | Partner       | Add a room type                              | planned |
| PATCH  | `/api/partner/room-types/:id`               | Partner       | Update own room type                         | planned |
| GET    | `/api/partner/inventory`                    | Partner       | Read date-wise inventory                     | planned |
| PUT    | `/api/partner/inventory`                    | Partner       | Set date-wise price and room count           | planned |
| GET    | `/api/partner/bookings`                     | Partner       | Bookings for own properties                  | planned |
| GET    | `/api/admin/dashboard`                      | Admin         | Counts and revenue summary                   | planned |
| GET    | `/api/admin/properties`                     | Admin         | Properties filtered by status                | planned |
| PATCH  | `/api/admin/properties/:id/approve`         | Admin         | Approve a property                           | planned |
| PATCH  | `/api/admin/properties/:id/reject`          | Admin         | Reject a property with a reason              | planned |
| GET    | `/api/admin/users`                          | Admin         | List users                                   | planned |
| PATCH  | `/api/admin/users/:id/block`                | Admin         | Block or unblock a user                      | planned |
| GET    | `/api/admin/bookings`                       | Admin         | List all bookings                            | planned |
