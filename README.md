# TMS Burger

A campus burger ordering web app for Addis Ababa University (AAU), built with
React, TanStack Start/Router, Tailwind CSS, and Supabase.

## Requirements

- Node.js 22.12 or newer (or Node.js 20.19 or newer)
- npm
- A Supabase project for authentication and application data

The versions of the application packages are recorded in `package-lock.json`.
Use `npm ci` to install the exact locked dependency set. This installs the
project's runtime and development dependencies; no separate global Vite,
TypeScript, or test-runner installation is required.

## Run locally

```powershell
npm ci
Copy-Item .env.example .env
```

Edit `.env` and replace the sample values with your Supabase project URL and
publishable key. For local Supabase credentials, find these in the Supabase
Dashboard under **Project Settings → API**.

The browser uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
Server rendering uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; set both
sets to the same project and publishable key. Do not put a service-role key in
any `VITE_` variable. `SUPABASE_SERVICE_ROLE_KEY` is optional and must remain
server-only; it is only needed if trusted server code uses the admin client.

Start the development server:

```powershell
npm run dev
```

Open the URL Vite prints in the terminal (normally `http://localhost:8080`).
If that port is in use, Vite may choose another port.

## Supabase setup

Run the SQL files in `drizzle/migrations` in numerical order in the Supabase
SQL Editor:

1. `0000_migration.sql` — core schema, roles, menu, delivery areas, orders,
   payments, and database functions.
2. `0001_menu_photos.sql` — private burger-photo storage and admin upload
   policies.
3. `0002_preorder_schedule.sql` — today/tomorrow preorder dates, admin date
   availability controls, breakfast/lunch/dinner availability, and database
   order validation. The business timezone is `Africa/Addis_Ababa`.
4. `0003_order_notifications.sql` — notification table and payment-review
   notifications.
5. `0004_notification_timing.sql` — admin alerts when payment proof is
   submitted and one reminder for an unpaid order after one hour. This uses
   Supabase's `pg_cron` extension to check every five minutes; enable that
   extension if your project does not have it enabled.

The first account created after applying the core migration is assigned the
admin role by the database trigger. Sign in with that account to manage the
menu, availability, orders, and payment reviews.

### Google sign-in

In Supabase, enable Google under **Authentication → Sign In / Providers** and
configure the Google OAuth credentials. Add your local app URLs to Supabase's
**Authentication → URL Configuration → Redirect URLs**, including both
`http://localhost:8080/**` and `http://localhost:8081/**` if Vite may use either
port. The Google Cloud authorized redirect URI should be the Supabase Auth
callback URL shown in Supabase's Google-provider settings.

## Web functionality

- Browse the burger menu and extras; add configured items to a session-persistent
  cart.
- Create an account, sign in with email or Google, and view personal orders.
- Place a preorder for today or tomorrow when the date and selected meal period
  are open.
- Choose an AAU delivery area and submit payment details and optional receipt
  for bank transfer.
- Follow order and payment progress, including verification, rejection notes,
  and scheduled delivery date/meal period.
- Receive in-app reminders for unpaid orders and payment-status notifications.
  Admins receive in-app notifications when payment proof needs review.
- Use the owner area to manage the menu, delivery areas, meal/date availability,
  and payment reviews.
- Switch between dark and light themes; browse the About page.

Payment account information displayed to customers is configured in
`src/lib/shop.ts`. Keep those details current before accepting real payments.

Notifications are in-app only. They appear while users are signed in; this
project does not currently send SMS or email.

## Common commands

```powershell
npm run dev       # Start the local development server
npm test          # Run tests
npm run lint      # Run ESLint
npm run build     # Create the production build
npm run preview   # Preview a production build
```

## Project structure

- `src/app/` — app setup and file-based route definitions.
- `src/features/` — feature pages and domain-specific UI.
- `src/shared/` — reusable UI, layouts, and feedback components.
- `src/services/` — Supabase and other backend service functions.
- `src/hooks/` — reusable hooks.
- `src/lib/` — shared client utilities and state.
- `src/integrations/supabase/` — Supabase clients and generated database types.
- `src/styles/` — global styles.
- `drizzle/migrations/` — SQL migrations for the Supabase database.
