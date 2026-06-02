# DSH - Digital Solutions Hub

Enterprise-grade offline-first Mobile Shop Management System for sales, inventory, customer credit, suppliers, purchases, expenses, repairs, accounting and reporting.

## Project Layout

- `backend/` - Laravel 12 REST API, Sanctum auth, migrations, seeders and sync services.
- `frontend/` - React + Vite + Tailwind PWA with IndexedDB offline storage and service worker caching.
- `docs/` - Installation guide, user manual and API/sync notes.

## Current Implementation

The repository contains a production-oriented scaffold:

- Role-aware auth entry points for Super Admin, Admin, Sales Staff and Inventory Manager.
- Database schema for all requested tables.
- Resource APIs for core modules.
- Queue-based offline sync endpoints with conflict detection.
- Installable PWA shell with dashboard, sales, products, customers, repairs and settings screens.
- IndexedDB local persistence, pending operation queue and sync status indicator.
- Empty production data by default: records are created through the admin forms, POS, purchases, payments and repair screens.

## Quick Start

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for full setup.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Default seeded backend login:

- Email: `admin@dsh.local`
- Password: `password`

## Production Notes

Before production launch, enable HTTPS, configure cloud MySQL backups, replace the default admin password, run queue workers, configure scheduled database backups and review permission policies for each route.
