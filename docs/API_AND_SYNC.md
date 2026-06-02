# API And Sync Notes

## Authentication

- `POST /api/login`
- `GET /api/me`
- `POST /api/logout`

Authentication uses Laravel Sanctum bearer tokens for API clients.

## Core Resources

The backend exposes REST endpoints for:

- `/api/products`
- `/api/categories`
- `/api/brands`
- `/api/customers`
- `/api/sales`
- `/api/suppliers`
- `/api/purchases`
- `/api/expenses`
- `/api/cashbook`
- `/api/repair-jobs`
- `/api/settings`

## Sync Push

`POST /api/sync/push`

```json
{
  "device_id": "device-uuid",
  "operations": [
    {
      "uuid": "record-uuid",
      "entity": "products",
      "action": "update",
      "data": {},
      "client_updated_at": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```

The server returns `accepted`, `rejected` or `conflict` per operation.

## Conflict Rule

Current policy is server-wins when the server `updated_at` is newer than `client_updated_at`. The client should show conflicted records for manual review by an admin.

## Duplicate Protection

Every offline-created record receives a UUID. Sync writes use `updateOrCreate` by UUID, preventing duplicate rows when the same operation is retried.
