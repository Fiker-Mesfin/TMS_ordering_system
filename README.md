# TMS Burger

A React and TanStack Start ordering app for Addis Ababa campus delivery.

## Development

Install dependencies and run the local development server:

```sh
npm install
npm run dev
```

The app is served at `http://localhost:8080`.

Useful commands:

```sh
npm test
npm run lint
npm run build
```

## Project structure

- `src/app/` contains the router, application setup, server entry, and file-based route definitions.
- `src/features/` contains feature pages and domain-specific code.
- `src/shared/` contains reusable UI, layout, and feedback components.
- `src/services/` is for backend service functions.
- `src/hooks/` is for reusable hooks.
- `src/lib/` contains shared client utilities and state.
- `src/integrations/supabase/` contains the current Supabase integration.
- `src/styles/` contains global styles.

TanStack Query manages backend query state. Supabase is currently configured with the existing project credentials; replace those settings with your own when your Supabase project is ready.

To enable owner-added burger photos, apply `drizzle/migrations/0001_menu_photos.sql`
to the configured Supabase project. It creates the private `menu-photos` bucket
and limits uploads to administrators and supported image types.

Apply `drizzle/migrations/0002_preorder_schedule.sql` after the previous
migrations to enable same-day and next-day preorder dates, admin date closures,
and breakfast/lunch/dinner availability controls. The database uses
`Africa/Addis_Ababa` as the business timezone and validates delivery date and
meal availability when creating each order.

Apply `drizzle/migrations/0003_order_notifications.sql` after migration 0002,
then apply `drizzle/migrations/0004_notification_timing.sql`. Enable the
`pg_cron` extension in Supabase before applying migration 0004. It notifies
admins only when a customer submits payment proof for verification and creates
one in-app reminder if an order is still unpaid after one hour (the scheduled
check runs every five minutes). Customers also get in-app notifications when
payment is verified or rejected. Notifications are saved in Supabase and shown
when signed-in users return to the site; this does not send email or SMS.

Auth and cart client state remain in the existing React context providers in
`src/lib/`. Google sign-in uses Supabase Auth, so the Google provider and local
redirect URL must be enabled in the current Supabase project's Auth settings.
