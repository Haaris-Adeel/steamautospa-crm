# Steam Auto Spa CRM - Project Context

## Project Overview
Full-stack CRM system for managing mobile car detailing bookings, customers, employees, and marketing metrics.

- **Framework:** Next.js 16.3.1 (App Router)
- **Database:** SQLite with Prisma ORM
- **Authentication:** Next Auth with Cookie-based sessions
- **Sync:** Google Sheets (every 30 minutes), OneDrive, Manual sync
- **Port:** 3001

## Quick Start
```bash
npm run dev -- -p 3001
# Login at http://localhost:3001/login
# Credentials: admin@example.com / admin123
```

## Project Structure

### Core Directories
- `app/` - Next.js App Router (Server Components, API routes, pages)
- `app/lib/` - Shared utilities (auth, database, Google Sheets integration)
- `app/components/` - Reusable UI components
- `app/api/` - API endpoints
- `prisma/` - Database schema

### Key Routes
- `/` - Home (redirects to /login or /admin based on auth)
- `/login` - Login page
- `/admin/dashboard` - Admin dashboard (main entry point)
- `/admin/bookings` - Manage bookings
- `/admin/calendar` - Calendar view
- `/admin/customers` - Customer management
- `/admin/employees` - Employee management
- `/admin/expenses` - Expense tracking
- `/admin/reports` - Reports & analytics
- `/admin/settings` - Configuration (Google Sheets, OneDrive, etc.)
- `/employee` - Employee portal

## Database Schema

### Core Tables
- **User** - Admin/Employee accounts (id, email, name, role, password_hash)
- **Customer** - Customer records (id, name, email, phone, address)
- **Job** - Bookings/service jobs (id, customerId, title, date, price, status, address)
- **Employee** - Employee details (id, userId, hourlyRate, availability)
- **Expense** - Expense records
- **Setting** - Configuration key-value pairs (google_sheets_enabled, google_refresh_token, google_sheet_id, etc.)
- **MarketingMetrics** - Daily marketing data (adSpend, leads, bookingRate, etc.)

## Authentication System

### How It Works
1. User logs in with email/password at `/login`
2. Password checked against bcryptjs hash in User table
3. userId stored in cookie on successful login
4. On each request, `getCurrentUser()` checks cookie, queries User table
5. Redirects based on role: admin → /admin/dashboard, employee → /employee

### Key Files
- `app/lib/auth.ts` - `getCurrentUser()`, `requireAuth()`, `requireAdmin()`
- `app/api/auth/login/route.ts` - Login endpoint
- `app/api/auth/user/route.ts` - Get current user

### Demo Credentials
- Admin: `admin@example.com` / `admin123`
- Employee: `employee@example.com` / `emp123`

## Google Sheets Sync

### Configuration
1. User clicks "Connect Google Account" in Settings
2. Opens OAuth popup → user approves → callback saves refresh token
3. User enters their Bookings Google Sheet ID
4. System saves: `google_sheets_enabled=true`, `google_refresh_token=XXX`, `google_sheet_id=XXX`

### Auto-Sync Schedule
- **Frequency:** Every 30 minutes (`*/30 * * * *` cron)
- **File:** `app/lib/sync-scheduler.ts`
- **Triggered by:** App startup in `app/layout.tsx`

### Sync Flow
1. `performSync()` checks if Google Sheets enabled
2. Gets refresh token → gets valid access token
3. Fetches data from Google Sheet
4. Parses rows with header mapping (name, email, phone, address, service, date, time, price)
5. Creates/updates Customer and Job records
6. Jobs with past dates marked as "completed"

### Google Sheet Column Requirements
- `name` or `Customer Name` - Customer name
- `email` or `Email` - Customer email
- `phone` or `Phone Number` - Customer phone (optional)
- `address` or `Address` - Service address
- `service` or `Service` - Type of service
- `date` or `Date` - Appointment date (MM-DD-YY format)
- `time` or `Time` - Appointment time (HH:MM AM/PM)
- `price`/`charges` or `amount` - Service price

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Get current user
- `POST /api/auth/register` - Register new user

### Admin Dashboard
- `GET /api/admin/dashboard-data` - Dashboard metrics & KPIs
- `POST /api/admin/clear-and-sync` - Manual sync from Google Sheets
- `POST /api/admin/jobs` - Create job
- `GET /api/admin/jobs/[id]` - Get job details
- `POST /api/admin/jobs/[id]` - Update job

### Bookings
- `GET /api/admin/bookings` - List bookings
- `POST /api/admin/bookings` - Create booking

### Google Integration
- `GET /api/google/auth` - Get Google OAuth URL
- `GET /api/google/callback` - OAuth callback (saves tokens)
- `POST /api/google/sync` - Manual Google sync

### Settings
- `GET /api/settings/google` - Get Google config
- `POST /api/settings/google` - Save Google Sheet ID & enable sync

### Metrics
- `GET /api/metrics/fetch?period=last7days|thisMonth|allTime` - Get marketing metrics
- `POST /api/metrics/sync` - Sync metrics from Google Sheet

## Key Files to Know

### Authentication & Database
- `app/lib/auth.ts` - Auth utilities
- `app/lib/db.ts` - SQLite query/run functions
- `app/lib/googlesheets.ts` - Google Sheets API integration

### Pages
- `app/admin/dashboard/page.tsx` - Main admin dashboard
- `app/admin/settings/page.tsx` - Settings with Google & OneDrive config

### Styles
- `app/globals.css` - Global styles (Tailwind)
- `app/layout.tsx` - Root layout with sync scheduler initialization

## Common Tasks

### How to Add a New Admin Feature
1. Create page at `app/admin/[feature]/page.tsx`
2. Add auth check in useEffect
3. Create API endpoint at `app/api/admin/[feature]/route.ts`
4. Add navigation link in `app/components/Navigation.tsx`

### How to Modify Database
1. Update schema in `prisma/schema.prisma`
2. Run: `npx prisma migrate dev --name [change_name]`
3. Update query/run calls in your code

### How to Test Sync
1. Go to Settings page
2. Click "Connect Google Account"
3. Enter your Google Sheet ID
4. Click "Sync Now" or wait 30 minutes for auto-sync

## Environment Variables
Check `.env` and `.env.local` for:
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `DATABASE_URL` - SQLite database path (optional)

## Important Notes

### Sync Won't Work Until:
✅ Google account connected
✅ Google Sheet ID configured
✅ Sheet has correct columns
✅ Google Sheets enabled setting = true

### Common Issues
- **"Failed to get access token"** → Need to connect Google first
- **404 on /admin routes** → Make sure running on port 3001, not 3000
- **Bookings not syncing** → Check Google Sheet has required columns

## Recent Changes (Sept 2026)
- Added Google Sheets Bookings Sync configuration to Settings UI
- Set up auto-sync every 30 minutes
- Added Connect Google Account button
- Bookings Sheet ID configuration field

---
**Last Updated:** September 5, 2026
**Status:** Fully Functional with Google Sheets Sync Ready
