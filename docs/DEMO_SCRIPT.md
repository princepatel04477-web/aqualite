# Aqualite demo — 10 minutes

1. Home. The headline, the floating Tide slide, the category index.
2. Shop men. Filter UK 9. Open Tide Slide, Midnight / Aqua.
3. Choose UK 8 (two left) and add to bag. The drawer shows the server total.
4. Checkout. Use any 10-digit mobile starting 6–9 and pincode 400001 (Mumbai, COD available).
5. Pay online. This prototype confirms in test mode — no charge — and lands on the order page.
6. Sign in at /login with `admin@aqualite.in`. The six-digit code is shown on the page.
7. Open /admin. The order is on the desk. Pack it, then ship it with a carrier and tracking number. The email is queued in the local outbox.
8. Inventory shows low sizes. A restock writes a ledger row.

Reset local orders and stock with `pnpm demo:reset` (deletes `.data/store.json`; the catalogue seed remains).

Test card and UPI apply only after real Razorpay keys replace the placeholders in `.env.local`.
