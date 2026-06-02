# Installation Guide

## Requirements

- PHP 8.2 or newer
- Composer
- MySQL 8 or MariaDB 10.6+
- Node.js 20 or newer
- HTTPS-capable hosting for production PWA installation and service worker support

## Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Update `.env`:

```env
DB_DATABASE=dsh
DB_USERNAME=your_mysql_user
DB_PASSWORD=your_mysql_password
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
```

Run:

```bash
php artisan migrate --seed
php artisan serve
```

If you already migrated the first scaffold, run this after pulling the latest files:

```bash
php artisan migrate
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env` if the API is not on `http://localhost:8000/api`:

```env
VITE_API_URL=https://your-api-domain.com/api
```

## PWA Installation

1. Open the frontend URL in Chrome, Edge or Android Chrome.
2. Use the browser install action.
3. Confirm the app opens in standalone mode.
4. Test offline by disabling internet and creating a sale.
5. Re-enable internet and use the sync button.

The frontend starts empty by design. Add products, customers and suppliers from the admin panel before creating sales or purchases.

## Deployment Checklist

- Use HTTPS for frontend and backend.
- Set `APP_ENV=production` and `APP_DEBUG=false`.
- Configure MySQL backups.
- Run `php artisan config:cache`.
- Run `npm run build` and deploy `frontend/dist`.
- Use a real queue driver for sync jobs and backups.
- Rotate the seeded admin password.
- Configure role permissions before adding staff accounts.
