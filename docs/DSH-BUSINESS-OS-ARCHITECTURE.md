# DSH Business OS — Architecture Blueprint

## Goal

Transform MSM from a large multi-module screen into a single **business-aware, offline-first operating system**. The user connects/activates one business profile and sees only the workflows and data belonging to that business.

## Current-state findings

- `src/main.jsx` is a large monolithic application containing navigation, business-type filtering, role filtering, and many business-specific workflows.
- `src/lib/db.js` already provides a strong IndexedDB/offline foundation, including tenant-scoped stores and a sync queue.
- The service worker must remain an application-shell/cache layer; business data must remain in IndexedDB and sync through the API.
- The backend already exposes shared resources plus business-specific enterprise endpoints and a push/pull sync API.

## Target architecture

```text
DSH Business OS
├── Core
│   ├── Auth / License / Tenant
│   ├── User / Role / Permission
│   ├── Offline Store / Sync Engine
│   ├── Settings / Branding / Localization
│   ├── Notifications / Audit
│   ├── Printing / Barcode / Hardware adapters
│   └── Shared Reports
│
├── Business Registry
│   ├── Store
│   ├── Pharmacy
│   ├── Mobile Shop
│   ├── Hospital
│   ├── Traders / Distribution
│   ├── Restaurant
│   ├── Repair
│   └── Future business packs
│
└── Business Packs
    ├── Store: POS, Inventory, Customers, Suppliers, Purchases, Expenses
    ├── Pharmacy: Store core + Medicines, batches, expiry, prescriptions
    ├── Mobile: Store core + IMEI, warranty, repairs, returns
    ├── Hospital: Patients, clinical workflows, pharmacy, lab, radiology, billing
    └── Traders: Inventory + companies, territories, salesmen, retailers, challans, recovery
```

## Key rule: business context controls data

The active tenant/license must resolve a normalized `business_type` before business screens or records are hydrated.

```text
Login / License activation
        ↓
Tenant + Business Profile
        ↓
Module Registry
        ↓
Allowed navigation
        ↓
Allowed local stores
        ↓
Allowed API resources
        ↓
Business data hydration
```

A Store account must never hydrate Hospital/Trader/Mobile-specific data merely because those stores exist in IndexedDB. Existing local records must be filtered by tenant and business context before display.

## Module registry

Replace scattered `Set` constants with one registry describing:

- module id
- business types
- required permissions
- route/screen
- icon/title keys
- local stores used
- API resources/endpoints used
- whether it is core or business-specific

The registry becomes the single source of truth for navigation and data hydration.

## UI/UX direction

The new shell should be touch-first and responsive for desktop POS terminals, tablets and touch laptops.

- Minimum touch target: 48px; primary POS actions 56–72px.
- Persistent global search/barcode action.
- Clear business-aware sidebar/bottom navigation.
- POS uses a two-pane touch layout: product/category area + cart/payment area.
- Keep common actions in predictable locations.
- Reduce visible modules; use contextual actions and grouped navigation.
- Support keyboard and scanner workflows without making them mandatory.
- Add explicit Online / Offline / Syncing / Pending states.
- RTL must be a first-class layout mode for Urdu and Arabic.

## Localization

Introduce an i18n layer before translating screens. All user-facing strings become translation keys. Initial locales:

- English (`en`)
- Urdu (`ur`, RTL)
- Arabic (`ar`, RTL)
- Chinese Simplified (`zh-CN`)
- Hindi (`hi`)
- Russian (`ru`)

Business data is not translated automatically; labels, navigation, validation messages and UI copy are.

## Offline-first contract

1. Reads use IndexedDB first.
2. Writes commit locally first with UUID, tenant/license and business context.
3. Every mutation enters the sync queue exactly once.
4. Sync retries safely and is idempotent.
5. Pull only hydrates records authorized for the active tenant/business.
6. Conflicts are detected and surfaced rather than silently overwriting data.
7. The service worker caches app assets, not arbitrary business responses.

## Data safety

Never perform a destructive store/database migration as part of the UI redesign. Existing stores and records must be preserved until a versioned migration plan has been tested.

## Refactor sequence

1. Freeze current behavior with an audit/test matrix.
2. Create canonical business registry and normalized business-type mapping.
3. Create core application shell and contextual navigation.
4. Extract POS, Inventory, Customers, Purchases, Reports and Settings into feature boundaries.
5. Add business-specific feature packs without changing database contracts.
6. Harden IndexedDB tenant/business filtering and sync lifecycle.
7. Replace service-worker catch-all caching with static asset caching.
8. Add i18n and RTL.
9. Add touch/keyboard/scanner accessibility pass.
10. Run cross-business offline/online regression tests before deleting legacy UI paths.

## Non-goals for the first refactor

- No database rewrite.
- No Laravel replacement.
- No replacement of IndexedDB with a remote-only model.
- No deletion of existing business data.
- No removal of business capabilities until their replacement path is tested.
