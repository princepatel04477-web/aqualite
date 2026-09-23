# Aqualite

Footwear store prototype. India-first: INR, GST-inclusive MRP, UK sizing primary.

## Code law
- No `any`. Use `unknown` and Zod.
- No `console.log`. Use `lib/logger.ts`.
- No TODOs, stubs, or client-owned prices. Money is integer paise.
- Server secrets stay behind `import "server-only"`.
- Colour, type, spacing, duration and easing come from `styles/tokens.css` and `lib/motion/tokens.ts`.

## Animation ownership
- GSAP: scroll-driven and timeline motion.
- Motion (`motion/react`): presence, gestures, layout.
- React Bits: only whitelisted components, only where assigned.
- Two libraries never animate the same property on the same element.

## Before editing
Check which prompt owns the file. Build only what the current task asks.

## Local prototype
If Supabase keys are placeholders and the URL is localhost, the store runs on the local commerce engine in `.data/store.json`. Stock, carts, orders and payments are real inside that engine. Connect Supabase by replacing the env values — migrations live in `supabase/migrations`.

## Demo sign-in
Any email receives an on-screen OTP in local mode. `admin@aqualite.in` is granted the admin role.
