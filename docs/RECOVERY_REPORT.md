# Aqualite — Recovery Audit Report (R01)

Generated on `2026-10-01` from real build, test, Playwright crawl, data query, and live fetch runs against the Aqualite repository (`arena/01a0f627-aqualite`) and live Worker (`https://aqualite.aqualite.workers.dev`).

---

## 1 · Build Health

### 1.1 Dependency Install (`npm install`)
`npm install` fails with peer-dependency conflict (`ERESOLVE`) unless `--legacy-peer-deps` is used because `package.json` pins `"vitest": "3.0.9"` while `"@vitest/coverage-v8": "^3.2.7"` requires `peer vitest@"3.2.7"`:

```text
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: @vitest/coverage-v8@3.2.7
npm error Found: vitest@3.0.9
npm error node_modules/vitest
npm error   dev vitest@"3.0.9" from the root project
npm error
npm error Could not resolve dependency:
npm error peer vitest@"3.2.7" from @vitest/coverage-v8@3.2.7
npm error node_modules/@vitest/coverage-v8
npm error   dev @vitest/coverage-v8@"^3.2.7" from the root project
```

- **File & line:** `package.json:63` (`"@vitest/coverage-v8": "^3.2.7"`) vs `package.json:71` (`"vitest": "3.0.9"`).
- Running `npm install --legacy-peer-deps` installs 900 packages cleanly (`EXIT=0`).

### 1.2 TypeScript (`npm run typecheck` / `tsc --noEmit`)
```text
> aqualite@0.1.0 typecheck
> tsc --noEmit

EXIT_TSC=0
```
- **Errors:** `0`.

### 1.3 ESLint (`npm run lint`)
```text
> aqualite@0.1.0 lint
> eslint .

/home/user/aqualite/components/hub/catalog/ImageManager.tsx
  39:174  warning  Using `<img>` could result in slower LCP and higher bandwidth...  @next/next/no-img-element

/home/user/aqualite/components/hub/catalog/InventoryTable.tsx
   75:19   warning  Compilation Skipped: Use of incompatible library (TanStack Virtual useVirtualizer)  react-hooks/incompatible-library
  175:444  warning  Using `<img>` could result in slower LCP and higher bandwidth...  @next/next/no-img-element

/home/user/aqualite/components/hub/catalog/ProductWizard.tsx
  145:164  warning  Using `<img>` could result in slower LCP and higher bandwidth...  @next/next/no-img-element

/home/user/aqualite/components/hub/home/widgets/WidgetCard.tsx
  90:20  warning  Using `<img>` could result in slower LCP and higher bandwidth...  @next/next/no-img-element

✖ 5 problems (0 errors, 5 warnings)
EXIT_LINT=0
```

### 1.4 Token Check (`npm run tokens:check`)
```text
AQUALITE token migration check
scanned 259 files in app, components, lib
skipped missing: emails/
✓ No raw theme hex outside styles/tokens.css (alias usage above is informational).
EXIT_TOKENS=0
```

### 1.5 Unit Tests (`npm test` / `vitest run`)
```text
 RUN  v3.0.9 /home/user/aqualite

 ✓ tests/unit/promotions.test.ts (22 tests) 91ms
 ✓ tests/unit/reports.test.ts (15 tests) 91ms
 ✓ tests/unit/hero-machine.test.ts (25 tests) 19ms
 ✓ tests/unit/health.test.ts (9 tests) 18ms
 ✓ tests/unit/hub-catalog.test.ts (8 tests) 38ms
 ✓ tests/unit/settlements.test.ts (10 tests) 39ms
 ✓ tests/unit/messages.test.ts (8 tests) 34ms
 ✓ tests/unit/track.test.ts (10 tests) 125ms
 ✓ tests/unit/hero-validation.test.ts (11 tests) 10ms
 ✓ tests/unit/hero-store.test.ts (5 tests) 17ms
 ✓ tests/unit/hub-metrics.test.ts (2 tests) 27ms
 ✓ tests/unit/pricing.test.ts (6 tests) 5ms

 Test Files  12 passed (12)
      Tests  131 passed (131)
EXIT_TEST=0
```

### 1.6 Production Build (`npm run build` / `next build`) & OpenNext Cloudflare Build (`npx opennextjs-cloudflare build`)
Both `next build` and `opennextjs-cloudflare build` **FAIL with 11 Turbopack errors**:

