# Handover

## What is real
- Catalogue, prices, GST-inclusive tax split, shipping threshold (₹999), COD fee and cap.
- Cart cookie, stock reservation on online checkout, immediate commit on COD, idempotent payment confirm.
- Guest order links require the access token. Wrong token is a 404.
- Admin role is the email `admin@aqualite.in` after OTP.

## What is demo
- Photography is a monsoon capsule, not the full 24-SKU sheet. Add pairs in `content/catalog.ts` and `public/catalog/`.
- Payments run in local test mode until Razorpay keys are real. The client amount is never trusted.
- Emails are written to the local outbox until a Resend key and verified domain are set.
- Company fields in `content/site.ts` are `verified: false` (GSTIN, address, grievance officer). Legal pages show a draft banner.
- Stats on the homepage are marked unverified.
- Kids’ edit is empty until photography arrives.

## Swap the colour
Only `styles/tokens.css`. Do not hard-code hex in components.

## Go live on Razorpay
Policy pages, a real GSTIN, and a verified domain. Point the webhook at `/api/webhooks/razorpay`. Until then, keep test keys.
