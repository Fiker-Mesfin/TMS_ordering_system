## Project architecture

- Route definitions live in `src/app/routes`; pages and domain UI live in `src/features`.
- Shared UI, layout and feedback components live in `src/shared`.
- Keep Supabase operations server-authoritative where database functions are defined.
- Order placement, payment proof and payment review run as SECURITY DEFINER Postgres functions (place_order, submit_payment_proof, review_payment); orders/payments have no client write policies — keeps pricing and status changes server-authoritative.
- Owner access uses the user_roles table + has_role(); the first account that signs up becomes admin via the signup trigger.
- Cart lives in localStorage (`src/lib/cart.tsx`) and only carries ids/quantities to the server; displayed prices there are estimates.