```text
> aqualite@0.1.0 build
> next build

▲ Next.js 16.3.6 (Turbopack)
  Creating an optimized production build ...

> Build error occurred
Error: Turbopack build failed with 11 errors:
./lib/auth/session.ts:3:1
Error: You're importing a module that depends on "next/headers". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.
  Import traces:
    ./lib/auth/session.ts [Client Component Browser]
    ./lib/account/messages.ts [Client Component Browser]
    ./components/account/CustomerMessageForm.tsx [Client Component Browser]
    ./app/(store)/account/orders/[number]/page.tsx [Server Component]

./lib/auth/session.ts:1:1
Error: 'server-only' cannot be imported from a Client Component module

./lib/env.ts:1:1
Error: 'server-only' cannot be imported from a Client Component module

./lib/hub/guard.ts:1:1
Error: 'server-only' cannot be imported from a Client Component module
  Import traces:
    ./lib/hub/guard.ts [Client Component Browser]
    ./lib/hub/reviews/actions.ts [Client Component Browser]
    ./components/seller/ReviewQueue.tsx [Client Component Browser]
    ./app/seller/performance/reviews/page.tsx [Server Component]

./lib/store/engine.ts:1:1
Error: 'server-only' cannot be imported from a Client Component module

./lib/store/persist.ts:1:1
Error: 'server-only' cannot be imported from a Client Component module
```

**Root cause of all 11 build errors (with file & line):**
1. `lib/account/messages.ts:1` — Missing `"use server";` directive at top of file. Imported by client component `components/account/CustomerMessageForm.tsx:5`, pulling `lib/auth/session.ts:1`, `lib/auth/session.ts:3`, `lib/env.ts:1`, `lib/store/engine.ts:1`, and `lib/store/persist.ts:1` into the client bundle.
2. `lib/hub/reviews/actions.ts:1` — Missing `"use server";` directive at top of file. Imported by client component `components/seller/ReviewQueue.tsx:5`, pulling `lib/hub/guard.ts:1`, `lib/store/engine.ts:1`, and `lib/store/persist.ts:1` into the client bundle.

---

## 2 · Route Inventory

### 2.1 Existing Files Under `app/` (62 route files)
- **Root (`app/`):** `layout.tsx`, `not-found.tsx`, `error.tsx`, `robots.ts`, `denied/page.tsx`
- **Storefront (`app/(store)/`):**
  - `layout.tsx`, `page.tsx` (`/`)
  - `shop/page.tsx` (`/shop`), `shop/[gender]/page.tsx` (`/shop/[gender]`), `shop/[gender]/[category]/page.tsx` (`/shop/[gender]/[category]`)
  - `collections/[slug]/page.tsx` (`/collections/[slug]`)
  - `product/[slug]/page.tsx` (`/product/[slug]`)
  - `bag/page.tsx` (`/bag`)
  - `login/page.tsx` (`/login`)
  - `account/page.tsx` (`/account`), `account/orders/page.tsx` (`/account/orders`), `account/orders/[number]/page.tsx` (`/account/orders/[number]`), `account/addresses/page.tsx` (`/account/addresses`), `account/profile/page.tsx` (`/account/profile`)
  - `track/page.tsx` (`/track`), `size-guide/page.tsx` (`/size-guide`), `our-story/page.tsx` (`/our-story`), `care/page.tsx` (`/care`), `shipping/page.tsx` (`/shipping`), `returns/page.tsx` (`/returns`), `faq/page.tsx` (`/faq`), `contact/page.tsx` (`/contact`), `privacy/page.tsx` (`/privacy`), `terms/page.tsx` (`/terms`), `refund-policy/page.tsx` (`/refund-policy`)
- **Checkout (`app/(checkout)/`):**
  - `layout.tsx`, `checkout/page.tsx` (`/checkout`), `order/[number]/page.tsx` (`/order/[number]`)
- **Dev (`app/(dev)/`):**
  - `styleguide/page.tsx` (`/styleguide`)
- **Admin (`app/admin/`):**
  - `layout.tsx`, `page.tsx` (`/admin`), `hero/page.tsx` (`/admin/hero`), `inventory/page.tsx` (`/admin/inventory`), `orders/page.tsx` (`/admin/orders`), `orders/[number]/page.tsx` (`/admin/orders/[number]`)
- **Seller Hub (`app/seller/`):**
  - `layout.tsx`, `page.tsx` (`/seller`)
  - `catalog/add/page.tsx`, `catalog/images/page.tsx`, `catalog/inventory/page.tsx`, `catalog/quality/page.tsx`, `catalog/variations/page.tsx`
  - `inventory/ledger/page.tsx`, `inventory/planning/page.tsx`
  - `performance/health/page.tsx`, `performance/health/[metric]/page.tsx`, `performance/messages/page.tsx`, `performance/messages/[id]/page.tsx`, `performance/reviews/page.tsx`
  - `pricing/page.tsx`, `pricing/log/page.tsx`, `pricing/sales/page.tsx`
  - `promotions/page.tsx`, `promotions/automatic/new/page.tsx`, `promotions/automatic/[id]/page.tsx`, `promotions/coupons/new/page.tsx`, `promotions/coupons/[id]/page.tsx`
  - `reports/business/page.tsx`, `reports/payments/page.tsx`, `reports/tax/page.tsx`
  - `settings/page.tsx`, `settings/audit/page.tsx`, `settings/business/page.tsx`, `settings/notifications/page.tsx`, `settings/returns/page.tsx`, `settings/security/page.tsx`, `settings/shipping/page.tsx`, `settings/tax/page.tsx`, `settings/users/page.tsx`
