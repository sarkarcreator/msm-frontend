# Catalog Price And Bulk Delete Fix

## Root Cause

Master Catalog pricing fields existed in the UI and database, but the full flow was inconsistent:

- Frontend CSV import saved raw aliases such as `cost_price`, `purchase_price`, `selling_price`, and `sale_price` without normalizing them into `default_cost` and `default_price`.
- Frontend display formatting did not treat `default_cost` and `default_price` as money fields, so catalog prices could appear missing or inconsistent in listing/detail/print output.
- Backend generic resource payload handling did not validate or normalize Master Catalog price aliases.
- Product creation from catalog already used `default_cost` and `default_price`, so bad catalog values propagated into inventory and then POS/sales pricing.
- Product deletion was one-row-at-a-time only; there was no transaction-safe bulk delete API.

## Files Changed

- `src/main.jsx`
- `src/lib/db.js`
- `src/styles/app.css`
- `backend/routes/api.php`
- `backend/app/Http/Controllers/Api/ResourceController.php`
- `backend/app/Models/MasterCatalog.php`
- `audit-report/CATALOG-PRICE-AND-BULK-DELETE-FIX.md`

## API Changes

- Added bulk delete endpoint for every generic resource route:
  - `DELETE /api/products/bulk`
  - `DELETE /api/master-catalogs/bulk`
  - Same pattern applies to existing ResourceController API resources.
- Request body:
  ```json
  { "uuids": ["uuid-1", "uuid-2"] }
  ```
- Optional query:
  - `?force=1` for permanent delete.
- Response:
  ```json
  { "deleted_count": 2, "deleted_ids": ["uuid-1", "uuid-2"] }
  ```

## Database Changes

No new migration was required. Existing `master_catalogs.default_cost` and `master_catalogs.default_price` columns are used.

## Frontend Changes

- Normalized Master Catalog import aliases:
  - `default_cost`, `cost_price`, `purchase_price`, `unit_cost_price`, `cost`
  - `default_price`, `selling_price`, `sale_price`, `unit_sale_price`, `price`
- Master Catalog save now clamps frontend cost/price values to non-negative numbers.
- Master Catalog list/detail/print formatting now displays `default_cost` and `default_price` as money.
- Product creation from catalog continues to inherit:
  - `purchase_price` from `default_cost`
  - `sale_price` from `default_price`
- Added DataTable checkbox selection and select-all support.
- Added bulk delete buttons and confirmation dialogs to:
  - Master Catalog
  - Inventory Products
- Bulk delete removes local rows immediately, calls the backend bulk endpoint when online, syncs, refreshes, and shows success/failure notifications.

## Verification Steps

1. Create a Master Catalog item with Default Cost and Default Price.
2. Confirm listing/detail show both prices as money.
3. Edit the catalog item and confirm updated prices persist after refresh.
4. Import CSV rows using alias columns like `purchase_price` and `selling_price`; confirm they map to `default_cost` and `default_price`.
5. Add catalog item to inventory; confirm inventory `purchase_price` and `sale_price` inherit the catalog prices.
6. Open POS and confirm the product card uses the inventory sale price.
7. Complete sale and confirm the sale line uses the expected selling price.
8. Select multiple catalog rows and bulk delete; confirm rows disappear and refresh stays clean.
9. Select multiple inventory products and bulk delete; confirm products disappear from Inventory and POS after refresh.
10. Run frontend build.

## Risks

- Permanent bulk delete can remove linked product history if an admin chooses force delete.
- Offline bulk delete queues local tombstones first; backend failure is surfaced, but retry still depends on sync credentials/network.
- Generic bulk route is available to all ResourceController resources, but frontend currently exposes it only for Master Catalog and Inventory Products.

## Rollback Plan

1. Revert the commit.
2. Run frontend build.
3. Redeploy/push the reverted frontend and backend.
4. If any accidental soft deletes occurred, restore rows from Laravel soft deletes or backup.
5. If force deletes occurred, restore affected rows from database backup.
