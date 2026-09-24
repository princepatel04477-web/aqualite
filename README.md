# Aqualite

A working footwear store prototype: catalogue, cart, checkout (test-mode pay and COD), accounts, and a small admin desk.

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local`. Placeholder Supabase keys run the local commerce engine so the store is usable before a project is connected.

Sign in with any email — the prototype shows the OTP on the login page. `admin@aqualite.in` opens `/admin`.

## Cloudflare Workers (Wrangler)

The app ships with [@opennextjs/cloudflare](https://opennext.js.org/cloudflare/get-started). On Workers, cart/order prototype data lives in **D1** (`DB` binding, database `aqualite-store`); locally it still uses `.data/store.json`.

1. [Register a `workers.dev` subdomain](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) (or add a `routes` entry in `wrangler.jsonc` for your domain).
2. `npx wrangler login`
3. Copy `.dev.vars.example` → `.dev.vars` (and keep `.env.local` for `next dev`).
4. `npm run deploy:cf` (applies D1 migrations remotely, then builds and deploys).
5. After deploy, set `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to your Worker URL (Dashboard → Workers → **aqualite** → Variables, or `wrangler secret put`).

Preview in the Workers runtime locally: `npm run preview:cf` (runs local D1 migrations first).

D1 only: `npm run db:migrate:local` / `npm run db:migrate:remote`.

OpenNext warns that Windows is unsupported; use WSL for production deploys if you hit runtime issues.