- **API (`app/api/`):**
  - `admin/upload/route.ts` (`/api/admin/upload`)
  - `cron/revalidate-sales/route.ts` (`/api/cron/revalidate-sales`)
  - `cron/settlements/route.ts` (`/api/cron/settlements`)
  - `media/[name]/route.ts` (`/api/media/[name]`)
  - `orders/track/route.ts` (`/api/orders/track`)
  - `pincode/[code]/route.ts` (`/api/pincode/[code]`)
  - `search/route.ts` (`/api/search`)
  - `seller/images/route.ts` (`/api/seller/images`)
  - `seller/reports/[kind]/route.ts` (`/api/seller/reports/[kind]`)
  - `track/route.ts` (`/api/track`)
  - `webhooks/razorpay/route.ts` (`/api/webhooks/razorpay`)
  - `webhooks/resend/route.ts` (`/api/webhooks/resend`)

### 2.2 Required Route Comparison Table

| Group | Route | Status | Notes / Defects Found |
| --- | --- | --- | --- |
| Storefront | `/` | **EXISTS & BROKEN** | Renders 200, but fires 4× `404` requests for extensionless `/catalog/hero/<slug>/hero-desktop` (`HeroScene.tsx:81`); hero has dark water images, overlapping text, duplicate nav controls, clipped eyebrow, red `"0"` bag badge; shows `Kids (0 pairs)` in index & nav. |
| Storefront | `/shop` | **EXISTS & BROKEN** | Renders 200, but missing product `type` (category) filter in `ListingView.tsx`; pagination only shows "Load more" without full pagination controls. |
| Storefront | `/shop/[gender]` | **EXISTS & BROKEN** | Renders 200, missing `type` filter; `/shop/kids` is exposed in nav with 0 products and heading `"Kids's edit"` (grammar bug). |
| Storefront | `/shop/[gender]/[category]` | **EXISTS & BROKEN** | Renders 200, missing `type` filter in sidebar. |
| Storefront | `/collections/[slug]` | **EXISTS & BROKEN** | Renders 200, missing `type` filter in sidebar. |
| Storefront | `/product/[slug]` | **EXISTS & BROKEN** | Renders 200, but: (1) only 1–2 gallery images per colourway, no mobile swipe carousel, no image zoom; (2) `BuyBox` relies only on server URL param `size` without optimistic client state; (3) pincode check uses local import instead of `/api/pincode/[code]`; (4) no sticky mobile buy bar; (5) no JSON-LD Product structured data; (6) review fit displays literal `"true"` (`review.fit.replace("_", " ")`). |
| Storefront | `/bag` | **EXISTS & WORKS** | Renders 200 with server cart cookie, qty stepper, remove, free-shipping meter, `quote_cart` totals, Checkout CTA. |
| Storefront | `/checkout` | **EXISTS & BROKEN** | **CRASHES (500 / Error boundary)** when cart has items: `Error: useCart must be used inside CartProvider` because `app/(checkout)/layout.tsx` does not include `<CartProvider>` while `CheckoutForm.tsx:214` renders `<CouponField>` which calls `useCart()`. Also missing live pincode serviceability check, COD cap enforcement UI, Razorpay brand-red theme option, hold timer text, and synchronous double-click guard. |
| Storefront | `/order/[number]` | **EXISTS & BROKEN** | Renders 200 with valid `?t=<token>` (404 without token), but missing: polling until paid when `pending_payment`, full totals breakdown (subtotal/shipping/tax/COD fee), delivery ETA, and printable invoice link/page. |
| Storefront | `/login` | **EXISTS & WORKS** | Renders 200, sends OTP and verifies session. |
| Storefront | `/account` | **EXISTS & WORKS** | Redirects to `/login?next=/account` when unauthenticated; renders account overview when signed in. |
| Storefront | `/account/orders` | **EXISTS & WORKS** | Lists customer orders and `/account/orders/[number]` detail. |
| Storefront | `/account/addresses` | **EXISTS & WORKS** | Lists, adds, and deletes saved addresses. |
| Storefront | `/account/wishlist` | **MISSING** | No `app/(store)/account/wishlist/page.tsx` exists (returns 404 after login). |
| Storefront | `/track` | **EXISTS & WORKS** | Renders 200 and tracks order by order number + email/phone. |
| Storefront | `/size-guide` | **EXISTS & WORKS** | Renders 200 with UK/EU/US/mm chart and recommender. |
| Storefront | `/our-story` | **EXISTS & WORKS** | Renders 200. |
| Storefront | `/shipping` | **EXISTS & WORKS** | Renders 200 with dynamic threshold from settings. |
| Storefront | `/returns` | **EXISTS & WORKS** | Renders 200. |
| Storefront | `/faq` | **EXISTS & WORKS** | Renders 200. |
| Storefront | `/contact` | **EXISTS & WORKS** | Renders 200 with contact form server action. |
| Storefront | `/privacy` | **EXISTS & WORKS** | Renders 200. |
| Storefront | `/terms` | **EXISTS & WORKS** | Renders 200. |
| Storefront | `/refund-policy` | **EXISTS & WORKS** | Renders 200. |
| Storefront | `404` (`app/not-found.tsx`) | **EXISTS & WORKS** | Renders custom 404 page (`Lost a shoe?`). |
| API | `/api/search` | **EXISTS & BROKEN** | Returns **500** (`D1_ERROR: no such table: store_state: SQLITE_ERROR`) when Miniflare D1 is uninitialized because `lib/store/persist.ts` does not auto-create `store_state` or fall back when table is missing. |
| API | `/api/pincode/[code]` | **EXISTS & BROKEN** | Returns **500** (`D1_ERROR: no such table: store_state: SQLITE_ERROR`) in `limitIp()` for the same uninitialized `store_state` reason. |
| API | `/api/payments/verify` | **MISSING** | No `app/api/payments/verify/route.ts` exists (returns 404). HMAC verification only exists as a server action in `lib/orders/actions.ts`. |
| API | `/api/webhooks/razorpay` | **EXISTS & WORKS** | `POST /api/webhooks/razorpay` verifies `x-razorpay-signature` HMAC and confirms/fails payment idempotently. |
| API | `/api/track` | **EXISTS & WORKS** | Analytics beacon + `/api/orders/track` (`POST`) for order tracking. |
| API | Cron routes | **EXISTS & BROKEN / PARTIAL** | `/api/cron/revalidate-sales` (`POST` only, returns 405 on `GET` from Cloudflare Cron Triggers) and `/api/cron/settlements` (`GET`/`POST`) exist; `/api/cron/notify` (referenced in `.env.example` for back-in-stock notifications) is **MISSING** (404). |
| Seller Hub | `/seller` | **EXISTS & WORKS** | Requires `admin@aqualite.in` session; renders widget dashboard. |
| Seller Hub | `/seller/catalog/*` | **EXISTS & WORKS** | `add`, `images`, `inventory`, `quality`, `variations` exist and render for admin. |
| Seller Hub | `/seller/inventory/*` | **EXISTS & WORKS** | `ledger`, `planning` exist and render for admin. |
| Seller Hub | `/seller/orders/*` | **MISSING** | `/seller/orders` and `/seller/orders/[number]` do **not** exist (`404` on both local and live `https://aqualite.aqualite.workers.dev/seller/orders`). Orders were left under `/admin/orders` instead of `/seller/orders`. |
| Seller Hub | `/seller/promotions/*` | **EXISTS & WORKS** | `/seller/promotions`, `automatic/new`, `automatic/[id]`, `coupons/new`, `coupons/[id]` exist. |
| Seller Hub | `/seller/reports/*` | **EXISTS & WORKS** | `business`, `payments`, `tax` exist. |
| Seller Hub | `/seller/settings/*` | **EXISTS & WORKS** | `audit`, `business`, `notifications`, `returns`, `security`, `shipping`, `tax`, `users` exist. |

