# Aqualite Ivory & Red demo — 12 minutes

1. Open `/`. Confirm the ivory canvas, red CTA discipline, announcement text and footer business identity.
2. Open Shop, filter a category, open a product and add a size to bag. Confirm the server total and cart free-shipping meter use the same threshold.
3. Checkout with pincode `400001`; confirm shipping and COD rules. Use test payment mode only.
4. Sign in at `/login` with `admin@aqualite.in`; the local prototype displays the six-digit OTP.
5. Open `/seller`. Show the overview and responsive navigation; `/admin` redirects here.
6. Open **Settings → Business**. Save a validated GSTIN and support details. Show the success message and **Audit log** entry.
7. Open **Settings → Shipping**. Change the free-shipping threshold. Show the preview, then refresh checkout, the cart meter and `/shipping` to demonstrate the shared value.
8. Open **Settings → Users & permissions**. Explain the least-privilege matrix: owner, manager, finance, packer and viewer. Viewer is read-only and mutation APIs remain protected by RLS in production.
9. Open **Catalog → Add product**, complete the wizard, add a variation and publish. Verify the listing in the storefront.
10. Open **Pricing**, schedule a sale, then inspect its audit/price history. Server-side validation prevents a sale price above MRP.
11. Open Orders, pack and ship the order with a carrier and tracking number. The email is queued in the local outbox.
12. Open Audit log and show the readable settings, price, inventory and order history.

## Performance handover

Run `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm run tokens:check`, and `npm run test:e2e`. Run Lighthouse against a production build and record the results in `docs/PERF.md`. Capture the current screenshots at 1440px and 390px under `docs/screenshots/` for the Seller Hub guide.

Reset local orders and stock with `pnpm demo:reset`; the catalogue seed remains. Test card and UPI apply only after real Razorpay keys replace placeholders in `.env.local`.