---

## 3 · Link Crawl & Purchase Path Audit

### 3.1 Playwright Crawl Results (`next start` locally + live `https://aqualite.aqualite.workers.dev`)

```text
/ => status=200 final=/ src=root h1="Aqualite — footwear for the monsoon"
  CONSOLE 404s on /:
    RES_ERR: 404 http://localhost:3000/catalog/hero/pearl-slide/hero-desktop
    RES_ERR: 404 http://localhost:3000/catalog/hero/cove-clog/hero-desktop
    RES_ERR: 404 http://localhost:3000/catalog/hero/harbour-clog/hero-desktop
    RES_ERR: 404 http://localhost:3000/catalog/hero/reef-flip/hero-desktop
/shop => status=200 final=/shop src=/ h1="All pairs"
/shop/men => status=200 final=/shop/men src=/ h1="Men's edit"
/shop/women => status=200 final=/shop/women src=/ h1="Women's edit"
/shop/kids => status=200 final=/shop/kids src=/ h1="Kids's edit" (0 products)
/collections/everyday-slides => status=200 final=/collections/everyday-slides src=/ h1="Everyday Slides"
/collections/new-season => status=200 final=/collections/new-season src=/ h1="New Season"
/collections/monsoon-ready => status=200 final=/collections/monsoon-ready src=/ h1="Monsoon Ready"
/product/tide-slide?color=midnight => status=200 final=/product/tide-slide?color=midnight src=/ h1="Tide Slide"
/product/tide-slide?color=sand => status=200 final=/product/tide-slide?color=sand src=/ h1="Tide Slide"
/product/pearl-slide?color=blush => status=200 final=/product/pearl-slide?color=blush src=/ h1="Pearl Slide"
/product/pearl-slide?color=ink => status=200 final=/product/pearl-slide?color=ink src=/ h1="Pearl Slide"
/product/cove-clog?color=sage => status=200 final=/product/cove-clog?color=sage src=/ h1="Cove Clog"
/product/harbour-clog?color=navy => status=200 final=/product/harbour-clog?color=navy src=/ h1="Harbour Clog"
/product/harbour-clog?color=fog => status=200 final=/product/harbour-clog?color=fog src=/ h1="Harbour Clog"
/product/reef-flip?color=porcelain => status=200 final=/product/reef-flip?color=porcelain src=/ h1="Reef Flip"
/product/marina-trainer?color=cloud => status=200 final=/product/marina-trainer?color=cloud src=/shop h1="Marina Trainer"
/shop?category=clogs => status=200 final=/shop?category=clogs src=/ h1="All pairs"
/account/wishlist => status=404 (when authenticated)
/seller/orders => status=404 (both locally and on live https://aqualite.aqualite.workers.dev/seller/orders)
/api/payments/verify => status=404
/api/cron/notify => status=404
/api/search?q=clog => status=500 (D1_ERROR: no such table: store_state)
/api/pincode/400001 => status=500 (D1_ERROR: no such table: store_state)
```

### 3.2 Broken Links & Resource Requests by Source Page
1. **Source `/` (`components/home/hero/HeroScene.tsx:81`):** Requests `/catalog/hero/pearl-slide/hero-desktop`, `/catalog/hero/cove-clog/hero-desktop`, `/catalog/hero/harbour-clog/hero-desktop`, `/catalog/hero/reef-flip/hero-desktop` (missing file extension) → **404 Not Found**.
2. **Source `/` (`content/hero.ts:29-32`):** Hero Slide 1 (`Tide Slide · Midnight / Aqua`) primary CTA points to `/shop/men` instead of `/product/tide-slide?color=midnight`.
3. **Source `/` (`content/hero.ts:128-129`):** Hero Slide 5 (`Reef Flip · Porcelain`, a Men's flip-flop) secondary CTA points to `/shop/women` ("Shop women") instead of `/shop/men/flip-flops` or `/shop?category=flip-flops`.
4. **Source `/` & Header (`components/chrome/Header.tsx:22`, `components/home/ShopIndex.tsx`):** Links to `/shop/kids`, which has **0 products** ("Still being photographed · 0 pairs").
5. **Source `/seller` (`app/seller/layout.tsx:21`, `components/hub/home/widgets/WidgetCard.tsx`):** Seller Hub navigation links to `/admin/orders`, while `/seller/orders` returns **404 Not Found**.

### 3.3 Purchase-Path Break Point
Scripting the purchase path (`/` → `/product/harbour-clog?color=navy` → select UK 8 → Add to bag → `/bag` → `/checkout`):

1. **Break Point #1 (Critical Crash on `/checkout`):**
   When `/checkout` is opened with a non-empty bag, Next.js throws a fatal error on both SSR and client:
   ```text
   ⨯ Error: useCart must be used inside CartProvider
       at useCart (components/cart/CartProvider.tsx:33:15)
       at CouponField (components/cart/CouponField.tsx:22:49)
       at CheckoutForm (components/checkout/CheckoutForm.tsx:214:9)
   ```
   Because `app/(checkout)/layout.tsx` does not wrap its children in `<CartProvider>`, `/checkout` immediately crashes into `app/error.tsx` ("Something went wrong"). A customer **cannot reach the checkout form or Razorpay modal at all**.
2. **Break Point #2 (`BuyBox.tsx` size selection race condition):**
   Clicking a size button in `components/pdp/BuyBox.tsx:81` only calls `router.replace(...)` without updating local component state. Clicking "Add to bag" before the server RSC navigation finishes fails with `"Choose a size to continue."`.
3. **Break Point #3 (Missing `/api/payments/verify`):**
   There is no `/api/payments/verify` endpoint for HMAC verification.
4. **Break Point #4 (Missing `/seller/orders`):**
   After an order is placed, navigating to `/seller/orders` returns `404 Not Found`.

---

## 4 · Data Health

Executed against catalogue and hero seed (`content/catalog.ts`, `content/hero.ts`, `supabase/seed/hero_slides.sql`):

```json
{
  "activeProductsCount": 6,
  "colorwaysCount": 9,
  "totalVariantsCount": 54,
  "variantsWithPriceGt0AndStockGt0": 47,
  "variantsSoldOutCount": 7,
  "productsWithoutPrimaryImage": 0,
  "colorwaysWithLessThan4Images": [
    "tide-slide/midnight (2 images)",
    "tide-slide/sand (1 images)",
    "harbour-clog/navy (1 images)",
    "harbour-clog/fog (1 images)",
    "reef-flip/porcelain (1 images)",
    "pearl-slide/blush (1 images)",
    "pearl-slide/ink (1 images)",
    "cove-clog/sage (1 images)",
    "marina-trainer/cloud (1 images)"
  ],
  "brokenHeroRefsCount": 0,
  "categoriesZeroProducts": [
    "sandals",
    "casual-shoes",
    "school-shoes",
    "floaters"
  ],
  "gendersZeroProducts": [
    "kids"
  ],
  "heroCtas": [
    {
      "key": "tide-slide-midnight",
      "primary": "Shop men -> /shop/men",
      "secondary": "Shop women -> /shop/women"
    },
    {
      "key": "pearl-slide-blush",
      "primary": "Shop Pearl -> /product/pearl-slide?color=blush",
      "secondary": "All slides -> /collections/everyday-slides"
    },
    {
      "key": "cove-clog-sage",
      "primary": "Shop Cove -> /product/cove-clog?color=sage",
      "secondary": "All clogs -> /shop?category=clogs"
    },
    {
      "key": "harbour-clog-navy",
      "primary": "Shop Harbour -> /product/harbour-clog?color=navy",
      "secondary": "All clogs -> /shop?category=clogs"
    },
    {
      "key": "reef-flip-porcelain",
      "primary": "Shop Reef -> /product/reef-flip?color=porcelain",
      "secondary": "Shop women -> /shop/women"
    }
  ]
}
```

### Summary of Data Problems
1. **Gallery Image Deficit:** All 9 colourways across the 5 hero products (`tide-slide`, `pearl-slide`, `cove-clog`, `harbour-clog`, `reef-flip`) and `marina-trainer` have only 1–2 gallery images instead of the required `>= 4` gallery images per colourway (`side`, `top`, `sole`, `3/4`).
2. **Dark Water Image in Gallery & Hero:** `tide-slide/midnight` includes `/catalog/hero-tide-slide.jpg` (dark water background) as a secondary gallery image and Slide 1 hero image; Slides 2–5 use dark water backgrounds (`/catalog/hero/<slug>/hero-desktop-1920.jpg`).
3. **Hero Slide 1 CTA Mismatch:** Slide 1 (`tide-slide-midnight`) primary CTA points to `/shop/men` instead of `/product/tide-slide?color=midnight`. Slide 5 (`reef-flip-porcelain`, men's flip-flop) secondary CTA points to `/shop/women` instead of `/shop?category=flip-flops`.
4. **Zero-Product Categories & Genders Shown in UI:**
   - Gender `kids` has `0` products (`gendersZeroProducts: ["kids"]`), yet is shown in the header navigation (`components/chrome/Header.tsx:22`), mobile menu (`components/chrome/MobileMenu.tsx`), and home Shop-by index (`components/home/ShopIndex.tsx`).
   - Categories `sandals`, `casual-shoes`, `school-shoes`, and `floaters` have `0` products.
5. **Zero Demo Orders in Store Seed:** Fresh store state has `0` orders, leaving Seller Hub dashboard metrics empty (`₹0`, `0` orders) until orders are seeded.

---

## 5 · Live Performance / Hang Check

### 5.1 TTFB Measurements (`next start` local baseline vs Live Worker)

Local `next start` (5 runs per route):

| Route | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Run 4 (ms) | Run 5 (ms) | Median TTFB (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 81.54 | 29.25 | 41.29 | 26.33 | 28.68 | **29.25 ms** |
| `/shop` | 38.34 | 22.99 | 19.15 | 22.17 | 16.63 | **22.17 ms** |
| `/product/harbour-clog` | 28.71 | 19.03 | 20.96 | 23.88 | 18.30 | **20.96 ms** |

Live Worker (`https://aqualite.aqualite.workers.dev`):
- Direct `curl` from inside the sandbox container fails at TLS handshake (`curl: (35) OpenSSL SSL_connect: SSL_ERROR_SYSCALL`) due to sandbox egress filtering, while external HTTP fetcher (`fetch_page`) retrieved `/`, `/shop`, `/product/harbour-clog`, and `/seller/orders`.

### 5.2 Root Causes of Live Worker Hang / Timeout (Code Evidence)
Inspecting `lib/store/engine.ts` and `lib/store/persist.ts` reveals **three severe architectural bugs** that cause the Cloudflare Worker to hang, time out, or fail on requests:

1. **Cross-Request Global Promise Chain in `lib/store/engine.ts:371, 430-442` (`chain` & `activeLoad`):**
   ```ts
   let chain: Promise<unknown> = Promise.resolve();
   function withStore<T>(fn: (state: State) => T): Promise<T> {
     const run = chain.then(async () => {
       const state = await load();
       releaseExpiredIn(state);
       const result = fn(state);
       await save(state);
       return result;
     });
     chain = run.then(() => undefined, () => undefined);
     return run;
   }
   ```
   In Cloudflare Workers (`workerd`), module-level globals (`chain`, `activeLoad`, `_dbCache`) persist across concurrent and sequential requests handled by the same Worker isolate. Chaining Request B onto a promise (`chain` or `activeLoad`) created in Request A causes `workerd` to throw or hang (`Cannot perform I/O on behalf of a different request`) whenever Request A's I/O context closes or stalls!

2. **Module-Level Caching of Request-Scoped D1 Binding in `lib/store/persist.ts:66-79` (`_dbCache`):**
   ```ts
   let _dbCache: StoreDatabase | null | undefined = undefined;
   async function getStoreDatabase(): Promise<StoreDatabase | null> {
     if (_dbCache !== undefined) return _dbCache;
     const { getCloudflareContext } = await import("@opennextjs/cloudflare");
     const { env } = getCloudflareContext();
     _dbCache = (env as { DB?: StoreDatabase }).DB ?? null;
     return _dbCache;
   }
   ```
   `_dbCache` caches the first request's `env.DB` binding at module scope and reuses it across subsequent requests (or caches `null` if called during build/init), violating Cloudflare request isolation.

3. **Every Read Performs a Full D1 `SELECT` + Full JSON `INSERT/UPDATE` Write (`lib/store/engine.ts:430-436`):**
   Every read helper (`catalogProducts()`, `getCart()`, `getSettings()`, `getHeroSlides()`, `allCards()`, `getFeatured()`) calls `withStore()`, which executes `await load()` AND `await save(state)` (`INSERT INTO store_state ... ON CONFLICT(id) DO UPDATE SET json = excluded.json`).
   Rendering `/` (`StoreLayout` + `HomePage`) triggers **9 separate `withStore()` calls**, serialized one after another by `chain`, resulting in **9 sequential D1 reads + 9 sequential D1 full-state writes (18 sequential database round-trips)** just to render the home page!

4. **Unconditional `initOpenNextCloudflareForDev()` in `next.config.mjs:3` + Missing Auto-Migration in `lib/store/persist.ts`:**
   When `store_state` table is not yet created in D1, `writeStoreJson()` throws `D1_ERROR: no such table: store_state: SQLITE_ERROR` without creating the table or falling back to memory.

---

## 6 · Prioritised Fix List Mapped to R02 – R05

### R02 · Complete the Real Purchase Path
1. **Fix Build-Breaking Server Action Directives:** Add `"use server";` to `lib/account/messages.ts` and `lib/hub/reviews/actions.ts`; align `vitest` and `@vitest/coverage-v8` versions in `package.json`.
2. **Fix Engine & D1 Persistence (`lib/store/persist.ts`, `lib/store/engine.ts`):**
   - Separate read-only `readWithStore()` from mutating `writeWithStore()` so reads never write to D1/disk unless expired reservations were actually released.
   - Remove cross-request `_dbCache` and cross-request `chain` stalls; auto-create `store_state` table if missing; add a 5s timeout wrapper with safe fallback so no route can ever hang.
3. **Fix `/checkout` Crash (`app/(checkout)/layout.tsx`, `components/checkout/CheckoutForm.tsx`):**
   - Wrap `app/(checkout)/layout.tsx` in `<CartProvider initial={cart}>` so `CouponField` and checkout components work inside `CartProvider`.
   - Add live pincode serviceability check (`/api/pincode/[code]`), state auto-fill/select, COD fee & cap enforcement, Razorpay modal brand-red theme (`#D9232E`), 15-minute reservation hold timer text, and synchronous double-submit lock (`useRef`) so double-clicking Pay creates only one order.
4. **Add `/api/payments/verify` Route (`app/api/payments/verify/route.ts`):**
   - Verify Razorpay signature (`razorpay_order_id|razorpay_payment_id` HMAC-SHA256) and confirm payment server-side.
5. **Complete `/order/[number]` Confirmation Page (`app/(checkout)/order/[number]/page.tsx`):**
   - Add client polling when `status === "pending_payment"`, full totals breakdown (subtotal, discount, shipping, GST, COD fee, total), delivery ETA from pincode, and printable invoice view/link.
6. **Complete Listings (`/shop`, `/shop/[gender]`, `/shop/[gender]/[category]`, `/collections/[slug]`):**
   - Add product `type` (category) filter and page number pagination to `ListingView.tsx` and `lib/catalog/filters.ts`.
7. **Complete Product Page (`/product/[slug]`, `components/pdp/BuyBox.tsx`):**
   - Add interactive gallery with mobile swipe, thumbnail selector, and click-to-zoom lightbox.
   - Add optimistic client size state in `BuyBox.tsx` while syncing URL params; prevent sold-out size from being added; wire pincode check to `/api/pincode/[code]`.
   - Fix review fit label (`"True to size"` instead of `"true"`), add mobile sticky buy bar, and render JSON-LD `Product` schema.
8. **Build `/seller/orders` & `/seller/orders/[number]` + `/account/wishlist` + `/api/cron/notify`:**
   - Create `/seller/orders` and `/seller/orders/[number]` with status filters and working "Pack" / "Confirm shipment" actions; update Seller Hub nav links to `/seller/orders`.
   - Create `/account/wishlist/page.tsx` and `/api/cron/notify/route.ts` (and allow `GET` on `/api/cron/revalidate-sales`).
9. **Header Bag Count (`components/chrome/Header.tsx`):**
   - Hide the bag count badge when `summary.count === 0` (no red `"0"`).

### R03 · Hero Section Fixes
1. **Light Ivory/Porcelain Hero Images & Halo:**
   - Replace dark-water hero images with transparent-background shoe composites generated from the porcelain catalogue photos via `scripts/hero-composite.ts`, rendered over ivory/linen with a soft contact shadow and 10–14% opacity tinted halo (`--hero-glow`). Remove dark vignette/smudge and fix the 4× `404` placeholder URLs in `HeroScene.tsx:81`.
2. **Grid & Zero Text-Shoe Overlap (1024, 1280, 1440, 1920, 390):**
   - Headline in cols 1–6 (`max-w-[11ch]`, responsive `clamp()` sizing so no glyph intersects the shoe's opaque bounding box); shoe in cols 6–12; lead (`--ink-2`, contrast ≥ 4.5:1) + CTAs in a clear non-overlapping zone.
3. **Single Navigation System & Eyebrow Cleanup:**
   - Remove side arrows, small arrows, dots pill, and duplicate product label.
   - Keep only the 5-item porcelain thumbnail rail (with full product names and active red progress line) + one aligned bottom-right control group (`04 / 05 · Pause · Scroll`).
   - Change eyebrow to text-only `"MONSOON '26"` (remove `"01 / 06 —"` numbering).
4. **Vertical Rhythm (`100svh`, min `720px` at `1440×900`):**
   - Fit eyebrow, headline, shoe, CTAs, price block, and thumbnail rail cleanly inside one viewport with `CLS = 0`.

### R04 · Product Data & Images Sanity
1. **Complete Gallery Images (≥ 4 per Colourway):**
   - Generate and wire 4 gallery views (`side` primary, `3/4` secondary, `top` detail, `sole` sole) on porcelain backgrounds for all colourways of the 5 hero products (`Tide Slide`, `Pearl Slide`, `Cove Clog`, `Harbour Clog`, `Reef Flip`) and `Marina Trainer`; mark composite views with `imageQuality: "composite"` and document in `docs/CLIENT_ASSETS.md`.
2. **Hero Slide CTAs:**
   - Update Slide 1 primary CTA to `Shop Tide` → `/product/tide-slide?color=midnight` and secondary CTA to `All slides` → `/collections/everyday-slides`; update Slide 5 secondary CTA to `All flip-flops` → `/shop?category=flip-flops` (both `content/hero.ts` and `supabase/seed/hero_slides.sql`).
3. **Hide 0-Product Categories & Genders:**
   - Filter out categories and genders with `0` active products (`Kids`, `sandals`, `casual-shoes`, `school-shoes`, `floaters`) from `Header`, `MobileMenu`, `Footer`, and home `ShopIndex`.
4. **Demo Orders Script (`demo:orders`):**
   - Add `scripts/demo-orders.mjs` (`npm run demo:orders` / `pnpm demo:orders`) and seed 3 realistic demo orders (Razorpay paid, COD confirmed, and shipped) so Seller Hub dashboard widgets and `/seller/orders` display non-zero metrics out of the box.

### R05 · Deploy + Live Verification + Demo Checklist
1. **Cloudflare Cron Triggers & OpenNext Build:**
   - Configure cron triggers in `wrangler.jsonc`, verify D1 migrations and OpenNext Cloudflare build (`opennextjs-cloudflare build`).
2. **Verification & Walkthrough (`docs/DEMO_CHECKLIST.md`):**
   - Verify TTFB `< 800ms`, zero broken links in crawl, desktop + mobile Playwright e2e purchase flows (Razorpay test mode + COD + Seller Hub shipment confirmation), hero screenshots across all 5 slides and viewports, and write `docs/DEMO_CHECKLIST.md`.
